import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
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
  // Phase 8 bundle check: the shadcn/Base UI primitives ported across Phases
  // 0-5 (Button, Dialog, Sheet, Form, ...) plus class-variance-authority had
  // no bucket, so Rollup's default chunking folded them into the shared
  // main entry chunk. Splitting them into their own vendor chunk keeps that
  // entry chunk smaller and lets the browser cache this rarely-changing
  // dependency code separately from app code.
  if (id.includes('@base-ui/react') || id.includes('class-variance-authority')) {
    return 'ui-vendor';
  }
  // react-hook-form/@hookform/resolvers/zod are only exercised by the form-
  // heavy routes (login/register, booking, contact, career) -- their own
  // chunk avoids pulling form-validation code into routes that never render
  // a form.
  if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('/zod/')) {
    return 'form-vendor';
  }
  return undefined;
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
});
