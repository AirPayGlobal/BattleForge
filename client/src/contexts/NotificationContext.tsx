import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import api from "../lib/api";
import { Notification } from "../lib/types";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { player } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem("bf_token")) return;
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (player) {
      fetchNotifications();
    }
  }, [player, fetchNotifications]);

  // Socket.io connection for real-time notifications
  useEffect(() => {
    if (!player) return;

    const s = io("/notifications", {
      auth: { playerId: player.id },
      transports: ["websocket", "polling"],
    });

    s.on("notification", (data: { type: string; message: string }) => {
      fetchNotifications();

      // Show toast based on type
      const isPositive = ["DUEL_WON", "WEAPON_WON", "CHALLENGE_ACCEPTED", "GAUNTLET_EARNED"].includes(data.type);
      if (isPositive) {
        toast.success(data.message);
      } else {
        toast(data.message, {
          icon: data.type === "CHALLENGE_RECEIVED" ? "\u2694\uFE0F" : undefined,
        });
      }
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [player, fetchNotifications]);

  const markAllRead = async () => {
    await api.post("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAllRead,
        markRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  return ctx;
}
