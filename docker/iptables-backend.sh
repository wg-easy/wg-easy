#!/bin/sh
# Select the iptables backend, then run the given command.
# iptables-legacy stays the default. iptables-nft is only used when the
# kernel has no legacy xtables support (e.g. CONFIG_NETFILTER_XTABLES_LEGACY=n).

if iptables-legacy -w -L -n >/dev/null 2>&1; then
  backend=legacy
elif iptables-nft -L -n >/dev/null 2>&1; then
  backend=nft
fi

if [ -n "$backend" ] && [ "$(readlink /etc/alternatives/iptables)" != "/usr/sbin/iptables-$backend" ]; then
  update-alternatives --set iptables "/usr/sbin/iptables-$backend"
  update-alternatives --set ip6tables "/usr/sbin/ip6tables-$backend"
fi

exec "$@"
