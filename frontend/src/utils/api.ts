import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig, AxiosInstance } from 'axios';

// API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg?: string;
}

// 创建 axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: '', // 使用相对路径，由后端代理
  timeout: 30000,
});

// 请求拦截器 - 添加 token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // 调试信息：确认token已添加（仅在开发环境）
      if (import.meta.env.DEV && config.url?.includes('/admin')) {
        console.log('Admin请求已添加token:', config.url, 'Token长度:', token.length);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
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

// 封装请求方法，正确处理返回类型
const api = {
  get: <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
    return axiosInstance.get(url, config) as Promise<ApiResponse<T>>;
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return axiosInstance.post(url, data, config) as Promise<ApiResponse<T>>;
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    return axiosInstance.put(url, data, config) as Promise<ApiResponse<T>>;
  },
  delete: <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
    return axiosInstance.delete(url, config) as Promise<ApiResponse<T>>;
  },
};

export default api;
