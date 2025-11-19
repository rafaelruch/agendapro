import { HTMLAttributes, InputHTMLAttributes, forwardRef, ReactNode } from "react";

// Command - Container principal
export const Command = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex h-full w-full flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-dark ${className}`}
        {...props}
      />
    );
  }
);
Command.displayName = "Command";

// CommandInput - Campo de busca
export const CommandInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-11 w-full rounded-md bg-transparent px-3 py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white ${className}`}
        {...props}
      />
    );
  }
);
CommandInput.displayName = "CommandInput";

// CommandList - Lista de resultados
export const CommandList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`max-h-[300px] overflow-y-auto overflow-x-hidden ${className}`}
        {...props}
      />
    );
  }
);
CommandList.displayName = "CommandList";

// CommandEmpty - Estado vazio
export const CommandEmpty = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`py-6 text-center text-sm text-gray-500 ${className}`}
        {...props}
      />
    );
  }
);
CommandEmpty.displayName = "CommandEmpty";

// CommandGroup - Grupo de itens
export const CommandGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { heading?: ReactNode }>(
  ({ className = "", heading, children, ...props }, ref) => {
    return (
      <div ref={ref} className={`overflow-hidden p-1 ${className}`} {...props}>
        {heading && (
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500">{heading}</div>
        )}
        {children}
      </div>
    );
  }
);
CommandGroup.displayName = "CommandGroup";

// CommandItem - Item individual
export const CommandItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { onSelect?: () => void }>(
  ({ className = "", onSelect, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onSelect}
        className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-white/5 ${className}`}
        {...props}
      />
    );
  }
);
CommandItem.displayName = "CommandItem";

// CommandSeparator - Separador
export const CommandSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`-mx-1 h-px bg-gray-200 dark:bg-gray-800 ${className}`}
        {...props}
      />
    );
  }
);
CommandSeparator.displayName = "CommandSeparator";

export default Command;
