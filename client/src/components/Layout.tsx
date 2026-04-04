import { Outlet } from "react-router-dom";
import Header from "./Header";
import NotificationDrawer from "./NotificationDrawer";
import { useState } from "react";

export default function Layout() {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="min-h-screen bg-deep-navy">
      <Header onNotifClick={() => setNotifOpen(true)} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </div>
  );
}
