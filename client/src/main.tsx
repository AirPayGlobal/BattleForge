import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#111827",
                color: "#E8F4FF",
                border: "1px solid #1A2545",
                fontFamily: "Barlow, sans-serif",
              },
              success: {
                iconTheme: { primary: "#00FF9D", secondary: "#111827" },
              },
              error: {
                iconTheme: { primary: "#FF3D6B", secondary: "#111827" },
              },
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
