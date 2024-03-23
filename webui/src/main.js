import './assets/style.css';

import App from './App.vue';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { createPinia } from 'pinia';
import { messages } from '@/utils/i18n';

const i18n = createI18n({
  locale: localStorage.getItem('lang') || 'en',
  allowComposition: true,
  fallbackLocale: 'en',
  messages,
});
const pinia = createPinia();
createApp(App).use(i18n).use(pinia).mount('#app');
