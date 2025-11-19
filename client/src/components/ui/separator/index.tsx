import { HTMLAttributes } from "react";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export const Separator = ({ 
  orientation = "horizontal", 
  className = "",
  ...props 
}: SeparatorProps) => {
  return (
    <div
      className={`${
        orientation === "horizontal"
          ? "h-px w-full"
          : "w-px h-full"
      } bg-gray-200 dark:bg-gray-800 ${className}`}
      {...props}
    />
  );
};

export default Separator;
