<template>
  <div
    ref="toolbar"
    role="group"
    :aria-label="$t('bulk.actions')"
    tabindex="-1"
    class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted"
  >
    <label class="flex min-h-8 items-center gap-3">
      <BaseCheckbox
        :model-value="clientsStore.pageSelection"
        :label="$t('bulk.selectPage')"
        :disabled="busy || !clientsStore.clients?.length"
        @update:model-value="clientsStore.selectPage($event === true)"
      />
      {{ $t('bulk.selectPage') }}
    </label>
    <span role="status">
      {{ $t('bulk.selected', { count: clientsStore.selectedIds.length }) }}
    </span>
    <DropdownMenuRoot>
      <DropdownMenuTrigger as-child>
        <button
          ref="actionsTrigger"
          type="button"
          class="ml-auto inline-flex min-h-8 items-center gap-1.5 hover:text-foreground disabled:opacity-45"
          :disabled="busy || !clientsStore.selectedIds.length"
        >
          {{ $t('bulk.actions') }}
          <ChevronDownIcon class="size-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          :side-offset="6"
          class="ui-menu w-48"
          @close-auto-focus="confirmation && $event.preventDefault()"
        >
          <DropdownMenuItem
            class="ui-menu-item data-[disabled]:pointer-events-none data-[disabled]:opacity-45"
            :disabled="busy || !canEnable"
            @select="requestConfirmation('enable')"
          >
            <PowerIcon class="size-4" aria-hidden="true" />
            {{ $t('bulk.enable') }}
          </DropdownMenuItem>
          <DropdownMenuItem
            class="ui-menu-item data-[disabled]:pointer-events-none data-[disabled]:opacity-45"
            :disabled="busy || !canDisable"
            @select="requestConfirmation('disable')"
          >
            <PowerOffIcon class="size-4" aria-hidden="true" />
            {{ $t('bulk.disable') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator class="my-1 h-px bg-line" />
          <DropdownMenuItem
            class="ui-menu-item text-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-45"
            :disabled="busy || !clientsStore.selectedIds.length"
            @select="requestConfirmation('delete')"
          >
            <Trash2Icon class="size-4" aria-hidden="true" />
            {{ $t('bulk.delete') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <button
      v-if="clientsStore.selectedIds.length"
      type="button"
      class="inline-flex min-h-8 items-center text-subtle hover:text-foreground disabled:opacity-45"
      :disabled="busy"
      @click="clientsStore.clearSelection()"
    >
      {{ $t('bulk.clearSelection') }}
    </button>
    <AlertDialogRoot
      :open="confirmation !== null"
      @update:open="!$event && closeConfirmation()"
    >
      <AlertDialogPortal>
        <AlertDialogOverlay
          class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
        <AlertDialogContent
          v-if="confirmation"
          class="surface fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 shadow-2xl focus:outline-none sm:p-7"
          @escape-key-down="pending && $event.preventDefault()"
          @close-auto-focus="restoreFocus"
        >
          <AlertDialogTitle
            class="text-xl font-semibold tracking-tight text-foreground"
          >
            {{
              $t(`bulk.${confirmation.action}Title`, {
                count: confirmation.count,
              })
            }}
          </AlertDialogTitle>
          <AlertDialogDescription
            class="mt-5 text-sm leading-relaxed text-muted"
          >
            {{ $t(`bulk.${confirmation.action}Description`) }}
          </AlertDialogDescription>
          <p v-if="errorMessage" role="alert" class="mt-4 text-sm text-accent">
            {{ errorMessage }}
          </p>
          <div
            class="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-5"
          >
            <AlertDialogCancel
              class="ui-button ui-button-secondary"
              :disabled="pending"
            >
              {{ $t('dialog.cancel') }}
            </AlertDialogCancel>
            <button
              type="button"
              class="ui-button"
              :class="
                confirmation.action === 'delete'
                  ? 'ui-button-danger'
                  : 'ui-button-primary'
              "
              :disabled="busy || !clientsStore.selectedIds.length"
              @click="runConfirmedAction"
            >
              <LoaderCircleIcon
                v-if="pending"
                class="size-4 animate-spin"
                aria-hidden="true"
              />
              {{
                $t(pending ? 'general.loading' : `bulk.${confirmation.action}`)
              }}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
    <p
      v-if="pending"
      role="status"
      class="flex w-full items-center gap-2 text-subtle"
    >
      <LoaderCircleIcon class="size-3.5 animate-spin" aria-hidden="true" />
      {{ $t('bulk.applying') }}
    </p>
    <p
      v-if="errorMessage && !confirmation"
      role="alert"
      class="w-full text-sm text-accent"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDownIcon,
  LoaderCircleIcon,
  PowerIcon,
  PowerOffIcon,
  Trash2Icon,
} from '@lucide/vue';
import { FetchError } from 'ofetch';

import type { ClientBulkAction } from '#shared/utils/clientBulk';

const clientsStore = useClientsStore();
const toast = useToast();
const { t } = useI18n();
const toolbar = ref<HTMLElement | null>(null);
const actionsTrigger = ref<HTMLButtonElement | null>(null);
const confirmation = ref<{ action: ClientBulkAction; count: number } | null>(
  null
);
const pending = ref(false);
const errorMessage = ref('');
const busy = computed(
  () =>
    pending.value || clientsStore.isUpdatingList || clientsStore.isApplyingBulk
);
const canEnable = computed(() =>
  clientsStore.selectedClients.some((client) => !client.enabled)
);
const canDisable = computed(() =>
  clientsStore.selectedClients.some((client) => client.enabled)
);

watch(
  () => clientsStore.selectedIds,
  () => {
    if (pending.value) return;
    confirmation.value = null;
    errorMessage.value = '';
  },
  { flush: 'sync' }
);

function requestConfirmation(action: ClientBulkAction) {
  if (busy.value || !clientsStore.selectedIds.length) return;
  errorMessage.value = '';
  confirmation.value = { action, count: clientsStore.selectedIds.length };
}

function closeConfirmation() {
  if (!pending.value) confirmation.value = null;
}

function restoreFocus(event: Event) {
  event.preventDefault();
  if (actionsTrigger.value && !actionsTrigger.value.disabled) {
    actionsTrigger.value.focus();
  } else {
    toolbar.value?.focus();
  }
}

async function runConfirmedAction() {
  if (busy.value || !confirmation.value || !clientsStore.selectedIds.length)
    return;
  const { action, count } = confirmation.value;
  pending.value = true;
  errorMessage.value = '';
  try {
    if (await clientsStore.applyBulkAction(action)) {
      confirmation.value = null;
      toast.showToast({
        type: 'success',
        message: t(`bulk.success.${action}`, { count }),
      });
    }
  } catch (error) {
    errorMessage.value =
      error instanceof FetchError
        ? error.data?.message || t('bulk.failed')
        : t('bulk.failed');
  } finally {
    pending.value = false;
    if (clientsStore.selectedIds.length !== count) confirmation.value = null;
  }
}
</script>
