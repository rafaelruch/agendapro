import { useRef, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

// TailAdmin Modal Base para AlertDialog
interface AlertModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const AlertModalBase: React.FC<AlertModalBaseProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto modal z-99999">
      <div
        className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
        onClick={onClose}
      ></div>
      <div
        ref={modalRef}
        className="relative w-full max-w-[400px] rounded-3xl bg-white dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// Wrapper que simula a API do Shadcn AlertDialog
interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open = false, onOpenChange, children }: AlertDialogProps) {
  return (
    <AlertModalBase 
      isOpen={open} 
      onClose={() => onOpenChange?.(false)}
    >
      {children}
    </AlertModalBase>
  );
}

interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  return (
    <div className={`p-6 sm:p-8 ${className || ''}`}>
      {children}
    </div>
  );
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogHeader({ children, className }: AlertDialogHeaderProps) {
  return (
    <div className={`mb-4 flex items-start gap-3 ${className || ''}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15">
        <AlertTriangle className="h-5 w-5 text-error-500" />
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold text-gray-800 dark:text-white/90 ${className || ''}`}>
      {children}
    </h2>
  );
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogDescription({ children, className }: AlertDialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${className || ''}`}>
      {children}
    </p>
  );
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogFooter({ children, className }: AlertDialogFooterProps) {
  return (
    <div className={`mt-6 flex gap-3 justify-end ${className || ''}`}>
      {children}
    </div>
  );
}

interface AlertDialogActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AlertDialogAction({ children, onClick, className }: AlertDialogActionProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition bg-error-500 text-white hover:bg-error-600 ${className || ''}`}
    >
      {children}
    </button>
  );
}

interface AlertDialogCancelProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AlertDialogCancel({ children, onClick, className }: AlertDialogCancelProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${className || ''}`}
    >
      {children}
    </button>
  );
}
