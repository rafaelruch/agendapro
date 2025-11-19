import { createContext, useContext, useState, ReactNode, HTMLAttributes, forwardRef } from "react";

// Context para gerenciar estado do tooltip
const TooltipContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

// TooltipProvider - Provedor de contexto
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Tooltip - Container principal
export interface TooltipProps {
  children: ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
}

// TooltipTrigger - Elemento que dispara o tooltip
export const TooltipTrigger = forwardRef<HTMLDivElement, {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}>(({ children, asChild, className = "" }, ref) => {
  const { setIsOpen } = useContext(TooltipContext);

  if (asChild) {
    const child = children as React.ReactElement;
    return (
      <div
        ref={ref}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={className}
      >
        {child}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={className}
    >
      {children}
    </div>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

// TooltipContent - Conteúdo do tooltip
export const TooltipContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}>(({ children, side = "top", align = "center", className = "", ...props }, ref) => {
  const { isOpen } = useContext(TooltipContext);

  if (!isOpen) return null;

  const sideClass =
    side === "top" ? "bottom-full mb-2" :
    side === "left" ? "right-full mr-2" :
    side === "right" ? "left-full ml-2" :
    "top-full mt-2";

  const alignClass =
    align === "start" ? "left-0" :
    align === "end" ? "right-0" :
    "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={ref}
      className={`absolute ${sideClass} ${alignClass} z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white dark:bg-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";

export default Tooltip;
