import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../contexts/NotificationContext";

const TYPE_COLORS: Record<string, string> = {
  CHALLENGE_RECEIVED: "#00E5FF",
  CHALLENGE_ACCEPTED: "#00FF9D",
  CHALLENGE_DECLINED: "#3A5080",
  DUEL_WON: "#00FF9D",
  DUEL_LOST: "#FF3D6B",
  WEAPON_WON: "#FFD600",
  WEAPON_LOST: "#FF3D6B",
  GAUNTLET_ISSUED: "#7B2FFF",
  GAUNTLET_EARNED: "#FFD600",
  QUEST_PROGRESS: "#00E5FF",
  SYSTEM: "#3A5080",
};

export default function NotificationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-card-surface border-l border-card-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-card-border">
              <h2 className="font-display text-xl text-primary-text">
                NOTIFICATIONS
              </h2>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-ui uppercase tracking-wider text-arc-cyan hover:text-arc-cyan/80 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-secondary-text hover:text-primary-text transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-secondary-text">
                  <svg
                    className="w-12 h-12 mb-3 opacity-30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <p className="font-ui text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b border-card-border transition-colors ${
                      notif.read ? "opacity-60" : "bg-deep-navy/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                        style={{
                          backgroundColor:
                            TYPE_COLORS[notif.type] || "#3A5080",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary-text leading-snug">
                          {notif.message}
                        </p>
                        <p className="text-xs text-secondary-text mt-1">
                          {new Date(notif.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
