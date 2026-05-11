import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/lib';

export interface RegisterFormValues {
  name: string;
  email: string;
  verifyCode: string;
  password: string;
  repassword: string;
}

export const useRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState<RegisterFormValues>({
    name: '',
    email: '',
    verifyCode: '',
    password: '',
    repassword: '',
  });

  const updateField = <K extends keyof RegisterFormValues>(key: K, value: RegisterFormValues[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.repassword) {
      toast.error('两次输入的密码不一致', { duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.register({
        name: formData.name,
        email: formData.email,
        verifyCode: formData.verifyCode,
        password: formData.password,
      });
      if (data.code === 200) {
        toast.success('注册成功，请登录', { duration: 2000 });
        navigate('/login');
      } else {
        toast.error(data.msg || '注册失败', { duration: 3000 });
        setLoading(false);
      }
    } catch (error) {
      console.error('注册失败:', error);
      toast.error('网络请求失败，请重试', { duration: 3000 });
      setLoading(false);
    }
  };

  const handleGetCode = async () => {
    const { email } = formData;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的邮箱地址', { duration: 3000 });
      return;
    }
    setCodeLoading(true);
    try {
      const data = await authApi.sendEmailCode(email, 'register');
      if (data.code === 200) {
        toast.success('验证码已发送', { duration: 2000 });
        startCountdown();
      } else {
        toast.error(data.msg || '发送失败', { duration: 3000 });
      }
    } catch {
      toast.error('网络请求失败', { duration: 3000 });
    } finally {
      setCodeLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    updateField,
    loading,
    codeLoading,
    countdown,
    onFinish,
    handleGetCode,
  };
};
