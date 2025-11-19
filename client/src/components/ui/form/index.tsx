import { createContext, useContext, FormHTMLAttributes, HTMLAttributes, forwardRef, ReactNode } from "react";
import { UseFormReturn, FieldValues, Controller, ControllerProps, FieldPath } from "react-hook-form";

// Context para o formulário
const FormContext = createContext<UseFormReturn<any> | null>(null);

// Form - Container principal
export interface FormProps<TFieldValues extends FieldValues> extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: (data: TFieldValues) => void;
  children: ReactNode;
  className?: string;
}

export function Form<TFieldValues extends FieldValues>({ 
  form, 
  onSubmit, 
  children, 
  className = "",
  ...props 
}: FormProps<TFieldValues>) {
  return (
    <FormContext.Provider value={form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className} {...props}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

// Hook para acessar o formulário
export function useFormContext<TFieldValues extends FieldValues = FieldValues>() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a Form component");
  }
  return context as UseFormReturn<TFieldValues>;
}

// FormField - Campo do formulário (wrapper do Controller)
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: Omit<ControllerProps<TFieldValues, TName>, 'control'>) {
  const form = useFormContext<TFieldValues>();
  return <Controller control={form.control} {...props} />;
}

// FormItem - Container do campo
export const FormItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => {
    return <div ref={ref} className={`space-y-2 ${className}`} {...props} />;
  }
);
FormItem.displayName = "FormItem";

// FormLabel - Label do campo
export const FormLabel = forwardRef<HTMLLabelElement, HTMLAttributes<HTMLLabelElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
        {...props}
      />
    );
  }
);
FormLabel.displayName = "FormLabel";

// FormControl - Wrapper do input
export const FormControl = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => {
    return <div ref={ref} {...props} />;
  }
);
FormControl.displayName = "FormControl";

// FormDescription - Descrição do campo
export const FormDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
        {...props}
      />
    );
  }
);
FormDescription.displayName = "FormDescription";

// FormMessage - Mensagem de erro
export const FormMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm font-medium text-error-500 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

export default Form;
