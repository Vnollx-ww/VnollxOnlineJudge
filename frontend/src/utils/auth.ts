import type { UserInfo } from '@/types';

// 认证相关工具函数

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const getUserInfo = (): UserInfo => {
  return {
    id: localStorage.getItem('id'),
    name: localStorage.getItem('name'),
    identity: localStorage.getItem('identity'),
  };
};

export const setUserInfo = (user: Partial<UserInfo>): void => {
  if (user.id) localStorage.setItem('id', user.id);
  if (user.name) localStorage.setItem('name', user.name);
  if (user.identity) localStorage.setItem('identity', user.identity);
};

export const clearUserInfo = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('id');
  localStorage.removeItem('name');
  localStorage.removeItem('identity');
};

export const isAdmin = (): boolean => {
  return localStorage.getItem('identity') === 'admin';
};

