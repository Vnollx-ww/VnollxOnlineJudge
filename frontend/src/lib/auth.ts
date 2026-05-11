import api from './http';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  verifyCode: string;
  password: string;
}

export interface ForgetPasswordPayload {
  email: string;
  verifyCode: string;
  newPassword: string;
}

export type EmailOption = 'register' | 'forget' | 'update';

export const authApi = {
  login: (payload: LoginPayload) => api.post<string>('/user/login', payload),
  register: (payload: RegisterPayload) => api.post('/user/register', payload),
  forgetPassword: (payload: ForgetPasswordPayload) => api.put('/user/forget', payload),
  sendEmailCode: (email: string, option: EmailOption) => api.post('/email/send', { email, option }),
};
