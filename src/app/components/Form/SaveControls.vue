<template>
  <FormActions>
    <BaseSecondaryButton type="button" @click="$emit('revert')">
      {{ $t('common.actions.revert') }}
    </BaseSecondaryButton>
    <BasePrimaryButton type="submit">
      {{ $t('common.actions.save') }}
    </BasePrimaryButton>
  </FormActions>
</template>

<script setup lang="ts">
defineEmits<{ revert: [] }>();
</script>
