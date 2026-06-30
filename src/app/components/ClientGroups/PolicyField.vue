<template>
  <FormHeading :description="description">
    {{ label }}
  </FormHeading>

  <div class="flex items-center">
    <FormLabel :for="switchId">
      {{ switchLabel }}
    </FormLabel>
  </div>
  <div class="my-auto">
    <BaseSwitch :id="switchId" v-model="isDefined" :aria-label="switchLabel" />
  </div>

  <div class="col-span-full min-w-0 space-y-2">
    <p v-if="data === null" class="text-sm text-gray-500 dark:text-neutral-300">
      {{ notDefinedText }}
    </p>

    <div v-if="data !== null" class="space-y-2">
      <div
        v-for="(item, index) in data"
        :key="index"
        class="mt-1 flex min-w-0 flex-row gap-1"
      >
        <input
          :id="`${name}-${index}`"
          :name="name"
          :value="item"
          type="text"
          class="min-w-0 rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
          @input="updateEntry($event, index)"
        />
        <button
          type="button"
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition hover:bg-red-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-800 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
          :aria-label="removeLabel"
          :title="removeLabel"
          @click="removeEntry(index)"
        >
          <IconsDelete class="w-5" />
        </button>
      </div>

      <div class="mt-2">
        <BasePrimaryButton type="button" class="rounded-lg" @click="addEntry">
          {{ $t('form.add') }}
        </BasePrimaryButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  addPolicyEntry,
  removePolicyEntry,
  setPolicyDraftDefined,
  updatePolicyEntry,
} from '../../utils/clientGroups';

const data = defineModel<string[] | null>({ required: true });

const props = defineProps<{
  name: string;
  label: string;
  description?: string;
  switchLabel: string;
  notDefinedText: string;
  removeLabel: string;
}>();

const draftValue = ref<string[] | null>(
  data.value === null ? null : [...data.value]
);
const internalNullWrite = ref(false);

const isDefined = computed({
  get: () => data.value !== null,
  set: (defined: boolean) => {
    const nextState = setPolicyDraftDefined(
      { value: data.value, draft: draftValue.value },
      defined
    );

    draftValue.value = nextState.draft;
    internalNullWrite.value = !defined;
    data.value = nextState.value;
  },
});

watch(
  data,
  (value) => {
    if (value === null) {
      if (internalNullWrite.value) {
        internalNullWrite.value = false;
      } else {
        draftValue.value = null;
      }
      return;
    }

    draftValue.value = [...value];
  },
  { deep: true }
);

function addEntry() {
  data.value = addPolicyEntry(data.value);
}

function updateEntry(event: Event, index: number) {
  data.value = updatePolicyEntry(
    data.value,
    index,
    (event.target as HTMLInputElement).value
  );
}

function removeEntry(index: number) {
  data.value = removePolicyEntry(data.value, index);
}

const name = computed(() => props.name);
const switchId = computed(() => `${props.name}Managed`);
</script>
