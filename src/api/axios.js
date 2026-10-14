import axios from "axios";
import Cookies from "js-cookie";
import auth from "../utils/auth";
import { mockBoards, mockGrades, mockSubjects, mockChapters } from "./mockData";

// Use same-origin relative /api so requests hit the local integrated backend instead of the external repo
const rawApiUrl = import.meta.env.VITE_API_URL || "";
const BASE_URL = rawApiUrl.includes("abhyasa-backend.onrender.com") ? "" : rawApiUrl;

let chaptersStore = [...mockChapters];

function handleMockRequest(config) {
  const url = (config.url || "").replace(/^\/?api\/?/, "/").replace(/^\/?/, "/");
  const method = (config.method || "get").toLowerCase();
  const params = config.params || {};
  let body = {};
  if (typeof config.data === "string") {
    try { body = JSON.parse(config.data); } catch { body = {}; }
  } else if (config.data) {
    body = config.data;
  }

  // Handle /boards
  if (url === "/boards" && method === "get") {
    return { data: mockBoards, status: 200 };
  }

  // Handle /grades
  if (url === "/grades" && method === "get") {
    let result = mockGrades;
    if (params.board) {
      result = result.filter(g => g.board === params.board);
    }
    return { data: result, status: 200 };
  }

  // Handle /subjects
  if (url === "/subjects" && method === "get") {
    let result = mockSubjects;
    if (params.board) {
      result = result.filter(s => s.board === params.board);
    }
    if (params.grade) {
      result = result.filter(s => Number(s.grade) === Number(params.grade));
    }
    return { data: result, status: 200 };
  }

  // Handle /subjects/:id/chapters
  const subjChaptersMatch = url.match(/^\/subjects\/([^/]+)\/chapters$/);
  if (subjChaptersMatch && method === "get") {
    const subjId = subjChaptersMatch[1];
    let chs = chaptersStore.filter(c => c.subject === subjId);
    if (chs.length === 0) {
      chs = chaptersStore;
    }
    return { data: chs, status: 200 };
  }

  // Handle /chapters/:id
  const chapterMatch = url.match(/^\/chapters\/([^/]+)$/);
  if (chapterMatch && method === "get") {
    const chId = chapterMatch[1];
    const found = chaptersStore.find(c => c._id === chId) || chaptersStore[0];
    return { data: found, status: 200 };
  }

  // Handle /chapters/:id/questions (POST)
  const chapterQuestionMatch = url.match(/^\/chapters\/([^/]+)\/questions$/);
  if (chapterQuestionMatch && method === "post") {
    const chId = chapterQuestionMatch[1];
    const newQ = {
      _id: `q_${Date.now()}`,
      question: body.question,
      options: body.options || [],
      answer: body.answer ?? 0,
      reason: body.reason || "",
      explanationVideoUrl: body.explanationVideoUrl || ""
    };
    chaptersStore = chaptersStore.map(c => {
      if (c._id === chId) {
        return {
          ...c,
          contentPreview: [...(c.contentPreview || []), newQ]
        };
      }
      return c;
    });
    return { data: { success: true, question: newQ }, status: 201 };
  }

  // Handle /contact
  if (url === "/contact" && method === "post") {
    return { data: { success: true, message: "Inquiry received" }, status: 200 };
  }

  // Handle /auth/login
  if (url === "/auth/login" && method === "post") {
    const role = (body.email && body.email.includes("admin")) ? "admin" : "student";
    const payload = btoa(JSON.stringify({ role, email: body.email || "student@abhyasa.com", name: body.name || "Student" }));
    const mockToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.mock_signature`;
    return {
      data: {
        token: mockToken,
        user: { name: body.name || "Student", email: body.email, role }
      },
      status: 200
    };
  }

  // Handle /auth/register
  if (url === "/auth/register" && method === "post") {
    const role = (body.email && body.email.includes("admin")) ? "admin" : "student";
    const payload = btoa(JSON.stringify({ role, email: body.email || "student@abhyasa.com", name: body.name || "Student" }));
    const mockToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.mock_signature`;
    return {
      data: {
        token: mockToken,
        user: { name: body.name || "Student", email: body.email, role }
      },
      status: 200
    };
  }

  // Handle /auth/refresh
  if (url === "/auth/refresh" && method === "post") {
    const payload = btoa(JSON.stringify({ role: "student", name: "Student" }));
    return { data: { token: `eyJhbGciOiJIUzI1NiJ9.${payload}.mock_sig` }, status: 200 };
  }

  // Handle /auth/forgot-password
  if (url === "/auth/forgot-password" && method === "post") {
    return { data: { success: true, message: "OTP sent to email" }, status: 200 };
  }

  // Handle /auth/verify-otp
  if (url === "/auth/verify-otp" && method === "post") {
    return { data: { success: true, message: "Password updated successfully" }, status: 200 };
  }

  // Handle /auth/logout
  if (url === "/auth/logout" && method === "post") {
    return { data: { success: true }, status: 200 };
  }

  // Handle /payment/create-order
  if (url === "/payment/create-order" && method === "post") {
    return {
      data: {
        orderId: `order_${Date.now()}`,
        amount: 9900,
        currency: "INR",
        keyId: "rzp_test_mock"
      },
      status: 200
    };
  }

  // Handle /payment/verify
  if (url === "/payment/verify" && method === "post") {
    return { data: { success: true, message: "Payment verified successfully" }, status: 200 };
  }

  // Default empty fallback
  return { data: url.endsWith("s") ? [] : {}, status: 200 };
}

const api = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : "/api",
  withCredentials: true, // send cookies for refresh token
});

// attach access token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// response interceptor with mock fallback when backend is unreachable
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalReq = err.config;

    // If 401 on protected requests (not auth routes), attempt refresh token
    const isAuthRoute = originalReq?.url?.includes("/auth/");
    if (err.response && err.response.status === 401 && !originalReq._retry && !isAuthRoute) {
      originalReq._retry = true;
      try {
        const refreshEndpoint = BASE_URL ? `${BASE_URL}/api/auth/refresh` : "/api/auth/refresh";
        const res = await axios.post(refreshEndpoint, {}, { withCredentials: true });
        const newToken = res.data.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          originalReq.headers["Authorization"] = `Bearer ${newToken}`;
          return api(originalReq);
        }
      } catch (refreshErr) {
        console.warn("Token refresh failed", refreshErr);
        auth.clearAuth();
        return Promise.reject(refreshErr);
      }
    }

    // If backend is offline or network error, provide mock fallback
    const isNetworkError = !err.response || err.code === "ERR_NETWORK" || err.code === "ECONNABORTED" || err.message?.includes("Network Error");
    if (isNetworkError && originalReq) {
      console.warn(`[Abhyasa] Backend offline at ${BASE_URL} — responding with mock fallback for ${originalReq.url}`);
      const mockRes = handleMockRequest(originalReq);
      return Promise.resolve({
        data: mockRes.data,
        status: mockRes.status,
        statusText: "OK",
        headers: {},
        config: originalReq,
      });
    }

    return Promise.reject(err);
  }
);

export default api;
