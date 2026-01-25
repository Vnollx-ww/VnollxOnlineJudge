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
      // API 请求代理
      '/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        bypass(req) {
          const reqPath = req.url?.split('?')[0] || '';
          
          // 静态资源扩展名
          const staticExtensions = ['.html', '.js', '.css', '.json', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.map', '.mp4', '.webm', '.ogg', '.mp3', '.wav'];
          
          if (staticExtensions.some(ext => reqPath.endsWith(ext))) {
            return reqPath;
          }
          
          // Vite 开发服务器路径
          if (reqPath.startsWith('/@') || reqPath.startsWith('/node_modules') || reqPath.startsWith('/src')) {
            return reqPath;
          }
          
          // 前端路由
          const frontendRoutes = [
            '/',
            '/login',
            '/register',
            '/problems',
            '/home',
            '/submissions',
            '/ranklist',
            '/competitions',
            '/practices',
            '/friends',
            '/notifications',
            '/settings',
            '/about',
            '/admin',
            '/admin/users',
            '/admin/problems',
            '/admin/solves',
            '/admin/competitions',
            '/admin/practices',
            '/admin/settings',
            '/solutions',
            '/vnollx',
          ];
          
          if (frontendRoutes.includes(reqPath)) {
            return reqPath;
          }
          
          // 动态路由模式
          if (reqPath.startsWith('/problem/')) {
            const problemRoutePattern = /^\/problem\/(\d+)(?:\/solutions(?:\/(?:publish|\d+))?)?$/;
            if (problemRoutePattern.test(reqPath)) {
              return reqPath;
            }
          }

          if (reqPath.startsWith('/competition/')) {
            const parts = reqPath.split('/');
            if (parts.length === 5 && /^\d+$/.test(parts[2]) && parts[3] === 'problem' && /^\d+$/.test(parts[4])) {
              return reqPath;
            }
            if (parts.length === 3 && /^\d+$/.test(parts[2])) {
              return reqPath;
            }
            if (parts.length === 4 && /^\d+$/.test(parts[2]) && (parts[3] === 'ranklist' || parts[3] === 'submissions')) {
              return reqPath;
            }
          }

          if (reqPath.startsWith('/practice/')) {
            const parts = reqPath.split('/');
            if (parts.length === 3 && parts[2] && /^\d+$/.test(parts[2])) {
              const accept = req.headers?.accept || '';
              if (accept.includes('text/html')) {
                return reqPath;
              }
            }
          }

          if (reqPath.startsWith('/notification/')) {
            const parts = reqPath.split('/');
            if (parts.length === 3 && parts[2] && /^\d+$/.test(parts[2])) {
              return reqPath;
            }
          }

          if (reqPath.startsWith('/user/')) {
            const parts = reqPath.split('/');
            if (parts.length === 3 && parts[2] && !isNaN(Number(parts[2]))) {
              return reqPath;
            }
          }
          
          return null;
        },
      },
    },
  },
})
