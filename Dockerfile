# nodejs 20 hangs on build with armv6/armv7 (https://github.com/nodejs/docker-node/issues/2077)
FROM docker.io/library/node:18-alpine AS build
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# add build tools for argon2
RUN apk add --no-cache make gcc g++ python3

# Copy Web UI
COPY src ./
RUN pnpm install

# Build UI
RUN pnpm build

# Copy build result to a new image.
# This saves a lot of disk space.
FROM docker.io/library/node:lts-alpine
WORKDIR /app

HEALTHCHECK CMD /usr/bin/timeout 5s /bin/sh -c "/usr/bin/wg show | /bin/grep -q interface || exit 1" --interval=1m --timeout=5s --retries=3

# Copy build
COPY --from=build /app/.output /app

# Install Linux packages
RUN apk add --no-cache \
    dpkg \
    dumb-init \
    iptables \
    ip6tables \
    iptables-legacy \
    wireguard-tools

# Use iptables-legacy
RUN update-alternatives --install /sbin/iptables iptables /sbin/iptables-legacy 10 --slave /sbin/iptables-restore iptables-restore /sbin/iptables-legacy-restore --slave /sbin/iptables-save iptables-save /sbin/iptables-legacy-save
RUN update-alternatives --install /sbin/ip6tables ip6tables /sbin/ip6tables-legacy 10 --slave /sbin/ip6tables-restore ip6tables-restore /sbin/ip6tables-legacy-restore --slave /sbin/ip6tables-save ip6tables-save /sbin/ip6tables-legacy-save

# Set Environment
ENV DEBUG=Server,WireGuard,LowDB
ENV PORT=51821
ENV HOST=0.0.0.0

LABEL org.opencontainers.image.source=https://github.com/wg-easy/wg-easy

# Run Web UI
CMD ["/usr/bin/dumb-init", "node", "server/index.mjs"]
