<script>
import { useDateTime } from '../composables/useDateTime';
import IconEdit from './icons/IconEdit.vue';

export default {
  props: ['client', 'clientEditName', 'clientEditNameId'],
  setup() {
    const { dateTime } = useDateTime();
    return {
      dateTime,
      // other reactive properties
    };
  },
  methods: {
    updateClientName() {
      this.$emit('update-client-name', this.client, this.clientEditName);
      this.clientEditName = null;
      this.clientEditNameId = null;
    },
    cancelEdit() {
      this.clientEditName = null;
      this.clientEditNameId = null;
    },
    editName() {
      this.clientEditName = this.client.name;
      this.clientEditNameId = this.client.id;
      this.$nextTick(() => {
        this.$refs['client-' + this.client.id + '-name'][0].select();
      });
    },
  },
  components: { IconEdit },
};
</script>
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
      @keyup.enter="updateClientName"
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
      @click="editName"
      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <IconEdit />
    </span>
  </div>
</template>
