"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, LayoutDashboard, LogOut, School, Users } from "lucide-react";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Manage Students", icon: Users },
  { href: "/dashboard/lessons", label: "Lesson & Quiz Control", icon: BookOpen },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Northview School",
    address: "Mansoura, Egypt",
    adminName: "Ava Thompson",
  });

  useEffect(() => {
    const storedSchool = window.localStorage.getItem("schoolAdminProfile");
    if (storedSchool) {
      try {
        const parsed = JSON.parse(storedSchool);
        setSchoolInfo({
          name: parsed.schoolName ?? schoolInfo.name,
          address: parsed.schoolAddress ?? schoolInfo.address,
          adminName: parsed.adminName ?? schoolInfo.adminName,
        });
      } catch {
        // ignore malformed storage payload
      }
    }
  }, []);

  const activeLabel = useMemo(() => navigation.find((item) => item.href === pathname)?.label ?? "Overview", [pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-900/80 p-6 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="rounded-xl bg-emerald-500/20 p-3 text-emerald-300">
              <School size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Signed in as</p>
              <p className="font-semibold text-white">{schoolInfo.adminName}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">School profile</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{schoolInfo.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{schoolInfo.address}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? "bg-emerald-500/15 text-emerald-300" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">Quick note</p>
            <p className="mt-2 text-sm text-slate-200">Keep lesson access aligned with live quiz availability for smoother classroom flow.</p>
            <button className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-300">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-emerald-400">School Admin</p>
              <h1 className="text-3xl font-semibold text-white">{activeLabel}</h1>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              {schoolInfo.name} · Live operations ready
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
