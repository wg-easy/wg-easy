# run coredns on background
cd /coredns && ./coredns &

# run node
cd /app && exec /usr/bin/dumb-init node server.js
