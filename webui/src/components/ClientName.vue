<template>
  <div
    class="text-gray-700 dark:text-neutral-200 group"
    :title="'Created on ' + dateTime(new Date(client.createdAt))"
  >
    <!-- Show -->
    <input
      v-show="clientEditNameId === client.id"
      :value="clientEditName"
      @input="clientEditName = $event.target.value"
      @keyup.enter="updateName(client)"
      @keyup.escape="cancelEdit"
      :ref="'client-' + client.id + '-name'"
      class="rounded px-1 border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 dark:placeholder:text-neutral-500 outline-none w-30"
    />
    <span
      v-show="clientEditNameId !== client.id"
      class="inline-block border-t-2 border-b-2 border-transparent"
      >{{ client.name }}</span
    >

    <!-- Edit -->
    <span
      v-show="clientEditNameId !== client.id"
      @click="editName(client)"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <IconEdit />
    </span>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useDateTime } from '../composables/useDateTime';
import IconEdit from './icons/IconEdit.vue';
import API from '@/services/api';

defineProps({
  client: {},
})

const { dateTime } = useDateTime();

const clientEditName = ref(null);
const clientEditNameId = ref(null);

const api = new API();

const updateName = (client) => {
  // emit('update-client-name', client, clientEditName);
  updateClientName(client, clientEditName.value);
  clientEditName.value = null;
  clientEditNameId.value = null;
};

const cancelEdit = () => {
  clientEditName.value = null;
  clientEditNameId.value = null;
};

const editName = (client) => {
  console.log(client);

  clientEditName.value = client.name;
  clientEditNameId.value = client.id;
  nextTick(() => {
    const clientNameRef = ['client-' + client.id + '-name'];

    if (clientNameRef.value) {
      clientNameRef.value[0].select()
    }
  });
};

function updateClientName(client, name) {
  api
    .updateClientName({ clientId: client.id, name })
    .catch((err) => alert(err.message || err.toString()));
  // .finally(() => refresh().catch(console.error));
}

function updateClientAddress(client, address) {
  api
    .updateClientAddress({ clientId: client.id, address })
    .catch((err) => alert(err.message || err.toString()));
  // .finally(() => refresh().catch(console.error));
}


// import { useDateTime } from '../composables/useDateTime';
// import IconEdit from './icons/IconEdit.vue';

// export default {
//   props: ['client', 'clientEditName', 'clientEditNameId'],
//   setup() {
//     const { dateTime } = useDateTime();
//     return {
//       dateTime,
//       // other reactive properties
//     };
//   },
//   methods: {
//     updateClientName() {
//       this.$emit('update-client-name', this.client, this.clientEditName);
//       this.clientEditName = null;
//       this.clientEditNameId = null;
//     },
//     cancelEdit() {
//       this.clientEditName = null;
//       this.clientEditNameId = null;
//     },
//     editName() {
//       this.clientEditName = this.client.name;
//       this.clientEditNameId = this.client.id;
//       this.$nextTick(() => {
//         this.$refs['client-' + this.client.id + '-name'][0].select();
//       });
//     },
//   },
//   components: { IconEdit },
// };
</script>
