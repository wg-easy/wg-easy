---
title: Getting Started
hide:
  - navigation
---

This page explains how to get started with wg-easy. The guide uses Docker Compose as a reference. In our examples, we mount the named volume `etc_wireguard` to `/etc/wireguard` inside the container.

## Preliminary Steps

Before you can get started with deploying your own VPN, there are some requirements to be met:

1. You need to have a host that you can manage
2. You need to have a domain name or a public IP address
3. You need a supported architecture (x86_64, arm64)

### Host Setup

There are a few requirements for a suitable host system:

1. You need to have a container runtime installed

/// note | About the Container Runtime

On the host, you need to have a suitable container runtime (like _Docker_ or _Podman_) installed. We assume [_Docker Compose_][docker-compose] is [installed][docker-compose-installation]. We have aligned file names and configuration conventions with the latest [Docker Compose specification][docker-compose-specification].
If you're using podman, make sure to read the related [documentation][docs-podman].
///

[docker-compose]: https://docs.docker.com/compose/
[docker-compose-installation]: https://docs.docker.com/compose/install/
[docker-compose-specification]: https://docs.docker.com/compose/compose-file/
[docs-podman]: ./examples/tutorials/podman.md

## Deploying the Actual Image

### Tagging Convention

To understand which tags you should use, read this section carefully. [Our CI][github-ci] will automatically build, test and push new images to the following container registry:

1. GitHub Container Registry ([`ghcr.io/wg-easy/wg-easy`][ghcr-image])

All workflows are using the tagging convention listed below. It is subsequently applied to all images.

| Event                   | Image Tags                    |
| ----------------------- | ----------------------------- |
| `cron` on `master`      | `nightly`                     |
| `push` a tag (`v1.2.3`) | `1.2.3`, `1.2`, `1`, `latest` |

When publishing a tag we follow the [Semantic Versioning][semver] specification. The `latest` tag is always pointing to the latest stable release. If you want to avoid breaking changes, use the major version tag (e.g. `15`).

[github-ci]: https://github.com/wg-easy/wg-easy/actions
[ghcr-image]: https://github.com/wg-easy/wg-easy/pkgs/container/wg-easy
[semver]: https://semver.org/

### Get All Files

Issue the following command to acquire the necessary file:

```shell
wget "https://raw.githubusercontent.com/wg-easy/wg-easy/master/docker-compose.yml"
```

### Start the Container

To start the container, issue the following command:

```shell
sudo docker compose up -d
```

### Configuration Steps

Now follow the setup process in your web browser

### Stopping the Container

To stop the container, issue the following command:

```shell
sudo docker compose down
```

/// danger | Using the Correct Commands For Stopping and Starting wg-easy

**Use `sudo docker compose up / down`, not `sudo docker compose start / stop`**. Otherwise, the container is not properly destroyed and you may experience problems during startup because of inconsistent state.
///

**That's it! It really is that easy**.

If you need more help you can read the [Basic Installation Tutorial][basic-installation].

[basic-installation]: ./examples/tutorials/basic-installation.md
