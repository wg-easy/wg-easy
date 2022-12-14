FROM alpine:3.17.0 AS runtime
RUN apk add -U --no-cache wireguard-tools dumb-init