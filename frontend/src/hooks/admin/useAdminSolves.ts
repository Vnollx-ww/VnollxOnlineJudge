import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminSolveApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface Solve {
  id: number;
  pid: number;
  name: string;
  title: string;
  status: number;
}

export type AdminSolveConfirmAction = 'auditPass' | 'auditReject' | 'deleteSolve';

export const useAdminSolves = () => {
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<AdminSolveConfirmAction | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);

  const loadSolves = async () => {
    setLoading(true);
    try {
      const data = (await adminSolveApi.list<Solve[]>({
        page: currentPage.toString(),
        size: pageSize.toString(),
        keyword: keyword || undefined,
        status: statusFilter !== null ? statusFilter : undefined,
      })) as ApiResponse<Solve[]>;
      if (data.code === 200) setSolves(data.data || []);
    } catch (error: any) {
      if (error.response?.status !== 401) toast.error('加载题解列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, keyword, statusFilter]);

  const handleDelete = async (id: number) => {
    try {
      const data = (await adminSolveApi.delete(id)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除题解成功');
        setSolves((current) => current.filter((solve) => solve.id !== id));
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除题解失败');
    }
  };

  const handleAudit = async (id: number, status: number) => {
    try {
      const data = (await adminSolveApi.audit(id, status)) as ApiResponse;
      if (data.code === 200) {
        toast.success((data as any).msg || '审核成功');
        setSolves((current) => current.map((solve) => (solve.id === id ? { ...solve, status } : solve)));
      } else {
        toast.error((data as any).msg || '审核失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '审核失败');
    }
  };

  const openConfirm = (action: AdminSolveConfirmAction, id: number) => {
    setConfirmAction(action);
    setConfirmTargetId(id);
    setConfirmModalVisible(true);
  };

  const handleConfirm = () => {
    if (confirmTargetId === null) return;
    if (confirmAction === 'auditPass') handleAudit(confirmTargetId, 1);
    else if (confirmAction === 'auditReject') handleAudit(confirmTargetId, 2);
    else if (confirmAction === 'deleteSolve') handleDelete(confirmTargetId);
    setConfirmModalVisible(false);
  };

  return {
    solves,
    loading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    keyword,
    setKeyword,
    statusFilter,
    setStatusFilter,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmAction,
    loadSolves,
    openConfirm,
    handleConfirm,
  };
};
