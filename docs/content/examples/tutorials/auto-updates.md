---
title: Auto Updates
---

## Docker Compose

With Docker Compose `wg-easy` can be updated with a single command:

Replace `$DIR` with the directory where your `docker-compose.yml` is located.

```shell
cd $DIR
sudo docker compose up -d --pull always
```

## Docker Run

```shell
sudo docker stop wg-easy
sudo docker rm wg-easy
sudo docker pull ghcr.io/wg-easy/wg-easy
```

And then run the `docker run -d \ ...` command from [Docker Run][docker-run] again.

[docker-run]: ./docker-run.md

## Podman

To update `wg-easy` (and every container that has auto updates enabled), you can run the following command:

```shell
sudo podman auto-update
```
