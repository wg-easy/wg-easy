<template>
  <div class="flex items-center">
    <FormLabel :for="id">
      {{ label }}
    </FormLabel>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <div class="flex gap-1">
    <BaseInput
      :id="id"
      v-model.trim="data"
      :name="id"
      type="text"
      class="w-full"
      :placeholder="placeholder"
    />
    <ClientOnly>
      <AdminSuggestDialog :url="url" @change="data = $event">
        <BasePrimaryButton as="span">
          <div class="flex items-center gap-3">
            <IconsSparkles class="w-4" />
            <span :class="widthClass">{{ $t('admin.config.suggest') }}</span>
          </div>
        </BasePrimaryButton>
      </AdminSuggestDialog>
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

type LocaleCode = 'uk' | 'de' |'zh-CN';

const widthMap: Partial<Record<LocaleCode, string>> & { default: string } = {
  'uk': 'w-28',
  'de': 'w-24',
  'zh-CN':'w-8',
  default: 'w-16',
};

const widthClass = (locale.value in widthMap)
  ? widthMap[locale.value as LocaleCode]
  : widthMap.default;

defineProps<{
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  url: '/api/admin/ip-info' | '/api/setup/4';
}>();

const data = defineModel<string | null>({
  set(value) {
    const temp = value?.trim() ?? null;
    if (temp === '') {
      return null;
    }
    return temp;
  },
});
</script>
