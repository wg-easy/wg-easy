docker run -d \
  --name=wireguard \






  
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=Europe/London \
  -p 51820:51820/udp \
  -v config:/config \
  -v modules:/lib/modules \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  ghcr.io/linuxserver/wireguard