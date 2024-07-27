FROM ghcr.io/vikashloomba/capmvm-k8s-os:1.23.5
RUN apt-get install -y unzip
RUN curl -fsSL https://fnm.vercel.app/install | bash
RUN /bin/bash -c "source ~/.bashrc" \
    && fnm use --install-if-missing 20

# Update npm to latest
RUN npm install -g npm@latest

# Copy Web UI
COPY src /app
WORKDIR /app
RUN npm ci --omit=dev
# Set Environment
ENV DEBUG=Server,WireGuard
