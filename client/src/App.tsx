import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ArsenalPage from "./pages/ArsenalPage";
import ForgePage from "./pages/ForgePage";
import ArenaPage from "./pages/ArenaPage";
import DuelLobbyPage from "./pages/DuelLobbyPage";
import ArenaDuelPage from "./pages/ArenaDuelPage";
import XPStorePage from "./pages/XPStorePage";
import QuestChainPage from "./pages/QuestChainPage";
import TournamentPage from "./pages/TournamentPage";
import BattlePassPage from "./pages/BattlePassPage";
import ForgeRoomPage from "./pages/ForgeRoomPage";
import PublicWeaponPage from "./pages/PublicWeaponPage";
import Layout from "./components/Layout";

export default function App() {
  const { player, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={player ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={player ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/arsenal" element={<ArsenalPage />} />
        <Route path="/forge" element={<ForgePage />} />
        <Route path="/arena" element={<ArenaPage />} />
        <Route path="/arena/duel/:id" element={<DuelLobbyPage />} />
        <Route path="/arena/fight/:id" element={<ArenaDuelPage />} />
        <Route path="/store" element={<XPStorePage />} />
        <Route path="/quest" element={<QuestChainPage />} />
        <Route path="/tournaments" element={<TournamentPage />} />
        <Route path="/battle-pass" element={<BattlePassPage />} />
        <Route path="/forge-room" element={<ForgeRoomPage />} />
      </Route>
      <Route path="/weapon/:id/public" element={<PublicWeaponPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
