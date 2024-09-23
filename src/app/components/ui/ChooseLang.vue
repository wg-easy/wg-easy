<template>
  <SelectRoot v-model="langProxy" :default-value="lang">
    <SelectTrigger
      class="inline-flex min-w-[160px] items-center justify-between rounded px-[15px] text-[13px] dark:text-white leading-none h-[35px] gap-[5px] dark:bg-neutral-500"
      aria-label="Customise language"
    >
      <SelectValue :placeholder="$t('setup.chooseLang')" />
      <IconsArrowDown class="size-4" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="min-w-[160px] bg-white dark:bg-neutral-500 rounded"
        :side-offset="5"
      >
        <SelectViewport class="p-[5px]">
          <SelectItem
            v-for="(option, index) in langs"
            :key="index"
            :value="option.value"
            class="text-[13px] leading-none text-grass11 hover:bg-red-800 dark:text-white hover:text-white rounded-[3px] flex items-center h-[25px] pr-[35px] pl-[25px] relative"
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
import { LOCALES } from '~/../i18n.config';

const { lang } = defineProps<{
  lang: string;
}>();

const langProxy = ref(lang);

const updateLang = defineEmits(['update:lang']);
watch(langProxy, (newVal) => {
  updateLang('update:lang', newVal);
});

const langs = LOCALES.sort((a, b) => a.value.localeCompare(b.value));
</script>
