use std::{collections::HashMap, error::Error, sync::Arc};

use chrono::{SecondsFormat, SubsecRound, Utc};

use futures_util::TryFutureExt;
use log::error;
use serde::{Deserialize, Serialize};

use tokio::join;
use uuid::Uuid;

use crate::utils::{misc, os};

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub interface_name: String,
    pub release: String,
    pub api_port: i32,
    pub password: String,
    pub host: String,
    pub wg_port: i32,
    pub mtu: i32,
    pub persistent_keepalive: i32,
    pub default_address: String,
    pub default_address_base: String,
    pub default_dns: String,
    pub allowed_ips: String,
    pub pre_up: String,
    pub post_up: String,
    pub pre_down: String,
    pub post_down: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "camelCase"))]
pub struct Server {
    pub private_key: String,
    pub public_key: String,
    pub address: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "camelCase"))]
pub struct Client {
    pub uuid: Uuid,
    pub name: String,
    pub address: String,
    pub private_key: String,
    pub public_key: String,
    pub pre_shared_key: String,
    pub created_at: String,
    pub updated_at: String,
    pub enabled: bool,
}

impl Client {
    pub fn enable(&mut self) {
        self.enabled = true;
        self.updated_at = Utc::now()
            .trunc_subsecs(3)
            .to_rfc3339_opts(SecondsFormat::Millis, true)
    }
    pub fn disable(&mut self) {
        self.enabled = false;
        self.updated_at = Utc::now()
            .trunc_subsecs(3)
            .to_rfc3339_opts(SecondsFormat::Millis, true)
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "snake_case"))]
pub struct WebClient {
    pub id: Uuid,
    pub name: String,
    pub enabled: bool,
    pub address: String,
    pub public_key: String,
    pub created_at: String,
    pub updated_at: String,
    pub allowed_ips: String,
    pub persistent_keepalive: String,
    pub latest_handshake_at: String,
    pub transfer_rx: i64,
    pub transfer_tx: i64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "snake_case"))]
pub struct DumpClient {
    pub public_key: String,
    pub pre_shared_key: String,
    pub endpoint: String,
    pub allowed_ips: String,
    pub latest_handshake_at: String,
    pub transfer_rx: i64,
    pub transfer_tx: i64,
    pub persistent_keepalive: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "camelCase"))]
pub struct Memento {
    pub server: Server,
    pub clients: HashMap<uuid::Uuid, Client>,
}

impl Memento {
    pub fn new(server: Server) -> Self {
        Self {
            server,
            clients: HashMap::new(),
        }
    }
}

#[derive(Clone)]
pub struct Accessor {
    memento_path: String,
    config_path: String,
    settings: Arc<Settings>,
    memento: Memento,
}

impl Accessor {
    pub async fn build(
        memento_path: String,
        config_path: String,
        settings: Arc<Settings>,
    ) -> Result<Self, Box<dyn Error>> {
        let memento_str = os::read_file(memento_path.clone())
            .await
            .expect("Could not read memento");

        if memento_str.is_empty() {
            log::info!("Creating new WireGuard configuration...");
            os::exec_sh(&"wg genkey")
                .and_then(|res_private| async move {
                    os::exec_sh(&format!("echo {} | wg pubkey", &res_private.stdout))
                        .await
                        .map(|res_public| (res_private.stdout, res_public.stdout))
                })
                .await
                .and_then(|(private_key, public_key)| {
                    let address = settings.default_address.clone();
                    let memento = Memento::new(Server {
                        private_key,
                        public_key,
                        address,
                    });
                    log::info!("WireGuard configuration generated...");
                    Ok(memento)
                })
        } else {
            Ok(serde_json::from_str(&memento_str).expect("Could not serialize memento"))
        }
        .and_then(|memento| {
            Ok(Self {
                config_path,
                memento_path,
                memento,
                settings,
            })
        })
    }

    pub async fn set(&mut self, memento: Memento) {
        let mut ser_memento =
            serde_json::to_string_pretty(&memento).expect("Could not serialize memento");
        let mut ser_config = self.format_config(&memento);

        ser_memento.push('\n');
        ser_config.push('\n');

        let (memento_wr, config_wr) = join!(
            os::write_file(self.memento_path.clone(), ser_memento),
            os::write_file(self.config_path.clone(), ser_config)
        );

        memento_wr.unwrap_or_else(|err| {
            error!("Could not write memento: {}", err);
            panic!()
        });
        config_wr.unwrap_or_else(|err| {
            error!("Could not write config: {}", err);
            panic!()
        });

        self.memento = memento;
    }

    pub fn get(&self) -> Memento {
        self.memento.clone()
    }

    fn format_config(&self, config: &Memento) -> String {
        let result_vec = vec![
            format!("# Note: Do not edit this file directly.\n"),
            format!("# Your changes will be overwritten!\n"),
            format!("\n"),
            format!("# Server\n"),
            format!("[Interface]\n"),
            format!("PrivateKey = {}\n", config.server.private_key),
            format!("Address = {}/24\n", config.server.address),
            format!("ListenPort = {}\n", self.settings.wg_port),
            format!("PreUp = {}\n", self.settings.pre_up),
            format!("PostUp = {}\n", self.settings.post_up),
            format!("PreDown = {}\n", self.settings.pre_down),
            format!("PostDown = {}\n", self.settings.post_down),
        ];
        let mut result = misc::multi_line(&result_vec);

        for (uid, client) in &config.clients {
            if !client.enabled {
                continue;
            }
            let result_inner = vec![
                format!("\n"),
                format!("# Client: {} ({})\n", client.name, uid),
                format!("[Peer]\n"),
                format!("PublicKey = {}\n", client.public_key),
                format!("PresharedKey = {}\n", client.pre_shared_key),
                format!("AllowedIPs = {}/32\n", client.address),
            ];
            result.push_str(misc::multi_line(&result_inner).as_str());
        }
        result
    }
}
