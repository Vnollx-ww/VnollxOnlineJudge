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
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 处理代码块
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
      
      // 处理标题
      if (line.match(/^#{1,6} /)) {
        const level = line.match(/^(#{1,6})/)[1].length;
        const content = line.replace(/^#{1,6} /, '');
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

  function loadMessageHistory(){
    const token = localStorage.getItem('token');
    return fetch('/ai/history', {
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

    function open(){ 
      panel.classList.add('show'); 
      input.focus();
      // 加载历史消息
      loadHistoryMessages();
    }
    function close(){ panel.classList.remove('show'); }

    function loadHistoryMessages(){
      // 如果已经有消息，不重复加载
      if (body.children.length > 0) return;
      
      // 显示加载状态
      const loadingMsg = appendMessage(body, 'bot', '正在加载历史消息...');
      
      loadMessageHistory()
        .then(response => {
          // 移除加载提示
          loadingMsg.parentNode.remove();
          
          if (response.code === 200 && response.data && response.data.length > 0) {
            // 解析历史消息
            parseHistoryMessages(response.data);
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

    function parseHistoryMessages(historyList){
      // 清空当前消息
      body.innerHTML = '';

      
      // 解析历史消息
      for (const historyItem of historyList) {
        // 解析格式: [用户/AI] 消息内容（支持多行）
        const match = historyItem.match(/^\[(用户|AI)\]\s*(.*)$/s);
        if (match) {
          const role = match[1] === '用户' ? 'user' : 'bot';
          const content = match[2];

          
          // 跳过系统消息
          if (content.startsWith('[系统]') || content.includes('你是一个专业的编程助手')) {
            continue;
          }
          
          appendMessage(body, role, content, role === 'bot');
        } else {
          console.log('消息格式不匹配:', historyItem.substring(0, 100) + '...');
        }
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
        clearMemory().then(() => {
          body.innerHTML = '';
          appendMessage(body, 'bot', '记忆已清空');
        }).catch(() => {
          appendMessage(body, 'bot', '清空失败，请稍后重试');
        });
      }
    });

    function doSend(){
      const text = (input.value || '').trim();
      if (!text || sending) return;
      sending = true;
      send.disabled = true;
      
      // 显示用户消息
      appendMessage(body, 'user', text);
      
      // 显示AI思考中状态
      const thinkingIndicator = createThinkingIndicator(body);
      
      input.value = '';
      let botBubble = null;
      let accumulatedText = '';

      streamChat(text, {
        onToken: (token) => {
          // 移除[DONE]标记
          token = token.replace(/\[DONE\]/g, '');
          
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


