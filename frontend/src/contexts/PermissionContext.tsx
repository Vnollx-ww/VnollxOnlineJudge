import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '@/utils/api';
import { isAuthenticated } from '@/utils/auth';
import type { ApiResponse } from '@/types';

interface PermissionContextType {
  permissions: Set<string>;
  loading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
  hasAllPermissions: (...codes: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: new Set(),
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  refreshPermissions: async () => {},
});

export const usePermission = () => useContext(PermissionContext);

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!isAuthenticated()) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    try {
      const data = await api.get('/admin/permission/my/permissions') as ApiResponse<string[]>;
      if (data.code === 200 && data.data) {
        setPermissions(new Set(data.data));
      }
    } catch (error) {
      console.error('加载权限失败:', error);
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();

    // 监听登录状态变化
    const handleStorageChange = () => {
      loadPermissions();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleStorageChange);
    };
  }, [loadPermissions]);

  const hasPermission = useCallback((code: string): boolean => {
    return permissions.has(code);
  }, [permissions]);

  const hasAnyPermission = useCallback((...codes: string[]): boolean => {
    return codes.some(code => permissions.has(code));
  }, [permissions]);

  const hasAllPermissions = useCallback((...codes: string[]): boolean => {
    return codes.every(code => permissions.has(code));
  }, [permissions]);

  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    await loadPermissions();
  }, [loadPermissions]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;
