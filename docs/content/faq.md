---
title: FAQ
hide:
    - navigation
---

Here are some frequently asked questions or errors about `wg-easy`. If you have a question that is not answered here, please feel free to open a discussion on GitHub.

## Error: WireGuard exited with the error: Cannot find device "wg0"

This error indicates that the WireGuard interface `wg0` does not exist. This can happen if the WireGuard kernel module is not loaded or if the interface was not created properly.

To resolve this issue, you can try the following steps:

1. **Load the WireGuard kernel module**: If the WireGuard kernel module is not loaded, you can load it manually by running:

    ```shell
    sudo modprobe wireguard
    ```

2. **Load the WireGuard kernel module on boot**: If you want to ensure that the WireGuard kernel module is loaded automatically on boot, you can add it to the `/etc/modules` file:

    ```shell
    echo "wireguard" | sudo tee -a /etc/modules
    ```

## can't initialize iptables table `nat': Table does not exist (do you need to insmod?)

This error indicates that the `nat` table in `iptables` does not exist. This can happen if the `iptables` kernel module is not loaded or if the `nat` table is not supported by your kernel.

To resolve this issue, you can try the following steps:

1. **Load the `nat` kernel module**: If the `nat` kernel module is not loaded, you can load it manually by running:

    ```shell
    sudo modprobe iptable_nat
    ```

2. **Load the `nat` kernel module on boot**: If you want to ensure that the `nat` kernel module is loaded automatically on boot, you can add it to the `/etc/modules` file:

    ```shell
     echo "iptable_nat" | sudo tee -a /etc/modules
    ```

## can't initialize ip6tables table `nat': Table does not exist (do you need to insmod?)

This error indicates that the `nat` table in `ip6tables` does not exist. This can happen if the `ip6tables` kernel module is not loaded or if the `nat` table is not supported by your kernel.

To resolve this issue, you can try the following steps:

1. **Load the `nat` kernel module**: If the `nat` kernel module is not loaded, you can load it manually by running:

    ```shell
    sudo modprobe ip6table_nat
    ```

2. **Load the `nat` kernel module on boot**: If you want to ensure that the `nat` kernel module is loaded automatically on boot, you can add it to the `/etc/modules` file:

    ```shell
     echo "ip6table_nat" | sudo tee -a /etc/modules
    ```

## can't initialize iptables table `filter': Permission denied

This error indicates that the `filter` table in `iptables` cannot be initialized due to permission issues. This can happen if you are not running the command with sufficient privileges.

To resolve this issue, you can try the following steps:

1. **Load the `filter` kernel module**: If the `filter` kernel module is not loaded, you can load it manually by running:

    ```shell
    sudo modprobe iptable_filter
    ```

2. **Load the `filter` kernel module on boot**: If you want to ensure that the `filter` kernel module is loaded automatically on boot, you can add it to the `/etc/modules` file:

    ```shell
    echo "iptable_filter" | sudo tee -a /etc/modules
    ```

## can't initialize ip6tables table `filter': Permission denied

This error indicates that the `filter` table in `ip6tables` cannot be initialized due to permission issues. This can happen if you are not running the command with sufficient privileges.

To resolve this issue, you can try the following steps:

1. **Load the `filter` kernel module**: If the `filter` kernel module is not loaded, you can load it manually by running:

    ```shell
    sudo modprobe ip6table_filter
    ```

2. **Load the `filter` kernel module on boot**: If you want to ensure that the `filter` kernel module is loaded automatically on boot, you can add it to the `/etc/modules` file:

    ```shell
     echo "ip6table_filter" | sudo tee -a /etc/modules
    ```
