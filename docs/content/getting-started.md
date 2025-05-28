---
title: Getting Started
hide:
    - navigation
---

This page explains how to get started with `wg-easy`. The guide uses Docker Compose as a reference. In our examples, we mount the named volume `etc_wireguard` to `/etc/wireguard` inside the container.

## Preliminary Steps

Before you can get started with deploying your own VPN, there are some requirements to be met:

1. You need to have a host that you can manage
2. You need to have a domain name or a public IP address
3. You need a supported architecture (x86_64, arm64, armv7)

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
[docs-podman]: ./examples/tutorials/podman-nft.md

## Deploying the Actual Image

### Tagging Convention

To understand which tags you should use, read this section carefully. [Our CI][github-ci] will automatically build, test and push new images to the following container registry:

1. GitHub Container Registry ([`ghcr.io/wg-easy/wg-easy`][ghcr-image])

All workflows are using the tagging convention listed below. It is subsequently applied to all images.

| tag           | Type                            | Example                                                       | Description                                                                   |
| ------------- | ------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `15`          | latest minor for that major tag | `ghcr.io/wg-easy/wg-easy:15`                                  | latest features for specific major versions, no breaking changes, recommended |
| `latest`      | latest tag                      | `ghcr.io/wg-easy/wg-easy:latest` or `ghcr.io/wg-easy/wg-easy` | points to latest release, can include breaking changes                        |
| `15.0`        | latest patch for that minor tag | `ghcr.io/wg-easy/wg-easy:15.0`                                | latest patches for specific minor version                                     |
| `15.0.0`      | specific tag                    | `ghcr.io/wg-easy/wg-easy:15.0.0`                              | specific release, no updates                                                  |
| `edge`        | push to `master`                | `ghcr.io/wg-easy/wg-easy:edge`                                | mostly unstable, gets frequent package and code updates                       |
| `development` | pull requests                   | `ghcr.io/wg-easy/wg-easy:development`                         | used for development, testing code from PRs                                   |

<!-- ref: major version -->

When publishing a tag we follow the [Semantic Versioning][semver] specification. The `latest` tag is always pointing to the latest stable release. If you want to avoid breaking changes, use the major version tag (e.g. `15`).

[github-ci]: https://github.com/wg-easy/wg-easy/actions
[ghcr-image]: https://github.com/wg-easy/wg-easy/pkgs/container/wg-easy
[semver]: https://semver.org/

### Follow tutorials

- [Basic Installation with Docker Compose (Recommended)](./examples/tutorials/basic-installation.md)
- [Simple Installation with Docker Run](./examples/tutorials/docker-run.md)
- [Advanced Installation with Podman](./examples/tutorials/podman-nft.md)

/// danger | Use the Correct Commands For Stopping and Starting `wg-easy`

**Use `sudo docker compose up / down`, not `sudo docker compose start / stop`**. Otherwise, the container is not properly destroyed and you may experience problems during startup because of inconsistent state.
///

**That's it! It really is that easy**.
