import { Route, Routes } from 'react-router-dom';
import RootLayout from './layout';
import HomePage from './page';
import LoginPage from './login/page';
import RegisterPage from './register/page';
import ForgotPasswordPage from './forgot-password/page';
import AdminPage from './admin/page';
import ProblemsPage from './problems/page';
import ProblemDetailPage from './problem/[id]/page';
import SubmissionsPage from './submissions/page';
import RanklistPage from './ranklist/page';
import CompetitionsPage from './competitions/page';
import CompetitionDetailPage from './competition/[id]/page';
import CompetitionRanklistPage from './competition/[id]/ranklist/page';
import CompetitionSubmissionsPage from './competition/[id]/submissions/page';
import CompetitionProblemDetailPage from './competition/[cid]/problem/[id]/page';
import PracticesPage from './practices/page';
import PracticeDetailPage from './practice/[id]/page';
import SolutionListPage from './problem/[problemId]/solutions/page';
import SolutionDetailPage from './problem/[problemId]/solutions/[solveId]/page';
import SolutionPublishPage from './problem/[problemId]/solutions/publish/page';
import SolutionsPage from './solutions/page';
import SettingsPage from './settings/page';
import UserProfilePage from './user/[userId]/page';
import FriendsPage from './friends/page';
import NotificationsPage from './notifications/page';
import NotificationDetailPage from './notification/[id]/page';
import AboutPage from './about/page';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/admin/*" element={<AdminPage />} />
      <Route
        path="/*"
        element={
          <RootLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/problems" element={<ProblemsPage />} />
              <Route path="/problem/:id" element={<ProblemDetailPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/ranklist" element={<RanklistPage />} />
              <Route path="/competitions" element={<CompetitionsPage />} />
              <Route path="/competition/:id" element={<CompetitionDetailPage />} />
              <Route path="/competition/:id/ranklist" element={<CompetitionRanklistPage />} />
              <Route path="/competition/:id/submissions" element={<CompetitionSubmissionsPage />} />
              <Route path="/competition/:cid/problem/:id" element={<CompetitionProblemDetailPage />} />
              <Route path="/practices" element={<PracticesPage />} />
              <Route path="/practice/:id" element={<PracticeDetailPage />} />
              <Route path="/problem/:problemId/solutions" element={<SolutionListPage />} />
              <Route path="/problem/:problemId/solutions/:solveId" element={<SolutionDetailPage />} />
              <Route path="/problem/:problemId/solutions/publish" element={<SolutionPublishPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/user/:userId" element={<UserProfilePage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/notification/:id" element={<NotificationDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </RootLayout>
        }
      />
    </Routes>
  );
}
