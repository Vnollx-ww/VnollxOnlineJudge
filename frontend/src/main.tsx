import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { preloadMonacoEditor } from './components/CodeEditor';

// 预加载 Monaco Editor（不阻塞首屏渲染）
preloadMonacoEditor();

createRoot(document.getElementById('root')!).render(
  // TODO: 开发环境临时关闭 StrictMode，避免 WebSocket 重复连接问题
  // <StrictMode>
    <App />
  // </StrictMode>
);
