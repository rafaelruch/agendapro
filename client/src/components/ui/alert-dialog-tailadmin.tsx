import { useRef, useEffect, useLayoutEffect, createContext, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";

// Context para compartilhar o className entre AlertDialog e AlertDialogContent
interface AlertDialogContextValue {
  containerClassName?: string;
  setContainerClassName: (className: string) => void;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

// Focus trap utility
function useFocusTrap(ref: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const element = ref.current;
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = Array.from(
        element.querySelectorAll<HTMLElement>(focusableSelector)
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    
    // Focus first element on mount
    const firstFocusable = element.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive, ref]);
}

// TailAdmin Modal Base para AlertDialog
interface AlertModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  containerClassName?: string;
  children: React.ReactNode;
}

const AlertModalBase: React.FC<AlertModalBaseProps> = ({
  isOpen,
  onClose,
  containerClassName,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Save focus BEFORE any focus shifts (useLayoutEffect runs synchronously before paint)
  useLayoutEffect(() => {
    if (isOpen) {
      // Capture the element that was focused before the modal opened
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus trap (runs after useLayoutEffect, so previousActiveElement is already saved)
  useFocusTrap(modalRef, isOpen);

  // Restore focus when closing
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // ESC key handler
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
    <div 
      className="fixed inset-0 flex items-center justify-center overflow-y-auto modal z-999999"
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        ref={modalRef}
        className={`relative w-full rounded-3xl bg-white dark:bg-gray-900 ${containerClassName || 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
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
  const [containerClassName, setContainerClassName] = useState<string>('');

  // Reset className when dialog closes
  useEffect(() => {
    if (!open) {
      setContainerClassName('');
    }
  }, [open]);

  return (
    <AlertDialogContext.Provider value={{ containerClassName, setContainerClassName }}>
      <AlertModalBase 
        isOpen={open} 
        onClose={() => onOpenChange?.(false)}
        containerClassName={containerClassName}
      >
        {children}
      </AlertModalBase>
    </AlertDialogContext.Provider>
  );
}

interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  const context = useContext(AlertDialogContext);
  
  // Extract size classes from className and set them on the container
  useEffect(() => {
    if (context) {
      if (className) {
        // Extract max-w-* classes
        const maxWMatch = className.match(/(?:sm:|md:|lg:|xl:|2xl:)?max-w-\[[^\]]+\]|(?:sm:|md:|lg:|xl:|2xl:)?max-w-\w+/g);
        if (maxWMatch) {
          context.setContainerClassName(maxWMatch.join(' '));
        } else {
          // No width class found, reset to default
          context.setContainerClassName('');
        }
      } else {
        // No className at all, reset to default
        context.setContainerClassName('');
      }
    }
  }, [className, context]);

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
