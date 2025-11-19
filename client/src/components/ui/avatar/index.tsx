import TailAdminAvatar from "../avatar/Avatar";
import { ReactNode } from "react";

// Wrapper para compatibilidade Shadcn -> TailAdmin
export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";
  status?: "online" | "offline" | "busy" | "none";
  className?: string;
  children?: ReactNode;
}

export const Avatar = ({ src, alt, size = "medium", status = "none", className = "", children }: AvatarProps) => {
  // Se src existe, usa o TailAdmin Avatar
  if (src) {
    return <TailAdminAvatar src={src} alt={alt} size={size} status={status} />;
  }
  
  // Se não tem src, renderiza children (para AvatarFallback)
  return (
    <div className={`relative rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${
      size === "xsmall" ? "h-6 w-6" :
      size === "small" ? "h-8 w-8" :
      size === "medium" ? "h-10 w-10" :
      size === "large" ? "h-12 w-12" :
      size === "xlarge" ? "h-14 w-14" :
      "h-16 w-16"
    } ${className}`}>
      {children}
    </div>
  );
};

// AvatarFallback - Fallback quando não tem imagem
export const AvatarFallback = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gray-200 text-gray-700 font-medium dark:bg-gray-700 dark:text-gray-300 ${className}`}>
      {children}
    </div>
  );
};

// AvatarImage - Wrapper da imagem
export const AvatarImage = ({ src, alt }: { src: string; alt?: string }) => {
  return <img src={src} alt={alt} className="h-full w-full rounded-full object-cover" />;
};

export default Avatar;
