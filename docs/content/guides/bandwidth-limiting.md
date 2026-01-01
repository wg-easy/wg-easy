---
title: Bandwidth Limiting
---

WG-Easy supports global bandwidth limiting for all VPN traffic using Linux Traffic Control (tc).

## How It Works

Bandwidth limiting uses Linux Traffic Control (`tc`) with HTB (Hierarchical Token Bucket):

- **Download limiting**: Applied directly to WireGuard interface egress
- **Upload limiting**: Uses IFB (Intermediate Functional Block) device to mirror ingress traffic

The tc commands are injected as `PostUp`/`PostDown` hooks in the WireGuard configuration.

## Setup Guide

### 1. Access Admin Panel

Navigate to **Admin Panel** → **General** section.

### 2. Enable Bandwidth Limiting

Toggle **"Enable Bandwidth Limiting"** switch to ON.

### 3. Configure Limits

| Setting | Description | Range |
|---------|-------------|-------|
| **Download Limit (Mbps)** | Max download speed for clients | 1-10000 (0 = unlimited) |
| **Upload Limit (Mbps)** | Max upload speed from clients | 1-10000 (0 = unlimited) |

### 4. Save Settings

Click **Save**. WireGuard interface will automatically restart to apply changes.

## Requirements

### Download Limiting
- Works out of the box on all Linux systems

### Upload Limiting
Requires the `ifb` (Intermediate Functional Block) kernel module:

```bash
# Check if IFB is available
modprobe ifb
lsmod | grep ifb
```

If IFB is not available:
- Download limiting will still work
- Upload limiting will be skipped
- A warning will display in the admin panel

### Docker Container
The container must run with:
- `--cap-add=NET_ADMIN` (required for tc commands)
- `--cap-add=SYS_MODULE` (required for IFB module loading)

Example docker-compose:
```yaml
services:
  wg-easy:
    image: ghcr.io/wg-easy/wg-easy
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    # ... other settings
```

## Technical Details

### TC Commands Generated

**Download (egress on wg0):**
```bash
tc qdisc add dev wg0 root handle 1: htb default 10
tc class add dev wg0 parent 1: classid 1:1 htb rate 100mbit ceil 100mbit
tc class add dev wg0 parent 1:1 classid 1:10 htb rate 100mbit ceil 100mbit
```

**Upload (ingress via IFB mirror):**
```bash
ip link add ifb0 type ifb
ip link set ifb0 up
tc qdisc add dev wg0 handle ffff: ingress
tc filter add dev wg0 parent ffff: protocol all u32 match u32 0 0 action mirred egress redirect dev ifb0
tc qdisc add dev ifb0 root handle 1: htb default 10
tc class add dev ifb0 parent 1: classid 1:1 htb rate 50mbit ceil 50mbit
tc class add dev ifb0 parent 1:1 classid 1:10 htb rate 50mbit ceil 50mbit
```

### Database Schema

Settings stored in `general_table`:
- `bandwidth_enabled` (boolean)
- `download_limit_mbps` (integer)
- `upload_limit_mbps` (integer)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/general` | Get current settings |
| POST | `/api/admin/general` | Update settings (triggers restart) |
| GET | `/api/admin/bandwidth-status` | Check IFB availability |

## Troubleshooting

### Bandwidth limits not applied
1. Check if container has `NET_ADMIN` capability
2. Verify WireGuard interface is running: `wg show`
3. Check tc rules: `tc qdisc show dev wg0`

### Upload limiting not working
1. Check IFB module: `lsmod | grep ifb`
2. Ensure container has `SYS_MODULE` capability
3. Some cloud VPS may not support IFB kernel module

### Settings not saving
Check browser console and server logs for API errors.
