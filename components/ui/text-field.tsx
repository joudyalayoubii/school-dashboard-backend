import type { InputHTMLAttributes } from "react";

// Every text input in the app renders through this: same label style, same input style,
// and autoComplete defaults to "off" so browsers stop suggesting the signed-in admin's own
// saved email/password into student/school forms (autoComplete can still be overridden
// per-field, e.g. the login page wants normal autofill).
export function TextField({
  label,
  className = "",
  autoComplete = "off",
  ...rest
}: {
  label: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</label>
      <input
        autoComplete={autoComplete}
        className={`w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 ${className}`}
        {...rest}
      />
    </div>
  );
}
