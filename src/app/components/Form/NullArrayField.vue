<template>
  <div class="col-span-full flex min-w-0 flex-col gap-2">
    <div v-if="data === null">
      {{ emptyText || $t('form.nullNoItems') }}
    </div>
    <div v-for="(item, i) in data" v-else :key="i">
      <div class="flex min-w-0 gap-2">
        <input
          :value="item"
          :name="name"
          type="text"
          :aria-label="`${name} ${i + 1}`"
          class="ui-input"
          @input="update($event, i)"
        />
        <BaseSecondaryButton
          type="button"
          class="rounded-lg"
          :aria-label="$t('client.delete')"
          @click="del(i)"
        >
          {{ '-' }}
        </BaseSecondaryButton>
      </div>
    </div>
    <div class="mt-2">
      <BasePrimaryButton type="button" class="rounded-lg" @click="add">
        {{ $t('form.add') }}
      </BasePrimaryButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
const data = defineModel<string[] | null>();
defineProps<{ emptyText?: string[]; name: string }>();

function update(e: Event, i: number) {
  const v = (e.target as HTMLInputElement).value;
  if (!data.value) {
    return;
  }
  data.value[i] = v;
}

function add() {
  if (data.value === undefined) {
    return;
  }
  if (data.value === null) {
    data.value = [''];
  } else {
    data.value.push('');
  }
}

function del(i: number) {
  if (!data.value) {
    return;
  }
  data.value.splice(i, 1);
  if (data.value.length === 0) {
    data.value = null;
  }
}
</script>
