import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import { Toaster } from 'react-hot-toast';
import zhCN from "antd/locale/zh_CN";
import { AppLayout } from "./components/Layout";
import { PermissionProvider } from "./contexts/PermissionContext";
import {
  Home,
  Problems,
  ProblemDetail,
  Submissions,
  Ranklist,
  Competitions,
  CompetitionDetail,
  CompetitionRanklist,
  CompetitionSubmissions,
  CompetitionProblemDetail,
  Practices,
  PracticeDetail,
  Friends,
  Admin,
  Login,
  Register,
  ForgotPassword,
  Settings,
  UserProfile,
  Notifications,
  NotificationDetail,
  Solutions,
  SolutionListPage,
  SolutionDetailPage,
  SolutionPublishPage,
  About,
  VnollxHome,
} from "./pages";

// Ant Design 主题配置 - Gemini 风格
const theme = {
  token: {
    // 主色调
    colorPrimary: '#1a73e8',
    colorSuccess: '#34a853',
    colorWarning: '#f9ab00',
    colorError: '#d93025',
    colorInfo: '#1a73e8',
    
    // 背景色
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f4f9',
    colorBgElevated: '#ffffff',
    
    // 文字色
    colorText: '#1f1f1f',
    colorTextSecondary: '#444746',
    colorTextTertiary: '#5f6368',
    colorTextQuaternary: '#9aa0a6',
    
    // 边框
    colorBorder: 'rgba(0, 0, 0, 0.08)',
    colorBorderSecondary: 'rgba(0, 0, 0, 0.04)',
    
    // 圆角
    borderRadius: 24,
    borderRadiusLG: 24,
    borderRadiusSM: 16,
    borderRadiusXS: 12,
    
    // 字体
    fontFamily: '"Google Sans", Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    
    // 阴影
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
    boxShadowSecondary: '0 2px 6px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)',
  },
  components: {
    Button: {
      borderRadius: 9999,
      controlHeight: 40,
      paddingInline: 24,
      primaryShadow: 'none',
      defaultBg: '#f0f4f9',
      defaultBorderColor: 'transparent',
    },
    Input: {
      borderRadius: 9999,
      controlHeight: 44,
      paddingInline: 20,
      activeBorderColor: 'transparent',
      hoverBorderColor: 'transparent',
      colorBgContainer: '#f0f4f9',
    },
    Select: {
      borderRadius: 9999,
      controlHeight: 44,
    },
    Card: {
      borderRadius: 24,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
    },
    Modal: {
      borderRadius: 24,
    },
    Table: {
      borderRadius: 24,
      headerBg: 'transparent',
      headerColor: '#444746',
      rowHoverBg: '#f0f4f9',
    },
    Tag: {
      borderRadiusSM: 9999,
    },
    Pagination: {
      borderRadius: 9999,
      itemActiveBg: '#d3e3fd',
    },
    Tabs: {
      inkBarColor: 'transparent',
      itemActiveColor: '#041e49',
      itemSelectedColor: '#041e49',
    },
    Menu: {
      borderRadius: 9999,
      itemBorderRadius: 9999,
      itemHoverBg: '#f0f4f9',
      itemSelectedBg: '#d3e3fd',
      itemSelectedColor: '#041e49',
    },
    Dropdown: {
      borderRadius: 16,
      paddingBlock: 8,
    },
    Message: {
      borderRadius: 16,
    },
    Notification: {
      borderRadius: 24,
    },
  },
};

function App() {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <AntApp>
        <PermissionProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            // 默认配置
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1f1f1f',
              padding: '16px 24px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              maxWidth: '500px',
            },
            // 成功样式
            success: {
              duration: 2000,
              iconTheme: {
                primary: '#34a853',
                secondary: '#fff',
              },
              style: {
                background: '#fff',
                color: '#1f1f1f',
              },
            },
            // 错误样式
            error: {
              duration: 3000,
              iconTheme: {
                primary: '#d93025',
                secondary: '#fff',
              },
              style: {
                background: '#fff',
                color: '#1f1f1f',
              },
            },
            // 加载样式
            loading: {
              iconTheme: {
                primary: '#1a73e8',
                secondary: '#fff',
              },
            },
          }}
        />
        <Router>
          <Routes>
            {/* 独立页面 - 不需要布局 */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/vnollx" element={<VnollxHome />} />

            {/* 管理后台 - 独立布局，不使用全局导航 */}
            <Route path="/admin/*" element={<Admin />} />

            {/* 主布局页面 */}
            <Route
              path="/*"
              element={
                <AppLayout>
                  <Routes>
                    {/* 首页 */}
                    <Route path="/" element={<Home />} />

                    {/* 题目相关 */}
                    <Route path="/problems" element={<Problems />} />
                    <Route path="/problem/:id" element={<ProblemDetail />} />

                    {/* 提交记录 */}
                    <Route path="/submissions" element={<Submissions />} />

                    {/* 排行榜 */}
                    <Route path="/ranklist" element={<Ranklist />} />

                    {/* 竞赛相关 */}
                    <Route path="/competitions" element={<Competitions />} />
                    <Route
                      path="/competition/:id"
                      element={<CompetitionDetail />}
                    />
                    <Route
                      path="/competition/:id/ranklist"
                      element={<CompetitionRanklist />}
                    />
                    <Route
                      path="/competition/:id/submissions"
                      element={<CompetitionSubmissions />}
                    />
                    <Route
                      path="/competition/:cid/problem/:id"
                      element={<CompetitionProblemDetail />}
                    />

                    {/* 练习相关 */}
                    <Route path="/practices" element={<Practices />} />
                    <Route path="/practice/:id" element={<PracticeDetail />} />

                    {/* 好友相关 */}
                    <Route path="/friends" element={<Friends />} />

                    {/* 题解相关 */}
                    <Route
                      path="/problem/:problemId/solutions"
                      element={<SolutionListPage />}
                    />
                    <Route
                      path="/problem/:problemId/solutions/:solveId"
                      element={<SolutionDetailPage />}
                    />
                    <Route
                      path="/problem/:problemId/solutions/publish"
                      element={<SolutionPublishPage />}
                    />
                    <Route path="/solutions" element={<Solutions />} />

                    {/* 用户相关 */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/user/:userId" element={<UserProfile />} />

                    {/* 通知相关 */}
                    <Route path="/notifications" element={<Notifications />} />
                    <Route
                      path="/notification/:id"
                      element={<NotificationDetail />}
                    />

                    {/* 关于 */}
                    <Route path="/about" element={<About />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Routes>
        </Router>
        </PermissionProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
