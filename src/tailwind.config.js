/** @type {import('tailwindcss').Config} */

'use strict';

module.exports = {
  darkMode: 'media',
  content: ['./www/**/*.{html,js}'],
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
};
