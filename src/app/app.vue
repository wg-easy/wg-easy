<template>
  <ToastProvider>
    <NuxtLayout>
      <NuxtPage />
      <ToastViewport
        class="fixed bottom-0 right-0 z-[2147483647] m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-[10px] p-[var(--viewport-padding)] outline-none [--viewport-padding:_25px]"
      >
        <BaseToast ref="toastRef" />
      </ToastViewport>
    </NuxtLayout>
  </ToastProvider>
</template>

<script setup lang="ts">
const toast = useToast();
const toastRef = useTemplateRef('toastRef');
toast.setToast(toastRef);

// make sure to fetch release early
useGlobalStore();

useHead({
  bodyAttrs: {
    class: 'bg-gray-50 dark:bg-neutral-800',
  },
  // FOUC fix. @eschricht/nuxt-color-mode deliberately returns `undefined` from
  // useClientPreferredColorScheme() during hydration to avoid Vue hydration
  // warnings — which means it can't set <html class> in time for first paint,
  // and on cookie changes can transiently emit an empty class. This inline
  // blocking script does both jobs the library skips: sets the class before
  // paint, and re-applies it whenever something else writes a different value.
  script: [
    {
      tagPriority: 'critical',
      innerHTML: `(function(){try{function resolve(){var m=document.cookie.match(/(?:^|;\\s*)theme=([^;]+)/);var p=m?decodeURIComponent(m[1]):'system';if(p==='dark')return 'dark';if(p==='light')return 'light';return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var h=document.documentElement;function apply(){var w=resolve();if(h.className!==w)h.className=w;}apply();new MutationObserver(apply).observe(h,{attributes:true,attributeFilter:['class']});matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);}catch(e){}})();`,
    },
  ],
  link: [
    {
      rel: 'manifest',
      href: '/manifest.json',
    },
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon.png',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
    },
  ],
  meta: [
    {
      name: 'mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'black-translucent',
    },
  ],
  title: 'WireGuard',
});
</script>
