import { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "../modal";

// Context para gerenciar estado do Dialog
const DialogContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

// Dialog - Container principal (compatível com Shadcn API)
export interface DialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open, onOpenChange }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;

  const setIsOpen = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <DialogContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

// DialogTrigger - Elemento que abre o dialog
export interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}

export function DialogTrigger({ children, asChild, className = "" }: DialogTriggerProps) {
  const { setIsOpen } = useContext(DialogContext);

  const handleClick = () => setIsOpen(true);

  if (asChild && typeof children === "object" && children !== null && "props" in children) {
    const child = children as React.ReactElement;
    return <div onClick={handleClick} className={className}>{child}</div>;
  }

  return (
    <button onClick={handleClick} className={className} type="button">
      {children}
    </button>
  );
}

// DialogContent - Conteúdo do dialog (usa Modal TailAdmin)
export interface DialogContentProps {
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export function DialogContent({ children, className = "", showCloseButton = true }: DialogContentProps) {
  const { isOpen, setIsOpen } = useContext(DialogContext);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      className={className}
      showCloseButton={showCloseButton}
    >
      {children}
    </Modal>
  );
}

// DialogHeader - Cabeçalho do dialog
export interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DialogHeader({ children, className = "" }: DialogHeaderProps) {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left px-6 pt-6 ${className}`}>
      {children}
    </div>
  );
}

// DialogTitle - Título do dialog
export interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white ${className}`}>
      {children}
    </h2>
  );
}

// DialogDescription - Descrição do dialog
export interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function DialogDescription({ children, className = "" }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  );
}

// DialogFooter - Rodapé do dialog
export interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 pb-6 pt-4 ${className}`}>
      {children}
    </div>
  );
}

// Export individual components
export default Dialog;
