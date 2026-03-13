// 简单的全站 AI 悬浮按钮与对话窗（依赖后端 /ai/chat SSE 与 /ai/clear）
;(function(){
  if (window.__AI_WIDGET_INSTALLED__) return; 
  window.__AI_WIDGET_INSTALLED__ = true;

  const styles = `
    .ai-fab{position:fixed;right:20px;bottom:24px;width:56px;height:56px;border-radius:50%;background:#1a73e8;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 20px rgba(26,115,232,.35);cursor:pointer;z-index:2147483000;}
    .ai-fab:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(26,115,232,.45)}
    .ai-panel{position:fixed;right:20px;bottom:90px;width:360px;max-width:92vw;height:520px;max-height:80vh;background:#fff;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.15);overflow:hidden;display:none;flex-direction:column;z-index:2147483000}
    .ai-panel.show{display:flex}
    .ai-header{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 14px;border-bottom:1px solid #eef2f6;background:linear-gradient(180deg,#ffffff,#fafbff)}
    .ai-title{font-weight:600;color:#1a237e}
    .ai-actions{display:flex;gap:8px}
    .ai-icon-btn{border:none;background:transparent;width:32px;height:32px;border-radius:6px;cursor:pointer;color:#334155}
    .ai-icon-btn:hover{background:#f1f5f9;color:#0f172a}
    .ai-body{flex:1;background:#f8fafc;padding:12px;overflow:auto}
    .ai-msg{display:flex;gap:8px;margin-bottom:10px;align-items:flex-start}
    .ai-msg .bubble{max-width:80%;padding:8px 10px;border-radius:10px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap}
    .ai-user .bubble{background:#1a73e8;color:#fff;border-top-right-radius:4px;margin-left:auto}
    .ai-bot .bubble{background:#eaf2ff;color:#0f172a;border-top-left-radius:4px}
    .ai-thinking{display:flex;align-items:center;gap:6px;color:#666;font-size:14px;padding:8px 10px;background:#f0f4f8;border-radius:10px;border-top-left-radius:4px;max-width:80%}
    .ai-thinking .dots{display:flex;gap:2px}
    .ai-thinking .dot{width:4px;height:4px;background:#666;border-radius:50%;animation:thinking 1.4s infinite ease-in-out}
    .ai-thinking .dot:nth-child(2){animation-delay:0.2s}
    .ai-thinking .dot:nth-child(3){animation-delay:0.4s}
    @keyframes thinking{0%,80%,100%{transform:scale(0.8);opacity:0.5}40%{transform:scale(1.2);opacity:1}}
    .ai-footer{padding:10px;border-top:1px solid #eef2f6;background:#fff;display:flex;gap:8px}
    .ai-input{flex:1;border:1px solid #dbe3ee;border-radius:10px;padding:10px 12px;outline:none}
    .ai-send{background:#1a73e8;color:#fff;border:none;border-radius:10px;padding:0 14px;cursor:pointer}
    .ai-send:disabled{opacity:.6;cursor:not-allowed}
    .ai-markdown{line-height:1.6}
    .ai-markdown h1,.ai-markdown h2,.ai-markdown h3{font-weight:600;margin:8px 0 4px 0}
    .ai-markdown h1{font-size:18px}
    .ai-markdown h2{font-size:16px}
    .ai-markdown h3{font-size:14px}
    .ai-markdown code{background:#f1f3f4;padding:2px 4px;border-radius:3px;font-family:'Consolas','Monaco','Courier New',monospace;font-size:13px}
    .ai-markdown pre{background:#f8f9fa;border:1px solid #e9ecef;padding:12px;border-radius:8px;overflow-x:auto;margin:8px 0;font-family:'Consolas','Monaco','Courier New',monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}
    .ai-markdown pre code{background:none;padding:0;border:none;font-size:inherit;color:inherit}
    .ai-markdown pre code.language-python{color:#3776ab}
    .ai-markdown pre code.language-javascript{color:#f7df1e}
    .ai-markdown pre code.language-java{color:#ed8b00}
    .ai-markdown pre code.language-cpp{color:#00599c}
    .ai-markdown pre code.language-c{color:#00599c}
    .ai-markdown ul,.ai-markdown ol{margin:4px 0;padding-left:20px}
    .ai-markdown li{margin:2px 0}
    .ai-markdown blockquote{border-left:3px solid #ddd;padding-left:8px;margin:4px 0;color:#666}
    .ai-markdown strong{font-weight:600}
    .ai-markdown em{font-style:italic}
    .ai-markdown table{width:100%;border-collapse:collapse;margin:8px 0;background:#fff}
    .ai-markdown th,.ai-markdown td{border:1px solid #e5e7eb;padding:6px 8px;font-size:13px;text-align:left}
    .ai-markdown thead th{background:#f8fafc;font-weight:600}
    
    /* 确认对话框样式 */
    .ai-confirm-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2147483001}
    .ai-confirm-dialog{background:#fff;border-radius:12px;padding:24px;max-width:320px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,0.15);animation:confirmSlideIn 0.2s ease-out}
    @keyframes confirmSlideIn{from{opacity:0;transform:scale(0.9) translateY(-10px)}to{opacity:1;transform:scale(1) translateY(0)}}
    .ai-confirm-title{font-size:18px;font-weight:600;color:#1a237e;margin:0 0 12px 0;text-align:center}
    .ai-confirm-message{color:#64748b;font-size:14px;line-height:1.5;margin:0 0 20px 0;text-align:center}
    .ai-confirm-buttons{display:flex;gap:12px;justify-content:center}
    .ai-confirm-btn{padding:10px 20px;border-radius:8px;border:none;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s ease;min-width:80px}
    .ai-confirm-btn-cancel{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
    .ai-confirm-btn-cancel:hover{background:#e2e8f0;color:#334155}
    .ai-confirm-btn-confirm{background:#ef4444;color:#fff}
    .ai-confirm-btn-confirm:hover{background:#dc2626;transform:translateY(-1px)}
    
    /* 成功提示样式 */
    .ai-success-toast{position:fixed;top:20px;right:20px;background:#10b981;color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(16,185,129,0.3);z-index:2147483002;animation:successSlideIn 0.3s ease-out;font-size:14px;font-weight:500}
    @keyframes successSlideIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
    .ai-success-toast.fade-out{animation:successSlideOut 0.3s ease-in forwards}
    @keyframes successSlideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(100%)}}
  `;

  function injectStyle(){
    const id = 'ai-widget-style';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = styles;
    document.head.appendChild(s);
  }

  function createUI(){
    const fab = document.createElement('div');
    fab.className = 'ai-fab';
    fab.title = 'AI 助手';
    fab.textContent = '🤖';

    const panel = document.createElement('div');
    panel.className = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-header">
        <div class="ai-title">AI 助手</div>
        <div class="ai-actions">
          <button class="ai-icon-btn" data-ai-action="clear" title="清空记忆">🧹</button>
          <button class="ai-icon-btn" data-ai-action="close" title="关闭">✖️</button>
        </div>
      </div>
      <div class="ai-body" id="aiChatBody"></div>
      <div class="ai-footer">
        <input class="ai-input" id="aiChatInput" placeholder="说点什么..." />
        <button class="ai-send" id="aiChatSend">发送</button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    return { fab, panel };
  }

  function appendMessage(container, role, text, isMarkdown = false){
    const wrap = document.createElement('div');
    wrap.className = `ai-msg ai-${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    if (isMarkdown && role === 'bot') {
      bubble.className += ' ai-markdown';
      bubble.innerHTML = parseMarkdown(text);
    } else {
      bubble.textContent = text;
    }
    
    wrap.appendChild(bubble);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  function createThinkingIndicator(container){
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg ai-bot';
    const thinking = document.createElement('div');
    thinking.className = 'ai-thinking';
    thinking.innerHTML = `
      <span>AI思考中</span>
      <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    `;
    wrap.appendChild(thinking);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function parseMarkdown(text) {
    // 移除[DONE]标记
    text = text.replace(/\[DONE\]/g, '');
    
    // 按行处理
    const lines = text.split('\n');
    const result = [];
    let inCodeBlock = false;
    let inList = false;
    let listType = '';
    let codeLanguage = '';
    
    function isTableSeparatorRow(row){
      // e.g. |---|:---:|---|
      return /^\s*\|?\s*(:?-{3,}:?\s*\|\s*)+:?-{3,}:?\s*\|?\s*$/.test(row);
    }

    function renderTable(startIndex){
      const rows = [];
      let i = startIndex;
      // collect contiguous pipe-lines
      while (i < lines.length){
        const l = lines[i];
        if (!/^\s*\|.*\|\s*$/.test(l)) break;
        rows.push(l);
        i++;
      }
      if (rows.length < 2) return { html: null, end: startIndex };
      if (!isTableSeparatorRow(rows[1])) return { html: null, end: startIndex };

      function splitRow(r){
        const trimmed = r.trim().replace(/^\|/, '').replace(/\|$/, '');
        return trimmed.split(/\|/).map(c => c.trim());
      }

      const header = splitRow(rows[0]);
      const dataRows = rows.slice(2).map(splitRow);

      const thead = '<thead><tr>' + header.map(h => `<th>${parseInlineMarkdown(escapeHtml(h))}</th>`).join('') + '</tr></thead>';
      const tbody = '<tbody>' + dataRows.map(cells => '<tr>' + cells.map(c => `<td>${parseInlineMarkdown(escapeHtml(c))}</td>`).join('') + '</tr>').join('') + '</tbody>';
      return { html: `<table>${thead}${tbody}</table>`, end: i - 1 };
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 处理代码块（仅识别行首```围栏）
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.substring(3).trim();
          result.push(`<pre><code class="language-${codeLanguage}">`);
        } else {
          inCodeBlock = false;
          result.push('</code></pre>');
          codeLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        // 在代码块中，保持原始格式，包括换行和缩进
        result.push(escapeHtml(line) + '\n');
        continue;
      }
      
      // 处理表格（GFM）
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])){
        const { html, end } = renderTable(i);
        if (html){
          result.push(html);
          i = end;
          continue;
        }
      }

      // 处理标题（支持#后无空格）
      if (line.match(/^#{1,6}\s?/)) {
        const level = line.match(/^(#{1,6})/)[1].length;
        const content = line.replace(/^#{1,6}\s?/, '');
        result.push(`<h${level}>${content}</h${level}>`);
        inList = false;
        continue;
      }
      
      // 处理列表
      if (line.match(/^[\*\-\+] /) || line.match(/^\d+\. /)) {
        const isOrdered = line.match(/^\d+\. /);
        const currentListType = isOrdered ? 'ol' : 'ul';
        const content = line.replace(/^[\*\-\+] |^\d+\. /, '');
        
        if (!inList || listType !== currentListType) {
          if (inList) {
            result.push(`</${listType}>`);
          }
          result.push(`<${currentListType}>`);
          inList = true;
          listType = currentListType;
        }
        
        result.push(`<li>${parseInlineMarkdown(content)}</li>`);
        continue;
      }
      
      // 结束列表
      if (inList && line.trim() === '') {
        result.push(`</${listType}>`);
        inList = false;
        listType = '';
        continue;
      }
      
      // 处理引用
      if (line.startsWith('> ')) {
        const content = line.replace(/^> /, '');
        result.push(`<blockquote>${parseInlineMarkdown(content)}</blockquote>`);
        continue;
      }
      
      // 处理普通段落
      if (line.trim() === '') {
        result.push('<br>');
      } else {
        result.push(parseInlineMarkdown(line));
      }
    }
    
    // 结束未关闭的列表
    if (inList) {
      result.push(`</${listType}>`);
    }
    
    return result.join('');
  }
  
  function parseInlineMarkdown(text) {
    return text
      // 处理粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 处理斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 处理行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function streamChat(message, { onToken, onDone, onError }){
    // 使用 fetch + ReadableStream 兼容 SSE 文本事件（后端返回 text/event-stream）
    const url = `/ai/chat?message=${encodeURIComponent(message)}`;
    fetch(url, { headers: buildAuthHeaders() })
      .then(res => {
        if (!res.ok || !res.body) throw new Error('网络错误');
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        function pump(){
          return reader.read().then(({ done, value }) => {
            if (done){ onDone && onDone(); return; }
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split(/\n\n/);
            buffer = parts.pop() || '';
            for (const chunk of parts){
              // 兼容常见 SSE 格式: data: xxx
              const lines = chunk.split(/\n/).map(l => l.replace(/^data:\s?/, ''));
              const data = lines.join('\n');
              onToken && onToken(data);
            }
            return pump();
          }).catch(err => { onError && onError(err); });
        }
        return pump();
      })
      .catch(err => { onError && onError(err); });
  }

  function buildAuthHeaders(){
    const headers = { 'Accept': 'text/event-stream' };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // -------- 页面上下文采集与限制 --------
  function truncate(text, max){
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max) + `\n...（已截断 ${text.length - max} 字）`;
  }

  function getSelectionText(){
    try { return (window.getSelection && window.getSelection().toString()) || ''; } catch(e){ return ''; }
  }

  function getMetaContent(name){
    const el = document.querySelector(`meta[name="${name}"]`);
    return el && el.getAttribute('content') || '';
  }

  function getHeadingsSummary(limit = 8){
    const nodes = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, limit);
    return nodes.map(n => `${n.tagName.toLowerCase()}: ${n.textContent.trim()}`).join('\n');
  }

  function getEditorCode(){
    // 尝试获取 Monaco Editor 内容
    try {
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors ? window.monaco.editor.getEditors() : [];
        if (editors && editors.length > 0) {
          const model = editors[0].getModel && editors[0].getModel();
          if (model && model.getValue) return model.getValue();
        }
        const active = window.monaco.editor.getModels && window.monaco.editor.getModels()[0];
        if (active && active.getValue) return active.getValue();
      }
    } catch(e) {}
    // 尝试获取 CodeMirror 内容
    try {
      const cmEl = document.querySelector('.CodeMirror');
      if (cmEl && cmEl.CodeMirror && cmEl.CodeMirror.getValue) {
        return cmEl.CodeMirror.getValue();
      }
    } catch(e) {}
    return '';
  }

  function getPageContext(){
    const title = document.title || '';
    const url = location.href || '';
    const selection = getSelectionText();
    const desc = getMetaContent('description');
    const keywords = getMetaContent('keywords');
    const headings = getHeadingsSummary();
    const code = getEditorCode();

    // 限制长度，避免过大
    const maxSelection = 1500;
    const maxDesc = 600;
    const maxHeadings = 800;
    const maxCode = 2000;

    const parts = [];
    parts.push(`页面标题: ${title}`);
    parts.push(`页面URL: ${url}`);
    if (selection && selection.trim()) parts.push(`选中内容:\n${truncate(selection.trim(), maxSelection)}`);
    if (desc) parts.push(`Meta描述: ${truncate(desc, maxDesc)}`);
    if (keywords) parts.push(`Meta关键词: ${keywords}`);
    if (headings) parts.push(`页面大纲:\n${truncate(headings, maxHeadings)}`);
    if (code) parts.push(`编辑器代码片段:\n${'```'}\n${truncate(code, maxCode)}\n${'```'}`);

    return parts.join('\n\n');
  }

  function clearMemory(){
    const token = localStorage.getItem('token');
    return fetch('/ai/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }).then(r => r.json());
  }

  function showSuccessToast(message, duration = 3000) {
    // 创建成功提示
    const toast = document.createElement('div');
    toast.className = 'ai-success-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 自动消失
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  function showConfirmDialog(title, message, onConfirm, onCancel) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'ai-confirm-overlay';
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'ai-confirm-dialog';
    dialog.innerHTML = `
      <div class="ai-confirm-title">${title}</div>
      <div class="ai-confirm-message">${message}</div>
      <div class="ai-confirm-buttons">
        <button class="ai-confirm-btn ai-confirm-btn-cancel">取消</button>
        <button class="ai-confirm-btn ai-confirm-btn-confirm">确认</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // 绑定事件
    const cancelBtn = dialog.querySelector('.ai-confirm-btn-cancel');
    const confirmBtn = dialog.querySelector('.ai-confirm-btn-confirm');
    
    function closeDialog() {
      document.body.removeChild(overlay);
    }
    
    cancelBtn.addEventListener('click', () => {
      closeDialog();
      onCancel && onCancel();
    });
    
    confirmBtn.addEventListener('click', () => {
      closeDialog();
      onConfirm && onConfirm();
    });
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeDialog();
        onCancel && onCancel();
      }
    });
    
    // ESC键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        onCancel && onCancel();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  function loadMessageHistoryPage(beforeId = null, limit = 10){
    const token = localStorage.getItem('token');
    let url = `/ai/history/page?limit=${limit}`;
    if (beforeId) {
      url += `&beforeId=${beforeId}`;
    }
    return fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }).then(r => r.json());
  }

  function init(){
    injectStyle();
    const { fab, panel } = createUI();
    const body = panel.querySelector('#aiChatBody');
    const input = panel.querySelector('#aiChatInput');
    const send = panel.querySelector('#aiChatSend');

    let sending = false;
    let nextCursor = null;
    let hasMore = false;
    let loadingMore = false;

    function checkLoginStatus() {
      const token = localStorage.getItem('token');
      return !!token;
    }

    function showLoginPrompt() {
      body.innerHTML = '';
      appendMessage(body, 'bot', '请先登录后再使用AI助手功能', false);
      input.disabled = true;
      input.placeholder = '请先登录';
      send.disabled = true;
      send.textContent = '请先登录';
    }

    function enableChat() {
      input.disabled = false;
      input.placeholder = '说点什么...';
      send.disabled = false;
      send.textContent = '发送';
    }

    function updateUIStatus() {
      if (checkLoginStatus()) {
        enableChat();
        // 如果面板是打开的，重新加载历史消息
        if (panel.classList.contains('show')) {
          loadHistoryMessages();
        }
      } else {
        showLoginPrompt();
      }
    }

    // 监听localStorage变化（登录/登出）
    function handleStorageChange(e) {
      if (e.key === 'token') {
        updateUIStatus();
      }
    }

    // 监听自定义登录事件
    function handleLoginEvent() {
      updateUIStatus();
    }

    function open(){ 
      panel.classList.add('show'); 
      
      // 更新UI状态（包括登录检查和界面更新）
      updateUIStatus();
      
      // 如果已登录，聚焦到输入框
      if (checkLoginStatus()) {
        input.focus();
      }
    }
    function close(){ panel.classList.remove('show'); }

    function loadHistoryMessages(){
      // 检查登录状态
      if (!checkLoginStatus()) {
        return;
      }
      
      // 如果已经有消息，不重复加载
      if (body.children.length > 0) return;
      
      // 显示加载状态
      const loadingMsg = appendMessage(body, 'bot', '正在加载历史消息...');
      
      // 首次加载10条
      loadMessageHistoryPage(null, 10)
        .then(response => {
          // 移除加载提示
          loadingMsg.parentNode.remove();
          
          if (response.code === 200 && response.data) {
            const { items, nextCursor: cursor, hasMore: more } = response.data;
            nextCursor = cursor;
            hasMore = more;
            
            if (items && items.length > 0) {
              // 解析历史消息
              parseHistoryMessages(items);
            } else {
              // 没有历史消息，显示欢迎信息
              appendMessage(body, 'bot', '你好！我是AI助手，有什么可以帮助您的吗？');
            }
          } else {
            // 没有历史消息，显示欢迎信息
            appendMessage(body, 'bot', '你好！我是AI助手，有什么可以帮助您的吗？');
          }
        })
        .catch(error => {
          // 移除加载提示
          loadingMsg.parentNode.remove();
          appendMessage(body, 'bot', '加载历史消息失败，请稍后重试');
          console.error('加载历史消息失败:', error);
        });
    }

    function loadMoreMessages(){
      if (!hasMore || loadingMore || !nextCursor) return;
      
      loadingMore = true;
      
      // 滚动加载5条
      loadMessageHistoryPage(nextCursor, 5)
        .then(response => {
          loadingMore = false;
          
          if (response.code === 200 && response.data) {
            const { items, nextCursor: cursor, hasMore: more } = response.data;
            nextCursor = cursor;
            hasMore = more;
            
            if (items && items.length > 0) {
              // 记录当前滚动位置
              const scrollHeight = body.scrollHeight;
              
              // 在顶部插入历史消息
              prependHistoryMessages(items);
              
              // 保持滚动位置
              body.scrollTop = body.scrollHeight - scrollHeight;
            }
          }
        })
        .catch(error => {
          loadingMore = false;
          console.error('加载更多消息失败:', error);
        });
    }

    function prependHistoryMessages(historyList){
      const fragment = document.createDocumentFragment();
      
      for (const item of historyList) {
        const role = item.role === 'user' ? 'user' : 'bot';
        const content = item.content || '';
        
        if (!content || content.startsWith('[系统]')) continue;
        
        const wrap = document.createElement('div');
        wrap.className = `ai-msg ai-${role}`;
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        if (role === 'bot') {
          bubble.className += ' ai-markdown';
          bubble.innerHTML = parseMarkdown(content);
        } else {
          bubble.textContent = content;
        }
        
        wrap.appendChild(bubble);
        fragment.appendChild(wrap);
      }
      
      body.insertBefore(fragment, body.firstChild);
    }

    function parseHistoryMessages(historyList){
      // 清空当前消息
      body.innerHTML = '';
      
      // 解析历史消息（新格式：{role, content, ...}）
      for (const item of historyList) {
        const role = item.role === 'user' ? 'user' : 'bot';
        const content = item.content || '';
        
        // 跳过系统消息
        if (!content || content.startsWith('[系统]') || content.includes('你是一个专业的编程助手')) {
          continue;
        }
        
        appendMessage(body, role, content, role === 'bot');
      }
      
      // 如果没有有效的历史消息，显示欢迎信息
      if (body.children.length === 0) {
        appendMessage(body, 'bot', '你好！我是AI助手，有什么可以帮助您的吗？');
      }
    }

    fab.addEventListener('click', () => {
      if (panel.classList.contains('show')) close(); else open();
    });

    panel.addEventListener('click', (e) => {
      const action = e.target && e.target.getAttribute && e.target.getAttribute('data-ai-action');
      if (action === 'close') close();
      if (action === 'clear') {
        // 检查登录状态
        if (!checkLoginStatus()) {
          showLoginPrompt();
          return;
        }
        
        showConfirmDialog(
          '确认清空记忆',
          '确定要删除所有历史消息记录吗？此操作不可恢复。',
          () => {
            // 用户确认清空
            clearMemory().then(() => {
              body.innerHTML = '';
              appendMessage(body, 'bot', '你好！我是AI助手，有什么可以帮助您的吗？');
              // 显示成功提示
              showSuccessToast('消息记录已清空');
            }).catch(() => {
              appendMessage(body, 'bot', '清空失败，请稍后重试');
            });
          },
          () => {
            // 用户取消清空
            console.log('用户取消了清空记忆操作');
          }
        );
      }
    });

    function doSend(){
      const text = (input.value || '').trim();
      if (!text || sending) return;
      
      // 再次检查登录状态
      if (!checkLoginStatus()) {
        showLoginPrompt();
        return;
      }
      
      sending = true;
      send.disabled = true;
      
      // 显示用户消息
      appendMessage(body, 'user', text);
      
      // 显示AI思考中状态
      const thinkingIndicator = createThinkingIndicator(body);
      
      input.value = '';
      let botBubble = null;
      let accumulatedText = '';

      // 直接发送用户输入的内容，不附加任何页面上下文
      let finalMessage = text;

      streamChat(finalMessage, {
        onToken: (token) => {
          // 移除[DONE]标记
          token = token.replace(/\[DONE\]/g, '');
          
          // 移除连续双引号（API调用中断信号，可能是1-10个）
          token = token.replace(/"{1,10}/g, '');
          
          // 如果是第一个token，移除思考指示器并创建AI消息气泡
          if (!botBubble) {
            thinkingIndicator.remove();
            botBubble = appendMessage(body, 'bot', '', true);
          }
          
          accumulatedText += token;
          botBubble.innerHTML = parseMarkdown(accumulatedText);
          body.scrollTop = body.scrollHeight;
        },
        onDone: () => {
          sending = false; 
          send.disabled = false;
          // 确保思考指示器被移除
          if (thinkingIndicator.parentNode) {
            thinkingIndicator.remove();
          }
        },
        onError: () => {
          sending = false; 
          send.disabled = false;
          // 移除思考指示器
          if (thinkingIndicator.parentNode) {
            thinkingIndicator.remove();
          }
          // 显示错误消息
          if (!botBubble) {
            botBubble = appendMessage(body, 'bot', '[系统] 服务异常，请稍后再试');
          } else {
            botBubble.innerHTML += '<br>[系统] 服务异常，请稍后再试';
          }
        }
      });
    }

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    // 滚动到顶部时加载更多历史消息
    body.addEventListener('scroll', () => {
      if (body.scrollTop < 50 && hasMore && !loadingMore) {
        loadMoreMessages();
      }
    });

    // 添加事件监听器
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLogin', handleLoginEvent);
    window.addEventListener('userLogout', handleLoginEvent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


