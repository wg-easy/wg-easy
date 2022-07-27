#!/bin/bash

# run coredns on background
cd /coredns && ./coredns &

# run node
cd /app && exec node server.js
