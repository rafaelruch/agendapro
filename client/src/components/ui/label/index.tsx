import { LabelHTMLAttributes, forwardRef } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
  className?: string;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${className}`}
        {...props}
      >
        {children}
      </label>
    );
  }
);
Label.displayName = "Label";

export default Label;
