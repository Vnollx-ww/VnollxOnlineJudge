import { useState, useEffect } from 'react';
import { Button, Tag, DataTable, DataColumn, ConfirmButton } from '@/components';
import toast from 'react-hot-toast';
import { RefreshCw, Check, X, Trash2 } from 'lucide-react';
import api from '@/utils/api';
import Select from '@/components/Select';
import Input from '@/components/Input';
import PermissionGuard from '@/components/PermissionGuard';
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

  useEffect(() => {
    loadSolves();
  }, [currentPage, pageSize, keyword, statusFilter]);

  const loadSolves = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/solve/list', {
        params: {
          page: currentPage.toString(),
          size: pageSize.toString(),
          keyword: keyword || undefined,
          status: statusFilter !== null ? statusFilter : undefined,
        },
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
      const data = await api.delete(`/admin/solve/${id}`) as ApiResponse;
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
      const data = await api.put(`/admin/solve/${id}/status`, null, {
        params: { status },
      }) as ApiResponse;
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
    <div className="gemini-card">
      {/* Header - Gemini 风格 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题解列表</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统中的所有题解</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
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

      {/* Table */}
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
          action
          cell={(solve) => (
            <div className="flex gap-2">
              <PermissionGuard permission={PermissionCode.SOLVE_AUDIT}>
                <ConfirmButton message="确认审核通过该题解？" onConfirm={() => handleAudit(solve.id, 1)}>
                  <Button type="text" size="small" icon={<Check className="w-3 h-3" />} disabled={solve.status === 1}>
                    通过
                  </Button>
                </ConfirmButton>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.SOLVE_AUDIT}>
                <ConfirmButton message="确认审核不通过该题解？" onConfirm={() => handleAudit(solve.id, 2)}>
                  <Button danger size="small" icon={<X className="w-3 h-3" />} disabled={solve.status === 2}>
                    不通过
                  </Button>
                </ConfirmButton>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.SOLVE_DELETE}>
                <ConfirmButton message="确定要删除这个题解吗？" onConfirm={() => handleDelete(solve.id)}>
                  <Button type="link" danger size="small" icon={<Trash2 className="w-3 h-3" />}>
                    删除
                  </Button>
                </ConfirmButton>
              </PermissionGuard>
            </div>
          )}
        />
      </DataTable>
    </div>
  );
};

export default AdminSolves;

