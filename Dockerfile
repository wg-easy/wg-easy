# As a workaround we have to build on nodejs 18
# nodejs 20 hangs on build with armv6/armv7
FROM docker.io/library/node:18-alpine AS build_node_modules

# Update npm to latest
RUN npm install -g npm@latest

# Copy Web UI
COPY src /app
WORKDIR /app
RUN npm ci --omit=dev &&\
    mv node_modules /node_modules

# Copy build result to a new image.
# This saves a lot of disk space.
FROM docker.io/library/node:20-alpine
HEALTHCHECK CMD /usr/bin/timeout 5s /bin/sh -c "/usr/bin/wg show | /bin/grep -q interface || exit 1" --interval=1m --timeout=5s --retries=3
COPY --from=build_node_modules /app /app

# Move node_modules one directory up, so during development
# we don't have to mount it in a volume.
# This results in much faster reloading!
#
# Also, some node_modules might be native, and
# the architecture & OS of your development machine might differ
# than what runs inside of docker.
COPY --from=build_node_modules /node_modules /node_modules

# Install Linux packages
RUN apk add --no-cache \
    dpkg \
    dumb-init \
    iptables \
    iptables-legacy \
    wireguard-tools

# Download and instll Go
RUN wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz &&\
    tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz &&\
    rm  go1.22.5.linux-amd64.tar.gz


# Configure Go
RUN echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile &&\
    echo 'export GOPATH=$HOME/goproject' >> /etc/profile &&\
    echo 'export PATH=$PATH:$GOPATH/bin' >> /etc/profile &&\
    source /etc/profile &&\
    mkdir $HOME/goproject

# Set Go Environment 
ENV PATH=$PATH:/usr/local/go/bin
ENV GOPATH=/root/goproject
ENV PATH=$PATH:$GOPATH/bin

# Use iptables-legacy
RUN update-alternatives --install /sbin/iptables iptables /sbin/iptables-legacy 10 --slave /sbin/iptables-restore iptables-restore /sbin/iptables-legacy-restore --slave /sbin/iptables-save iptables-save /sbin/iptables-legacy-save

# Set WG Environment
ENV DEBUG=Server,WireGuard

# Start cron in the background and then start the main application
WORKDIR /app
CMD ["/usr/bin/dumb-init",\
     "/bin/sh", "-c", "exec node server.js & watch -n 86400 go run ./services/ClientSwitcher.go ${WG_HOST} ${PORT} ${PASSWORD}"]
