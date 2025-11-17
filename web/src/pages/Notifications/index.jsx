import { Card, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Notifications = () => {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Title level={2}>
          <BellOutlined /> 通知列表
        </Title>
        <p>通知功能开发中...</p>
      </Card>
    </div>
  );
};

export default Notifications;



