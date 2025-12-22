import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, Typography, InputNumber, Tag, Space, Row, Col, Descriptions } from 'antd';
import { SettingOutlined, KeyOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined, ApiOutlined } from '@ant-design/icons';
import api from '../../utils/api';

const { Title, Text } = Typography;

const AdminSettings = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configInfo, setConfigInfo] = useState(null);
  const [apiKeyForm] = Form.useForm();
  const [modelForm] = Form.useForm();

  useEffect(() => {
    fetchConfigInfo();
  }, []);

  const fetchConfigInfo = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/ai-config/info');
      if (data.code === 200) {
        setConfigInfo(data.data);
        modelForm.setFieldsValue({
          model: data.data.model,
          temperature: data.data.temperature,
          baseUrl: data.data.baseUrl,
        });
      }
    } catch (error) {
      messageApi.error('获取配置信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApiKey = async (values) => {
    try {
      setSaving(true);
      const data = await api.post('/admin/ai-config/api-key', { apiKey: values.apiKey });
      if (data.code === 200) {
        messageApi.success('API Key 更新成功');
        apiKeyForm.resetFields();
        fetchConfigInfo();
      } else {
        messageApi.error(data.message || '更新失败');
      }
    } catch (error) {
      messageApi.error('更新 API Key 失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModel = async (values) => {
    try {
      setSaving(true);
      const data = await api.post('/admin/ai-config/model', values);
      if (data.code === 200) {
        messageApi.success('模型配置更新成功');
        fetchConfigInfo();
      } else {
        messageApi.error(data.message || '更新失败');
      }
    } catch (error) {
      messageApi.error('更新模型配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const data = await api.post('/admin/ai-config/test');
      if (data.code === 200) {
        messageApi.success('连接测试成功');
      } else {
        messageApi.error(data.message || '连接测试失败');
      }
    } catch (error) {
      messageApi.error('连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Title level={3} style={{ marginBottom: 24 }}>
        <SettingOutlined /> 系统设置
      </Title>

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <RobotOutlined style={{ color: '#1a73e8' }} />
                <span>当前配置状态</span>
                {configInfo?.configured ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>已配置</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>未配置</Tag>
                )}
              </Space>
            }
            style={{ marginBottom: 24, height: 400 }}
          >
            {configInfo && (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="API Key">
                  <Text code>{configInfo.apiKey}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="模型">
                  <Text code>{configInfo.model}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Temperature">
                  <Text code>{configInfo.temperature}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Base URL">
                  <Text code style={{ wordBreak: 'break-all' }}>{configInfo.baseUrl}</Text>
                </Descriptions.Item>
              </Descriptions>
            )}
            <div style={{ marginTop: 16 }}>
              <Button onClick={handleTestConnection} loading={testing} icon={<ApiOutlined />}>
                测试连接
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <RobotOutlined style={{ color: '#722ed1' }} />
                <span>模型配置</span>
              </Space>
            }
            style={{ marginBottom: 24, height: 400 }}
          >
            <Form
              form={modelForm}
              onFinish={handleUpdateModel}
              layout="vertical"
            >
              <Form.Item
                name="model"
                label="模型名称"
                tooltip="例如: qwen-plus, qwen-turbo, gpt-3.5-turbo"
              >
                <Input placeholder="qwen-plus" />
              </Form.Item>
              <Form.Item
                name="temperature"
                label="Temperature"
                tooltip="控制输出的随机性，0-2之间，值越大越随机"
              >
                <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="baseUrl"
                label="Base URL"
                tooltip="API 服务地址"
              >
                <Input placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={saving} block>
                  更新模型配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={24}>
          <Card
            title={
              <Space>
                <KeyOutlined style={{ color: '#52c41a' }} />
                <span>更新 API Key</span>
              </Space>
            }
          >
            <Form form={apiKeyForm} onFinish={handleUpdateApiKey} layout="inline" style={{ width: '100%' }}>
              <Form.Item
                name="apiKey"
                rules={[{ required: true, message: '请输入 API Key' }]}
                style={{ flex: 1, marginRight: 16 }}
              >
                <Input.Password placeholder="输入新的 API Key" size="large" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={saving} size="large">
                  更新 API Key
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminSettings;
