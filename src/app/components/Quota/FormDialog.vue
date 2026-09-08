<template>
  <DialogRoot v-model:open="open" :modal="true">
    <DialogTrigger as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-30 bg-gray-500 opacity-75 dark:bg-black dark:opacity-50"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[100] max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-5 shadow-2xl focus:outline-none sm:p-6 dark:bg-neutral-700 dark:text-neutral-200"
      >
        <DialogTitle
          class="text-lg font-semibold text-gray-900 dark:text-white"
        >
          {{ quota ? $t('quota.edit') : $t('quota.create') }}
        </DialogTitle>
        <DialogDescription
          class="mt-1 text-sm text-gray-500 dark:text-neutral-300"
        >
          {{ $t('quota.formDescription') }}
        </DialogDescription>

        <form class="mt-6 space-y-6" @submit.prevent="submit">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-1 sm:col-span-2">
              <span class="text-sm font-medium">{{ $t('general.name') }}</span>
              <BaseInput
                v-model.trim="form.name"
                name="quotaName"
                type="text"
                required
                maxlength="64"
                class="w-full"
              />
            </label>

            <div class="flex items-center justify-between sm:col-span-2">
              <div>
                <label for="quotaEnabled" class="text-sm font-medium">
                  {{ $t('quota.enabled') }}
                </label>
                <div
                  id="quotaEnabledDescription"
                  class="text-xs text-gray-500 dark:text-neutral-400"
                >
                  {{ $t('quota.enabledDescription') }}
                </div>
              </div>
              <BaseSwitch
                id="quotaEnabled"
                v-model="form.enabled"
                aria-describedby="quotaEnabledDescription"
              />
            </div>
          </div>

          <fieldset>
            <legend class="mb-2 text-sm font-medium">
              {{ $t('quota.mode') }}
            </legend>
            <div
              class="grid grid-cols-2 overflow-hidden rounded border border-gray-200 sm:grid-cols-4 dark:border-neutral-500"
            >
              <button
                v-for="mode in modes"
                :key="mode"
                type="button"
                :aria-pressed="form.mode === mode"
                class="min-h-10 border-gray-200 px-2 py-2 text-sm transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 dark:border-neutral-500 dark:hover:bg-neutral-600"
                :class="
                  form.mode === mode
                    ? 'bg-red-800 text-white hover:bg-red-800 dark:hover:bg-red-800'
                    : 'bg-white text-gray-700 dark:bg-neutral-700 dark:text-neutral-200'
                "
                @click="form.mode = mode"
              >
                {{ $t(`quota.modes.${mode}`) }}
              </button>
            </div>
          </fieldset>

          <div class="grid gap-4 sm:grid-cols-2">
            <QuotaLimitInput
              v-if="form.mode === 'RX' || form.mode === 'SEPARATE'"
              v-model:value="form.rxValue"
              v-model:unit="form.rxUnit"
              :label="$t('quota.rxLimit')"
            />
            <QuotaLimitInput
              v-if="form.mode === 'TX' || form.mode === 'SEPARATE'"
              v-model:value="form.txValue"
              v-model:unit="form.txUnit"
              :label="$t('quota.txLimit')"
            />
            <QuotaLimitInput
              v-if="form.mode === 'TOTAL'"
              v-model:value="form.totalValue"
              v-model:unit="form.totalUnit"
              :label="$t('quota.totalLimit')"
            />
          </div>

          <fieldset class="space-y-4">
            <legend class="text-sm font-medium">{{ $t('quota.reset') }}</legend>
            <label class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center">
              <span class="text-sm">{{ $t('quota.frequency') }}</span>
              <select
                v-model="form.frequency"
                class="rounded border-2 border-gray-100 bg-white text-sm text-gray-700 focus:border-red-800 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
              >
                <option
                  v-for="frequency in frequencies"
                  :key="frequency"
                  :value="frequency"
                >
                  {{ $t(`quota.frequencies.${frequency}`) }}
                </option>
              </select>
            </label>

            <template v-if="form.frequency !== 'NONE'">
              <label
                class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center"
              >
                <span class="text-sm">{{ $t('quota.resetTime') }}</span>
                <input
                  v-model="form.time"
                  type="time"
                  required
                  class="rounded border-2 border-gray-100 bg-white text-gray-700 focus:border-red-800 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
                />
              </label>
              <label
                class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center"
              >
                <span class="text-sm">{{ $t('quota.timezone') }}</span>
                <select
                  v-model="form.timezone"
                  required
                  class="rounded border-2 border-gray-100 bg-white text-sm text-gray-700 focus:border-red-800 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
                >
                  <option
                    v-for="timezone in timezones"
                    :key="timezone"
                    :value="timezone"
                  >
                    {{ timezone }}
                  </option>
                </select>
              </label>
            </template>

            <label
              v-if="form.frequency === 'WEEKLY'"
              class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center"
            >
              <span class="text-sm">{{ $t('quota.weekday') }}</span>
              <select
                v-model.number="form.weekday"
                class="rounded border-2 border-gray-100 bg-white text-sm text-gray-700 focus:border-red-800 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
              >
                <option
                  v-for="weekday in 7"
                  :key="weekday - 1"
                  :value="weekday - 1"
                >
                  {{ $t(`quota.weekdays.${weekday - 1}`) }}
                </option>
              </select>
            </label>

            <label
              v-if="form.frequency === 'MONTHLY'"
              class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center"
            >
              <span class="text-sm">{{ $t('quota.monthDay') }}</span>
              <input
                v-model.number="form.day"
                type="number"
                min="1"
                max="31"
                required
                class="rounded border-2 border-gray-100 bg-white text-gray-700 focus:border-red-800 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
              />
            </label>
          </fieldset>

          <fieldset v-if="fixedClientId === undefined">
            <legend class="text-sm font-medium">
              {{ $t('quota.clients') }}
            </legend>
            <div
              class="mt-2 max-h-44 overflow-y-auto rounded border border-gray-200 dark:border-neutral-500"
            >
              <label
                v-for="client in clients"
                :key="client.id"
                class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50 dark:border-neutral-600 dark:hover:bg-neutral-600"
              >
                <input
                  v-model="form.clientIds"
                  type="checkbox"
                  :value="client.id"
                  class="rounded text-red-800 focus:ring-red-700"
                />
                <span class="min-w-0 truncate text-sm">{{ client.name }}</span>
                <span class="ml-auto text-xs text-gray-400">{{
                  client.ipv4Address
                }}</span>
              </label>
              <div
                v-if="clients.length === 0"
                class="px-3 py-4 text-sm text-gray-500"
              >
                {{ $t('client.empty') }}
              </div>
            </div>
          </fieldset>

          <div class="flex justify-end gap-2">
            <BaseSecondaryButton type="button" @click="open = false">
              {{ $t('dialog.cancel') }}
            </BaseSecondaryButton>
            <BasePrimaryButton type="submit" :disabled="submitting">
              {{ quota ? $t('form.save') : $t('dialog.create') }}
            </BasePrimaryButton>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import type { QuotaInput, QuotaPublic } from '#db/repositories/quota/types';

type LimitMode = QuotaInput['limit']['mode'];
type Frequency = QuotaInput['reset']['frequency'];
type ByteUnit = 'MB' | 'GB' | 'TB';

const props = defineProps<{
  quota?: QuotaPublic;
  clients: { id: number; name: string; ipv4Address: string }[];
  fixedClientId?: number;
}>();
const emit = defineEmits<{ saved: [] }>();
const { t } = useI18n();
const open = ref(false);
const submitting = ref(false);
const browserTimezone = ref('UTC');
const modes: LimitMode[] = ['RX', 'TX', 'TOTAL', 'SEPARATE'];
const frequencies: Frequency[] = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'];
const factors: Record<ByteUnit, number> = {
  MB: 1_000_000,
  GB: 1_000_000_000,
  TB: 1_000_000_000_000,
};

function displayLimit(value: number | undefined) {
  const bytes = value ?? factors.GB;
  const unit: ByteUnit =
    bytes >= factors.TB ? 'TB' : bytes >= factors.GB ? 'GB' : 'MB';
  return { value: bytes / factors[unit], unit };
}

function initialForm() {
  const rx = displayLimit(
    props.quota?.limit.mode === 'RX' || props.quota?.limit.mode === 'SEPARATE'
      ? props.quota.limit.rxBytes
      : undefined
  );
  const tx = displayLimit(
    props.quota?.limit.mode === 'TX' || props.quota?.limit.mode === 'SEPARATE'
      ? props.quota.limit.txBytes
      : undefined
  );
  const total = displayLimit(
    props.quota?.limit.mode === 'TOTAL'
      ? props.quota.limit.totalBytes
      : undefined
  );
  const reset = props.quota?.reset;
  return {
    name: props.quota?.name ?? '',
    enabled: props.quota?.enabled ?? true,
    mode: props.quota?.limit.mode ?? ('TOTAL' as LimitMode),
    rxValue: rx.value,
    rxUnit: rx.unit,
    txValue: tx.value,
    txUnit: tx.unit,
    totalValue: total.value,
    totalUnit: total.unit,
    frequency: reset?.frequency ?? ('NONE' as Frequency),
    time: reset && reset.frequency !== 'NONE' ? reset.time : '00:00',
    timezone:
      reset && reset.frequency !== 'NONE'
        ? reset.timezone
        : browserTimezone.value,
    weekday: reset?.frequency === 'WEEKLY' ? reset.weekday : 1,
    day: reset?.frequency === 'MONTHLY' ? reset.day : 1,
    clientIds: resolveQuotaClientIds(
      [...(props.quota?.clientIds ?? [])],
      props.fixedClientId
    ),
  };
}

const form = reactive(initialForm());
onMounted(() => {
  browserTimezone.value = resolveBrowserTimezone();
  if (!props.quota) form.timezone = browserTimezone.value;
});
watch(open, (isOpen) => {
  if (isOpen) Object.assign(form, initialForm());
});

const timezones = computed(() => getQuotaTimezones(form.timezone));

function byteValue(value: number, unit: ByteUnit) {
  return Math.round(value * factors[unit]);
}

function requestBody(): QuotaInput {
  const limit: QuotaInput['limit'] =
    form.mode === 'RX'
      ? { mode: 'RX', rxBytes: byteValue(form.rxValue, form.rxUnit) }
      : form.mode === 'TX'
        ? { mode: 'TX', txBytes: byteValue(form.txValue, form.txUnit) }
        : form.mode === 'TOTAL'
          ? {
              mode: 'TOTAL',
              totalBytes: byteValue(form.totalValue, form.totalUnit),
            }
          : {
              mode: 'SEPARATE',
              rxBytes: byteValue(form.rxValue, form.rxUnit),
              txBytes: byteValue(form.txValue, form.txUnit),
            };
  const reset: QuotaInput['reset'] =
    form.frequency === 'NONE'
      ? { frequency: 'NONE' }
      : form.frequency === 'DAILY'
        ? {
            frequency: 'DAILY',
            time: form.time,
            timezone: form.timezone,
          }
        : form.frequency === 'WEEKLY'
          ? {
              frequency: 'WEEKLY',
              weekday: form.weekday,
              time: form.time,
              timezone: form.timezone,
            }
          : {
              frequency: 'MONTHLY',
              day: form.day,
              time: form.time,
              timezone: form.timezone,
            };
  return {
    name: form.name,
    enabled: form.enabled,
    limit,
    reset,
    clientIds: resolveQuotaClientIds(form.clientIds, props.fixedClientId),
  };
}

const save = useSubmit(
  (body) =>
    props.quota
      ? $fetch(`/api/admin/quotas/${props.quota.id}`, {
          method: 'put',
          body,
        })
      : $fetch('/api/admin/quotas', { method: 'post', body }),
  {
    successMsg: t(props.quota ? 'quota.updated' : 'quota.created'),
    revert: async (success) => {
      submitting.value = false;
      if (success) {
        open.value = false;
        emit('saved');
      }
    },
  }
);

async function submit() {
  submitting.value = true;
  await save(requestBody());
}
</script>
