import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Input,
  Space,
  message,
  Modal,
} from 'antd';
import { ArrowLeftOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import api from '../../utils/api';
import { getUserInfo, isAuthenticated } from '../../utils/auth';
import './SolutionPages.css';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

marked.setOptions({
  gfm: true,
  breaks: true,
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
});

// 渲染 LaTeX 公式
const renderLatex = (text) => {
  if (!text) return text;
  // 处理块级公式 $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch (e) {
      return match;
    }
  });
  // 处理行内公式 $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch (e) {
      return match;
    }
  });
  return text;
};

const SolutionPublishPage = () => {
  const { problemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const pid = problemId;
  const problemTitleFromState = location.state?.title;
  const [problemInfo, setProblemInfo] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.warning('请先登录后再发布题解');
      navigate('/');
      return;
    }
    if (!pid) {
      message.error('缺少题目 ID');
      navigate('/problems');
      return;
    }
    loadProblemInfo();
  }, [pid]);

  const loadProblemInfo = async () => {
    if (problemTitleFromState) {
      setProblemInfo({ id: pid, title: problemTitleFromState });
      return;
    }
    try {
      const data = await api.get('/problem/get', { params: { id: pid } });
      if (data.code === 200) {
        setProblemInfo(data.data);
      } else {
        message.error(data.msg || '获取题目信息失败');
      }
    } catch (error) {
      message.error('获取题目信息失败');
    }
  };

  const charCount = content.length;

  const handleSubmit = async () => {
    if (!title.trim()) {
      message.warning('请输入题解标题');
      return;
    }
    if (!content.trim()) {
      message.warning('请输入题解内容');
      return;
    }
    setSubmitting(true);
    try {
      const user = getUserInfo();
      const payload = {
        pid,
        content,
        title,
        name: user.name,
        problemName: problemInfo?.title,
      };
      const data = await api.post('/solve/create', payload);
      if (data.code === 200) {
        message.success('题解发布成功，审核通过后可见');
        navigate(`/problem/${pid}/solutions`, { state: { title: problemInfo?.title } });
      } else {
        message.error(data.msg || '发布题解失败');
      }
    } catch (error) {
      message.error(error?.response?.data?.msg || '发布题解失败');
    } finally {
      setSubmitting(false);
    }
  };

  const previewContent = useMemo(() => {
    if (!content.trim()) return '<p>暂无内容</p>';
    const withLatex = renderLatex(content);
    return DOMPurify.sanitize(marked.parse(withLatex));
  }, [content]);

  return (
    <div className="solution-publish-container">
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: problemInfo?.title } })}
        style={{ paddingLeft: 0, marginBottom: 16 }}
      >
        返回题解列表
      </Button>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card className="solution-publish-card">
          <Title level={2}>发布题解</Title>
          <Paragraph type="secondary">
            分享你的解题思路，支持 Markdown / LaTeX。
          </Paragraph>
          <Paragraph>
            发布题解后需管理员审核通过才会发布，注意提前保存本地备份，避免内容丢失。
          </Paragraph>
        </Card>

        <Card className="solution-publish-card">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>题目信息</Title>
              <Paragraph>
                {problemInfo ? `${problemInfo.title} (#${pid})` : '加载中...'}
              </Paragraph>
            </div>
            <div>
              <Title level={4}>题解标题</Title>
              <Input
                placeholder="请输入题解标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Title level={4} style={{ margin: 0 }}>
                  题解内容
                </Title>
                <Space>
                  <span style={{ color: charCount > 4800 ? '#f87171' : '#6b7280' }}>{charCount}/5000</span>
                  <Button icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)}>
                    预览
                  </Button>
                </Space>
              </Space>
              <TextArea
                rows={16}
                placeholder="支持 Markdown/代码块/数学公式..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmit}>
                发布题解
              </Button>
            </div>
          </Space>
        </Card>
      </Space>

      <Modal
        open={previewVisible}
        title="题解预览"
        onCancel={() => setPreviewVisible(false)}
        footer={<Button onClick={() => setPreviewVisible(false)}>返回编辑</Button>}
        width={900}
      >
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: previewContent }} />
      </Modal>
    </div>
  );
};

export default SolutionPublishPage;
