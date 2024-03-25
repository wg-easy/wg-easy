import './assets/style.css';

import App from './App.vue';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { createPinia } from 'pinia';
import { messages } from '@/utils/i18n';
import timeago from 'vue-timeago3';

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('lang') || 'en',
  allowComposition: true,
  fallbackLocale: 'en',
  messages,
});

const pinia = createPinia();

const timeagoOptions = {
  converterOptions: {
    includeSeconds: false,
    addSuffix: true,
  },
};

const app = createApp(App);
app.use(i18n);
app.use(pinia);
app.use(timeago, timeagoOptions);
app.mount('#app');
