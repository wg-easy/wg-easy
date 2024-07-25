#!/bin/bash

# The buildall.sh script is designed to streamline the build process for the project.
# It allows you to run different build commands based on whether you are using "sudo" and supports multiple package managers.
# If you need to run the build commands with "sudo[script]" (look at package.json scripts), provide the "with-sudo" argument :
#
# $ ./buildall with-sudo
#

set -e # exit if throw

# r u "sudo"
check_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        echo "true"
    else
        echo "false"
    fi
}

# determine which build command to use
# first, run a command with sudo like `sudo echo` before
if [ "$1" == "with-sudo" ]; then
    echo "You are running with sudo"
    BUILD_CMD="sudobuild"
else
    BUILD_CMD="build"
fi

if command -v pnpm &>/dev/null; then
    PACKAGE_MANAGER=pnpm
elif command -v yarn &>/dev/null; then
    PACKAGE_MANAGER=yarn
else
    PACKAGE_MANAGER=npm
fi

echo "Build the project using \"$PACKAGE_MANAGER\" as package manager"

$PACKAGE_MANAGER run -C src buildfirewall
$PACKAGE_MANAGER run -C src buildcss
$PACKAGE_MANAGER run $BUILD_CMD

echo "Done"
