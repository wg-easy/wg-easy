import type { DeepReadonly } from 'vue';

export type OneTimeLink = {
  oneTimeLink: string;
  /** ISO String */
  expiresAt: string;
};

export type Client = {
  id: string;
  name: string;
  address4: string;
  address6: string;
  privateKey: string;
  publicKey: string;
  preSharedKey: string;
  /** ISO String */
  expiresAt: string | null;
  allowedIps: string[];
  serverAllowedIPs: string[];
  oneTimeLink: OneTimeLink | null;
  /** ISO String */
  createdAt: string;
  /** ISO String */
  updatedAt: string;
  enabled: boolean;
  persistentKeepalive: number;
  mtu: number;
};

export type CreateClient = Omit<Client, 'createdAt' | 'updatedAt'>;
export type UpdateClient = Omit<
  Client,
  | 'createdAt'
  | 'updatedAt'
  | 'id'
  | 'oneTimeLink'
  | 'privateKey'
  | 'publicKey'
  | 'preSharedKey'
>;

/**
 * Interface for client-related database operations.
 * This interface provides methods for managing client data.
 */
export abstract class ClientRepository {
  abstract findAll(): Promise<DeepReadonly<Record<string, Client>>>;
  abstract findById(id: string): Promise<DeepReadonly<Client | undefined>>;

  abstract create(client: CreateClient): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract toggle(id: string, enable: boolean): Promise<void>;
  abstract deleteOneTimeLink(id: string): Promise<void>;
  abstract createOneTimeLink(
    id: string,
    oneTimeLink: OneTimeLink
  ): Promise<void>;

  abstract update(id: string, client: UpdateClient): Promise<void>;
}
