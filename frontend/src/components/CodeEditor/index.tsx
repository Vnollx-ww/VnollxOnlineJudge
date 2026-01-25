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
  onDidChangeModelContent: (callback: () => void) => void;
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
}

// 使用 CDN 加载 Monaco Editor
const MONACO_VERSION = '0.45.0';
const MONACO_CDN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

let monacoPromise: Promise<Monaco> | null = null;

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
      reject(new Error('Monaco loader 加载失败，请检查网络连接'));
    };
    document.head.appendChild(loaderScript);
  });

  return monacoPromise;
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
    'pair', 'queue', 'priority_queue', 'stack', 'deque', 'list', 'array', 'bitset',
    'sort', 'reverse', 'find', 'lower_bound', 'upper_bound', 'binary_search',
    'min', 'max', 'swap', 'abs', 'pow', 'sqrt', 'ceil', 'floor', 'round',
    'push_back', 'pop_back', 'push', 'pop', 'front', 'back', 'begin', 'end', 'size', 'empty', 'clear',
    'first', 'second', 'insert', 'erase', 'count', 'memset', 'memcpy',
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
    'sum', 'min', 'max', 'abs', 'round', 'pow', 'divmod',
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
      ];
    }
    return [];
  };

  const registerFor = (lang: string, keywords: string[], stdlib: string[] = []) => {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', ':'],
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
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, monospace",
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
  padding: { top: 16, bottom: 16 },
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        editor.onDidChangeModelContent(() => {
          if (onChange) {
            onChange(editor.getValue());
          }
        });

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
        backgroundColor: 'var(--gemini-surface)',
        border: '1px solid var(--gemini-border-light)',
        boxShadow: 'var(--shadow-gemini)'
      }}
    >
      {/* Monaco Editor 容器 */}
      <div 
        ref={containerRef} 
        style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }} 
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
    </div>
  );
};

export default CodeEditor;

