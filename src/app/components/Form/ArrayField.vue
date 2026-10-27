<template>
  <div class="col-span-full flex min-w-0 flex-col gap-2">
    <template v-if="data?.length === 0">
      <slot v-if="$slots.empty" name="empty" />
      <div v-else>{{ emptyText || $t('form.noItems') }}</div>
    </template>
    <div v-for="(item, i) in data" v-else :key="i">
      <div class="flex min-w-0 gap-2">
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
          class="px-3"
          :aria-label="$t('form.moveUp')"
          :title="$t('form.moveUp')"
          :disabled="i === 0"
          @click="move(i, -1)"
        >
          <ArrowUpIcon class="size-4" aria-hidden="true" />
        </BaseSecondaryButton>
        <BaseSecondaryButton
          type="button"
          class="px-3"
          :aria-label="$t('form.moveDown')"
          :title="$t('form.moveDown')"
          :disabled="i === (data?.length ?? 0) - 1"
          @click="move(i, 1)"
        >
          <ArrowDownIcon class="size-4" aria-hidden="true" />
        </BaseSecondaryButton>
        <BaseSecondaryButton
          type="button"
          :aria-label="$t('client.delete')"
          @click="del(i)"
        >
          <MinusIcon class="size-4" aria-hidden="true" />
        </BaseSecondaryButton>
      </div>
    </div>
    <div class="mt-2">
      <BasePrimaryButton type="button" @click="add">
        {{ $t('form.add') }}
      </BasePrimaryButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from '@lucide/vue';

const data = defineModel<string[]>();
defineProps<{ emptyText?: string[]; name: string }>();

function update(event: Event, index: number) {
  const value = (event.target as HTMLInputElement).value;
  data.value = data.value?.map((item, i) => (i === index ? value : item));
}

function add() {
  if (data.value) data.value = [...data.value, ''];
}

function move(i: number, direction: -1 | 1) {
  const target = i + direction;
  const items = data.value?.slice();
  if (!items || target < 0 || target >= items.length) {
    return;
  }
  const item = items[i];
  if (item === undefined) {
    return;
  }
  items.splice(i, 1);
  items.splice(target, 0, item);
  data.value = items;
}

function del(index: number) {
  data.value = data.value?.filter((_, i) => i !== index);
}
</script>
