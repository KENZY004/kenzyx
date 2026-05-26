import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("kenyx-auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      }
    } catch {}
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (data: { username: string; email: string; password: string }) =>
    api.post("/auth/signup", data).then((r) => r.data.data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data).then((r) => r.data.data),
  
  loginGoogle: (credential: string) =>
    api.post("/auth/google", { credential }).then((r) => r.data.data),
};

// ─── Problems ─────────────────────────────────────────────────────────────────

export const problemsApi = {
  list: (params: {
    difficulty?: string;
    tag?: string;
    page?: number;
    page_size?: number;
    status?: string;
  }) => api.get("/problems", { params }).then((r) => r.data.data),

  get: (slug: string) =>
    api.get(`/problems/${slug}`).then((r) => r.data.data),

  daily: () =>
    api.get("/problems/daily").then((r) => r.data.data),

  trending: (limit = 6) =>
    api.get("/problems/trending", { params: { limit } }).then((r) => r.data.data),

  create: (data: unknown) =>
    api.post("/problems", data).then((r) => r.data.data),

  update: (slug: string, data: unknown) =>
    api.put(`/problems/${slug}`, data).then((r) => r.data.data),

  delete: (slug: string) =>
    api.delete(`/problems/${slug}`).then((r) => r.data.data),

  like: (slug: string) =>
    api.post(`/problems/${slug}/like`).then((r) => r.data.data),

  rate: (slug: string, rating: number) =>
    api.post(`/problems/${slug}/rate`, { rating }).then((r) => r.data.data),

  getStats: (slug: string) =>
    api.get(`/problems/${slug}/stats`).then((r) => r.data.data),
};

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissionsApi = {
  submit: (slug: string, data: { language: string; code: string; battle_id?: string }) =>
    api.post(`/problems/${slug}/submit`, data).then((r) => r.data.data),

  run: (slug: string, data: { language: string; code: string }) =>
    api.post(`/problems/${slug}/run`, data).then((r) => r.data.data),

  get: (id: string) =>
    api.get(`/submissions/${id}`).then((r) => r.data.data),

  getStatus: (id: string) =>
    api.get(`/submissions/${id}/status`).then((r) => r.data.data),

  getForProblem: (slug: string) =>
    api.get(`/problems/${slug}/submissions`).then((r) => r.data.data),

  getAll: () =>
    api.get(`/me/submissions`).then((r) => r.data.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () =>
    api.get("/me").then((r) => r.data.data),

  updateMe: (data: { bio?: string; avatar_url?: string }) =>
    api.put("/me", data).then((r) => r.data.data),

  myStats: () =>
    api.get("/me/stats").then((r) => r.data.data),

  myActivity: () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return api.get("/me/activity", { params: { tz } }).then((r) => r.data.data);
  },

  myCreatedProblems: () =>
    api.get("/me/problems").then((r) => r.data.data),

  profile: (username: string) =>
    api.get(`/users/${username}`).then((r) => r.data.data),

  notifications: () =>
    api.get("/me/notifications").then((r) => r.data.data),

  markNotificationRead: (id: string) =>
    api.post(`/me/notifications/${id}/read`).then((r) => r.data.data),

  markAllNotificationsRead: () =>
    api.post("/me/notifications/read-all").then((r) => r.data.data),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const leaderboardApi = {
  get: (limit = 50) =>
    api.get("/leaderboard", { params: { limit } }).then((r) => r.data.data),
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tagsApi = {
  list: () =>
    api.get("/tags").then((r) => r.data.data),
};

// ─── Battles ─────────────────────────────────────────────────────────────────

export const battlesApi = {
  create: (problem_id?: string) =>
    api.post("/battles", { problem_id }).then((r) => r.data.data),

  join: (id: string) =>
    api.post(`/battles/${id}/join`).then((r) => r.data.data),

  active: () =>
    api.get("/battles/active").then((r) => r.data.data),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  pending: () =>
    api.get("/admin/problems/pending").then((r) => r.data.data),

  approve: (slug: string) =>
    api.post(`/admin/problems/${slug}/approve`).then((r) => r.data.data),

  reject: (slug: string, note: string) =>
    api.post(`/admin/problems/${slug}/reject`, { note }).then((r) => r.data.data),

  stats: () =>
    api.get("/admin/stats").then((r) => r.data.data),

  users: () =>
    api.get("/admin/users").then((r) => r.data.data),

  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data.data),

  updateUserRole: (id: string, role: "user" | "admin") =>
    api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data.data),

  banUser: (id: string, banned: boolean) =>
    api.patch(`/admin/users/${id}/ban`, { banned }).then((r) => r.data.data),
};
