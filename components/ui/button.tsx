import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 focus-visible:ring-brand-500",
  secondary:
    "bg-slate-900 text-white shadow-md shadow-slate-900/20 hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-slate-900",
  outline:
    "border border-canvas-border bg-canvas-panel text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300",
  danger:
    "bg-risk-critical text-white shadow-md shadow-red-500/25 hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-red-500",
  success:
    "bg-risk-low text-white shadow-md shadow-green-500/25 hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-green-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
