import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { maskCurrency, parseCurrency, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string | number;
  onChange: (value: string) => void;
  onValueChange?: (numericValue: number) => void;
}

function CurrencyInput({ className, value, onChange, onValueChange, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value === "" || value === null || value === undefined) {
      setDisplayValue("");
    } else {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (!isNaN(numValue) && numValue > 0) {
        setDisplayValue(formatCurrency(numValue));
      } else if (value === "0" || value === 0) {
        setDisplayValue("");
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const masked = maskCurrency(rawValue);
    setDisplayValue(masked);
    
    const numericValue = parseCurrency(masked);
    onChange(numericValue > 0 ? numericValue.toString() : "");
    
    if (onValueChange) {
      onValueChange(numericValue);
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className={cn("pl-9 text-right", className)}
        placeholder="0,00"
      />
    </div>
  );
}

export { CurrencyInput };
