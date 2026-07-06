import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token") ?? window.localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
