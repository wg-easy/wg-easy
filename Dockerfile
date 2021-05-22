FROM debian:bullseye

# Install Linux packages
RUN apt update
RUN apt install -y wireguard iproute2 openresolv curl

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

# RUN wg-quick up wg0
EXPOSE 51820
ENTRYPOINT ["tail", "-f", "/dev/null"]