# 网站性能优化说明

## 问题：第一次访问慢的原因

### 1. **未启用 Gzip 压缩**
- JS/CSS 文件体积大，传输慢
- 例如：一个 500KB 的 JS 文件，压缩后可能只有 100KB

### 2. **代码未分割**
- 所有代码打包成一个大文件
- 首次加载需要下载整个应用的所有代码

### 3. **缓存策略不够优化**
- 静态资源缓存时间短
- 没有区分可变和不可变资源

### 4. **网络延迟**
- 公网访问时，CDN 未命中缓存
- 首次访问需要从源服务器获取所有资源

---

## 已实施的优化方案

### ✅ Nginx 优化（nginx.conf）

#### 1. **Gzip 压缩**
```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/javascript ...;
```
- **效果**：减少 60-80% 的传输体积
- **影响**：首次加载速度提升 3-5 倍

#### 2. **分层缓存策略**
- **index.html**：不缓存（`no-cache`）- 确保获取最新版本
- **JS/CSS/字体/图片**：长期缓存（1年）- 带 hash 的文件可以安全缓存
- **其他资源**：短期缓存（1天）

#### 3. **TCP 优化**
```nginx
tcp_nopush on;
tcp_nodelay on;
keepalive_timeout 65;
```

### ✅ Vite 构建优化（vite.config.js）

#### 1. **代码分割（Code Splitting）**
将大的 bundle 拆分成多个小文件：
- `react-vendor.js` - React 核心库（约 150KB）
- `antd-vendor.js` - Ant Design UI 库（约 800KB）
- `markdown-vendor.js` - Markdown 渲染库（约 200KB）
- `utils-vendor.js` - 工具库（约 50KB）
- `index.js` - 你的业务代码

**好处**：
- 首次只加载必需的代码
- 利用浏览器并行下载能力
- 更新代码时，只需重新下载变化的部分

#### 2. **代码压缩**
```javascript
minify: 'terser',
terserOptions: {
  compress: {
    drop_console: true,  // 移除 console.log
    drop_debugger: true,
  },
}
```

#### 3. **CSS 代码分割**
```javascript
cssCodeSplit: true
```

---

## 性能提升预期

### 优化前
- 首次加载：**2-5 秒**（取决于网络）
- 传输体积：**~2-3 MB**
- 请求数：**10-20 个**

### 优化后
- 首次加载：**0.5-1.5 秒**
- 传输体积：**~500KB - 1MB**（压缩后）
- 请求数：**15-30 个**（分割后，但并行加载）
- 二次访问：**< 200ms**（缓存命中）

---

## 部署步骤

### 1. 重新构建前端
```bash
cd web
npm run build
```

### 2. 重新构建 Docker 镜像
```bash
docker build -t vnollx-web:latest .
```

### 3. 重启容器
```bash
docker-compose down
docker-compose up -d
```

### 4. 验证优化效果

#### 检查 Gzip 是否生效
```bash
curl -H "Accept-Encoding: gzip" -I http://your-domain.com/assets/index.js
# 应该看到：Content-Encoding: gzip
```

#### 检查缓存策略
```bash
curl -I http://your-domain.com/assets/index.js
# 应该看到：Cache-Control: public, immutable
```

#### 使用浏览器开发者工具
1. 打开 Chrome DevTools (F12)
2. 切换到 Network 标签
3. 刷新页面（Ctrl+Shift+R 强制刷新）
4. 查看：
   - **Size 列**：应该显示压缩后的大小（如 `120 KB / 500 KB`）
   - **Time 列**：加载时间应该明显减少
   - **Status 列**：第二次访问应该显示 `200 (from disk cache)`

---

## 进一步优化建议

### 1. **使用 CDN**
将静态资源托管到 CDN（如阿里云 OSS + CDN）
- 减少源服务器压力
- 利用 CDN 边缘节点加速

### 2. **启用 HTTP/2**
```nginx
listen 3000 http2;
```
- 多路复用，减少连接开销
- 头部压缩

### 3. **预加载关键资源**
在 `index.html` 中添加：
```html
<link rel="preload" href="/assets/react-vendor.js" as="script">
<link rel="preload" href="/assets/index.css" as="style">
```

### 4. **懒加载路由**
使用 React.lazy() 按需加载页面组件：
```javascript
const ProblemDetail = React.lazy(() => import('./pages/ProblemDetail'));
```

### 5. **图片优化**
- 使用 WebP 格式
- 实施图片懒加载
- 压缩图片体积

### 6. **Service Worker（PWA）**
实现离线缓存，提升重复访问速度

---

## 监控和分析

### 使用 Lighthouse 评分
```bash
# Chrome DevTools > Lighthouse > Generate report
```

### 关键指标
- **FCP (First Contentful Paint)**：首次内容绘制 < 1.8s
- **LCP (Largest Contentful Paint)**：最大内容绘制 < 2.5s
- **TTI (Time to Interactive)**：可交互时间 < 3.8s
- **TBT (Total Blocking Time)**：总阻塞时间 < 200ms

---

## 常见问题

### Q: 为什么第二次访问就快了？
A: 浏览器缓存了静态资源，不需要重新下载。

### Q: 如何清除缓存测试？
A: Chrome DevTools > Network > 勾选 "Disable cache" + 硬刷新（Ctrl+Shift+R）

### Q: Gzip 压缩会增加服务器负担吗？
A: 会有轻微的 CPU 开销，但现代服务器完全可以承受，且收益远大于成本。

### Q: 代码分割会增加请求数，不是更慢吗？
A: 现代浏览器支持并行下载（HTTP/1.1 最多 6 个，HTTP/2 无限制），多个小文件并行下载通常比一个大文件更快。

---

## 总结

通过以上优化，你的网站首次加载速度应该能提升 **3-5 倍**，后续访问基本可以做到 **秒开**。

如果还有性能问题，可以：
1. 使用 Chrome DevTools 的 Performance 面板分析瓶颈
2. 检查后端 API 响应时间
3. 考虑使用 CDN 加速静态资源
