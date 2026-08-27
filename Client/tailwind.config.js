/** @type {import('tailwindcss').Config} */
const brandPalette = require('./src/config/brandPalette.json');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // scans JavaScript and TypeScript files in the src folder
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        opensans: ['"Open Sans"', 'sans-serif'],
      },
      colors: {
        brand: brandPalette.brand,
        'brand-accent': brandPalette.brandAccent,
        'brand-dark': brandPalette.brandDark,
      },
      // Named stacking-order scale — replaces ad-hoc bare z-50/z-[9999]
      // values that collided across the app (WhatsApp button and modals
      // both at z-50; Landing/Home's month picker at an arbitrary
      // z-[9999] that outranked everything, including modals).
      zIndex: {
        header: '50',
        dropdown: '60',
        'floating-action': '70',
        overlay: '90',
        modal: '100',
      },
    },
  },
  plugins: [],
};
