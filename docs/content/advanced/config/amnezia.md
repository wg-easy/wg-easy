---
title: AmneziaWG
---

Experimental support for AmneziaWG can be enabled by setting the `EXPERIMENTAL_AWG` environment variable to `true`. This feature is still under development and may change in future releases.

AmneziaWG adds multi-level transport-layer obfuscation by:

- Modifying packet headers
- Randomizing handshake message sizes
- Disguising traffic to resemble popular UDP protocols

These measures make it harder for third parties to analyze or identify your traffic, enhancing both privacy and security.

When enabled, wg-easy will automatically detect whether the AmneziaWG kernel module is available. If it is not, the system will fall back to the standard WireGuard module.

To override this automatic detection, set the `OVERRIDE_AUTO_AWG` environment variable. By default, this variable is unset.

Possible values:

- `awg` — Force use of AmneziaWG
- `wg` — Force use of standard WireGuard

To be able to connect to wg-easy if AmneziaWG is enabled, you must have a AmneziaWG-compatible client.

Android:

- [AmneziaWG](https://play.google.com/store/apps/details?id=org.amnezia.awg) - Official Client
- [WG Tunnel](https://play.google.com/store/apps/details?id=com.zaneschepke.wireguardautotunnel) - Third Party Client

iOS and macOS:

- [AmneziaWG](https://apps.apple.com/us/app/amneziawg/id6478942365) - Official Client

Windows:

- [AmneziaWG](https://github.com/amnezia-vpn/amneziawg-windows-client/releases) - Official Client
