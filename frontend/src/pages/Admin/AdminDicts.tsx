import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Edit, Layers3, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { Button, Empty, Field, InputNumber, Modal, Spin, Tag } from '@/components';
import Input from '@/components/Input';
import Select from '@/components/Select';
import api from '@/utils/api';
import type { ApiResponse } from '@/types';

interface DictTypeVo {
  id: number;
  dictName: string;
  dictType: string;
  status: number;
  remark?: string;
}

interface DictDataVo {
  id: number;
  dictType: string;
  dictLabel: string;
  dictValue: string;
  sort: number;
  cssClass?: string;
  listClass?: string;
  isDefault: number;
  status: number;
  remark?: string;
}

interface DictTypeFormValues {
  dictName: string;
  dictType: string;
  status: number;
  remark: string;
}

interface DictDataFormValues {
  dictType: string;
  dictLabel: string;
  dictValue: string;
  sort: number | string;
  cssClass: string;
  listClass: string;
  isDefault: number;
  status: number;
  remark: string;
}

const defaultTypeForm: DictTypeFormValues = {
  dictName: '',
  dictType: '',
  status: 1,
  remark: '',
};

const defaultDataForm: DictDataFormValues = {
  dictType: '',
  dictLabel: '',
  dictValue: '',
  sort: 0,
  cssClass: '',
  listClass: '',
  isDefault: 0,
  status: 1,
  remark: '',
};

const statusOptions = [
  { value: 1, label: '正常' },
  { value: 0, label: '停用' },
];

const defaultOptions = [
  { value: 1, label: '是' },
  { value: 0, label: '否' },
];

const getErrorMessage = (res: unknown, fallback: string) => {
  return (res as { msg?: string })?.msg || fallback;
};

const AdminDicts: React.FC = () => {
  const [types, setTypes] = useState<DictTypeVo[]>([]);
  const [dataList, setDataList] = useState<DictDataVo[]>([]);
  const [selectedType, setSelectedType] = useState<DictTypeVo | null>(null);
  const [typeKeyword, setTypeKeyword] = useState('');
  const [typeLoading, setTypeLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [dataModalVisible, setDataModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'type' | 'data'; id: number; name: string } | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingDataId, setEditingDataId] = useState<number | null>(null);
  const [typeForm, setTypeForm] = useState<DictTypeFormValues>(defaultTypeForm);
  const [dataForm, setDataForm] = useState<DictDataFormValues>(defaultDataForm);

  const filteredTypes = useMemo(() => {
    const keyword = typeKeyword.trim().toLowerCase();
    if (!keyword) return types;
    return types.filter((item) => item.dictName.toLowerCase().includes(keyword) || item.dictType.toLowerCase().includes(keyword));
  }, [types, typeKeyword]);

  const enabledTypeCount = useMemo(() => types.filter((item) => item.status === 1).length, [types]);

  const loadTypes = async () => {
    setTypeLoading(true);
    try {
      const res = await api.get('/admin/dict/type/list') as ApiResponse<DictTypeVo[]>;
      if (res.code === 200) {
        const nextTypes = res.data ?? [];
        setTypes(nextTypes);
        setSelectedType((current) => {
          if (!current) return nextTypes[0] ?? null;
          return nextTypes.find((item) => item.id === current.id) ?? nextTypes[0] ?? null;
        });
      } else {
        toast.error(getErrorMessage(res, '加载字典类型失败'));
      }
    } catch {
      toast.error('加载字典类型失败');
    } finally {
      setTypeLoading(false);
    }
  };

  const loadData = async (dictType: string) => {
    setDataLoading(true);
    try {
      const res = await api.get('/admin/dict/data/list', { params: { dictType } }) as ApiResponse<DictDataVo[]>;
      if (res.code === 200) {
        setDataList(res.data ?? []);
      } else {
        toast.error(getErrorMessage(res, '加载字典数据失败'));
      }
    } catch {
      toast.error('加载字典数据失败');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    if (selectedType?.dictType) {
      loadData(selectedType.dictType);
    } else {
      setDataList([]);
    }
  }, [selectedType?.dictType]);

  const openCreateType = () => {
    setEditingTypeId(null);
    setTypeForm(defaultTypeForm);
    setTypeModalVisible(true);
  };

  const openEditType = (item: DictTypeVo) => {
    setEditingTypeId(item.id);
    setTypeForm({
      dictName: item.dictName,
      dictType: item.dictType,
      status: item.status ?? 1,
      remark: item.remark ?? '',
    });
    setTypeModalVisible(true);
  };

  const openCreateData = () => {
    if (!selectedType) {
      toast.error('请先选择字典类型');
      return;
    }
    setEditingDataId(null);
    setDataForm({ ...defaultDataForm, dictType: selectedType.dictType });
    setDataModalVisible(true);
  };

  const openEditData = (item: DictDataVo) => {
    setEditingDataId(item.id);
    setDataForm({
      dictType: item.dictType,
      dictLabel: item.dictLabel,
      dictValue: item.dictValue,
      sort: item.sort ?? 0,
      cssClass: item.cssClass ?? '',
      listClass: item.listClass ?? '',
      isDefault: item.isDefault ?? 0,
      status: item.status ?? 1,
      remark: item.remark ?? '',
    });
    setDataModalVisible(true);
  };

  const saveType = async () => {
    if (!typeForm.dictName.trim() || !typeForm.dictType.trim()) {
      toast.error('请填写字典名称和类型编码');
      return;
    }
    try {
      const res = await api.post('/admin/dict/type/save', { id: editingTypeId ?? undefined, ...typeForm }) as ApiResponse<number>;
      if (res.code === 200) {
        toast.success(editingTypeId ? '字典类型已更新' : '字典类型已创建');
        setTypeModalVisible(false);
        await loadTypes();
      } else {
        toast.error(getErrorMessage(res, '保存失败'));
      }
    } catch {
      toast.error('保存失败');
    }
  };

  const saveData = async () => {
    if (!dataForm.dictType.trim() || !dataForm.dictLabel.trim() || !dataForm.dictValue.trim()) {
      toast.error('请填写字典类型、标签和值');
      return;
    }
    try {
      const payload = { ...dataForm, id: editingDataId ?? undefined, sort: Number(dataForm.sort) || 0 };
      const res = await api.post('/admin/dict/data/save', payload) as ApiResponse<number>;
      if (res.code === 200) {
        toast.success(editingDataId ? '字典数据已更新' : '字典数据已创建');
        setDataModalVisible(false);
        if (selectedType) loadData(selectedType.dictType);
      } else {
        toast.error(getErrorMessage(res, '保存失败'));
      }
    } catch {
      toast.error('保存失败');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const url = deleteTarget.kind === 'type' ? `/admin/dict/type/${deleteTarget.id}` : `/admin/dict/data/${deleteTarget.id}`;
      const res = await api.delete(url) as ApiResponse;
      if (res.code === 200) {
        toast.success('删除成功');
        setDeleteModalVisible(false);
        setDeleteTarget(null);
        if (deleteTarget.kind === 'type') {
          await loadTypes();
        } else if (selectedType) {
          await loadData(selectedType.dictType);
        }
      } else {
        toast.error(getErrorMessage(res, '删除失败'));
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const updateTypeForm = <K extends keyof DictTypeFormValues>(key: K, value: DictTypeFormValues[K]) => {
    setTypeForm((current) => ({ ...current, [key]: value }));
  };

  const updateDataForm = <K extends keyof DictDataFormValues>(key: K, value: DictDataFormValues[K]) => {
    setDataForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-slate-900">
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-6 text-white shadow-lg shadow-blue-100">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                系统配置中心
              </div>
              <h1 className="text-2xl font-bold tracking-tight">字典管理</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">统一维护业务枚举、状态标签和前端回显文案，左侧选择类型，右侧以卡片网格查看和维护字典数据。</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur">
                <div className="text-2xl font-bold">{types.length}</div>
                <div className="text-xs text-blue-50">类型总数</div>
              </div>
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur">
                <div className="text-2xl font-bold">{enabledTypeCount}</div>
                <div className="text-xs text-blue-50">启用类型</div>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">当前类型</div>
              <div className="mt-1 text-xs text-slate-400">{selectedType ? `${selectedType.dictName} / ${selectedType.dictType}` : '请选择字典类型'}</div>
            </div>
          </div>
        </div>
      </div>

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
