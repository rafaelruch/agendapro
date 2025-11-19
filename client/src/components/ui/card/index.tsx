import { ReactNode, HTMLAttributes } from "react";

// Card - Container principal
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-dark ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// CardHeader - Cabeçalho do card
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className = "", ...props }: CardHeaderProps) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

// CardTitle - Título do card
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  className?: string;
}

export const CardTitle = ({ children, className = "", ...props }: CardTitleProps) => {
  return (
    <h3 className={`text-xl font-semibold leading-none tracking-tight text-gray-900 dark:text-white ${className}`} {...props}>
      {children}
    </h3>
  );
};

// CardDescription - Descrição do card
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  className?: string;
}

export const CardDescription = ({ children, className = "", ...props }: CardDescriptionProps) => {
  return (
    <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`} {...props}>
      {children}
    </p>
  );
};

// CardContent - Conteúdo do card
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardContent = ({ children, className = "", ...props }: CardContentProps) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

// CardFooter - Rodapé do card
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardFooter = ({ children, className = "", ...props }: CardFooterProps) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
