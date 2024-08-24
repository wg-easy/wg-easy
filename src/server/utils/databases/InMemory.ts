import InMemoryDP from '@/server/databases/providers/inmemory';

const provider = new InMemoryDP(); // TODO manage multiple providers

provider.connect().catch((err) => {
  console.error(err);
  provider
    .disconnect()
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      process.exit(1);
    });
});

export default provider;
