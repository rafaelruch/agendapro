import TailAdminButton from "./Button";
import { ReactNode, ButtonHTMLAttributes } from "react";

// Wrapper para compatibilidade Shadcn -> TailAdmin
interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  children: ReactNode;
  size?: "default" | "sm" | "lg" | "icon" | "md";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "primary";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  asChild?: boolean; // Shadcn prop (ignorado)
}

export const Button: React.FC<ButtonProps> = ({
  children,
  size = "default",
  variant = "default",
  startIcon,
  endIcon,
  disabled = false,
  className = "",
  type = "button",
  onClick,
  asChild,
  ...props
}) => {
  // Map Shadcn variants to TailAdmin variants
  const tailadminVariant: "primary" | "outline" = 
    variant === "outline" || variant === "secondary" || variant === "ghost" || variant === "link"
      ? "outline"
      : "primary";

  // Map Shadcn sizes to TailAdmin sizes
  const tailadminSize: "sm" | "md" = 
    size === "sm" || size === "icon" ? "sm" : "md";

  // Handle asChild - if true, just render children (Shadcn pattern)
  if (asChild && typeof children === 'object') {
    return <>{children}</>;
  }

  return (
    <button
      type={type}
      onClick={onClick as any}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition ${className} ${
        tailadminSize === "sm" ? "px-4 py-3 text-sm" : "px-5 py-3.5 text-sm"
      } ${
        tailadminVariant === "primary"
          ? "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
          : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      {...props}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
