import type { Config } from 'tailwindcss';

export default {
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
  plugins: [
    function addDisabledClass({ addUtilities }) {
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
