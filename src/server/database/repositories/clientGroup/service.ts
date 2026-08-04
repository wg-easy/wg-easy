import { and, count, eq, inArray, ne, sql } from 'drizzle-orm';

import { clientGroup, clientGroupMembership } from './schema';
import type {
  ClientGroupCreateType,
  ClientGroupDetailsType,
  ClientGroupEdgeType,
  ClientGroupMemberType,
  ClientGroupMembershipType,
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

function normalizeGroupPolicy<T extends string[] | null>(value: T) {
  return value && value.length === 0 ? null : value;
}

function normalizeGroupData<T extends ClientGroupCreateType>(data: T): T {
  return {
    ...data,
    allowedIps: normalizeGroupPolicy(data.allowedIps),
    dns: normalizeGroupPolicy(data.dns),
    firewallIps: normalizeGroupPolicy(data.firewallIps),
  };
}

function assertUniqueGroupIds(groupIds: ID[]) {
  if (new Set(groupIds).size !== groupIds.length) {
    throw new Error('Duplicate client group');
  }
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
      allowedIps: normalizeGroupPolicy(row.allowedIps),
      dns: normalizeGroupPolicy(row.dns),
      firewallIps: normalizeGroupPolicy(row.firewallIps),
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
      ...this.#toClientGroup(row),
      assignedClientCount: row.assignedClientCount,
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
      assignedClientCount: count(clientGroupMembership.clientId),
    };
  }

  async create(data: ClientGroupCreateType) {
    const parsedData = normalizeGroupData(ClientGroupCreateSchema.parse(data));
    const existingGroup = await this.#db.query.clientGroup
      .findFirst({ where: eq(clientGroup.name, parsedData.name) })
      .execute();

    if (existingGroup) {
      throw new Error(CLIENT_GROUP_NAME_CONFLICT_MESSAGE);
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
      .leftJoin(
        clientGroupMembership,
        eq(clientGroupMembership.groupId, clientGroup.id)
      )
      .groupBy(clientGroup.id)
      .orderBy(clientGroup.name)
      .execute();

    return groups.map((group) => this.#toClientGroupWithCount(group));
  }

  async get(id: ID): Promise<ClientGroupWithCountType | undefined> {
    const [group] = await this.#db
      .select(this.#withAssignedClientCount())
      .from(clientGroup)
      .leftJoin(
        clientGroupMembership,
        eq(clientGroupMembership.groupId, clientGroup.id)
      )
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

    const clients = await this.#db
      .select({
        id: client.id,
        name: client.name,
        enabled: client.enabled,
        ipv4Address: client.ipv4Address,
        ipv6Address: client.ipv6Address,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      })
      .from(clientGroupMembership)
      .innerJoin(client, eq(client.id, clientGroupMembership.clientId))
      .where(eq(clientGroupMembership.groupId, id))
      .orderBy(clientGroupMembership.position, client.name)
      .execute();

    return {
      ...group,
      clients: clients.map((member) => this.#toClientGroupMember(member)),
    };
  }

  async update(id: ID, data: ClientGroupUpdateType) {
    const parsedData = normalizeGroupData(ClientGroupUpdateSchema.parse(data));
    const existingGroup = await this.#db.query.clientGroup
      .findFirst({
        where: and(
          eq(clientGroup.name, parsedData.name),
          ne(clientGroup.id, id)
        ),
      })
      .execute();

    if (existingGroup) {
      throw new Error(CLIENT_GROUP_NAME_CONFLICT_MESSAGE);
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

      const existingMembership = await tx.query.clientGroupMembership
        .findFirst({
          where: and(
            eq(clientGroupMembership.clientId, clientId),
            eq(clientGroupMembership.groupId, groupId)
          ),
        })
        .execute();

      if (existingMembership) {
        return;
      }

      const memberships = await tx.query.clientGroupMembership
        .findMany({
          where: eq(clientGroupMembership.clientId, clientId),
          columns: { position: true },
        })
        .execute();
      const nextPosition =
        memberships.reduce(
          (maxPosition, membership) =>
            Math.max(maxPosition, membership.position),
          -1
        ) + 1;

      await tx
        .insert(clientGroupMembership)
        .values({ clientId, groupId, position: nextPosition })
        .execute();
    });
  }

  async removeClient(clientId: ID, groupId: ID) {
    return this.#db
      .delete(clientGroupMembership)
      .where(
        and(
          eq(clientGroupMembership.clientId, clientId),
          eq(clientGroupMembership.groupId, groupId)
        )
      )
      .execute();
  }

  async setClientGroups(clientId: ID, groupIds: ID[]) {
    assertUniqueGroupIds(groupIds);

    return this.#db.transaction(async (tx) => {
      const txClient = await tx.query.client
        .findFirst({ where: eq(client.id, clientId) })
        .execute();

      if (!txClient) {
        throw new Error('Client not found');
      }

      if (groupIds.length > 0) {
        const existingGroups = await tx.query.clientGroup
          .findMany({
            where: inArray(clientGroup.id, groupIds),
            columns: { id: true },
          })
          .execute();
        const existingGroupIds = new Set(
          existingGroups.map((group) => group.id)
        );
        const missingGroupId = groupIds.find(
          (groupId) => !existingGroupIds.has(groupId)
        );

        if (missingGroupId) {
          throw new Error('Client group not found');
        }
      }

      await tx
        .delete(clientGroupMembership)
        .where(eq(clientGroupMembership.clientId, clientId))
        .execute();

      if (groupIds.length > 0) {
        await tx
          .insert(clientGroupMembership)
          .values(
            groupIds.map((groupId, position) => ({
              clientId,
              groupId,
              position,
            }))
          )
          .execute();
      }
    });
  }

  async countAssignedClients(groupId: ID) {
    return this.#db.$count(
      clientGroupMembership,
      eq(clientGroupMembership.groupId, groupId)
    );
  }

  async listMembership(): Promise<ClientGroupMembershipType[]> {
    const rows = await this.#db
      .select({
        clientId: clientGroupMembership.clientId,
        groupId: clientGroupMembership.groupId,
        position: clientGroupMembership.position,
      })
      .from(clientGroupMembership)
      .innerJoin(client, eq(client.id, clientGroupMembership.clientId))
      .orderBy(client.name, clientGroupMembership.position)
      .execute();

    return rows;
  }

  async getClientGroups(clientId: ID): Promise<ClientGroupEdgeType[]> {
    const txClient = await this.#db.query.client
      .findFirst({
        where: eq(client.id, clientId),
        columns: { id: true },
      })
      .execute();

    if (!txClient) {
      throw new Error('Client not found');
    }

    const rows = await this.#db
      .select({
        clientId: clientGroupMembership.clientId,
        groupId: clientGroupMembership.groupId,
        position: clientGroupMembership.position,
        groupName: clientGroup.name,
      })
      .from(clientGroupMembership)
      .innerJoin(clientGroup, eq(clientGroup.id, clientGroupMembership.groupId))
      .where(eq(clientGroupMembership.clientId, clientId))
      .orderBy(clientGroupMembership.position, clientGroup.name)
      .execute();

    return rows;
  }

  async getGroupsForClient(clientId: ID): Promise<ClientGroupResultType[]> {
    const rows = await this.#db
      .select({
        id: clientGroup.id,
        name: clientGroup.name,
        description: clientGroup.description,
        allowedIps: clientGroup.allowedIps,
        dns: clientGroup.dns,
        firewallIps: clientGroup.firewallIps,
        createdAt: clientGroup.createdAt,
        updatedAt: clientGroup.updatedAt,
        position: clientGroupMembership.position,
      })
      .from(clientGroupMembership)
      .innerJoin(clientGroup, eq(clientGroup.id, clientGroupMembership.groupId))
      .where(eq(clientGroupMembership.clientId, clientId))
      .orderBy(clientGroupMembership.position, clientGroup.name)
      .execute();

    return rows.map((row) => this.#toClientGroup(row));
  }
}
