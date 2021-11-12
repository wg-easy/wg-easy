FROM docker.io/library/node:14-alpine@sha256:dc92f36e7cd917816fa2df041d4e9081453366381a00f40398d99e9392e78664

# Install Linux packages
RUN apk add -U --no-cache wireguard-tools dumb-init

# Copy Web UI
COPY src/ /app/
WORKDIR /app
RUN npm ci --production
RUN npm i -g nodemon
RUN mv /app/node_modules/ /node_modules/

# Expose Ports
EXPOSE 51820/udp
EXPOSE 51821/tcp

# Set Environment
ENV DEBUG=Server,WireGuard

# Run Web UI
CMD ["/usr/bin/dumb-init", "node", "server.js"]
