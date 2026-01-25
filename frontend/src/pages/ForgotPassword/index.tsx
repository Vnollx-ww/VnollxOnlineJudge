import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/utils/api';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    verifyCode: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email } = formData;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的邮箱地址', { duration: 3000 });
      return;
    }

    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', { email, option: 'forget' });
      if (data.code === 200) {
        toast.success('验证码已发送到您的邮箱', { duration: 2000 });
        setStep('verify');
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
        toast.error(data.msg || '发送失败', { duration: 3000 });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      toast.error('网络请求失败', { duration: 3000 });
    } finally {
      setCodeLoading(false);
    }
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
      const data = await api.post('/user/reset-password', {
        email,
        verifyCode,
        newPassword,
      });
      if (data.code === 200) {
        toast.success('密码重置成功，请登录', { duration: 2000 });
        setTimeout(() => {
          navigate('/login');
        }, 1000);
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

  const handleResendCode = async () => {
    const { email } = formData;
    setCodeLoading(true);
    try {
      const data = await api.post('/email/send', { email, option: 'forget' });
      if (data.code === 200) {
        toast.success('验证码已重新发送', { duration: 2000 });
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
        toast.error(data.msg || '发送失败', { duration: 3000 });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      toast.error('网络请求失败', { duration: 3000 });
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] flex items-center justify-center p-4 font-sans selection:bg-blue-100">
      <div className="w-full max-w-[1100px] h-[600px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] flex overflow-hidden relative">
        {/* 背景视频 */}
        <div className="absolute inset-0 w-full h-full z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('视频加载失败:', e);
              e.currentTarget.style.display = 'none';
            }}
          >
            <source src="/cat.mp4" type="video/mp4" />
            您的浏览器不支持视频播放
          </video>
          <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        </div>

        {/* 右侧表单区 */}
        <div className="w-full md:w-[450px] h-full ml-auto flex flex-col justify-center px-12 relative z-10 
                        bg-white/40 backdrop-blur-2xl border-l border-white/30 shadow-2xl">
          {/* LOGO */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-black p-2 rounded-xl mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white" />
                <circle cx="8" cy="10" r="1.5" fill="black" />
                <circle cx="12" cy="10" r="1.5" fill="black" />
                <circle cx="16" cy="10" r="1.5" fill="black" />
              </svg>
            </div>
            <div className="text-black font-black text-xl tracking-tight text-center">
              Vnollx<br />OnlineJudge
            </div>
          </div>

          <h2 className="text-center text-gray-800 text-lg font-semibold mb-6">
            {step === 'email' ? '找回密码' : '重置密码'}
          </h2>

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900 ml-1">邮箱</label>
                <input
                  type="email"
                  required
                  placeholder="请输入注册邮箱"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-white/40 rounded-xl text-sm outline-none
                             transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={codeLoading}
                className="w-full py-4 mt-2 bg-[#E3E6FB] hover:bg-[#D1D5F5] text-[#4A5568] font-bold text-sm rounded-xl
                           transition-all active:scale-[0.97] shadow-sm disabled:opacity-50"
              >
                {codeLoading ? '发送中...' : '发送验证码'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900 ml-1">验证码</label>
                <div className="flex gap-2">
                  <input
                    required
                    placeholder="请输入验证码"
                    value={formData.verifyCode}
                    onChange={(e) => setFormData({ ...formData, verifyCode: e.target.value })}
                    className="flex-1 px-4 py-3 bg-white/60 border border-white/40 rounded-xl text-sm outline-none
                               transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || codeLoading}
                    className="px-4 bg-white/40 border border-white/40 text-[#5A6B7C] text-xs font-bold rounded-xl
                               hover:bg-white/80 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : '重新发送'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900 ml-1">新密码</label>
                <input
                  type="password"
                  required
                  placeholder="请输入新密码（至少6位）"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-white/40 rounded-xl text-sm outline-none
                             transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900 ml-1">确认密码</label>
                <input
                  type="password"
                  required
                  placeholder="请再次输入新密码"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 border border-white/40 rounded-xl text-sm outline-none
                             transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 bg-[#E3E6FB] hover:bg-[#D1D5F5] text-[#4A5568] font-bold text-sm rounded-xl
                           transition-all active:scale-[0.97] shadow-sm disabled:opacity-50"
              >
                {loading ? '重置中...' : '重置密码'}
              </button>
            </form>
          )}

          {/* 底部链接 */}
          <div className="mt-8 text-center text-xs space-y-2">
            {step === 'verify' && (
              <button
                onClick={() => setStep('email')}
                className="text-gray-600 hover:text-gray-800 underline"
              >
                返回修改邮箱
              </button>
            )}
            <div>
              <span className="text-gray-500">想起密码了？</span>
              <Link to="/login" className="text-black font-bold ml-1.5 hover:underline">
                返回登录
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

