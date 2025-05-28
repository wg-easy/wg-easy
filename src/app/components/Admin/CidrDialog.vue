<template>
  <BaseDialog :trigger-class="triggerClass">
    <template #trigger><slot /></template>
    <template #title>{{ $t('admin.interface.changeCidr') }}</template>
    <template #description>
      <FormGroup>
        <FormTextField id="ipv4Cidr" v-model="ipv4Cidr" label="IPv4" />
        <FormTextField id="ipv6Cidr" v-model="ipv6Cidr" label="IPv6" />
      </FormGroup>
    </template>
    <template #actions>
      <DialogClose as-child>
        <BaseSecondaryButton>{{ $t('dialog.cancel') }}</BaseSecondaryButton>
      </DialogClose>
      <DialogClose as-child>
        <BasePrimaryButton @click="$emit('change', ipv4Cidr, ipv6Cidr)">
          {{ $t('dialog.change') }}
        </BasePrimaryButton>
      </DialogClose>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
defineEmits(['change']);
const props = defineProps<{
  triggerClass?: string;
  ipv4Cidr: string;
  ipv6Cidr: string;
}>();

const ipv4Cidr = ref(props.ipv4Cidr);
const ipv6Cidr = ref(props.ipv6Cidr);
</script>
