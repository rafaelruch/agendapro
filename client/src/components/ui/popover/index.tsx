import { createContext, useContext, useState, ReactNode, HTMLAttributes, forwardRef } from "react";

// Context para gerenciar estado do popover
const PopoverContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

// Popover - Container principal
export interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  
  const setIsOpen = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

// PopoverTrigger - Elemento que abre o popover
export const PopoverTrigger = forwardRef<HTMLDivElement, {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}>(({ children, asChild, className = "" }, ref) => {
  const { setIsOpen, isOpen } = useContext(PopoverContext);

  const handleClick = () => setIsOpen(!isOpen);

  if (asChild) {
    const child = children as React.ReactElement;
    return <div ref={ref} onClick={handleClick} className={className}>{child}</div>;
  }

  return (
    <button ref={ref as any} onClick={handleClick} className={className}>
      {children}
    </button>
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

// PopoverContent - Conteúdo do popover
export const PopoverContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}>(({ children, align = "center", side = "bottom", className = "", ...props }, ref) => {
  const { isOpen, setIsOpen } = useContext(PopoverContext);

  if (!isOpen) return null;

  const alignClass = 
    align === "start" ? "left-0" :
    align === "end" ? "right-0" :
    "left-1/2 -translate-x-1/2";

  const sideClass =
    side === "top" ? "bottom-full mb-2" :
    side === "left" ? "right-full mr-2" :
    side === "right" ? "left-full ml-2" :
    "top-full mt-2";

  return (
    <div
      ref={ref}
      className={`absolute ${sideClass} ${alignClass} z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg outline-none dark:border-gray-800 dark:bg-gray-dark ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
PopoverContent.displayName = "PopoverContent";

export default Popover;
