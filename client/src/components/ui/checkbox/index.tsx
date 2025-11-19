// TailAdmin Checkbox import removed - not needed for simple implementation
import { InputHTMLAttributes, forwardRef } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, onChange, className = "", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className={`h-5 w-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 ${className}`}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";

export default Checkbox;
