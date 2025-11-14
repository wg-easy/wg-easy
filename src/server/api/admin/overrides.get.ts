export default definePermissionEventHandler('admin', 'any', async () => {
  return {
    interface: {
      port: WG_OVERRIDE_ENV.PORT !== undefined,
      device: WG_OVERRIDE_ENV.DEVICE !== undefined,
      mtu: WG_OVERRIDE_ENV.MTU !== undefined,
      ipv4Cidr: WG_OVERRIDE_ENV.IPV4_CIDR !== undefined,
      ipv6Cidr: WG_OVERRIDE_ENV.IPV6_CIDR !== undefined,
    },
    userConfig: {
      host: WG_CLIENT_OVERRIDE_ENV.HOST !== undefined,
      port: WG_CLIENT_OVERRIDE_ENV.CLIENT_PORT !== undefined,
      defaultDns: WG_CLIENT_OVERRIDE_ENV.DEFAULT_DNS !== undefined,
      defaultAllowedIps: WG_CLIENT_OVERRIDE_ENV.DEFAULT_ALLOWED_IPS !== undefined,
      defaultMtu: WG_CLIENT_OVERRIDE_ENV.DEFAULT_MTU !== undefined,
      defaultPersistentKeepalive: WG_CLIENT_OVERRIDE_ENV.DEFAULT_PERSISTENT_KEEPALIVE !== undefined,
    },
    general: {
      sessionTimeout: WG_GENERAL_OVERRIDE_ENV.SESSION_TIMEOUT !== undefined,
      metricsPrometheus: WG_GENERAL_OVERRIDE_ENV.METRICS_PROMETHEUS !== undefined,
      metricsJson: WG_GENERAL_OVERRIDE_ENV.METRICS_JSON !== undefined,
    },
    hooks: {
      preUp: WG_HOOKS_OVERRIDE_ENV.PRE_UP !== undefined,
      postUp: WG_HOOKS_OVERRIDE_ENV.POST_UP !== undefined,
      preDown: WG_HOOKS_OVERRIDE_ENV.PRE_DOWN !== undefined,
      postDown: WG_HOOKS_OVERRIDE_ENV.POST_DOWN !== undefined,
    },
  };
});
