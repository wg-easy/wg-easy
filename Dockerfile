FROM node:14-alpine

# Install Linux packages
RUN apk add -U wireguard-tools

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
CMD ["node", "server.js"]
