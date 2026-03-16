#!/bin/sh
#===
# wg-easy-ip-tls entrypoint
# Architecture:
# - dumb-init is PID 1 and spawns this script for proper
#   signal forwarding and zombie reaping
# - Nitro (wg-easy) runs on HTTP internally on NITRO_PORT
# - If LEGO_ENABLED=true and INSECURE!=true: tls-proxy.js
#   wraps Nitro on PORT (HTTPS termination)
#   Certs are hot-reloaded via server.setSecureContext() without restart
# - If INSECURE=true: Nitro listens directly on PORT (HTTP)
# - A background renewal loop re-runs lego-renew.sh every
#   LEGO_RENEW_INTERVAL seconds (default: 5 days)
#===
set -eu

CERT_FILE="/root/cert/ip/fullchain.pem"
KEY_FILE="/root/cert/ip/privkey.pem"
PORT="${PORT:-51821}"
NITRO_PORT="${NITRO_PORT:-51822}"
LEGO_ENABLED="${LEGO_ENABLED:-false}"
INSECURE="${INSECURE:-true}"
# Renewal interval in seconds (default 5 days = 432000s)
LEGO_RENEW_INTERVAL="${LEGO_RENEW_INTERVAL:-432000}"

SERVER_PID_FILE="/tmp/wg-easy.pid"
PROXY_PID_FILE="/tmp/tls-proxy.pid"
RENEWAL_PID_FILE="/tmp/lego-renewal.pid"

# Graceful shutdown handler
cleanup() {
  echo "[entrypoint] Shutting down..."
  if [ -f "$RENEWAL_PID_FILE" ]; then
    PID=$(cat "$RENEWAL_PID_FILE" 2>/dev/null || true)
    [ -n "$PID" ] && kill "$PID" 2>/dev/null || true
  fi
  if [ -f "$PROXY_PID_FILE" ]; then
    PID=$(cat "$PROXY_PID_FILE" 2>/dev/null || true)
    [ -n "$PID" ] && kill "$PID" 2>/dev/null || true
  fi
  if [ -f "$SERVER_PID_FILE" ]; then
    PID=$(cat "$SERVER_PID_FILE" 2>/dev/null || true)
    [ -n "$PID" ] && kill "$PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup TERM INT

if [ "$LEGO_ENABLED" = "true" ] && [ "$INSECURE" != "true" ]; then
  # -- TLS mode ---
  /usr/local/bin/lego-renew.sh

  # Start background cert renewal loop
  (
    while true; do
      sleep "$LEGO_RENEW_INTERVAL"
      echo "[entrypoint] Running scheduled cert renewal..."
      /usr/local/bin/lego-renew.sh && echo "[entrypoint] Cert renewal complete" || \
        echo "[entrypoint] WARNING: cert renewal failed, will retry next cycle"
    done
  ) &
  echo $! > "$RENEWAL_PID_FILE"

  echo "[entrypoint] Starting wg-easy (internal HTTP on port $NITRO_PORT)..."
  PORT="$NITRO_PORT" HOST="127.0.0.1" node /app/server/index.mjs &
  echo $! > "$SERVER_PID_FILE"

  # Wait for Nitro to be ready before starting the proxy
  echo "[entrypoint] Waiting for internal server..."
  i=0
  while ! nc -z 127.0.0.1 "$NITRO_PORT" 2>/dev/null; do
    sleep 0.5
    i=$((i + 1))
    if [ $i -ge 60 ]; then
      echo "[entrypoint] ERROR: internal server did not start in 30 seconds"
      exit 1
    fi
  done

  echo "[entrypoint] Starting TLS proxy on port $PORT..."
  # tls-proxy.js reads cert paths and ports from environment variables
  # This avoids shell variable interpolation into JavaScript code (injection-safe)
  CERT_FILE="$CERT_FILE" \
  KEY_FILE="$KEY_FILE" \
  NITRO_PORT="$NITRO_PORT" \
  PORT="$PORT" \
  node /usr/local/bin/tls-proxy.js &
  echo $! > "$PROXY_PID_FILE"
else
  # -- HTTP mode (INSECURE=true or LEGO_ENABLED=false) ---
  echo "[entrypoint] Starting wg-easy in HTTP mode on port $PORT..."
  PORT="$PORT" HOST="0.0.0.0" node /app/server/index.mjs &
  echo $! > "$SERVER_PID_FILE"
fi

wait
