import { createContext, useContext, InputHTMLAttributes, forwardRef } from "react";

const RadioGroupContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

export interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, className = "", children, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <div ref={ref} className={`grid gap-2 ${className}`} {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
  className?: string;
}

export const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ value, className = "", ...props }, ref) => {
    const { value: groupValue, onValueChange } = useContext(RadioGroupContext);
    
    return (
      <input
        ref={ref}
        type="radio"
        value={value}
        checked={groupValue === value}
        onChange={() => onValueChange?.(value)}
        className={`h-4 w-4 border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 ${className}`}
        {...props}
      />
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export default RadioGroup;
