import type { Config } from 'tailwindcss';
import tailwindForms from '@tailwindcss/forms';

export default {
  darkMode: 'selector',
  content: [],
  theme: {
    screens: {
      xxs: '450px',
      xs: '576px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  plugins: [tailwindForms],
} satisfies Config;
