<!-- ClientNewButton.vue -->
<template>
    <div class="flex flex-row flex-auto items-center p-3 px-5 border-b-2 border-gray-100 dark:border-neutral-600">
        <div class="flex-grow">
            <p class="text-2xl font-medium dark:text-neutral-200">Clients</p>
        </div>
        <div class="flex-shrink-0">
            <button
                @click="createNewClient"
                class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 border-2 border-gray-100 dark:border-neutral-600 py-2 px-4 rounded inline-flex items-center transition"
            >
                <IconNew class="w-4 mr-2" />
                <span class="text-sm">New</span>
            </button>
        </div>
    </div>
</template>

<script>
import IconNew from './icons/IconNew.vue';

export default {
    methods: {
        createNewClient() {
            this.$emit("create-new-client");
        },
    },
    components: { IconNew }
};
</script>
