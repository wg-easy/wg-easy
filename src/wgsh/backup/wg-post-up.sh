#!/bin/bash
set +e

IPT="/sbin/iptables"

IN_FACE="ens3"                   # NIC connected to the internet
WG_FACE="wg1"                    # WG NIC
SUB_NET="10.250.1.0/24"          # WG IPv4 sub/net aka CIDR
WG_PORT="51820"                  # WG udp port

$IPT -t nat -I POSTROUTING 1 -s $SUB_NET -o $WG_FACE -j MASQUERADE
$IPT -I FORWARD 1 -i $WG_FACE -o wg0 -j ACCEPT   #for internet
$IPT -I FORWARD 1 -i wg0 -o $WG_FACE -j ACCEPT   #for internet
ip rule add from 10.254.1.209/32 table main     # for ssh access
wg set wg0 fwmark 51820
set -e