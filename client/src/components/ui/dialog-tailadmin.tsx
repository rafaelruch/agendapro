import { useRef, useEffect } from "react";
import { X } from "lucide-react";

// TailAdmin Modal Base (copiado de attached_assets/free-react-tailwind-admin-dashboard-main/src/components/ui/modal/index.tsx)
interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const ModalBase: React.FC<ModalBaseProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
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
        className={`relative w-full max-w-[500px] rounded-3xl bg-white dark:bg-gray-900 ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6 sm:h-11 sm:w-11"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

// Wrapper que simula a API do Shadcn Dialog
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  return (
    <ModalBase 
      isOpen={open} 
      onClose={() => onOpenChange?.(false)}
      showCloseButton={false}
    >
      {children}
    </ModalBase>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DialogContent({ children, className, "data-testid": testId }: DialogContentProps) {
  return (
    <div className={`p-6 sm:p-8 ${className || ''}`} data-testid={testId}>
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={`mb-6 ${className || ''}`}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={`text-xl font-semibold text-gray-800 dark:text-white/90 ${className || ''}`}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 mt-2 ${className || ''}`}>
      {children}
    </p>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={`mt-6 flex gap-3 justify-end ${className || ''}`}>
      {children}
    </div>
  );
}
