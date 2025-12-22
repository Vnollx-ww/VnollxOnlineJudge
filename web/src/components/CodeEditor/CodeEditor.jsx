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

  const pythonKeywords = [
    'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
    'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try',
    'while', 'with', 'yield',
  ];

  const javaKeywords = [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
    'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
    'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
    'interface', 'long', 'native', 'new', 'null', 'package', 'private', 'protected',
    'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
    'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while',
  ];

  const snippetItems = (lang) => {
    if (lang === 'cpp') {
      return [
        {
          label: 'for (i..n)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'ios::sync_with_stdio(false)',
          kind: CompletionItemKind.Snippet,
          insertText: 'ios::sync_with_stdio(false);\ncin.tie(nullptr);',
        },
      ];
    }
    if (lang === 'python') {
      return [
        {
          label: 'if __name__ == "__main__"',
          kind: CompletionItemKind.Snippet,
          insertText: 'if __name__ == "__main__":\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'for i in range(n)',
          kind: CompletionItemKind.Snippet,
          insertText: 'for ${1:i} in range(${2:n}):\n\t$0',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ];
    }
    if (lang === 'java') {
      return [
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
        },
      ];
    }
    return [];
  };

  const registerFor = (lang, keywords) => {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', '_', ':', '>', '<'],
      provideCompletionItems: () => {
        return {
          suggestions: [
            ...mkKeywordItems(keywords, CompletionItemKind.Keyword),
            ...snippetItems(lang),
          ],
        };
      },
    });
  };

  registerFor('cpp', cppKeywords);
  registerFor('python', pythonKeywords);
  registerFor('java', javaKeywords);

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
          theme: 'vs-dark',
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
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <Spin size="large" />
            <div style={{ marginTop: 8 }}>⏳ 正在加载原生 Monaco Editor...</div>
            <div style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>
              检查控制台查看详细加载状态
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
