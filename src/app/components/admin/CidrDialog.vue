<template>
  <DialogRoot :modal="true">
    <DialogTrigger :class="triggerClass"><slot /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay
        class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-gray-500 opacity-75 dark:bg-black dark:opacity-50"
      />
      <DialogContent
        class="data-[state=open]:animate-contentShow fixed left-1/2 top-1/2 z-[100] max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md p-6 shadow-2xl focus:outline-none dark:bg-neutral-700"
      >
        <DialogTitle
          class="m-0 text-lg font-semibold text-gray-900 dark:text-neutral-200"
        >
          Change CIDR
        </DialogTitle>
        <DialogDescription
          class="mb-5 mt-2 text-sm leading-normal text-gray-500 dark:text-neutral-300"
        >
          <FormGroup>
            <FormTextField id="ipv4Cidr" v-model="ipv4Cidr" label="IPv4" />
            <FormTextField id="ipv6Cidr" v-model="ipv6Cidr" label="IPv6" />
          </FormGroup>
        </DialogDescription>
        <div class="mt-6 flex justify-end gap-2">
          <DialogClose as-child>
            <BaseButton>{{ $t('cancel') }}</BaseButton>
          </DialogClose>
          <DialogClose as-child>
            <BaseButton @click="$emit('change', ipv4Cidr, ipv6Cidr)"
              >Change</BaseButton
            >
          </DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
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
