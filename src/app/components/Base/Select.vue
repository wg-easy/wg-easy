<template>
  <SelectRoot v-model="selected">
    <SelectTrigger
      class="ui-input inline-flex items-center justify-between gap-2"
      :aria-label="$t('ui.chooseOption')"
    >
      <SelectValue :placeholder="$t('ui.chooseOption')" /><IconsArrowDown
        class="size-3"
      />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="ui-menu min-w-40"
        position="popper"
        :side-offset="6"
      >
        <SelectViewport>
          <SelectItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            class="ui-menu-item"
          >
            <SelectItemText
              >{{ option.value }} - {{ option.label }}</SelectItemText
            >
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script lang="ts" setup>
defineProps<{
  options: { label: string; value: string }[];
}>();
const selected = defineModel<string>();
</script>
