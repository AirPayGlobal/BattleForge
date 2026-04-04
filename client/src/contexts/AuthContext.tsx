import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api from "../lib/api";
import { Player } from "../lib/types";

interface AuthContextType {
  player: Player | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("bf_token")
  );
  const [loading, setLoading] = useState(true);

  const refreshPlayer = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setPlayer(data);
    } catch {
      localStorage.removeItem("bf_token");
      setToken(null);
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshPlayer();
  }, [refreshPlayer]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("bf_token", data.token);
    setToken(data.token);
    setPlayer(data.player);
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    const { data } = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    localStorage.setItem("bf_token", data.token);
    setToken(data.token);
    setPlayer(data.player);
  };

  const logout = () => {
    localStorage.removeItem("bf_token");
    setToken(null);
    setPlayer(null);
  };

  return (
    <AuthContext.Provider
      value={{ player, token, loading, login, register, logout, refreshPlayer }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
