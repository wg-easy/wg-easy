---
title: Experimental Configuration
---

There are several experimental features that can be enabled by setting the appropriate environment variables. These features are not guaranteed to be stable and may change in future releases.

| Env                  | Default | Example | Description                                               | Notes                                           | More Info                |
| -------------------- | ------- | ------- | --------------------------------------------------------- | ----------------------------------------------- | ------------------------ |
| EXPERIMENTAL_AWG     | false   | true    | Enables experimental AmneziaWG support                    | Planned to be enabled by default in v16         | [See here](./amnezia.md) |
| AWG_PROTOCOL_VERSION | latest  | 2       | Selects AWG 2.0, 3.0, 3.1 or the latest supported version | Applies to new profiles; saved versions persist | [See here](./amnezia.md) |
| AWG_AUTO_GENERATE    | false   | true    | Generates server parameters and client defaults once      | Requires a fresh AWG configuration              | [See here](./amnezia.md) |
