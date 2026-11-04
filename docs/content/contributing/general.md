---
title: General Information
---

## Coding Style

Follow the surrounding code style and use the included VS Code settings.
Run `pnpm lint` from `src` before submitting changes.

## Tests

From the repository root, install dependencies and run the unit tests:

```sh
cd src
pnpm install
pnpm test:unit
```

Browser tests cover setup, login, client management, VPN connectivity, and restarts.
They require Docker Compose v2 and WireGuard support in Docker's Linux kernel.
Still in `src`, run:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

The tests build the app and clean up their containers and data afterward.
To inspect a failure, run `pnpm exec playwright show-report` from `src`.

Add tests for meaningful behavior and regressions. CI runs both suites on pull requests.

## Documentation

To edit a page online, select `edge` in the version dropdown and click the edit button.

To preview local changes, start Docker and run this from the repository root:

```sh
pnpm docs:preview
```

Open <http://localhost:8080>. The preview reloads when you save changes.
