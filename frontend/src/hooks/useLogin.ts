import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, userApi } from '@/lib';
import { setToken, setUserInfo } from '@/utils/auth';

export interface LoginFormData {
  account: string;
  password: string;
}

export const useLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({ account: '', password: '' });

  const updateField = <K extends keyof LoginFormData>(key: K, value: LoginFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(formData);
      if (data.code === 200) {
        setToken(data.data);
        const userRes = await userApi.getProfile<{ id: string; name: string; identity: string }>();
        if (userRes.code === 200) setUserInfo(userRes.data);
        toast.success('登录成功', { duration: 2000 });
        setTimeout(() => {
          navigate('/', { replace: true });
          window.dispatchEvent(new Event('storage'));
        }, 500);
      } else {
        toast.error(data.msg || '登录失败', { duration: 3000 });
        setLoading(false);
      }
    } catch (error) {
      console.error('登录失败:', error);
      toast.error('网络请求失败', { duration: 3000 });
      setLoading(false);
    }
  };

  return { loading, formData, setFormData, updateField, handleLogin };
};
