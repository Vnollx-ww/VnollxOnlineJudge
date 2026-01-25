import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { setToken, setUserInfo } from '@/utils/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/user/login', formData);
      if (data.code === 200) {
        setToken(data.data);
        const userRes = await api.get('/user/profile');
        if (userRes.code === 200) setUserInfo(userRes.data);
        toast.success('登录成功', { duration: 2000 });
        // 使用 replace 并在导航后触发自定义事件，让 Header 组件重新获取用户信息
        setTimeout(() => {
          navigate('/', { replace: true });
          // 触发存储事件，通知其他组件用户信息已更新
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

  return (
    // 页面背景底色
    <div className="min-h-screen bg-[#EEF2F6] flex items-center justify-center p-4 font-sans selection:bg-blue-100">
      
      {/* 登录卡片容器 - 1:1 复刻 1100x600 */}
      <div className="w-full max-w-[1100px] h-[600px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] flex overflow-hidden relative">
        
        {/* 背景视频：绝对定位底层铺满 */}
        <div className="absolute inset-0 w-full h-full z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/cat.mp4" type="video/mp4" />
          </video>
          {/* 极其轻微的全局提亮蒙层 */}
          <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        </div>

        {/* 右侧表单区：实现真正的【完全透明+强毛玻璃】效果 */}
        <div className="w-full md:w-[420px] h-full ml-auto flex flex-col justify-center px-12 relative z-10 
                        bg-white/40 backdrop-blur-2xl border-l border-white/30 shadow-2xl">
          
          {/* LOGO 区域 */}
          <div className="flex flex-col items-center mb-10">
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

          <h2 className="text-center text-gray-800 text-lg font-semibold mb-8">
            登录 VnollxOnlineJudge
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-900 ml-1">邮箱</label>
              <input 
                type="email"
                required
                placeholder="请输入邮箱"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-white/60 border border-white/40 rounded-xl text-sm outline-none 
                           transition-all focus:bg-white/90 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-900 ml-1">密码</label>
                <Link to="/forgot-password" className="text-xs text-gray-600 hover:text-gray-900 hover:underline">
                  忘记密码？
                </Link>
              </div>
              <input 
                type="password"
                required
                placeholder="请输入密码"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              {loading ? '正在验证...' : '登 录'}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-10 text-center text-xs">
            <span className="text-gray-500">还没有账号？</span>
            <Link to="/register" className="text-black font-bold ml-1.5 hover:underline">
              立即注册
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;