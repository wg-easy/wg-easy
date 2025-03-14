<template>
  <SelectRoot v-model="selected">
    <SelectTrigger
      class="text-grass11 hover:bg-mauve3 data-[placeholder]:text-green9 inline-flex h-[35px] min-w-[160px] items-center justify-between gap-[5px] rounded bg-white px-[15px] text-[13px] leading-none shadow-[0_2px_10px] shadow-black/10 outline-none focus:shadow-[0_0_0_2px] focus:shadow-black"
      aria-label="Customise options"
    >
      <SelectValue placeholder="Select..." />
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
          <Icon icon="radix-icons:chevron-up" />
        </SelectScrollUpButton>

        <SelectViewport class="p-[5px]">
          <SelectItem
            v-for="(option, index) in options"
            :key="index"
            class="text-grass11 data-[disabled]:text-mauve8 data-[highlighted]:bg-green9 data-[highlighted]:text-green1 relative flex h-[25px] select-none items-center rounded-[3px] pl-[25px] pr-[35px] text-[13px] leading-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none"
            :value="option.value"
          >
            <SelectItemIndicator
              class="absolute left-0 inline-flex w-[25px] items-center justify-center"
            >
              <Icon icon="radix-icons:check" />
            </SelectItemIndicator>
            <SelectItemText>
              {{ option.value }} - {{ option.label }}
            </SelectItemText>
          </SelectItem>
        </SelectViewport>

        <SelectScrollDownButton
          class="text-violet11 flex h-[25px] cursor-default items-center justify-center bg-white"
        >
          <Icon icon="radix-icons:chevron-down" />
        </SelectScrollDownButton>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<script lang="ts" setup>
defineProps<{
  options: { label: string; value: string }[];
}>();
const selected = defineModel<string>();
</script>
