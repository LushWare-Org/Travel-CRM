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
      // both at z-50; features/landing/HomeContainer's month picker at an arbitrary
      // z-[9999] that outranked everything, including modals).
      //
      // Two tiers, deliberately distinct:
      // - Global app-chrome tokens (header/dropdown/floating-action/overlay/
      //   modal): for elements that escape their local layout (fixed
      //   positioning, portals) and can visually compete with OTHER
      //   components app-wide.
      // - Local tokens (base/raised/elevated/lifted/prominent): for
      //   decorative within-component layering (e.g. hero text above its
      //   own background video/gradient, a card's hover-sweep overlay,
      //   carousel slide/arrow stacking) that never leaves its own
      //   relative/absolute containing block and never competes with
      //   another component's stacking — same numeric values as before
      //   (0/10/20/30/40), just named instead of raw, so `grep -rn
      //   "z-[0-9]"` stays clean without collapsing distinct local intents
      //   into the global vocabulary.
      zIndex: {
        base: '0',
        raised: '10',
        elevated: '20',
        lifted: '30',
        prominent: '40',
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
