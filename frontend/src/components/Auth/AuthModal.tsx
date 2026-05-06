import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Lock, Mail, User } from 'lucide-react';
import api from '@/utils/api';
import { Button, FormItem, Input, Modal, Tabs, Toast, type TabItem, type ToastState } from '@/components';
import { setToken } from '@/utils/auth';
import type { ApiResponse } from '@/types';

type AuthMode = 'login' | 'register' | 'forget';

interface AuthModalProps {
  open: boolean;
  mode?: AuthMode;
  onClose?: () => void;
  onModeChange?: (mode: AuthMode) => void;
}

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  verifyCode: string;
  password: string;
  repassword: string;
}

interface ForgotFormValues {
  email: string;
  verifyCode: string;
  newPassword: string;
  confirmPassword: string;
}

type FormErrors<T> = Partial<Record<keyof T, string>>;

const initialLoginForm: LoginFormValues = {
  email: '',
  password: '',
};

const initialRegisterForm: RegisterFormValues = {
  name: '',
  email: '',
  verifyCode: '',
  password: '',
  repassword: '',
};

const initialForgotForm: ForgotFormValues = {
  email: '',
  verifyCode: '',
  newPassword: '',
  confirmPassword: '',
};

const iconClassName = 'h-4 w-4 text-slate-400';
const inputStyle = { backgroundColor: 'var(--gemini-bg)', border: 'none' };

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const AuthModal: React.FC<AuthModalProps> = ({ open, mode = 'login', onClose, onModeChange }) => {
  const [loginForm, setLoginForm] = useState<LoginFormValues>(initialLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterFormValues>(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState<ForgotFormValues>(initialForgotForm);
  const [loginErrors, setLoginErrors] = useState<FormErrors<LoginFormValues>>({});
  const [registerErrors, setRegisterErrors] = useState<FormErrors<RegisterFormValues>>({});
  const [forgotErrors, setForgotErrors] = useState<FormErrors<ForgotFormValues>>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [forgotCodeLoading, setForgotCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!open) {
      setLoginForm(initialLoginForm);
      setRegisterForm(initialRegisterForm);
      setForgotForm(initialForgotForm);
      setLoginErrors({});
      setRegisterErrors({});
      setForgotErrors({});
      setCountdown(0);
      setForgotCountdown(0);
    }
  }, [open]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!countdown) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!forgotCountdown) return undefined;
    const timer = window.setInterval(() => {
      setForgotCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forgotCountdown]);

  const notify = (type: ToastState['type'], content: string) => setToast({ type, content });

  const validateEmail = (email: string) => {
    if (!email.trim()) return '请输入邮箱地址';
    if (!isValidEmail(email)) return '请输入有效的邮箱地址';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return '请输入密码';
    if (password.length < 6) return '密码长度不能少于6位';
    return '';
  };

  const updateLogin = (field: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setLoginForm((current) => ({ ...current, [field]: event.target.value }));
    setLoginErrors((current) => ({ ...current, [field]: '' }));
  };

  const updateRegister = (field: keyof RegisterFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setRegisterForm((current) => ({ ...current, [field]: event.target.value }));
    setRegisterErrors((current) => ({ ...current, [field]: '' }));
  };

  const updateForgot = (field: keyof ForgotFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setForgotForm((current) => ({ ...current, [field]: event.target.value }));
    setForgotErrors((current) => ({ ...current, [field]: '' }));
  };

  const validateLogin = () => {
    const errors: FormErrors<LoginFormValues> = {
      email: validateEmail(loginForm.email),
      password: loginForm.password ? '' : '请输入密码',
    };
    setLoginErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const validateRegister = () => {
    const trimmedName = registerForm.name.trim();
    const errors: FormErrors<RegisterFormValues> = {
      name: !trimmedName ? '请输入姓名' : trimmedName.length < 2 || trimmedName.length > 20 ? '姓名长度应在2-20个字符之间' : '',
      email: validateEmail(registerForm.email),
      verifyCode: registerForm.verifyCode.trim() ? '' : '请输入验证码',
      password: validatePassword(registerForm.password),
      repassword: registerForm.repassword ? '' : '请再次输入密码',
    };
    setRegisterErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const validateForgot = () => {
    const errors: FormErrors<ForgotFormValues> = {
      email: validateEmail(forgotForm.email),
      verifyCode: forgotForm.verifyCode.trim() ? '' : '请输入验证码',
      newPassword: validatePassword(forgotForm.newPassword),
      confirmPassword: forgotForm.confirmPassword ? '' : '请再次输入密码',
    };
    setForgotErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateLogin()) return;
    setLoginLoading(true);
    try {
      const data = await api.post('/user/login', loginForm) as ApiResponse<string>;
      if (data.code === 200) {
        setToken(data.data);
        notify('success', '登录成功');
        onClose?.();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        notify('error', (data as any).msg || '登录失败');
      }
    } catch (error: any) {
      notify('error', error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForgot()) return;
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      notify('error', '两次输入的密码不一致');
      return;
    }
    setForgotLoading(true);
    try {
      const data = await api.put('/user/forget', {
        email: forgotForm.email,
        verifyCode: forgotForm.verifyCode,
        newPassword: forgotForm.newPassword,
      }) as ApiResponse;
      if (data.code === 200) {
        notify('success', '密码重置成功，请重新登录');
        setForgotForm(initialForgotForm);
        setForgotErrors({});
        onModeChange?.('login');
      } else {
        notify('error', (data as any).msg || '密码重置失败');
      }
    } catch (error: any) {
      notify('error', error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSendForgotCode = async () => {
    const emailError = validateEmail(forgotForm.email);
    if (emailError) {
      setForgotErrors((current) => ({ ...current, email: emailError }));
      return;
    }

    setForgotCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email: forgotForm.email,
        option: 'forget',
      }) as ApiResponse;
      if (data.code === 200) {
        notify('success', '验证码已发送，请注意查收');
        setForgotCountdown(60);
      } else {
        notify('error', (data as any).msg || '发送验证码失败');
      }
    } catch (error: any) {
      notify('error', error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setForgotCodeLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateRegister()) return;
    if (registerForm.password !== registerForm.repassword) {
      notify('error', '两次输入的密码不一致');
      return;
    }
    setRegisterLoading(true);
    try {
      const data = await api.post('/user/register', {
        name: registerForm.name,
        email: registerForm.email,
        verifyCode: registerForm.verifyCode,
        password: registerForm.password,
      }) as ApiResponse;
      if (data.code === 200) {
        notify('success', '注册成功，请登录');
        onModeChange?.('login');
      } else {
        notify('error', (data as any).msg || '注册失败');
      }
    } catch (error: any) {
      notify('error', error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleSendCode = async () => {
    const emailError = validateEmail(registerForm.email);
    if (emailError) {
      setRegisterErrors((current) => ({ ...current, email: emailError }));
      return;
    }

    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', {
        email: registerForm.email,
        option: 'register',
      }) as ApiResponse;
      if (data.code === 200) {
        notify('success', '验证码已发送，请注意查收');
        setCountdown(60);
      } else {
        notify('error', (data as any).msg || '发送验证码失败');
      }
    } catch (error: any) {
      notify('error', error.response?.data?.msg || '网络请求失败，请重试');
    } finally {
      setCodeLoading(false);
    }
  };

  const tabItems = useMemo<TabItem<AuthMode>[]>(
    () => [
      {
        key: 'login',
        label: '登录',
        children: (
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4 pt-5">
            <FormItem error={loginErrors.email}>
              <Input prefix={<Mail className={iconClassName} />} placeholder="邮箱地址" size="large" className="rounded-full" style={inputStyle} value={loginForm.email} onChange={updateLogin('email')} />
            </FormItem>
            <FormItem error={loginErrors.password}>
              <Input.Password prefix={<Lock className={iconClassName} />} placeholder="登录密码" size="large" className="rounded-full" style={inputStyle} value={loginForm.password} onChange={updateLogin('password')} />
            </FormItem>
            <Button type="submit" variant="filled" size="large" block loading={loginLoading} className="font-semibold hover:-translate-y-0.5">
              立即登录
            </Button>
            <div className="text-center">
              <Button type="button" variant="text" size="small" onClick={() => onModeChange?.('forget')}>
                忘记密码？
              </Button>
            </div>
          </form>
        ),
      },
      {
        key: 'register',
        label: '注册',
        children: (
          <form onSubmit={handleRegister} autoComplete="off" className="space-y-4 pt-5">
            <FormItem error={registerErrors.name}>
              <Input prefix={<User className={iconClassName} />} placeholder="姓名" size="large" className="rounded-full" style={inputStyle} value={registerForm.name} onChange={updateRegister('name')} />
            </FormItem>
            <FormItem error={registerErrors.email}>
              <Input prefix={<Mail className={iconClassName} />} placeholder="邮箱地址" size="large" className="rounded-full" style={inputStyle} value={registerForm.email} onChange={updateRegister('email')} />
            </FormItem>
            <FormItem error={registerErrors.verifyCode}>
              <div className="flex w-full gap-2">
                <Input placeholder="邮箱验证码" size="large" className="rounded-full" style={inputStyle} value={registerForm.verifyCode} onChange={updateRegister('verifyCode')} />
                <Button type="button" size="large" variant="filled" loading={codeLoading} disabled={countdown > 0} onClick={handleSendCode} className="shrink-0 px-5">
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </div>
            </FormItem>
            <FormItem error={registerErrors.password}>
              <Input.Password prefix={<Lock className={iconClassName} />} placeholder="登录密码" size="large" className="rounded-full" style={inputStyle} value={registerForm.password} onChange={updateRegister('password')} />
            </FormItem>
            <FormItem error={registerErrors.repassword}>
              <Input.Password prefix={<Lock className={iconClassName} />} placeholder="重复密码" size="large" className="rounded-full" style={inputStyle} value={registerForm.repassword} onChange={updateRegister('repassword')} />
            </FormItem>
            <Button type="submit" variant="filled" size="large" block loading={registerLoading} className="font-semibold hover:-translate-y-0.5">
              立即注册
            </Button>
          </form>
        ),
      },
      {
        key: 'forget',
        label: '忘记密码',
        children: (
          <form onSubmit={handleForgotPassword} autoComplete="off" className="space-y-4 pt-5">
            <FormItem error={forgotErrors.email}>
              <Input prefix={<Mail className={iconClassName} />} placeholder="注册邮箱" size="large" className="rounded-full" style={inputStyle} value={forgotForm.email} onChange={updateForgot('email')} />
            </FormItem>
            <FormItem error={forgotErrors.verifyCode}>
              <div className="flex w-full gap-2">
                <Input placeholder="邮箱验证码" size="large" className="rounded-full" style={inputStyle} value={forgotForm.verifyCode} onChange={updateForgot('verifyCode')} />
                <Button type="button" size="large" variant="filled" loading={forgotCodeLoading} disabled={forgotCountdown > 0} onClick={handleSendForgotCode} className="shrink-0 px-5">
                  {forgotCountdown > 0 ? `${forgotCountdown}s` : '获取验证码'}
                </Button>
              </div>
            </FormItem>
            <FormItem error={forgotErrors.newPassword}>
              <Input.Password prefix={<Lock className={iconClassName} />} placeholder="新密码" size="large" className="rounded-full" style={inputStyle} value={forgotForm.newPassword} onChange={updateForgot('newPassword')} />
            </FormItem>
            <FormItem error={forgotErrors.confirmPassword}>
              <Input.Password prefix={<Lock className={iconClassName} />} placeholder="确认新密码" size="large" className="rounded-full" style={inputStyle} value={forgotForm.confirmPassword} onChange={updateForgot('confirmPassword')} />
            </FormItem>
            <Button type="submit" variant="filled" size="large" block loading={forgotLoading} className="font-semibold hover:-translate-y-0.5">
              重置密码
            </Button>
          </form>
        ),
      },
    ],
    [loginForm, registerForm, forgotForm, loginErrors, registerErrors, forgotErrors, loginLoading, registerLoading, forgotLoading, codeLoading, forgotCodeLoading, countdown, forgotCountdown]
  );

  return (
    <>
      <Toast toast={toast} />
      <Modal open={open} onClose={onClose} width={440} destroyOnClose className="auth-modal">
        <div className="pb-2 pt-3 text-center">
          <h2 className="mb-2 text-2xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>
            {mode === 'login' ? '欢迎回来' : mode === 'register' ? '立即加入 Vnollx' : '找回密码'}
          </h2>
          <div className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
            {mode === 'login'
              ? '登录后即可同步记录、参与比赛'
              : mode === 'register'
                ? '注册新账号，解锁完整评测体验'
                : '通过邮箱验证重置您的密码'}
          </div>
        </div>
        <Tabs activeKey={mode} onChange={(key) => onModeChange?.(key)} items={tabItems} centered className="auth-tabs" />
      </Modal>
    </>
  );
};

export default AuthModal;
