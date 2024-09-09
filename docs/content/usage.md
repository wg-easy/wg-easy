---
title: Usage
hide:
  - navigation
---

This page explains how to get started with wg-easy. The guide uses Docker Compose as a reference. In our examples, a volume mounts the named volume [`etc_wireguard`][docs::dms-volumes-config] to `/etc/wireguard` inside the container.

[docs::dms-volumes-config]: ./config/advanced/optional-config.md#volumes-config

## Preliminary Steps

Before you can get started with deploying your own VPN, there are some requirements to be met:

1. You need to have a host that you can manage.

### Host Setup

There are a few requirements for a suitable host system:

TODO: Requirements

!!! note "About the Container Runtime"

    On the host, you need to have a suitable container runtime (like _Docker_ or _Podman_) installed. We assume [_Docker Compose_][docker-compose] is [installed][docker-compose-installation]. We have aligned file names and configuration conventions with the latest [Docker Compose specification][docker-compose-specification].

    If you're using podman, make sure to read the related [documentation][docs-podman].

[docker-compose]: https://docs.docker.com/compose/
[docker-compose-installation]: https://docs.docker.com/compose/install/
[docker-compose-specification]: https://docs.docker.com/compose/compose-file/
[docs-podman]: ./config/advanced/podman.md

## Deploying the Actual Image

### Tagging Convention

To understand which tags you should use, read this section carefully. [Our CI][github-ci] will automatically build, test and push new images to the following container registry:

2. GitHub Container Registry ([`ghcr.io/wg-easy/wg-easy`][ghcr-image])

All workflows are using the tagging convention listed below. It is subsequently applied to all images.

| Event                   | Image Tags                    |
|-------------------------|-------------------------------|
| `cron` on `master`      | `nightly`                     |
| `push` a tag (`v1.2.3`) | `1.2.3`, `1.2`, `1`, `latest` |

[github-ci]: https://github.com/wg-easy/wg-easy/actions
[ghcr-image]: https://github.com/wg-easy/wg-easy/pkgs/container/wg-easy

### Get All Files

Issue the following command to acquire the necessary file:

``` BASH
wget "https://raw.githubusercontent.com/wg-easy/wg-easy/master/docker-compose.yml"
```

### Configuration Steps

1. First edit `docker-compose.yml` to your liking
2. Then configure the everything in the UI

### Get Up and Running

!!! danger "Using the Correct Commands For Stopping and Starting DMS"

    **Use `docker compose up / down`, not `docker compose start / stop`**. Otherwise, the container is not properly destroyed and you may experience problems during startup because of inconsistent state.

    Using `Ctrl+C` **is not supported either**!

**That's it! It really is that easy**.


