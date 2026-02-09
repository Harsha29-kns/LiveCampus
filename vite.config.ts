import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk: Anything React-related (aggressive matching)
          // This ensures NO React-dependent code ends up in other chunks
          if (id.includes('node_modules') && (
            id.includes('/react') ||
            id.includes('/react-') ||
            id.includes('/@vercel/') ||
            id.includes('/@babel/runtime'))) {
            return 'vendor-react';
          }

          // Firebase chunk: All Firebase SDK modules
          if (id.includes('node_modules/firebase') ||
            id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }

          // UI Libraries chunk: Component libraries
          if (id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/@headlessui') ||
            id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }

          // Charts/Visualization chunk
          if (id.includes('node_modules/leaflet') ||
            id.includes('node_modules/react-leaflet') ||
            id.includes('node_modules/qrcode')) {
            return 'vendor-viz';
          }

          // State Management chunk
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }

          // Utilities chunk: Smaller utility libraries
          if (id.includes('node_modules')) {
            return 'vendor-utils';
          }
        },
      },
    },
    // Increase chunk size warning limit to 600kb (from default 500kb)
    // Our Firebase chunk will be around 400-500kb which is acceptable
    chunkSizeWarningLimit: 600,

    // Enable source maps for production debugging (optional, remove if not needed)
    sourcemap: false,
  },
});
