import TailAdminAlert from "./Alert";
import { ReactNode, HTMLAttributes } from "react";

// Wrapper para compatibilidade Shadcn -> TailAdmin
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  children: ReactNode;
  className?: string;
}

export const Alert = ({ variant = "info", children, className = "", ...props }: AlertProps) => {
  // Map Shadcn variants to TailAdmin variants
  let tailadminVariant: "success" | "error" | "warning" | "info" = "info";
  
  if (variant === "destructive") {
    tailadminVariant = "error";
  } else if (variant === "success") {
    tailadminVariant = "success";
  } else if (variant === "warning") {
    tailadminVariant = "warning";
  }

  // Extract title and message from children
  // TailAdmin Alert expects title and message props
  let title = "";
  let message = "";
  
  // Parse children to extract AlertTitle and AlertDescription
  if (Array.isArray(children)) {
    children.forEach((child: any) => {
      if (child?.type?.displayName === "AlertTitle") {
        title = child.props.children;
      } else if (child?.type?.displayName === "AlertDescription") {
        message = child.props.children;
      }
    });
  }

  // Fallback: se não encontrou title/message, use children direto
  if (!title && !message && typeof children === "string") {
    message = children;
  }

  return (
    <div className={className} {...props}>
      <TailAdminAlert
        variant={tailadminVariant}
        title={title || "Alerta"}
        message={message || (typeof children === "string" ? children : "")}
      />
    </div>
  );
};

// AlertTitle - Componente de título
export const AlertTitle = ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
  return <h5 {...props}>{children}</h5>;
};
AlertTitle.displayName = "AlertTitle";

// AlertDescription - Componente de descrição
export const AlertDescription = ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => {
  return <p {...props}>{children}</p>;
};
AlertDescription.displayName = "AlertDescription";

export default Alert;
