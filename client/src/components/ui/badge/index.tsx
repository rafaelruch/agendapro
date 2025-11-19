import TailAdminBadge from "./Badge";
import { ReactNode } from "react";

// Wrapper para compatibilidade Shadcn -> TailAdmin
export interface BadgeProps {
  variant?: "default" | "secondary" | "destructive" | "outline" | "light" | "solid";
  size?: "sm" | "md" | "default";
  color?: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Badge = ({
  variant = "default",
  size = "md",
  color,
  startIcon,
  endIcon,
  children,
  className = "",
}: BadgeProps) => {
  // Map Shadcn variants to TailAdmin color system
  let tailadminColor: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" = "primary";
  let tailadminVariant: "light" | "solid" = "light";

  if (color) {
    tailadminColor = color;
  } else if (variant === "destructive") {
    tailadminColor = "error";
  } else if (variant === "secondary") {
    tailadminColor = "light";
  } else if (variant === "outline") {
    tailadminColor = "primary";
  }

  if (variant === "solid") {
    tailadminVariant = "solid";
  }

  const tailadminSize = size === "default" ? "md" : size;

  return (
    <TailAdminBadge
      variant={tailadminVariant}
      size={tailadminSize}
      color={tailadminColor}
      startIcon={startIcon}
      endIcon={endIcon}
    >
      {children}
    </TailAdminBadge>
  );
};

export default Badge;
