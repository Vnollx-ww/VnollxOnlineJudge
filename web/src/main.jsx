import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // TODO: 开发环境临时关闭 StrictMode，避免 WebSocket 重复连接问题
  // <StrictMode>
    <App />
  // </StrictMode>,
)
