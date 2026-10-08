import api from "./api";

export interface LoginPayload {
  email: string;
  password?: string;
}

export const authService = {
  login: async (
    credentialsOrEmail: string | LoginPayload,
    maybePassword?: string,
  ) => {
    let email = "";
    let password = "";

    if (typeof credentialsOrEmail === "string") {
      email = credentialsOrEmail;
      password = maybePassword || "";
    } else if (credentialsOrEmail && typeof credentialsOrEmail === "object") {
      email = credentialsOrEmail.email;
      password = credentialsOrEmail.password || "";
    }

    const response = await api.post("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });

    const data = response.data?.data || response.data;
    const token = data.accessToken || data.token;
    const user = data.user;

    if (token) {
      localStorage.setItem("accessToken", token);
      localStorage.setItem("token", token);
    }
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    return { token, user, data };
  },

  logout: async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
    } finally {
      localStorage.clear();
      window.location.href = "/login";
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  getRoster: async () => {
    const res = await api.get("/auth/roster");
    return res.data?.data || res.data || [];
  },
};

export default authService;
