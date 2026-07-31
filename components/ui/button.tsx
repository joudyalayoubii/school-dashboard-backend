import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "outline";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400",
  secondary:
    "bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-400 hover:to-violet-500 hover:shadow-lg hover:shadow-violet-500/25 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400",
  danger:
    "bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-400 hover:to-rose-500 hover:shadow-lg hover:shadow-rose-500/25 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400",
  outline:
    "border border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 disabled:text-zinc-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-sm",
};

// Every clickable action in the app should render through this — solid/gradient fill
// so it's never confused with the flat outline+tint Badge used for status pills.
export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  loadingText,
  children,
  className = "",
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:shadow-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText ?? "Working..."}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
