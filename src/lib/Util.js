'use strict';

const childProcess = require('child_process');

module.exports = class Util {

  static requireSession(req, res, next) {
    if (req.session && req.session.authenticated) {
      return next();
    }

    return res.status(401).json({
      error: 'Not Logged In',
    });
  }

  static promisify(fn) {
    return function(req, res) {
      Promise.resolve().then(async () => fn(req, res))
        .then(result => {
          if (res.headersSent) return;

          if (typeof result === 'undefined') {
            return res
              .status(204)
              .end();
          }

          return res
            .status(200)
            .json(result);
        })
        .catch(error => {
          if (typeof error === 'string') {
            error = new Error(error);
          }

          return res
            .status(error.statusCode || 500)
            .json({
              error: error.message || error.toString(),
              stack: error.stack,
            });
        });
    };
  }

  static async exec(cmd) {
    if (process.platform !== 'linux') {
      return '';
    }

    return new Promise((resolve, reject) => {
      childProcess.exec(cmd, (err, stdout) => {
        if (err) return reject(err);
        return resolve(stdout);
      });
    });
  }

};
