import { useRef, useEffect, useLayoutEffect, createContext, useContext, useState } from "react";
import { X } from "lucide-react";

// Context para compartilhar o className entre Dialog e DialogContent
interface DialogContextValue {
  containerClassName?: string;
  setContainerClassName: (className: string) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

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

// TailAdmin Modal Base (copiado de attached_assets/free-react-tailwind-admin-dashboard-main/src/components/ui/modal/index.tsx)
interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  containerClassName?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const ModalBase: React.FC<ModalBaseProps> = ({
  isOpen,
  onClose,
  children,
  containerClassName,
  showCloseButton = true,
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
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        ref={modalRef}
        className={`relative w-full rounded-3xl bg-white dark:bg-gray-900 ${containerClassName || 'max-w-3xl'}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            aria-label="Fechar"
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
  const [containerClassName, setContainerClassName] = useState<string>('');

  // Reset className when dialog closes
  useEffect(() => {
    if (!open) {
      setContainerClassName('');
    }
  }, [open]);

  return (
    <DialogContext.Provider value={{ containerClassName, setContainerClassName }}>
      <ModalBase 
        isOpen={open} 
        onClose={() => onOpenChange?.(false)}
        containerClassName={containerClassName}
        showCloseButton={false}
      >
        {children}
      </ModalBase>
    </DialogContext.Provider>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DialogContent({ children, className, "data-testid": testId }: DialogContentProps) {
  const context = useContext(DialogContext);
  
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
