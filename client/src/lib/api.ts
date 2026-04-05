import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach the current Supabase access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bf_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

// On 401: attempt one silent token refresh using the stored refresh_token,
// then replay the original request. If refresh also fails, redirect to /login.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retried && !isRefreshing) {
      const refreshToken = localStorage.getItem("bf_refresh_token");

      if (refreshToken) {
        originalRequest._retried = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post("/api/auth/refresh", { refreshToken });
          localStorage.setItem("bf_token", data.token);
          localStorage.setItem("bf_refresh_token", data.refreshToken ?? "");
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — clear everything and bounce to login
          localStorage.removeItem("bf_token");
          localStorage.removeItem("bf_refresh_token");
        } finally {
          isRefreshing = false;
        }
      }

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);

export default api;
