<template>
  <div
    class="text-gray-700 dark:text-neutral-200 group text-sm md:text-base"
    :title="$t('createdOn') + dateTime(new Date(client.createdAt))"
  >
    <!-- Input -->
    <input
      v-show="clientEditNameId === client.id"
      :ref="'client-' + client.id + '-name'"
      v-model="clientEditName"
      class="rounded px-1 border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 dark:placeholder:text-neutral-500 outline-none w-full"
      @keyup.escape="cancelEdit"
      @keyup.enter="handleInputSubmit"
    />
    <span v-show="clientEditNameId !== client.id" class="border-transparent">{{ client.name }}</span>

    <!-- Button -->
    <span
      v-show="clientEditNameId !== client.id"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity px-1 py-1"
      @click="handleEditClick"
    >
      <IconEdit />
    </span>
  </div>

  <!-- <div class="text-gray-700 dark:text-neutral-200 group" :title="'Created on ' + dateTime(new Date(client.createdAt))">
    <input
      v-show="clientEditNameId === client.id"
      :ref="'client-' + client.id + '-name'"
      :value="clientEditName"
      class="rounded px-1 border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 dark:placeholder:text-neutral-500 outline-none w-30"
      @input="clientEditName = $event.target.value"
      @keyup.enter="updateName(client)"
      @keyup.escape="cancelEdit"
    />
    <span v-show="clientEditNameId !== client.id" class="inline-block border-t-2 border-b-2 border-transparent">{{
      client.name
    }}</span>

    <span
      v-show="clientEditNameId !== client.id"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
      @click="editName(client)"
    >
      <IconEdit />
    </span>
  </div> -->
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useDateTime } from '../composables/useDateTime';
import IconEdit from './icons/IconEdit.vue';
import API from '@/services/api';
import { useStore } from '@/store/store';

const props = defineProps({
  client: {
    type: Object,
    required: true,
  },
});

const store = useStore();

const { dateTime } = useDateTime();

const clientEditName = ref(null);
const clientEditNameId = ref(null);

const api = new API();

const cancelEdit = () => {
  clientEditName.value = null;
  clientEditNameId.value = null;
};

const handleInputSubmit = () => {
  updateClientName();
  clientEditName.value = null;
  clientEditNameId.value = null;
};

const handleEditClick = () => {
  clientEditName.value = props.client.name;
  clientEditNameId.value = props.client.id;
  nextTick(() => {
    const clientNameRef = ['client-' + props.client.id + '-name'];

    if (clientNameRef.value) {
      clientNameRef.value[0].select();
    }
  });
};

function updateClientName() {
  api
    .updateClientName({ clientId: props.client.id, name: clientEditName.value })
    .catch((err) => alert(err.message || err.toString()))
    .finally(() => store.refresh());
}
</script>
