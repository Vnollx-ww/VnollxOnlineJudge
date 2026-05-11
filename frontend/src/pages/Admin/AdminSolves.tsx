import { useState, useEffect } from 'react';
import { Button, Modal, Tag, DataTable, DataColumn } from '@/components';
import toast from 'react-hot-toast';
import { RefreshCw, Check, X, Trash2 } from 'lucide-react';
import { adminSolveApi } from '@/lib';
import Select from '@/components/select';
import Input from '@/components/input';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface Solve {
  id: number;
  pid: number;
  name: string;
  title: string;
  status: number;
}

const AdminSolves: React.FC = () => {
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'auditPass' | 'auditReject' | 'deleteSolve' | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);

  const openConfirm = (action: 'auditPass' | 'auditReject' | 'deleteSolve', id: number) => {
    setConfirmAction(action);
    setConfirmTargetId(id);
    setConfirmModalVisible(true);
  };

  const handleConfirm = () => {
    if (confirmTargetId === null) return;
    if (confirmAction === 'auditPass') {
      handleAudit(confirmTargetId, 1);
    } else if (confirmAction === 'auditReject') {
      handleAudit(confirmTargetId, 2);
    } else if (confirmAction === 'deleteSolve') {
      handleDelete(confirmTargetId);
    }
    setConfirmModalVisible(false);
  };

  useEffect(() => {
    loadSolves();
  }, [currentPage, pageSize, keyword, statusFilter]);

  const loadSolves = async () => {
    setLoading(true);
    try {
      const data = await adminSolveApi.list<Solve[]>({
        page: currentPage.toString(),
        size: pageSize.toString(),
        keyword: keyword || undefined,
        status: statusFilter !== null ? statusFilter : undefined,
      }) as ApiResponse<Solve[]>;
      if (data.code === 200) {
        setSolves(data.data || []);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        toast.error('加载题解列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const data = await adminSolveApi.delete(id) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除题解成功');
        loadSolves();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除题解失败');
    }
  };

  const handleAudit = async (id: number, status: number) => {
    try {
      const data = await adminSolveApi.audit(id, status) as ApiResponse;
      if (data.code === 200) {
        toast.success((data as any).msg || '审核成功');
        loadSolves();
      } else {
        toast.error((data as any).msg || '审核失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '审核失败');
    }
  };

  const getStatusTag = (status: number) => {
    const config: Record<number, { text: string; color: string }> = {
      0: { text: '未审核', color: 'default' },
      1: { text: '审核通过', color: 'success' },
      2: { text: '审核不通过', color: 'error' },
    };
    const item = config[status] || { text: '未知', color: 'default' };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-gray-900">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-50 bg-gray-50/50 p-4 sm:flex-row">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Input.Search
            placeholder="搜索题解..."
            allowClear
            className="w-72"
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(0);
            }}
          />
          <Select
            placeholder="筛选审核状态"
            className="w-40"
            allowClear
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(0);
            }}
            options={[
              { value: 0, label: '未审核' },
              { value: 1, label: '审核通过' },
              { value: 2, label: '审核不通过' },
            ]}
          />
        </div>
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadSolves}>
          刷新
        </Button>
      </div>

      <DataTable<Solve>
        rows={solves}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage + 1,
          pageSize,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
          onChange: (page, size) => {
            setCurrentPage(page - 1);
            setPageSize(size);
          },
        }}
      >
        <DataColumn<Solve> header="ID" width={80} cell={(solve) => solve.id} />
        <DataColumn<Solve> header="题目ID" width={100} cell={(solve) => solve.pid} />
        <DataColumn<Solve> header="作者" cell={(solve) => solve.name} />
        <DataColumn<Solve> header="标题" cell={(solve) => solve.title} />
        <DataColumn<Solve> header="状态" width={120} cell={(solve) => getStatusTag(solve.status)} />
        <DataColumn<Solve>
          header="操作"
          width={250}
          cell={(solve) => (
            <div className="flex items-center gap-1">
              <PermissionGuard permission={PermissionCode.SOLVE_AUDIT}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-green-50 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-40" disabled={solve.status === 1} onClick={() => openConfirm('auditPass', solve.id)} title="通过">
                  <Check size={16} />
                </button>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.SOLVE_AUDIT}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40" disabled={solve.status === 2} onClick={() => openConfirm('auditReject', solve.id)} title="不通过">
                  <X size={16} />
                </button>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.SOLVE_DELETE}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600" onClick={() => openConfirm('deleteSolve', solve.id)} title="删除">
                  <Trash2 size={16} />
                </button>
              </PermissionGuard>
            </div>
          )}
        />
      </DataTable>
      </div>

      {/* 确认弹窗 */}
      <Modal
        title="确认操作"
        open={confirmModalVisible}
        centered
        onCancel={() => setConfirmModalVisible(false)}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          {confirmAction === 'auditPass'
            ? '确认审核通过该题解？'
            : confirmAction === 'auditReject'
            ? '确认审核不通过该题解？'
            : '确定要删除这个题解吗？'}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmModalVisible(false)}>取消</Button>
          <Button type="primary" danger={confirmAction === 'deleteSolve'} onClick={handleConfirm}>确定</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminSolves;

