# AmneziaWG UI Implementation

## Overview

The wg-easy interface now fully supports AmneziaWG obfuscation parameters with conditional UI display based on whether AWG is active.

## Implementation Details

### Backend Changes

#### 1. **wgHelper.ts** (`src/server/utils/wgHelper.ts`)
- Added `isUsingAwg()` export function to check if AWG is active
- Modified config generation to include AWG parameters when `wgExecutable === 'awg'`
- Server interface config includes: Jc, Jmin, Jmax, S1-S4, H1-H4, I1-I5, J1-J3, Itime
- Client configs include matching AWG parameters

#### 2. **API Endpoint** (`src/server/api/admin/interface/index.get.ts`)
- Returns `isUsingAwg: boolean` flag in the response
- Frontend uses this to conditionally render AWG fields

#### 3. **Database Schema** (`src/server/database/repositories/interface/schema.ts`)
- Added all AWG parameter columns with sensible defaults
- Default I1 set to QUIC packet mimic for traffic obfuscation

#### 4. **Validation** (`src/server/database/repositories/interface/types.ts`)
- Comprehensive Zod validation for all AWG parameters
- Enforces amneziawg-go constraints:
  - Jc: 1-128
  - Jmin: 0-1279, must be < Jmax
  - Jmax: 1-1280, must be > Jmin
  - S1: 0-1132, S1+56 ≠ S2
  - S2: 0-1188
  - S3: 0-1132
  - S4: 0-1188
  - H1-H4: >4, all unique
  - I1-I5: max 10000 chars
  - J1-J3: max 1000 chars
  - Itime: 0-2147483647

#### 5. **Auto-Generation** (`src/server/database/sqlite.ts`)
- Generates random AWG parameters on first run
- Only randomizes if using default values
- Ensures each installation has unique obfuscation

### Frontend Changes

#### **Interface Admin Page** (`src/app/pages/admin/interface.vue`)

**Conditional Display:**
- Shows AWG fields **only when** `data.isUsingAwg === true`
- Shows helpful message when AWG is not active

**When AWG is NOT active:**
```
┌─────────────────────────────────────────────┐
│ AmneziaWG                                   │
├─────────────────────────────────────────────┤
│ AmneziaWG obfuscation is not currently      │
│ active. To enable it, set                   │
│ EXPERIMENTAL_AWG=true and ensure the        │
│ amneziawg kernel module is available.       │
└─────────────────────────────────────────────┘
```

**When AWG IS active:**
```
┌─────────────────────────────────────────────┐
│ AmneziaWG Obfuscation Parameters            │
├─────────────────────────────────────────────┤
│ Junk packet count (Jc)          [8      ]  │
│ Junk packet min size (Jmin)     [8      ]  │
│ Junk packet max size (Jmax)     [80     ]  │
│ Init header junk size (S1)      [50     ]  │
│ Response header junk size (S2)  [85     ]  │
│ Init magic header (H1)          [123... ]  │
│ Response magic header (H2)      [456... ]  │
│ Cookie magic header (H3)        [789... ]  │
│ Transport magic header (H4)     [101... ]  │
│ Cookie header junk size (S3)    [0      ]  │
│ Transport header junk size (S4) [0      ]  │
│ Special junk packet 1 (I1)      [<b 0x..]  │
│ Special junk packet 2 (I2)      [       ]  │
│ ... (I3-I5, J1-J3, Itime)                   │
└─────────────────────────────────────────────┘
```

## AWG Parameter Descriptions

### Core Obfuscation (AWG 1.0)

| Parameter | Range | Recommended | Description |
|-----------|-------|-------------|-------------|
| **Jc** | 1-128 | 4-12 | Number of junk packets to send |
| **Jmin** | 0-1279 | 8 | Minimum junk packet size (bytes) |
| **Jmax** | 1-1280 | 80 | Maximum junk packet size (bytes) |
| **S1** | 0-1132 | 15-150 | Init packet header junk size |
| **S2** | 0-1188 | 15-150 | Response packet header junk size |
| **H1** | >4 | 5-2147483647 | Init magic header (must be unique) |
| **H2** | >4 | 5-2147483647 | Response magic header (must be unique) |
| **H3** | >4 | 5-2147483647 | Cookie magic header (must be unique) |
| **H4** | >4 | 5-2147483647 | Transport magic header (must be unique) |

### Advanced Obfuscation (AWG 1.5)

| Parameter | Range | Description |
|-----------|-------|-------------|
| **S3** | 0-1132 | Cookie packet header junk size |
| **S4** | 0-1188 | Transport packet header junk size |
| **I1-I5** | 0-10000 chars | Special junk packets (protocol mimics in hex) |
| **J1-J3** | 0-1000 chars | Junk packet scheduling parameters |
| **Itime** | 0-2147483647 | Interval time in seconds (0 on Windows) |

## How It Works

### 1. Detection Flow
```
┌─────────────────┐
│ Frontend loads  │
│ /api/admin/     │
│ interface       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backend checks  │
│ isUsingAwg()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Returns         │
│ isUsingAwg:     │
│ true/false      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vue template    │
│ v-if renders    │
│ conditionally   │
└─────────────────┘
```

### 2. Configuration Generation

When generating WireGuard configs:

**Server Config (`wg0.conf`):**
```ini
[Interface]
PrivateKey = ...
Address = 10.8.0.1/24
ListenPort = 51820
MTU = 1420
PreUp = ...
PostUp = ...
PreDown = ...
PostDown = ...
Jc = 8              # ← Only if AWG active
Jmin = 8            # ← Only if AWG active
Jmax = 80           # ← Only if AWG active
S1 = 50             # ← Only if AWG active
S2 = 85             # ← Only if AWG active
H1 = 1376979037     # ← Only if AWG active
H2 = 1283620850     # ← Only if AWG active
H3 = 917053776      # ← Only if AWG active
H4 = 696394151      # ← Only if AWG active
I1 = <b 0x...>      # ← Only if AWG active (QUIC mimic)
# ... etc
```

**Client Config:**
```ini
[Interface]
PrivateKey = ...
Address = 10.8.0.2/24
MTU = 1420
DNS = 1.1.1.1
Jc = 8              # ← Only if AWG active
Jmin = 8            # ← Only if AWG active
# ... (all AWG params match server)

[Peer]
PublicKey = ...
PresharedKey = ...
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
Endpoint = vpn.example.com:51820
```

## Enabling AmneziaWG

### Prerequisites
1. **Alpine Linux** with `linux-lts` kernel (6.12.50)
2. **AmneziaWG kernel module** built and available
3. **Environment variable** set

### Configuration

**Docker Compose:**
```yaml
services:
  wg-easy:
    image: wg-easy
    environment:
      - EXPERIMENTAL_AWG=true  # Enable AWG support
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    privileged: true
```

**Optional Override:**
```yaml
environment:
  - EXPERIMENTAL_AWG=true
  - OVERRIDE_AUTO_AWG=awg  # Force AWG (skip detection)
  # or
  - OVERRIDE_AUTO_AWG=wg   # Force standard WireGuard
```

## User Experience

### Admin Workflow

1. **Navigate to Interface Settings**
   - Go to Admin → Interface

2. **Check AWG Status**
   - If AWG section shows parameters → AWG is active
   - If AWG section shows message → AWG is not active

3. **Customize Parameters** (if AWG active)
   - Adjust values as needed
   - Click "Save"
   - Click "Restart Interface" to apply

4. **Download Client Configs**
   - All new client configs will include AWG parameters
   - Existing clients keep their configs

### Default Behavior

- **First Install**: Random AWG parameters generated automatically
- **Existing Install**: Keeps current parameters (or defaults if upgrading)
- **Standard WG**: AWG fields hidden, no params in configs

## Security Considerations

### Parameter Randomization

Each installation gets unique obfuscation parameters:
- **Magic headers (H1-H4)**: Random 32-bit integers
- **Junk sizes (Jc, Jmin, Jmax, S1-S4)**: Random within recommended ranges
- **No fingerprinting**: Each server has unique traffic signature

### Validation

All parameters validated on:
1. **Frontend**: Vue form validation
2. **Backend**: Zod schema validation
3. **Database**: SQLite constraints
4. **Runtime**: amneziawg-go validation

## Troubleshooting

### AWG Fields Not Showing

**Check:**
1. `EXPERIMENTAL_AWG=true` is set
2. Kernel module is available: `lsmod | grep amneziawg`
3. No override forcing standard WG

**Verify:**
```bash
docker exec wg-easy sh -c 'echo $EXPERIMENTAL_AWG'
docker exec wg-easy lsmod | grep amneziawg
```

### Parameters Not Applied

**Solution:**
1. Save parameters in UI
2. Click "Restart Interface"
3. Check `/etc/wireguard/wg0.conf` includes AWG params

### Client Can't Connect

**Verify:**
- Client uses AmneziaWG-compatible app
- Client config includes AWG parameters
- Parameters match server exactly

## Future Enhancements

Potential improvements:
- [ ] Parameter presets (stealth, performance, balanced)
- [ ] Randomize button in UI
- [ ] Import/export parameter profiles
- [ ] Visual validation feedback
- [ ] Advanced mode toggle for I/J parameters
