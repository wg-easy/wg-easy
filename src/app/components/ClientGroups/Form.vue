<template>
  <FormElement @submit.prevent="$emit('submit')">
    <FormGroup>
      <FormHeading>{{ $t('form.sectionGeneral') }}</FormHeading>
      <FormTextField
        id="clientGroupName"
        v-model="form.name"
        :label="$t('general.name')"
      />
      <FormTextArea
        id="clientGroupDescription"
        v-model="form.description"
        :label="$t('clientGroup.description')"
      />
    </FormGroup>

    <FormGroup>
      <ClientGroupsPolicyField
        v-model="form.allowedIps"
        name="allowedIps"
        :label="$t('general.allowedIps')"
        :description="$t('client.allowedIpsDesc')"
        :switch-label="$t('clientGroup.manageAllowedIps')"
        :not-defined-text="$t('clientGroup.notDefined')"
        :remove-label="$t('clientGroup.removeAllowedIp')"
      />
    </FormGroup>

    <FormGroup>
      <ClientGroupsPolicyField
        v-model="form.dns"
        name="dns"
        :label="$t('general.dns')"
        :description="$t('client.dnsDesc')"
        :switch-label="$t('clientGroup.manageDns')"
        :not-defined-text="$t('clientGroup.notDefined')"
        :remove-label="$t('clientGroup.removeDns')"
      />
    </FormGroup>

    <FormGroup v-if="showFirewallIps">
      <ClientGroupsPolicyField
        v-model="form.firewallIps"
        name="firewallIps"
        :label="$t('client.firewallIps')"
        :description="$t('client.firewallIpsDesc')"
        :switch-label="$t('clientGroup.manageFirewallIps')"
        :not-defined-text="$t('clientGroup.notDefined')"
        :remove-label="$t('clientGroup.removeFirewallIp')"
      />
    </FormGroup>

    <FormGroup>
      <FormHeading>{{ $t('form.actions') }}</FormHeading>
      <FormPrimaryActionField type="submit" :label="submitLabel" />
      <slot name="actions" />
    </FormGroup>
  </FormElement>
</template>

<script lang="ts" setup>
import type { ClientGroupForm } from '../../utils/clientGroups';

defineEmits<{
  submit: [];
}>();

defineProps<{
  submitLabel: string;
  showFirewallIps: boolean;
}>();

const form = defineModel<ClientGroupForm>({ required: true });
</script>
