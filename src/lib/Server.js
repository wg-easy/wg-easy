'use strict';

const path = require('path');

const express = require('express');
const expressSession = require('express-session');
const debug = require('debug')('Server');

const Util = require('./Util');
const ServerError = require('./ServerError');
const WireGuard = require('../services/WireGuard');

// Needed to open users.json file
const fs = require('fs').promises;

// Getting enviroment variables
const {
  PORT,
  RELEASE,
  USERS_PATH
} = require('../config');

module.exports = class Server {

  constructor() {
    // Express
    this.app = express()
      .disable('etag')
      .use('/', express.static(path.join(__dirname, '..', 'www')))
      .use(express.json())
      .use(expressSession({
        secret: String(Math.random()),
        resave: true,
        saveUninitialized: true,
      }))

      .get('/api/release', (Util.promisify(async () => {
        return RELEASE;
      })))

      // Get session data
      .get('/api/session', Util.promisify(async req => {
        const authenticated = !!(req.session && req.session.authenticated);

        return {
          authenticated,
        };
      }))
      .post('/api/session', Util.promisify(async req => {
        // Authentication
        const {
          username,
          password,
        } = req.body;
        
        // Check if the credentials are correct
        const usersJson = await fs.readFile(path.join(USERS_PATH, 'users.json'), 'utf8');
        const users = JSON.parse(usersJson);
        const user = users.find(findUser => findUser.username === username);

        if (typeof user !== 'object') {
          throw new ServerError('Wrong Username', 401);
        }

        if (user.password !== password) {
          throw new ServerError('Wrong Password', 401);
        }

        req.session.authenticated = true;
        req.session.username = user.username;
        req.session.save();

        debug(`New Session: ${req.session.id}`);
      }))

      .use((req, res, next) => {
     
        if (req.session && req.session.authenticated) {
          return next();
        }

        return res.status(401).json({
          error: 'Not Logged In',
        });
      })
      .delete('/api/session', Util.promisify(async req => {
        const sessionId = req.session.id;

        req.session.destroy();

        debug(`Deleted Session: ${sessionId}`);
      }))
      .post('/api/updatePassword', Util.promisify(async req => {
        const {
          newPassword,
          checkPassword,
        } = req.body;
        const username = req.session.username;

        const usersJson = await fs.readFile(path.join(USERS_PATH, 'users.json'), 'utf8');
        const users = JSON.parse(usersJson);
        const user = users.find(findUser => findUser.username === username);

        if (typeof user !== 'object') {
          throw new ServerError('This session.username does not exists', 401);
        }

        if (newPassword !== checkPassword) {
          throw new ServerError("Passwords don't match", 401);
        }

        user.password = newPassword;
        await fs.writeFile(path.join(USERS_PATH, 'users.json'), JSON.stringify(users, false, 2), {
          mode: 0o660,
        });
        
      }))
      // WireGuard
      .get('/api/wireguard/client', Util.promisify(async req => {
        return WireGuard.getClients();
      }))
      .get('/api/wireguard/client/:clientId/qrcode.svg', Util.promisify(async (req, res) => {
        const { clientId } = req.params;
        const svg = await WireGuard.getClientQRCodeSVG({ clientId });
        res.header('Content-Type', 'image/svg+xml');
        res.send(svg);
      }))
      .get('/api/wireguard/client/:clientId/configuration', Util.promisify(async (req, res) => {
        const { clientId } = req.params;
        const client = await WireGuard.getClient({ clientId });
        const config = await WireGuard.getClientConfiguration({ clientId });
        const configName = client.name
          .replace(/[^a-zA-Z0-9_=+.-]/g, '-')
          .replace(/(-{2,}|-$)/g, '-')
          .replace(/-$/, '')
          .substring(0, 32);
        res.header('Content-Disposition', `attachment; filename="${configName || clientId}.conf"`);
        res.header('Content-Type', 'text/plain');
        res.send(config);
      }))
      .post('/api/wireguard/client', Util.promisify(async req => {
        const { name } = req.body;
        return WireGuard.createClient({ name });
      }))
      .delete('/api/wireguard/client/:clientId', Util.promisify(async req => {
        const { clientId } = req.params;
        return WireGuard.deleteClient({ clientId });
      }))
      .post('/api/wireguard/client/:clientId/enable', Util.promisify(async req => {
        const { clientId } = req.params;
        return WireGuard.enableClient({ clientId });
      }))
      .post('/api/wireguard/client/:clientId/disable', Util.promisify(async req => {
        const { clientId } = req.params;
        return WireGuard.disableClient({ clientId });
      }))
      .put('/api/wireguard/client/:clientId/name', Util.promisify(async req => {
        const { clientId } = req.params;
        const { name } = req.body;
        return WireGuard.updateClientName({ clientId, name });
      }))
      .put('/api/wireguard/client/:clientId/address', Util.promisify(async req => {
        const { clientId } = req.params;
        const { address } = req.body;
        return WireGuard.updateClientAddress({ clientId, address });
      }))

      .listen(PORT, () => {
        debug(`Listening on http://0.0.0.0:${PORT}`);
      });
  }

};
