#!/bin/sh
set -eu

backend=wg
if [ "${EXPERIMENTAL_AWG:-}" = true ]; then
  override=$(printf '%s' "${OVERRIDE_AUTO_AWG:-}" | tr '[:upper:]' '[:lower:]')
  case "$override" in
    wg|awg) backend=$override ;;
    *)
      if modinfo amneziawg >/dev/null 2>&1; then
        backend=awg
      fi
      ;;
  esac
fi

exec "$backend" show "${WG_INTERFACE:-wg0}" listen-port
