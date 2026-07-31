"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser, roleHomePath } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    router.replace(token && user ? roleHomePath(user.role) : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-700 border-t-emerald-500" />
    </div>
  );
}
