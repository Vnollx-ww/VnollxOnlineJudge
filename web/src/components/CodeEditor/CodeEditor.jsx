import { useEffect, useMemo, useRef, useState } from 'react';
import { Spin, Input } from 'antd';
import './CodeEditor.css';

const { TextArea } = Input;

// 直接使用原生 Monaco Editor
let monacoPromise = null;

const loadMonaco = () => {
  if (monacoPromise) return monacoPromise;

  monacoPromise = new Promise((resolve, reject) => {
    // 配置 Monaco 路径
    window.require = {
      paths: {
        'vs': '/monaco/vs'
      }
    };

    // 动态加载 Monaco loader
    const script = document.createElement('script');
    script.src = '/monaco/vs/loader.js';
    script.onload = () => {
      window.require(['vs/editor/editor.main'], (monaco) => {
        resolve(monaco);
      });
    };
    script.onerror = () => {
      reject(new Error('Monaco loader 加载失败'));
    };
    document.head.appendChild(script);
  });

  return monacoPromise;
};

// 完全跳过 Monaco Environment 配置，让 @monaco-editor/react 自己处理
const setupMonacoEnvironment = () => {
  // 不做任何 worker 相关配置，避免 Vite 兼容性问题
};

const normalizeLanguage = (lang) => {
  if (!lang) return 'plaintext';
  if (lang === 'cpp') return 'cpp';
  if (lang === 'python') return 'python';
  if (lang === 'java') return 'java';
  return lang;
};

// 使用全局变量跟踪 provider 安装状态，避免修改 Monaco 对象
let providersInstalled = false;

const ensureProviders = (monaco) => {
  if (!monaco) return;
  if (providersInstalled) return;

  const mkKeywordItems = (keywords, kind) =>
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
    'getline', 'stoi', 'stoll', 'to_string', 'substr', 'length',
    'INT_MAX', 'INT_MIN', 'LLONG_MAX', 'LLONG_MIN',
    'make_pair', 'make_tuple', 'tie', 'get',
    'greater', 'less', 'plus', 'minus',
    'accumulate', 'fill', 'copy', 'unique', 'next_permutation',
    'gcd', '__gcd', 'lcm',
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
    'open', 'read', 'write', 'readline', 'readlines', 'close',
    'append', 'extend', 'pop', 'remove', 'insert', 'index', 'count', 'sort', 'reverse', 'clear',
    'keys', 'values', 'items', 'get', 'update', 'setdefault',
    'add', 'discard', 'union', 'intersection', 'difference',
    'split', 'join', 'strip', 'lstrip', 'rstrip', 'replace', 'find', 'startswith', 'endswith', 'lower', 'upper',
    'format', 'isdigit', 'isalpha', 'isalnum',
    'collections', 'deque', 'Counter', 'defaultdict', 'OrderedDict',
    'heapq', 'heappush', 'heappop', 'heapify',
    'bisect', 'bisect_left', 'bisect_right',
    'itertools', 'permutations', 'combinations', 'product',
    'math', 'sqrt', 'ceil', 'floor', 'log', 'log2', 'log10', 'gcd',
    'sys', 'stdin', 'stdout', 'setrecursionlimit',
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
    'BufferedReader', 'InputStreamReader', 'PrintWriter', 'BufferedWriter',
    'ArrayList', 'LinkedList', 'HashMap', 'HashSet', 'TreeMap', 'TreeSet', 'PriorityQueue',
    'Queue', 'Stack', 'Deque', 'ArrayDeque', 'LinkedHashMap', 'LinkedHashSet',
    'Arrays', 'sort', 'binarySearch', 'fill', 'copyOf', 'asList', 'toString',
    'Collections', 'reverse', 'shuffle', 'max', 'min', 'swap',
    'Math', 'abs', 'pow', 'sqrt', 'ceil', 'floor', 'round', 'random',
    'add', 'remove', 'get', 'set', 'size', 'isEmpty', 'clear', 'contains', 'indexOf',
    'put', 'containsKey', 'containsValue', 'keySet', 'values', 'entrySet',
    'poll', 'peek', 'offer', 'push', 'pop',
    'substring', 'charAt', 'length', 'equals', 'compareTo', 'split', 'trim', 'toLowerCase', 'toUpperCase',
    'StringBuilder', 'append', 'reverse', 'toString', 'delete', 'insert',
    'parseInt', 'parseLong', 'parseDouble', 'valueOf',
    'MAX_VALUE', 'MIN_VALUE',
  ];

  const snippetItems = (lang) => {
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
          label: 'cin >> a >> b',
          kind: CompletionItemKind.Snippet,
          insertText: 'cin >> ${1:a} >> ${2:b};',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '多变量输入',
        },
        {
          label: 'cout << a << " " << b',
          kind: CompletionItemKind.Snippet,
          insertText: 'cout << ${1:a} << " " << ${2:b} << endl;',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '多变量输出',
        },
        {
          label: 'for (i..n)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'for循环',
        },
        {
          label: 'for (auto x : arr)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for (auto ${1:x} : ${2:arr}) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '范围for循环',
        },
        {
          label: 'while (cin >>)',
          kind: CompletionItemKind.Snippet,
          insertText: 'while (cin >> ${1:n}) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '循环读入',
        },
        {
          label: 'ios::sync_with_stdio(false)',
          kind: CompletionItemKind.Snippet,
          insertText: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);',
          detail: '快速IO',
        },
        {
          label: 'vector<int>',
          kind: CompletionItemKind.Snippet,
          insertText: 'vector<${1:int}> ${2:arr}(${3:n});',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '创建vector',
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
          label: 'print()',
          kind: CompletionItemKind.Snippet,
          insertText: 'print(${1:var})',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '输出',
        },
        {
          label: 'input()',
          kind: CompletionItemKind.Snippet,
          insertText: 'input(${1:prompt})',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '输入',
        },
        {
          label: 'n = int(input())',
          kind: CompletionItemKind.Snippet,
          insertText: '${1:n} = int(input())',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '读取整数',
        },
        {
          label: 'a, b = map(int, input().split())',
          kind: CompletionItemKind.Snippet,
          insertText: '${1:a}, ${2:b} = map(int, input().split())',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '读取多个整数',
        },
        {
          label: 'arr = list(map(int, input().split()))',
          kind: CompletionItemKind.Snippet,
          insertText: '${1:arr} = list(map(int, input().split()))',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '读取整数列表',
        },
        {
          label: 'for i in range(n)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for ${1:i} in range(${2:n}):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'for循环',
        },
        {
          label: 'for i, x in enumerate(arr)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for ${1:i}, ${2:x} in enumerate(${3:arr}):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '带索引遍历',
        },
        {
          label: 'while True',
          kind: CompletionItemKind.Snippet,
          insertText: 'while True:\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '无限循环',
        },
        {
          label: 'def func():',
          kind: CompletionItemKind.Snippet,
          insertText: 'def ${1:func}(${2:args}):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '定义函数',
        },
        {
          label: 'if __name__ == "__main__"',
          kind: CompletionItemKind.Snippet,
          insertText: 'if __name__ == "__main__":\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '主函数入口',
        },
        {
          label: 'from collections import',
          kind: CompletionItemKind.Snippet,
          insertText: 'from collections import ${1:deque, Counter, defaultdict}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '导入collections',
        },
        {
          label: 'import sys; input = sys.stdin.readline',
          kind: CompletionItemKind.Snippet,
          insertText: 'import sys\ninput = sys.stdin.readline',
          detail: '快速输入',
        },
        {
          label: 'sys.setrecursionlimit',
          kind: CompletionItemKind.Snippet,
          insertText: 'import sys\nsys.setrecursionlimit(${1:100000})',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '设置递归深度',
        },
      ];
    }
    if (lang === 'java') {
      return [
        {
          label: 'System.out.println',
          kind: CompletionItemKind.Snippet,
          insertText: 'System.out.println(${1:var});',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '输出并换行',
        },
        {
          label: 'System.out.print',
          kind: CompletionItemKind.Snippet,
          insertText: 'System.out.print(${1:var});',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '输出不换行',
        },
        {
          label: 'Scanner sc = new Scanner',
          kind: CompletionItemKind.Snippet,
          insertText: 'Scanner ${1:sc} = new Scanner(System.in);',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '创建Scanner',
        },
        {
          label: 'int n = sc.nextInt()',
          kind: CompletionItemKind.Snippet,
          insertText: 'int ${1:n} = ${2:sc}.nextInt();',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '读取整数',
        },
        {
          label: 'for (int i = 0; i < n; i++)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'for循环',
        },
        {
          label: 'for (int x : arr)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for (${1:int} ${2:x} : ${3:arr}) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '增强for循环',
        },
        {
          label: 'while (sc.hasNext())',
          kind: CompletionItemKind.Snippet,
          insertText: 'while (${1:sc}.hasNext()) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '循环读入',
        },
        {
          label: 'ArrayList<Integer>',
          kind: CompletionItemKind.Snippet,
          insertText: 'ArrayList<${1:Integer}> ${2:list} = new ArrayList<>();',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '创建ArrayList',
        },
        {
          label: 'HashMap<K, V>',
          kind: CompletionItemKind.Snippet,
          insertText: 'HashMap<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '创建HashMap',
        },
        {
          label: 'PriorityQueue',
          kind: CompletionItemKind.Snippet,
          insertText: 'PriorityQueue<${1:Integer}> ${2:pq} = new PriorityQueue<>();',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '创建优先队列',
        },
        {
          label: 'Arrays.sort',
          kind: CompletionItemKind.Snippet,
          insertText: 'Arrays.sort(${1:arr});',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '数组排序',
        },
        {
          label: 'Collections.sort',
          kind: CompletionItemKind.Snippet,
          insertText: 'Collections.sort(${1:list});',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '集合排序',
        },
        {
          label: 'StringBuilder',
          kind: CompletionItemKind.Snippet,
          insertText: 'StringBuilder ${1:sb} = new StringBuilder();',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '创建StringBuilder',
        },
        {
          label: 'public static void main',
          kind: CompletionItemKind.Snippet,
          insertText: 'public static void main(String[] args) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'main方法',
        },
        {
          label: 'Java ACM模板',
          kind: CompletionItemKind.Snippet,
          insertText: 
            'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n' +
            '    public static void main(String[] args) {\n' +
            '        Scanner sc = new Scanner(System.in);\n' +
            '        $0\n' +
            '    }\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Java完整模板',
        },
        {
          label: 'FastScanner',
          kind: CompletionItemKind.Snippet,
          insertText:
            'static class FastScanner {\n' +
            '    private final InputStream in;\n' +
            '    private final byte[] buffer = new byte[1 << 16];\n' +
            '    private int ptr = 0, len = 0;\n' +
            '    FastScanner(InputStream in) { this.in = in; }\n' +
            '    private int readByte() throws IOException {\n' +
            '        if (ptr >= len) {\n' +
            '            len = in.read(buffer);\n' +
            '            ptr = 0;\n' +
            '            if (len <= 0) return -1;\n' +
            '        }\n' +
            '        return buffer[ptr++];\n' +
            '    }\n' +
            '    String next() throws IOException {\n' +
            '        StringBuilder sb = new StringBuilder();\n' +
            '        int c;\n' +
            '        while ((c = readByte()) != -1 && c <= 32) {}\n' +
            '        if (c == -1) return null;\n' +
            '        do {\n' +
            '            sb.append((char) c);\n' +
            '        } while ((c = readByte()) != -1 && c > 32);\n' +
            '        return sb.toString();\n' +
            '    }\n' +
            '    int nextInt() throws IOException { return Integer.parseInt(next()); }\n' +
            '    long nextLong() throws IOException { return Long.parseLong(next()); }\n' +
            '}\n',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '快速输入类',
        },
      ];
    }
    return [];
  };

  const registerFor = (lang, keywords, stdlib = []) => {
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
  fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
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
  suggest: {
    insertMode: 'insert',
    snippetsPreventQuickSuggestions: false,
    showStatusBar: true,
    preview: true,
  },
};

const CodeEditor = ({
  value,
  onChange,
  language,
  height = 420,
  storageKey,
  readOnly = false,
  options,
}) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
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
    let handleClickOutside = null;

    const initEditor = async () => {
      try {
        const monaco = await loadMonaco();
        if (disposed) return;

        // 确保 DOM 容器已经准备好
        if (!containerRef.current) {
          // 限制重试次数，避免无限循环
          if ((initEditor.retryCount = (initEditor.retryCount || 0) + 1) < 50) {
            setTimeout(() => initEditor(), 100);
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

        // 监听内容变化
        editor.onDidChangeModelContent(() => {
          if (onChange) {
            onChange(editor.getValue());
          }
        });

        // 点击编辑器外部时失去焦点
        handleClickOutside = (e) => {
          if (containerRef.current && !containerRef.current.contains(e.target)) {
            editor.trigger('keyboard', 'hideSuggestWidget', {});
          }
        };
        document.addEventListener('mousedown', handleClickOutside);

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    // 等待组件渲染完成后再初始化
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
    <div className="vnollx-code-editor" style={{ position: 'relative' }}>
      {/* Monaco Editor 容器 - 始终渲染 */}
      <div ref={containerRef} style={{ height, width: '100%' }} />
      
      {/* 加载覆盖层 */}
      {isLoading && (
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center', color: '#333' }}>
            <Spin size="large" />
            <div style={{ marginTop: 8 }}>⏳ 正在加载原生 Monaco Editor...</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              检查控制台查看详细加载状态
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
