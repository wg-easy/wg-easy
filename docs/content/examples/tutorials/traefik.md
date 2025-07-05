---
title: Traefik
---

/// note | Opinionated

This guide is opinionated. If you use other conventions or folder layouts, feel free to change the commands and paths.
///

## Create docker compose project

```shell
sudo mkdir -p /etc/docker/containers/traefik
cd /etc/docker/containers/traefik
```

## Create docker compose file

File: `/etc/docker/containers/traefik/docker-compose.yml`

```yaml
services:
    traefik:
        image: traefik:3.3
        container_name: traefik
        restart: unless-stopped
        ports:
            - '80:80'
            - '443:443/tcp'
            - '443:443/udp'
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
            - /etc/docker/volumes/traefik/traefik.yml:/traefik.yml:ro
            - /etc/docker/volumes/traefik/traefik_dynamic.yml:/traefik_dynamic.yml:ro
            - /etc/docker/volumes/traefik/acme.json:/acme.json
        networks:
            - traefik

networks:
    traefik:
        external: true
```

## Create traefik.yml

File: `/etc/docker/volumes/traefik/traefik.yml`

```yaml
log:
    level: INFO

entryPoints:
    web:
        address: ':80/tcp'
        http:
            redirections:
                entryPoint:
                    to: websecure
                    scheme: https
    websecure:
        address: ':443/tcp'
        http:
            middlewares:
                - compress@file
                - hsts@file
            tls:
                certResolver: letsencrypt
        http3: {}

api:
    dashboard: true

certificatesResolvers:
    letsencrypt:
        acme:
            email: $mail@example.com$
            storage: acme.json
            httpChallenge:
                entryPoint: web

providers:
    docker:
        watch: true
        network: traefik
        exposedByDefault: false
    file:
        filename: traefik_dynamic.yml

serversTransport:
    insecureSkipVerify: true
```

## Create traefik_dynamic.yml

File: `/etc/docker/volumes/traefik/traefik_dynamic.yml`

```yaml
http:
    middlewares:
        services:
            basicAuth:
                users:
                    - '$username$:$password$'
        compress:
            compress: {}
        hsts:
            headers:
                stsSeconds: 2592000
    routers:
        api:
            rule: Host(`traefik.$example.com$`)
            entrypoints:
                - websecure
            middlewares:
                - services
            service: api@internal

tls:
    options:
        default:
            cipherSuites:
                - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
                - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
                - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
            sniStrict: true
```

## Create acme.json

```shell
sudo touch /etc/docker/volumes/traefik/acme.json
sudo chmod 600 /etc/docker/volumes/traefik/acme.json
```

## Create network

```shell
sudo docker network create traefik
```

## Start traefik

```shell
sudo docker compose up -d
```

You can no access the Traefik dashboard at `https://traefik.$example.com$` with the credentials you set in `traefik_dynamic.yml`.

## Add Labels to `wg-easy`

To add labels to your `wg-easy` service, you can add the following to your `docker-compose.yml` file:

File: `/etc/docker/containers/wg-easy/docker-compose.yml`

```yaml
services:
  wg-easy:
    ...
    container_name: wg-easy
    networks:
      ...
      traefik: {}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.wg-easy.rule=Host(`wg-easy.$example.com$`)"
      - "traefik.http.routers.wg-easy.entrypoints=websecure"
      - "traefik.http.routers.wg-easy.service=wg-easy"
      - "traefik.http.services.wg-easy.loadbalancer.server.port=51821"
      - "traefik.docker.network=traefik"
    ...

networks:
  ...
  traefik:
    external: true
```

## Restart `wg-easy`

```shell
cd /etc/docker/containers/wg-easy
sudo docker compose up -d
```

You can now access `wg-easy` at `https://wg-easy.$example.com$` and start the setup.
