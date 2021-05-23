docker run \
  --name wg-easy \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --mount type=bind,source="$(pwd)"/config,target=/etc/wireguard \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  wg-easy