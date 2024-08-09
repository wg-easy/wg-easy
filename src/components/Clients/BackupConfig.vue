<template>
  <a
    href="./api/wireguard/backup"
    :title="$t('titleBackupConfig')"
    class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-neutral-200 max-md:border-x-0 border-2 border-gray-100 dark:border-neutral-600 py-2 px-4 md:rounded inline-flex items-center transition"
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
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
      />
    </svg>
    <span class="max-md:hidden text-sm">{{ $t('backup') }}</span>
  </a>
</template>

<script setup lang="ts"></script>
