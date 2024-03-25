<!-- EditableAddress.vue -->
<template>
  <span class="group">
    <!-- Show -->
    <input
      v-show="editAddressId === client.id"
      :ref="'client-' + client.id + '-address'"
      v-model="editAddress"
      class="rounded border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 outline-none w-20 text-black dark:text-neutral-300 dark:placeholder:text-neutral-500"
      @keyup.enter="updateAddress"
      @keyup.escape="cancelEdit"
    />
    <span v-show="editAddressId !== client.id" class="inline-block">{{ client.address }}</span>

    <!-- Edit -->
    <span
      v-show="editAddressId !== client.id"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
      @click="edit"
    >
      <IconEdit />
    </span>
  </span>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import IconEdit from './icons/IconEdit.vue';
import api from '@/services/apiInstance';

const props = defineProps({
  client: {
    type: Object,
    required: true,
  },
});
const editAddress = ref(null);
const editAddressId = ref(null);

const updateAddress = () => {
  api.updateClientAddress({
    clientId: editAddressId.value,
    address: editAddress.value,
  });

  editAddress.value = null;
  editAddressId.value = null;
};

const cancelEdit = () => {
  editAddress.value = null;
  editAddressId.value = null;
};

const edit = () => {
  editAddress.value = props.client.address;
  editAddressId.value = props.client.id;

  // ? remove this ?
  nextTick(() => {
    const clientAddressRef = ['client-' + props.client.id + '-address'];
    if (clientAddressRef.value) {
      clientAddressRef.value.select();
    }
  });
};
</script>
