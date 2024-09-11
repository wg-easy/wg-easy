<template>
  <div class="flex flex-col">
    <div v-for="feature in featuresData" :key="feature.name" class="space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-neutral-200">
            {{ feature.name }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-neutral-300">
            {{ feature.description }}
          </p>
        </div>
        <SwitchRoot
          :checked="feature.enabled"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800"
          :class="feature.enabled ? 'bg-red-800' : 'bg-gray-200'"
          @update:checked="toggleFeature(feature)"
        >
          <SwitchThumb
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="feature.enabled ? 'translate-x-6' : 'translate-x-1'"
          />
        </SwitchRoot>
      </div>
    </div>
    <BaseButton class="self-end">Save</BaseButton>
  </div>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();

const featuresData = ref([
  {
    name: 'Traffic Stats',
    description: 'Show more detailed Statistics about Client Traffic',
    enabled: globalStore.features.trafficStats.enabled,
  },
  {
    name: 'Sort Clients',
    description: 'Be able to sort Clients by Name',
    enabled: globalStore.features.sortClients.enabled,
  },
  {
    name: 'One Time Links',
    description: 'Be able to generate One Time Link to download Config',
    enabled: globalStore.features.oneTimeLinks.enabled,
  },
  {
    name: 'Client Expiration',
    description: 'Be able to set Date when Client will be disabled',
    enabled: globalStore.features.clientExpiration.enabled,
  },
]);

function toggleFeature(feature: (typeof featuresData)['value'][number]) {
  const feat = featuresData.value.find((v) => v.name === feature.name);
  if (!feat) {
    return;
  }
  feat.enabled = !feat.enabled;
}
</script>
