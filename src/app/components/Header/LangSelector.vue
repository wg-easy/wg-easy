<template>
  <SelectRoot v-model="langProxy" :default-value="locale">
    <SelectTrigger
      class="header-control group max-w-36 px-2.5"
      :aria-label="$t('ui.selectLanguage')"
    >
      <LanguagesIcon class="size-4" />
      <span class="hidden truncate sm:inline"><SelectValue /></span>
      <span class="uppercase sm:hidden">{{ locale }}</span>
      <ArrowDownIcon
        class="size-3 transition-transform group-data-[state=open]:rotate-180"
      />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="ui-menu min-w-44"
        position="popper"
        :side-offset="8"
      >
        <SelectViewport>
          <SelectItem
            v-for="option in langs"
            :key="option.code"
            :value="option.code"
            class="ui-menu-item data-[state=checked]:text-accent"
          >
            <SelectItemText>{{ option.name }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script setup lang="ts">
import { ArrowDownIcon, LanguagesIcon } from '@lucide/vue';

const { locales, locale, setLocale } = useI18n();

const langProxy = computed({
  get: () => locale.value,
  set: (value) => setLocale(value),
});

const langs = locales.value.sort((a, b) => a.code.localeCompare(b.code));
</script>
