# nodejs 20 hangs on build with armv6/armv7 (https://github.com/nodejs/docker-node/issues/2077)
FROM docker.io/library/node:18-alpine AS build
WORKDIR /app

# update corepack
RUN npm install --global corepack@latest
# Install pnpm
RUN corepack enable pnpm

# add build tools for argon2
RUN apk add --no-cache make gcc g++ python3

# Copy Web UI
COPY src ./
RUN pnpm install

# Build UI
RUN pnpm build

# Remove unnecessary node modules
RUN find ./node_modules/.pnpm -mindepth 1 -maxdepth 1 -type d ! -name '@libsql+linux*' -exec rm -r {} +
RUN find ./node_modules/@libsql -mindepth 1 -maxdepth 1 -type l ! -name 'linux*' -exec rm -r {} +

# Copy build result to a new image.
# This saves a lot of disk space.
FROM docker.io/library/node:lts-alpine
WORKDIR /app

HEALTHCHECK --interval=1m --timeout=5s --retries=3 CMD /usr/bin/timeout 5s /bin/sh -c "/usr/bin/wg show | /bin/grep -q interface || exit 1"

# Copy build
COPY --from=build /app/.output /app
# Copy migrations
COPY --from=build /app/server/database/migrations /app/server/database/migrations
# libsql
COPY --from=build /app/node_modules/.pnpm/ /app/node_modules/.pnpm/
COPY --from=build /app/node_modules/@libsql /app/node_modules/@libsql

# Install Linux packages
RUN apk add --no-cache \
    dpkg \
    dumb-init \
    iptables \
    ip6tables \
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

LABEL org.opencontainers.image.source=https://github.com/wg-easy/wg-easy

# Run Web UI
CMD ["/usr/bin/dumb-init", "node", "server/index.mjs"]
