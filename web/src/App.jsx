import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './components/Layout/AppLayout';
import Home from './pages/Home';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Submissions from './pages/Submissions';
import Ranklist from './pages/Ranklist';
import Competitions from './pages/Competitions';
import CompetitionDetail from './pages/CompetitionDetail';
import CompetitionRanklist from './pages/CompetitionRanklist';
import CompetitionSubmissions from './pages/CompetitionSubmissions';
import Notifications from './pages/Notifications';
import NotificationDetail from './pages/NotificationDetail';
import Settings from './pages/Settings';
import About from './pages/About';
import UserProfile from './pages/UserProfile';
import Admin from './pages/Admin';
import CompetitionProblemDetail from './pages/CompetitionProblemDetail';
import SolutionListPage from './pages/Solutions/SolutionListPage';
import SolutionDetailPage from './pages/Solutions/SolutionDetailPage';
import SolutionPublishPage from './pages/Solutions/SolutionPublishPage';
import './App.css';
import VnollxHome from "./pages/VnollxHome/index.jsx";

// Ant Design 主题配置
const theme = {
  token: {
    colorPrimary: '#1a73e8',
    borderRadius: 8,
    fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
  },
};

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntdApp>
        <BrowserRouter>
          <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <Home />
              </AppLayout>
            }
          />
              <Route
                  path="/home"
                  element={
                      <AppLayout>
                          <VnollxHome />
                      </AppLayout>
                  }
              />
          <Route
            path="/problems"
            element={
              <AppLayout>
                <Problems />
              </AppLayout>
            }
          />
          <Route
            path="/problem/:id"
            element={
              <AppLayout>
                <ProblemDetail />
              </AppLayout>
            }
          />
          <Route
            path="/problem/:problemId/solutions"
            element={
              <AppLayout>
                <SolutionListPage />
              </AppLayout>
            }
          />
          <Route
            path="/problem/:problemId/solutions/:solveId"
            element={
              <AppLayout>
                <SolutionDetailPage />
              </AppLayout>
            }
          />
          <Route
            path="/problem/:problemId/solutions/publish"
            element={
              <AppLayout>
                <SolutionPublishPage />
              </AppLayout>
            }
          />
          <Route
            path="/submissions"
            element={
              <AppLayout>
                <Submissions />
              </AppLayout>
            }
          />
          <Route
            path="/ranklist"
            element={
              <AppLayout>
                <Ranklist />
              </AppLayout>
            }
          />
          <Route
            path="/competitions"
            element={
              <AppLayout>
                <Competitions />
              </AppLayout>
            }
          />
          <Route
            path="/competition/:id"
            element={
              <AppLayout>
                <CompetitionDetail />
              </AppLayout>
            }
          />
          <Route
              path="/competition/:cid/problem/:id"
              element={
              <AppLayout>
                  <CompetitionProblemDetail />
              </AppLayout>
          }
          />
          <Route
            path="/competition/:id/ranklist"
            element={
              <AppLayout>
                <CompetitionRanklist />
              </AppLayout>
            }
          />
          <Route
            path="/competition/:id/submissions"
            element={
              <AppLayout>
                <CompetitionSubmissions />
              </AppLayout>
            }
          />
          <Route
            path="/notifications"
            element={
              <AppLayout>
                <Notifications />
              </AppLayout>
            }
          />
          <Route
            path="/notification/:id"
            element={
              <AppLayout>
                <NotificationDetail />
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <Settings />
              </AppLayout>
            }
          />
          <Route
            path="/about"
            element={
              <AppLayout>
                <About />
              </AppLayout>
            }
          />
          <Route
            path="/user/:id"
            element={
              <AppLayout>
                <UserProfile />
              </AppLayout>
            }
          />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
