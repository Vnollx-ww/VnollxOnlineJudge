import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminRoleApi, adminUserApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface User {
  id: number;
  name: string;
  email: string;
  identity: string;
  submitCount: number;
  passCount: number;
  lastLoginTime?: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
}

export interface UserFormValues {
  name: string;
  email: string;
  identity: string;
}

export const defaultUserForm: UserFormValues = { name: '', email: '', identity: '' };

export const roleColorMap: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-50 text-red-600 border-red-100',
  ADMIN: 'bg-orange-50 text-orange-600 border-orange-100',
  TEACHER: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  USER: 'bg-blue-50 text-blue-600 border-blue-100',
  GUEST: 'bg-gray-50 text-gray-500 border-gray-100',
};

export const useAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<UserFormValues>(defaultUserForm);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const currentIdentity = localStorage.getItem('identity');

  const loadRoles = async () => {
    try {
      const data = (await adminRoleApi.listRoles<Role[]>()) as ApiResponse<Role[]>;
      if (data.code === 200) setRoles(data.data || []);
    } catch {
      toast.error('加载角色列表失败');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = (await adminUserApi.list<User[]>({
        pageNum: currentPage.toString(),
        pageSize: pageSize.toString(),
        keyword: keyword || undefined,
      })) as ApiResponse<User[]>;
      if (data.code === 200) setUsers(data.data || []);
      const countData = (await adminUserApi.count({ keyword: keyword || undefined })) as ApiResponse<number>;
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error: any) {
      if (error.response?.status !== 401) toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, keyword]);

  useEffect(() => {
    loadRoles();
  }, []);

  const handleAdd = () => {
    setEditingUser(null);
    setUserForm(defaultUserForm);
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    if (!canOperateUser(user)) {
      toast.error('无权限操作该用户');
      return;
    }
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, identity: user.identity });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const data = (await adminUserApi.delete(id)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除用户成功');
        loadUsers();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除用户失败');
    }
  };

  const updateUserForm = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setUserForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (values: UserFormValues) => {
    try {
      if (editingUser) {
        const data = (await adminUserApi.update({ id: editingUser.id, ...values } as Record<string, unknown>)) as ApiResponse;
        if (data.code === 200) {
          toast.success('更新用户成功');
          setModalVisible(false);
          loadUsers();
        } else {
          toast.error((data as any).msg || '更新失败');
        }
      } else {
        const data = (await adminUserApi.add({ ...values })) as ApiResponse;
        if (data.code === 200) {
          toast.success('添加用户成功');
          setModalVisible(false);
          loadUsers();
        } else {
          toast.error((data as any).msg || '添加失败');
        }
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const getIdentityMeta = (identity: string) => {
    const role = roles.find((item) => item.code === identity);
    return {
      text: role?.name || identity,
      className: roleColorMap[identity] || 'bg-slate-50 text-slate-600 border-slate-100',
    };
  };

  const canOperateUser = (user: User) => {
    if (currentIdentity === 'SUPER_ADMIN') return user.identity !== 'SUPER_ADMIN';
    if (currentIdentity === 'ADMIN') return user.identity === 'USER' || user.identity === 'VIP';
    return false;
  };
  const identityOptions = roles
    .filter((role) => {
      if (currentIdentity === 'SUPER_ADMIN') return role.code !== 'SUPER_ADMIN';
      if (currentIdentity === 'ADMIN') return role.code === 'USER' || role.code === 'VIP';
      return false;
    })
    .map((role) => ({ value: role.code, label: role.name }));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalSubmitCount = useMemo(() => users.reduce((sum, user) => sum + (user.submitCount || 0), 0), [users]);
  const totalPassCount = useMemo(() => users.reduce((sum, user) => sum + (user.passCount || 0), 0), [users]);
  const passRate = totalSubmitCount > 0 ? `${((totalPassCount / totalSubmitCount) * 100).toFixed(1)}%` : '0%';
  const adminCount = useMemo(() => users.filter((user) => ['SUPER_ADMIN', 'ADMIN'].includes(user.identity)).length, [users]);
  const formatLastLogin = (value?: string) => (value ? value.replace('T', ' ') : '从未登录');
  const getUserInitial = (name: string) => (name || '?').charAt(0).toUpperCase();
  const getPassPercent = (user: User) => (user.submitCount > 0 ? Math.round((user.passCount / user.submitCount) * 100) : 0);

  return {
    users,
    roles,
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
    totalPages,
    passRate,
    adminCount,
    formatLastLogin,
    getUserInitial,
    getPassPercent,
  };
};
