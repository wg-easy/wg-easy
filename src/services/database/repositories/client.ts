export type OneTimeLink = {
  oneTimeLink: string;
  expiresAt: Date;
};

export type Client = {
  id: string;
  name: string;
  address: string;
  privateKey: string;
  publicKey: string;
  preSharedKey: string;
  expiresAt: Date | null;
  endpoint: string | null;
  allowedIPs: string[];
  oneTimeLink: OneTimeLink | null;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
  persistentKeepalive: number;
};

export type NewClient = Omit<Client, 'createdAt' | 'updatedAt'>;

/**
 * Interface for client-related database operations.
 * This interface provides methods for managing client data.
 */
export interface ClientRepository {
  getClients(): Promise<Record<string, Client>>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: NewClient): Promise<void>;
  deleteClient(id: string): Promise<void>;
  toggleClient(id: string, enable: boolean): Promise<void>;
  updateClientName(id: string, name: string): Promise<void>;
  updateClientAddress(id: string, address: string): Promise<void>;
  updateClientExpirationDate(
    id: string,
    expirationDate: Date | null
  ): Promise<void>;
  deleteOneTimeLink(id: string): Promise<void>;
  createOneTimeLink(id: string, oneTimeLink: OneTimeLink): Promise<void>;
}
