import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '', // 使用相对路径，由后端代理
  timeout: 30000,
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // 调试信息：确认token已添加（仅在开发环境）
      if (process.env.NODE_ENV === 'development' && config.url?.includes('/admin')) {
        console.log('Admin请求已添加token:', config.url, 'Token长度:', token.length);
      }
    } else {
      // 如果没有token，记录警告（但不阻止请求，让后端处理）
      console.warn('请求缺少token:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除token
      localStorage.removeItem('token');
      localStorage.removeItem('id');
      localStorage.removeItem('name');
      localStorage.removeItem('identity');
      
      // 如果当前在管理员页面，需要特殊处理
      if (window.location.pathname.startsWith('/admin')) {
        // 管理员页面，延迟跳转，让组件有机会处理错误
        setTimeout(() => {
          window.location.href = '/login';
        }, 200);
      } else if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        // 其他页面，正常跳转
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;


