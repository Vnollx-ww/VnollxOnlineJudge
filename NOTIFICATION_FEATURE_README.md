# 通知功能使用说明

## 功能概述

本次更新为VnollxOnlineJudge平台添加了完整的通知系统，包括：

1. **用户通知查看** - 用户可以查看、筛选、删除通知
2. **管理员通知发布** - 管理员可以发布通知给所有用户
3. **未读通知提醒** - 首页显示未读通知数量

## 新增文件

### 前端页面
- `src/main/resources/static/admin-notification.html` - 管理员发布通知页面
- `src/main/resources/static/notification-list.html` - 用户通知列表页面

### 后端接口
- 在 `NotificationController` 中新增了 `PUT /notification/read/{id}` 接口用于标记通知为已读
- 在 `NotificationService` 中新增了 `markAsRead` 方法

## 功能详细说明

### 1. 首页通知图标

在 `index.html` 的导航栏中添加了邮件图标，显示未读通知数量：
- 只有登录用户才能看到通知图标
- 未读数量通过调用 `/notification/count?status=false` 接口获取
- 点击图标跳转到通知列表页面

### 2. 管理员发布通知

**访问地址**: `/admin-notification.html`

**功能特点**:
- 需要管理员权限才能访问
- 支持标题和内容输入，有字符数限制
- 提供预览功能
- 发布后通知会发送给所有用户

**使用步骤**:
1. 以管理员身份登录
2. 访问管理员发布通知页面
3. 填写通知标题和内容
4. 可以点击"预览通知"查看效果
5. 点击"发布通知"完成发布

### 3. 用户通知列表

**访问地址**: `/notification-list.html`

**功能特点**:
- 支持分页显示通知
- 可以按阅读状态筛选（全部/未读/已读）
- 支持关键词搜索
- 未读通知有特殊显示效果（左侧蓝色边框、右侧红点动画）
- 可以标记通知为已读
- 可以删除通知

**使用步骤**:
1. 登录后点击首页的通知图标
2. 在通知列表页面查看所有通知
3. 使用筛选功能查看特定状态的通知
4. 使用搜索功能查找特定通知
5. 点击"标记已读"将未读通知标记为已读
6. 点击"删除"删除不需要的通知

## API接口说明

### 获取未读通知数量
```
GET /notification/count?status=false
Authorization: Bearer {token}
```

### 获取通知列表
```
GET /notification/list?pageNum=1&pageSize=10&keyword={keyword}
Authorization: Bearer {token}
```

### 标记通知为已读
```
PUT /notification/read/{id}
Authorization: Bearer {token}
```

### 删除通知
```
DELETE /notification/delete/{id}
Authorization: Bearer {token}
```

### 发布通知（管理员）
```
POST /admin/notification/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "通知标题",
  "description": "通知内容",
  "createTime": "2025-01-27T10:00:00.000Z"
}
```

## 样式特点

- 采用现代化的UI设计，与现有页面风格保持一致
- 未读通知有特殊的视觉提示（蓝色边框、动画红点）
- 响应式设计，支持移动端访问
- 丰富的交互效果和动画

## 权限控制

- 普通用户：只能查看和管理自己的通知
- 管理员：可以发布通知给所有用户
- 未登录用户：无法访问通知相关功能

## 注意事项

1. 通知发布后会自动发送给所有注册用户
2. 删除通知是永久性的，无法恢复
3. 通知列表支持分页，默认每页显示10条
4. 搜索功能支持标题关键词匹配
5. 未读通知数量会实时更新

## 技术实现

- 前端使用原生JavaScript，无额外依赖
- 后端使用Spring Boot + MyBatis Plus
- 数据库使用MySQL存储通知数据
- 采用JWT进行身份验证
- 支持事务处理确保数据一致性
