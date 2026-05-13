import { Button, Modal, Field } from '@/components';
import { Users, UserPlus, Search, RefreshCw, Edit3, Trash2, Filter, CheckCircle2, Clock } from 'lucide-react';
import Select from '@/components/select';
import Input from '@/components/input';
import PagePagination from '@/components/page-pagination';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import { useAdminUsers } from '@/hooks/useAdminUsers';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) => (
  <div className="flex cursor-default items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-transform hover:scale-[1.02]">
    <div className={`rounded-xl p-3 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <h3 className="mt-1 text-xl font-bold leading-none text-gray-800">{value}</h3>
    </div>
  </div>
);

const AdminUsers: React.FC = () => {
  const {
    users,
    loading,
    total,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    keyword,
    setKeyword,
    modalVisible,
    setModalVisible,
    editingUser,
    userForm,
    deleteModalVisible,
    setDeleteModalVisible,
    userToDelete,
    setUserToDelete,
    loadUsers,
    handleAdd,
    handleEdit,
    handleDelete,
    updateUserForm,
    handleSubmit,
    getIdentityMeta,
    canOperateUser,
    identityOptions,
    passRate,
    adminCount,
    formatLastLogin,
    getUserInitial,
    getPassPercent,
  } = useAdminUsers();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-gray-900">
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="总用户" value={total} icon={Users} color="bg-blue-500" />
        <StatCard title="当前页管理员" value={`${adminCount} 人`} icon={Clock} color="bg-emerald-500" />
        <StatCard title="当前页通过率" value={passRate} icon={CheckCircle2} color="bg-orange-500" />
        <StatCard title="每页显示" value={pageSize} icon={Filter} color="bg-purple-500" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-50 bg-gray-50/50 p-4 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="搜索用户名、邮箱..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={loadUsers}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
            <PermissionGuard permission={PermissionCode.USER_CREATE}>
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-100 transition-all hover:bg-blue-700"
              >
                <UserPlus size={15} />
                新建用户
              </button>
            </PermissionGuard>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : null}
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-50 text-[11px] font-bold uppercase tracking-widest text-gray-400 shadow-sm shadow-gray-50">
                <th className="px-6 py-4">基础信息</th>
                <th className="px-6 py-4">身份</th>
                <th className="px-6 py-4 text-center">提交 / 通过</th>
                <th className="px-6 py-4">上次登录</th>
                <th className="px-6 py-4 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-sm font-medium text-gray-400">
                    暂无用户数据
                  </td>
                </tr>
              ) : users.map((user) => {
                const identity = getIdentityMeta(user.identity);
                const passPercent = getPassPercent(user);
                const canOperate = canOperateUser(user);
                return (
                  <tr key={user.id} className="group transition-colors hover:bg-blue-50/20">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold uppercase text-gray-400 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
                          {getUserInitial(user.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">{user.name}</span>
                          <span className="text-xs text-gray-400">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${identity.className}`}>
                        {identity.text}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="text-xs font-bold text-gray-600">
                          {user.submitCount || 0} <span className="mx-0.5 text-gray-300">/</span> <span className="text-emerald-500">{user.passCount || 0}</span>
                        </div>
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full ${passPercent > 50 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${passPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="whitespace-nowrap text-xs font-medium text-gray-500">{formatLastLogin(user.lastLoginTime)}</span>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <div className="flex items-center justify-start gap-1">
                        <PermissionGuard permission={PermissionCode.USER_UPDATE}>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                            disabled={!canOperate}
                            title={canOperate ? '编辑' : '无权限操作该用户'}
                            onClick={() => handleEdit(user)}
                          >
                            <Edit3 size={16} />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission={PermissionCode.USER_DELETE}>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                            disabled={!canOperate}
                            title={canOperate ? '删除' : '无权限操作该用户'}
                            onClick={() => { setUserToDelete(user); setDeleteModalVisible(true); }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-50 bg-gray-50/30 px-6 py-4">
          <PagePagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={(page, nextPageSize) => {
              if (nextPageSize !== pageSize) {
                setPageSize(nextPageSize);
                setCurrentPage(1);
              } else {
                setCurrentPage(page);
              }
            }}
            align="end"
            showSizeChanger
          />
        </div>
      </div>

      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(userForm);
          }}
        >
          <Field label="用户名">
            <Input value={userForm.name} onChange={(event) => updateUserForm('name', event.target.value)} />
          </Field>
          <Field label="邮箱">
            <Input value={userForm.email} onChange={(event) => updateUserForm('email', event.target.value)} />
          </Field>
          <Field label="身份">
            <Select className="w-full min-w-64" value={userForm.identity} onChange={(value) => updateUserForm('identity', value)} options={identityOptions} />
          </Field>
          <div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                保存
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 删除用户确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        centered
        onCancel={() => { setDeleteModalVisible(false); setUserToDelete(null); }}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          确定要删除用户 <strong>{userToDelete?.name}</strong> 吗？
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => { setDeleteModalVisible(false); setUserToDelete(null); }}>取消</Button>
          <Button type="primary" danger disabled={!!userToDelete && !canOperateUser(userToDelete)} onClick={() => { if (userToDelete && canOperateUser(userToDelete)) { handleDelete(userToDelete.id); } setDeleteModalVisible(false); setUserToDelete(null); }}>确定</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;

