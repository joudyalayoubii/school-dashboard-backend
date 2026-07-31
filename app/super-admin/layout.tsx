"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { clearSession, getUser } from "@/lib/auth";
import { AppShell } from "@/components/ui/app-shell";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [adminName, setAdminName] = useState("Super Admin");

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      router.replace("/login");
      return;
    }
    setAdminName(user.name);
    setAuthorized(true);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-700 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell
      brandIcon={<ShieldCheck size={24} />}
      identityLabel="Signed in as"
      identityValue={adminName}
      subLabel="Access Level"
      subValue="Platform Administration"
      nav={[]}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}
