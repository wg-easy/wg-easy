#!/bin/sh
#===
# lego-renew.sh - Obtain or validate TLS cert for IP address
#
# Modes:
#   AUTO (default): if LEGO_EMAIL and LEGO_IP are set, runs
#     lego to obtain/renew a cert via http-01 or tls-alpn-01.
#   MANUAL: if certs are pre-provisioned by the user and
#     mounted at /root/cert/ip, just validates they exist.
#===
set -eu

CERT_DIR="/root/cert/ip"
CERT_FILE="${CERT_DIR}/fullchain.pem"
KEY_FILE="${CERT_DIR}/privkey.pem"
LEGO_EMAIL="${LEGO_EMAIL:-}"
LEGO_IP="${LEGO_IP:-}"
LEGO_CHALLENGE="${LEGO_CHALLENGE:-http}"
LEGO_DATA_DIR="${LEGO_DATA_DIR:-/root/lego-data}"

if [ -n "$LEGO_EMAIL" ] && [ -n "$LEGO_IP" ]; then
  echo "[tls] AUTO mode: running lego to obtain/renew cert for IP $LEGO_IP..."
  mkdir -p "$LEGO_DATA_DIR" "$CERT_DIR"

  # Build challenge flag: --http (port 80) or --tls (port 443 tls-alpn-01)
  if [ "$LEGO_CHALLENGE" = "tls-alpn" ]; then
    CHALLENGE_FLAG="--tls"
  else
    CHALLENGE_FLAG="--http"
  fi

  # Try run (initial obtain), fall back to renew if cert already exists
  lego \
    --email="$LEGO_EMAIL" \
    --domains="$LEGO_IP" \
    "$CHALLENGE_FLAG" \
    --path="$LEGO_DATA_DIR" \
    run 2>&1 || lego \
    --email="$LEGO_EMAIL" \
    --domains="$LEGO_IP" \
    "$CHALLENGE_FLAG" \
    --path="$LEGO_DATA_DIR" \
    renew --days 5 2>&1

  # Verify cert files exist before copying
  LEGO_CERT="${LEGO_DATA_DIR}/certificates/${LEGO_IP}.crt"
  LEGO_KEY="${LEGO_DATA_DIR}/certificates/${LEGO_IP}.key"

  if [ ! -f "$LEGO_CERT" ] || [ ! -f "$LEGO_KEY" ]; then
    echo "[tls] ERROR: lego ran but cert not found at expected path"
    echo "[tls] Expected: $LEGO_CERT"
    exit 1
  fi

  # Atomic replacement: copy to temp files first, then move into place
  # This prevents tls-proxy from reading a partially-written cert
  cp "$LEGO_CERT" "${CERT_FILE}.tmp"
  cp "$LEGO_KEY"  "${KEY_FILE}.tmp"
  chmod 600 "${KEY_FILE}.tmp"
  mv "${CERT_FILE}.tmp" "$CERT_FILE"
  mv "${KEY_FILE}.tmp"  "$KEY_FILE"

  echo "[tls] Cert obtained and placed at $CERT_DIR/"
else
  echo "[tls] MANUAL mode: validating pre-provisioned certs at $CERT_DIR/"
  # Validate both certificate files exist
  if [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    echo "[tls] ERROR: Certificate files not found at $CERT_DIR/"
    echo "[tls] Expected:"
    echo "[tls]   ${CERT_FILE}"
    echo "[tls]   ${KEY_FILE}"
    echo "[tls] Either:"
    echo "[tls]   1. Set LEGO_EMAIL and LEGO_IP for automatic cert issuance"
    echo "[tls]   2. Pre-provision certs and mount them at $CERT_DIR (read-only)"
    echo "[tls]   chmod 600 $CERT_DIR/privkey.pem # on the host"
    exit 1
  fi
fi

echo "[tls] Certificate ready at ${CERT_DIR}/"
