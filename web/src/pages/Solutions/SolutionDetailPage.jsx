import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, Button, Space, Typography, message, Skeleton, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './SolutionPages.css';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const { Title, Text, Paragraph } = Typography;

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

const SolutionDetailPage = () => {
  const { solveId, problemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pid = problemId;
  const titleFromState = location.state?.title;

  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.warning('请先登录后查看题解');
      navigate('/');
      return;
    }
    if (!pid || !solveId) {
      setError('缺少题目或题解信息');
      setLoading(false);
      return;
    }
    loadSolution();
  }, [pid, solveId]);

  const loadSolution = async () => {
    setLoading(true);
    try {
      const data = await api.get('/solve/detail', { params: { id: solveId } });
      if (data.code === 200) {
        setSolution(data.data);
        setError(null);
      } else {
        setError(data.msg || '获取题解失败');
      }
    } catch (err) {
      setError('网络异常，获取题解失败');
    } finally {
      setLoading(false);
    }
  };

  const renderedContent = useMemo(() => {
    if (!solution?.content) return '<p>暂无内容</p>';
    const withLatex = renderLatex(solution.content);
    return DOMPurify.sanitize(marked.parse(withLatex));
  }, [solution?.content]);

  if (!pid || !solveId) {
    return (
      <Result
        status="404"
        title="缺少题解信息"
        subTitle="请从题目详情页重新进入题解详情"
        extra={
          <Button type="primary" onClick={() => navigate('/problems')}>
            返回题目列表
          </Button>
        }
      />
    );
  }

  return (
    <div className="solution-page">
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : error ? (
        <Result
          status="error"
          title="加载题解失败"
          subTitle={error}
          extra={
            <Space>
              <Button onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: titleFromState } })}>
                返回题解列表
              </Button>
              <Button type="primary" onClick={loadSolution}>
                重试
              </Button>
            </Space>
          }
        />
      ) : (
        <div className="solution-detail-container">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: titleFromState } })}
            style={{ paddingLeft: 0, marginBottom: 16 }}
          >
            返回题解列表
          </Button>
          <Card className="solution-detail-card">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={2}>{solution?.title}</Title>
                <Paragraph type="secondary">{solution?.problemName}</Paragraph>
              </div>
              <div className="solution-detail-meta">
                <MetaItem label="题目 ID" value={`#${solution?.pid}`} />
                <MetaItem label="作者" value={solution?.name} />
                <MetaItem
                  label="发布时间"
                  value={dayjs(solution?.createTime).format('YYYY-MM-DD HH:mm')}
                />
              </div>
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderedContent }} />
            </Space>
          </Card>
        </div>
      )}
    </div>
  );
};

const MetaItem = ({ label, value }) => (
  <div className="solution-meta-card">
    <span className="solution-meta-label">{label}</span>
    <span className="solution-meta-value">{value || '--'}</span>
  </div>
);

export default SolutionDetailPage;
