import type { ReactNode } from "react";

// Shared hero header used at the top of every tab page (Overview, Students, Lessons, ...)
// so every section of the app opens with the exact same shape: eyebrow + title + action row.
export function PageHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-6 sm:p-8 shadow-2xl shadow-zinc-950/50">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-2">{eyebrow}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h2>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
