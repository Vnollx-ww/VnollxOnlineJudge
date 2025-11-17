import { useParams } from 'react-router-dom';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const NotificationDetail = () => {
  const { id } = useParams();
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Title level={2}>通知详情 #{id}</Title>
        <p>通知详情功能开发中...</p>
      </Card>
    </div>
  );
};

export default NotificationDetail;



