import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Input,
  Space,
  Modal,
} from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeftOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import api from '../../utils/api';
import { getUserInfo, isAuthenticated } from '../../utils/auth';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface LocationState {
  title?: string;
}

// 渲染 LaTeX 公式
const renderLatex = (text: string) => {
  if (!text) return text;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return match;
    }
  });
  text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });
  return text;
};

const SolutionPublishPage: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const pid = problemId;
  const problemTitleFromState = (location.state as LocationState)?.title;
  const [problemInfo, setProblemInfo] = useState<{ id?: string; title?: string } | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.warning('请先登录后再发布题解');
      navigate('/');
      return;
    }
    if (!pid) {
      toast.error('缺少题目 ID');
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
        toast.error(data.msg || '获取题目信息失败');
      }
    } catch {
      toast.error('获取题目信息失败');
    }
  };

  const charCount = content.length;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('请输入题解标题');
      return;
    }
    if (!content.trim()) {
      toast.warning('请输入题解内容');
      return;
    }
    setSubmitting(true);
    try {
      const user = getUserInfo();
      const payload = {
        pid,
        content,
        title,
        name: user?.name,
        problemName: problemInfo?.title,
      };
      const data = await api.post('/solve/create', payload);
      if (data.code === 200) {
        toast.success('题解发布成功，审核通过后可见');
        navigate(`/problem/${pid}/solutions`, { state: { title: problemInfo?.title } });
      } else {
        toast.error(data.msg || '发布题解失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '发布题解失败');
    } finally {
      setSubmitting(false);
    }
  };

  const previewContent = useMemo(() => {
    if (!content.trim()) return '<p style="color: var(--gemini-text-disabled);">暂无内容</p>';
    const withLatex = renderLatex(content);
    const html = marked.parse(withLatex) as string;
    return DOMPurify.sanitize(html);
  }, [content]);

  // 对预览内容进行代码高亮
  useEffect(() => {
    if (previewVisible) {
      setTimeout(() => {
        document.querySelectorAll('.preview-content pre code').forEach((block) => {
          hljs.highlightElement(block as HTMLElement);
        });
      }, 100);
    }
  }, [previewVisible, previewContent]);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="max-w-4xl mx-auto">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: problemInfo?.title } })}
          className="!pl-0 !mb-4"
          style={{ color: 'var(--gemini-accent-strong)' }}
        >
          返回题解列表
        </Button>
        <Space direction="vertical" size="large" className="w-full">
          {/* Info Card - Gemini 风格 */}
          <div className="gemini-card">
            <Title level={2} style={{ color: 'var(--gemini-text-primary)' }}>发布题解</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              分享你的解题思路，支持 Markdown / LaTeX。
            </Paragraph>
            <Paragraph style={{ color: 'var(--gemini-warning)' }}>
              发布题解后需管理员审核通过才会发布，注意提前保存本地备份，避免内容丢失。
            </Paragraph>
          </div>

          {/* Form Card - Gemini 风格 */}
          <div className="gemini-card">
            <Space direction="vertical" size="large" className="w-full">
              <div>
                <Title level={4} className="!mb-2" style={{ color: 'var(--gemini-text-primary)' }}>题目信息</Title>
                <Paragraph className="!mb-0" style={{ color: 'var(--gemini-text-secondary)' }}>
                  {problemInfo ? `${problemInfo.title} (#${pid})` : '加载中...'}
                </Paragraph>
              </div>
              <div>
                <Title level={4} className="!mb-2" style={{ color: 'var(--gemini-text-primary)' }}>题解标题</Title>
                <Input
                  placeholder="请输入题解标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="!rounded-full"
                  size="large"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Title level={4} className="!mb-0" style={{ color: 'var(--gemini-text-primary)' }}>题解内容</Title>
                  <Space>
                    <span style={{ color: charCount > 4800 ? 'var(--gemini-error)' : 'var(--gemini-text-tertiary)' }}>
                      {charCount}/5000
                    </span>
                    <Button icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)}>
                      预览
                    </Button>
                  </Space>
                </div>
                <TextArea
                  rows={16}
                  placeholder="支持 Markdown/代码块/数学公式..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="!rounded-2xl !font-mono"
                />
              </div>
              <div className="text-right">
                <Button 
                  type="primary" 
                  icon={<SendOutlined />} 
                  loading={submitting} 
                  onClick={handleSubmit}
                  size="large"
                  className="!rounded-full"
                  style={{ 
                    backgroundColor: 'var(--gemini-accent)',
                    color: 'var(--gemini-accent-text)',
                    border: 'none'
                  }}
                >
                  发布题解
                </Button>
              </div>
            </Space>
          </div>
        </Space>

        <Modal
          open={previewVisible}
          title="题解预览"
          onCancel={() => setPreviewVisible(false)}
          footer={<Button onClick={() => setPreviewVisible(false)}>返回编辑</Button>}
          width={900}
        >
          <div 
            className="preview-content prose prose-blue max-w-none" 
            dangerouslySetInnerHTML={{ __html: previewContent }} 
          />
        </Modal>
      </div>
    </div>
  );
};

export default SolutionPublishPage;
