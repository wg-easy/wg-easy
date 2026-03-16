'use strict';
/**
 * tls-proxy.js — HTTPS termination proxy for wg-easy-ip-tls
 *
 * Reads cert/key from env-provided paths, forwards HTTPS -> HTTP to Nitro.
 * Supports hot-reload of certificates via server.setSecureContext().
 * Handles WebSocket upgrades (used by wg-easy UI).
 *
 * Env vars (required):
 *   CERT_FILE   - path to fullchain.pem
 *   KEY_FILE    - path to privkey.pem
 *   NITRO_PORT  - internal HTTP port (Nitro)
 *   PORT        - external HTTPS port to listen on
 */
const https = require('https');
const http  = require('http');
const net   = require('net');
const fs    = require('fs');

const CERT_FILE  = process.env.CERT_FILE;
const KEY_FILE   = process.env.KEY_FILE;
const NITRO_PORT = parseInt(process.env.NITRO_PORT, 10);
const PORT       = parseInt(process.env.PORT, 10);

if (!CERT_FILE || !KEY_FILE || !NITRO_PORT || !PORT) {
  console.error('[tls-proxy] Missing required env: CERT_FILE, KEY_FILE, NITRO_PORT, PORT');
  process.exit(1);
}

function loadCreds() {
  return {
    cert: fs.readFileSync(CERT_FILE),
    key:  fs.readFileSync(KEY_FILE),
  };
}

let creds;
try {
  creds = loadCreds();
} catch (e) {
  console.error('[tls-proxy] Failed to load certificates:', e.message);
  process.exit(1);
}

const server = https.createServer(creds, (req, res) => {
  const proxy = http.request(
    {
      hostname: '127.0.0.1',
      port:     NITRO_PORT,
      path:     req.url,
      method:   req.method,
      headers:  req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxy.on('error', (e) => {
    console.error('[tls-proxy] upstream error:', e.message);
    if (!res.headersSent) res.writeHead(502);
    res.end('Bad Gateway');
  });
  req.pipe(proxy);
});

// WebSocket upgrade support (wg-easy uses WS for live updates)
server.on('upgrade', (req, socket, head) => {
  const conn = net.connect(NITRO_PORT, '127.0.0.1', () => {
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    conn.write(`GET ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    if (head && head.length) conn.write(head);
    socket.pipe(conn);
    conn.pipe(socket);
  });
  conn.on('error', (e) => {
    console.error('[tls-proxy] ws upstream error:', e.message);
    socket.destroy();
  });
  socket.on('error', (e) => {
    console.error('[tls-proxy] ws client error:', e.message);
    conn.destroy();
  });
});

// Hot-reload certificates without restart when lego-renew.sh updates them
fs.watchFile(CERT_FILE, { interval: 60_000, persistent: true }, (curr, prev) => {
  if (curr.mtime.getTime() === prev.mtime.getTime()) return;
  try {
    server.setSecureContext(loadCreds());
    console.log('[tls-proxy] Certificate hot-reloaded at', curr.mtime.toISOString());
  } catch (e) {
    console.error('[tls-proxy] Failed to reload certificate:', e.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[tls-proxy] HTTPS listening on 0.0.0.0:${PORT} -> http://127.0.0.1:${NITRO_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT',  () => { server.close(); process.exit(0); });
