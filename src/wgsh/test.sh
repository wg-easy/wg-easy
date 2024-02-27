sudo iptables -A INPUT -i ens3 -m comment --comment \"Accept input from tunnel adapter\" -j ACCEPT

sudo iptables -A OUTPUT -s 10.210.0.0/24 -d 10.210.0.0/24 -j ACCEPT

#qbittorrent container public ip
sudo docker exec -it qbittorrent curl ipinfo.io/ip

sudo ip rule del not fwmark 51820 table 51820

sudo ip rule add from 10.210.0.0/24 table 51820

sudo ip route add 10.210.0.0/24 dev wireguard table 51820

sudo ip route add 10.250.1.0/24 dev wg0 table 51820


#For daily server
sudo ip rule add from 10.250.0.7/32 table 51820
sudo ip rule del from 10.250.0.7/32 table 51820

sudo ip route del 10.250.0.0/24 dev docker_daily table 51820

sudo ip route del 10.250.1.0/24 dev wg0 table 51820

sudo ip route add 10.254.1.29/32 dev enp0s3 table 51820

PostUp = /home/ubuntu/wg-easy/src/wgsh/wg1-post-up.sh
PreDown = /home/ubuntu/wg-easy/src/wgsh/wg1-pre-down.sh