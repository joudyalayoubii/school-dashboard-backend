"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: any;
};

// Shared responsive shell used by every authenticated section (SCHOOL_ADMIN dashboard,
// SUPER_ADMIN console) so navigating between them feels like one app, not separate pages.
// Desktop: fixed sidebar. Mobile: compact identity bar + horizontal-scroll nav strip,
// so the user sees real page content immediately instead of scrolling past a full-height sidebar.
export function AppShell({
  brandIcon,
  identityLabel,
  identityValue,
  subLabel,
  subValue,
  nav,
  extraNav,
  onLogout,
  children,
}: {
  brandIcon: ReactNode;
  identityLabel: string;
  identityValue: string;
  subLabel: string;
  subValue: string;
  nav: NavItem[];
  extraNav?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:w-80 lg:flex-col lg:border-r lg:border-zinc-800 lg:bg-zinc-900/95 lg:p-6">
          <SidebarContent
            brandIcon={brandIcon}
            identityLabel={identityLabel}
            identityValue={identityValue}
            subLabel={subLabel}
            subValue={subValue}
            nav={nav}
            extraNav={extraNav}
            onLogout={onLogout}
            pathname={pathname}
          />
        </aside>

        {/* Mobile compact bar */}
        <div className="sticky top-0 z-40 flex flex-col border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-400">
                {brandIcon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white leading-tight">{identityValue}</p>
                <p className="truncate text-xs text-zinc-500 leading-tight">{subValue}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
          {(nav.length > 0 || extraNav) && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {extraNav}
              {nav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500/15 to-violet-500/15 border border-emerald-500/30 text-emerald-300"
                        : "border border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-10 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  brandIcon,
  identityLabel,
  identityValue,
  subLabel,
  subValue,
  nav,
  extraNav,
  onLogout,
  pathname,
}: {
  brandIcon: ReactNode;
  identityLabel: string;
  identityValue: string;
  subLabel: string;
  subValue: string;
  nav: NavItem[];
  extraNav?: ReactNode;
  onLogout: () => void;
  pathname: string;
}) {
  return (
    <>
      <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-xl shadow-zinc-950/50">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400">{brandIcon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{identityLabel}</p>
          <p className="truncate font-semibold text-white text-lg">{identityValue}</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl shadow-zinc-950/50">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-3">{subLabel}</p>
        <h2 className="truncate text-xl font-bold text-white">{subValue}</h2>
      </div>

      {(nav.length > 0 || extraNav) && (
        <nav className="mt-8 space-y-2">
          {extraNav}
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-4 rounded-xl px-5 py-4 text-sm font-semibold transition-all duration-300 border ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 to-violet-500/15 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/10"
                    : "border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-white hover:border-zinc-700"
                }`}
              >
                <Icon size={20} className={`transition-colors ${isActive ? "text-emerald-400" : "group-hover:text-violet-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="mt-auto pt-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl shadow-zinc-950/50">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-3">Quick Actions</p>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 text-sm font-semibold text-rose-400 hover:text-rose-300 transition-colors group"
          >
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 group-hover:bg-rose-500/20 transition-colors">
              <LogOut size={18} />
            </div>
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
