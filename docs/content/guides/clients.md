---
title: Edit Client
---

## General

- **Name**: The name of the client.
- **Enabled**: Whether the client can connect to the VPN.
- **Expire Date**: The date the client will be disabled.

## Address

- **IPv4**: The IPv4 address of the client.
- **IPv6**: The IPv6 address of the client.

## Allowed IPs

Which IPs will be routed through the VPN.

This will not prevent the user from modifying it locally and accessing IP ranges that they should not be able to access.

Use firewall rules to prevent access to IP ranges that the user should not be able to access.

## Server Allowed IPs

Which IPs will be routed to the client.

## DNS

The DNS server that the client will use.

## Advanced

- **MTU**: The maximum transmission unit for the client.
- **Persistent Keepalive**: The interval for sending keepalive packets to the server.

## Hooks

This can only be used for clients that use `wg-quick`. Setting this will throw a error when importing the config on other clients.

- **PreUp**: Commands to run before the interface is brought up.
- **PostUp**: Commands to run after the interface is brought up.
- **PreDown**: Commands to run before the interface is brought down.
- **PostDown**: Commands to run after the interface is brought down.

## Actions

- **Save**: Save the changes made in the form.
- **Revert**: Revert the changes made in the form.
- **Delete**: Delete the client.
