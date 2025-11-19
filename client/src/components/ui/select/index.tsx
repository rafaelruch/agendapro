import { SelectHTMLAttributes, forwardRef, ReactNode, createContext, useContext, useState } from "react";

// Context para gerenciar estado do select
const SelectContext = createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: "",
  onValueChange: () => {},
});

// Select - Container principal
export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: ReactNode;
}

export function Select({ value, onValueChange, defaultValue, children }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

// SelectTrigger - Botão que abre o select
export const SelectTrigger = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { className?: string }>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div className={`relative ${className}`}>
        {children}
      </div>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

// SelectValue - Valor selecionado
export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useContext(SelectContext);
  return <span>{value || placeholder}</span>;
}

// SelectContent - Dropdown de opções (renderizado como select nativo)
export interface SelectContentProps {
  children: ReactNode;
  className?: string;
}

export function SelectContent({ children, className = "" }: SelectContentProps) {
  return <>{children}</>;
}

// SelectItem - Opção individual
export interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function SelectItem({ value, children }: SelectItemProps) {
  return <option value={value}>{children}</option>;
}

// SelectGroup - Agrupamento de itens
export function SelectGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// SelectLabel - Label do grupo
export function SelectLabel({ children }: { children: ReactNode }) {
  return <optgroup label={children as string}>{}</optgroup>;
}

// Wrapper simples para uso direto como select nativo
export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
  className?: string;
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
NativeSelect.displayName = "NativeSelect";

export default Select;
