FROM docker.io/library/node:jod-alpine
WORKDIR /app

# update corepack
RUN npm install --global corepack@latest
# Install pnpm
RUN corepack enable pnpm

HEALTHCHECK --interval=1m --timeout=5s --retries=3 CMD /usr/bin/timeout 5s /bin/sh -c "/usr/bin/wg show | /bin/grep -q interface || exit 1"

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
ENV INSECURE=true
ENV INIT_ENABLED=false
ENV DISABLE_IPV6=false

# Install Dependencies
COPY src/package.json src/pnpm-lock.yaml ./
RUN pnpm install

# Copy Project
COPY src ./

ENTRYPOINT [ "pnpm", "run" ]
