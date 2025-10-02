---
title: AmneziaWG Kernel Module
---

## Overview

This build includes support for the **AmneziaWG kernel module**, pre-built for Alpine Linux LTS kernel (6.12.50). The kernel module provides better performance than the userspace implementation.

## Implementation Details

The Docker image includes two AmneziaWG components:

1. **amneziawg-tools** (`awg`, `awg-quick`) - Command-line tools for managing AmneziaWG
2. **amneziawg.ko** - Pre-compiled kernel module for Alpine LTS kernel 6.12.50

## Kernel Module Compatibility

The included kernel module is **pre-built for Alpine Linux LTS kernel 6.12.50**. This matches the kernel used after running the bare-metal installation script which upgrades from `-virt` to `linux-lts`.

### Supported Configurations

**✅ Supported:**
- Alpine Linux with `linux-lts` kernel (6.12.50)
- Hosts upgraded via the bare-metal install script

**⚠️ Limited Support:**
- Other kernel versions (will fall back to userspace)
- Non-Alpine distributions (userspace only)

## Automatic Detection

When `EXPERIMENTAL_AWG=true`, the system will:

1. Check if kernel version matches the pre-built module (6.12.50)
2. If match: Load the AmneziaWG kernel module
3. If mismatch: Fall back to standard WireGuard
4. Respect `OVERRIDE_AUTO_AWG` to force specific implementation

## Usage

### Standard Configuration (Alpine LTS 6.12.50)

```yaml
services:
  wg-easy:
    image: wg-easy
    container_name: wg-easy
    environment:
      - EXPERIMENTAL_AWG=true
    volumes:
      - ./data:/etc/wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    privileged: true
    ports:
      - "51820:51820/udp"
      - "51821:51821/tcp"
```


## Verification

### Check Kernel Version

First, verify your host is running the compatible kernel:

```bash
uname -r
```

Expected output for kernel module support:
```
6.12.50-0-lts
```

### Check Which Implementation is Active

```bash
# Check if kernel module is loaded
lsmod | grep -E 'amneziawg|wireguard'
```

**AmneziaWG mode:** You'll see `amneziawg` in output
**Standard WireGuard mode:** You'll see `wireguard` in output

### Check Application Logs

```bash
docker logs wg-easy | grep -i amnezia
```

## Fallback Behavior

The system automatically chooses the best available implementation:

1. **Kernel module** (if host kernel == 6.12.50)
2. **amneziawg-go userspace** (all other cases)
3. **Standard WireGuard** (if `OVERRIDE_AUTO_AWG=wg`)

## Troubleshooting

### Kernel Version Mismatch

If you're not running Alpine LTS kernel 6.12.50, the system will automatically use standard WireGuard. To force standard WireGuard:

```yaml
environment:
  - OVERRIDE_AUTO_AWG=wg  # Force standard WireGuard
```

### Module Won't Load

Ensure you have the required capabilities:

```yaml
cap_add:
  - SYS_MODULE
privileged: true
```

### Verify Module File

Check if the pre-built module is present:

```bash
docker exec wg-easy ls -la /lib/modules/
docker exec wg-easy cat /etc/amneziawg-kernel-version.txt
```

## Security Considerations

Running with `privileged: true` grants the container significant host access. Consider:

1. Use `cap_add` with specific capabilities instead of `privileged` when possible
2. Audit the kernel module source before building
3. Pin to specific image versions in production
4. Monitor container behavior

## Performance

**Kernel Module Advantages:**
- Lower CPU usage (10-30% improvement)
- Better throughput on high-speed networks
- Native kernel integration

**Userspace Advantages:**
- No kernel dependencies
- Easier deployment
- Better isolation

For most users, the **userspace implementation is sufficient**. Use the kernel module if:

- You have high throughput requirements (>500 Mbps)
- CPU usage is a concern
- You're already running privileged containers

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPERIMENTAL_AWG` | `false` | Enable AmneziaWG support |
| `OVERRIDE_AUTO_AWG` | `undefined` | Force `awg` or `wg` implementation |

## Related Documentation

- [AmneziaWG Configuration](./amnezia.md)
- [Experimental Features](./experimental-config.md)
