FROM ghcr.io/vikashloomba/capmvm-k8s-os:1.23.5
RUN apt install -y nodejs
# Update npm to latest
RUN npm install -g npm@latest

# Copy Web UI
COPY src /app
WORKDIR /app
RUN npm ci --omit=dev &&\
    mv node_modules /node_modules
# Set Environment
ENV DEBUG=Server,WireGuard
