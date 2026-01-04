import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@management": resolve(__dirname, "../Management/src"),
    },
  },
  server: {
    open: true,
    fs: {
      allow: [resolve(__dirname, "..")],
    },
    proxy: {
      // "/api": "http://localhost:5001/api",
    },
  },

  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500, 
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "router-vendor": ["react-router-dom"],
          "ui-vendor": ["@mui/material", "@mui/icons-material", "@headlessui/react"],
          "chart-vendor": ["recharts"],
          "utils-vendor": ["lodash", "axios", "date-fns", "framer-motion"],
          "pdf-vendor": ["jspdf", "html2canvas", "file-saver"],
          "icons-vendor": ["lucide-react", "react-phone-number-input"],
        },
      },
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "date-fns",
      "lodash",
      "framer-motion",
    ],
  },


});
