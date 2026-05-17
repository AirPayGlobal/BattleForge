import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

const navItems = [
  { to: "/arena", label: "Arena" },
  { to: "/leaderboard", label: "Ranks" },
  { to: "/forge", label: "Forge" },
  { to: "/arsenal", label: "Arsenal" },
  { to: "/character", label: "My Character" },
  { to: "/store/cosmetics", label: "Cosmetic Store" },
  { to: "/quest", label: "Quest" },
  { to: "/forge-room", label: "Mint" },
  { to: "/store", label: "Store" },
  { to: "/battle-pass", label: "Pass" },
];

export default function Header({
  onNotifClick,
}: {
  onNotifClick: () => void;
}) {
  const { player, logout } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header className="border-b border-card-border bg-card-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="font-display text-3xl text-arc-cyan tracking-wide">
              BATTLEFORGE
            </span>
          </NavLink>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `font-ui font-bold uppercase tracking-[0.1em] px-3 py-2 text-xs transition-colors border-b-2 whitespace-nowrap ${
                    isActive
                      ? "text-arc-cyan border-arc-cyan"
                      : "text-secondary-text border-transparent hover:text-primary-text"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* XP */}
            <div className="hidden sm:flex items-center">
              <span className="text-storm-gold font-ui font-bold text-sm">
                {player?.xp?.toLocaleString()} XP
              </span>
            </div>

            {/* Bell */}
            <button
              onClick={onNotifClick}
              className="relative p-2 text-secondary-text hover:text-primary-text transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-danger-red text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Username + Logout */}
            <div className="flex items-center gap-2">
              <span className="font-ui text-sm text-primary-text font-semibold hidden sm:block">
                {player?.username}
              </span>
              <button
                onClick={logout}
                className="text-xs font-ui uppercase tracking-wider text-secondary-text hover:text-danger-red transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
