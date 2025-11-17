import { useState } from 'react';
import { Layout, Modal, Typography } from 'antd';
import Header from './Header';
import './AppLayout.css';

const { Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

const AppLayout = ({ children }) => {
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);

  return (
    <Layout className="app-layout">
      <Header />
      <Content className="app-content">
        {children}
      </Content>
      <Footer className="app-footer">
        <div className="footer-content">
          <p>
            <span>&copy; 2025 VnollxOnlineJudge</span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPrivacyVisible(true);
              }}
            >
              隐私政策
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setTermsVisible(true);
              }}
            >
              服务条款
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setContactVisible(true);
              }}
            >
              联系我们
            </a>
          </p>
          <div className="footer-icp">
            <img
              src="https://beian.mps.gov.cn/web/assets/logo01.6189a29f.png"
              alt="备案图标"
              style={{ width: 20, height: 20, marginRight: 5 }}
            />
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=50010802006523"
              rel="noreferrer"
              target="_blank"
            >
              渝公网安备50010802006523号
            </a>
            <br />
            <a href="https://beian.miit.gov.cn/#/Integrated/index">
              渝ICP备2025055483号-1
            </a>
          </div>
        </div>
      </Footer>

      {/* 隐私政策模态框 */}
      <Modal
        title="隐私政策"
        open={privacyVisible}
        onCancel={() => setPrivacyVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 0' }}>
          <Paragraph>
            欢迎使用VnollxOnlineJudge平台（以下简称"本平台"）。我们尊重并保护所有使用本平台用户的个人隐私权。为了给您提供更准确、更优质的服务，本平台会按照本隐私政策的规定使用和披露您的个人信息。但本平台将以高度的勤勉、审慎义务对待这些信息。除本隐私政策另有规定外，在未征得您事先许可的情况下，本平台不会将这些信息对外披露或向第三方提供。
          </Paragraph>

          <Title level={4}>一、信息收集</Title>
          <Paragraph>
            当您注册本平台账号时，我们可能会收集您的姓名、电子邮箱地址等信息，以便为您提供账户服务和个性化体验。
          </Paragraph>

          <Title level={4}>二、信息使用</Title>
          <Paragraph>我们收集的信息将用于以下目的：</Paragraph>
          <ul>
            <li>提供、维护和改进我们的服务</li>
            <li>开发新功能和服务</li>
            <li>理解您如何使用我们的服务，以改善用户体验</li>
            <li>向您发送重要通知，如服务变更、安全提醒等</li>
          </ul>

          <Title level={4}>三、信息保护</Title>
          <Paragraph>
            本平台采用行业标准的安全技术和程序来保护您的个人信息免受未授权访问、使用或泄露。我们限制访问您个人信息的员工仅为履行其工作职责而必要的人员。
          </Paragraph>

          <Title level={4}>四、信息披露</Title>
          <Paragraph>在以下情况下，我们可能会披露您的个人信息：</Paragraph>
          <ul>
            <li>获得您的明确许可</li>
            <li>根据适用的法律法规、法律程序或政府要求</li>
            <li>为保护本平台的合法权益，包括但不限于调查、防止或处理欺诈、安全或技术问题</li>
          </ul>

          <Title level={4}>五、政策变更</Title>
          <Paragraph>
            我们可能会不时更新本隐私政策。当我们进行重大变更时，会通过平台公告或其他适当方式通知您，建议您定期查阅本政策。
          </Paragraph>

          <Title level={4}>六、联系我们</Title>
          <Paragraph>
            如果您对本隐私政策有任何疑问，请通过我们的联系方式与我们取得联系。
          </Paragraph>
        </div>
      </Modal>

      {/* 服务条款模态框 */}
      <Modal
        title="服务条款"
        open={termsVisible}
        onCancel={() => setTermsVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 0' }}>
          <Paragraph>
            欢迎使用VnollxOnlineJudge平台（以下简称"本平台"）。使用本平台服务即表示您同意本服务条款的全部内容。如果您不同意本条款，请不要使用本平台。
          </Paragraph>

          <Title level={4}>一、服务内容</Title>
          <Paragraph>
            本平台提供算法题目练习、代码提交、在线评测、排名榜单等服务。平台保留随时变更、暂停或终止部分或全部服务的权利。
          </Paragraph>

          <Title level={4}>二、用户行为规范</Title>
          <Paragraph>用户在使用本平台服务时，应遵守以下规定：</Paragraph>
          <ul>
            <li>不得提交任何违反法律法规、侵犯他人权益或含有恶意代码的内容</li>
            <li>不得利用本平台进行任何形式的作弊行为，包括但不限于抄袭他人代码、使用自动化工具批量提交等</li>
            <li>不得干扰或破坏本平台的正常运行，包括但不限于进行网络攻击、滥用系统资源等</li>
            <li>不得冒充本平台工作人员或其他用户</li>
          </ul>

          <Title level={4}>三、知识产权</Title>
          <Paragraph>
            本平台提供的所有题目、评测系统、网站设计及相关内容的知识产权归本平台所有。用户在本平台提交的代码，其知识产权归用户所有，但授予本平台在服务范围内使用的权利。
          </Paragraph>

          <Title level={4}>四、免责声明</Title>
          <Paragraph>
            本平台尽力保证服务的稳定性和准确性，但不对服务的不间断性、及时性、安全性和无错误做出任何明示或暗示的保证。对于因使用或无法使用本平台服务而造成的任何直接或间接损失，本平台不承担责任。
          </Paragraph>

          <Title level={4}>五、账号管理</Title>
          <Paragraph>
            用户应对其账号下的所有活动和行为负责。如发现账号被非法使用，应立即通知本平台。本平台有权在必要时暂停或终止任何违反本条款的账号。
          </Paragraph>

          <Title level={4}>六、条款变更</Title>
          <Paragraph>
            本平台保留随时修改本服务条款的权利。修改后的条款将在平台公布，继续使用本平台服务即表示您接受修改后的条款。
          </Paragraph>
        </div>
      </Modal>

      {/* 联系我们模态框 */}
      <Modal
        title="联系我们"
        open={contactVisible}
        onCancel={() => setContactVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 0' }}>
          <Paragraph>
            感谢您使用VnollxOnlineJudge平台。如果您有任何问题、建议或反馈，请通过以下方式与我们联系：
          </Paragraph>

          <Title level={4}>电子邮件</Title>
          <Paragraph>
            技术反馈：2720741614@qq.com，您可以提交您的建议和问题，我们会在1-3个工作日内回复。
          </Paragraph>

          <Title level={4}>工作时间</Title>
          <Paragraph>客服工作时间：周一至周五 9:00-18:00（法定节假日除外）</Paragraph>
          <Paragraph>我们会尽快处理您的问题，感谢您的理解与支持！</Paragraph>
        </div>
      </Modal>
    </Layout>
  );
};

export default AppLayout;

