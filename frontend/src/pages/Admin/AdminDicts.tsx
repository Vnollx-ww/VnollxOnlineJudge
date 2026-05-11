import { type ChangeEvent } from 'react';
import { CheckCircle2, Edit, Layers3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button, Empty, Field, InputNumber, Modal, Spin, Tag } from '@/components';
import Input from '@/components/input';
import Select from '@/components/select';
import { useAdminDicts, statusOptions, defaultOptions } from '@/hooks/useAdminDicts';

const AdminDicts: React.FC = () => {
  const {
    dataList,
    selectedType,
    setSelectedType,
    typeKeyword,
    setTypeKeyword,
    typeLoading,
    dataLoading,
    typeModalVisible,
    setTypeModalVisible,
    dataModalVisible,
    setDataModalVisible,
    deleteModalVisible,
    setDeleteModalVisible,
    deleteTarget,
    setDeleteTarget,
    editingTypeId,
    editingDataId,
    typeForm,
    dataForm,
    filteredTypes,
    loadTypes,
    loadData,
    openCreateType,
    openEditType,
    openCreateData,
    openEditData,
    saveType,
    saveData,
    confirmDelete,
    updateTypeForm,
    updateDataForm,
  } = useAdminDicts();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-slate-900">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[320px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-bold text-slate-900">字典类型</div>
                <div className="text-xs text-slate-400">点击切换右侧数据</div>
              </div>
              <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateType} style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}>新增</Button>
            </div>
            <Input value={typeKeyword} onChange={(event) => setTypeKeyword(event.target.value)} placeholder="搜索名称或编码" allowClear prefix={<Search className="h-4 w-4" />} />
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {typeLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400"><Spin spinning /> 加载中...</div>
            ) : filteredTypes.length === 0 ? (
              <Empty description="暂无字典类型" />
            ) : (
              <div className="space-y-2">
                {filteredTypes.map((item) => {
                  const active = selectedType?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedType(item)}
                      className={`group w-full rounded-2xl border p-3 text-left transition-all ${active ? 'border-blue-200 bg-blue-50 shadow-sm shadow-blue-100' : 'border-transparent bg-slate-50/70 hover:border-slate-200 hover:bg-white hover:shadow-sm'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`truncate text-sm font-bold ${active ? 'text-blue-700' : 'text-slate-800'}`}>{item.dictName}</div>
                          <div className="mt-1 truncate font-mono text-xs text-slate-400">{item.dictType}</div>
                        </div>
                        <Tag color={item.status === 1 ? 'success' : 'default'}>{item.status === 1 ? '正常' : '停用'}</Tag>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-1 opacity-100 xl:opacity-0 xl:transition xl:group-hover:opacity-100">
                        <span onClick={(event) => { event.stopPropagation(); openEditType(item); }} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"><Edit className="h-3.5 w-3.5" />编辑</span>
                        <span onClick={(event) => { event.stopPropagation(); setDeleteTarget({ kind: 'type', id: item.id, name: item.dictName }); setDeleteModalVisible(true); }} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />删除</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Layers3 className="h-5 w-5" /></div>
              <div>
                <div className="text-base font-bold text-slate-900">{selectedType?.dictName ?? '字典数据'}</div>
                <div className="text-xs text-slate-400">{selectedType ? `共 ${dataList.length} 条数据，编码 ${selectedType.dictType}` : '请选择左侧字典类型'}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button icon={<RefreshCw className="h-4 w-4" />} loading={dataLoading || typeLoading} onClick={() => selectedType ? loadData(selectedType.dictType) : loadTypes()}>刷新</Button>
              <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateData} disabled={!selectedType} style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}>新增数据</Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {!selectedType ? (
              <div className="flex h-full items-center justify-center"><Empty description="请先选择一个字典类型" /></div>
            ) : dataLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400"><Spin spinning /> 加载中...</div>
            ) : dataList.length === 0 ? (
              <div className="flex h-full items-center justify-center"><Empty description="暂无字典数据" /></div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {dataList.map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50">
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-blue-50/70" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-bold text-slate-900">{item.dictLabel}</h3>
                          {item.isDefault === 1 ? <Tag color="blue"><CheckCircle2 className="h-3 w-3" />默认</Tag> : null}
                        </div>
                        <div className="mt-2 inline-flex rounded-xl bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-500">{item.dictValue}</div>
                      </div>
                      <Tag color={item.status === 1 ? 'success' : 'default'}>{item.status === 1 ? '正常' : '停用'}</Tag>
                    </div>
                    <div className="relative mt-5 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-100">
                        <div className="text-slate-400">排序</div>
                        <div className="mt-1 font-bold text-slate-700">{item.sort ?? 0}</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-100">
                        <div className="text-slate-400">样式</div>
                        <div className="mt-1 truncate font-bold text-slate-700">{item.cssClass || item.listClass || '-'}</div>
                      </div>
                    </div>
                    {item.remark ? <p className="relative mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{item.remark}</p> : null}
                    <div className="relative mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <button type="button" onClick={() => openEditData(item)} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"><Edit className="h-3.5 w-3.5" />编辑</button>
                      <button type="button" onClick={() => { setDeleteTarget({ kind: 'data', id: item.id, name: item.dictLabel }); setDeleteModalVisible(true); }} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" />删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal title={editingTypeId ? '编辑字典类型' : '新增字典类型'} open={typeModalVisible} onCancel={() => setTypeModalVisible(false)} footer={null} width={560} centered>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); saveType(); }}>
          <Field label="字典名称"><Input value={typeForm.dictName} onChange={(event) => updateTypeForm('dictName', event.target.value)} placeholder="如：用户性别" /></Field>
          <Field label="类型编码"><Input value={typeForm.dictType} onChange={(event) => updateTypeForm('dictType', event.target.value)} placeholder="如：sys_user_sex" /></Field>
          <Field label="状态"><Select value={typeForm.status} onChange={(value) => updateTypeForm('status', value)} options={statusOptions} /></Field>
          <Field label="备注"><Input.TextArea value={typeForm.remark} onChange={(event) => updateTypeForm('remark', event.target.value)} placeholder="可选，说明该字典用途" rows={3} /></Field>
          <div className="flex justify-end gap-2"><Button onClick={() => setTypeModalVisible(false)}>取消</Button><Button type="primary" htmlType="submit" style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}>保存</Button></div>
        </form>
      </Modal>

      <Modal title={editingDataId ? '编辑字典数据' : '新增字典数据'} open={dataModalVisible} onCancel={() => setDataModalVisible(false)} footer={null} width={680} centered>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); saveData(); }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="字典类型"><Input value={dataForm.dictType} disabled /></Field>
            <Field label="排序"><InputNumber min={0} value={dataForm.sort} onChange={(event: ChangeEvent<HTMLInputElement>) => updateDataForm('sort', event.target.value)} /></Field>
            <Field label="字典标签"><Input value={dataForm.dictLabel} onChange={(event) => updateDataForm('dictLabel', event.target.value)} placeholder="如：男" /></Field>
            <Field label="字典键值"><Input value={dataForm.dictValue} onChange={(event) => updateDataForm('dictValue', event.target.value)} placeholder="如：male" /></Field>
            <Field label="是否默认"><Select value={dataForm.isDefault} onChange={(value) => updateDataForm('isDefault', value)} options={defaultOptions} /></Field>
            <Field label="状态"><Select value={dataForm.status} onChange={(value) => updateDataForm('status', value)} options={statusOptions} /></Field>
            <Field label="CSS Class"><Input value={dataForm.cssClass} onChange={(event) => updateDataForm('cssClass', event.target.value)} placeholder="如：success" /></Field>
            <Field label="List Class"><Input value={dataForm.listClass} onChange={(event) => updateDataForm('listClass', event.target.value)} placeholder="如：primary" /></Field>
          </div>
          <Field label="备注"><Input.TextArea value={dataForm.remark} onChange={(event) => updateDataForm('remark', event.target.value)} rows={3} placeholder="可选，说明该数据项用途" /></Field>
          <div className="flex justify-end gap-2"><Button onClick={() => setDataModalVisible(false)}>取消</Button><Button type="primary" htmlType="submit" style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}>保存</Button></div>
        </form>
      </Modal>

      <Modal title="确认删除" open={deleteModalVisible} onCancel={() => { setDeleteModalVisible(false); setDeleteTarget(null); }} footer={null} centered>
        <div className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-700">
          确定要删除 <strong>{deleteTarget?.name}</strong> 吗？{deleteTarget?.kind === 'type' ? ' 删除字典类型会同时删除该类型下的所有字典数据。' : ''}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button onClick={() => { setDeleteModalVisible(false); setDeleteTarget(null); }}>取消</Button><Button type="primary" danger onClick={confirmDelete}>确定删除</Button></div>
      </Modal>
    </div>
  );
};

export default AdminDicts;
