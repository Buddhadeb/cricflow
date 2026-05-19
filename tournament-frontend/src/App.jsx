import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PlayerRegisterPage from './pages/player/PlayerRegisterPage';
import PaymentPage from './pages/player/PaymentPage';
import AdminPage from './pages/admin/AdminPage';
import AuctionRoom from './pages/auction/AuctionRoom';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MatchDetail from './pages/matches/MatchDetail';
import ScoringPage from './pages/scoring/ScoringPage';
import PlayerStatsPage from './pages/stats/PlayerStatsPage';
import TournamentsPage from './pages/public/TournamentsPage';
import TournamentDetailPage from './pages/public/TournamentDetailPage';
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import LandingPage from './pages/public/LandingPage';
import EditProfilePage from './pages/profile/EditProfilePage';
import TeamCaptainPage from './pages/team/TeamCaptainPage';
import ChallengesPage from './pages/challenges/ChallengesPage';
import ChallengeDetailPage from './pages/challenges/ChallengeDetailPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Just requires login — no role check
function PrivateRoute({ children }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/tournaments" replace />;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* All logged-in users can access everything */}
          <Route path="/player/register" element={<PrivateRoute><PlayerRegisterPage /></PrivateRoute>} />
          <Route path="/player/payment"  element={<PrivateRoute><PaymentPage /></PrivateRoute>} />

          <Route path="/matches/:matchId"     element={<PrivateRoute><MatchDetail /></PrivateRoute>} />

          <Route path="/auction" element={<PrivateRoute><AuctionRoom /></PrivateRoute>} />
          <Route path="/owner"   element={<PrivateRoute><OwnerDashboard /></PrivateRoute>} />

          <Route path="/scoring/:matchId" element={<PrivateRoute><ScoringPage /></PrivateRoute>} />

          <Route path="/stats/players/:playerId"     element={<PrivateRoute><PlayerStatsPage /></PrivateRoute>} />

          <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />

          <Route path="/tournaments"     element={<PrivateRoute><TournamentsPage /></PrivateRoute>} />
          <Route path="/tournaments/:id" element={<PrivateRoute><TournamentDetailPage /></PrivateRoute>} />
          <Route path="/organizer"       element={<PrivateRoute><OrganizerDashboard /></PrivateRoute>} />
          <Route path="/profile"         element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
          <Route path="/my-team"         element={<PrivateRoute><TeamCaptainPage /></PrivateRoute>} />
          <Route path="/challenges"     element={<PrivateRoute><ChallengesPage /></PrivateRoute>} />
          <Route path="/challenges/:id" element={<PrivateRoute><ChallengeDetailPage /></PrivateRoute>} />

          <Route path="/"  element={<LandingPage />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
