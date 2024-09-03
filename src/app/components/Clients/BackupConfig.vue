<template>
  <BaseButton
    as="a"
    href="./api/wireguard/backup"
    :title="$t('titleBackupConfig')"
  >
    <IconsStack class="w-4 md:mr-2" />
    <span class="max-md:hidden text-sm">{{ $t('backup') }}</span>
  </BaseButton>
</template>
