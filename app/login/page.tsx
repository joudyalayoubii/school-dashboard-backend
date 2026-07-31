"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { School, Lock, Mail, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { saveSession, roleHomePath, type SessionUser } from "@/lib/auth";

type LoginResponse = {
  access_token: string;
  user: SessionUser;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>("/auth/login", { email, password });
      const { access_token, user } = response.data;
      saveSession(access_token, user);
      router.replace(roleHomePath(user.role));
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Invalid email or password";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-8 shadow-2xl shadow-zinc-950/50">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400">
            <School size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">School Dashboard</h1>
          <p className="text-sm text-zinc-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.test"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Password</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-zinc-950 transition-all duration-300 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
