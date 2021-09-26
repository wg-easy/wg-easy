FROM node:14-alpine

# Install Linux packages
RUN apk add -U --no-cache wireguard-tools dumb-init

# Copy Web UI
COPY src/ /app/
WORKDIR /app
RUN npm ci --production

# Expose Ports
EXPOSE 51820/udp
EXPOSE 51821/tcp

# Set Environment
ENV DEBUG=Server,WireGuard

# Run Web UI
CMD ["/usr/bin/dumb-init", "node", "server.js"]
