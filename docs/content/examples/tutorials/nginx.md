---
title: NGINX
---

This is an example on how to use WireGuard Easy with nginx, to access it on a HTTPS domain (e.g. `https://wg-easy.myhomelab.com`).

## Generate the admin password crypt you will need to provide as PASSWORD_HASH
```
docker run --rm -it ghcr.io/wg-easy/wg-easy wgpw '⚠️password'
```

## `docker-compose.yml`:

```yaml
volumes:
  etc_wireguard:

services:
  wg-easy:
    environment:
      - LANG=en
      # ⚠️ Change the server's hostname (clients will connect to):
      - WG_HOST=wg-easy.myhomelab.com
      # ⚠️ Change the Web UI Password.  Must be a valid bcrypt hash.  Note link below.
      # You must find any single $ in your hash nd change it to $$ due to Docker 
      # environment variable interpolation 
      - PASSWORD_HASH=$$....
      # Optional:
      # - PASSWORD_HASH=$$2y$$10$$hBCoykrB95WSzuV4fafBzOHWKu9sbyVa34GJr8VV5R/pIelfEMYyG # (needs double $$, hash of 'foobar123'; see "How_to_generate_an_bcrypt_hash.md" for generate the hash)
      # - PORT=51821
      # - WG_PORT=51820
      # - WG_CONFIG_PORT=92820
      # - WG_DEFAULT_ADDRESS=10.8.0.x
      # - WG_DEFAULT_DNS=1.1.1.1
      # - WG_MTU=1420
      # - WG_ALLOWED_IPS=192.168.15.0/24, 10.0.1.0/24
      # - WG_PERSISTENT_KEEPALIVE=25
      # - WG_PRE_UP=echo "Pre Up" > /etc/wireguard/pre-up.txt
      # - WG_POST_UP=echo "Post Up" > /etc/wireguard/post-up.txt
      # - WG_PRE_DOWN=echo "Pre Down" > /etc/wireguard/pre-down.txt
      # - WG_POST_DOWN=echo "Post Down" > /etc/wireguard/post-down.txt
      # - UI_TRAFFIC_STATS=true
      # - UI_CHART_TYPE=0 # (0 Charts disabled, 1 # Line chart, 2 # Area chart, 3 # Bar chart)
      # - WG_ENABLE_ONE_TIME_LINKS=true
      # - UI_ENABLE_SORT_CLIENTS=true
      # - WG_ENABLE_EXPIRES_TIME=true
      # - ENABLE_PROMETHEUS_METRICS=false
      # - PROMETHEUS_METRICS_PASSWORD=$$2a$$12$$vkvKpeEAHD78gasyawIod.1leBMKg8sBwKW.pQyNsq78bXV3INf2G # (needs double $$, hash of 'prometheus_password'; see "How_to_generate_an_bcrypt_hash.md" for generate the hash)

    image: ghcr.io/wg-easy/wg-easy
    container_name: wg-easy
    hostname: wg-easy
    volumes:
      - etc_wireguard:/etc/wireguard
    ports:
      - "51820:51820/udp"
      - "51821:51821/tcp"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
        # uncomment for Podman use
        # - NET_RAW
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.src_valid_mark=1

  nginx:
    image: weejewel/nginx-with-certbot
    container_name: nginx
    hostname: nginx
    volumes:
      - ./nginx/servers/:/etc/nginx/servers/
      - ./nginx/letsencrypt/:/etc/letsencrypt/
    ports:
      - "80:80/tcp"
      - "443:443/tcp"
    restart: unless-stopped
```

- make subdirectory for nginx configuration file
```
mkdir -p nginx/servers
mkdir nginx/letsencrypt
```
- create this file in the nginx/servers directory
## nginx/servers/wg-easy.conf
```
server {
    server_name ⚠️wg-easy.myhomelab.com;

    location / {
        proxy_pass http://wg-easy:51821/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Save these files, edit the variables marked with `⚠️` and run `docker-compose up -d` in the same directory.

Then run once:

```bash
$ docker exec -it nginx /bin/sh
$ cp /etc/nginx/servers/wg-easy.conf /etc/nginx/conf.d/.
$ certbot --nginx --non-interactive --agree-tos -m ⚠️your@email.com -d ⚠️wg-easy.myhomelab.com
$ nginx -s reload
$ exit
```

Of course, make sure to point `wg-easy.myhomelab.com` to your server's IP address with a DNS A record or DynamicDNS or any other method. Ensure ports `80`, `443`, `51820` are available (e.g. by forwarding them in your router).

That's it!
