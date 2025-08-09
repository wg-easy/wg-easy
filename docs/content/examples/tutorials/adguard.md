# AdGuard Home with WG Easy and Watchtower (Docker Compose / Host Mode)

## 📌 Description
This setup runs **AdGuard Home**, **WG Easy** (WireGuard management UI) and **Watchtower** for automatic updates — all in **Docker host network mode**.

---

## 📂 Prepare Local Folders

Before starting, create the required directories:

```bash
sudo mkdir -p /home/admin/docker/wireguard
sudo mkdir -p /home/admin/docker/adguard/work
sudo mkdir -p /home/admin/docker/adguard/conf
mkdir -p /home/admin/docker/watchtower

Save as docker-compose.yml:

services:
  wg-easy:
    image: ghcr.io/wg-easy/wg-easy:15
    container_name: wg-easy
    environment:
      - WG_HOST=your_Domain   # External domain / Router must forward port
      - WG_PORT=51820         # wg-easy listens on 51820/udp
      - WG_DEFAULT_DNS=10.8.0.1   # AdGuard runs on the same host
      - WG_ALLOWED_IPS=0.0.0.0/0,::/0
      - INSECURE=true
      - DISABLE_IPV6=false    # Set to true to disable IPv6
    volumes:
      - /home/admin/docker/wireguard:/etc/wireguard
      - /lib/modules:/lib/modules:ro    # Load IPv6 modules from host
    network_mode: host
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE

  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    network_mode: host
    volumes:
      - /home/admin/docker/adguard/work:/opt/adguardhome/work
      - /home/admin/docker/adguard/conf:/opt/adguardhome/conf
    restart: unless-stopped

  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      TZ: Europe/Zurich
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_INCLUDE_STOPPED: "true"
      WATCHTOWER_INCLUDE_RESTARTING: "true"
      WATCHTOWER_SCHEDULE: "0 0 23 * * *"
      WATCHTOWER_REMOVE_VOLUMES: "true"
    healthcheck:
      test: ["CMD", "/watchtower", "--health-check"]
      start_interval: 1s
      start_period: 1s
      interval: 600s
      timeout: 5s
      retries: 1
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"


▶️ Start Services
docker compose up -d

🔧 Notes
Port Forwarding: Ensure your router forwards UDP 51820 (or your chosen port) to the host.

IPv6:

Set DISABLE_IPV6=true to disable IPv6 support in WG Easy.

Keep it false if your network supports IPv6.

Watchtower will automatically update the containers every day at 23:00 (cron schedule).

📜 License
MIT — Use at your own risk.
