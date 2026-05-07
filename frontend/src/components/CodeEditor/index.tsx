import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Monaco Editor 类型定义
interface Monaco {
  editor: {
    create: (container: HTMLElement, options: Record<string, unknown>) => MonacoEditor;
    setModelLanguage: (model: unknown, language: string) => void;
  };
  languages: {
    CompletionItemKind: Record<string, number>;
    CompletionItemInsertTextRule: Record<string, number>;
    registerCompletionItemProvider: (
      language: string,
      provider: CompletionProvider
    ) => void;
  };
}

interface MonacoEditor {
  getValue: () => string;
  setValue: (value: string) => void;
  getModel: () => unknown;
  dispose: () => void;
  trigger: (source: string, handlerId: string, payload: unknown) => void;
  addCommand: (keybinding: number, handler: () => void) => void;
  updateOptions: (options: Record<string, unknown>) => void;
  getPosition: () => { lineNumber: number; column: number } | null;
  onDidChangeModelContent: (callback: () => void) => void;
  onDidChangeCursorPosition: (callback: () => void) => void;
}

interface CompletionProvider {
  triggerCharacters: string[];
  provideCompletionItems: () => { suggestions: CompletionItem[] };
}

interface CompletionItem {
  label: string;
  kind: number;
  insertText: string;
  insertTextRules?: number;
  detail?: string;
}

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: number | string;
  storageKey?: string;
  readOnly?: boolean;
  options?: Record<string, unknown>;
  statusBar?: boolean;
}

// 使用 CDN 加载 Monaco Editor
const MONACO_VERSION = '0.45.0';
const MONACO_CDN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

let monacoPromise: Promise<Monaco> | null = null;
let preloadStarted = false;

const loadMonaco = (): Promise<Monaco> => {
  if (monacoPromise) return monacoPromise;

  monacoPromise = new Promise((resolve, reject) => {
    // 检查是否已加载
    if ((window as any).monaco) {
      resolve((window as any).monaco);
      return;
    }

    // 配置 Monaco 路径 - 使用 CDN
    const loaderScript = document.createElement('script');
    loaderScript.src = `${MONACO_CDN}/loader.js`;
    loaderScript.onload = () => {
      const amdRequire = (window as any).require;
      amdRequire.config({
        paths: {
          'vs': MONACO_CDN
        }
      });
      amdRequire(['vs/editor/editor.main'], (monaco: Monaco) => {
        (window as any).monaco = monaco;
        resolve(monaco);
      });
    };
    loaderScript.onerror = () => {
      monacoPromise = null; // 允许重试
      reject(new Error('Monaco loader 加载失败，请检查网络连接'));
    };
    document.head.appendChild(loaderScript);
  });

  return monacoPromise;
};

/**
 * 预加载 Monaco Editor - 应用启动时调用
 * 添加 preconnect 和 prefetch 优化 CDN 资源加载
 */
export const preloadMonacoEditor = (): void => {
  if (preloadStarted) return;
  preloadStarted = true;

  // 添加 preconnect 提前建立连接
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://cdn.jsdelivr.net';
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);

  // 添加 dns-prefetch 作为回退
  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = 'https://cdn.jsdelivr.net';
  document.head.appendChild(dnsPrefetch);

  // 预加载 Monaco loader 脚本
  const prefetchLoader = document.createElement('link');
  prefetchLoader.rel = 'prefetch';
  prefetchLoader.href = `${MONACO_CDN}/loader.js`;
  prefetchLoader.as = 'script';
  document.head.appendChild(prefetchLoader);

  // 延迟预加载完整 Monaco（不阻塞首屏）
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      loadMonaco().catch(() => {});
    }, { timeout: 3000 });
  } else {
    setTimeout(() => {
      loadMonaco().catch(() => {});
    }, 1000);
  }
};

const normalizeLanguage = (lang?: string): string => {
  if (!lang) return 'plaintext';
  if (lang === 'cpp') return 'cpp';
  if (lang === 'python') return 'python';
  if (lang === 'java') return 'java';
  return lang;
};

// 使用全局变量跟踪 provider 安装状态
let providersInstalled = false;

const ensureProviders = (monaco: Monaco) => {
  if (!monaco) return;
  if (providersInstalled) return;

  const mkKeywordItems = (keywords: string[], kind: number): CompletionItem[] =>
    keywords.map((k) => ({
      label: k,
      kind,
      insertText: k,
    }));

  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;

  const cppKeywords = [
    'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'continue',
    'default', 'delete', 'do', 'double', 'else', 'enum', 'explicit', 'extern', 'false',
    'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'namespace', 'new',
    'nullptr', 'operator', 'private', 'protected', 'public', 'return', 'short', 'signed',
    'sizeof', 'static', 'struct', 'switch', 'template', 'this', 'throw', 'true', 'try',
    'typedef', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'while',
  ];

  const cppStdlib = [
    'cin', 'cout', 'cerr', 'endl', 'string', 'vector', 'map', 'set', 'unordered_map', 'unordered_set',
    'multiset', 'unordered_multiset', 'multimap', 'unordered_multimap', 'pair', 'tuple', 'queue',
    'priority_queue', 'stack', 'deque', 'list', 'array', 'bitset', 'optional',
    'sort', 'stable_sort', 'reverse', 'find', 'lower_bound', 'upper_bound', 'binary_search',
    'next_permutation', 'prev_permutation', 'unique', 'merge', 'inplace_merge',
    'min', 'max', 'min_element', 'max_element', 'swap', 'abs', 'pow', 'sqrt', 'ceil', 'floor', 'round',
    'gcd', 'lcm', 'accumulate', 'iota', 'partial_sum', 'nth_element',
    'push_back', 'pop_back', 'push', 'pop', 'front', 'back', 'begin', 'end', 'size', 'empty', 'clear',
    'first', 'second', 'insert', 'erase', 'count', 'find', 'emplace', 'emplace_back', 'resize', 'assign',
    'memset', 'memcpy', 'ios', 'sync_with_stdio', 'tie', 'fixed', 'setprecision',
    'long long', 'const int', 'const long long', 'INT_MAX', 'INT_MIN', 'LLONG_MAX', 'LLONG_MIN', 'MOD',
  ];

  const pythonKeywords = [
    'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
    'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try',
    'while', 'with', 'yield',
  ];

  const pythonStdlib = [
    'print', 'input', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'bool',
    'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
    'sum', 'min', 'max', 'abs', 'round', 'pow', 'divmod', 'open',
    'sys', 'stdin', 'stdout', 'readline', 'split', 'strip', 'append', 'extend', 'pop',
    'deque', 'Counter', 'defaultdict', 'heapq', 'heappush', 'heappop', 'bisect_left', 'bisect_right',
    'math', 'gcd', 'lcm', 'sqrt', 'ceil', 'floor', 'inf', 'itertools', 'permutations', 'combinations',
    'product', 'accumulate', 'lru_cache',
  ];

  const javaKeywords = [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
    'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
    'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
    'interface', 'long', 'native', 'new', 'null', 'package', 'private', 'protected',
    'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
    'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while',
  ];

  const javaStdlib = [
    'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character',
    'System', 'out', 'in', 'println', 'print', 'printf',
    'Scanner', 'nextInt', 'nextLong', 'nextDouble', 'nextLine', 'next', 'hasNext', 'hasNextInt',
    'BufferedReader', 'InputStreamReader', 'StringTokenizer', 'PrintWriter', 'IOException',
    'Arrays', 'Collections', 'ArrayList', 'LinkedList', 'HashMap', 'TreeMap', 'HashSet', 'TreeSet',
    'Queue', 'Deque', 'ArrayDeque', 'PriorityQueue', 'Stack', 'List', 'Map', 'Set',
    'sort', 'binarySearch', 'fill', 'copyOf', 'min', 'max', 'Math', 'abs', 'sqrt', 'pow',
    'StringBuilder', 'append', 'toString', 'length', 'charAt', 'substring',
  ];

  const snippetItems = (lang: string): CompletionItem[] => {
    if (lang === 'cpp') {
      return [
        {
          label: 'cin >>',
          kind: CompletionItemKind.Snippet,
          insertText: 'cin >> ${1:var};',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '标准输入',
        },
        {
          label: 'cout <<',
          kind: CompletionItemKind.Snippet,
          insertText: 'cout << ${1:var} << endl;',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '标准输出',
        },
        {
          label: 'for (i..n)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'for循环',
        },
        {
          label: 'while loop',
          kind: CompletionItemKind.Snippet,
          insertText: 'while (${1:condition}) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'while循环',
        },
        {
          label: 'fast io',
          kind: CompletionItemKind.Snippet,
          insertText: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'C++快速输入输出',
        },
        {
          label: 'vector<int>',
          kind: CompletionItemKind.Snippet,
          insertText: 'vector<int> ${1:a}(${2:n});',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'vector数组',
        },
        {
          label: 'sort vector',
          kind: CompletionItemKind.Snippet,
          insertText: 'sort(${1:a}.begin(), ${1:a}.end());',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '排序容器',
        },
        {
          label: 'binary search',
          kind: CompletionItemKind.Snippet,
          insertText: 'int ${1:l} = ${2:0}, ${3:r} = ${4:n - 1};\nwhile (${1:l} <= ${3:r}) {\n\tint mid = ${1:l} + (${3:r} - ${1:l}) / 2;\n\tif (${5:check(mid)}) {\n\t\t$0\n\t} else {\n\t\t\n\t}\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '二分查找模板',
        },
        {
          label: 'bfs queue',
          kind: CompletionItemKind.Snippet,
          insertText: 'queue<${1:int}> q;\nq.push(${2:start});\nwhile (!q.empty()) {\n\tauto u = q.front();\n\tq.pop();\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'BFS队列模板',
        },
        {
          label: 'lambda dfs',
          kind: CompletionItemKind.Snippet,
          insertText: 'auto dfs = [&](auto&& self, int u) -> void {\n\t$0\n};\ndfs(dfs, ${1:root});',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '递归DFS lambda模板',
        },
        {
          label: 'dsu union find',
          kind: CompletionItemKind.Snippet,
          insertText: 'vector<int> fa(${1:n});\niota(fa.begin(), fa.end(), 0);\nauto find = [&](auto&& self, int x) -> int {\n\treturn fa[x] == x ? x : fa[x] = self(self, fa[x]);\n};\nauto unite = [&](int a, int b) {\n\ta = find(find, a);\n\tb = find(find, b);\n\tif (a != b) fa[a] = b;\n};',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '并查集模板',
        },
        {
          label: '#include<bits/stdc++.h>',
          kind: CompletionItemKind.Snippet,
          insertText: '#include<bits/stdc++.h>\nusing namespace std;\n\nint main() {\n\t$0\n\treturn 0;\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'C++模板',
        },
      ];
    }
    if (lang === 'python') {
      return [
        {
          label: 'for i in range(n)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for ${1:i} in range(${2:n}):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'for循环',
        },
        {
          label: 'def func():',
          kind: CompletionItemKind.Snippet,
          insertText: 'def ${1:func}(${2:args}):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '定义函数',
        },
        {
          label: 'fast input',
          kind: CompletionItemKind.Snippet,
          insertText: 'import sys\ninput = sys.stdin.readline',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Python快速输入',
        },
        {
          label: 'read ints',
          kind: CompletionItemKind.Snippet,
          insertText: '${1:a} = list(map(int, input().split()))',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '读取整数列表',
        },
        {
          label: 'for _ in range(t)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for _ in range(int(input())):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '多组测试',
        },
        {
          label: 'deque bfs',
          kind: CompletionItemKind.Snippet,
          insertText: 'from collections import deque\nq = deque([${1:start}])\nwhile q:\n\tu = q.popleft()\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'BFS队列模板',
        },
        {
          label: 'heapq priority queue',
          kind: CompletionItemKind.Snippet,
          insertText: 'import heapq\npq = []\nheapq.heappush(pq, ${1:item})\nwhile pq:\n\tx = heapq.heappop(pq)\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '优先队列模板',
        },
        {
          label: 'lru_cache dfs',
          kind: CompletionItemKind.Snippet,
          insertText: 'from functools import lru_cache\n\n@lru_cache(None)\ndef dfs(${1:state}):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '记忆化搜索模板',
        },
      ];
    }
    if (lang === 'java') {
      return [
        {
          label: 'public static void main',
          kind: CompletionItemKind.Snippet,
          insertText: 'public static void main(String[] args) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'main方法',
        },
        {
          label: 'FastScanner',
          kind: CompletionItemKind.Snippet,
          insertText: 'static class FastScanner {\n\tprivate final BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n\tprivate StringTokenizer st;\n\tString next() throws IOException {\n\t\twhile (st == null || !st.hasMoreElements()) st = new StringTokenizer(br.readLine());\n\t\treturn st.nextToken();\n\t}\n\tint nextInt() throws IOException { return Integer.parseInt(next()); }\n\tlong nextLong() throws IOException { return Long.parseLong(next()); }\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Java快速输入类',
        },
        {
          label: 'BufferedReader main',
          kind: CompletionItemKind.Snippet,
          insertText: 'public class Main {\n\tpublic static void main(String[] args) throws Exception {\n\t\tBufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n\t\tStringTokenizer st = new StringTokenizer(br.readLine());\n\t\t$0\n\t}\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Java竞赛主类模板',
        },
        {
          label: 'for loop',
          kind: CompletionItemKind.Snippet,
          insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'for循环',
        },
        {
          label: 'ArrayList',
          kind: CompletionItemKind.Snippet,
          insertText: 'List<${1:Integer}> ${2:list} = new ArrayList<>();',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'ArrayList声明',
        },
        {
          label: 'PriorityQueue',
          kind: CompletionItemKind.Snippet,
          insertText: 'PriorityQueue<${1:Integer}> ${2:pq} = new PriorityQueue<>();',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '优先队列',
        },
      ];
    }
    return [];
  };

  const registerFor = (lang: string, keywords: string[], stdlib: string[] = []) => {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', ':', '#', '<', '>', '_'],
      provideCompletionItems: () => {
        return {
          suggestions: [
            ...mkKeywordItems(keywords, CompletionItemKind.Keyword),
            ...mkKeywordItems(stdlib, CompletionItemKind.Function),
            ...snippetItems(lang),
          ],
        };
      },
    });
  };

  registerFor('cpp', cppKeywords, cppStdlib);
  registerFor('python', pythonKeywords, pythonStdlib);
  registerFor('java', javaKeywords, javaStdlib);

  providersInstalled = true;
};

const defaultOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "Consolas, 'Courier New', monospace",
  fontLigatures: false,
  lineNumbers: 'on',
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  tabSize: 4,
  insertSpaces: true,
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  bracketPairColorization: { enabled: true },
  suggestOnTriggerCharacters: true,
  quickSuggestions: { other: true, comments: false, strings: true },
  fixedOverflowWidgets: true,
  padding: { top: 16, bottom: 16, left: 8, right: 8 },
  scrollbar: { horizontal: 'auto', vertical: 'auto' },
  suggest: {
    insertMode: 'insert',
    snippetsPreventQuickSuggestions: false,
    showStatusBar: true,
    preview: true,
  },
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  height = 420,
  storageKey,
  readOnly = false,
  options,
  statusBar = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editorStats, setEditorStats] = useState({ line: 1, column: 1, lines: 1, characters: 0 });

  const monacoLanguage = useMemo(() => normalizeLanguage(language), [language]);

  useEffect(() => {
    if (!storageKey) return;
    if (typeof value !== 'string') return;
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      return;
    }
  }, [storageKey, value]);

  // 初始化 Monaco Editor
  useEffect(() => {
    let disposed = false;
    let handleClickOutside: ((e: MouseEvent) => void) | null = null;
    let retryCount = 0;

    const initEditor = async () => {
      try {
        const monaco = await loadMonaco();
        if (disposed) return;

        if (!containerRef.current) {
          if (retryCount++ < 50) {
            setTimeout(initEditor, 100);
          } else {
            setIsLoading(false);
          }
          return;
        }

        monacoRef.current = monaco;
        ensureProviders(monaco);

        const editor = monaco.editor.create(containerRef.current, {
          value: value || '',
          language: monacoLanguage,
          theme: 'vs',
          readOnly,
          ...defaultOptions,
          ...options,
        });

        editorRef.current = editor;

        const refreshStats = () => {
          const text = editor.getValue();
          const position = editor.getPosition();
          setEditorStats({
            line: position?.lineNumber ?? 1,
            column: position?.column ?? 1,
            lines: text ? text.split('\n').length : 1,
            characters: text.length,
          });
        };

        editor.onDidChangeModelContent(() => {
          if (onChange) {
            onChange(editor.getValue());
          }
          refreshStats();
        });
        editor.onDidChangeCursorPosition(refreshStats);
        editor.addCommand(2048 | 49, () => editor.trigger('keyboard', 'editor.action.formatDocument', {}));
        editor.addCommand(2048 | 42, () => editor.trigger('keyboard', 'editor.action.quickCommand', {}));
        refreshStats();

        handleClickOutside = (e: MouseEvent) => {
          if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            editor.trigger('keyboard', 'hideSuggestWidget', {});
          }
        };
        document.addEventListener('mousedown', handleClickOutside);

        setIsLoading(false);
      } catch (error) {
        console.error('Monaco Editor 加载失败:', error);
        setIsLoading(false);
      }
    };

    const timer = setTimeout(initEditor, 0);

    return () => {
      disposed = true;
      clearTimeout(timer);
      if (handleClickOutside) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  // 更新编辑器内容
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value || '');
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        readOnly,
        ...options,
      });
    }
  }, [readOnly, options]);

  // 更新编辑器语言
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, monacoLanguage);
      }
    }
  }, [monacoLanguage]);

  return (
    <div 
      className="relative rounded-3xl overflow-hidden"
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
        backgroundColor: 'var(--gemini-surface)',
        border: '1px solid var(--gemini-border-light)',
        boxShadow: 'var(--shadow-gemini)'
      }}
    >
      {/* Monaco Editor 容器 */}
      <div 
        ref={containerRef} 
        style={{ height: '100%', width: '100%' }} 
      />
      
      {/* 加载覆盖层 */}
      {isLoading && (
        <div 
          className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-10"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
        >
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: 'var(--gemini-accent-strong)' }} />
            <div className="mt-3 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>正在加载代码编辑器...</div>
          </div>
        </div>
      )}
      {statusBar && !isLoading && (
        <div
          className="absolute bottom-0 left-0 right-0 h-7 px-3 flex items-center justify-between text-xs border-t"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            borderColor: 'var(--gemini-border-light)',
            color: 'var(--gemini-text-secondary)',
          }}
        >
          <span>
            {monacoLanguage.toUpperCase()} · {editorStats.lines} 行 · {editorStats.characters} 字符
          </span>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;

