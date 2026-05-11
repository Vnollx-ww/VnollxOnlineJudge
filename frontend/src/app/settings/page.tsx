import { Avatar, Button, FormItem, Upload } from '@/components';
import { User, Mail, Lock, Settings as SettingsIcon, Camera } from 'lucide-react';
import Input from '@/components/input';
import { useSettings } from '@/hooks/useSettings';

const accentBtnStyle = {
  backgroundColor: 'var(--gemini-accent)',
  color: 'var(--gemini-accent-text)',
  border: 'none',
} as const;

const Settings: React.FC = () => {
  const {
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
  } = useSettings();

  const menuItems = [
    { key: 'profile', icon: <User className="w-4 h-4" />, label: '个人资料' },
    { key: 'email', icon: <Mail className="w-4 h-4" />, label: '修改邮箱' },
    { key: 'password', icon: <Lock className="w-4 h-4" />, label: '修改密码' },
  ];

  return (
    <div className="min-h-full w-full p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="w-full">
        <div className="flex gap-6">
          {/* 侧边栏 */}
          <div className="w-64 shrink-0">
            <div className="gemini-card">
              <h4 className="flex items-center gap-2 mb-6 text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
                <SettingsIcon className="w-5 h-5" /> 账号设置
              </h4>
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveMenu(item.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all"
                    style={{
                      backgroundColor: activeMenu === item.key ? 'var(--gemini-accent)' : 'transparent',
                      color: activeMenu === item.key ? 'var(--gemini-accent-text)' : 'var(--gemini-text-secondary)',
                    }}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1">
            {/* 个人资料 */}
            {activeMenu === 'profile' && (
              <div className="gemini-card">
                <h3 className="mb-8 text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>个人资料</h3>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleProfileSubmit();
                  }}
                  className="space-y-5"
                >
                  <div className="flex flex-col items-center mb-4">
                    <Upload
                      customRequest={handleAvatarUpload}
                      accept="image/*"
                      disabled={avatarLoading}
                    >
                      <div className="relative cursor-pointer group">
                        <Avatar
                          size={120}
                          src={user?.avatar}
                          style={{
                            background: user?.avatar
                              ? 'transparent'
                              : 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                            fontSize: '3rem',
                          }}
                        >
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera size={24} style={{ color: '#fff' }} />
                        </div>
                        {avatarLoading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                            <span className="text-white text-sm">上传中...</span>
                          </div>
                        )}
                      </div>
                    </Upload>
                    <span className="mt-3 text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>
                      点击头像上传新图片
                    </span>
                  </div>
                  <FormItem label="用户名" error={profileErrors.name}>
                    <Input
                      size="large"
                      className="!rounded-full"
                      value={profileForm.name}
                      onChange={(event) => updateProfileField('name', event.target.value)}
                    />
                  </FormItem>
                  <FormItem label="个性签名" error={profileErrors.signature}>
                    <Input
                      size="large"
                      className="!rounded-full"
                      value={profileForm.signature}
                      onChange={(event) => updateProfileField('signature', event.target.value)}
                    />
                  </FormItem>
                  <Button type="primary" htmlType="submit" size="large" className="!rounded-full" style={accentBtnStyle}>
                    保存更改
                  </Button>
                </form>
              </div>
            )}

            {/* 修改邮箱 */}
            {activeMenu === 'email' && (
              <div className="gemini-card">
                <h3 className="mb-8 text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>修改邮箱</h3>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleEmailSubmit();
                  }}
                  className="space-y-5"
                >
                  <FormItem label="当前邮箱">
                    <Input size="large" disabled className="!rounded-full" value={emailForm.currentEmail} />
                  </FormItem>
                  <FormItem label="新邮箱地址" error={emailErrors.newEmail}>
                    <div className="flex w-full gap-2">
                      <Input
                        size="large"
                        className="!rounded-l-full flex-1"
                        value={emailForm.newEmail}
                        onChange={(event) => updateEmailField('newEmail', event.target.value)}
                      />
                      <Button
                        type="primary"
                        onClick={handleGetCode}
                        disabled={countdown > 0 || codeLoading}
                        loading={codeLoading}
                        size="large"
                        className="!rounded-r-full"
                        style={accentBtnStyle}
                      >
                        {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
                      </Button>
                    </div>
                  </FormItem>
                  <FormItem label="验证码" error={emailErrors.verifyCode}>
                    <Input
                      size="large"
                      placeholder="请输入6位验证码"
                      className="!rounded-full"
                      value={emailForm.verifyCode}
                      onChange={(event) => updateEmailField('verifyCode', event.target.value)}
                    />
                  </FormItem>
                  <Button type="primary" htmlType="submit" size="large" className="!rounded-full" style={accentBtnStyle}>
                    更新邮箱
                  </Button>
                </form>
              </div>
            )}

            {/* 修改密码 */}
            {activeMenu === 'password' && (
              <div className="gemini-card">
                <h3 className="mb-8 text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>修改密码</h3>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handlePasswordSubmit();
                  }}
                  className="space-y-5"
                >
                  <FormItem label="当前密码" error={passwordErrors.oldPassword}>
                    <Input.Password
                      size="large"
                      className="!rounded-full"
                      value={passwordForm.oldPassword}
                      onChange={(event) => updatePasswordField('oldPassword', event.target.value)}
                    />
                  </FormItem>
                  <FormItem label="新密码" error={passwordErrors.newPassword}>
                    <Input.Password
                      size="large"
                      className="!rounded-full"
                      value={passwordForm.newPassword}
                      onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                    />
                  </FormItem>
                  <FormItem label="确认新密码" error={passwordErrors.confirmPassword}>
                    <Input.Password
                      size="large"
                      className="!rounded-full"
                      value={passwordForm.confirmPassword}
                      onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                    />
                  </FormItem>
                  <Button type="primary" htmlType="submit" size="large" className="!rounded-full" style={accentBtnStyle}>
                    更新密码
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
