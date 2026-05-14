import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/lib';

export interface ForgotPasswordFormData {
  email: string;
  verifyCode: string;
  newPassword: string;
  confirmPassword: string;
}

export const useForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
    verifyCode: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateField = <K extends keyof ForgotPasswordFormData>(key: K, value: ForgotPasswordFormData[K]) => {
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

  const sendCode = async (email: string, successMsg: string, advance: boolean) => {
    setCodeLoading(true);
    try {
      const data = await authApi.sendEmailCode(email, 'forget');
      if (data.code === 200) {
        toast.success(successMsg, { duration: 2000 });
        if (advance) setStep('verify');
        startCountdown();
      } else {
        toast.error(data.msg || '发送失败', { duration: 3000 });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      toast.error('网络请求失败', { duration: 3000 });
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email } = formData;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的邮箱地址', { duration: 3000 });
      return;
    }
    await sendCode(email, '验证码已发送到您的邮箱', true);
  };

  const handleResendCode = async () => {
    await sendCode(formData.email, '验证码已重新发送', false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, verifyCode, newPassword, confirmPassword } = formData;

    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致', { duration: 3000 });
      return;
    }
    if (newPassword.length < 6) {
      toast.error('密码长度至少为6位', { duration: 3000 });
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.forgetPassword({ email, verifyCode, newPassword });
      if (data.code === 200) {
        toast.success('密码重置成功，请登录', { duration: 2000 });
        setTimeout(() => navigate('/login'), 1000);
      } else {
        toast.error(data.msg || '重置失败', { duration: 3000 });
        setLoading(false);
      }
    } catch (error) {
      console.error('重置密码失败:', error);
      toast.error('网络请求失败', { duration: 3000 });
      setLoading(false);
    }
  };

  return {
    step,
    setStep,
    loading,
    codeLoading,
    countdown,
    formData,
    setFormData,
    updateField,
    handleSendCode,
    handleResendCode,
    handleResetPassword,
  };
};
