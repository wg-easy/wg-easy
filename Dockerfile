# Prepare wireguard-go in separate builder
ARG GOLANG_VERSION=1.18.0
ARG ALPINE_VERSION=3.15
ARG wg_go_tag=0.0.20220316
ARG wg_tools_tag=v1.0.20210914

FROM golang:${GOLANG_VERSION}-alpine${ALPINE_VERSION} as wireguard-go

RUN apk add --update git build-base libmnl-dev iptables

RUN git clone https://git.zx2c4.com/wireguard-go && \
  cd wireguard-go && \
  git checkout $wg_go_tag && \
  make && \
  make install

ENV WITH_WGQUICK=yes
RUN git clone https://git.zx2c4.com/wireguard-tools && \
  cd wireguard-tools && \
  git checkout $wg_tools_tag && \
  cd src && \
  make && \
  make install


# There's an issue with node:16-alpine.
# On Raspberry Pi, the following crash happens:

# #FailureMessage Object: 0x7e87753c
# #
# # Fatal error in , line 0
# # unreachable code
# #
# #
# #

FROM docker.io/library/node:14-alpine@sha256:dc92f36e7cd917816fa2df041d4e9081453366381a00f40398d99e9392e78664 AS build_node_modules

# Copy Web UI
COPY src/ /app/
WORKDIR /app
RUN npm ci --production



# Copy build result to a new image.
# This saves a lot of disk space.
FROM docker.io/library/node:14-alpine@sha256:dc92f36e7cd917816fa2df041d4e9081453366381a00f40398d99e9392e78664
COPY --from=build_node_modules /app /app
COPY --from=wireguard-go /usr/bin/wg /usr/bin/wg-quick /usr/bin/wireguard-go /wireguard-go/

# Move node_modules one directory up, so during development
# we don't have to mount it in a volume.
# This results in much faster reloading!
#
# Also, some node_modules might be native, and
# the architecture & OS of your development machine might differ
# than what runs inside of docker.
RUN mv /app/node_modules /node_modules

# Enable this to run `npm run serve`
RUN npm i -g nodemon

# Install Linux packages
RUN apk add -U --no-cache \
  wireguard-tools \
  dumb-init

# Expose Ports
EXPOSE 51820/udp
EXPOSE 51821/tcp

# Set Environment
ENV DEBUG=Server,WireGuard

# Run Web UI
WORKDIR /app
CMD ["/usr/bin/dumb-init", "node", "server.js"]
