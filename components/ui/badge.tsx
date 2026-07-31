import type { ReactNode } from "react";

type BadgeTone = "neutral" | "success" | "info" | "danger" | "warning";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-zinc-700 bg-zinc-800/50 text-zinc-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  info: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

// Purely informational pill — never clickable, never styled like a Button.
// cursor-default + no hover/transition keeps it visually distinct from actions.
export function Badge({
  children,
  tone = "neutral",
  icon,
  pulse = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex cursor-default items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {icon}
      {children}
    </span>
  );
}
