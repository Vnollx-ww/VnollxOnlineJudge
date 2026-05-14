import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminProblemApi, tagApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface ProblemExampleItem {
  input: string;
  output: string;
  sortOrder?: number;
}

export interface Problem {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  memoryLimit: number;
  difficulty: string;
  inputFormat: string;
  outputFormat: string;
  judgeMode?: string;
  checkerFile?: string;
  floatTolerance?: number;
  inputExample?: string;
  outputExample?: string;
  hint?: string;
  open: boolean;
  submitCount: number;
  passCount: number;
  tags?: string[];
}

export interface ProblemFormValues {
  title: string;
  description: string;
  timeLimit: number | string;
  memoryLimit: number | string;
  difficulty: string;
  inputFormat: string;
  outputFormat: string;
  judgeMode: string;
  floatTolerance: string;
  hint: string;
  open: boolean;
}

export const defaultProblemForm: ProblemFormValues = {
  title: '',
  description: '',
  timeLimit: 1000,
  memoryLimit: 128,
  difficulty: '简单',
  inputFormat: '',
  outputFormat: '',
  judgeMode: 'standard',
  floatTolerance: '0.00001',
  hint: '',
  open: true,
};

export const useAdminProblems = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [filterTag, setFilterTag] = useState<string | undefined>(undefined);
  const [tagOptions, setTagOptions] = useState<{ id: number; name: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [problemForm, setProblemForm] = useState<ProblemFormValues>(defaultProblemForm);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [testCaseFiles, setTestCaseFiles] = useState<File[]>([]);
  const [checkerFiles, setCheckerFiles] = useState<File[]>([]);
  const [checkerGuideVisible, setCheckerGuideVisible] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [examplesList, setExamplesList] = useState<ProblemExampleItem[]>([{ input: '', output: '', sortOrder: 0 }]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [problemToDelete, setProblemToDelete] = useState<Problem | null>(null);

  useEffect(() => {
    const loadTagList = async () => {
      try {
        const res = (await tagApi.list<{ id: number; name: string }[]>()) as ApiResponse<{ id: number; name: string }[]>;
        if (res.code === 200 && res.data) setTagOptions(res.data);
      } catch { /* ignore */ }
    };
    loadTagList();
  }, []);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = (await adminProblemApi.list<Problem[]>({
        offset: ((currentPage - 1) * pageSize).toString(),
        size: pageSize.toString(),
        keyword: keyword || undefined,
        tag: filterTag || undefined,
      })) as ApiResponse<Problem[]>;
      if (data.code === 200) setProblems(data.data || []);
      const countData = (await adminProblemApi.count({ keyword: keyword || undefined, tag: filterTag || undefined })) as ApiResponse<number>;
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error: any) {
      if (error.response?.status !== 401) toast.error('加载题目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, keyword, filterTag]);

  const showModal = async (problem: Problem | null = null) => {
    setEditingProblem(problem);
    setModalVisible(true);
    if (problem) {
      setProblemForm({
        title: problem.title,
        description: problem.description,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        difficulty: problem.difficulty,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        judgeMode: problem.judgeMode || 'standard',
        floatTolerance: String(problem.floatTolerance ?? 0.0001),
        hint: problem.hint || '',
        open: problem.open,
      });
      setTags(problem.tags || []);
      setTestCaseFiles([]);
      setCheckerFiles([]);
      try {
        const res = (await adminProblemApi.examples<ProblemExampleItem[]>(problem.id)) as ApiResponse<ProblemExampleItem[]>;
        if (res.code === 200 && res.data?.length) {
          setExamplesList(res.data.map((e, i) => ({ input: e.input ?? '', output: e.output ?? '', sortOrder: i })));
        } else {
          setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
        }
      } catch {
        setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
      }
    } else {
      setProblemForm(defaultProblemForm);
      setTags([]);
      setTestCaseFiles([]);
      setCheckerFiles([]);
      setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const data = (await adminProblemApi.delete(id)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除题目成功');
        setProblems((current) => current.filter((problem) => problem.id !== id));
        setTotal((current) => Math.max(0, current - 1));
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除题目失败');
    }
  };

  const updateProblemForm = <K extends keyof ProblemFormValues>(key: K, value: ProblemFormValues[K]) => {
    setProblemForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (values: ProblemFormValues) => {
    try {
      const formData = new FormData();
      if (editingProblem) formData.append('id', editingProblem.id.toString());
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('timeLimit', String(Number(values.timeLimit)));
      formData.append('memoryLimit', String(Number(values.memoryLimit)));
      formData.append('difficulty', values.difficulty);
      formData.append('inputFormat', values.inputFormat);
      formData.append('outputFormat', values.outputFormat);
      formData.append('judgeMode', String(values.judgeMode || 'standard'));
      if (values.judgeMode === 'float') formData.append('floatTolerance', String(values.floatTolerance ?? 0.0001));
      const validExamples = examplesList.filter((e) => (e.input ?? '').trim() || (e.output ?? '').trim());
      formData.append('examples', JSON.stringify(validExamples.map((e, i) => ({ input: e.input ?? '', output: e.output ?? '', sortOrder: i }))));
      formData.append('inputExample', validExamples[0]?.input ?? '');
      formData.append('outputExample', validExamples[0]?.output ?? '');
      formData.append('hint', values.hint || '');
      formData.append('open', values.open ? 'true' : 'false');
      if (tags.length > 0) tags.forEach((tag) => formData.append('tags', tag));
      else formData.append('tags', '');

      let hasFile = false;
      if (testCaseFiles.length > 0) { formData.append('testCaseFile', testCaseFiles[0]); hasFile = true; }
      let hasCheckerFile = false;
      if (checkerFiles.length > 0) { formData.append('checkerFile', checkerFiles[0]); hasCheckerFile = true; }
      if (!editingProblem && !hasFile) { toast.error('新建题目必须上传测试数据文件'); return; }
      if (values.judgeMode === 'special' && !hasCheckerFile && !editingProblem?.checkerFile) {
        toast.error('构造题必须上传 checker 代码文件');
        return;
      }

      let data: ApiResponse<Problem>;
      if (editingProblem) data = (await adminProblemApi.update<Problem>(formData)) as ApiResponse<Problem>;
      else data = (await adminProblemApi.add<Problem>(formData)) as ApiResponse<Problem>;

      if (data.code === 200) {
        toast.success(editingProblem ? '更新题目成功' : '创建题目成功');
        setModalVisible(false);
        if (data.data) {
          if (editingProblem) {
            setProblems((current) => current.map((problem) => (problem.id === data.data!.id ? data.data! : problem)));
          } else {
            setProblems((current) => [data.data!, ...current].slice(0, pageSize));
            setTotal((current) => current + 1);
          }
        }
      } else {
        toast.error((data as any).msg || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const handleAiParse = async () => {
    if (!aiInput.trim()) { toast.error('请先粘贴题目内容'); return; }
    setAiParsing(true);
    try {
      const prompt = `请解析以下题目描述，提取信息并返回JSON格式（不要返回其他内容，只返回纯JSON）。

要求：
1. 若题目中有多组「样例」「示例」「输入/输出」等，请全部识别并填入 examples 数组。
2. examples 为数组，每项为 { "input": "该组输入", "output": "该组输出" }，按出现顺序排列。

JSON 格式：
{
  "title": "题目标题",
  "description": "题目描述（保留原始markdown格式）",
  "inputFormat": "输入格式说明",
  "outputFormat": "输出格式说明",
  "examples": [
    { "input": "第一组输入内容", "output": "第一组输出内容" },
    { "input": "第二组输入内容", "output": "第二组输出内容" }
  ],
  "hint": "提示信息（如数据范围等，可为空）",
  "difficulty": "简单/中等/困难",
  "tags": ["标签1", "标签2"]
}

题目内容：
${aiInput}`;

      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: prompt,
      });
      if (!response.ok) throw new Error('AI服务请求失败');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');
      let fullText = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      const lines = fullText.split('\n');
      let content = '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataChunk = line.slice(5);
          if (dataChunk === '[DONE]') continue;
          content += dataChunk;
        }
      }
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI返回格式错误，无法解析');
      const parsed = JSON.parse(jsonMatch[0]);
      setProblemForm((current) => ({
        ...current,
        title: parsed.title || '',
        description: parsed.description || '',
        inputFormat: parsed.inputFormat || '',
        outputFormat: parsed.outputFormat || '',
        hint: parsed.hint || '',
        difficulty: parsed.difficulty || '简单',
      }));
      if (parsed.examples && Array.isArray(parsed.examples) && parsed.examples.length > 0) {
        setExamplesList(
          parsed.examples.map((e: { input?: string; output?: string }, i: number) => ({
            input: (e.input ?? '').trim(),
            output: (e.output ?? '').trim(),
            sortOrder: i,
          }))
        );
      } else if (parsed.inputExample != null || parsed.outputExample != null) {
        setExamplesList([{ input: (parsed.inputExample ?? '').trim(), output: (parsed.outputExample ?? '').trim(), sortOrder: 0 }]);
      } else {
        setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
      }
      if (parsed.tags && Array.isArray(parsed.tags)) setTags(parsed.tags.slice(0, 5));
      toast.success('AI解析成功，已自动填充表单');
      setAiInput('');
    } catch (error: any) {
      console.error('AI解析失败:', error);
      toast.error(error.message || 'AI解析失败，请手动填写');
    } finally {
      setAiParsing(false);
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (tags.length >= 5) { toast('最多只能添加5个标签'); return; }
    if (tagInput.length > 10) { toast('标签长度不能超过10个字符'); return; }
    if (tags.includes(tagInput.trim())) { toast('该标签已存在'); return; }
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => setTags(tags.filter((tag) => tag !== tagToRemove));

  return {
    problems,
    loading,
    total,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    keyword,
    setKeyword,
    filterTag,
    setFilterTag,
    tagOptions,
    modalVisible,
    setModalVisible,
    editingProblem,
    problemForm,
    tags,
    tagInput,
    setTagInput,
    testCaseFiles,
    setTestCaseFiles,
    checkerFiles,
    setCheckerFiles,
    checkerGuideVisible,
    setCheckerGuideVisible,
    aiInput,
    setAiInput,
    aiParsing,
    examplesList,
    setExamplesList,
    deleteModalVisible,
    setDeleteModalVisible,
    problemToDelete,
    setProblemToDelete,
    loadProblems,
    showModal,
    handleDelete,
    updateProblemForm,
    handleSubmit,
    handleAiParse,
    addTag,
    removeTag,
  };
};

export const renderLatex = (text: string) => {
  if (!text) return text;
  // Note: katex import is left to the page side to keep this hook lightweight.
  return text;
};
