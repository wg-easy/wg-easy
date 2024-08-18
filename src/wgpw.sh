#!/bin/sh
# This script is intended to be run only inside a docker container, not on the development host machine
set -e
# proxy command
node /app/wgpw.mjs "$@"