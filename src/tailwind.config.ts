import type { Config } from 'tailwindcss';
import type { PluginAPI } from 'tailwindcss/types/config';
// import { red } from 'tailwindcss/colors.js';

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
    extend: {
      colors: {
        // DEFAULT: red[800],
        // primary: red[800],
      },
    },
  },
  plugins: [
    function addDisabledClass({ addUtilities }: PluginAPI) {
      const newUtilities = {
        '.is-disabled': {
          opacity: '0.25',
          cursor: 'default',
        },
      };
      addUtilities(newUtilities);
    },
  ],
} satisfies Config;
