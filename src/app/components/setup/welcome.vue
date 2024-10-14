<template>
  <div>
    <p class="text-2xl pt-8 px-8 text-center">
      {{ $t('setup.messageWelcome.whatIs') }}
    </p>
    <p class="text-2xl pt-2 text-center text-red-600">
      {{ $t('setup.messageWelcome.warning') }}
    </p>
    <p class="text-2xl pt-3 text-center">
      {{ $t('setup.messageWelcome.next') }}
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
