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

// Handle terminate signal
process.on('SIGTERM', async() => {
  console.log('SIGTERM signal received.');
  await WireGuard.Shutdown();
  process.exit(0);
});

// Handle interupt signal
process.on('SIGINT', () => {
  console.log('SIGINT signal received.');
});