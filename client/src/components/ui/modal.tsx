import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className = "" }: ModalProps) {
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
    <div className="fixed inset-0 z-99999 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/50" 
        onClick={onClose}
        data-testid="modal-backdrop"
      />
      
      {/* Modal Content */}
      <div 
        className={`relative z-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 ${className}`}
        data-testid="modal-content"
      >
        {children}
      </div>
    </div>
  );
}
