<template>
  <div
    class="col-span-2 rounded border border-gray-100 bg-gray-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"
  >
    <i18n-t
      :keypath="messageKey"
      tag="p"
      class="font-medium text-gray-700 dark:text-neutral-100"
    >
      <template #groups>
        <template v-for="(group, index) in groups" :key="group.id">
          <span v-if="index > 0">, </span>
          <NuxtLink
            :to="`/groups/${group.id}`"
            class="text-red-800 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-red-800 dark:text-red-400"
          >
            {{ group.name }}
          </NuxtLink>
        </template>
      </template>
    </i18n-t>
    <p
      v-if="value.length === 0"
      class="mt-1 text-gray-500 dark:text-neutral-300"
    >
      {{ $t('form.noItems') }}
    </p>
    <ul
      v-else
      class="mt-2 space-y-1 break-all text-gray-600 dark:text-neutral-200"
    >
      <li v-for="entry in value" :key="entry">
        {{ entry }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  messageKey: string;
  groups: { id: number; name: string }[];
  value: string[];
}>();
</script>
