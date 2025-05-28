<template>
  <div class="flex flex-col gap-2">
    <div v-if="data?.length === 0">
      {{ emptyText || $t('form.noItems') }}
    </div>
    <div v-for="(item, i) in data" v-else :key="i">
      <div class="mt-1 flex flex-row gap-1">
        <input
          :value="item"
          :name="name"
          type="text"
          class="rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
          @input="update($event, i)"
        />
        <BaseSecondaryButton
          as="input"
          type="button"
          class="rounded-lg"
          value="-"
          @click="del(i)"
        />
      </div>
    </div>
    <div class="mt-2">
      <BasePrimaryButton
        as="input"
        type="button"
        class="rounded-lg"
        :value="$t('form.add')"
        @click="add"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
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

function del(i: number) {
  if (!data.value) {
    return;
  }
  data.value.splice(i, 1);
}
</script>
