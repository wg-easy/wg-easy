FROM debian:bullseye

# Install Linux packages
RUN apt update
RUN apt install -y wireguard iproute2 openresolv curl

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

COPY src/ /app/
WORKDIR /app
RUN npm ci --production


EXPOSE 51820/udp
EXPOSE 80/tcp
ENV DEBUG=Server,WireGuard
CMD ["node", "server.js"]