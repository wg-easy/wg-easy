<template>
  <p class="m-10 text-center text-sm text-gray-400 dark:text-neutral-400">
    {{ $t('noClients') }}<br /><br />
    <ClientsCreateDialog>
      <BaseButton>
        <IconsPlus class="w-4 md:mr-2" />
        <span class="text-sm">{{ $t('new') }}</span>
      </BaseButton>
    </ClientsCreateDialog>
  </p>
</template>
