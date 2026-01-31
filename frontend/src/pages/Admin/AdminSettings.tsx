import { useState, useEffect } from 'react';
import { Form, Input, Button, Spin, InputNumber, Tag, Descriptions, Row, Col } from 'antd';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Key, Bot, CheckCircle, XCircle, Plug } from 'lucide-react';
import api from '@/utils/api';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface ConfigInfo {
  configured: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  baseUrl: string;
}

const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configInfo, setConfigInfo] = useState<ConfigInfo | null>(null);
  const [apiKeyForm] = Form.useForm();
  const [modelForm] = Form.useForm();

  useEffect(() => {
    fetchConfigInfo();
  }, []);

  const fetchConfigInfo = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/ai-config/info') as ApiResponse<ConfigInfo>;
      if (data.code === 200) {
        setConfigInfo(data.data);
        modelForm.setFieldsValue({
          model: data.data.model,
          temperature: data.data.temperature,
          baseUrl: data.data.baseUrl,
        });
      }
    } catch {
      toast.error('获取配置信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApiKey = async (values: { apiKey: string }) => {
    try {
      setSaving(true);
      const data = await api.post('/admin/ai-config/api-key', { apiKey: values.apiKey }) as ApiResponse;
      if (data.code === 200) {
        toast.success('API Key 更新成功');
        apiKeyForm.resetFields();
        fetchConfigInfo();
      } else {
        toast.error((data as any).message || '更新失败');
      }
    } catch {
      toast.error('更新 API Key 失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModel = async (values: { model: string; temperature: number; baseUrl: string }) => {
    try {
      setSaving(true);
      const data = await api.post('/admin/ai-config/model', values) as ApiResponse;
      if (data.code === 200) {
        toast.success('模型配置更新成功');
        fetchConfigInfo();
      } else {
        toast.error((data as any).message || '更新失败');
      }
    } catch {
      toast.error('更新模型配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const data = await api.post('/admin/ai-config/test') as ApiResponse;
      if (data.code === 200) {
        toast.success('连接测试成功');
      } else {
        toast.error((data as any).message || '连接测试失败');
      }
    } catch {
      toast.error('连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--gemini-text-primary)' }}>
        <SettingsIcon className="w-5 h-5" />
        系统设置
      </h2>

      <Row gutter={24}>
        {/* 当前配置状态 */}
        <Col xs={24} lg={12}>
          <div className="gemini-card h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
                <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>当前配置状态</span>
              </div>
              {configInfo?.configured ? (
                <Tag icon={<CheckCircle className="w-3 h-3" />} color="success">
                  已配置
                </Tag>
              ) : (
                <Tag icon={<XCircle className="w-3 h-3" />} color="error">
                  未配置
                </Tag>
              )}
            </div>

            {configInfo && (
              <Descriptions column={1} bordered size="small" className="mb-4">
                <Descriptions.Item label="API Key">
                  <code 
                    className="px-2 py-1 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--gemini-bg)' }}
                  >
                    {configInfo.apiKey}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="模型">
                  <code 
                    className="px-2 py-1 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--gemini-bg)' }}
                  >
                    {configInfo.model}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="Temperature">
                  <code 
                    className="px-2 py-1 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--gemini-bg)' }}
                  >
                    {configInfo.temperature}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="Base URL">
                  <code 
                    className="px-2 py-1 rounded-lg text-sm break-all"
                    style={{ backgroundColor: 'var(--gemini-bg)' }}
                  >
                    {configInfo.baseUrl}
                  </code>
                </Descriptions.Item>
              </Descriptions>
            )}

            <Button
              icon={<Plug className="w-4 h-4" />}
              onClick={handleTestConnection}
              loading={testing}
            >
              测试连接
            </Button>
          </div>
        </Col>

        {/* 模型配置 */}
        <Col xs={24} lg={12}>
          <div className="gemini-card h-full">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-purple-500" />
              <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>模型配置</span>
            </div>

            <Form form={modelForm} onFinish={handleUpdateModel} layout="vertical">
              <Form.Item name="model" label="模型名称" tooltip="例如: qwen-plus, qwen-turbo, gpt-3.5-turbo">
                <Input placeholder="qwen-plus" />
              </Form.Item>
              <Form.Item name="temperature" label="Temperature" tooltip="控制输出的随机性，0-2之间，值越大越随机">
                <InputNumber min={0} max={2} step={0.1} className="w-full" />
              </Form.Item>
              <Form.Item name="baseUrl" label="Base URL" tooltip="API 服务地址">
                <Input placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
              </Form.Item>
              <Form.Item className="mb-0">
                <PermissionGuard permission={PermissionCode.AI_CONFIG_UPDATE}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={saving} 
                    block
                    style={{ 
                      backgroundColor: 'var(--gemini-accent)',
                      color: 'var(--gemini-accent-text)',
                      border: 'none'
                    }}
                  >
                    更新模型配置
                  </Button>
                </PermissionGuard>
              </Form.Item>
            </Form>
          </div>
        </Col>
      </Row>

      {/* 更新 API Key */}
      <div className="gemini-card">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5" style={{ color: 'var(--gemini-success)' }} />
          <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>更新 API Key</span>
        </div>

        <Form form={apiKeyForm} onFinish={handleUpdateApiKey} layout="inline" className="w-full">
          <Form.Item
            name="apiKey"
            rules={[{ required: true, message: '请输入 API Key' }]}
            className="flex-1 mr-4"
          >
            <Input.Password placeholder="输入新的 API Key" size="large" />
          </Form.Item>
          <Form.Item className="mb-0">
            <PermissionGuard permission={PermissionCode.AI_CONFIG_UPDATE}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saving} 
                size="large"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                更新 API Key
              </Button>
            </PermissionGuard>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default AdminSettings;
