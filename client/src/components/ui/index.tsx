import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn("animate-spin-slow", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-md bg-surface-overlay animate-pulse-soft", className)} />
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover border-transparent shadow-lg shadow-accent/20",
    secondary: "bg-surface-overlay text-text border-border hover:bg-surface-hover",
    ghost: "bg-transparent text-text-muted border-transparent hover:bg-surface-overlay hover:text-text",
    danger: "bg-danger-muted text-danger border-danger/30 hover:bg-danger/20",
    success: "bg-success-muted text-success border-success/30 hover:bg-success/20",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-sm gap-2",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-150",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className,
  active,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all duration-150",
        active
          ? "bg-accent-muted text-accent"
          : "text-text-muted hover:text-text hover:bg-surface-overlay",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "accent" | "muted";
  className?: string;
}) {
  const variants = {
    default: "bg-surface-overlay text-text-muted border-border",
    success: "bg-success-muted text-success border-success/30",
    warning: "bg-warning-muted text-warning border-warning/30",
    danger: "bg-danger-muted text-danger border-danger/30",
    accent: "bg-accent-muted text-accent border-accent/30",
    muted: "bg-surface-overlay text-text-faint border-border-subtle",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ state }: { state: string }) {
  const config: Record<string, { variant: "success" | "warning" | "danger" | "muted"; label: string }> = {
    running: { variant: "success", label: "Running" },
    exited: { variant: "muted", label: "Stopped" },
    paused: { variant: "warning", label: "Paused" },
    restarting: { variant: "warning", label: "Restarting" },
    dead: { variant: "danger", label: "Dead" },
  };
  const { variant, label } = config[state] ?? { variant: "muted" as const, label: state };

  return (
    <Badge variant={variant}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
        variant === "danger" && "bg-danger",
        variant === "muted" && "bg-text-faint",
      )} />
      {label}
    </Badge>
  );
}

export function Alert({
  children,
  variant = "info",
  onDismiss,
  className,
}: {
  children: ReactNode;
  variant?: "info" | "success" | "danger" | "warning";
  onDismiss?: () => void;
  className?: string;
}) {
  const styles = {
    info: "bg-info-muted border-info/30 text-info",
    success: "bg-success-muted border-success/30 text-success",
    danger: "bg-danger-muted border-danger/30 text-danger",
    warning: "bg-warning-muted border-warning/30 text-warning",
  };

  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 py-3 text-sm rounded-xl border animate-fade-in", styles[variant], className)}>
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-xs">✕</button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-surface-overlay border border-border flex items-center justify-center text-text-muted mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {description && <p className="mt-1.5 text-xs text-text-muted max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-accent-muted border border-accent/20 flex items-center justify-center text-accent shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-overlay border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
        <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Card({
  children,
  className,
  hover,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-surface-raised",
        hover && "hover:border-accent/30 hover:bg-surface-overlay cursor-pointer transition-all duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  loading,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-4 gradient-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
          )}
          {trend && <p className="text-[11px] text-text-faint mt-1">{trend}</p>}
        </div>
        <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-border flex items-center justify-center text-text-muted">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-surface-overlay border border-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-4",
          )}
        />
      </button>
      {label && <span className="text-sm text-text-muted">{label}</span>}
    </label>
  );
}

export function DetailRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border-subtle last:border-0">
      <span className="text-xs text-text-muted shrink-0">{label}</span>
      <span className={cn("text-xs text-text text-right break-all", mono && "font-mono")}>{value}</span>
    </div>
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
      <Spinner size={24} className="text-accent" />
      {message && <p className="text-xs text-text-muted">{message}</p>}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="w-2 h-2 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
