import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { UploadProps } from '@/components';
import { authApi, userApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';

export interface SettingsUser {
  id: number;
  name: string;
  email: string;
  signature?: string;
  avatar?: string;
}

export interface ProfileFormState {
  name: string;
  signature: string;
}
export interface EmailFormState {
  currentEmail: string;
  newEmail: string;
  verifyCode: string;
}
export interface PasswordFormState {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const useSettings = () => {
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState<ProfileFormState>({ name: '', signature: '' });
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileFormState, string>>>({});
  const [emailForm, setEmailFormState] = useState<EmailFormState>({ currentEmail: '', newEmail: '', verifyCode: '' });
  const [emailErrors, setEmailErrors] = useState<Partial<Record<keyof EmailFormState, string>>>({});
  const [passwordForm, setPasswordFormState] = useState<PasswordFormState>({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof PasswordFormState, string>>>({});
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [activeMenu, setActiveMenu] = useState('profile');
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const updateProfileField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
    setProfileErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const updateEmailField = <K extends keyof EmailFormState>(key: K, value: EmailFormState[K]) => {
    setEmailFormState((prev) => ({ ...prev, [key]: value }));
    setEmailErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const updatePasswordField = <K extends keyof PasswordFormState>(key: K, value: PasswordFormState[K]) => {
    setPasswordFormState((prev) => ({ ...prev, [key]: value }));
    setPasswordErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const loadUserInfo = async () => {
    try {
      const data = await userApi.getProfile<SettingsUser>();
      if (data.code === 200) {
        setUser(data.data);
        setProfileForm({
          name: data.data.name,
          signature: data.data.signature || localStorage.getItem('signature') || '个性签名',
        });
        setEmailFormState((prev) => ({ ...prev, currentEmail: data.data.email }));
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

  const validateProfile = (): boolean => {
    const errors: Partial<Record<keyof ProfileFormState, string>> = {};
    if (!profileForm.name.trim()) errors.name = '请输入用户名';
    if (!profileForm.signature.trim()) errors.signature = '请输入个性签名';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async () => {
    if (!validateProfile()) return;
    const values = profileForm;
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

  const validateEmail = (): boolean => {
    const errors: Partial<Record<keyof EmailFormState, string>> = {};
    if (!emailForm.newEmail) errors.newEmail = '请输入新邮箱地址';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.newEmail)) errors.newEmail = '请输入有效的邮箱地址';
    if (!emailForm.verifyCode) errors.verifyCode = '请输入验证码';
    setEmailErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmailSubmit = async () => {
    if (!validateEmail()) return;
    const values = emailForm;
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
        setEmailFormState({ currentEmail: values.newEmail, newEmail: '', verifyCode: '' });
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const validatePassword = (): boolean => {
    const errors: Partial<Record<keyof PasswordFormState, string>> = {};
    if (!passwordForm.oldPassword) errors.oldPassword = '请输入当前密码';
    if (!passwordForm.newPassword) errors.newPassword = '请输入新密码';
    else if (passwordForm.newPassword.length < 6) errors.newPassword = '密码长度不能少于6位';
    if (!passwordForm.confirmPassword) errors.confirmPassword = '请再次输入新密码';
    else if (passwordForm.newPassword !== passwordForm.confirmPassword) errors.confirmPassword = '两次输入的密码不一致';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async () => {
    if (!validatePassword()) return;
    const values = passwordForm;
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
        setPasswordFormState({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
      } else {
        toast.error(data.msg || '更新失败');
      }
    } catch {
      toast.error('网络请求失败，请重试');
    }
  };

  const handleGetCode = async () => {
    const newEmail = emailForm.newEmail;
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
    profileForm,
    profileErrors,
    updateProfileField,
    emailForm,
    emailErrors,
    updateEmailField,
    passwordForm,
    passwordErrors,
    updatePasswordField,
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
