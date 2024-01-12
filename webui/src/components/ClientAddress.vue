<!-- EditableAddress.vue -->
<template>
    <span class="group block md:inline-block pb-1 md:pb-0">
        <!-- Show -->
        <input
            v-show="editAddressId === client.id"
            v-model="editAddress"
            @keyup.enter="updateAddress"
            @keyup.escape="cancelEdit"
            :test="'client-' + client.id + '-address'"
            :ref="'client-' + client.id + '-address'"
            class="rounded border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-600 focus:border-gray-200 dark:focus:border-neutral-500 outline-none w-20 text-black dark:text-neutral-300 dark:placeholder:text-neutral-500"
        />
        <span v-show="editAddressId !== client.id" class="inline-block border-t-2 border-b-2 border-transparent">{{
            client.address
        }}</span>

        <!-- Edit -->
        <span
            v-show="editAddressId !== client.id"
            @click="edit"
            class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        >
            <IconEdit />
        </span>
    </span>
</template>

<script>
import IconEdit from './icons/IconEdit.vue';

export default {
    props: ["client"],
    data() {
        return {
            editAddress: null,
            editAddressId: null,
        };
    },
    methods: {
        updateAddress() {
            this.$emit("update-address", this.client, this.editAddress);
            this.editAddress = null;
            this.editAddressId = null;
        },
        cancelEdit() {
            this.editAddress = null;
            this.editAddressId = null;
        },
        edit() {
            this.editAddress = this.client.address;
            this.editAddressId = this.client.id;
            this.$nextTick(() => {
                this.$refs["client-" + this.client.id + "-address"].select();
            });
        },
    },
    components: { IconEdit }
};
</script>
