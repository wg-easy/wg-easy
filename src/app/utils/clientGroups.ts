export type GroupPolicyValue = string[] | null;

export type ClientGroupForm = {
  name: string;
  description: string;
  allowedIps: GroupPolicyValue;
  dns: GroupPolicyValue;
  firewallIps: GroupPolicyValue;
};

export type ClientGroupPayload = {
  name: string;
  description: string | null;
  allowedIps: GroupPolicyValue;
  dns: GroupPolicyValue;
  firewallIps: GroupPolicyValue;
};

export type ClientGroupSummarySource = {
  allowedIps: GroupPolicyValue;
  dns: GroupPolicyValue;
  firewallIps: GroupPolicyValue;
};

export type ClientGroupPolicyKey = keyof ClientGroupSummarySource;

export type ClientGroupPolicySource = ClientGroupSummarySource & {
  id: number;
  name: string;
};

export type ClientGroupMembership = {
  clientId: number;
  groupId: number;
  position: number;
};

export type ClientGroupMembershipChange = {
  changed: boolean;
  groupIds: number[];
};

export type ClientGroupMembershipActions = {
  setGroups: (clientId: number, groupIds: number[]) => Promise<unknown>;
};

export type ClientGroupPolicyDraftState = {
  value: GroupPolicyValue;
  draft: string[] | null;
};

export type EffectivePolicyField = {
  value: string[];
  source: 'client' | 'groups' | 'global';
  groups: { id: number; name: string }[];
};

export function createClientGroupForm(): ClientGroupForm {
  return {
    name: '',
    description: '',
    allowedIps: null,
    dns: null,
    firewallIps: null,
  };
}

export function clientGroupToForm(group: ClientGroupPayload): ClientGroupForm {
  return {
    name: group.name,
    description: group.description ?? '',
    allowedIps: clonePolicyValue(group.allowedIps),
    dns: clonePolicyValue(group.dns),
    firewallIps: clonePolicyValue(group.firewallIps),
  };
}

export function clientGroupFormToPayload(
  form: ClientGroupForm
): ClientGroupPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    allowedIps: normalizePolicyPayload(form.allowedIps),
    dns: normalizePolicyPayload(form.dns),
    firewallIps: normalizePolicyPayload(form.firewallIps),
  };
}

export function clonePolicyValue(value: GroupPolicyValue): GroupPolicyValue {
  return value === null ? null : [...value];
}

export function setPolicyDefined(value: GroupPolicyValue, defined: boolean) {
  if (!defined) {
    return null;
  }

  return value === null || value.length === 0 ? [''] : value;
}

export function createPolicyDraftState(
  value: GroupPolicyValue
): ClientGroupPolicyDraftState {
  return {
    value: clonePolicyValue(value),
    draft: clonePolicyValue(value),
  };
}

export function setPolicyDraftDefined(
  state: ClientGroupPolicyDraftState,
  defined: boolean
): ClientGroupPolicyDraftState {
  if (!defined) {
    return {
      value: null,
      draft:
        state.value === null ? clonePolicyValue(state.draft) : [...state.value],
    };
  }

  const draft = clonePolicyValue(state.draft);

  return {
    value: draft && draft.length > 0 ? [...draft] : [''],
    draft: draft && draft.length > 0 ? draft : [''],
  };
}

export function addPolicyEntry(value: GroupPolicyValue) {
  return [...(value ?? []), ''];
}

export function updatePolicyEntry(
  value: GroupPolicyValue,
  index: number,
  entry: string
) {
  const nextValue = [...(value ?? [])];
  nextValue[index] = entry;
  return nextValue;
}

export function removePolicyEntry(value: GroupPolicyValue, index: number) {
  const nextValue = [...(value ?? [])];
  nextValue.splice(index, 1);
  return nextValue.length > 0 ? nextValue : [''];
}

export function policyCount(value: GroupPolicyValue) {
  return value === null ? null : value.length;
}

export function pluralKey(
  count: number,
  singularKey: string,
  pluralKey: string
) {
  return count === 1 ? singularKey : pluralKey;
}

export function groupPolicySummary(group: ClientGroupSummarySource) {
  return {
    allowedIps: policyCount(group.allowedIps),
    dns: policyCount(group.dns),
    firewallIps: policyCount(group.firewallIps),
  };
}

export function groupIdsForClient(
  membership: ClientGroupMembership[],
  clientId: number
) {
  return membership
    .filter((entry) => entry.clientId === clientId)
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.groupId);
}

export function clientIdsForGroup(
  membership: ClientGroupMembership[],
  groupId: number
) {
  return membership
    .filter((entry) => entry.groupId === groupId)
    .map((entry) => entry.clientId);
}

export function groupSelectionFromMembership(
  membership: ClientGroupMembership[],
  clientId: number
) {
  return groupIdsForClient(membership, clientId).map(String);
}

export function groupIdsFromSelection(selection: string[]) {
  return selection.map(Number);
}

export function selectedClientGroups<T extends ClientGroupPolicySource>(
  groups: T[] | null | undefined,
  selection: string[]
) {
  const groupIds = groupIdsFromSelection(selection);
  return groupIds
    .map((groupId) => groups?.find((group) => group.id === groupId))
    .filter((group): group is T => !!group);
}

export function groupManagesClientPolicy(
  groups: ClientGroupPolicySource[] | null | undefined,
  key: ClientGroupPolicyKey,
  firewallEnabled = true
) {
  if (!groups || groups.length === 0) {
    return false;
  }

  if (key === 'firewallIps' && !firewallEnabled) {
    return false;
  }

  return groups.some((group) => group[key] !== null && group[key]!.length > 0);
}

export function groupManagedPolicyValue(
  groups: ClientGroupPolicySource[] | null | undefined,
  key: ClientGroupPolicyKey
) {
  if (!groups || groups.length === 0) {
    return null;
  }

  const seen = new Set<string>();
  const value: string[] = [];

  for (const group of groups) {
    const entries = group[key];

    if (!entries || entries.length === 0) {
      continue;
    }

    for (const entry of entries) {
      if (!seen.has(entry)) {
        seen.add(entry);
        value.push(entry);
      }
    }
  }

  return value.length > 0 ? value : null;
}

export function visibleGroupPolicyKeys(firewallEnabled: boolean) {
  return firewallEnabled
    ? (['allowedIps', 'dns', 'firewallIps'] as const)
    : (['allowedIps', 'dns'] as const);
}

export function invalidDefinedPolicyKey(
  form: Pick<ClientGroupForm, 'allowedIps' | 'dns' | 'firewallIps'>,
  firewallEnabled = true
) {
  const keys = visibleGroupPolicyKeys(firewallEnabled);

  return (
    keys.find((key) => {
      const value = form[key];
      return value !== null && value.some((entry) => entry.trim() === '');
    }) ?? null
  );
}

export function getMembershipChange(
  initialSelection: string[],
  selectedSelection: string[]
): ClientGroupMembershipChange {
  const initialGroupIds = groupIdsFromSelection(initialSelection);
  const groupIds = groupIdsFromSelection(selectedSelection);

  return {
    changed: !orderedNumberArraysEqual(initialGroupIds, groupIds),
    groupIds,
  };
}

export async function saveClientGroupMembership(
  clientId: number,
  initialSelection: string[],
  selectedSelection: string[],
  actions: ClientGroupMembershipActions
) {
  const change = getMembershipChange(initialSelection, selectedSelection);

  if (!change.changed) {
    return false;
  }

  await actions.setGroups(clientId, change.groupIds);

  return true;
}

export function addGroupSelection(selection: string[], groupId: string) {
  if (!groupId || selection.includes(groupId)) {
    return selection;
  }

  return [...selection, groupId];
}

export function removeGroupSelection(selection: string[], groupId: string) {
  return selection.filter((selectedGroupId) => selectedGroupId !== groupId);
}

export function orderedNumberArraysEqual(first: number[], second: number[]) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

export function effectivePolicyMessageKey(field: EffectivePolicyField) {
  if (field.source === 'groups') {
    return field.groups.length === 1
      ? 'clientGroup.managedByOneGroupLinked'
      : 'clientGroup.managedByManyGroupsLinked';
  }

  if (field.source === 'global') {
    return 'clientGroup.inheritedFromGlobal';
  }

  return 'clientGroup.usingClientValue';
}

export function apiErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function normalizePolicyPayload(value: GroupPolicyValue): GroupPolicyValue {
  if (value === null) {
    return null;
  }

  return value.map((entry) => entry.trim());
}
