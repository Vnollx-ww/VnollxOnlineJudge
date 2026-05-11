import { Button, Modal, Tag, Spin, Field, DataTable, DataColumn } from '@/components';
import { RefreshCw, Plus, Trash2, Edit, Key } from 'lucide-react';
import Select from '@/components/select';
import Input from '@/components/input';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import { useAdminRoles, defaultPermissionForm, type Role, type Permission } from '@/hooks/useAdminRoles';

const AdminRoles: React.FC = () => {
  const {
    roles,
    loading,
    selectedRole,
    setSelectedRole,
    rolePermissions,
    rolePermissionsLoading,
    roleModalVisible,
    setRoleModalVisible,
    editingRole,
    assignPermissionModalVisible,
    setAssignPermissionModalVisible,
    permissionModalVisible,
    setPermissionModalVisible,
    viewRoleModalVisible,
    setViewRoleModalVisible,
    deleteRoleModalVisible,
    setDeleteRoleModalVisible,
    roleToDelete,
    setRoleToDelete,
    removePermissionModalVisible,
    setRemovePermissionModalVisible,
    permissionToRemove,
    setPermissionToRemove,
    selectedPermissionsToAssign,
    setSelectedPermissionsToAssign,
    roleForm,
    permissionFormValues,
    setPermissionFormValues,
    loadRoles,
    handleRoleSelect,
    handleAddRole,
    handleEditRole,
    updateRoleForm,
    updatePermissionForm,
    handleRoleSubmit,
    handleDeleteRole,
    handleAssignPermissionToRole,
    handleRemovePermissionFromRole,
    handleCreatePermission,
    availablePermissions,
    groupedPermissions,
  } = useAdminRoles();

  const getRoleTag = (code: string) => {
    const colorMap: Record<string, string> = {
      SUPER_ADMIN: 'red',
      ADMIN: 'orange',
      TEACHER: 'green',
      USER: 'blue',
      GUEST: 'default',
    };
    return <Tag color={colorMap[code] || 'default'}>{code}</Tag>;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden text-gray-900">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-end gap-2 border-b border-gray-50 bg-gray-50/50 p-4">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadRoles}>
            刷新
          </Button>
          <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
            <Button
              icon={<Key className="w-4 h-4" />}
              onClick={() => setPermissionModalVisible(true)}
            >
              新建权限
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.ROLE_CREATE}>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAddRole}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              新建角色
            </Button>
          </PermissionGuard>
        </div>
        <DataTable<Role>
          rows={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        >
          <DataColumn<Role> header="角色码" cell={(role) => getRoleTag(role.code)} />
          <DataColumn<Role> header="角色名称" cell={(role) => role.name} />
          <DataColumn<Role> header="描述" cell={(role) => role.description} />
          <DataColumn<Role>
            header="操作"
            width={240}
            cell={(role) => (
              <div className="flex items-center gap-1">
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleRoleSelect(role)} title="查看权限">
                  <Key size={16} />
                </button>
                <PermissionGuard permission={PermissionCode.ROLE_UPDATE}>
                  <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEditRole(role)} title="编辑">
                    <Edit size={16} />
                  </button>
                </PermissionGuard>
                <PermissionGuard permission={PermissionCode.ROLE_DELETE}>
                  <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600" onClick={() => { setRoleToDelete(role); setDeleteRoleModalVisible(true); }} title="删除">
                    <Trash2 size={16} />
                  </button>
                </PermissionGuard>
              </div>
            )}
          />
        </DataTable>
      </div>

      {/* 新建/编辑角色 Modal */}
      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={roleModalVisible}
        onCancel={() => setRoleModalVisible(false)}
        footer={null}
        width={500}
        centered
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleRoleSubmit(roleForm);
          }}
        >
          <Field label="角色码">
            <Input value={roleForm.code} onChange={(event) => updateRoleForm('code', event.target.value)} placeholder="如: MODERATOR" disabled={!!editingRole} />
          </Field>
          <Field label="角色名称">
            <Input value={roleForm.name} onChange={(event) => updateRoleForm('name', event.target.value)} placeholder="如: 版主" />
          </Field>
          <Field label="描述">
            <Input.TextArea value={roleForm.description} onChange={(event) => updateRoleForm('description', event.target.value)} placeholder="角色描述" rows={3} />
          </Field>
          <div className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRoleModalVisible(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                {editingRole ? '更新' : '创建'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 查看角色权限弹窗 */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            {selectedRole ? getRoleTag(selectedRole.code) : null}
            {selectedRole?.name} 的权限 ({rolePermissions.length}个)
          </span>
        }
        open={viewRoleModalVisible}
        centered
        width={900}
        onCancel={() => {
          setViewRoleModalVisible(false);
          setSelectedRole(null);
        }}
        footer={null}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
            权限列表
          </h4>
          <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setAssignPermissionModalVisible(true)}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              添加权限
            </Button>
          </PermissionGuard>
        </div>
        <Spin spinning={rolePermissionsLoading}>
          <div className="max-h-80 overflow-auto">
            <DataTable<Permission> rows={rolePermissions} rowKey="id" pagination={false} size="small">
              <DataColumn<Permission> header="权限码" cell={(permission) => <Tag color="green">{permission.code}</Tag>} />
              <DataColumn<Permission> header="权限名称" cell={(permission) => permission.name} />
              <DataColumn<Permission> header="模块" cell={(permission) => permission.module} />
              <DataColumn<Permission>
                header="操作"
                cell={(permission) => (
                  <PermissionGuard permission={PermissionCode.PERMISSION_ASSIGN}>
                    <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600" onClick={() => { setPermissionToRemove(permission); setRemovePermissionModalVisible(true); }} title="移除">
                      <Trash2 size={16} />
                    </button>
                  </PermissionGuard>
                )}
              />
            </DataTable>
          </div>
        </Spin>
      </Modal>

      {/* 移除权限确认弹窗 */}
      <Modal
        title="确认移除"
        open={removePermissionModalVisible}
        centered
        onCancel={() => { setRemovePermissionModalVisible(false); setPermissionToRemove(null); }}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          确定要移除权限 <strong>{permissionToRemove?.name}</strong> 吗？
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => { setRemovePermissionModalVisible(false); setPermissionToRemove(null); }}>取消</Button>
          <Button type="primary" danger onClick={() => { if (permissionToRemove) { handleRemovePermissionFromRole(permissionToRemove.id); } setRemovePermissionModalVisible(false); setPermissionToRemove(null); }}>确定</Button>
        </div>
      </Modal>

      {/* 分配权限 Modal */}
      <Modal
        title="分配权限"
        open={assignPermissionModalVisible}
        centered
        onCancel={() => {
          setAssignPermissionModalVisible(false);
          setSelectedPermissionsToAssign([]);
        }}
        footer={null}
      >
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <Button type="link" size="small" onClick={() => setSelectedPermissionsToAssign(availablePermissions.map((p) => p.id))}>
              全选
            </Button>
            <Button type="link" size="small" onClick={() => setSelectedPermissionsToAssign([])}>
              清空
            </Button>
          </div>
          <Select
            mode="multiple"
            showSearch
            placeholder="选择要分配的权限（可多选）"
            className="w-full"
            value={selectedPermissionsToAssign}
            onChange={setSelectedPermissionsToAssign}
            optionFilterProp="children"
            options={Object.entries(groupedPermissions).flatMap(([module, perms]) =>
              perms.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.code})`,
                group: module,
              }))
            )}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => {
              setAssignPermissionModalVisible(false);
              setSelectedPermissionsToAssign([]);
            }}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleAssignPermissionToRole}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              分配
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除角色确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteRoleModalVisible}
        centered
        onCancel={() => {
          setDeleteRoleModalVisible(false);
          setRoleToDelete(null);
        }}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          确定要删除角色 <strong>{roleToDelete?.name}</strong> 吗？
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => { setDeleteRoleModalVisible(false); setRoleToDelete(null); }}>取消</Button>
          <Button type="primary" danger onClick={() => { if (roleToDelete) { handleDeleteRole(roleToDelete.id); } setDeleteRoleModalVisible(false); setRoleToDelete(null); }}>确定</Button>
        </div>
      </Modal>

      {/* 新建权限 Modal */}
      <Modal
        title="新建权限"
        open={permissionModalVisible}
        centered
        onCancel={() => {
          setPermissionModalVisible(false);
          setPermissionFormValues(defaultPermissionForm);
        }}
        footer={null}
        width={500}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreatePermission(permissionFormValues);
          }}
        >
          <Field label="权限码">
            <Input value={permissionFormValues.code} onChange={(event) => updatePermissionForm('code', event.target.value)} placeholder="如: problem:export, user:ban" />
          </Field>
          <Field label="权限名称">
            <Input value={permissionFormValues.name} onChange={(event) => updatePermissionForm('name', event.target.value)} placeholder="如: 导出题目, 封禁用户" />
          </Field>
          <Field label="所属模块">
            <Input value={permissionFormValues.module} onChange={(event) => updatePermissionForm('module', event.target.value)} placeholder="如: 题目管理, 用户管理" />
          </Field>
          <Field label="描述">
            <Input.TextArea value={permissionFormValues.description} onChange={(event) => updatePermissionForm('description', event.target.value)} placeholder="权限描述" rows={3} />
          </Field>
          <div className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => {
                setPermissionModalVisible(false);
                setPermissionFormValues(defaultPermissionForm);
              }}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                创建
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminRoles;

