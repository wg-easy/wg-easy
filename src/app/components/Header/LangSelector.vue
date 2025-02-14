<template>
  <SelectRoot v-model="langProxy" :default-value="locale">
    <SelectTrigger
      class="inline-flex h-8 items-center justify-around gap-2 rounded bg-gray-200 px-3 text-sm leading-none dark:bg-neutral-700 dark:text-neutral-400"
      aria-label="Select language"
    >
      <IconsLanguage class="size-3" />
      <SelectValue />
      <IconsArrowDown class="size-3" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="min-w-28 rounded bg-gray-300 dark:bg-neutral-500"
        position="popper"
      >
        <SelectViewport class="p-2">
          <SelectItem
            v-for="(option, index) in langs"
            :key="index"
            :value="option.code"
            class="relative flex h-6 items-center rounded px-3 text-sm leading-none outline-none hover:bg-red-800 hover:text-white data-[state=checked]:underline dark:text-white"
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
const { locales, locale, setLocale } = useI18n();

const langProxy = ref(locale);

watchEffect(() => {
  setLocale(langProxy.value);
});

const langs = locales.value.sort((a, b) => a.code.localeCompare(b.code));
</script>
