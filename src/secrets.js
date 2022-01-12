const fs = require('fs');

const dockerSecret = {};

dockerSecret.read = function read(secret) {
  try {
    return fs.readFileSync(secret, 'utf8');
  } catch(err) {
    if (err.code !== 'ENOENT') {
        console.error(`An error occurred while trying to read the secret: ${secret}. Err: ${err}`);
    } else {
        console.debug(`Could not find the secret, probably not running in swarm mode: ${secret}. Err: ${err}`);
    }    
    return false;
  }
};

module.exports = dockerSecret;