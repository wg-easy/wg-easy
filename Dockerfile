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

# Build amneziawg-tools
RUN apk add linux-headers build-base git && \
    git clone https://github.com/amnezia-vpn/amneziawg-tools.git && \
    cd amneziawg-tools/src && \
    make

# Build amneziawg kernel module for Alpine linux-lts kernel (6.12.50)
FROM alpine:3.20 AS kernel_module_builder
WORKDIR /build

# Install linux-lts kernel headers and build dependencies
RUN apk add --no-cache \
    git \
    linux-lts-dev \
    build-base \
    bc \
    elfutils-dev \
    wget \
    xz

# Get the actual LTS kernel version
RUN KERNEL_VERSION=$(apk info linux-lts-dev | grep 'linux-lts-dev-' | sed 's/linux-lts-dev-//;s/-r.*//' | head -1) && \
    echo "Building for kernel: $KERNEL_VERSION" && \
    echo "$KERNEL_VERSION" > /build/kernel_version.txt

# Clone the kernel module source
RUN git clone https://github.com/amnezia-vpn/amneziawg-linux-kernel-module.git

# Build the kernel module
WORKDIR /build/amneziawg-linux-kernel-module/src
RUN KERNEL_VERSION=$(cat /build/kernel_version.txt) && \
    make KERNELDIR="/usr/src/linux-headers-${KERNEL_VERSION}-0-lts" || \
    echo "Kernel module build failed, will use userspace fallback"

# Prepare module for installation
RUN mkdir -p /build/module && \
    if [ -f amneziawg.ko ]; then \
        cp amneziawg.ko /build/module/ && \
        echo "Kernel module built successfully"; \
    else \
        echo "No kernel module - will use userspace only"; \
    fi

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
# Copy amneziawg-tools
COPY --from=build /app/amneziawg-tools/src/wg /usr/bin/awg
COPY --from=build /app/amneziawg-tools/src/wg-quick/linux.bash /usr/bin/awg-quick
RUN chmod +x /usr/bin/awg /usr/bin/awg-quick

# Copy pre-built kernel module if available
COPY --from=kernel_module_builder /build/module/* /lib/modules/ 2>/dev/null || true
COPY --from=kernel_module_builder /build/kernel_version.txt /etc/amneziawg-kernel-version.txt 2>/dev/null || true

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

RUN mkdir -p /etc/amnezia
RUN ln -s /etc/wireguard /etc/amnezia/amneziawg

# Use iptables-legacy
RUN update-alternatives --install /usr/sbin/iptables iptables /usr/sbin/iptables-legacy 10 --slave /usr/sbin/iptables-restore iptables-restore /usr/sbin/iptables-legacy-restore --slave /usr/sbin/iptables-save iptables-save /usr/sbin/iptables-legacy-save
RUN update-alternatives --install /usr/sbin/ip6tables ip6tables /usr/sbin/ip6tables-legacy 10 --slave /usr/sbin/ip6tables-restore ip6tables-restore /usr/sbin/ip6tables-legacy-restore --slave /usr/sbin/ip6tables-save ip6tables-save /usr/sbin/ip6tables-legacy-save

# Set Environment
ENV DEBUG=Server,WireGuard,Database,CMD
ENV PORT=51821
ENV HOST=0.0.0.0
ENV INSECURE=false
ENV INIT_ENABLED=false
ENV DISABLE_IPV6=false

LABEL org.opencontainers.image.source=https://github.com/wg-easy/wg-easy

# Run Web UI
CMD ["/usr/bin/dumb-init", "node", "server/index.mjs"]
