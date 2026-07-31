export type Role = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "STUDENT";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: Role;
  schoolId: string | null;
};

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

export const saveSession = (token: string, user: SessionUser): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem("token");
  window.localStorage.removeItem(USER_KEY);
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem("token");
};

export const getUser = (): SessionUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
};

export const roleHomePath = (role: Role): string => {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "SCHOOL_ADMIN":
      return "/dashboard";
    case "STUDENT":
      return "/student";
    default:
      return "/login";
  }
};
