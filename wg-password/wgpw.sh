#!/bin/sh
# This script is intended to be run only inside a docker container, not on the development host machine
set -e
# proxy command
export NODE_PATH="/node_modules_wg"
node /wgpw/index.mjs "$@"