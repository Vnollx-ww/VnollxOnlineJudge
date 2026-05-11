import { Routes, Route } from 'react-router-dom';
import { Shield, PanelLeftClose, PanelLeftOpen, Home } from 'lucide-react';
import AdminUsers from './AdminUsers';
import AdminProblems from './AdminProblems';
import AdminSolves from './AdminSolves';
import AdminCompetitions from './AdminCompetitions';
import AdminPractices from './AdminPractices';
import AdminAiModels from './AdminAiModels';
import AdminDicts from './AdminDicts';
import AdminPermissions from './AdminPermissions';
import AdminRoles from './AdminRoles';
import AdminStatistics from './AdminStatistics';
import { useAdmin, SIDER_WIDTH, SIDER_COLLAPSED_WIDTH } from '@/hooks/useAdmin';

const Admin: React.FC = () => {
  const {
    navigate,
    collapsed,
    setCollapsed,
    checking,
    hasPermission,
    menuItems,
    selectedKey,
  } = useAdmin();

  if (checking) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        <div className="admin-loading-spinner" />
        <span>检查权限中...</span>
      </div>
    );
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 固定侧边栏 */}
      <aside
        className="admin-sider"
        style={{
          '--sider-width': `${SIDER_WIDTH}px`,
          '--sider-collapsed-width': `${SIDER_COLLAPSED_WIDTH}px`,
          width: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
        } as React.CSSProperties}
      >
        <div className="admin-sider__logo">
          <div className="admin-sider__logo-icon">
            <Shield className="w-5 h-5" style={{ color: '#ffffff' }} />
          </div>
          {!collapsed && (
            <span className="admin-sider__logo-text">管理后台</span>
          )}
        </div>

        <nav className="admin-sider__nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                className={`admin-sider__item ${isSelected ? 'admin-sider__item--selected' : ''}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="admin-sider__item-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="admin-sider__footer">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-2 flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <Home className="w-5 h-5 shrink-0" />
            {!collapsed && <span>返回主页</span>}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="admin-sider__trigger"
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && <span>收起侧边栏</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div
        className="admin-main"
        style={{
          marginLeft: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
        }}
      >
        <main className="admin-content overflow-hidden">
          <Routes>
            <Route path="users" element={<AdminUsers />} />
            <Route path="problems" element={<AdminProblems />} />
            <Route path="solves" element={<AdminSolves />} />
            <Route path="competitions" element={<AdminCompetitions />} />
            <Route path="practices" element={<AdminPractices />} />
            <Route path="statistics" element={<AdminStatistics />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="permissions" element={<AdminPermissions />} />
            <Route path="ai-models" element={<AdminAiModels />} />
            <Route path="dicts" element={<AdminDicts />} />
            <Route path="*" element={<AdminUsers />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Admin;

