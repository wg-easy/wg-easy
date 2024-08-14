<template>
  <BaseButton
    as="a"
    href="./api/wireguard/backup"
    :title="$t('titleBackupConfig')"
  >
    <IconsStack />
    <span class="max-md:hidden text-sm">{{ $t('backup') }}</span>
  </BaseButton>
</template>
