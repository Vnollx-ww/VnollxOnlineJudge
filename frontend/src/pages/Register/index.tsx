import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/utils/api';

interface RegisterFormValues {
  name: string;
  email: string;
  verifyCode: string;
  password: string;
  repassword: string;
}

const Register: React.FC = () => {
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

  const onFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.repassword) {
      toast.error('两次输入的密码不一致', { duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/user/register', {
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
      const data = await api.post('/email/send', { email, option: 'register' });
      if (data.code === 200) {
        toast.success('验证码已发送', { duration: 2000 });
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
    } catch {
      toast.error('网络请求失败', { duration: 3000 });
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    // 全局背景底色
    <div className="min-h-screen bg-[#EEF2F6] flex items-center justify-center p-4 font-sans selection:bg-blue-100">
      
      {/* 注册卡片容器 - 保持与登录页一致的 1100x650 (注册项多，高度稍加) */}
      <div className="w-full max-w-[1100px] h-[650px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] flex overflow-hidden relative">
        
        {/* 背景视频层：全覆盖 */}
        <div className="absolute inset-0 w-full h-full z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          >
            <source src="/cat.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        </div>

        {/* 右侧表单区：【极致透明 + 强毛玻璃】 */}
        <div className="w-full md:w-[450px] h-full ml-auto flex flex-col justify-center px-10 relative z-10 
                        bg-white/40 backdrop-blur-2xl border-l border-white/30 shadow-2xl">
          
          {/* LOGO */}
          <div className="flex flex-col items-center mb-6">
            <div className="bg-black p-1.5 rounded-xl mb-3 shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white" />
                <circle cx="8" cy="10" r="1.5" fill="black" />
                <circle cx="12" cy="10" r="1.5" fill="black" />
                <circle cx="16" cy="10" r="1.5" fill="black" />
              </svg>
            </div>
            <div className="text-black font-black text-xl tracking-tight text-center leading-tight">
              Vnollx<br />OnlineJudge
            </div>
          </div>

          <h2 className="text-center text-gray-800 text-lg font-semibold mb-6">
            注册 VnollxOnlineJudge
          </h2>

          <form onSubmit={onFinish} className="space-y-4">
            {/* 用户名 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900 ml-1">用户名</label>
              <input 
                required
                placeholder="请输入用户名"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl text-sm outline-none 
                           transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100/50"
              />
            </div>

            {/* 邮箱 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900 ml-1">邮箱</label>
              <input 
                type="email"
                required
                placeholder="请输入邮箱"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl text-sm outline-none 
                           transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100/50"
              />
            </div>

            {/* 验证码 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900 ml-1">验证码</label>
              <div className="flex gap-2">
                <input 
                  required
                  placeholder="验证码"
                  onChange={(e) => setFormData({...formData, verifyCode: e.target.value})}
                  className="flex-1 px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl text-sm outline-none 
                             transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100/50"
                />
                <button 
                  type="button"
                  onClick={handleGetCode}
                  disabled={countdown > 0 || codeLoading}
                  className="px-4 bg-white/40 border border-white/40 text-[#5A6B7C] text-xs font-bold rounded-xl 
                             hover:bg-white/80 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>

            {/* 密码并排 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-900 ml-1">密码</label>
                <input 
                  type="password"
                  required
                  placeholder="输入密码"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl text-sm outline-none 
                             transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100/50"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-900 ml-1">确认密码</label>
                <input 
                  type="password"
                  required
                  placeholder="再次输入"
                  onChange={(e) => setFormData({...formData, repassword: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/40 rounded-xl text-sm outline-none 
                             transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100/50"
                />
              </div>
            </div>

            {/* 注册按钮 */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-[#E3E6FB] hover:bg-[#D1D5F5] text-[#4A5568] font-bold text-sm rounded-xl 
                         transition-all active:scale-[0.97] shadow-sm disabled:opacity-50"
            >
              {loading ? '正在注册...' : '注 册'}
            </button>
          </form>

          {/* 底部链接 */}
          <div className="mt-6 text-center text-xs">
            <span className="text-gray-500">已有账号？</span>
            <Link to="/login" className="text-black font-bold ml-1.5 hover:underline">
              立即登录
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;