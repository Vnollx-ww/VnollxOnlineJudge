import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminDictApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface DictTypeVo {
  id: number;
  dictName: string;
  dictType: string;
  status: number;
  remark?: string;
}

export interface DictDataVo {
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

export interface DictTypeFormValues {
  dictName: string;
  dictType: string;
  status: number;
  remark: string;
}

export interface DictDataFormValues {
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

export const defaultTypeForm: DictTypeFormValues = { dictName: '', dictType: '', status: 1, remark: '' };
export const defaultDataForm: DictDataFormValues = { dictType: '', dictLabel: '', dictValue: '', sort: 0, cssClass: '', listClass: '', isDefault: 0, status: 1, remark: '' };

export const statusOptions = [
  { value: 1, label: '正常' },
  { value: 0, label: '停用' },
];

export const defaultOptions = [
  { value: 1, label: '是' },
  { value: 0, label: '否' },
];

const getErrorMessage = (res: unknown, fallback: string) => (res as { msg?: string })?.msg || fallback;

export const useAdminDicts = () => {
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

  const loadTypes = async () => {
    setTypeLoading(true);
    try {
      const res = (await adminDictApi.typeList<DictTypeVo[]>()) as ApiResponse<DictTypeVo[]>;
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
      const res = (await adminDictApi.dataList<DictDataVo[]>(dictType)) as ApiResponse<DictDataVo[]>;
      if (res.code === 200) setDataList(res.data ?? []);
      else toast.error(getErrorMessage(res, '加载字典数据失败'));
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
    if (selectedType?.dictType) loadData(selectedType.dictType);
    else setDataList([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = (await adminDictApi.saveType<number>({ id: editingTypeId ?? undefined, ...typeForm })) as ApiResponse<number>;
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
      const res = (await adminDictApi.saveData<number>(payload)) as ApiResponse<number>;
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
      const res = (await (deleteTarget.kind === 'type'
        ? adminDictApi.deleteType(deleteTarget.id)
        : adminDictApi.deleteData(deleteTarget.id))) as ApiResponse;
      if (res.code === 200) {
        toast.success('删除成功');
        setDeleteModalVisible(false);
        setDeleteTarget(null);
        if (deleteTarget.kind === 'type') await loadTypes();
        else if (selectedType) await loadData(selectedType.dictType);
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

  return {
    types,
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
  };
};
