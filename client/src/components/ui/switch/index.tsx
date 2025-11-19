import { InputHTMLAttributes, forwardRef } from "react";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, onChange, className = "", ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500 ${className}`}></div>
      </label>
    );
  }
);
Switch.displayName = "Switch";

export default Switch;
