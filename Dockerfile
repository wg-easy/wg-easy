FROM docker.io/library/node:jod-alpine AS build
WORKDIR /app

# update corepack (pinned version for reproducible builds)
RUN npm install --global corepack@0.34.4
# Install pnpm
RUN corepack enable pnpm

# Copy Web UI
COPY src/package.json src/pnpm-lock.yaml ./
RUN pnpm install

ARG LEGO_ENABLED=true
ENV LEGO_ENABLED=$LEGO_ENABLED

# Build UI
COPY src ./
RUN pnpm build

# Build amneziawg-tools and amneziawg-go from pinned tags
RUN apk add linux-headers build-base go git && \
    git clone --depth 1 --branch v1.0.20250903 https://github.com/amnezia-vpn/amneziawg-tools.git && \
    git clone --depth 1 --branch v0.2.16 https://github.com/amnezia-vpn/amneziawg-go && \
    cd amneziawg-go && \
    make && \
    cd ../amneziawg-tools/src && \
    make

# Download lego (ACME client for IP TLS certs) - pinned version for reproducibility
# To verify: sha256sum lego.tar.gz against https://github.com/go-acme/lego/releases
ARG LEGO_VERSION=v4.23.1
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    wget -qO /tmp/lego.tar.gz \
    "https://github.com/go-acme/lego/releases/download/${LEGO_VERSION}/lego_${LEGO_VERSION}_linux_${ARCH}.tar.gz" && \
    wget -qO /tmp/lego.tar.gz.sha256 \
        "https://github.com/go-acme/lego/releases/download/${LEGO_VERSION}/lego_${LEGO_VERSION#v}_checksums.txt" && \
    grep "lego_${LEGO_VERSION}_linux_${ARCH}.tar.gz" /tmp/lego.tar.gz.sha256 | sha256sum -c - && \
    tar -xzf /tmp/lego.tar.gz -C /tmp lego && \
    mv /tmp/lego /usr/local/bin/lego && \
    chmod +x /usr/local/bin/lego && \
    rm /tmp/lego.tar.gz /tmp/lego.tar.gz.sha256

# Copy build result to a new image.
# This saves a lot of disk space.
FROM docker.io/library/node:jod-alpine
WORKDIR /app

HEALTHCHECK --interval=1m --timeout=5s --retries=3 CMD /usr/bin/timeout 5s /bin/sh -c "/usr/bin/wg show | /bin/grep -q interface || exit 1"

# Copy build
COPY --from=build /app/.output /app
# Copy migrations
COPY --from=build /app/server/database/migrations /app/server/database/migrations

# libsql (https://github.com/nitrojs/nitro/issues/3328)
RUN cd /app/server && \
    npm install --no-save --omit=dev libsql && \
    npm cache clean --force

# cli
COPY --from=build /app/cli/cli.sh /usr/local/bin/cli
RUN chmod +x /usr/local/bin/cli

# Copy amneziawg-go
COPY --from=build /app/amneziawg-go/amneziawg-go /usr/bin/amneziawg-go
RUN chmod +x /usr/bin/amneziawg-go

# Copy amneziawg-tools
COPY --from=build /app/amneziawg-tools/src/wg /usr/bin/awg
COPY --from=build /app/amneziawg-tools/src/wg-quick/linux.bash /usr/bin/awg-quick
RUN chmod +x /usr/bin/awg /usr/bin/awg-quick

# Copy lego binary
COPY --from=build /usr/local/bin/lego /usr/local/bin/lego

# Install Linux packages
RUN apk add --no-cache \
    dpkg \
    dumb-init \
    iptables \
    ip6tables \
    nftables \
    kmod \
    iptables-legacy \
    netcat-openbsd \
    wireguard-tools && \
    mkdir -p /etc/amnezia && \
    ln -s /etc/wireguard /etc/amnezia/amneziawg && \
    update-alternatives --install /usr/sbin/iptables iptables /usr/sbin/iptables-legacy 10 \
    --slave /usr/sbin/iptables-restore iptables-restore /usr/sbin/iptables-legacy-restore \
    --slave /usr/sbin/iptables-save iptables-save /usr/sbin/iptables-legacy-save && \
    update-alternatives --install /usr/sbin/ip6tables ip6tables /usr/sbin/ip6tables-legacy 10 \
    --slave /usr/sbin/ip6tables-restore ip6tables-restore /usr/sbin/ip6tables-legacy-restore \
    --slave /usr/sbin/ip6tables-save ip6tables-save /usr/sbin/ip6tables-legacy-save

# Copy cert-management scripts
COPY scripts/lego-renew.sh /usr/local/bin/lego-renew.sh
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
# Copy TLS proxy (standalone JS - no shell injection risk)
COPY scripts/tls-proxy.js /usr/local/bin/tls-proxy.js
RUN chmod +x /usr/local/bin/lego-renew.sh /usr/local/bin/entrypoint.sh

# Set Environment
# NOTE: DEBUG is intentionally not set here; pass via -e DEBUG=... at runtime if needed
ENV PORT=51821
ENV HOST=0.0.0.0
ENV INSECURE=false
ENV INIT_ENABLED=false
ENV DISABLE_IPV6=false

LABEL org.opencontainers.image.source=https://github.com/Platon47/wg-easy-ip-tls

# Use dumb-init as PID 1 for proper signal forwarding and zombie reaping
CMD ["/usr/bin/dumb-init", "/usr/local/bin/entrypoint.sh"]
