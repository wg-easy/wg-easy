'use strict';

const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Koa = require('koa');
const Router = require('@koa/router');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');

const debug = require('debug')('Server');

const ServerError = require('./ServerError');
const WireGuard = require('../services/WireGuard');

const {
  PORT, WEBUI_HOST, RELEASE, PASSWORD,
} = require('../config');

module.exports = class Server {

  constructor() {
    this.app = new Koa();
    this.router = new Router();

    this.app.keys = [crypto.randomBytes(256).toString('hex')];

    this.app
      .use(serve(path.join(__dirname, '..', 'www')))
      .use(bodyParser())
      .use(session(this.app))
      .use(this.router.routes())
      .use(this.router.allowedMethods());

    this.router
      .get('/api/release', async (ctx) => {
        ctx.body = RELEASE;
      })

    // Authentication
      .get('/api/session', async (ctx) => {
        const requiresPassword = !!process.env.PASSWORD;
        const authenticated = requiresPassword ? !!(ctx.session && ctx.session.authenticated) : true;

        ctx.body = {
          requiresPassword,
          authenticated,
        };
      })
      .post('/api/session', async (ctx) => {
        const { password } = ctx.request.body;

        if (typeof password !== 'string') {
          throw new ServerError('Missing: Password', 401);
        }

        if (password !== PASSWORD) {
          throw new ServerError('Incorrect Password', 401);
        }

        ctx.session.authenticated = true;

        debug(`New Session: ${ctx.session.id}`);
      })

    // WireGuard
      .use(async (ctx, next) => {
        if (!PASSWORD) {
          return next();
        }

        if (ctx.session && ctx.session.authenticated) {
          return next();
        }

        if (ctx.path.startsWith('/api/') && ctx.headers['authorization']) {
          if (bcrypt.compareSync(ctx.headers['authorization'], bcrypt.hashSync(PASSWORD, 10))) {
            return next();
          }
          ctx.status = 401;
          ctx.body = {
            error: 'Incorrect Password',
          };
          return;
        }

        ctx.status = 401;
        ctx.body = {
          error: 'Not Logged In',
        };
      })
      .delete('/api/session', async (ctx) => {
        const sessionId = ctx.session.id;

        ctx.session = null;

        debug(`Deleted Session: ${sessionId}`);
      })
      .get('/api/wireguard/client', async (ctx) => {
        ctx.body = await WireGuard.getClients();
      })
      .get('/api/wireguard/client/:clientId/qrcode.svg', async (ctx) => {
        const { clientId } = ctx.params;
        const svg = await WireGuard.getClientQRCodeSVG({ clientId });
        ctx.set('Content-Type', 'image/svg+xml');
        ctx.body = svg;
      })
      .get('/api/wireguard/client/:clientId/configuration', async (ctx) => {
        const { clientId } = ctx.params;
        const client = await WireGuard.getClient({ clientId });
        const config = await WireGuard.getClientConfiguration({ clientId });
        const configName = client.name
          .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
          .replace(/(-{2,}|-$)/g, '-')
          .replace(/-$/, '')
          .substring(0, 32);
        ctx.set('Content-Disposition', `attachment; filename="${configName || clientId}.conf"`);
        ctx.set('Content-Type', 'text/plain');
        ctx.body = config;
      })
      .post('/api/wireguard/client', async (ctx) => {
        const { name } = ctx.request.body;
        ctx.body = await WireGuard.createClient({ name });
      })
      .delete('/api/wireguard/client/:clientId', async (ctx) => {
        const { clientId } = ctx.params;
        ctx.body = await WireGuard.deleteClient({ clientId });
      })
      .post('/api/wireguard/client/:clientId/enable', async (ctx) => {
        const { clientId } = ctx.params;
        if (clientId === '__proto__' || clientId === 'constructor' || clientId === 'prototype') {
          ctx.status = 403;
          return;
        }
        ctx.body = await WireGuard.enableClient({ clientId });
      })
      .post('/api/wireguard/client/:clientId/disable', async (ctx) => {
        const { clientId } = ctx.params;
        if (clientId === '__proto__' || clientId === 'constructor' || clientId === 'prototype') {
          ctx.status = 403;
          return;
        }
        ctx.body = await WireGuard.disableClient({ clientId });
      })
      .put('/api/wireguard/client/:clientId/name', async (ctx) => {
        const { clientId } = ctx.params;
        if (clientId === '__proto__' || clientId === 'constructor' || clientId === 'prototype') {
          ctx.status = 403;
          return;
        }
        const { name } = ctx.request.body;
        ctx.body = await WireGuard.updateClientName({ clientId, name });
      })
      .put('/api/wireguard/client/:clientId/address', async (ctx) => {
        const { clientId } = ctx.params;
        if (clientId === '__proto__' || clientId === 'constructor' || clientId === 'prototype') {
          ctx.status = 403;
          return;
        }
        const { address } = ctx.request.body;
        ctx.body = await WireGuard.updateClientAddress({ clientId, address });
      });

    this.app.listen(PORT, WEBUI_HOST, () => {
      debug(`Listening on http://${WEBUI_HOST}:${PORT}`);
    });
  }

};
