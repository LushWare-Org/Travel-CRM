import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    proxy: {
      "/api": "https://lushtravelcloud.com/api",
    },
    hmr: {
      overlay: false,
    },
    port: 3000,
  },
  define: {
    'process.env': JSON.stringify(process.env),
  },
});
