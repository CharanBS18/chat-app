import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://red-butterfly-813e.charan-charan3-bs.workers.dev";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

async function withApiFallback(primaryRequest, fallbackRequest) {
  try {
    return await primaryRequest();
  } catch (err) {
    if (err.response?.status === 404 && fallbackRequest) {
      return fallbackRequest();
    }

    throw err;
  }
}

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) =>
    withApiFallback(
      () => api.post("/auth/register", data),
      () => api.post("/api/auth/register", data)
    ),
  login: (data) =>
    withApiFallback(
      () => api.post("/auth/login", data),
      () => api.post("/api/auth/login", data)
    ),
};

export const userAPI = {
  getUsers: () =>
    withApiFallback(
      () => api.get("/users"),
      () => api.get("/api/users")
    ),
  getMe: () =>
    withApiFallback(
      () => api.get("/users/me"),
      () => api.get("/api/users/me")
    ),
};

export const messageAPI = {
  getMessages: (userId) =>
    api.get("/messages", {
      params: {
        userId,
        receiverId: userId,
      },
    }),
  sendMessage: (userId, content) =>
    api.post("/send", {
      userId,
      receiverId: userId,
      content,
    }),
};

export default api;
