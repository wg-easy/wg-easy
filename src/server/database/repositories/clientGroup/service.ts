import { and, count, eq, ne, sql } from 'drizzle-orm';

import { clientGroup } from './schema';
import type {
  ClientGroupCreateType,
  ClientGroupDetailsType,
  ClientGroupMemberType,
  ClientGroupResultType,
  ClientGroupUpdateType,
  ClientGroupWithCountType,
} from './types';
import { ClientGroupCreateSchema, ClientGroupUpdateSchema } from './types';

import { client } from '#db/schema';
import type { DBType } from '#db/sqlite';
import type { ID } from '#server/utils/types';

const CLIENT_GROUP_NAME_CONFLICT_MESSAGE = 'Client group already exists';

export function isClientGroupNameConflictError(error: unknown) {
  let currentError = error;

  while (currentError instanceof Error) {
    const code = (currentError as { code?: unknown }).code;
    const message = currentError.message;

    const isSqliteConstraint =
      code === 'SQLITE_CONSTRAINT' ||
      code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      message.includes('SQLITE_CONSTRAINT') ||
      message.includes('UNIQUE constraint failed');

    if (
      isSqliteConstraint &&
      (message.includes('client_groups_table.name') ||
        message.includes('client_groups_table_name_unique'))
    ) {
      return true;
    }

    currentError = (currentError as { cause?: unknown }).cause;
  }

  return false;
}

function throwClientGroupNameConflict(error: unknown): never {
  if (isClientGroupNameConflictError(error)) {
    throw new Error(CLIENT_GROUP_NAME_CONFLICT_MESSAGE);
  }

  throw error;
}

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

  #toClientGroupMember(row: {
    id: number;
    name: string;
    enabled: boolean;
    ipv4Address: string;
    ipv6Address: string;
    createdAt: string;
    updatedAt: string;
  }): ClientGroupMemberType {
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
    const existingGroup = await this.#db.query.clientGroup
      .findFirst({ where: eq(clientGroup.name, parsedData.name) })
      .execute();

    if (existingGroup) {
      throw new Error('Client group already exists');
    }

    const [createdGroup] = await this.#db
      .insert(clientGroup)
      .values(parsedData)
      .returning()
      .execute()
      .catch(throwClientGroupNameConflict);

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

  async getDetails(id: ID): Promise<ClientGroupDetailsType | undefined> {
    const group = await this.get(id);

    if (!group) {
      return undefined;
    }

    const clients = await this.#db.query.client
      .findMany({
        where: eq(client.groupId, id),
        columns: {
          id: true,
          name: true,
          enabled: true,
          ipv4Address: true,
          ipv6Address: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: (t, { asc }) => asc(t.name),
      })
      .execute();

    return {
      ...group,
      clients: clients.map((member) => this.#toClientGroupMember(member)),
    };
  }

  async update(id: ID, data: ClientGroupUpdateType) {
    const parsedData = ClientGroupUpdateSchema.parse(data);
    const existingGroup = await this.#db.query.clientGroup
      .findFirst({
        where: and(
          eq(clientGroup.name, parsedData.name),
          ne(clientGroup.id, id)
        ),
      })
      .execute();

    if (existingGroup) {
      throw new Error('Client group already exists');
    }

    const [updatedGroup] = await this.#db
      .update(clientGroup)
      .set(parsedData)
      .where(eq(clientGroup.id, id))
      .returning()
      .execute()
      .catch(throwClientGroupNameConflict);

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

  async getClientGroupId(clientId: ID) {
    const txClient = await this.#db.query.client
      .findFirst({
        where: eq(client.id, clientId),
        columns: { groupId: true },
      })
      .execute();

    if (!txClient) {
      throw new Error('Client not found');
    }

    return txClient.groupId;
  }
}
