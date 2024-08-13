<template>
  <label
    for="inputRC"
    :title="$t('titleRestoreConfig')"
    class="hover:cursor-pointer hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 max-md:border-r-0 border-2 border-gray-100 dark:border-neutral-600 py-2 px-4 rounded-l-full md:rounded inline-flex items-center transition"
  >
    <svg
      inline
      class="w-4 md:mr-2"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
    <span class="max-md:hidden text-sm">{{ $t('restore') }}</span>
    <input
      id="inputRC"
      type="file"
      name="configurationfile"
      accept="text/*,.json"
      class="hidden"
      @change="restoreConfig"
    />
  </label>
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
