#!/bin/bash
set +e

IPT="/sbin/iptables"

IN_FACE="ens3"                   # NIC connected to the internet
WG_FACE="wg1"                    # WG NIC
SUB_NET="10.250.1.0/24"          # WG IPv4 sub/net aka CIDR
WG_PORT="51820"                  # WG udp port
#SUB_NET_6="fd42:42:42::/64"      # WG IPv6 sub/net

# IPv4 rules #
$IPT -t nat -D POSTROUTING -s $SUB_NET -o $WG_FACE -j MASQUERADE
$IPT -D FORWARD -i $WG_FACE -o wg0 -j ACCEPT   #for internet
$IPT -D FORWARD -i wg0 -o $WG_FACE -j ACCEPT   #for internet

# $IPT -t nat -D POSTROUTING -s 0.0.0.0/1 -o $IN_FACE -j MASQUERADE
# $IPT -D OUTPUT -o $WG_FACE -j ACCEPT
# $IPT -D FORWARD -i $WG_FACE -j ACCEPT
# $IPT -D FORWARD -o $WG_FACE -j ACCEPT
# $IPT -D FORWARD -i $IN_FACE -o $WG_FACE -j ACCEPT
# $IPT -D FORWARD -i $WG_FACE -o $IN_FACE -j ACCEPT
# $IPT -D INPUT -i $IN_FACE -p udp --dport $WG_PORT -j ACCEPT

# ip route del 10.250.1.0/24 via 10.250.1.1 dev wg0 table wg priority 1
# ip route del 10.254.1.0/24 via 10.254.1.1 dev ens3 table wg priority 2

set -e