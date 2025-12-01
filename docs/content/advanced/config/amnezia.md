---
title: AmneziaWG
---

## Introduction

**AmneziaWG** is a modified version of the WireGuard protocol with enhanced traffic obfuscation capabilities. AmneziaWG's primary goal is to counter deep packet inspection (DPI) systems and bypass VPN blocking.

AmneziaWG adds multi-level transport-layer obfuscation by:

- Modifying packet headers
- Randomizing handshake message sizes
- Disguising traffic to resemble popular UDP protocols

These measures make it harder for third parties to analyze or identify your traffic, enhancing both privacy and security.

## Activating AmneziaWG

You must install the [AmneziaWG kernel module](https://github.com/amnezia-vpn/amneziawg-linux-kernel-module) on the host system.

Experimental support for AmneziaWG can be enabled by setting the `EXPERIMENTAL_AWG` environment variable to `true`. Starting from wg-easy version 16, this setting will be enabled by default. This feature is still under development and may change in future releases.

When enabled, wg-easy will automatically detect whether the AmneziaWG kernel module is available. If it is not, the system will fall back to the standard WireGuard module.

To override this automatic detection, set the `OVERRIDE_AUTO_AWG` environment variable. By default, this variable is unset.

Possible values:

- `awg` — Force use of AmneziaWG
- `wg` — Force use of standard WireGuard

## AmneziaWG Parameters

Parameter descriptions can be found in the [AmneziaWG documentation](https://docs.amnezia.org/documentation/amnezia-wg) and on the [kernel module page](https://github.com/amnezia-vpn/amneziawg-linux-kernel-module).

All parameters except I1-I5 will be set at first startup. For information on how to set I1-I5 parameters, refer to the [AmneziaWG documentation](https://docs.amnezia.org/documentation/instructions/new-amneziawg-selfhosted/#how-to-extract-a-protocol-signature-for-amneziawg-15-manually).

If a parameter is not set, it will not be added to the configuration. If all AmneziaWG-specific parameters are absent, AmneziaWG will be fully compatible with standard WireGuard.

### Parameter Compatibility Table

| Parameter | Can differ between server and client | Configurable on server | Configurable on client  |
| --------- | ------------------------------------ | ---------------------- | ----------------------- |
| Jc        | ✅ Yes                               | ✅                     | ✅                      |
| Jmin      | ✅ Yes                               | ✅                     | ✅                      |
| Jmax      | ✅ Yes                               | ✅                     | ✅                      |
| S1-S4     | ❌ No, must match                    | ✅                     | ❌ (copied from server) |
| H1-H4     | ❌ No, must match                    | ✅                     | ❌ (copied from server) |
| I1-I5     | ✅ Yes                               | ✅                     | ✅                      |

## Client Applications

To be able to connect to wg-easy if AmneziaWG is enabled, you must have an AmneziaWG-compatible client. Currently, only WG Tunnel and Amnezia VPN supports AmneziaWG 1.5/2.0! AmneziaWG clients require building from source code.

Android:

- [Amnezia VPN](https://play.google.com/store/apps/details?id=org.amnezia.vpn) - Amnezia VPN Official Client
- [AmneziaWG](https://play.google.com/store/apps/details?id=org.amnezia.awg) - AmneziaWG Official Client
- [WG Tunnel](https://play.google.com/store/apps/details?id=com.zaneschepke.wireguardautotunnel) - Third Party Client

iOS and macOS:

- [Amnezia VPN](https://apps.apple.com/us/app/amneziavpn/id1600529900) - Amnezia VPN Official Client
- [AmneziaWG](https://apps.apple.com/us/app/amneziawg/id6478942365) - AmneziaWG Official Client

Windows:

- [Amnezia VPN](https://amnezia.org/downloads) - Amnezia VPN Official Client
- [AmneziaWG](https://github.com/amnezia-vpn/amneziawg-windows-client/releases) - AmneziaWG Official Client

Linux:

- [Amnezia VPN](https://amnezia.org/downloads) - Amnezia VPN Official Client
- [amneziawg-tools](https://github.com/amnezia-vpn/amneziawg-tools) - AmneziaWG Tools

OpenWRT:

- [AmneziaWG OpenWRT](https://github.com/Slava-Shchipunov/awg-openwrt) - AmneziaWG OpenWRT Packages
- [AmneziaWG OpenWRT](https://github.com/lolo6oT/awg-openwrt) - AmneziaWG OpenWRT Packages
