import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Button,
  message,
  Spin,
  Space,
  Divider,
  Select,
  Alert,
  Input,
  Avatar,
  Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, CodeOutlined, CommentOutlined, BookOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '../../utils/api';
import { getUserInfo, isAuthenticated } from '../../utils/auth';
import { useJudgeWebSocket } from '../../hooks/useJudgeWebSocket';
import CodeEditor from '../../components/CodeEditor/CodeEditor';
import './ProblemDetail.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

marked.setOptions({
  gfm: true,
  breaks: true,
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
});

const languageOptions = [
    {
        label: 'C++',
        value: 'cpp',
        template: `#include <iostream>
// 注意：本平台禁止使用 #include <bits/stdc++.h>
// 请根据需要自行包含标准库头文件
using namespace std;

int main() {

    // 请在此处编写你的代码

    return 0;
}
`,
    },
    {
        label: 'Python 3',
        value: 'python',
        template: `# 请在此处编写你的代码
def main():
    pass

if __name__ == "__main__":
    main()
`,
    },
    {
        label: 'Java',
        value: 'java',
        template: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // 请在此处编写你的代码
    }
}
`,
    },
];


const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState([]);
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [code, setCode] = useState(languageOptions[0].template);
  const [testResult, setTestResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [codeLoading, setCodeLoading] = useState({ test: false, submit: false });
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [currentSnowflakeId, setCurrentSnowflakeId] = useState(null);

  const userInfo = getUserInfo();

  const handleWebSocketMessage = useCallback((msg) => {
    console.log('ProblemDetail 收到 WebSocket:', msg, 'currentSnowflakeId:', currentSnowflakeId);
    // 使用字符串比较，避免类型不匹配
    if (msg && currentSnowflakeId && String(msg.snowflakeId) === String(currentSnowflakeId)) {
      const status = msg.status || '未知状态';
      let type = 'info';
      if (status === '答案正确') type = 'success';
      else if (status === '评测中') type = 'info';
      else if (status === '编译错误') type = 'warning';
      else type = 'error';

      // 构建详细信息
      let detail = '';
      if (msg.status === '评测中') {
        detail = '正在进行评测...';
      } else {
        detail = `运行时间: ${msg.time || 0}ms, 内存: ${msg.memory || 0}MB`;
        // 如果有错误信息，追加到详细信息中
        if (msg.errorInfo) {
          detail += `\n\n${msg.errorInfo}`;
        }
      }

      setSubmitResult({
        type,
        message: status,
        detail,
      });

      if (status !== '评测中') {
        window.dispatchEvent(new Event('notification-updated'));
      }
    }
  }, [currentSnowflakeId]);

  useJudgeWebSocket(handleWebSocketMessage);

  // 渲染 LaTeX 公式
  const renderLatex = useCallback((text) => {
    // 处理块级公式 $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
      } catch (e) {
        return match;
      }
    });
    // 处理行内公式 $...$（排除 $$ 的情况）
    text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
      } catch (e) {
        return match;
      }
    });
    return text;
  }, []);

  const renderMarkdown = useCallback((content, fallback = '暂无内容') => {
    const raw = content && content.trim() ? content : fallback;
    // 先处理 LaTeX 公式，再解析 Markdown
    const withLatex = renderLatex(raw);
    return DOMPurify.sanitize(marked.parse(withLatex));
  }, [renderLatex]);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadProblem();
  }, [id, navigate]);

  useEffect(() => {
    if (problem?.id) {
      loadTags(problem.id);
      loadComments(problem.id);
    }
  }, [problem?.id]);

  useEffect(() => {
    const template =
      languageOptions.find((item) => item.value === language)?.template ||
      languageOptions[0].template;

    // 简化逻辑：切换语言时总是显示模板，让用户明确知道切换成功了
    setCode(template);
  }, [language]);

  const codeStorageKey = useMemo(() => {
    const pid = problem?.id ?? id;
    if (!pid) return undefined;
    return `oj:code:problem:${pid}:${language}`;
  }, [problem?.id, id, language]);

  const loadProblem = async () => {
    setLoading(true);
    try {
      const data = await api.get('/problem/get', { params: { id } });
      if (data.code === 200) {
        setProblem(data.data);
      } else {
        message.error(data.msg || '加载题目失败');
      }
    } catch (error) {
      message.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async (pid) => {
    try {
      const data = await api.get('/problem/tags', { params: { pid } });
      if (data.code === 200) {
        setTags(data.data || []);
      }
    } catch (error) {
      console.warn('加载标签失败:', error);
    }
  };

  const formatComments = (list = []) =>
    list.map((item) => ({
      ...item,
      children: formatComments(item.subcommentList || []),
    }));

  const loadComments = async (pid) => {
    setCommentLoading(true);
    try {
      const data = await api.get('/comment/list', { params: { pid } });
      if (data.code === 200) {
        setComments(formatComments(data.data || []));
      }
    } catch (error) {
      message.error('加载评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  const infoItems = useMemo(() => {
    const submitCount = problem?.submitCount ?? 0;
    const passCount = problem?.passCount ?? 0;

    return [
      { label: '时间限制', value: problem?.timeLimit ? `${problem.timeLimit} ms` : '无限制' },
      { label: '内存限制', value: problem?.memoryLimit ? `${problem.memoryLimit} MB` : '无限制' },
      { label: '提交', value: submitCount },
      { label: '通过', value: passCount },
      {
        label: '通过率',
        value:
          submitCount > 0
            ? `${Math.round((passCount / submitCount) * 10000) / 100}%`
            : '0%',
      },
    ];
  }, [problem]);

  const handleTestCode = async () => {
    if (!code.trim()) {
      message.warning('请先输入代码');
      return;
    }
    if (!problem.inputExample || !problem.outputExample) {
      message.warning('该题目没有提供样例，无法测试');
      return;
    }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setTestResult(null);
    try {
      const payload = {
        code,
        option: language,
        pid: String(problem.id),
        inputExample: problem.inputExample,
        outputExample: problem.outputExample,
        time: String(problem.timeLimit || 1000),
        memory: String(problem.memoryLimit || 256),
      };
      const data = await api.post('/judge/test', payload);
      if (data.code === 200) {
        setTestResult({
          type: data.data.status === '答案正确' ? 'success' : 'warning',
          message: data.data.status || '测试完成',
          detail: data.data.errorInfo,
        });
      } else {
        setTestResult({ type: 'error', message: data.msg || '测试失败' });
      }
    } catch (error) {
      setTestResult({
        type: 'error',
        message: error?.response?.data?.msg || '测试失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const handleSubmitCode = async () => {
    console.log('handleSubmitCode 被调用');
    if (!code.trim()) {
      message.warning('请先输入代码');
      return;
    }
    setCodeLoading((prev) => ({ ...prev, submit: true }));
    setSubmitResult(null);
    try {
      const payload = {
        code,
        option: language,
        pid: String(problem.id),
        title: problem.title,
        uname: userInfo.name,
        cid: '0',
        create_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        time: String(problem.timeLimit || 1000),
        memory: String(problem.memoryLimit || 256),
      };
      const data = await api.post('/judge/submit', payload);
      if (data.code === 200) {
        // 保存 snowflakeId 以便 WebSocket 过滤消息
        if (data.data.snowflakeId) {
            console.log('提交成功，设置 snowflakeId:', data.data.snowflakeId);
            setCurrentSnowflakeId(data.data.snowflakeId);
        }
        
        const status = '等待评测'; // 初始状态
        setSubmitResult({
          type: 'info',
          message: status,
          detail: '已提交，等待评测...',
        });
        window.dispatchEvent(new Event('notification-updated'));
      } else {
        setSubmitResult({ type: 'error', message: data.msg || '提交失败' });
      }
    } catch (error) {
      setSubmitResult({
        type: 'error',
        message: error?.response?.data?.msg || '提交失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      message.warning('请输入评论内容');
      return;
    }
    if (!userInfo?.id) {
      message.error('请先登录后再发表评论');
      return;
    }
    setCommentSubmitting(true);
    try {
      const payload = {
        problemId: Number(problem.id),
        parentId: replyTarget?.id || null,
        receiveUserId: replyTarget?.userId || null,
        username: userInfo.name,
        content: commentContent.trim(),
        createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
      const data = await api.post('/comment/publish', payload);
      if (data.code === 200) {
        message.success('发布成功');
        setCommentContent('');
        setReplyTarget(null);
        loadComments(problem.id);
      } else {
        message.error(data.msg || '发布失败');
      }
    } catch (error) {
      message.error(error?.response?.data?.msg || '发布失败，请稍后重试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const data = await api.delete('/comment/delete', { params: { commentId } });
      if (data.code === 200) {
        message.success('删除成功');
        loadComments(problem.id);
      } else {
        message.error(data.msg || '删除失败');
      }
    } catch (error) {
      message.error(error?.response?.data?.msg || '删除失败，请稍后重试');
    }
  };

  const renderComments = (items = []) =>
    items.map((item) => (
      <div className="comment-item" key={item.id}>
        <div className="comment-item-header">
          <Space size="middle">
            <Avatar style={{ backgroundColor: '#1a73e8' }}>
              {item.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <div className="comment-meta">
              <span className="comment-author">{item.username}</span>
              <span className="comment-time">
                {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
          </Space>
          <Space size="small">
            <Button type="link" size="small" onClick={() => setReplyTarget(item)}>
              回复
            </Button>
            {userInfo?.id && String(userInfo.id) === String(item.userId) ? (
              <Popconfirm
                title="确定删除该评论？"
                onConfirm={() => handleDeleteComment(item.id)}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        </div>
        <div
          className="comment-item-content markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
        />
        {item.children?.length ? (
          <div className="comment-children">{renderComments(item.children)}</div>
        ) : null}
      </div>
    ));

  if (loading) {
    return (
      <div className="problem-detail-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="problem-detail-container">
        <Card>题目不存在</Card>
      </div>
    );
  }

  return (
    <div className="problem-detail-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          if (location.state?.from === 'practice' && location.state?.practiceId) {
            navigate(`/practice/${location.state.practiceId}`);
          } else {
            navigate('/problems');
          }
        }}
        style={{ marginBottom: 16 }}
      >
        {location.state?.from === 'practice' ? '返回练习' : '返回题目列表'}
      </Button>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card className="problem-card">
        <div className="problem-header">
          <Title level={2}>
            #{problem.id} - {problem.title}
          </Title>
          <Space size="middle">
            <Button
              icon={<BookOutlined />}
              onClick={() =>
                navigate(`/problem/${problem.id}/solutions`, {
                  state: { title: problem.title },
                })
              }
            >
              查看题解
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() =>
                navigate(`/problem/${problem.id}/solutions/publish`, {
                  state: { title: problem.title },
                })
              }
            >
              发布题解
            </Button>
          </Space>
        </div>
          <div className="problem-meta-grid">
            {infoItems.map((item) => (
              <div className="meta-card" key={item.label}>
                <Text type="secondary">{item.label}</Text>
                <Title level={4}>{item.value}</Title>
              </div>
            ))}
          </div>

          <div className="problem-tags">
            <Text strong>难度：</Text>
            <Tag color={getDifficultyColor(problem.difficulty)} style={{ marginRight: 24 }}>
              {problem.difficulty}
            </Tag>
            <Text strong>标签：</Text>
            {tags.length ? (
              <Space size={[8, 8]} wrap>
                {tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">无标签</Text>
            )}
          </div>

          <Divider />

          <div className="problem-section">
            <Title level={4}>题目描述</Title>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.description) }}
            />
          </div>
          <div className="problem-section">
            <Title level={4}>输入格式</Title>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(problem.inputFormat, '暂无输入格式说明'),
              }}
            />
          </div>
          <div className="problem-section">
            <Title level={4}>输出格式</Title>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(problem.outputFormat, '暂无输出格式说明'),
              }}
            />
          </div>

          <div className="samples-grid">
            <div className="sample-card">
              <Title level={5}>输入样例</Title>
              <pre className="problem-pre">{problem.inputExample || '暂无输入样例'}</pre>
            </div>
            <div className="sample-card">
              <Title level={5}>输出样例</Title>
              <pre className="problem-pre">{problem.outputExample || '暂无输出样例'}</pre>
            </div>
          </div>

          <div className="problem-section">
            <Title level={4}>提示</Title>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(problem.hint, '暂无提示'),
              }}
            />
          </div>
        </Card>

        <Card
          className="editor-card"
          title={
            <Space>
              <CodeOutlined />
              <span>在线代码编辑器</span>
            </Space>
          }
        >
          <div className="editor-toolbar">
            <Space size="middle" wrap>
              <Select
                value={language}
                onChange={setLanguage}
                style={{ width: 160 }}
              >
                {languageOptions.map((option) => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Space>
            <Button
              type="link"
              onClick={() => {
                const template =
                  languageOptions.find((item) => item.value === language)?.template || '';
                setCode(template);
              }}
            >
              重置模板
            </Button>
          </div>
          {language === 'java' && (
            <Alert
              message="暂不支持用Java提交，请等待"
              type="info"
              showIcon
              style={{ marginTop: 12, marginBottom: 12 }}
            />
          )}
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            height={420}
            storageKey={codeStorageKey}
          />
          <div className="editor-actions">
            <Space>
              <Button 
                loading={codeLoading.test} 
                onClick={handleTestCode}
                disabled={language === 'java'}
              >
                测试样例
              </Button>
              <Button
                type="primary"
                loading={codeLoading.submit}
                onClick={handleSubmitCode}
                disabled={language === 'java'}
              >
                提交评测
              </Button>
            </Space>
          </div>
          {(testResult || submitResult) && (
            <div className="editor-result">
              {testResult ? (
                <Alert
                  type={testResult.type}
                  message={`测试结果：${testResult.message}`}
                  description={<div style={{ whiteSpace: 'pre-wrap' }}>{testResult.detail}</div>}
                  showIcon
                  closable
                  onClose={() => setTestResult(null)}
                />
              ) : null}
              {submitResult ? (
                <Alert
                  type={submitResult.type}
                  message={`提交结果：${submitResult.message}`}
                  description={<div style={{ whiteSpace: 'pre-wrap' }}>{submitResult.detail}</div>}
                  showIcon
                  closable
                  onClose={() => setSubmitResult(null)}
                />
              ) : null}
            </div>
          )}
        </Card>

        <Card
          className="comment-card"
          title={
            <Space>
              <CommentOutlined />
              <span>评论讨论</span>
              <Tag color="blue">{comments.length}</Tag>
            </Space>
          }
        >
          <div className="comment-editor">
            {replyTarget ? (
              <div className="reply-target">
                回复 @{replyTarget.username}
                <Button type="link" size="small" onClick={() => setReplyTarget(null)}>
                  取消
                </Button>
              </div>
            ) : null}
            <TextArea
              rows={4}
              placeholder="分享你的想法、解题思路或遇到的问题..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              maxLength={500}
            />
            <div className="comment-toolbar">
              <Text type="secondary">{commentContent.length}/500</Text>
              <Button
                type="primary"
                onClick={handleSubmitComment}
                loading={commentSubmitting}
              >
                发表评论
              </Button>
            </div>
          </div>
          <Divider />
          <div className="comment-list">
            {commentLoading ? (
              <Spin />
            ) : comments.length ? (
              renderComments(comments)
            ) : (
              <Text type="secondary">还没有评论，快来抢沙发吧！</Text>
            )}
          </div>
        </Card>
      </Space>
    </div>
  );
};

const getDifficultyColor = (difficulty) => {
  switch (difficulty?.toLowerCase()) {
    case '简单':
      return 'green';
    case '中等':
      return 'orange';
    case '困难':
      return 'red';
    default:
      return 'default';
  }
};

export default ProblemDetail;

