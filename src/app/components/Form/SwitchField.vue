<template>
  <div class="flex items-center">
    <Label :for="id" class="font-semibold md:align-middle md:leading-10">
      {{ label }}
    </Label>
    <BaseTooltip v-if="description" :text="description">
      <IconsInfo class="size-4" />
    </BaseTooltip>
  </div>
  <BaseSwitch :id="id" v-model="data" />
</template>

<script lang="ts" setup>
defineProps<{ id: string; label: string; description?: string }>();
const data = defineModel<boolean>();
</script>
