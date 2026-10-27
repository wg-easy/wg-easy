<template>
  <div class="col-span-full flex min-w-0 flex-col gap-2">
    <div v-if="data?.length === 0">
      {{ emptyText || $t('form.noItems') }}
    </div>
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
          class="rounded-lg px-3"
          :aria-label="$t('form.moveUp')"
          :title="$t('form.moveUp')"
          :disabled="i === 0"
          @click="move(i, -1)"
        >
          <ArrowUpIcon class="size-4" aria-hidden="true" />
        </BaseSecondaryButton>
        <BaseSecondaryButton
          type="button"
          class="rounded-lg px-3"
          :aria-label="$t('form.moveDown')"
          :title="$t('form.moveDown')"
          :disabled="i === (data?.length ?? 0) - 1"
          @click="move(i, 1)"
        >
          <ArrowDownIcon class="size-4" aria-hidden="true" />
        </BaseSecondaryButton>
        <BaseSecondaryButton
          type="button"
          class="rounded-lg"
          :aria-label="$t('client.delete')"
          @click="del(i)"
        >
          <MinusIcon class="size-4" aria-hidden="true" />
        </BaseSecondaryButton>
      </div>
    </div>
    <div class="mt-2">
      <BasePrimaryButton type="button" class="rounded-lg" @click="add">
        {{ $t('form.add') }}
      </BasePrimaryButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from '@lucide/vue';

const data = defineModel<string[]>();
defineProps<{ emptyText?: string[]; name: string }>();

function update(e: Event, i: number) {
  const v = (e.target as HTMLInputElement).value;
  if (!data.value) {
    return;
  }
  data.value[i] = v;
}

function add() {
  data.value?.push('');
}

function move(i: number, direction: -1 | 1) {
  const target = i + direction;
  const items = data.value;
  if (!items || target < 0 || target >= items.length) {
    return;
  }
  const item = items[i];
  if (item === undefined) {
    return;
  }
  items.splice(i, 1);
  items.splice(target, 0, item);
}

function del(i: number) {
  if (!data.value) {
    return;
  }
  data.value.splice(i, 1);
}
</script>
