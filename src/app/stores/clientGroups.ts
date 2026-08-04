import { defineStore } from 'pinia';

import type {
  ClientGroupMembership,
  EffectivePolicyField,
} from '../utils/clientGroups';

export type ClientGroupListItem = {
  id: number;
  name: string;
  description: string | null;
  allowedIps: string[] | null;
  dns: string[] | null;
  firewallIps: string[] | null;
  assignedClientCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type ClientGroupDetails = ClientGroupListItem & {
  clients: {
    id: number;
    name: string;
    enabled: boolean;
    ipv4Address: string;
    ipv6Address: string;
    createdAt: string | Date;
    updatedAt: string | Date;
  }[];
};

export type ClientEffectivePolicy = {
  allowedIps: EffectivePolicyField;
  dns: EffectivePolicyField;
  firewallIps: EffectivePolicyField;
};

export const useClientGroupsStore = defineStore('ClientGroups', () => {
  const groups = ref<ClientGroupListItem[] | null>(null);
  const membership = ref<ClientGroupMembership[] | null>(null);

  async function refresh() {
    groups.value = await $fetch<ClientGroupListItem[]>('/api/client-group');
  }

  async function refreshMembership() {
    membership.value = await $fetch<ClientGroupMembership[]>(
      '/api/client-group/membership'
    );
  }

  async function getDetails(groupId: number | string) {
    return await $fetch<ClientGroupDetails>(`/api/client-group/${groupId}`);
  }

  async function createGroup(body: {
    name: string;
    description: string | null;
    allowedIps: string[] | null;
    dns: string[] | null;
    firewallIps: string[] | null;
  }) {
    return await $fetch('/api/client-group', {
      method: 'post',
      body,
    });
  }

  async function updateGroup(
    groupId: number | string,
    body: {
      name: string;
      description: string | null;
      allowedIps: string[] | null;
      dns: string[] | null;
      firewallIps: string[] | null;
    }
  ) {
    return await $fetch(`/api/client-group/${groupId}`, {
      method: 'post',
      body,
    });
  }

  async function deleteGroup(groupId: number | string) {
    return await $fetch(`/api/client-group/${groupId}`, {
      method: 'delete',
    });
  }

  async function assignClient(clientId: number, groupId: number) {
    return await $fetch(`/api/client/${clientId}/groups/${groupId}`, {
      method: 'post',
    });
  }

  async function removeClient(clientId: number, groupId: number) {
    return await $fetch(`/api/client/${clientId}/groups/${groupId}`, {
      method: 'delete',
    });
  }

  async function getClientGroups(clientId: number) {
    return await $fetch<ClientGroupMembership[]>(
      `/api/client/${clientId}/groups`
    );
  }

  async function setClientGroups(clientId: number, groupIds: number[]) {
    return await $fetch(`/api/client/${clientId}/groups`, {
      method: 'put',
      body: { groupIds },
    });
  }

  async function getClientEffectivePolicy(clientId: number) {
    return await $fetch<ClientEffectivePolicy>(
      `/api/client/${clientId}/effective-policy`
    );
  }

  return {
    groups,
    membership,
    refresh,
    refreshMembership,
    getDetails,
    createGroup,
    updateGroup,
    deleteGroup,
    assignClient,
    removeClient,
    getClientGroups,
    setClientGroups,
    getClientEffectivePolicy,
  };
});
