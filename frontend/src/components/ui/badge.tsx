import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "critical" | "urgent" | "success" | "warning";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className,
  ...props
}) => {
  const variantStyles = {
    default: "bg-teal-100 text-teal-800 border-teal-200",
    secondary: "bg-slate-100 text-slate-800 border-slate-200",
    outline: "border-slate-300 text-slate-700",
    critical: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-bold",
    urgent: "bg-amber-100 text-amber-800 border-amber-200 font-semibold",
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
