import { count, eq, sql } from 'drizzle-orm';

import { clientGroup } from './schema';
import type {
  ClientGroupCreateType,
  ClientGroupResultType,
  ClientGroupUpdateType,
  ClientGroupWithCountType,
} from './types';
import { ClientGroupCreateSchema, ClientGroupUpdateSchema } from './types';

import { client } from '#db/schema';
import type { DBType } from '#db/sqlite';
import type { ID } from '#server/utils/types';

function createPreparedStatement(db: DBType) {
  return {
    findById: db.query.clientGroup
      .findFirst({ where: eq(clientGroup.id, sql.placeholder('id')) })
      .prepare(),
    delete: db
      .delete(clientGroup)
      .where(eq(clientGroup.id, sql.placeholder('id')))
      .prepare(),
    unassignClient: db
      .update(client)
      .set({ groupId: null })
      .where(eq(client.id, sql.placeholder('clientId')))
      .prepare(),
  };
}

export class ClientGroupService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  #toClientGroup(row: {
    id: number;
    name: string;
    description: string | null;
    allowedIps: string[] | null;
    dns: string[] | null;
    firewallIps: string[] | null;
    createdAt: string;
    updatedAt: string;
  }): ClientGroupResultType {
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  #toClientGroupWithCount(row: {
    id: number;
    name: string;
    description: string | null;
    allowedIps: string[] | null;
    dns: string[] | null;
    firewallIps: string[] | null;
    createdAt: string;
    updatedAt: string;
    assignedClientCount: number;
  }): ClientGroupWithCountType {
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  #withAssignedClientCount() {
    return {
      id: clientGroup.id,
      name: clientGroup.name,
      description: clientGroup.description,
      allowedIps: clientGroup.allowedIps,
      dns: clientGroup.dns,
      firewallIps: clientGroup.firewallIps,
      createdAt: clientGroup.createdAt,
      updatedAt: clientGroup.updatedAt,
      assignedClientCount: count(client.id),
    };
  }

  async create(data: ClientGroupCreateType) {
    const parsedData = ClientGroupCreateSchema.parse(data);
    const [createdGroup] = await this.#db
      .insert(clientGroup)
      .values(parsedData)
      .returning()
      .execute();

    if (!createdGroup) {
      throw new Error('Client group was not created');
    }

    return this.#toClientGroup(createdGroup);
  }

  async list(): Promise<ClientGroupWithCountType[]> {
    const groups = await this.#db
      .select(this.#withAssignedClientCount())
      .from(clientGroup)
      .leftJoin(client, eq(client.groupId, clientGroup.id))
      .groupBy(clientGroup.id)
      .orderBy(clientGroup.name)
      .execute();

    return groups.map((group) => this.#toClientGroupWithCount(group));
  }

  async get(id: ID): Promise<ClientGroupWithCountType | undefined> {
    const [group] = await this.#db
      .select(this.#withAssignedClientCount())
      .from(clientGroup)
      .leftJoin(client, eq(client.groupId, clientGroup.id))
      .where(eq(clientGroup.id, id))
      .groupBy(clientGroup.id)
      .execute();

    return group ? this.#toClientGroupWithCount(group) : undefined;
  }

  async update(id: ID, data: ClientGroupUpdateType) {
    const parsedData = ClientGroupUpdateSchema.parse(data);
    const [updatedGroup] = await this.#db
      .update(clientGroup)
      .set(parsedData)
      .where(eq(clientGroup.id, id))
      .returning()
      .execute();

    if (!updatedGroup) {
      throw new Error('Client group not found');
    }

    return this.#toClientGroup(updatedGroup);
  }

  delete(id: ID) {
    return this.#statements.delete.execute({ id });
  }

  async assignClient(clientId: ID, groupId: ID) {
    return this.#db.transaction(async (tx) => {
      const txClient = await tx.query.client
        .findFirst({ where: eq(client.id, clientId) })
        .execute();

      if (!txClient) {
        throw new Error('Client not found');
      }

      const txGroup = await tx.query.clientGroup
        .findFirst({ where: eq(clientGroup.id, groupId) })
        .execute();

      if (!txGroup) {
        throw new Error('Client group not found');
      }

      await tx
        .update(client)
        .set({ groupId })
        .where(eq(client.id, clientId))
        .execute();
    });
  }

  unassignClient(clientId: ID) {
    return this.#statements.unassignClient.execute({ clientId });
  }

  async countAssignedClients(groupId: ID) {
    return this.#db.$count(client, eq(client.groupId, groupId));
  }
}
