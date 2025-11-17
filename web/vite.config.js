import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
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
            const parts = path.split('/');
            if (parts.length === 3 && parts[2] && !isNaN(parts[2])) {
              // /problem/123 格式，是前端路由
              return path; // 跳过代理
            }
            // 其他 /problem/xxx 都是 API，继续代理
          }
          
          // /competition/:id (比赛详情)
          // /competition/:id/ranklist (比赛排行榜)
          // /competition/:id/submissions (比赛提交记录)
          if (path.startsWith('/competition/')) {
            const parts = path.split('/');
            if (parts.length === 3 && parts[2] && !isNaN(parts[2])) {
              // /competition/123 格式，是前端路由
              return path; // 跳过代理
            }
            if (parts.length === 4 && parts[2] && !isNaN(parts[2]) && (parts[3] === 'ranklist' || parts[3] === 'submissions')) {
              // /competition/123/ranklist 或 /competition/123/submissions，是前端路由
              return path; // 跳过代理
            }
            // 其他 /competition/xxx 都是 API，继续代理
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
