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
  allowedIPs: string[];
  serverAllowedIPs: string[] | null;
  oneTimeLink: OneTimeLink | null;
  /** ISO String */
  createdAt: string;
  /** ISO String */
  updatedAt: string;
  enabled: boolean;
  persistentKeepalive: number;
  mtu: number;
};

export type NewClient = Omit<Client, 'createdAt' | 'updatedAt'>;

/**
 * Interface for client-related database operations.
 * This interface provides methods for managing client data.
 */
export abstract class ClientRepository {
  abstract findAll(): Promise<DeepReadonly<Record<string, Client>>>;
  abstract findById(id: string): Promise<DeepReadonly<Client | undefined>>;

  abstract create(client: NewClient): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract toggle(id: string, enable: boolean): Promise<void>;
  abstract updateName(id: string, name: string): Promise<void>;
  abstract updateAddress4(id: string, address4: string): Promise<void>;
  abstract updateExpirationDate(
    id: string,
    expirationDate: string | null
  ): Promise<void>;
  abstract deleteOneTimeLink(id: string): Promise<void>;
  abstract createOneTimeLink(
    id: string,
    oneTimeLink: OneTimeLink
  ): Promise<void>;
}
