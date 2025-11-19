import TailAdminInput from "../../form/input/InputField";
import type React from "react";
import { InputHTMLAttributes } from "react";

// Wrapper para compatibilidade Shadcn -> TailAdmin
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | "datetime-local" | "tel" | "url" | "search" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
}

export const Input: React.FC<InputProps> = (props) => {
  return <TailAdminInput {...props} />;
};

export default Input;
