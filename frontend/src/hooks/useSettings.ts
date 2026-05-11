import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form } from 'antd';
import type { UploadProps } from 'antd';
import toast from 'react-hot-toast';
import { authApi, userApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';

export interface SettingsUser {
  id: number;
  name: string;
  email: string;
  signature?: string;
  avatar?: string;
}

export const useSettings = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [activeMenu, setActiveMenu] = useState('profile');
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const loadUserInfo = async () => {
    try {
      const data = await userApi.getProfile<SettingsUser>();
      if (data.code === 200) {
        setUser(data.data);
        form.setFieldsValue({
          name: data.data.name,
          signature: data.data.signature || localStorage.getItem('signature') || '个性签名',
        });
        emailForm.setFieldsValue({ currentEmail: data.data.email });
      }
    } catch {
      toast.error('加载用户信息失败');
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSubmit = async (values: { name: string; signature: string }) => {
    try {
      const formData = new FormData();
      formData.append('email', user!.email);
      formData.append('name', values.name);
      formData.append('option', 'name');
      formData.append('signature', values.signature);
      formData.append('verifyCode', '');

      const data = await userApi.updateProfile(formData);
      if (data.code === 200) {
        toast.success('用户信息更新成功');
        localStorage.setItem('name', values.name);
        localStorage.setItem('signature', values.signature);
        setUser({ ...user!, name: values.name, signature: values.signature });
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const handleEmailSubmit = async (values: { newEmail: string; verifyCode: string }) => {
    if (values.newEmail === user?.email) {
      toast.error('新邮箱地址不能与旧邮箱地址相同');
      return;
    }
    try {
      const data = await userApi.updateProfile({
        email: values.newEmail,
        name: user!.name,
        option: 'email',
        verifyCode: values.verifyCode,
      });
      if (data.code === 200) {
        toast.success('邮箱更新成功');
        setUser({ ...user!, email: values.newEmail });
        emailForm.setFieldsValue({ currentEmail: values.newEmail, verifyCode: '' });
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const handlePasswordSubmit = async (values: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    try {
      const data = await userApi.updatePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      if (data.code === 200) {
        toast.success('密码更新成功');
        passwordForm.resetFields();
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const handleGetCode = async () => {
    const newEmail = emailForm.getFieldValue('newEmail');
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }
    setCodeLoading(true);
    try {
      const data = await authApi.sendEmailCode(newEmail, 'update');
      if (data.code === 200) {
        toast.success('验证码已发送，请查收邮件');
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
      } else {
        toast.error(data.msg || '验证码发送失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleAvatarUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file as File);
      formData.append('email', user!.email);
      formData.append('name', user!.name);
      formData.append('option', 'avatar');
      formData.append('signature', user!.signature || '');
      formData.append('verifyCode', '');

      const data = await userApi.updateProfile(formData);
      if (data.code === 200) {
        toast.success('头像更新成功');
        await loadUserInfo();
        onSuccess?.(data);
      } else {
        toast.error(data.msg || '头像上传失败');
        onError?.(new Error(data.msg || '头像上传失败'));
      }
    } catch (err) {
      toast.error('网络请求失败，请重试');
      onError?.(err as Error);
    } finally {
      setAvatarLoading(false);
    }
  };

  return {
    form,
    emailForm,
    passwordForm,
    user,
    activeMenu,
    setActiveMenu,
    codeLoading,
    countdown,
    avatarLoading,
    handleProfileSubmit,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleGetCode,
    handleAvatarUpload,
  };
};
