FROM docker.io/library/node:16-alpine

# Install Linux packages
RUN apk add -U --no-cache wireguard-tools dumb-init

# Copy Web UI
COPY src/ /app/
WORKDIR /app
RUN npm ci --production \
&&  npm i -g nodemon \
&&  npm cache clear --force
RUN mv /app/node_modules/ /node_modules/

# Expose Ports
EXPOSE 51820/udp
EXPOSE 51821/tcp

# Set Environment
ENV DEBUG=Server,WireGuard

# Run Web UI
CMD ["/usr/bin/dumb-init", "node", "server.js"]
