import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
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
