<template>
  <SelectRoot v-model="selected" :disabled="disabled">
    <SelectTrigger
      v-bind="$attrs"
      :aria-label="label ?? $t('ui.chooseOption')"
      class="inline-flex min-w-0 items-center justify-between gap-2 text-left"
      :class="
        compact
          ? 'h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-foreground'
          : 'ui-input bg-surface'
      "
    >
      <SelectValue class="truncate">
        {{
          selectedOption ? optionText(selectedOption) : $t('ui.chooseOption')
        }}
      </SelectValue>
      <SelectIcon as-child>
        <ChevronDownIcon class="size-3.5 shrink-0 text-subtle" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="ui-menu min-w-(--reka-select-trigger-width)"
        position="popper"
        :side-offset="6"
        :collision-padding="8"
      >
        <SelectViewport>
          <SelectItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :text-value="optionText(option)"
            class="ui-menu-item justify-between data-[state=checked]:text-accent"
          >
            <SelectItemText>{{ optionText(option) }}</SelectItemText>
            <SelectItemIndicator>
              <CheckIcon class="size-4" aria-hidden="true" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script lang="ts" setup generic="T extends string | number">
import { CheckIcon, ChevronDownIcon } from '@lucide/vue';

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    options: { label: string; value: T }[];
    label?: string;
    compact?: boolean;
    showValue?: boolean;
    disabled?: boolean;
  }>(),
  { label: undefined, showValue: true }
);
const selected = defineModel<T>();
const selectedOption = computed(() =>
  props.options.find((option) => option.value === selected.value)
);

function optionText(option: { label: string; value: T }) {
  return props.showValue ? `${option.value} - ${option.label}` : option.label;
}
</script>
