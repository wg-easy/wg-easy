#!/bin/bash

# run CoreDNS in background
echo "Running CoreDNS in background"
cd /coredns && ./coredns &

# run app using node
echo "Running app"
cd /app && exec node server.js
