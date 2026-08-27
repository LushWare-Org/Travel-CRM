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
      }
    },
  },
  plugins: [],
};
