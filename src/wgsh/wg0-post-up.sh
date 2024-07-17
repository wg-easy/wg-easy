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
# WG_TABLE='10'

#iptables -t nat -I POSTROUTING 1 -s 10.250.1.0/24 -o ens3 -j MASQUERADE;
#iptables -I INPUT 1 -p udp -m udp --dport 51820 -j ACCEPT;
#iptables -I FORWARD 1 -i wg0 -j ACCEPT;
#iptables -I FORWARD 1 -o wg0 -j ACCEPT;

#ip6tables -t nat -I POSTROUTING 1 -o ens3 -j MASQUERADE;
#ip6tables -I INPUT 1 -p udp -m udp --dport 51820 -j ACCEPT;
#ip6tables -I FORWARD 1 -i wg0 -j ACCEPT;
#ip6tables -I FORWARD 1 -o wg0 -j ACCEPT;

## IPv4 ## working with single tunnel
$IPT -I INPUT 1 -p udp --dport $WG_PORT -j ACCEPT   # for incoming connection
$IPT -I INPUT 1 -p tcp --dport 51821 -j ACCEPT      # for webui
$IPT -t nat -I POSTROUTING 1 -s $SUB_NET -o $IN_FACE -j MASQUERADE
$IPT -I FORWARD 1 -i $WG_FACE -j ACCEPT   #for internet
$IPT -I FORWARD 1 -o $WG_FACE -j ACCEPT   #for internet

# IPv6 (Uncomment) ##
$IPT6 -I INPUT 1 -p udp --dport $WG_PORT -j ACCEPT   # for incoming connection
$IPT6 -I INPUT 1 -p tcp --dport 51821 -j ACCEPT      # for webui
$IPT6 -t nat -I POSTROUTING 1 -s $SUB_NET_6 -o $IN_FACE -j MASQUERADE
$IPT6 -I FORWARD 1 -i $WG_FACE -j ACCEPT   #for internet
$IPT6 -I FORWARD 1 -o $WG_FACE -j ACCEPT   #for internet
# $IPT6 -t nat -I POSTROUTING 1 -s $SUB_NET_6 -o $IN_FACE -j MASQUERADE
# $IPT6 -I INPUT 1 -i $WG_FACE -j ACCEPT
# $IPT6 -I FORWARD 1 -i $IN_FACE -o $WG_FACE -j ACCEPT
# $IPT6 -I FORWARD 1 -i $WG_FACE -o $IN_FACE -j ACCEPT

# wg-quick up wg1
# systemctl start mount-mypi.service

# wg set wg0 fwmark 51820


set -e