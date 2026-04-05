import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import { Player } from "../lib/types";

interface AuthContextType {
  player: Player | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPlayer = useCallback(async () => {
    const token = localStorage.getItem("bf_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setPlayer(data);
    } catch {
      // Token is invalid or expired — clear everything
      localStorage.removeItem("bf_token");
      localStorage.removeItem("bf_refresh_token");
      await supabase.auth.signOut();
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // On mount, restore session state from Supabase's persisted session.
    // This fires synchronously if a session is already stored in localStorage.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          // Keep our bf_token key in sync — api.ts reads from there
          localStorage.setItem("bf_token", session.access_token);
          localStorage.setItem("bf_refresh_token", session.refresh_token ?? "");
        } else if (_event === "SIGNED_OUT") {
          localStorage.removeItem("bf_token");
          localStorage.removeItem("bf_refresh_token");
          setPlayer(null);
          setLoading(false);
        }
      }
    );

    refreshPlayer();

    return () => { subscription.unsubscribe(); };
  }, [refreshPlayer]);

  const login = async (email: string, password: string) => {
    // Route through our server so we can return the Player profile in one round-trip
    const { data } = await api.post("/auth/login", { email, password });

    // Store tokens and sync the Supabase client so auto-refresh kicks in
    localStorage.setItem("bf_token", data.token);
    localStorage.setItem("bf_refresh_token", data.refreshToken ?? "");
    await supabase.auth.setSession({
      access_token: data.token,
      refresh_token: data.refreshToken,
    });

    setPlayer(data.player);
  };

  const register = async (username: string, email: string, password: string) => {
    const { data } = await api.post("/auth/register", { username, email, password });

    if (data.token) {
      localStorage.setItem("bf_token", data.token);
      localStorage.setItem("bf_refresh_token", data.refreshToken ?? "");
      await supabase.auth.setSession({
        access_token: data.token,
        refresh_token: data.refreshToken,
      });
    }

    setPlayer(data.player);
  };

  const logout = async () => {
    localStorage.removeItem("bf_token");
    localStorage.removeItem("bf_refresh_token");
    await supabase.auth.signOut(); // invalidates session on Supabase side
    setPlayer(null);
  };

  return (
    <AuthContext.Provider value={{ player, loading, login, register, logout, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
