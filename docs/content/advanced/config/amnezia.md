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

### Protocol Version and Automatic Generation

For a fresh installation using the kernel module already installed on the host:

```yaml
environment:
    EXPERIMENTAL_AWG: 'true'
    OVERRIDE_AUTO_AWG: 'awg'
    AWG_PROTOCOL_VERSION: 'latest'
    AWG_AUTO_GENERATE: 'true'
```

`AWG_PROTOCOL_VERSION` accepts `2` / `2.0`, `3` / `3.0`, `3.1`, or `latest`. When unset, it defaults to `latest`: a new profile selects the highest supported version from 3.1, 3.0 and 2.0. This checks both the container's `awg` tools and the host kernel module by applying parameters to a temporary interface and verifying their readback. The temporary interface receives no addresses, is never brought up, and is removed after the check. No module installation or upgrade is performed. The container needs `NET_ADMIN` and `iproute2`, which is included in the images.

The selected version is saved in the database. Restarts keep that version, including when `latest` is specified or the module is upgraded. An explicit unsupported version fails startup; it does not fall back. An explicit change to the saved version also fails: changing protocol versions requires migrating server settings and redistributing client configurations. The active version is shown in **Admin → Interface**; forms and exports include only parameters supported by that version. Clients must support the selected version too.

`AWG_AUTO_GENERATE=true` generates a profile only before the initial VPN keys have been created and while there are no clients. It saves the profile and matching client defaults in one database transaction. Headers and the header protection key use cryptographic randomness. Jc/Jmin/Jmax and S1-S4 are generated; 3.0 and 3.1 also enable header protection, content padding and timing ranges. In 3.1, `RandomTrailers` is enabled and `DisableCookies` is explicitly disabled. I1-I5 remain unset because protocol signatures need to be chosen separately. These are starting settings, not a guarantee against a particular DPI system.

Generation is opt-in (`false` by default). The saved profile is reused after restarts even if `AWG_AUTO_GENERATE=true` remains set. Keep `/etc/wireguard` on a persistent volume. Existing configurations without version metadata keep their current behavior when both new variables are unset. Setting a version on an existing installation validates all saved server, default and client parameters before saving the version; incompatible settings cause an error. Enabling generation on an existing configuration causes an error without replacing its parameters. Migrate existing installations manually; changing client defaults alone does not update existing clients.

If the backend resolves to standard WireGuard, explicit version selection or automatic generation fails with an error asking you to enable AWG.

## AmneziaWG Parameters

Parameter descriptions can be found in the [AmneziaWG documentation](https://docs.amnezia.org/documentation/amnezia-wg) and on the [kernel module page](https://github.com/amnezia-vpn/amneziawg-linux-kernel-module).

H1-H4 are generated at the first AWG startup. Without automatic profile generation, Jc, Jmin, Jmax, S1 and S2 have initial defaults; the remaining parameters are unset until configured. For information on how to set I1-I5 parameters, refer to the [AmneziaWG documentation](https://docs.amnezia.org/documentation/instructions/new-amneziawg-selfhosted/#how-to-extract-a-protocol-signature-for-amneziawg-15-manually).

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

Header protection, content padding and timing parameters require AmneziaWG 3.0 or newer. `RandomTrailers` and `DisableCookies` require AmneziaWG 3.1. Older clients reject configurations that contain unsupported parameters, so leave those fields unset when supporting older clients.

`HeaderProtectionKey` is a 32 byte key in base64, in the same format as a WireGuard key. It encrypts the packet headers, so it has to be identical on both sides and is copied into every client configuration. Header protection uses the first 12 bytes of each junk prefix as its nonce, which means **S1, S2, S3 and S4 all have to be set to at least 12** while a key is configured.

`ContentPaddingAddition`, `RekeyAfterTime`, `RekeyTimeout`, `RejectAfterTime`, `KeepaliveTimeout` and `MaxHandshakeAttempts` accept either a single number or an inclusive range written as `lower-upper` (for example `30-90`, both bounds between 0 and 65535). When a range is given, AmneziaWG picks a random value from it, which removes the fixed timings a DPI system could otherwise fingerprint.

`RandomTrailers` appends a random amount of bytes to handshake packets and has to be enabled on both sides. `DisableCookies` stops this side from answering handshakes with cookie messages when it is under load and only affects the peer it is set on.

### Client Defaults

In **Admin → Config**, set the defaults for `ContentPaddingAddition`, `RekeyAfterTime`, `RekeyTimeout`, `RejectAfterTime`, `KeepaliveTimeout`, `MaxHandshakeAttempts` and `DisableCookies`. These values are copied into each new client's settings, alongside the existing Jc/Jmin/Jmax and I1-I5 defaults. They can then be changed for an individual client.

Changing defaults does not change existing clients or their exported profiles. Leave a field unset to omit it from new client configurations; an explicit `0` or `DisableCookies = off` is preserved. Database upgrades leave all seven new defaults unset.

`HeaderProtectionKey`, S1-S4, H1-H4 and `RandomTrailers` are configured in **Admin → Interface** and copied from the interface whenever a client configuration is exported. Server padding and timing settings affect the server itself; they do not act as client defaults. Downloads and QR codes contain the same client configuration.

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
