import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  build: {
    // 代码分割优化
    rollupOptions: {
      output: {
        // 手动分割代码块
        manualChunks: {
          // React 核心库单独打包
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Ant Design 单独打包
          'antd-vendor': ['antd'],
          // Markdown 相关库单独打包
          'markdown-vendor': ['marked', 'react-markdown', 'react-syntax-highlighter', 'highlight.js'],
          // 其他工具库
          'utils-vendor': ['axios', 'dayjs', 'dompurify'],
        },
        // 优化 chunk 文件名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 1000,
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    sourcemap: false,
  },
  
  server: {
    port: 3000,
    hmr: {
      // 让 HMR WebSocket 直接连接，不经过代理
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      // WebSocket 代理
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      // API 请求代理 - 所有 /api/v1/ 开头的请求转发到后端
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
