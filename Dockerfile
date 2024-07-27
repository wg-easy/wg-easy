FROM ghcr.io/vikashloomba/capmvm-k8s-os:1.23.5
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    export NVM_DIR="$HOME/.nvm && \
    nvm install 20

# Update npm to latest
RUN npm install -g npm@latest

# Copy Web UI
COPY src /app
WORKDIR /app
RUN npm ci --omit=dev
# Set Environment
ENV DEBUG=Server,WireGuard
