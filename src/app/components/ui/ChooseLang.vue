<template>
  <SelectRoot v-model="langProxy" :default-value="locale">
    <SelectTrigger
      class="inline-flex h-[35px] min-w-[160px] items-center justify-between gap-[5px] rounded px-[15px] text-[13px] leading-none dark:bg-neutral-500 dark:text-white"
      aria-label="Customise language"
    >
      <SelectValue :placeholder="$t('setup.chooseLang')" />
      <IconsArrowDown class="size-4" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="min-w-[160px] rounded bg-white dark:bg-neutral-500"
        :side-offset="5"
      >
        <SelectViewport class="p-[5px]">
          <SelectItem
            v-for="(option, index) in langs"
            :key="index"
            :value="option.code"
            class="text-grass11 relative flex h-[25px] items-center rounded-[3px] pl-[25px] pr-[35px] text-[13px] leading-none hover:bg-red-800 hover:text-white dark:text-white"
          >
            <SelectItemText>
              {{ option.name }}
            </SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script setup lang="ts">
import { LOCALES } from '#shared/locales';

const { locale } = useI18n();
const emit = defineEmits(['update:lang']);

const langProxy = ref(locale);

watch(langProxy, (newVal) => {
  emit('update:lang', newVal);
});

const langs = LOCALES.sort((a, b) => a.code.localeCompare(b.code));
</script>
