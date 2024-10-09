<template>
  <div>
    <p class="text-lg p-8 text-center">
      {{ $t('setup.messageSetupValidation') }}
    </p>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['validated']);

const props = defineProps<{
  next: boolean;
}>();

const next = toRef(props, 'next');

watch(next, (newVal) => {
  if (newVal) {
    emit('validated', null);
  }
});
</script>
