<template>
  <FormActions>
    <BaseSecondaryButton type="button" @click="$emit('revert')">
      {{ $t('form.revert') }}
    </BaseSecondaryButton>
    <BasePrimaryButton type="submit">
      {{ $t('form.save') }}
    </BasePrimaryButton>
  </FormActions>
</template>

<script setup lang="ts">
defineEmits<{ revert: [] }>();
</script>
