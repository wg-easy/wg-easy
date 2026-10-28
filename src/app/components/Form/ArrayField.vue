<template>
  <div ref="list" class="col-span-full flex min-w-0 flex-col gap-2">
    <template v-if="data?.length === 0">
      <slot v-if="$slots.empty" name="empty" />
      <div v-else>{{ emptyText || $t('common.form.noItems') }}</div>
    </template>
    <div
      v-for="(item, i) in data"
      v-else
      :key="i"
      data-array-item
      class="flex min-w-0 gap-2 rounded-lg"
    >
      <BaseSecondaryButton
        type="button"
        class="cursor-grab touch-none px-3 active:cursor-grabbing"
        data-drag-handle
        :aria-label="$t('common.actions.reorder')"
        :title="$t('common.actions.reorder')"
        aria-keyshortcuts="ArrowUp ArrowDown"
        :disabled="(data?.length ?? 0) < 2"
        @keydown.up.prevent="move(i, i - 1)"
        @keydown.down.prevent="move(i, i + 1)"
      >
        <GripVerticalIcon class="size-4" aria-hidden="true" />
      </BaseSecondaryButton>
      <input
        :value="item"
        :name="name"
        type="text"
        :aria-label="`${name} ${i + 1}`"
        class="ui-input"
        @input="update($event, i)"
      />
      <BaseSecondaryButton
        type="button"
        :aria-label="$t('common.actions.delete')"
        @click="del(i)"
      >
        <MinusIcon class="size-4" aria-hidden="true" />
      </BaseSecondaryButton>
    </div>
    <div class="mt-2">
      <BasePrimaryButton type="button" @click="add">
        {{ $t('common.actions.add') }}
      </BasePrimaryButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { GripVerticalIcon, MinusIcon } from '@lucide/vue';
import {
  moveArrayElement,
  useSortable,
} from '@vueuse/integrations/useSortable';

const data = defineModel<string[]>();
defineProps<{ emptyText?: string[]; name: string }>();

const list = useTemplateRef('list');
const items = computed({
  get: () => data.value ?? [],
  set: (value: string[]) => {
    data.value = value;
  },
});

useSortable(list, items, {
  draggable: '[data-array-item]',
  handle: '[data-drag-handle]:not(:disabled)',
  ghostClass: 'opacity-50',
  animation: 150,
});

function update(event: Event, index: number) {
  const value = (event.target as HTMLInputElement).value;
  data.value = data.value?.map((item, i) => (i === index ? value : item));
}

function add() {
  if (data.value) data.value = [...data.value, ''];
}

async function move(index: number, target: number) {
  if (target < 0 || target >= items.value.length) {
    return;
  }
  moveArrayElement(items, index, target);
  await nextTick();
  list.value
    ?.querySelectorAll<HTMLButtonElement>('[data-drag-handle]')
    [target]?.focus();
}

function del(index: number) {
  data.value = data.value?.filter((_, i) => i !== index);
}
</script>
