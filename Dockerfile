FROM docker.io/library/node:lts-alpine AS build
WORKDIR /app

# update corepack
RUN npm install --global corepack@latest
# Install pnpm
RUN corepack enable pnpm

# Copy Web UI
COPY src/package.json src/pnpm-lock.yaml ./
RUN pnpm install

# Build UI
COPY src ./
RUN pnpm build

# Copy build result to a new image.
# This saves a lot of disk space.
FROM docker.io/library/node:lts-alpine
WORKDIR /app

HEALTHCHECK --interval=1m --timeout=5s --retries=3 CMD /usr/bin/timeout 5s /bin/sh -c "/usr/bin/wg show | /bin/grep -q interface || exit 1"

# Copy build
COPY --from=build /app/.output /app
# Copy migrations
COPY --from=build /app/server/database/migrations /app/server/database/migrations
# libsql (https://github.com/nitrojs/nitro/issues/3328)
RUN cd /app/server && \
    npm install --no-save libsql && \
    npm cache clean --force
# cli
COPY --from=build /app/cli/cli.sh /usr/local/bin/cli
RUN chmod +x /usr/local/bin/cli

# Install Linux packages
RUN apk add --no-cache \
    dpkg \
    dumb-init \
    iptables \
    ip6tables \
    nftables \
    kmod \
    iptables-legacy \
    wireguard-tools

# Use iptables-legacy
RUN update-alternatives --install /usr/sbin/iptables iptables /usr/sbin/iptables-legacy 10 --slave /usr/sbin/iptables-restore iptables-restore /usr/sbin/iptables-legacy-restore --slave /usr/sbin/iptables-save iptables-save /usr/sbin/iptables-legacy-save
RUN update-alternatives --install /usr/sbin/ip6tables ip6tables /usr/sbin/ip6tables-legacy 10 --slave /usr/sbin/ip6tables-restore ip6tables-restore /usr/sbin/ip6tables-legacy-restore --slave /usr/sbin/ip6tables-save ip6tables-save /usr/sbin/ip6tables-legacy-save

# Set Environment
ENV DEBUG=Server,WireGuard,Database,CMD
ENV PORT=51821
ENV HOST=0.0.0.0
ENV INSECURE=false
ENV INIT_ENABLED=false

LABEL org.opencontainers.image.source=https://github.com/wg-easy/wg-easy

# Run Web UI
CMD ["/usr/bin/dumb-init", "node", "server/index.mjs"]
