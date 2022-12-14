FROM alpine:3.17.0 AS alpine_wg
RUN apk add -U --no-cache wireguard-tools dumb-init

FROM alpine_wg AS runtime
WORKDIR /etc/wireguard
EXPOSE 8080
USER root