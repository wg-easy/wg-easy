<template>
  <BaseDialog
    v-for="(action, index) in actions"
    :key="index"
    :trigger-disabled="pending || action.disabled"
    trigger-class="ui-button ui-button-secondary"
    @update:open="(open) => open && (publicKey = action.initialPublicKey ?? '')"
  >
    <template #trigger>
      {{ label(action) }}
    </template>
    <template #title>{{ label(action) }}</template>
    <template #description>
      <i18n-t :keypath="`clients.keys.actions.${action.name}.description`">
        <template #name>
          <strong>{{ client.name }}</strong>
        </template>
      </i18n-t>
      <div v-if="action.initialPublicKey !== undefined" class="mt-4 grid gap-2">
        <FormTextField
          id="replacementPublicKey"
          v-model="publicKey"
          :label="$t('clients.keys.publicKey')"
          autocomplete="off"
        />
      </div>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>
          {{ $t('common.actions.cancel') }}
        </BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BaseSecondaryButton
          class="ui-button-danger"
          :disabled="
            pending ||
            (action.initialPublicKey !== undefined && !publicKey.trim())
          "
          @click="confirm(action)"
        >
          {{ label(action) }}
        </BaseSecondaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
import { $fetch } from '#imports';
import type { ClientKeyModeChange } from '#shared/contracts/client';
import type en from '~~/i18n/locales/en.json';

type KeyAction = {
  name: keyof typeof en.clients.keys.actions;
  initialPublicKey?: string;
  disabled?: boolean;
  request: (publicKey: string) => Promise<unknown>;
};

const props = defineProps<{
  client: Pick<LocalClient, 'id' | 'name' | 'publicKey' | 'hasPrivateKey'> & {
    hasPreSharedKey: boolean;
  };
  refresh: () => Promise<void>;
}>();

const publicKey = ref('');
const pending = ref(false);
const { t } = useI18n();

function label(action: KeyAction) {
  return t(`clients.keys.actions.${action.name}.label`);
}

const actions = computed<KeyAction[]>(() => {
  const {
    hasPrivateKey,
    hasPreSharedKey,
    publicKey: currentPublicKey,
  } = props.client;
  const clientUrl = `/api/client/${props.client.id}` as const;
  const setMode = (body: ClientKeyModeChange) =>
    $fetch(`${clientUrl}/keyMode`, { method: 'put', body });
  return [
    {
      name: hasPreSharedKey ? 'rotatePreSharedKey' : 'addPreSharedKey',
      request: () => $fetch(`${clientUrl}/preSharedKey`, { method: 'post' }),
    },
    {
      name: 'removePreSharedKey',
      disabled: !hasPreSharedKey,
      request: () => $fetch(`${clientUrl}/preSharedKey`, { method: 'delete' }),
    },
    hasPrivateKey
      ? {
          name: 'rotateKeyPair',
          request: () =>
            $fetch(`${clientUrl}/rotateKeyPair`, { method: 'post' }),
        }
      : {
          name: 'replacePublicKey',
          initialPublicKey: '',
          request: (publicKey) =>
            $fetch(`${clientUrl}/publicKey`, {
              method: 'put',
              body: { publicKey },
            }),
        },
    hasPrivateKey
      ? {
          name: 'useDeviceKey',
          initialPublicKey: currentPublicKey,
          request: (publicKey) =>
            setMode({ mode: 'device', currentPublicKey, publicKey }),
        }
      : {
          name: 'useManagedKey',
          request: () => setMode({ mode: 'managed', currentPublicKey }),
        },
  ];
});

const submit = useSubmit(
  (action: KeyAction) => action.request(publicKey.value),
  {
    revert: props.refresh,
    successMsg: t('clients.keys.updated'),
  }
);

async function confirm(action: KeyAction) {
  if (pending.value) {
    return;
  }
  pending.value = true;
  try {
    await submit(action);
  } finally {
    pending.value = false;
  }
}
</script>
