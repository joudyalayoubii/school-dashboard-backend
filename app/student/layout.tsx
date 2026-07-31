"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GraduationCap, LogOut, AlertTriangle } from "lucide-react";
import { clearSession, getUser } from "@/lib/auth";
import { connectSocket, disconnectSocket, emitJoinSchoolRoom, getSocket, onForceLogout } from "@/lib/socket";
import { Button } from "@/components/ui/button";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [studentName, setStudentName] = useState("Student");
  const [kickedReason, setKickedReason] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "STUDENT") {
      router.replace("/login");
      return;
    }
    setStudentName(user.name);
    setAuthorized(true);

    // The socket is a page-lifetime singleton (see lib/socket.ts) — intentionally NOT
    // disconnected on unmount. Disconnecting here would race the next connect() (e.g. React
    // dev-mode's double effect invocation), and the server's single-session enforcement would
    // then mistake the reconnect for a second device and evict the student's own new session.
    connectSocket();
    if (user.schoolId) {
      emitJoinSchoolRoom(user.schoolId);
    }

    const off = onForceLogout((reason) => {
      setKickedReason(reason);
      clearSession();
      setTimeout(() => router.replace("/login"), 2500);
    });

    return () => {
      off();
    };
  }, [router]);

  const handleLogout = () => {
    disconnectSocket(getSocket());
    clearSession();
    router.push("/login");
  };

  if (kickedReason) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
          <AlertTriangle size={32} className="mx-auto mb-4 text-rose-400" />
          <h1 className="text-xl font-bold text-white mb-2">Signed out</h1>
          <p className="text-sm text-rose-200">{kickedReason}</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-700 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Student Portal</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Welcome, {studentName}</h1>
            </div>
          </div>
          <Button variant="danger" size="sm" icon={<LogOut size={16} />} onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
