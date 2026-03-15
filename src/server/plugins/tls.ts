/**
 * tls.ts — Nitro server plugin for Let's Encrypt IP certificate support
 *
 * When LEGO_ENABLED=true and INSECURE!=true, this plugin:
 * - Verifies certificate files exist at startup (placed by entrypoint.sh via lego)
 * - Watches the cert file for renewal updates and logs them
 * - Nitro's HTTPS is activated via the `https` key in nuxt.config.ts nitro block
 */
import fs from 'node:fs';

const CERT_PATH = '/root/cert/ip/fullchain.pem';
const KEY_PATH = '/root/cert/ip/privkey.pem';

export default defineNitroPlugin((nitroApp) => {
  const legoEnabled = process.env.LEGO_ENABLED === 'true';
  const insecure = process.env.INSECURE === 'true';

  if (!legoEnabled || insecure) {
    console.log('[tls] Running in HTTP mode (LEGO_ENABLED != true or INSECURE=true)');
    return;
  }

  // Verify certs exist — entrypoint.sh should have placed them before Node starts
  if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
    console.error(
      '[tls] ERROR: Certificate files not found!\n' +
      `Expected: ${CERT_PATH}\n` +
      `${KEY_PATH}\n` +
      ' Make sure LEGO_IP and LEGO_EMAIL are set correctly.'
    );
    // Don't crash — Nitro will still start but without TLS if cert is missing
    return;
  }

  // Read cert info for logging
  try {
    const stat = fs.statSync(CERT_PATH);
    console.log(`[tls] Certificate loaded: ${CERT_PATH} (modified: ${stat.mtime.toISOString()})`);
    console.log(`[tls] HTTPS enabled for IP: ${process.env.LEGO_IP || process.env.HOST}`);
  } catch {
    // Non-fatal
  }

  // Watch for cert renewal (lego-renew.sh replaces symlink targets every ~5 days)
  fs.watchFile(CERT_PATH, { interval: 60_000, persistent: false }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log(
        `[tls] Certificate renewed at ${curr.mtime.toISOString()} — ` +
        'new connections will use the updated cert automatically.'
      );
    }
  });

  nitroApp.hooks.hook('close', () => {
    fs.unwatchFile(CERT_PATH);
  });
});
