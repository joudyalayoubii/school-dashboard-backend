"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, BookOpen, LayoutDashboard, School, Users } from "lucide-react";
import api from "@/lib/api";
import { clearSession, getUser } from "@/lib/auth";
import { SchoolIdProvider } from "@/lib/school-context";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { AppShell, type NavItem } from "@/components/ui/app-shell";

const navigation: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Manage Students", icon: Users },
  { href: "/dashboard/lessons", label: "Lesson & Quiz Control", icon: BookOpen },
];

type SchoolDetails = {
  name: string;
  studentCount: number;
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [effectiveSchoolId, setEffectiveSchoolId] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState({
    name: "School",
    adminName: "Admin",
  });

  const impersonatedSchoolId = searchParams.get("schoolId");

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== "SCHOOL_ADMIN" && user.role !== "SUPER_ADMIN")) {
      router.replace("/login");
      return;
    }

    if (user.role === "SUPER_ADMIN" && !impersonatedSchoolId) {
      router.replace("/super-admin");
      return;
    }

    const targetSchoolId = user.role === "SUPER_ADMIN" ? impersonatedSchoolId : user.schoolId;
    setIsSuperAdmin(user.role === "SUPER_ADMIN");
    setEffectiveSchoolId(targetSchoolId);
    setSchoolInfo((current) => ({ ...current, adminName: user.name }));
    setAuthorized(true);

    const loadSchoolDetails = async () => {
      try {
        const response = await api.get<{ details: SchoolDetails }>("/schools/details", {
          params: user.role === "SUPER_ADMIN" ? { schoolId: targetSchoolId } : undefined,
        });
        if (response.data?.details) {
          setSchoolInfo((current) => ({ ...current, name: response.data.details.name }));
        }
      } catch (error) {
        console.error("Failed to load school details:", error);
      }
    };

    void loadSchoolDetails();
  }, [router, impersonatedSchoolId]);

  const withSchoolQuery = (href: string) =>
    isSuperAdmin && effectiveSchoolId ? `${href}?schoolId=${effectiveSchoolId}` : href;

  const handleLogout = () => {
    disconnectSocket(getSocket());
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

  const nav = navigation.map((item) => ({ ...item, href: withSchoolQuery(item.href) }));

  return (
    <AppShell
      brandIcon={<School size={24} />}
      identityLabel="Signed in as"
      identityValue={schoolInfo.adminName}
      subLabel="School Profile"
      subValue={schoolInfo.name}
      nav={nav}
      extraNav={
        isSuperAdmin ? (
          <Link
            href="/super-admin"
            className="flex shrink-0 items-center gap-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-4 text-sm font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors lg:mb-2 lg:w-full"
          >
            <ArrowLeft size={20} />
            Back to All Schools
          </Link>
        ) : undefined
      }
      onLogout={handleLogout}
    >
      <SchoolIdProvider value={isSuperAdmin ? effectiveSchoolId : null}>{children}</SchoolIdProvider>
    </AppShell>
  );
}
