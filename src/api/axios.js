import axios from "axios";
import Cookies from "js-cookie";
import auth from "../utils/auth";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // send cookies for refresh token
});

// attach access token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// response interceptor to refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalReq = err.config;
    if (err.response && err.response.status === 401 && !originalReq._retry) {
      originalReq._retry = true;
      try {
        // use axios (no interceptors) to call refresh endpoint
        const res = await axios.post("http://localhost:5000/api/auth/refresh", {}, { withCredentials: true });
        const newToken = res.data.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          originalReq.headers["Authorization"] = `Bearer ${newToken}`;
          return api(originalReq);
        }
      } catch (refreshErr) {
        console.error("Refresh failed", refreshErr);
        auth.clearAuth();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
