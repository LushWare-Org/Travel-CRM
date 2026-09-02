import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Vite 8 (Rolldown) requires manualChunks as a function, not the old
// chunk-name -> module-list object map. Also drops the dead-dependency
// chunks (@mui/*, @headlessui/react, recharts) removed in Phase 0.
const manualChunks = (id: string): string | undefined => {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('react-router-dom')) return 'router-vendor';
  if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor';
  if (id.includes('lodash') || id.includes('/axios/') || id.includes('date-fns') || id.includes('framer-motion')) {
    return 'utils-vendor';
  }
  if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('file-saver')) {
    return 'pdf-vendor';
  }
  if (id.includes('lucide-react') || id.includes('react-phone-number-input')) {
    return 'icons-vendor';
  }
  return undefined;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // tailwind.config.js (loaded separately by PostCSS, in the same Node
  // process) reads process.env.VITE_THEME to pick a palette — Vite does not
  // expose VITE_* vars to process.env for config-adjacent tooling by
  // default, so this factory does it explicitly. See src/config/activeTheme.ts.
  process.env.VITE_THEME = env.VITE_THEME || 'generic';
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    open: true,
    proxy: {
      // "/api": "http://localhost:5001/api",
    },
  },

  build: {
    minify: 'terser',
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
        manualChunks,
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'date-fns', 'lodash', 'framer-motion'],
  },
  };
});
