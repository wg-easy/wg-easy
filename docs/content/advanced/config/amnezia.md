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

This fork always uses AmneziaWG. `EXPERIMENTAL_AWG` and `OVERRIDE_AUTO_AWG`
are no longer required and do not switch the protocol.

Use an AmneziaWG 3.1 kernel module on the Linux host, or expose `/dev/net/tun`
to use the bundled `amneziawg-go` when no AWG module is installed. An installed
older module must be upgraded or removed before using 3.1 parameters.

New databases receive a random HeaderProtectionKey, S1–S4 values of
128/56/12/12, ContentPaddingAddition `0-64`, RandomTrailers `on` and
DisableCookies `on`. Existing databases retain their settings and require
manual configuration and re-export of client profiles to enable these features.

## AmneziaWG Parameters

Parameter descriptions can be found in the [AmneziaWG documentation](https://docs.amnezia.org/documentation/amnezia-wg) and on the [kernel module page](https://github.com/amnezia-vpn/amneziawg-linux-kernel-module).

On new installations, the profile described above and H1-H4 are initialized at first startup; timing ranges and I1-I5 remain unset. For information on how to set I1-I5 parameters, refer to the [AmneziaWG documentation](https://docs.amnezia.org/documentation/instructions/new-amneziawg-selfhosted/#how-to-extract-a-protocol-signature-for-amneziawg-15-manually).

If a parameter is not set, it will not be added to the configuration. If all AmneziaWG-specific parameters are absent, AmneziaWG will be fully compatible with standard WireGuard.

### Parameter Compatibility Table

| Parameter              | Can differ between server and client | Configurable on server | Configurable on client   |
| ---------------------- | ------------------------------------ | ---------------------- | ------------------------ |
| Jc                     | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| Jmin                   | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| Jmax                   | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| S1-S4                  | :x: No, must match                   | :white_check_mark:     | :x: (copied from server) |
| H1-H4                  | :x: No, must match                   | :white_check_mark:     | :x: (copied from server) |
| I1-I5                  | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| HeaderProtectionKey    | :x: No, must match                   | :white_check_mark:     | :x: (copied from server) |
| RandomTrailers         | :x: No, must match                   | :white_check_mark:     | :x: (copied from server) |
| ContentPaddingAddition | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| RekeyAfterTime         | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| RekeyTimeout           | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| RejectAfterTime        | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| KeepaliveTimeout       | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| MaxHandshakeAttempts   | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |
| DisableCookies         | :white_check_mark: Yes               | :white_check_mark:     | :white_check_mark:       |

### AmneziaWG 3.0 and 3.1 Parameters

These parameters require AmneziaWG 3.0 or newer on both ends of the tunnel. Older clients reject configurations that contain them, so leave them unset if you still support AmneziaWG 2.x clients.

`HeaderProtectionKey` is a 32 byte key in base64, in the same format as a WireGuard key. It encrypts the packet headers, so it has to be identical on both sides and is copied into every client configuration. Header protection uses the first 12 bytes of each junk prefix as its nonce, which means **S1, S2, S3 and S4 all have to be set to at least 12** while a key is configured.

`ContentPaddingAddition`, `RekeyAfterTime`, `RekeyTimeout`, `RejectAfterTime`, `KeepaliveTimeout` and `MaxHandshakeAttempts` accept either a single number or an inclusive range written as `lower-upper` (for example `30-90`, both bounds between 0 and 65535). When a range is given, AmneziaWG picks a random value from it, which removes the fixed timings a DPI system could otherwise fingerprint.

`RandomTrailers` appends a random amount of bytes to handshake packets and has to be enabled on both sides. `DisableCookies` stops this side from answering handshakes with cookie messages when it is under load and only affects the peer it is set on.

## Client Applications

To be able to connect to wg-easy if AmneziaWG is enabled, you must have an AmneziaWG-compatible client. Where an AmneziaWG app is available for your platform, it is recommended to use it rather than Amnezia VPN.

Android:

- [AmneziaWG](https://play.google.com/store/apps/details?id=org.amnezia.awg) - AmneziaWG Official Client
- [WG Tunnel](https://play.google.com/store/apps/details?id=com.zaneschepke.wireguardautotunnel) - Third Party Client
- [Amnezia VPN](https://play.google.com/store/apps/details?id=org.amnezia.vpn) - Amnezia VPN Official Client

iOS and macOS:

- [AmneziaWG](https://apps.apple.com/us/app/amneziawg/id6478942365) - AmneziaWG Official Client
- [Amnezia VPN](https://apps.apple.com/us/app/amneziavpn/id1600529900) - Amnezia VPN Official Client

Windows:

- [AmneziaWG](https://github.com/amnezia-vpn/amneziawg-windows-client/releases) - AmneziaWG Official Client (Requires building from source code)
- [Amnezia VPN](https://amnezia.org/downloads) - Amnezia VPN Official Client

Linux:

- [Amnezia VPN](https://amnezia.org/downloads) - Amnezia VPN Official Client
- [amneziawg-tools](https://github.com/amnezia-vpn/amneziawg-tools) - AmneziaWG Tools

OpenWRT:

- [AmneziaWG OpenWRT](https://github.com/Slava-Shchipunov/awg-openwrt) - AmneziaWG OpenWRT Packages
- [AmneziaWG OpenWRT](https://github.com/lolo6oT/awg-openwrt) - AmneziaWG OpenWRT Packages
