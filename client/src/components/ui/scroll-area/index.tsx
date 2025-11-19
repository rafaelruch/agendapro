import { HTMLAttributes, forwardRef } from "react";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-auto ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = "ScrollArea";

export default ScrollArea;
