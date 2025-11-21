#!/bin/bash
set +e

IPT="/sbin/iptables"
IPT6="/sbin/ip6tables"

IN_FACE="enp0s3"                   # NIC connected to the internet
WG_FACE="wg0"                    # WG NIC
SUB_NET="10.250.1.0/24"          # WG IPv4 sub/net aka CIDR
# SUB_NET_6="fdcc:abcd:abcd:abcd::cafe:0/64"  # Change this according 
SUB_NET_6="fd01:1:1::0/64"
WG_PORT="51820"                  # WG udp port

## IPv4 ## working with single tunnel
$IPT -I INPUT 1 -p udp --dport $WG_PORT -j ACCEPT   # for incoming connection
$IPT -I INPUT 1 -p tcp --dport 51821 -j ACCEPT      # for webui
$IPT -t nat -I POSTROUTING 1 -s $SUB_NET -o $IN_FACE -j MASQUERADE
$IPT -I FORWARD 1 -i $WG_FACE -j ACCEPT   #for internet
$IPT -I FORWARD 1 -o $WG_FACE -j ACCEPT   #for internet
# MSS clamping IPv4
$IPT -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN -o $WG_FACE -j TCPMSS --clamp-mss-to-pmtu

# IPv6 (Uncomment) ##
$IPT6 -I INPUT 1 -p udp --dport $WG_PORT -j ACCEPT   # for incoming connection
$IPT6 -I INPUT 1 -p tcp --dport 51821 -j ACCEPT      # for webui
$IPT6 -t nat -I POSTROUTING 1 -s $SUB_NET_6 -o $IN_FACE -j MASQUERADE
$IPT6 -I FORWARD 1 -i $WG_FACE -j ACCEPT   #for internet
$IPT6 -I FORWARD 1 -o $WG_FACE -j ACCEPT   #for internet
# MSS clamping IPv6
$IPT6 -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN -o $WG_FACE -j TCPMSS --clamp-mss-to-pmtu

wg-quick up wg1
systemctl start mount-mypi.service

set -e