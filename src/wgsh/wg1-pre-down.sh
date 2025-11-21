#!/bin/bash
set +e

ip rule del from 10.250.2.0/24 table 51820

ip route del 10.250.0.0/24 dev docker_daily table 51820

ip route del 10.250.1.0/24 dev wg0 table 51820

ip -6 rule del from fd01:0:2::0/64 table 51820

ip -6 route del fd01:0:1::0/64 dev docker_daily table 51820

ip -6 route del fd01:1:1::0/64 dev wg0 table 51820

set -e