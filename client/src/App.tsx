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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
