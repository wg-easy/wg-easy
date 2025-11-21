#!/bin/bash
set +e

ip rule del not fwmark 51820 table 51820

ip rule add from 10.250.2.0/24 table 51820

ip route add 10.250.0.0/24 dev docker_daily table 51820

ip route add 10.250.1.0/24 dev wg0 table 51820

ip -6 rule add from fd01:0:2::0/64 table 51820

ip -6 route add fd01:0:1::0/64 dev docker_daily table 51820

ip -6 route add fd01:1:1::0/64 dev wg0 table 51820

set -e