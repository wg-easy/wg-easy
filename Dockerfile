FROM node:16-buster

# Install Linux packages
RUN apt-get clean
RUN echo "deb http://deb.debian.org/debian buster-backports main" > /etc/apt/sources.list.d/backports.list
RUN apt-get update
RUN apt-get install -y wireguard iproute2 openresolv curl

# Install Node.js
# RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
# RUN apt-get install -y nodejs

COPY src/ /app/
WORKDIR /app
RUN npm ci --production


EXPOSE 51820/udp
EXPOSE 80/tcp
ENV DEBUG=Server,WireGuard
CMD ["node", "server.js"]