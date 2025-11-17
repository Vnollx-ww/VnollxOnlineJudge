// 认证相关工具函数

export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const getUserInfo = () => {
  return {
    id: localStorage.getItem('id'),
    name: localStorage.getItem('name'),
    identity: localStorage.getItem('identity'),
  };
};

export const setUserInfo = (user) => {
  if (user.id) localStorage.setItem('id', user.id);
  if (user.name) localStorage.setItem('name', user.name);
  if (user.identity) localStorage.setItem('identity', user.identity);
};



