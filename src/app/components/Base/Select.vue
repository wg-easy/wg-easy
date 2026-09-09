<template>
  <SelectRoot v-model="selected">
    <SelectTrigger
      class="inline-flex h-8 items-center justify-around gap-2 rounded bg-gray-200 px-3 text-sm leading-none dark:bg-neutral-500 dark:text-neutral-200"
      aria-label="Choose option"
    >
      <SelectValue placeholder="Select..." />
      <IconsArrowDown class="size-3" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        :side-offset="5"
        class="z-[100] min-w-32 overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-700 shadow-xl dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="(option, index) in options"
            :key="index"
            :value="option.value"
            class="relative flex h-8 cursor-pointer items-center rounded px-3 text-sm leading-none outline-none hover:bg-red-800 hover:text-white"
          >
            <SelectItemText>
              {{
                hideValue ? option.label : `${option.value} - ${option.label}`
              }}
            </SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script lang="ts" setup>
defineProps<{
  options: { label: string; value: string }[];
  hideValue?: boolean;
}>();
const selected = defineModel<string>();
</script>
