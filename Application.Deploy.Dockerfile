FROM alpine:3.17.0 AS alpine_wg
RUN apk add -U --no-cache wireguard-tools dumb-init

FROM alpine_wg AS runtime
COPY application/bin/rs-wg /usr/local/cargo/bin/rs-wg
# COPY data/wireguard /etc/wireguard
CMD [ "mkdir", "/etc/wireguard" ]
COPY data/www /etc/www
WORKDIR /etc/wireguard
EXPOSE 8080