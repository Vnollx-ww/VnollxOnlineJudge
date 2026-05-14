import {
  Button,
  Modal,
  Switch,
  Checkbox,
  Tag,
  List,
  Empty,
  Field,
  DataTable,
  DataColumn,
} from '@/components';
import { Plus, RefreshCw, Edit, Trash2, Settings, PlusCircle } from 'lucide-react';
import Input from '@/components/ui/input';
import PermissionGuard from '@/components/common/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import { useAdminPractices, type Practice } from '@/hooks/admin/useAdminPractices';

const AdminPractices: React.FC = () => {
  const {
    practices,
    loading,
    total,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    setKeyword,
    modalVisible,
    setModalVisible,
    editingPractice,
    practiceForm,
    problemManageVisible,
    setProblemManageVisible,
    setCurrentPracticeId,
    practiceProblems,
    setPracticeProblems,
    selectedProblems,
    setSelectedProblems,
    addProblemModalVisible,
    setAddProblemModalVisible,
    problemSearchKeyword,
    setProblemSearchKeyword,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmAction,
    confirmTargetName,
    loadPractices,
    handleAdd,
    handleEdit,
    handleManageProblems,
    handleBatchAddProblems,
    updatePracticeForm,
    handleSubmit,
    openConfirm,
    handleConfirm,
    formatTime,
    availableProblems,
  } = useAdminPractices();

  const getDifficultyTag = (difficulty: string) => {
    const colors: Record<string, string> = { 简单: 'green', 中等: 'orange', 困难: 'red' };
    return <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-gray-900">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-4">
          <Input.Search
            placeholder="搜索练习..."
            allowClear
            className="w-72"
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadPractices}>
              刷新
            </Button>
            <PermissionGuard permission={PermissionCode.PRACTICE_CREATE}>
              <Button 
                type="primary" 
                icon={<Plus className="w-4 h-4" />} 
                onClick={handleAdd}
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                新建练习
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <DataTable<Practice>
          className="rounded-none border-0 shadow-none"
          rows={practices}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        >
        <DataColumn<Practice> header="ID" width={80} cell={(practice) => practice.id} />
        <DataColumn<Practice> header="标题" cell={(practice) => practice.title} />
        <DataColumn<Practice> header="题目数量" width={100} cell={(practice) => practice.problemCount} />
        <DataColumn<Practice> header="创建时间" cell={(practice) => formatTime(practice.createTime)} />
        <DataColumn<Practice> header="状态" width={100} cell={(practice) => <Tag color={practice.isPublic ? 'green' : 'default'}>{practice.isPublic ? '公开' : '私有'}</Tag>} />
        <DataColumn<Practice>
          header="操作"
          width={320}
          cell={(practice) => (
            <div className="flex items-center gap-1">
              <PermissionGuard permission={PermissionCode.PRACTICE_UPDATE}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(practice)} title="编辑">
                  <Edit size={16} />
                </button>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.PRACTICE_UPDATE}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleManageProblems(practice)} title="管理题目">
                  <Settings size={16} />
                </button>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.PRACTICE_DELETE}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600" onClick={() => openConfirm('deletePractice', practice.id, practice.title)} title="删除">
                  <Trash2 size={16} />
                </button>
              </PermissionGuard>
            </div>
          )}
        />
        </DataTable>
      </div>

      {/* 新建/编辑练习 Modal */}
      <Modal
        title={editingPractice ? '编辑练习' : '新建练习'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        centered
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(practiceForm);
          }}
        >
          <Field label="练习标题">
            <Input value={practiceForm.title} onChange={(event) => updatePracticeForm('title', event.target.value)} />
          </Field>
          <Field label="练习描述">
            <Input.TextArea value={practiceForm.description} onChange={(event) => updatePracticeForm('description', event.target.value)} rows={4} />
          </Field>
          <Field label="是否公开">
            <Switch checked={practiceForm.isPublic} onChange={(checked) => updatePracticeForm('isPublic', checked)} />
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

      {/* 管理练习题目 Modal */}
      <Modal
        title="管理练习题目"
        open={problemManageVisible}
        onCancel={() => {
          setProblemManageVisible(false);
          setCurrentPracticeId(null);
          setPracticeProblems([]);
        }}
        footer={null}
        width={800}
        centered
        destroyOnClose
      >
        <div className="mb-4">
          <Button
            type="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              setAddProblemModalVisible(true);
              setSelectedProblems([]);
              setProblemSearchKeyword('');
            }}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            添加题目
          </Button>
        </div>

        <List
          dataSource={practiceProblems}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无题目" /> }}
          renderItem={(problem) => (
            <List.Item
              actions={[
                <Button key="delete" type="link" danger size="small" onClick={() => openConfirm('deleteProblemFromPractice', problem.id, problem.title)}>
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    <strong>#{problem.id}</strong> {problem.title}
                  </span>
                }
                description={getDifficultyTag(problem.difficulty)}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 添加题目到练习 Modal */}
      <Modal
        title="添加题目到练习"
        open={addProblemModalVisible}
        onCancel={() => {
          setAddProblemModalVisible(false);
          setSelectedProblems([]);
          setProblemSearchKeyword('');
        }}
        footer={null}
        centered
        width={700}
      >
        <div className="mb-4">
          <Input.Search
            placeholder="搜索题目..."
            value={problemSearchKeyword}
            onChange={(e) => setProblemSearchKeyword(e.target.value)}
            allowClear
          />
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--gemini-text-tertiary)' }}>已选择 {selectedProblems.length} 个题目</p>

        <div 
          className="max-h-96 overflow-auto rounded-2xl p-2"
          style={{ 
            backgroundColor: 'var(--gemini-bg)',
            border: '1px solid var(--gemini-border-light)'
          }}
        >
          {availableProblems.length === 0 ? (
            <Empty description="没有可添加的题目" />
          ) : (
            <Checkbox.Group
              value={selectedProblems}
              onChange={(values) => setSelectedProblems(values as number[])}
              className="w-full"
            >
              <div className="space-y-2">
                {availableProblems.map((problem) => (
                  <div 
                    key={problem.id} 
                    className="p-2 rounded-xl"
                    style={{ 
                      backgroundColor: 'var(--gemini-surface)',
                      border: '1px solid var(--gemini-border-light)'
                    }}
                  >
                    <Checkbox value={problem.id}>
                      <strong>#{problem.id}</strong> {problem.title} {getDifficultyTag(problem.difficulty)}
                    </Checkbox>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={() => {
              setAddProblemModalVisible(false);
              setSelectedProblems([]);
            }}
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleBatchAddProblems}
            disabled={selectedProblems.length === 0}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            批量添加 ({selectedProblems.length})
          </Button>
        </div>
      </Modal>

      {/* 确认弹窗 */}
      <Modal
        title="确认操作"
        open={confirmModalVisible}
        centered
        onCancel={() => setConfirmModalVisible(false)}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          {confirmAction === 'deletePractice' ? (
            <>确定要删除练习 <strong>{confirmTargetName}</strong> 吗？</>
          ) : (
            <>确定要从练习中删除题目 <strong>{confirmTargetName}</strong> 吗？</>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmModalVisible(false)}>取消</Button>
          <Button type="primary" danger onClick={handleConfirm}>确定</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPractices;

