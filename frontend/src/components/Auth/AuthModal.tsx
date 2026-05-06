import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import api from '@/utils/api';
import { Toast, type ToastState } from '@/components';
import { setToken } from '@/utils/auth';
import type { ApiResponse } from '@/types';

export type AuthMode = 'login' | 'register' | 'forget';

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

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

interface MascotProps {
  mousePos: { x: number; y: number };
  isCovering: boolean;
  color: string;
}

const mascotColorMap: Record<string, string> = {
  'bg-pink-400': '#f472b6',
  'bg-indigo-400': '#818cf8',
  'bg-emerald-400': '#4ade80',
};

const Mascot: React.FC<MascotProps> = ({ mousePos, isCovering, color }) => {
  const [eyeTranslate, setEyeTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCovering && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      const dx = mousePos.x - eyeCenterX;
      const dy = mousePos.y - eyeCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = 4;
      const logDistance = Math.min(distance / 100, 1);
      const moveX = (dx / (distance || 1)) * maxRadius * logDistance;
      const moveY = (dy / (distance || 1)) * maxRadius * logDistance;

      setEyeTranslate({ x: moveX, y: moveY });
    } else {
      setEyeTranslate({ x: 0, y: 0 });
    }
  }, [mousePos, isCovering]);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center transition-all duration-500">
      <div
        className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl relative overflow-hidden transition-all duration-300 ${color} shadow-lg`}
        style={{ borderRadius: '40% 40% 30% 30%' }}
      >
        <div className="flex justify-center gap-3 md:gap-4 mt-5 md:mt-6">
          {[0, 1].map((item) => (
            <div key={item} className="w-4 h-5 md:w-5 md:h-6 bg-white rounded-full relative overflow-hidden shadow-inner">
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: isCovering
                    ? 'translateY(-8px)'
                    : `translate(${eyeTranslate.x}px, ${eyeTranslate.y}px)`,
                }}
              >
                <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-slate-900 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-3">
          <div className="w-3 md:w-4 h-1 md:h-1.5 bg-slate-900/20 rounded-full" />
        </div>
      </div>
      <div
        className={`absolute top-0 w-full h-full flex justify-between px-2 transition-all duration-500 ease-out z-10 ${
          isCovering ? 'translate-y-4 md:translate-y-6 opacity-100' : 'translate-y-12 md:translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white/20 shadow-sm"
          style={{ backgroundColor: mascotColorMap[color] || '#818cf8' }}
        />
        <div
          className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-white/20 shadow-sm"
          style={{ backgroundColor: mascotColorMap[color] || '#818cf8' }}
        />
      </div>
    </div>
  );
};

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
    const handleMouseMove = (event: MouseEvent) => {
      setMousePos({ x: event.clientX, y: event.clientY });
    };

    if (open) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => window.removeEventListener('mousemove', handleMouseMove);
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
        window.dispatchEvent(new Event('auth-changed'));
        window.dispatchEvent(new Event('storage'));
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

  const renderError = (error?: string) => error ? <p className="mt-1 text-xs font-medium text-red-500">{error}</p> : null;

  const renderModeButton = (targetMode: AuthMode, label: string) => (
    <button
      type="button"
      onClick={() => onModeChange?.(targetMode)}
      className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
        mode === targetMode ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );

  const renderPasswordToggle = (show: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-indigo-500 transition-colors"
    >
      {show ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );

  const formTitle = mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建账号' : '找回密码';
  const formSubtitle = mode === 'login' ? '请填写您的登录信息' : mode === 'register' ? '注册新账号，开始在线评测' : '通过邮箱验证重置您的密码';

  return (
    <>
      <Toast toast={toast} />
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
          <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-300">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-30 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex justify-center gap-4 mb-[-20px] md:mb-[-28px] relative z-20 pointer-events-none">
              <Mascot mousePos={mousePos} isCovering={isPasswordFocused} color="bg-pink-400" />
              <Mascot mousePos={mousePos} isCovering={isPasswordFocused} color="bg-indigo-400" />
              <Mascot mousePos={mousePos} isCovering={isPasswordFocused} color="bg-emerald-400" />
            </div>
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-[2.5rem] shadow-2xl p-8 pt-16 border border-slate-100">
              <div className="mb-8 flex justify-center gap-2 rounded-full bg-slate-50 p-1">
                {renderModeButton('login', '登录')}
                {renderModeButton('register', '注册')}
              </div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{formTitle}</h1>
                <p className="text-slate-400 mt-2 font-medium">{formSubtitle}</p>
              </div>

              {mode === 'login' && (
                <form className="space-y-6" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-widest">电子邮箱</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <User size={20} />
                      </div>
                      <input type="email" placeholder="name@example.com" value={loginForm.email} onChange={updateLogin('email')} className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                    </div>
                    {renderError(loginErrors.email)}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-widest">账户密码</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <Lock size={20} />
                      </div>
                      <input type={showLoginPassword ? 'text' : 'password'} placeholder="••••••••" value={loginForm.password} onChange={updateLogin('password')} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} className="block w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                      {renderPasswordToggle(showLoginPassword, () => setShowLoginPassword((current) => !current))}
                    </div>
                    {renderError(loginErrors.password)}
                  </div>
                  <button type="submit" disabled={loginLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl mt-4 disabled:opacity-60">
                    {loginLoading ? '正在登录...' : '确认登录'}
                    <ArrowRight size={20} />
                  </button>
                  <div className="mt-8 text-center text-sm font-medium">
                    <button type="button" onClick={() => onModeChange?.('forget')} className="text-indigo-600 font-bold hover:underline">忘记密码？</button>
                  </div>
                </form>
              )}

              {mode === 'register' && (
                <form className="space-y-4" onSubmit={handleRegister}>
                  <div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <User size={20} />
                      </div>
                      <input placeholder="用户名" value={registerForm.name} onChange={updateRegister('name')} className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                    </div>
                    {renderError(registerErrors.name)}
                  </div>
                  <div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <Mail size={20} />
                      </div>
                      <input type="email" placeholder="电子邮箱" value={registerForm.email} onChange={updateRegister('email')} className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                    </div>
                    {renderError(registerErrors.email)}
                  </div>
                  <div>
                    <div className="flex gap-2">
                      <input placeholder="邮箱验证码" value={registerForm.verifyCode} onChange={updateRegister('verifyCode')} className="block min-w-0 flex-1 px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                      <button type="button" onClick={handleSendCode} disabled={countdown > 0 || codeLoading} className="shrink-0 rounded-2xl bg-indigo-50 px-4 text-sm font-bold text-indigo-600 transition-all hover:bg-indigo-100 disabled:opacity-60">
                        {countdown > 0 ? `${countdown}s` : codeLoading ? '发送中' : '获取验证码'}
                      </button>
                    </div>
                    {renderError(registerErrors.verifyCode)}
                  </div>
                  <div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <Lock size={20} />
                      </div>
                      <input type={showRegisterPassword ? 'text' : 'password'} placeholder="登录密码" value={registerForm.password} onChange={updateRegister('password')} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                      {renderPasswordToggle(showRegisterPassword, () => setShowRegisterPassword((current) => !current))}
                    </div>
                    {renderError(registerErrors.password)}
                  </div>
                  <div>
                    <input type={showRegisterPassword ? 'text' : 'password'} placeholder="确认密码" value={registerForm.repassword} onChange={updateRegister('repassword')} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} className="block w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                    {renderError(registerErrors.repassword)}
                  </div>
                  <button type="submit" disabled={registerLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl disabled:opacity-60">
                    {registerLoading ? '正在注册...' : '确认注册'}
                    <ArrowRight size={20} />
                  </button>
                </form>
              )}

              {mode === 'forget' && (
                <form className="space-y-4" onSubmit={handleForgotPassword}>
                  <div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <Mail size={20} />
                      </div>
                      <input type="email" placeholder="注册邮箱" value={forgotForm.email} onChange={updateForgot('email')} className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                    </div>
                    {renderError(forgotErrors.email)}
                  </div>
                  <div>
                    <div className="flex gap-2">
                      <input placeholder="邮箱验证码" value={forgotForm.verifyCode} onChange={updateForgot('verifyCode')} className="block min-w-0 flex-1 px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                      <button type="button" onClick={handleSendForgotCode} disabled={forgotCountdown > 0 || forgotCodeLoading} className="shrink-0 rounded-2xl bg-indigo-50 px-4 text-sm font-bold text-indigo-600 transition-all hover:bg-indigo-100 disabled:opacity-60">
                        {forgotCountdown > 0 ? `${forgotCountdown}s` : forgotCodeLoading ? '发送中' : '获取验证码'}
                      </button>
                    </div>
                    {renderError(forgotErrors.verifyCode)}
                  </div>
                  <div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <Lock size={20} />
                      </div>
                      <input type={showForgotPassword ? 'text' : 'password'} placeholder="新密码" value={forgotForm.newPassword} onChange={updateForgot('newPassword')} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                      {renderPasswordToggle(showForgotPassword, () => setShowForgotPassword((current) => !current))}
                    </div>
                    {renderError(forgotErrors.newPassword)}
                  </div>
                  <div>
                    <input type={showForgotPassword ? 'text' : 'password'} placeholder="确认新密码" value={forgotForm.confirmPassword} onChange={updateForgot('confirmPassword')} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)} className="block w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none" />
                    {renderError(forgotErrors.confirmPassword)}
                  </div>
                  <button type="submit" disabled={forgotLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl disabled:opacity-60">
                    {forgotLoading ? '正在重置...' : '重置密码'}
                    <ArrowRight size={20} />
                  </button>
                  <div className="text-center text-sm font-medium">
                    <button type="button" onClick={() => onModeChange?.('login')} className="text-indigo-600 font-bold hover:underline">返回登录</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthModal;
