/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Generate source maps for production debugging
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Rollup options for advanced chunking
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          // React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-select', '@radix-ui/react-slot', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
          // Data fetching and state
          'vendor-data': ['@tanstack/react-query', 'zustand', 'axios'],
          // Form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Utilities
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          // Icons
          'vendor-icons': ['lucide-react'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
        // Consistent chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || '';
          // Name page chunks by their route
          if (facadeModuleId.includes('/pages/')) {
            const pageName = facadeModuleId.split('/pages/')[1]?.split('/')[0] || 'page';
            return `pages/${pageName}-[hash].js`;
          }
          return 'assets/[name]-[hash].js';
        },
        // Entry file naming
        entryFileNames: 'assets/[name]-[hash].js',
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return 'images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
  // Development server options
  server: {
    port: 5173,
    strictPort: false,
    // Proxy API requests to backend in development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Preview server options (for testing production build)
  preview: {
    port: 4173,
    strictPort: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'axios',
      'react-hook-form',
      'zod',
      'date-fns',
      'lucide-react',
      'i18next',
      'react-i18next',
    ],
  },
  // CSS options
  css: {
    devSourcemap: true,
  },
  // Testing configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },
  },
}));
