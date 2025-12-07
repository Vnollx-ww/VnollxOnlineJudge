import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
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
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 生成 source map（可选，调试用）
    sourcemap: false,
  },
  
  server: {
    port: 3000,
    proxy: {
      // WebSocket 代理 - 必须单独配置，不能走 bypass
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      // 将所有API请求转发到后端8080端口
      '/': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        bypass(req) {
          const path = req.url?.split('?')[0] || ''; // 去掉查询参数
          
          // 静态资源扩展名列表
          const staticExtensions = ['.html', '.js', '.css', '.json', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.map'];
          
          // 如果是静态资源，不代理，由Vite处理
          if (staticExtensions.some(ext => path.endsWith(ext))) {
            return path; // 跳过代理
          }
          
          // Vite开发服务器的资源路径，不代理
          if (path.startsWith('/@') || path.startsWith('/node_modules') || path.startsWith('/src')) {
            return path; // 跳过代理
          }
          
          // 前端路由列表（不代理这些路径）
          const frontendRoutes = [
            '/',
            '/login',
            '/register',
            '/problems',
            'home',
            '/submissions',
            '/ranklist',
            '/competitions',
            '/notifications',
            '/settings',
            '/about',
            '/admin',
            '/admin/users',
            '/admin/problems',
            '/admin/solves',
            '/admin/competitions',
          ];
          
          // 检查是否是前端路由（精确匹配或匹配动态路由模式）
          if (frontendRoutes.includes(path)) {
            return path; // 跳过代理，由React Router处理
          }
          
          // 检查是否是前端动态路由模式
          // /problem/:id (题目详情) - 排除 /problem/list, /problem/count 等 API
          if (path.startsWith('/problem/')) {
            const problemRoutePattern = /^\/problem\/(\d+)(?:\/solutions(?:\/(?:publish|\d+))?)?$/;
            if (problemRoutePattern.test(path)) {
              return path; // 前端题目及题解路由
            }
            // 其他 /problem/xxx 都是 API，继续代理
          }

            // /competition 系列前端路由判断
            if (path.startsWith('/competition/')) {
                const parts = path.split('/');

                // 1. /competition/:cid/problem/:pid
                if (
                    parts.length === 5 &&
                    parts[2] && /^\d+$/.test(parts[2]) &&
                    parts[3] === 'problem' &&
                    parts[4] && /^\d+$/.test(parts[4])
                ) {
                    return path; // 前端路由
                }

                // 2. /competition/:cid
                if (
                    parts.length === 3 &&
                    parts[2] && /^\d+$/.test(parts[2])
                ) {
                    return path; // 前端路由
                }

                // 3. /competition/:cid/ranklist OR /competition/:cid/submissions
                if (
                    parts.length === 4 &&
                    parts[2] && /^\d+$/.test(parts[2]) &&
                    (parts[3] === 'ranklist' || parts[3] === 'submissions')
                ) {
                    return path; // 前端路由
                }

                // 其他 competition 路径视为 API
            }


            // /notification/:id (通知详情) - 仅数字ID才视为前端路由
          if (path.startsWith('/notification/')) {
            const parts = path.split('/');
            if (parts.length === 3 && parts[2] && /^\d+$/.test(parts[2])) {
              return path; // 跳过代理
            }
            // 其他 /notification/* 请求均视为 API
          }

          // /user/:id (用户主页) - 只将数字ID识别为前端路由
          // 排除 /user/login, /user/register, /user/profile 等 API 路径
          if (path.startsWith('/user/')) {
            const parts = path.split('/');
            if (parts.length === 3 && parts[2] && !isNaN(parts[2])) {
              // /user/123 格式（数字ID），是前端路由
              return path; // 跳过代理
            }
            // 其他 /user/xxx 都是 API，继续代理
          }
          
          // 其他所有请求都代理到后端
          return null;
        },
      },
    },
  },
})
