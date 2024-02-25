#!/bin/bash
set +e

IPT="/sbin/iptables"
IPT6="/sbin/ip6tables"

IN_FACE="ens3"                   # NIC connected to the internet
WG_FACE="wg0"                    # WG NIC
SUB_NET="10.250.1.0/24"          # WG IPv4 sub/net aka CIDR
#SUB_NET_6="fd42:42:42::/64"      # WG IPv6 sub/net

# IPv4 rules #
$IPT -t nat -D POSTROUTING -s $SUB_NET -o $IN_FACE -j MASQUERADE
$IPT -D FORWARD -i $IN_FACE -o $WG_FACE -j ACCEPT
$IPT -D FORWARD -i $WG_FACE -o $IN_FACE -j ACCEPT
# ip rule del from all lookup $WG_TABLE pref 10

# IPv6 rules (uncomment) #
# $IPT6 -t nat -D POSTROUTING -s $SUB_NET_6 -o $IN_FACE -j MASQUERADE
# $IPT6 -D INPUT -i $WG_FACE -j ACCEPT
# $IPT6 -D FORWARD -i $IN_FACE -o $WG_FACE -j ACCEPT
# $IPT6 -D FORWARD -i $WG_FACE -o $IN_FACE -j ACCEPT

set -e