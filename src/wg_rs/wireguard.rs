use std::sync::Arc;

use chrono::{SecondsFormat, SubsecRound, Utc};

use log::error;
use uuid::Uuid;

use crate::utils::{misc, os};

use super::config::{Accessor, Client, DumpClient, Settings, WebClient};

#[derive(Clone)]
pub struct WireGuard {
    pub name: String,
    settings: Arc<Settings>,
    memento_accessor: Accessor,
}

impl WireGuard {
    pub async fn new(wg_path: String, settings: Settings) -> Self {
        let path = format!("{}/{}", wg_path, settings.interface_name);
        let config_path = format!("{}.conf", path);
        let memento_path = format!("{}.json", path);
        let name = format!("{}", settings.interface_name);

        let counter = Arc::new(settings);

        Self {
            name,
            settings: counter.clone(),
            memento_accessor: Accessor::build(memento_path, config_path, counter)
                .await
                .unwrap_or_else(|err| {
                    error!("Error initializing Wireguard: {}", err);
                    panic!()
                }),
        }
    }

    pub async fn quick_up(&self) {
        os::exec_sh(&format!("wg-quick up {}", &self.name))
            .await
            .unwrap_or_else(|err| {
                error!("Error quick_up: {}", err);
                panic!()
            })
            .log();
    }

    pub async fn quick_down(&self) {
        os::exec_sh(&format!("wg-quick down {}", &self.name))
            .await
            .unwrap_or_else(|err| {
                error!("Error quick_down: {}", err);
                panic!()
            })
            .log();
    }

    pub async fn sync_config(&self) {
        os::exec_sh(&format!(
            "wg syncconf {} <(wg-quick strip {})",
            self.name, self.name
        ))
        .await
        .unwrap_or_else(|err| {
            error!("Error syncing: {}", err);
            panic!()
        })
        .log();
    }

    pub async fn start(&mut self) {
        let memento = self.memento_accessor.get();
        self.memento_accessor.set(memento).await;
        self.quick_down().await;
        self.quick_up().await;
        self.sync_config().await;
    }

    pub async fn create_client(&mut self, name: String) -> Client {
        let private_key = os::exec_sh(&"wg genkey")
            .await
            .expect("error genkey")
            .stdout;

        let pub_cmd = format!("echo {} | wg pubkey", private_key);
        let public_key = os::exec_sh(&pub_cmd).await.expect("error pubkey").stdout;

        let pre_shared_key = os::exec_sh(&"wg genpsk")
            .await
            .expect("error genpsk")
            .stdout;

        let mut memento = self.memento_accessor.get();

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

        let client = memento.clients.get(&uuid).unwrap().clone();
        self.memento_accessor.set(memento).await;
        self.sync_config().await;
        client
    }

    pub fn get_client(&self, client_id: Uuid) -> Client {
        self.memento_accessor
            .get()
            .clients
            .get(&client_id)
            .expect("Could not find user")
            .clone()
    }

    pub async fn get_clients(&self) -> Vec<WebClient> {
        let res = os::exec_sh(&"wg show wg0 dump").await.unwrap();

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

        let memento = self.memento_accessor.get();
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

    pub fn get_client_configuration(&self, client_id: Uuid) -> (String, String) {
        let memento = self.memento_accessor.get();
        let client = self.get_client(client_id);
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

    pub async fn delete_client(&mut self, client_id: Uuid) {
        let mut memento = self.memento_accessor.get();
        if memento.clients.remove(&client_id).is_some() {
            self.memento_accessor.set(memento).await;
        }
    }

    pub async fn enable_client(&mut self, client_id: Uuid) {
        let mut memento = self.memento_accessor.get();
        match memento.clients.get_mut(&client_id) {
            Some(client) => {
                client.enable();
                self.memento_accessor.set(memento).await;
            }
            None => return,
        }
    }

    pub async fn disable_client(&mut self, client_id: Uuid) {
        let mut memento = self.memento_accessor.get();
        match memento.clients.get_mut(&client_id) {
            Some(client) => {
                client.disable();
                self.memento_accessor.set(memento).await;
            }
            None => return,
        }
    }

    pub async fn get_client_qrcode_svg(&self, client_id: Uuid) -> String {
        let (_, config) = self.get_client_configuration(client_id);
        return qrcode_generator::to_svg_to_string_from_str(
            config,
            qrcode_generator::QrCodeEcc::Low,
            512,
            None::<&str>,
        )
        .unwrap();
    }
}
