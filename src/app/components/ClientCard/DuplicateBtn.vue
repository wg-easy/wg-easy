<template>
  <ClientCardDuplicateDialog>
    <BaseSecondaryButton class="inline-block rounded bg-gray-100 p-2 align-middle transition hover:bg-red-800 hover:text-white dark:bg-neutral-600 dark:text-neutral-300 dark:hover:bg-red-800 dark:hover:text-white"
    :title="$t('client.duplicate')">
    <IconsDuplicate class="w-5" />
    </BaseSecondaryButton>
  </ClientCardDuplicateDialog>
</template>