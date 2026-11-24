#!/bin/sh
case " $* " in
  *" link add "*" type wireguard "*|*" link add "*" type amneziawg "*)
    echo 'Error: Unknown device type.' >&2
    exit 2
    ;;
esac
exec /sbin/ip "$@"
