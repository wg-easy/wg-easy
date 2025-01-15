<template>
  <div v-if="data?.length === 0">
    {{ emptyText || 'No items' }}
  </div>
  <div v-else class="flex flex-col">
    <div v-for="(item, i) in data" :key="i">
      <input
        :value="item"
        :name="name"
        type="text"
        class="rounded-lg border-2 border-gray-100 text-gray-500 focus:border-red-800 focus:outline-0 focus:ring-0 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
        @input="update($event, i)"
      />
      <input type="button" value="-" @click="del(i)" />
    </div>
  </div>
  <input type="button" value="Add" @click="add" />
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
