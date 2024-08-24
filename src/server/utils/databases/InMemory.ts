import InMemoryDP from '@/server/databases/providers/inmemory';

const provider = new InMemoryDP(); // TODO multiple providers

provider.connect().catch((err) => {
  console.error(err);
  provider.disconnect().catch((err) => {
    console.error(err);
  });
});

export default provider;
