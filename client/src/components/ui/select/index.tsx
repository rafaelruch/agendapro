import { SelectHTMLAttributes, forwardRef, ReactNode, useState, useEffect } from "react";

// TailAdmin Select Nativo - Interface simples como Shadcn mas renderiza select nativo

interface Option {
  value: string;
  label: string;
}

// Select - Container principal (controlled/uncontrolled)
export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: ReactNode;
}

export function Select({ value, onValueChange, defaultValue = "", children }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  // Extrair options dos children
  const selectElement = (
    <select
      value={currentValue}
      onChange={handleChange}
      className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
    >
      {children}
    </select>
  );

  return selectElement;
}

// SelectTrigger - Compatibilidade Shadcn (não usado em select nativo)
export const SelectTrigger = forwardRef<HTMLDivElement, { children: ReactNode; className?: string; id?: string }>(
  ({ children, className = "", ...props }, ref) => {
    return <>{children}</>;
  }
);
SelectTrigger.displayName = "SelectTrigger";

// SelectValue - Compatibilidade Shadcn (não usado em select nativo)
export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  return null; // Não renderiza nada - select nativo não precisa
}

// SelectContent - Compatibilidade Shadcn (wrapper para options)
export interface SelectContentProps {
  children: ReactNode;
  className?: string;
}

export function SelectContent({ children }: SelectContentProps) {
  return <>{children}</>;
}

// SelectItem - Opção individual (renderiza option nativo)
export interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function SelectItem({ value, children }: SelectItemProps) {
  return (
    <option value={value} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
      {children}
    </option>
  );
}

// SelectGroup - Agrupamento de itens
export function SelectGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// SelectLabel - Label do grupo
export function SelectLabel({ children }: { children: ReactNode }) {
  return <optgroup label={children as string} />;
}

// NativeSelect - Select nativo direto (para uso avançado)
export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
  className?: string;
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
NativeSelect.displayName = "NativeSelect";
