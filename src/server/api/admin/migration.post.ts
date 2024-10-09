// TODO: check what are missing
type Client = {
  id: string;
  name: string;
  address: string;
  privateKey: string;
  publicKey: string;
  preSharedKey: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
};

type OldConfig = {
  server: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
  clients: Record<string, Client>;
};

export default defineEventHandler(async (event) => {
  const { file } = await readValidatedBody(event, validateZod(fileType, event));
  const file_ = JSON.parse(file) as OldConfig;

  // TODO: handle migration
  console.log('file_', file_);

  return { success: true };
});
