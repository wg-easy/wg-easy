mod utils;
mod wg_rs;
use actix_session::{storage::CookieSessionStore, Session, SessionMiddleware};

use actix_web::{
    delete, get,
    http::header::{self, ContentDisposition, DispositionParam},
    middleware::Logger,
    post, web, App, HttpResponse, HttpServer, Responder,
};

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use utils::{misc, os};
use uuid::Uuid;
use wg_rs::config::Settings;

use wg_rs::wireguard::WireGuard;

#[derive(Deserialize)]
struct Name {
    pub name: String,
}
struct Static {
    pub dir: String,
    pub index_page: String,
    pub manifest: String,
}
struct Security {
    pub password: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "camelCase"))]
struct AuthCheck {
    pub requires_password: bool,
    pub authenticated: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all(serialize = "camelCase"))]
#[serde(rename_all(deserialize = "camelCase"))]
struct AuthRequest {
    pub password: String,
}

#[get("/")]
async fn index(static_files: web::Data<Static>) -> impl Responder {
    HttpResponse::Ok().body(static_files.index_page.to_string())
}
#[get("/manifest.json")]
async fn manifest(static_files: web::Data<Static>) -> impl Responder {
    HttpResponse::Ok().body(static_files.manifest.to_string())
}

#[get("/js/{filename:.*}")]
async fn get_script(
    name: web::Path<String>,
    static_files: web::Data<Static>,
) -> actix_web::Result<impl Responder> {
    let path = format!("{}/js/{}", static_files.dir, name);
    Ok(actix_files::NamedFile::open_async(path).await?)
}

#[get("/css/{filename:.*}")]
async fn get_style(
    name: web::Path<String>,
    static_files: web::Data<Static>,
) -> actix_web::Result<impl Responder> {
    let path = format!("{}/css/{}", static_files.dir, name);
    Ok(actix_files::NamedFile::open_async(path).await?)
}

#[get("/img/{filename:.*}")]
async fn get_image(
    name: web::Path<String>,
    static_files: web::Data<Static>,
) -> actix_web::Result<impl Responder> {
    let path = format!("{}/img/{}", static_files.dir, name);
    Ok(actix_files::NamedFile::open_async(path).await?)
}

#[get("/api/release")]
async fn release() -> impl Responder {
    HttpResponse::Ok().body("7")
}

#[get("/api/session")]
async fn session_check(session: Session, security: web::Data<Security>) -> impl Responder {
    let mut auth_req = AuthCheck {
        authenticated: true,
        requires_password: true,
    };

    if security.password.is_empty() {
        auth_req.requires_password = false;
    } else {
        match session.get::<bool>("authenticated") {
            Ok(auth) => match auth {
                Some(val) => {
                    auth_req.authenticated = val;
                }
                None => {
                    auth_req.authenticated = false;
                }
            },
            Err(_) => {
                auth_req.authenticated = false;
            }
        }
    }

    HttpResponse::Ok().body(serde_json::to_string_pretty(&auth_req).unwrap())
}

#[post("/api/session")]
async fn session_login(
    session: Session,
    request_body: web::Json<AuthRequest>,
    security: web::Data<Security>,
) -> impl Responder {
    if !request_body.password.eq(&security.password) {
        return HttpResponse::Unauthorized();
    }
    _ = session.insert("authenticated", true);
    HttpResponse::NoContent()
}

#[delete("/api/session")]
async fn session_logout(session: Session) -> impl Responder {
    session.clear();
    HttpResponse::NoContent()
}

#[get("/api/wireguard/client")]
async fn all_clients(wireguard: web::Data<RwLock<WireGuard>>) -> impl Responder {
    let wireguard = wireguard.read().await;
    let clients = wireguard.get_clients().await;
    HttpResponse::Ok().body(serde_json::to_string_pretty(&clients).unwrap())
}

#[get("/api/wireguard/client/{id}/qrcode.svg")]
async fn client_qr(id: web::Path<Uuid>, wireguard: web::Data<RwLock<WireGuard>>) -> impl Responder {
    let wireguard = wireguard.read().await;
    let qr = wireguard.get_client_qrcode_svg(*id).await;
    HttpResponse::Ok().body(qr)
}

#[get("/api/wireguard/client/{id}/configuration")]
async fn client_config(
    id: web::Path<Uuid>,
    wireguard: web::Data<RwLock<WireGuard>>,
) -> impl Responder {
    let wireguard = wireguard.read().await;
    let (name, config) = wireguard.get_client_configuration(*id);
    HttpResponse::Ok()
        .content_type("text/plain")
        .append_header(ContentDisposition {
            disposition: header::DispositionType::Attachment,
            parameters: vec![
                DispositionParam::Name(String::from("file")),
                DispositionParam::Filename(format!("{}.conf", name)),
            ],
        })
        .body(config)
}

#[post("/api/wireguard/client")]
async fn create_client(
    data: web::Json<Name>,
    wireguard: web::Data<RwLock<WireGuard>>,
) -> impl Responder {
    let mut wireguard = wireguard.write().await;
    let client = wireguard.create_client(data.name.to_string()).await;
    HttpResponse::Ok().body(serde_json::to_string_pretty(&client).unwrap())
}

#[delete("/api/wireguard/client/{id}")]
async fn delete_client(
    id: web::Path<Uuid>,
    wireguard: web::Data<RwLock<WireGuard>>,
) -> impl Responder {
    let mut wireguard = wireguard.write().await;
    wireguard.delete_client(*id).await;
    HttpResponse::NoContent()
}

#[post("/api/wireguard/client/{id}/enable")]
async fn enable_client(
    id: web::Path<Uuid>,
    wireguard: web::Data<RwLock<WireGuard>>,
) -> impl Responder {
    let mut wireguard = wireguard.write().await;
    wireguard.enable_client(*id).await;
    HttpResponse::NoContent()
}

#[post("/api/wireguard/client/{id}/disable")]
async fn disable_client(
    id: web::Path<Uuid>,
    wireguard: web::Data<RwLock<WireGuard>>,
) -> impl Responder {
    let mut wireguard = wireguard.write().await;
    wireguard.disable_client(*id).await;
    HttpResponse::NoContent()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "actix_web=debug,debug");
    }
    if std::env::var("RUST_BACKTRACE").is_err() {
        std::env::set_var("RUST_BACKTRACE", "0");
    }
    env_logger::init();

    let wireguard_path = get_env("WIREGUARD_PATH", "./data/wireguard");
    let static_dir = get_env("STATIC_DIR", "./data/www");
    let password = get_env("PASSWORD", "123321");

    let settings = get_wireguard_settings();
    let mut wireguard = WireGuard::new(wireguard_path, settings).await;
    wireguard.start().await;

    let index_path = format!("{}/index.html", static_dir);
    let mainfest_path = format!("{}/manifest.json", static_dir);

    let index_page = os::read_file(index_path)
        .await
        .expect("Could not read index");
    let manifest_file = os::read_file(mainfest_path)
        .await
        .expect("Could not read manifest");

    let security = web::Data::new(Security { password });
    let web_wireguard = web::Data::new(RwLock::new(wireguard));
    let static_files = web::Data::new(Static {
        dir: static_dir,
        index_page,
        manifest: manifest_file,
    });

    let key = actix_web::cookie::Key::from(&[0; 64]);

    HttpServer::new(move || {
        App::new()
            .app_data(web_wireguard.clone())
            .app_data(static_files.clone())
            .app_data(security.clone())
            .wrap(Logger::default())
            .wrap(Logger::new("%a %{User-Agent}i"))
            .wrap(
                SessionMiddleware::builder(CookieSessionStore::default(), key.clone())
                    .cookie_secure(false)
                    .build(),
            )
            .service(release)
            .service(session_check)
            .service(session_login)
            .service(session_logout)
            .service(index)
            .service(manifest)
            .service(get_script)
            .service(get_style)
            .service(get_image)
            .service(create_client)
            .service(all_clients)
            .service(client_qr)
            .service(client_config)
            .service(create_client)
            .service(delete_client)
            .service(enable_client)
            .service(disable_client)
    })
    .bind(("0.0.0.0", 8080))?
    .workers(1)
    .run()
    .await
}

fn get_wireguard_settings() -> Settings {
    let interface_name = get_env("INTERFACE_NAME", "wg0");
    let release_ = get_env("RELEASE", "rs0");
    let api_port = get_env("API_PORT", "8080");
    let password = get_env("PASSWORD", "123321");
    let host = std::env::var("HOST").expect("Must set HOST env var");
    let wg_port = std::env::var("WG_PORT").expect("Must set WG_PORT env var");
    let mtu = get_env("MTU", "0");
    let persistent_keepalive = get_env("PERSISTENT_KEEPALIVE", "25");
    let default_address = get_env("DEFAULT_ADDRESS", "10.8.0.1");
    let default_address_base = get_env("DEFAULT_ADDRESS_BASE", "10.8.0");
    let default_dns = get_env("DEFAULT_DNS", "1.1.1.1");
    let allowed_ips = get_env("ALLOWED_IPS", "0.0.0.0/0, ::/0");

    let default_post_up = vec![
        format!(
            "iptables -t nat -A POSTROUTING -s {}.0/24 -o eth0 -j MASQUERADE; ",
            default_address_base
        ),
        format!(
            "iptables -A INPUT -p udp -m udp --dport {} -j ACCEPT; ",
            wg_port
        ),
        format!("iptables -A FORWARD -i {} -j ACCEPT; ", interface_name),
        format!("iptables -A FORWARD -o {} -j ACCEPT;", interface_name),
    ];

    let pre_up = get_env("PRE_UP", "");
    let post_up = get_env("POST_UP", misc::multi_line(&default_post_up).as_str());
    let pre_down = get_env("PRE_DOWN", "");
    let post_down = get_env("POST_DOWN", "");

    Settings {
        interface_name,
        release: release_,
        api_port: api_port.parse::<i32>().expect("Invalid api port was set"),
        password,
        host,
        wg_port: wg_port.parse::<i32>().expect("Invalid wg port was set"),
        mtu: mtu.parse::<i32>().expect("Invalid mtu was set"),
        persistent_keepalive: persistent_keepalive
            .parse::<i32>()
            .expect("Invalid keepalive was set"),
        default_address,
        default_address_base,
        default_dns,
        allowed_ips,
        pre_up,
        post_up,
        pre_down,
        post_down,
    }
}

fn get_env(name: &str, default: &str) -> String {
    match std::env::var(name) {
        Ok(path) => path,
        Err(_) => {
            log::info!("{} was not set. Using default: {}.", name, default);
            String::from(default)
        }
    }
}
