import type { UserInfo } from '@/types';

// 认证相关工具函数

interface RememberedLogin {
  account: string;
  password: string;
}

const rememberedLoginKey = 'rememberedLogin';

const emptyRememberedLogin: RememberedLogin = {
  account: '',
  password: '',
};

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

export const getRememberedLogin = (): RememberedLogin => {
  const rememberedLogin = localStorage.getItem(rememberedLoginKey);
  if (!rememberedLogin) return emptyRememberedLogin;

  try {
    const parsed = JSON.parse(rememberedLogin) as Partial<RememberedLogin>;
    return {
      account: typeof parsed.account === 'string' ? parsed.account : '',
      password: typeof parsed.password === 'string' ? parsed.password : '',
    };
  } catch {
    localStorage.removeItem(rememberedLoginKey);
    return emptyRememberedLogin;
  }
};

export const setRememberedLogin = (login: RememberedLogin): void => {
  localStorage.setItem(rememberedLoginKey, JSON.stringify({
    account: login.account,
    password: login.password,
  }));
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

