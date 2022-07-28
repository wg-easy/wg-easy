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

FROM golang:1.17 AS build-coredns

# download latest CoreDNS sources and compile them into binary /source/coredns
RUN mkdir /source && \
  COREDNS_VERSION=$(curl -sX GET "https://api.github.com/repos/coredns/coredns/releases/latest" \
	| awk '/tag_name/{print $4;exit}' FS='[""]' | awk '{print substr($1,2); }') && \
  curl --location https://github.com/coredns/coredns/archive/refs/tags/v${COREDNS_VERSION}.tar.gz \
    | tar xz --directory /source --strip-components 1 && \
  cd /source && \
  make

# Copy build result to a new image.
# This saves a lot of disk space.
FROM docker.io/library/node:14-alpine@sha256:dc92f36e7cd917816fa2df041d4e9081453366381a00f40398d99e9392e78664
COPY --from=build_node_modules /app /app

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

COPY --from=build-coredns /source/coredns /coredns/
COPY coredns/Corefile /coredns/
COPY entrypoint.sh /

# Expose Ports
EXPOSE 51820/udp
EXPOSE 51821/tcp

# Set Environment
ENV DEBUG=Server,WireGuard

# Set workdir to /app for eg 'docker exec' commands
WORKDIR /app

# Run Web UI and CoreDNS
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/entrypoint.sh"]
