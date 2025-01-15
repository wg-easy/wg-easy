<template>
  <SelectRoot v-model="langProxy" :default-value="locale">
    <SelectTrigger
      class="inline-flex h-[35px] min-w-[160px] items-center justify-between gap-[5px] rounded px-[15px] text-[13px] leading-none dark:bg-neutral-500 dark:text-white"
      aria-label="Customize language"
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
// TODO: improve

const { locales, locale, setLocale } = useI18n();

const langProxy = ref(locale);

watchEffect(() => {
  setLocale(langProxy.value);
});

const langs = locales.value.sort((a, b) => a.code.localeCompare(b.code));
</script>
