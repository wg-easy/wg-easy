#!/bin/bash
set +e

IPT="/sbin/iptables"
IPT6="/sbin/ip6tables"

IN_FACE="enp0s3"                   # NIC connected to the internet
WG_FACE="wg0"                    # WG NIC
SUB_NET="10.250.1.0/24"          # WG IPv4 sub/net aka CIDR
SUB_NET_6="fdcc:ad94:bacf:61a4::cafe:0/64"  # WG IPv6 sub/net
WG_PORT="51820"                  # WG udp port
# WG_TABLE='10'

# IPv4 rules #
$IPT -D INPUT -p udp --dport $WG_PORT -j ACCEPT   # for incoming connection
$IPT -D INPUT -p tcp --dport 51821 -j ACCEPT      # for webui
$IPT -t nat -D POSTROUTING -s $SUB_NET -o $IN_FACE -j MASQUERADE
$IPT -D FORWARD -i $WG_FACE -j ACCEPT   #for internet
$IPT -D FORWARD -o $WG_FACE -j ACCEPT   #for internet

# IPv4 rules #
$IPT6 -D INPUT -p udp --dport $WG_PORT -j ACCEPT   # for incoming connection
$IPT6 -D INPUT -p tcp --dport 51821 -j ACCEPT      # for webui
$IPT6 -t nat -D POSTROUTING -s $SUB_NET -o $IN_FACE -j MASQUERADE
$IPT6 -D FORWARD -i $WG_FACE -j ACCEPT   #for internet
$IPT6 -D FORWARD -o $WG_FACE -j ACCEPT   #for internet

# $IPT -t nat -D POSTROUTING -s $SUB_NET -o $IN_FACE -j MASQUERADE
# $IPT -D FORWARD -i $IN_FACE -o $WG_FACE -j ACCEPT
# $IPT -D FORWARD -i $WG_FACE -o $IN_FACE -j ACCEPT
# $IPT -D INPUT -i $IN_FACE -p udp --dport $WG_PORT -j ACCEPT
# ip rule del from all lookup $WG_TABLE pref 10

# IPv6 rules (uncomment) #
# $IPT6 -t nat -D POSTROUTING -s $SUB_NET_6 -o $IN_FACE -j MASQUERADE
# $IPT6 -D INPUT -i $WG_FACE -j ACCEPT
# $IPT6 -D FORWARD -i $IN_FACE -o $WG_FACE -j ACCEPT
# $IPT6 -D FORWARD -i $WG_FACE -o $IN_FACE -j ACCEPT

set -e