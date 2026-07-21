export type ClientPolicyGroup = {
  id: number;
  name: string;
  allowedIps: string[] | null;
  dns: string[] | null;
  firewallIps: string[] | null;
};

export type ClientPolicyDraft = {
  allowedIps: string[] | null;
  dns: string[] | null;
  firewallIps: string[] | null;
};

export type ClientPolicyDefaults = {
  defaultAllowedIps: string[];
  defaultDns: string[];
};

export type EffectivePolicySource = 'client' | 'groups' | 'global';

export type EffectiveClientPolicyField = {
  value: string[];
  source: EffectivePolicySource;
  groups: { id: number; name: string }[];
};

export type EffectiveClientPolicy = {
  allowedIps: string[];
  dns: string[];
  firewallIps: string[];
  fields: {
    allowedIps: EffectiveClientPolicyField;
    dns: EffectiveClientPolicyField;
    firewallIps: EffectiveClientPolicyField;
  };
  groupManagedAllowedIps: boolean;
  groupManagedDns: boolean;
  groupManagedFirewallIps: boolean;
};

export function resolveClientEffectivePolicy({
  client,
  groups = [],
  userConfig,
  firewallEnabled,
}: {
  client: ClientPolicyDraft;
  groups?: ClientPolicyGroup[];
  userConfig: ClientPolicyDefaults;
  firewallEnabled: boolean;
}): EffectiveClientPolicy {
  const isGrouped = groups.length > 0;
  const allowedIps = resolvePolicyField({
    isGrouped,
    groups,
    field: 'allowedIps',
    clientValue: client.allowedIps,
    globalValue: userConfig.defaultAllowedIps,
  });
  const dns = resolvePolicyField({
    isGrouped,
    groups,
    field: 'dns',
    clientValue: client.dns,
    globalValue: userConfig.defaultDns,
  });
  const firewallIps = resolveFirewallPolicyField({
    isGrouped,
    groups,
    clientValue: client.firewallIps,
    fallbackValue: allowedIps.value,
    firewallEnabled,
  });

  return {
    allowedIps: allowedIps.value,
    dns: dns.value,
    firewallIps: firewallIps.value,
    fields: {
      allowedIps,
      dns,
      firewallIps,
    },
    groupManagedAllowedIps: allowedIps.source === 'groups',
    groupManagedDns: dns.source === 'groups',
    groupManagedFirewallIps: firewallIps.source === 'groups',
  };
}

function resolvePolicyField({
  isGrouped,
  groups,
  field,
  clientValue,
  globalValue,
}: {
  isGrouped: boolean;
  groups: ClientPolicyGroup[];
  field: 'allowedIps' | 'dns';
  clientValue: string[] | null;
  globalValue: string[];
}): EffectiveClientPolicyField {
  if (!isGrouped) {
    const draftValue = definedEntries(clientValue);

    return draftValue.length > 0
      ? { value: draftValue, source: 'client', groups: [] }
      : { value: globalValue, source: 'global', groups: [] };
  }

  const groupResult = unionGroupValues(groups, field);

  return groupResult.value.length > 0
    ? { ...groupResult, source: 'groups' }
    : { value: globalValue, source: 'global', groups: [] };
}

function resolveFirewallPolicyField({
  isGrouped,
  groups,
  clientValue,
  fallbackValue,
  firewallEnabled,
}: {
  isGrouped: boolean;
  groups: ClientPolicyGroup[];
  clientValue: string[] | null;
  fallbackValue: string[];
  firewallEnabled: boolean;
}): EffectiveClientPolicyField {
  if (!firewallEnabled) {
    return { value: [], source: 'global', groups: [] };
  }

  if (!isGrouped) {
    const draftValue = definedEntries(clientValue);

    return draftValue.length > 0
      ? { value: draftValue, source: 'client', groups: [] }
      : { value: fallbackValue, source: 'global', groups: [] };
  }

  const groupResult = unionGroupValues(groups, 'firewallIps');

  return groupResult.value.length > 0
    ? { ...groupResult, source: 'groups' }
    : { value: fallbackValue, source: 'global', groups: [] };
}

function unionGroupValues(
  groups: ClientPolicyGroup[],
  field: 'allowedIps' | 'dns' | 'firewallIps'
) {
  const value: string[] = [];
  const seen = new Set<string>();
  const contributors: { id: number; name: string }[] = [];

  for (const group of groups) {
    const entries = definedEntries(group[field]);

    if (entries.length === 0) {
      continue;
    }

    contributors.push({ id: group.id, name: group.name });

    for (const entry of entries) {
      if (seen.has(entry)) {
        continue;
      }

      seen.add(entry);
      value.push(entry);
    }
  }

  return { value, groups: contributors };
}

function definedEntries(value: string[] | null) {
  return value?.map((entry) => entry.trim()).filter(Boolean) ?? [];
}
