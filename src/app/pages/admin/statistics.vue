<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-neutral-200">
          Traffic Stats
        </h3>
        <p class="text-sm text-gray-500 dark:text-neutral-300">
          Show more concise Stats about Traffic Usage
        </p>
      </div>
      <SwitchRoot
        v-model:checked="enabled"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-800 focus:ring-offset-2"
        :class="enabled ? 'bg-red-800' : 'bg-gray-200'"
      >
        <SwitchThumb
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="enabled ? 'translate-x-6' : 'translate-x-1'"
        />
      </SwitchRoot>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-neutral-200">
          Chart Type
        </h3>
        <p class="text-sm text-gray-500 dark:text-neutral-300">
          Select Type of Chart you want to show
        </p>
      </div>
      <SelectRoot v-model="chartType">
        <SelectTrigger
          class="text-grass11 hover:bg-mauve3 data-[placeholder]:text-green9 inline-flex h-[35px] min-w-[160px] items-center justify-between gap-[5px] rounded bg-white px-[15px] text-[13px] leading-none shadow-[0_2px_10px] shadow-black/10 outline-none focus:shadow-[0_0_0_2px] focus:shadow-black"
          aria-label="Customize options"
        >
          <SelectValue placeholder="Select a fruit..." />
          <IconsArrowDown class="h-3.5 w-3.5" />
        </SelectTrigger>

        <SelectPortal>
          <SelectContent
            class="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade z-[100] min-w-[160px] rounded bg-white shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform]"
            :side-offset="5"
          >
            <SelectScrollUpButton
              class="text-violet11 flex h-[25px] cursor-default items-center justify-center bg-white"
            >
              <IconsArrowUp />
            </SelectScrollUpButton>
            <SelectViewport class="p-[5px]">
              <SelectItem
                v-for="(option, index) in options"
                :key="index"
                class="text-grass11 data-[disabled]:text-mauve8 data-[highlighted]:bg-green9 data-[highlighted]:text-green1 relative flex h-[25px] select-none items-center rounded-[3px] pl-[25px] pr-[35px] text-[13px] leading-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none"
                :value="option"
              >
                <SelectItemText>
                  {{ option }}
                </SelectItemText>
              </SelectItem>
            </SelectViewport>
            <SelectScrollDownButton
              class="text-violet11 flex h-[25px] cursor-default items-center justify-center bg-white"
            >
              <IconsArrowDown />
            </SelectScrollDownButton>
          </SelectContent>
        </SelectPortal>
      </SelectRoot>
    </div>
    <BaseButton class="self-end" @click="submit">Save</BaseButton>
    <UiToast
      v-model:open="open"
      title="Saved successfully"
      content="Statistics saved successfully"
    />
  </div>
</template>

<script setup lang="ts">
const globalStore = useGlobalStore();
const open = ref(false);
const enabled = ref(globalStore.statistics.enabled);
const options: Record<number, string> = {
  0: 'None',
  1: 'Line',
  2: 'Area',
  3: 'Bar',
};
const stringToIndex = Object.entries(options).reduce(
  (obj, [k, v]) => {
    obj[v] = Number.parseInt(k);
    return obj;
  },
  {} as Record<string, number>
);
const chartType = ref(options[globalStore.statistics.chartType]);

async function submit() {
  const response = await $fetch('/api/admin/statistics', {
    method: 'post',
    body: {
      statistics: {
        enabled: enabled.value,
        chartType: stringToIndex[chartType.value!],
      },
    },
  });
  if (response.success) {
    open.value = true;
  }
  globalStore.fetchStatistics();
}
</script>
