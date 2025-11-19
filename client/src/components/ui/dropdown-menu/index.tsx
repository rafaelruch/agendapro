import { createContext, useContext, useState, ReactNode, forwardRef } from "react";

// Context para gerenciar estado do dropdown
const DropdownContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

// DropdownMenu - Container principal
export function DropdownMenu({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

// DropdownMenuTrigger - Botão que abre o dropdown
export const DropdownMenuTrigger = forwardRef<HTMLDivElement, { 
  children: ReactNode; 
  asChild?: boolean;
}>(({ children, asChild }, ref) => {
  const { setIsOpen, isOpen } = useContext(DropdownContext);

  const handleClick = () => setIsOpen(!isOpen);

  if (asChild) {
    // Clone child and add onClick
    const child = children as React.ReactElement;
    return <div ref={ref} onClick={handleClick} className="dropdown-toggle">{child}</div>;
  }

  return (
    <button ref={ref as any} onClick={handleClick} className="dropdown-toggle">
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

// DropdownMenuContent - Conteúdo do dropdown
export function DropdownMenuContent({ 
  children, 
  align = "start",
  className = ""
}: { 
  children: ReactNode; 
  align?: "start" | "end";
  className?: string;
}) {
  const { isOpen, setIsOpen } = useContext(DropdownContext);

  if (!isOpen) return null;

  const alignClass = align === "end" ? "right-0" : "left-0";

  return (
    <div 
      className={`absolute ${alignClass} mt-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

// DropdownMenuItem - Item individual do dropdown
export function DropdownMenuItem({ 
  children, 
  onClick,
  className = ""
}: { 
  children: ReactNode; 
  onClick?: () => void;
  className?: string;
}) {
  const { setIsOpen } = useContext(DropdownContext);

  const handleClick = () => {
    onClick?.();
    setIsOpen(false);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-white/5 dark:focus:bg-white/5 ${className}`}
    >
      {children}
    </button>
  );
}

// DropdownMenuSeparator - Separador
export function DropdownMenuSeparator({ className = "" }: { className?: string }) {
  return <div className={`-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-800 ${className}`} />;
}

// DropdownMenuLabel - Label (título)
export function DropdownMenuLabel({ 
  children,
  className = ""
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-3 py-2 text-sm font-semibold text-gray-700 dark:text-white ${className}`}>
      {children}
    </div>
  );
}

// Export default
export default DropdownMenu;
