{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.wg-easy;
  boolString = value: if value then "true" else "false";
  listString = values: lib.concatStringsSep "," values;
  validListItems =
    values: lib.all (value: value != "" && builtins.match ".*,.*" value == null) values;
  interfaceNamePattern = "[A-Za-z0-9_.-]{1,15}";
in
{
  options.services.wg-easy = {
    enable = lib.mkEnableOption "wg-easy";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.callPackage ./package.nix { };
      defaultText = lib.literalExpression "pkgs.callPackage ./package.nix { }";
      description = "wg-easy package to run.";
    };

    interfaceName = lib.mkOption {
      type = lib.types.str;
      default = "wg0";
      description = "WireGuard interface name managed by wg-easy.";
    };

    wireguardPort = lib.mkOption {
      type = lib.types.port;
      default = 51820;
      description = "UDP port used by the WireGuard interface.";
    };

    uiPort = lib.mkOption {
      type = lib.types.port;
      default = 51821;
      description = "TCP port used by the wg-easy web UI.";
    };

    stateDir = lib.mkOption {
      type = lib.types.str;
      default = "/var/lib/wg-easy";
      description = "Writable directory for the SQLite database and generated WireGuard config.";
    };

    externalInterface = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      description = "Optional egress network interface used in wg-easy NAT hooks.";
    };

    enableIPv6 = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Enable IPv6 addresses and IPv6 firewall hooks in wg-easy.";
    };

    defaultDns = lib.mkOption {
      type = lib.types.nullOr (lib.types.listOf lib.types.str);
      default = null;
      description = "DNS servers to stamp onto new clients. Leave null to use wg-easy's global default.";
    };

    defaultAllowedIps = lib.mkOption {
      type = lib.types.nullOr (lib.types.listOf lib.types.str);
      default = null;
      description = "Allowed IPs to stamp onto new client configs. Leave null to use wg-easy's global default.";
    };

    defaultServerAllowedIps = lib.mkOption {
      type = lib.types.nullOr (lib.types.listOf lib.types.str);
      default = null;
      description = "Additional server-side peer AllowedIPs to stamp onto new clients.";
    };

    defaultFirewallAllowedIps = lib.mkOption {
      type = lib.types.nullOr (lib.types.listOf lib.types.str);
      default = null;
      description = "Firewall-enforced allowed destinations to stamp onto new clients.";
    };

    defaultPersistentKeepalive = lib.mkOption {
      type = lib.types.nullOr (lib.types.ints.between 0 65535);
      default = 25;
      description = "Persistent keepalive to stamp onto new clients. Set null to preserve wg-easy's configured default.";
    };

    firewallEnabled = lib.mkOption {
      type = lib.types.nullOr lib.types.bool;
      default = null;
      description = "Enable or disable wg-easy per-client firewall filtering. Leave null to preserve wg-easy's configured value.";
    };

    forceUpdateClients = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Overwrite existing clients with configured Nix defaults on service startup.";
    };

    insecure = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Serve the UI as insecure HTTP. Keep false when using HTTPS through a reverse proxy.";
    };

    openFirewall = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Open the WireGuard UDP port in the NixOS firewall.";
    };

    openWebUIFirewall = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Open the wg-easy web UI TCP port in the NixOS firewall.";
    };

    extraEnvironment = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = { };
      description = "Additional environment variables for the wg-easy service.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = builtins.match interfaceNamePattern cfg.interfaceName != null;
        message = "services.wg-easy.interfaceName must be 1-15 characters using only letters, numbers, '.', '_', or '-'.";
      }
      {
        assertion =
          cfg.externalInterface == null || builtins.match interfaceNamePattern cfg.externalInterface != null;
        message = "services.wg-easy.externalInterface must be 1-15 characters using only letters, numbers, '.', '_', or '-'.";
      }
      {
        assertion = lib.hasPrefix "/" cfg.stateDir;
        message = "services.wg-easy.stateDir must be an absolute path.";
      }
      {
        assertion = cfg.defaultDns == null || validListItems cfg.defaultDns;
        message = "services.wg-easy.defaultDns entries must be non-empty and must not contain commas.";
      }
      {
        assertion =
          cfg.defaultAllowedIps == null
          || (cfg.defaultAllowedIps != [ ] && validListItems cfg.defaultAllowedIps);
        message = "services.wg-easy.defaultAllowedIps must be null or a non-empty list without commas.";
      }
      {
        assertion = cfg.defaultServerAllowedIps == null || validListItems cfg.defaultServerAllowedIps;
        message = "services.wg-easy.defaultServerAllowedIps entries must be non-empty and must not contain commas.";
      }
      {
        assertion =
          cfg.defaultFirewallAllowedIps == null
          || (cfg.defaultFirewallAllowedIps != [ ] && validListItems cfg.defaultFirewallAllowedIps);
        message = "services.wg-easy.defaultFirewallAllowedIps must be null or a non-empty list without commas.";
      }
    ];

    boot.kernel.sysctl = {
      "net.ipv4.ip_forward" = lib.mkDefault 1;
      "net.ipv4.conf.all.src_valid_mark" = lib.mkDefault 1;
    }
    // lib.optionalAttrs cfg.enableIPv6 {
      "net.ipv6.conf.all.disable_ipv6" = lib.mkDefault 0;
      "net.ipv6.conf.all.forwarding" = lib.mkDefault 1;
      "net.ipv6.conf.default.forwarding" = lib.mkDefault 1;
    };

    networking.firewall.allowedUDPPorts = lib.mkIf cfg.openFirewall [ cfg.wireguardPort ];
    networking.firewall.allowedTCPPorts = lib.mkIf cfg.openWebUIFirewall [ cfg.uiPort ];

    systemd.tmpfiles.rules = [
      "d ${cfg.stateDir} 0700 root root -"
    ];

    systemd.services.wg-easy = {
      description = "WireGuard Easy";
      documentation = [ "https://wg-easy.github.io/wg-easy/latest/" ];
      wantedBy = [ "multi-user.target" ];
      wants = [ "network-online.target" ];
      after = [ "network-online.target" ];

      environment = {
        DISABLE_IPV6 = boolString (!cfg.enableIPv6);
        INSECURE = boolString cfg.insecure;
        PORT = toString cfg.uiPort;
        WG_FORCE_UPDATE_CLIENTS = boolString cfg.forceUpdateClients;
        WG_INTERFACE_NAME = cfg.interfaceName;
        WG_PORT = toString cfg.wireguardPort;
        WG_STATE_DIR = cfg.stateDir;
      }
      // lib.optionalAttrs (cfg.defaultDns != null) {
        WG_DEFAULT_DNS = listString cfg.defaultDns;
      }
      // lib.optionalAttrs (cfg.defaultAllowedIps != null) {
        WG_DEFAULT_ALLOWED_IPS = listString cfg.defaultAllowedIps;
      }
      // lib.optionalAttrs (cfg.defaultServerAllowedIps != null) {
        WG_DEFAULT_SERVER_ALLOWED_IPS = listString cfg.defaultServerAllowedIps;
      }
      // lib.optionalAttrs (cfg.defaultFirewallAllowedIps != null) {
        WG_DEFAULT_FIREWALL_ALLOWED_IPS = listString cfg.defaultFirewallAllowedIps;
      }
      // lib.optionalAttrs (cfg.defaultPersistentKeepalive != null) {
        WG_DEFAULT_PERSISTENT_KEEPALIVE = toString cfg.defaultPersistentKeepalive;
      }
      // lib.optionalAttrs (cfg.firewallEnabled != null) {
        WG_FIREWALL_ENABLED = boolString cfg.firewallEnabled;
      }
      // lib.optionalAttrs (cfg.externalInterface != null) {
        WG_DEVICE = cfg.externalInterface;
      }
      // cfg.extraEnvironment;

      path = with pkgs; [
        bash
        coreutils
        gawk
        gnugrep
        gnused
        iproute2
        iptables
        kmod
        nftables
        procps
        wireguard-go
        wireguard-tools
      ];

      serviceConfig = {
        ExecStart = lib.getExe cfg.package;
        Restart = "on-failure";
        RestartSec = "5s";
        User = "root";
        AmbientCapabilities = [
          "CAP_NET_ADMIN"
          "CAP_SYS_MODULE"
        ];
        CapabilityBoundingSet = [
          "CAP_NET_ADMIN"
          "CAP_SYS_MODULE"
        ];
      };
    };
  };
}
