import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { AppLayout } from "./components/Layout";
import { PermissionProvider } from "./contexts/PermissionContext";
import { MessageWebSocketProvider } from "./contexts/MessageWebSocketContext";
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
  Admin,
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
  Friends,
} from "./pages";

function App() {
  return (
    <PermissionProvider>
      <MessageWebSocketProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
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
            success: {
              duration: 2000,
              iconTheme: { primary: '#34a853', secondary: '#fff' },
              style: { background: '#fff', color: '#1f1f1f' },
            },
            error: {
              duration: 3000,
              iconTheme: { primary: '#d93025', secondary: '#fff' },
              style: { background: '#fff', color: '#1f1f1f' },
            },
            loading: {
              iconTheme: { primary: '#1a73e8', secondary: '#fff' },
            },
          }}
        />
        <Router>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route path="/forgot-password" element={<Navigate to="/" replace />} />
            <Route path="/vnollx" element={<VnollxHome />} />

            {/* 管理后台 - 独立布局，不使用全局导航 */}
            <Route path="/admin/*" element={<Admin />} />

            {/* 主布局页面 */}
            <Route
              path="/*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Home />} />

                    <Route path="/problems" element={<Problems />} />
                    <Route path="/problem/:id" element={<ProblemDetail />} />

                    <Route path="/submissions" element={<Submissions />} />

                    <Route path="/ranklist" element={<Ranklist />} />

                    <Route path="/competitions" element={<Competitions />} />
                    <Route path="/competition/:id" element={<CompetitionDetail />} />
                    <Route path="/competition/:id/ranklist" element={<CompetitionRanklist />} />
                    <Route path="/competition/:id/submissions" element={<CompetitionSubmissions />} />
                    <Route path="/competition/:cid/problem/:id" element={<CompetitionProblemDetail />} />

                    <Route path="/practices" element={<Practices />} />
                    <Route path="/practice/:id" element={<PracticeDetail />} />

                    <Route path="/problem/:problemId/solutions" element={<SolutionListPage />} />
                    <Route path="/problem/:problemId/solutions/:solveId" element={<SolutionDetailPage />} />
                    <Route path="/problem/:problemId/solutions/publish" element={<SolutionPublishPage />} />
                    <Route path="/solutions" element={<Solutions />} />

                    <Route path="/settings" element={<Settings />} />
                    <Route path="/user/:userId" element={<UserProfile />} />
                    <Route path="/friends" element={<Friends />} />

                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/notification/:id" element={<NotificationDetail />} />

                    <Route path="/about" element={<About />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Routes>
        </Router>
      </MessageWebSocketProvider>
    </PermissionProvider>
  );
}

export default App;
