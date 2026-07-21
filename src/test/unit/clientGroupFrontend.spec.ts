import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import {
  addGroupSelection,
  addPolicyEntry,
  apiErrorMessage,
  clientGroupFormToPayload,
  clientGroupToForm,
  clientIdsForGroup,
  createClientGroupForm,
  createPolicyDraftState,
  effectivePolicyMessageKey,
  getMembershipChange,
  groupIdsForClient,
  groupManagedPolicyValue,
  groupManagesClientPolicy,
  groupPolicySummary,
  groupSelectionFromMembership,
  invalidDefinedPolicyKey,
  removeGroupSelection,
  removePolicyEntry,
  saveClientGroupMembership,
  selectedClientGroups,
  setPolicyDraftDefined,
  setPolicyDefined,
  visibleGroupPolicyKeys,
} from '../../app/utils/clientGroups';
import { resolveClientEffectivePolicy } from '../../shared/utils/clientPolicy';

describe('client group frontend helpers', () => {
  test('serializes create form with trimmed name and complete payload', () => {
    const form = createClientGroupForm();
    form.name = '  Customers  ';
    form.description = '  External customers  ';
    form.allowedIps = null;
    form.dns = [' 1.1.1.1 '];
    form.firewallIps = [' 10.0.0.0/24 '];

    expect(clientGroupFormToPayload(form)).toEqual({
      name: 'Customers',
      description: 'External customers',
      allowedIps: null,
      dns: ['1.1.1.1'],
      firewallIps: ['10.0.0.0/24'],
    });
  });

  test('preserves null and non-empty arrays in edit forms', () => {
    const form = clientGroupToForm({
      name: 'Staff',
      description: null,
      allowedIps: null,
      dns: ['1.1.1.1'],
      firewallIps: ['192.0.2.0/24'],
    });

    expect(clientGroupFormToPayload(form)).toEqual({
      name: 'Staff',
      description: null,
      allowedIps: null,
      dns: ['1.1.1.1'],
      firewallIps: ['192.0.2.0/24'],
    });
  });

  test('policy field actions keep an enabled field with at least one input row', () => {
    expect(setPolicyDefined(null, true)).toEqual(['']);
    expect(addPolicyEntry(['10.0.0.0/24'])).toEqual(['10.0.0.0/24', '']);
    expect(removePolicyEntry(['10.0.0.0/24'], 0)).toEqual(['']);
    expect(setPolicyDefined(['10.0.0.0/24'], false)).toBeNull();
  });

  test('policy drafts survive switch off and back on during one edit session', () => {
    let state = createPolicyDraftState(['10.0.0.0/24']);

    state = setPolicyDraftDefined(state, false);
    expect(state.value).toBeNull();
    expect(state.draft).toEqual(['10.0.0.0/24']);

    state = setPolicyDraftDefined(state, true);
    expect(state.value).toEqual(['10.0.0.0/24']);

    expect(setPolicyDraftDefined(createPolicyDraftState(null), true)).toEqual({
      value: [''],
      draft: [''],
    });
  });

  test('detects invalid enabled policy rows before submit', () => {
    expect(
      invalidDefinedPolicyKey({
        allowedIps: null,
        dns: [''],
        firewallIps: null,
      })
    ).toBe('dns');
    expect(
      invalidDefinedPolicyKey({
        allowedIps: ['10.0.0.0/24'],
        dns: null,
        firewallIps: ['10.0.0.1'],
      })
    ).toBeNull();
  });

  test('summarizes group list policy counts', () => {
    expect(
      groupPolicySummary({
        allowedIps: null,
        dns: ['1.1.1.1'],
        firewallIps: ['10.0.0.1', '10.0.0.2'],
      })
    ).toEqual({
      allowedIps: null,
      dns: 1,
      firewallIps: 2,
    });
  });

  test('resolves ordered multi-group membership helpers', () => {
    const membership = [
      { clientId: 1, groupId: 20, position: 1 },
      { clientId: 1, groupId: 10, position: 0 },
      { clientId: 2, groupId: 10, position: 0 },
    ];

    expect(groupIdsForClient(membership, 1)).toEqual([10, 20]);
    expect(clientIdsForGroup(membership, 10)).toEqual([1, 2]);
    expect(groupSelectionFromMembership(membership, 1)).toEqual(['10', '20']);
  });

  test('selects multiple groups and unions managed policy values', () => {
    const groups = [
      {
        id: 1,
        name: 'Staff',
        allowedIps: ['10.0.0.0/24'],
        dns: null,
        firewallIps: ['10.0.0.10:443/tcp'],
      },
      {
        id: 2,
        name: 'NAS',
        allowedIps: ['10.0.0.0/24', '192.0.2.0/24'],
        dns: ['1.1.1.1'],
        firewallIps: null,
      },
    ];
    const selectedGroups = selectedClientGroups(groups, ['1', '2']);

    expect(selectedGroups.map((group) => group.name)).toEqual(['Staff', 'NAS']);
    expect(groupManagesClientPolicy(selectedGroups, 'allowedIps')).toBe(true);
    expect(groupManagesClientPolicy(selectedGroups, 'dns')).toBe(true);
    expect(groupManagedPolicyValue(selectedGroups, 'allowedIps')).toEqual([
      '10.0.0.0/24',
      '192.0.2.0/24',
    ]);
    expect(groupManagesClientPolicy(selectedGroups, 'firewallIps', false)).toBe(
      false
    );
  });

  test('detects ordered membership changes and saves complete replacement only when changed', async () => {
    expect(getMembershipChange(['1', '2'], ['1', '2'])).toEqual({
      changed: false,
      groupIds: [1, 2],
    });
    expect(getMembershipChange(['1', '2'], ['2', '1'])).toEqual({
      changed: true,
      groupIds: [2, 1],
    });

    const setGroups = vi.fn().mockResolvedValue(undefined);
    await expect(
      saveClientGroupMembership(7, ['1'], ['1', '2'], { setGroups })
    ).resolves.toBe(true);
    expect(setGroups).toHaveBeenCalledWith(7, [1, 2]);

    await expect(
      saveClientGroupMembership(7, ['1', '2'], ['1', '2'], { setGroups })
    ).resolves.toBe(false);
  });

  test('adds and removes selected group chips without reordering existing choices', () => {
    expect(addGroupSelection(['1'], '2')).toEqual(['1', '2']);
    expect(addGroupSelection(['1'], '1')).toEqual(['1']);
    expect(removeGroupSelection(['1', '2', '3'], '2')).toEqual(['1', '3']);
  });

  test('maps effective policy source messages', () => {
    expect(
      effectivePolicyMessageKey({
        source: 'groups',
        value: ['10.0.0.0/24'],
        groups: [{ id: 1, name: 'Staff' }],
      })
    ).toBe('clientGroup.managedByOneGroupLinked');
    expect(
      effectivePolicyMessageKey({
        source: 'groups',
        value: ['10.0.0.0/24'],
        groups: [
          { id: 1, name: 'Staff' },
          { id: 2, name: 'NAS' },
        ],
      })
    ).toBe('clientGroup.managedByManyGroupsLinked');
    expect(
      effectivePolicyMessageKey({ source: 'global', value: [], groups: [] })
    ).toBe('clientGroup.inheritedFromGlobal');
  });

  test('draft client values preview immediately while ungrouped', () => {
    const policy = resolveClientEffectivePolicy({
      client: {
        allowedIps: [' 10.0.0.0/24 ', ' '],
        dns: ['9.9.9.9'],
        firewallIps: null,
      },
      groups: [],
      userConfig: {
        defaultAllowedIps: ['0.0.0.0/0'],
        defaultDns: ['1.1.1.1'],
      },
      firewallEnabled: true,
    });

    expect(policy.fields.allowedIps).toMatchObject({
      source: 'client',
      value: ['10.0.0.0/24'],
    });
    expect(policy.fields.firewallIps).toMatchObject({
      source: 'global',
      value: ['10.0.0.0/24'],
    });
  });

  test('removing the last draft client value previews global fallback', () => {
    const policy = resolveClientEffectivePolicy({
      client: {
        allowedIps: [' '],
        dns: null,
        firewallIps: null,
      },
      groups: [],
      userConfig: {
        defaultAllowedIps: ['0.0.0.0/0'],
        defaultDns: ['1.1.1.1'],
      },
      firewallEnabled: true,
    });

    expect(policy.fields.allowedIps).toMatchObject({
      source: 'global',
      value: ['0.0.0.0/0'],
    });
  });

  test('draft groups immediately preview ordered union and deduplication', () => {
    const policy = resolveClientEffectivePolicy({
      client: {
        allowedIps: ['10.99.0.0/24'],
        dns: ['9.9.9.9'],
        firewallIps: ['10.99.0.10:443/tcp'],
      },
      groups: [
        {
          id: 1,
          name: 'Customers',
          allowedIps: ['10.10.0.0/24', '10.20.0.0/24'],
          dns: ['1.1.1.1'],
          firewallIps: null,
        },
        {
          id: 2,
          name: 'NAS',
          allowedIps: ['10.20.0.0/24', '10.30.0.0/24'],
          dns: null,
          firewallIps: null,
        },
      ],
      userConfig: {
        defaultAllowedIps: ['0.0.0.0/0'],
        defaultDns: ['8.8.8.8'],
      },
      firewallEnabled: true,
    });

    expect(policy.fields.allowedIps).toMatchObject({
      source: 'groups',
      value: ['10.10.0.0/24', '10.20.0.0/24', '10.30.0.0/24'],
      groups: [
        { id: 1, name: 'Customers' },
        { id: 2, name: 'NAS' },
      ],
    });
    expect(policy.fields.dns).toMatchObject({
      source: 'groups',
      value: ['1.1.1.1'],
      groups: [{ id: 1, name: 'Customers' }],
    });
  });

  test('draft groups with no contributor preview global fallback', () => {
    const policy = resolveClientEffectivePolicy({
      client: {
        allowedIps: ['10.99.0.0/24'],
        dns: ['9.9.9.9'],
        firewallIps: null,
      },
      groups: [
        {
          id: 1,
          name: 'No Policy',
          allowedIps: null,
          dns: null,
          firewallIps: null,
        },
      ],
      userConfig: {
        defaultAllowedIps: ['0.0.0.0/0'],
        defaultDns: ['8.8.8.8'],
      },
      firewallEnabled: true,
    });

    expect(policy.fields.allowedIps).toMatchObject({
      source: 'global',
      value: ['0.0.0.0/0'],
      groups: [],
    });
  });

  test('hides Firewall IP policy controls without dropping form values', () => {
    const form = clientGroupToForm({
      name: 'Staff',
      description: null,
      allowedIps: null,
      dns: null,
      firewallIps: ['10.0.0.1:443/tcp'],
    });

    expect(visibleGroupPolicyKeys(false)).toEqual(['allowedIps', 'dns']);
    expect(clientGroupFormToPayload(form).firewallIps).toEqual([
      '10.0.0.1:443/tcp',
    ]);
  });

  test('returns clean duplicate-name error display text', () => {
    expect(
      apiErrorMessage(
        { data: { message: 'Client group already exists' } },
        'Unknown error'
      )
    ).toBe('Client group already exists');
  });

  test('client edit page uses multi-group selection and main save flow', () => {
    const clientPage = readFileSync(
      resolve('app/pages/clients/[id].vue'),
      'utf8'
    );

    expect(clientPage).toContain('selectedGroupIds');
    expect(clientPage).toContain('ClientGroupsSelector');
    expect(clientPage).toContain('draftEffectivePolicy');
    expect(clientPage).toContain('resolveClientEffectivePolicy');
    expect(clientPage).toContain('groupsStore.setClientGroups');
    expect(clientPage).toContain('ClientGroupsManagedPolicyValue');
    expect(clientPage).toContain('effectivePolicyMessage');
    expect(clientPage).not.toContain('getClientEffectivePolicy');
    expect(clientPage).not.toContain('clientGroup.saveMembership');
    expect(clientPage).not.toContain('@click="saveClientGroup"');
  });

  test('client create dialog accepts ordered group selection', () => {
    const createDialog = readFileSync(
      resolve('app/components/Clients/CreateDialog.vue'),
      'utf8'
    );

    expect(createDialog).toContain('selectedGroupIds');
    expect(createDialog).toContain('groupIds: groupIdsFromSelection');
    expect(createDialog).toContain('ClientGroupsSelector');
  });

  test('client create and edit use the same group selector component', () => {
    const createDialog = readFileSync(
      resolve('app/components/Clients/CreateDialog.vue'),
      'utf8'
    );
    const clientPage = readFileSync(
      resolve('app/pages/clients/[id].vue'),
      'utf8'
    );

    expect(createDialog).toContain('<ClientGroupsSelector');
    expect(clientPage).toContain('<ClientGroupsSelector');
  });

  test('group selector renders ordered rows with unlink controls and prevents duplicates', () => {
    const selector = readFileSync(
      resolve('app/components/ClientGroups/Selector.vue'),
      'utf8'
    );

    expect(selector).toContain('v-for="group in selectedGroups"');
    expect(selector).toContain('readonly');
    expect(selector).toContain('<IconsUnlink');
    expect(selector).toContain('availableGroups');
    expect(selector).toContain('!selectedGroupIds.value.includes');
    expect(selector).toContain("{{ $t('clientGroup.noGroupsSelected') }}");
    expect(selector).toContain('sm:grid-cols-[minmax(0,1fr)_auto]');
  });

  test('client group selector avoids duplicate Client Groups labels', () => {
    const clientPage = readFileSync(
      resolve('app/pages/clients/[id].vue'),
      'utf8'
    );
    const createDialog = readFileSync(
      resolve('app/components/Clients/CreateDialog.vue'),
      'utf8'
    );

    expect(clientPage).not.toContain("{{ $t('clientGroup.clientSelector') }}");
    expect(createDialog).not.toContain(
      "{{ $t('clientGroup.clientSelector') }}"
    );
  });

  test('managed group display links every contributing group and supports global fallback text', () => {
    const managedPolicyComponent = readFileSync(
      resolve('app/components/ClientGroups/ManagedPolicyValue.vue'),
      'utf8'
    );

    expect(managedPolicyComponent).toContain(':keypath="messageKey"');
    expect(managedPolicyComponent).toContain('<template #groups>');
    expect(managedPolicyComponent).toContain(':to="`/groups/${group.id}`"');
    expect(managedPolicyComponent).toContain("{{ $t('form.noItems') }}");
  });

  test('group policy form has no explicit empty persisted state', () => {
    const policyComponent = readFileSync(
      resolve('app/components/ClientGroups/PolicyField.vue'),
      'utf8'
    );
    const formComponent = readFileSync(
      resolve('app/components/ClientGroups/Form.vue'),
      'utf8'
    );

    expect(policyComponent).toContain('mt-1 flex min-w-0 flex-row gap-1');
    expect(policyComponent).toContain('<IconsDelete');
    expect(policyComponent).not.toContain('data.length === 0');
    expect(policyComponent).not.toContain('emptyText');
    expect(formComponent).not.toContain('definedEmpty');
  });

  test('group edit membership uses additive assign and unlink icon remove', () => {
    const editPage = readFileSync(resolve('app/pages/groups/[id].vue'), 'utf8');

    expect(editPage).toContain('groupIdsForClient');
    expect(editPage).toContain('groupsStore.assignClient');
    expect(editPage).toContain('groupsStore.removeClient');
    expect(editPage).toContain('IconsUnlink');
    expect(editPage).not.toContain('moveClientConfirm');
    expect(editPage).not.toContain('IconsLink');
  });

  test('base dialog exposes optional trigger accessibility attributes', () => {
    const dialogComponent = readFileSync(
      resolve('app/components/Base/Dialog.vue'),
      'utf8'
    );
    const confirmDialogComponent = readFileSync(
      resolve('app/components/ClientGroups/ConfirmMembershipDialog.vue'),
      'utf8'
    );

    expect(dialogComponent).toContain(':aria-label="triggerAriaLabel"');
    expect(dialogComponent).toContain(':title="triggerTitle"');
    expect(confirmDialogComponent).toContain(
      ':trigger-aria-label="triggerAriaLabel"'
    );
  });

  test('group create redirects to list while group edit save stays put', () => {
    const createPage = readFileSync(
      resolve('app/pages/groups/new.vue'),
      'utf8'
    );
    const editPage = readFileSync(resolve('app/pages/groups/[id].vue'), 'utf8');

    expect(createPage).toContain("await navigateTo('/groups')");
    expect(createPage).toContain('catch (error)');
    expect(editPage).toContain(
      'await groupsStore.updateGroup(groupId, payload)'
    );
    expect(editPage).toContain('async function deleteGroup()');
  });

  test('user menu order is clients, groups, account, admin panel', () => {
    const userMenu = readFileSync(
      resolve('app/components/Ui/UserMenu.vue'),
      'utf8'
    );
    const clientsIndex = userMenu.indexOf("{{ $t('pages.clients') }}");
    const groupsIndex = userMenu.indexOf("{{ $t('pages.groups') }}");
    const accountIndex = userMenu.indexOf("{{ $t('pages.me') }}");
    const adminIndex = userMenu.indexOf("{{ $t('pages.admin.panel') }}");

    expect(clientsIndex).toBeGreaterThan(-1);
    expect(groupsIndex).toBeGreaterThan(clientsIndex);
    expect(accountIndex).toBeGreaterThan(groupsIndex);
    expect(adminIndex).toBeGreaterThan(accountIndex);
  });
});
