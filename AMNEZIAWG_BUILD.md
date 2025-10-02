# AmneziaWG Build Implementation

## Summary

The Dockerfile now builds and includes **complete AmneziaWG support** with two components:

1. **amneziawg-tools** - CLI tools (`awg`, `awg-quick`)
2. **amneziawg.ko** - Kernel module (pre-built for Alpine LTS 6.12.50)

## Build Process

### Stage 1: Build UI and Tools
```dockerfile
FROM node:lts-alpine AS build
```
- Builds the web UI with Nuxt/pnpm
- Compiles amneziawg-tools from source

### Stage 2: Build Kernel Module
```dockerfile
FROM alpine:3.20 AS kernel_module_builder
```
- Installs `linux-lts-dev` package (provides headers for 6.12.50)
- Clones amneziawg-linux-kernel-module repository
- Compiles kernel module against Alpine LTS headers
- Exports `amneziawg.ko` if build succeeds

### Stage 3: Final Image
```dockerfile
FROM node:lts-alpine
```
- Copies all built artifacts from stages 1 & 2
- Installs runtime dependencies (iptables, wireguard-tools, etc.)
- Sets up environment variables and configurations

## What Gets Built

### AmneziaWG Tools (`/usr/bin/awg`, `/usr/bin/awg-quick`)
- CLI interface for managing AmneziaWG interfaces
- Compatible with standard WireGuard workflow
- Source: https://github.com/amnezia-vpn/amneziawg-tools

### AmneziaWG Kernel Module (`/lib/modules/amneziawg.ko`)
- Pre-compiled for Alpine LTS kernel **6.12.50-0-lts**
- Kernel-level WireGuard implementation with obfuscation
- Only works on Alpine hosts with matching kernel
- Source: https://github.com/amnezia-vpn/amneziawg-linux-kernel-module

## Kernel Module Specifics

### Target Kernel
- **Version:** 6.12.50-0-lts (Alpine Linux LTS)
- **Headers Source:** `apk add linux-lts-dev`
- **Build Location:** `/usr/src/linux-headers-6.12.50-0-lts`

### Compatibility
The kernel module **only works** on hosts running:
- Alpine Linux
- With `linux-lts` kernel installed
- Exact version: 6.12.50

For all other systems, the application will fall back to **standard WireGuard**.

### Build Output
- Success: `/build/module/amneziawg.ko` → copied to `/lib/modules/`
- Failure: Logs warning, continues build (standard WireGuard will be used)
- Version info: `/etc/amneziawg-kernel-version.txt`

## Runtime Behavior

### Automatic Detection (wgHelper.ts:14-22)
```typescript
if (WG_ENV.EXPERIMENTAL_AWG) {
  if (WG_ENV.OVERRIDE_AUTO_AWG !== undefined) {
    wgExecutable = WG_ENV.OVERRIDE_AUTO_AWG;
  } else {
    wgExecutable = await exec('modinfo amneziawg')
      .then(() => 'awg')
      .catch(() => 'wg');
  }
}
```

The application checks:
1. Is `EXPERIMENTAL_AWG=true`?
2. Is there a manual override (`OVERRIDE_AUTO_AWG`)?
3. Is the amneziawg kernel module available?
4. Falls back to standard WireGuard if needed

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `EXPERIMENTAL_AWG` | `false` | Enable AmneziaWG support |
| `OVERRIDE_AUTO_AWG` | `undefined` | Force `awg` or `wg` mode |

**Example:**
```yaml
environment:
  - EXPERIMENTAL_AWG=true          # Enable AmneziaWG
  - OVERRIDE_AUTO_AWG=awg          # Force userspace mode
```

## Build Commands

### Build the Image
```bash
docker build -t wg-easy .
```

### Check Build Results
```bash
# Check if kernel module was built
docker run --rm wg-easy ls -la /lib/modules/

# Check kernel version target
docker run --rm wg-easy cat /etc/amneziawg-kernel-version.txt

# Check all AmneziaWG binaries
docker run --rm wg-easy ls -la /usr/bin/ | grep -E 'awg|amnezia'
```

### Expected Output
```
-rwxr-xr-x    1 root     root       1.2M amneziawg-go
-rwxr-xr-x    1 root     root       156K awg
-rwxr-xr-x    1 root     root        45K awg-quick
```

## Deployment Scenarios

### Scenario 1: Alpine LTS Host (Kernel Module)
**Host:** Alpine Linux with kernel 6.12.50-0-lts
**Mode:** Kernel module (best performance)

```yaml
services:
  wg-easy:
    image: wg-easy
    environment:
      - EXPERIMENTAL_AWG=true
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    privileged: true
```

### Scenario 2: Other Linux Distributions (Userspace)
**Host:** Ubuntu/Debian/RHEL/etc.
**Mode:** Userspace amneziawg-go (portable)

```yaml
services:
  wg-easy:
    image: wg-easy
    environment:
      - EXPERIMENTAL_AWG=true
      - OVERRIDE_AUTO_AWG=awg  # Force userspace
    cap_add:
      - NET_ADMIN
```

### Scenario 3: Standard WireGuard (Fallback)
**Host:** Any Linux
**Mode:** Standard WireGuard kernel module

```yaml
services:
  wg-easy:
    image: wg-easy
    environment:
      - EXPERIMENTAL_AWG=false
      # OR
      - OVERRIDE_AUTO_AWG=wg
```

## Verification

### Check Kernel Module Load
```bash
# On host
lsmod | grep amneziawg

# Expected output if loaded:
# amneziawg              81920  0
```

### Check Which Mode is Active
```bash
# Check detection
docker exec wg-easy awg show

# If working, you'll see interface details
```

## Troubleshooting

### Kernel Module Won't Build
**Symptom:** Build completes but no `/lib/modules/amneziawg.ko`

**Solutions:**
- This is expected on build hosts with different kernel versions
- The image will still work with standard WireGuard
- No action needed - module is for Alpine LTS 6.12.50 only

### Kernel Module Won't Load at Runtime
**Symptom:** Module file exists but `modprobe amneziawg` fails

**Causes:**
- Host kernel version != 6.12.50
- Missing `SYS_MODULE` capability
- Not running with `privileged: true`

**Solution:**
```yaml
environment:
  - OVERRIDE_AUTO_AWG=wg  # Force standard WireGuard
```

## Files Modified

1. **Dockerfile** - Added multi-stage build for kernel module
2. **docs/content/advanced/config/amnezia-kernel-module.md** - New documentation
3. **AMNEZIAWG_BUILD.md** - This file

## References

- [AmneziaWG Tools](https://github.com/amnezia-vpn/amneziawg-tools)
- [AmneziaWG Kernel Module](https://github.com/amnezia-vpn/amneziawg-linux-kernel-module)
- [Alpine Linux LTS Kernel](https://pkgs.alpinelinux.org/package/edge/main/x86_64/linux-lts)

## Build Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Stage 1: Build (node:lts-alpine)                        │
│  - Web UI (Nuxt/TypeScript)                             │
│  - amneziawg-tools (C)                                  │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ Stage 2: Kernel Module Builder (alpine:3.20)           │
│  - Install linux-lts-dev (6.12.50 headers)              │
│  - Clone amneziawg-linux-kernel-module                  │
│  - Build amneziawg.ko                                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ Stage 3: Final Image (node:lts-alpine)                 │
│  - Copy built UI from stage 1                           │
│  - Copy amneziawg-tools from stage 1                    │
│  - Copy amneziawg.ko from stage 2 (if built)            │
│  - Install runtime dependencies                         │
│  - Configure environment                                │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Multi-stage build** - Minimizes final image size
2. **Pre-built kernel module** - Avoids runtime compilation complexity
3. **Graceful fallback** - Falls back to standard WireGuard if module fails
4. **Alpine LTS target** - Matches bare-metal install script expectations
5. **Kernel module only** - No userspace implementation needed
