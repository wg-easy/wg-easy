use std::collections::HashMap;

use chrono::{SecondsFormat, SubsecRound, Utc};


use serde::{Deserialize, Serialize};
use tokio::join;
use uuid::Uuid;

use crate::utils::{misc, os};

#[derive(Serialize, Deserialize, Clone)]
pub struct WireguardSettings {
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

#[derive(Serialize, Deserialize)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "camelCase"))]
pub struct WireguardMemento {
    pub server: Server,
    pub clients: HashMap<uuid::Uuid, Client>,
}

#[derive(Serialize, Deserialize)]
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
#[derive(Clone)]
pub struct WireGuard {
    pub name: String,
    pub config_path: String,
    pub memento_path: String,
    pub settings: WireguardSettings,
}

impl WireguardMemento {
    pub fn new(server: Server) -> Self {
        Self {
            server,
            clients: HashMap::new(),
        }
    }
}

impl WireGuard {
    pub fn new(name: &str, wg_path: String, settings: WireguardSettings) -> Self {
        let path = format!("{}{}", wg_path, name);
        let config_path = format!("{}.conf", path);
        let memento_path = format!("{}.json", path);
        let name = format!("{}", name);
        Self {
            name,
            settings,
            config_path,
            memento_path,
        }
    }

    pub async fn quick_up(&self) {
        let result = os::exec_sh(format!("wg-quick up {}", &self.name))
            .await
            .expect("Error");
        result.log();
    }

    pub async fn quick_down(&self) {
        let result = os::exec_sh(format!("wg-quick down {}", &self.name))
            .await
            .expect("Error");
        result.log();
    }

    pub async fn sync_config(&self) {
        let result = os::exec_sh(format!(
            "wg syncconf {} <(wg-quick strip {})",
            self.name, self.name
        ))
        .await
        .expect("Error syncing");
        result.log();
    }

    pub async fn get_memento(&self) -> WireguardMemento {
        let (_, memento_str) = os::load_and_read_file_unhandled(self.memento_path.as_str()).await;
        if !memento_str.is_empty() {
            serde_json::from_str::<WireguardMemento>(memento_str.as_str()).unwrap()
        } else {
            log::info!("Creating new WireGuard configuration...");
            let private_key = os::exec_sh("wg genkey").await.expect("error genkey").stdout;
            let public_key = os::exec_sh(format!("echo {} | wg pubkey", private_key))
                .await
                .expect("error pubkey")
                .stdout;

            let address = self.settings.default_address.repeat(1);
            let memento = WireguardMemento::new(Server {
                private_key,
                public_key,
                address,
            });
            log::info!("WireGuard configuration generated...");
            memento
        }
    }

    pub async fn set_memento(&self, memento: &WireguardMemento) {
        let data_memento =
            serde_json::to_string_pretty(memento).expect("Could not serialize memento");
        let data_config = self.format_config(memento);

        join!(
            os::write_to_path_unhandled(self.config_path.as_str(), data_config),
            os::write_to_path_unhandled(self.memento_path.as_str(), data_memento.to_string())
        );
    }

    pub async fn start(&self) {
        let memento = self.get_memento().await;
        self.set_memento(&memento).await;
        self.quick_down().await;
        self.quick_up().await;
        self.sync_config().await;
    }

    pub async fn create_client<'a>(
        &'a self,
        memento: &'a mut WireguardMemento,
        name: String,
    ) -> &Client {
        let private_key = os::exec_sh("wg genkey").await.expect("error genkey").stdout;

        let pub_cmd = format!("echo {} | wg pubkey", private_key);
        let public_key = os::exec_sh(pub_cmd).await.expect("error pubkey").stdout;

        let pre_shared_key = os::exec_sh("wg genpsk").await.expect("error genpsk").stdout;

        let mut i: u8 = 2;
        let address = loop {
            match memento.clients.iter().find(|(_, client)| {
                client.address == format!("{}.{}", self.settings.default_address_base, i)
            }) {
                Some(_) => {
                    if i == 255 {
                        break None;
                    }
                    i += 1;
                }
                None => break Some(format!("{}.{}", self.settings.default_address_base, i)),
            }
        }
        .expect("Maximum number of clients reached");

        let uuid = Uuid::new_v4();
        let now = Utc::now().trunc_subsecs(3);

        let client = Client {
            uuid,
            name,
            address,
            created_at: now.to_rfc3339_opts(SecondsFormat::Secs, true),
            updated_at: now.to_rfc3339_opts(SecondsFormat::Secs, true),
            enabled: true,
            pre_shared_key,
            private_key,
            public_key,
        };

        memento.clients.insert(uuid, client.clone());

        self.set_memento(&memento).await;
        self.sync_config().await;

        memento.clients.get(&uuid).unwrap()
    }

    pub fn get_client<'a>(&'a self, memento: &'a WireguardMemento, client_id: Uuid) -> &Client {
        let client = memento
            .clients
            .get(&client_id)
            .expect("Could not find user");
        client
    }

    pub async fn get_clients(&self, memento: &WireguardMemento) -> Vec<WebClient> {
        let res = os::exec_sh("wg show wg0 dump").await.unwrap();

        let lines: Vec<Vec<String>> = res
            .stdout
            .trim()
            .split('\n')
            .skip(1)
            .map(|line| line.split('\t').map(|x| x.to_string()).collect())
            .collect();

        let lines: Vec<DumpClient> = lines
            .iter()
            .map(|x| DumpClient {
                public_key: x[0].to_string(),
                pre_shared_key: x[1].to_string(),
                endpoint: x[2].to_string(),
                allowed_ips: x[3].to_string(),
                latest_handshake_at: x[4].to_string(),
                transfer_rx: x[5].parse::<i64>().unwrap(),
                transfer_tx: x[6].parse::<i64>().unwrap(),
                persistent_keepalive: x[7].to_string(),
            })
            .collect();

        let clients: Vec<WebClient> = memento
            .clients
            .iter()
            .map(|(uuid, value)| {
                let uuid = uuid.to_owned();
                let value = value.to_owned();
                let client_conf;

                match lines.iter().find(|x| x.public_key.eq(&value.public_key)) {
                    Some(conf) => client_conf = conf,
                    None => return None,
                };
                Some(WebClient {
                    id: uuid,
                    name: value.name,
                    enabled: value.enabled,
                    address: value.address,
                    public_key: value.public_key,
                    created_at: value.created_at,
                    updated_at: value.updated_at,
                    allowed_ips: client_conf.allowed_ips.to_string(),
                    persistent_keepalive: client_conf.persistent_keepalive.to_string(),
                    latest_handshake_at: client_conf.latest_handshake_at.to_string(),
                    transfer_rx: client_conf.transfer_rx,
                    transfer_tx: client_conf.transfer_tx,
                })
            })
            .filter(|x| x.is_some())
            .map(|x| x.unwrap())
            .collect();

        clients
    }

    pub fn get_client_configuration(
        &self,
        memento: &WireguardMemento,
        client_id: Uuid,
    ) -> (String, String) {
        let client = self.get_client(memento, client_id);

        let result_vec = vec![
            format!("[Interface]\n"),
            format!("PrivateKey = {}\n", client.private_key),
            format!("Address = {}/24\n", client.address),
            format!("DNS = {}\n", self.settings.default_dns),
            format!("MTU = {}\n", self.settings.mtu),
            format!("\n"),
            format!("[Peer]\n"),
            format!("PublicKey = {}\n", memento.server.public_key),
            format!("PresharedKey = {}\n", client.pre_shared_key),
            format!("AllowedIPs = {}\n", self.settings.allowed_ips),
            format!(
                "PersistentKeepalive = {}\n",
                self.settings.persistent_keepalive
            ),
            format!(
                "Endpoint = {}:{}\n",
                self.settings.host, self.settings.wg_port
            ),
        ];

        (client.name.to_string(), misc::multi_line(&result_vec))
    }

    pub async fn delete_client(&self, memento: &mut WireguardMemento, client_id: Uuid) {
        if memento.clients.remove(&client_id).is_some() {
            self.set_memento(&memento).await;
        }
    }

    pub async fn enable_client(&self, memento: &mut WireguardMemento, client_id: Uuid) {
        match memento.clients.get_mut(&client_id) {
            Some(client) => {
                client.enable();
                self.set_memento(&memento).await;
            }
            None => return,
        }
    }

    pub async fn disable_client(&self, memento: &mut WireguardMemento, client_id: Uuid) {
        match memento.clients.get_mut(&client_id) {
            Some(client) => {
                client.disable();
                self.set_memento(&memento).await;
            }
            None => return,
        }
    }

    pub async fn get_client_qrcode_svg(
        &self,
        memento: &WireguardMemento,
        client_id: Uuid,
    ) -> String {
        let (_, config) = self.get_client_configuration(memento, client_id);
        return qrcode_generator::to_svg_to_string_from_str(
            config,
            qrcode_generator::QrCodeEcc::Low,
            512,
            None::<&str>,
        )
        .unwrap();
    }

    fn format_config(&self, config: &WireguardMemento) -> String {
        let result_vec = vec![
            format!("# Note: Do not edit this file directly.\n"),
            format!("# Your changes will be overwritten!\n"),
            format!("\n"),
            format!("# Server\n"),
            format!("[Interface]\n"),
            format!("PrivateKey = {}\n", config.server.private_key),
            format!("Address = {}/24\n", config.server.address),
            format!("ListenPort = 51820\n"),
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
