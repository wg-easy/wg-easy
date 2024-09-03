<template>
  <BaseButton as="label" for="inputRC" :title="$t('titleRestoreConfig')">
    <IconsArrowInf class="w-4 md:mr-2" />
    <span class="max-md:hidden text-sm">{{ $t('restore') }}</span>
    <input
      id="inputRC"
      type="file"
      name="configurationfile"
      accept="text/*,.json"
      class="hidden"
      @change="restoreConfig"
    />
  </BaseButton>
</template>

<script setup lang="ts">
function restoreConfig(e: Event) {
  e.preventDefault();
  const file = (e.currentTarget as HTMLInputElement).files?.item(0);
  if (file) {
    file
      .text()
      .then((content) => {
        api
          .restoreConfiguration(content)
          .then(() => alert('The configuration was updated.'))
          .catch((err) => alert(err.message || err.toString()));
      })
      .catch((err) => alert(err.message || err.toString()));
  } else {
    alert('Failed to load your file!');
  }
}
</script>
