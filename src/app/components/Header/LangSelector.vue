<template>
  <SelectRoot v-model="langProxy" :default-value="locale">
    <SelectTrigger
      class="header-control group max-w-36 px-2.5"
      :aria-label="$t('ui.selectLanguage')"
    >
      <IconsLanguage class="size-4" /><span class="hidden truncate sm:inline"
        ><SelectValue /></span
      ><span class="uppercase sm:hidden">{{ locale }}</span>
      <IconsArrowDown
        class="size-3 transition-transform group-data-[state=open]:rotate-180"
      />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="ui-menu min-w-44"
        position="popper"
        :side-offset="8"
      >
        <SelectViewport
          ><SelectItem
            v-for="option in langs"
            :key="option.code"
            :value="option.code"
            class="ui-menu-item data-[state=checked]:text-accent"
            ><SelectItemText>{{ option.name }}</SelectItemText></SelectItem
          ></SelectViewport
        >
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
