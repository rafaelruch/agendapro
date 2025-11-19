import { createContext, useContext, useState, ReactNode, HTMLAttributes } from "react";

// Context para gerenciar estado das tabs
const TabsContext = createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: "",
  onValueChange: () => {},
});

// Tabs - Container principal
export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, defaultValue, children, className = "", ...props }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={className} {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

// TabsList - Lista de triggers
export function TabsList({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500 dark:bg-gray-800 ${className}`} {...props}>
      {children}
    </div>
  );
}

// TabsTrigger - Botão individual
export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = "", ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useContext(TabsContext);
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected
          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// TabsContent - Conteúdo da tab
export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = "", ...props }: TabsContentProps) {
  const { value: selectedValue } = useContext(TabsContext);
  
  if (selectedValue !== value) return null;

  return (
    <div className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Tabs;
