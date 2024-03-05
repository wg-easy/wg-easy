'use strict';

require('./services/Server');

const WireGuard = require('./services/WireGuard');

WireGuard.getConfig()
  .catch((err) => {
  // eslint-disable-next-line no-console
    console.error(err);

    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
