import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { Portuguese } from "flatpickr/dist/l10n/pt.js";
import "flatpickr/dist/flatpickr.css";
import { Calendar, Clock } from "lucide-react";
import { Label } from "./label";

// Configurar locale português globalmente com correção do firstDayOfWeek
if (typeof flatpickr !== 'undefined' && flatpickr.l10ns) {
  flatpickr.l10ns.pt = {
    ...Portuguese,
    firstDayOfWeek: 0, // 0 = Domingo (padrão brasileiro)
  };
}

type DatePickerMode = "single" | "multiple" | "range" | "time";

interface DatePickerProps {
  id: string;
  mode?: DatePickerMode;
  onChange?: (selectedDates: Date[], dateStr: string) => void;
  defaultDate?: string | Date;
  label?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  "data-testid"?: string;
  disabled?: boolean;
}

export function DatePicker({
  id,
  mode = "single",
  onChange,
  label,
  defaultDate,
  placeholder,
  value,
  required,
  disabled,
  "data-testid": dataTestId,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const flatpickrRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const config: flatpickr.Options.Options = {
      mode,
      static: true,
      monthSelectorType: "static",
      dateFormat: mode === "time" ? "H:i" : "Y-m-d",
      altInput: mode !== "time",
      altFormat: mode === "time" ? "H:i" : "d/m/Y",
      enableTime: mode === "time",
      noCalendar: mode === "time",
      time_24hr: true,
      locale: "pt", // Usar locale português configurado globalmente
      defaultDate: value || defaultDate,
      onChange: (selectedDates, dateStr) => {
        if (onChange) {
          onChange(selectedDates, dateStr);
        }
      },
    };

    flatpickrRef.current = flatpickr(inputRef.current, config);

    // Forçar firstDayOfWeek depois da inicialização (workaround para bug do Flatpickr)
    if (flatpickrRef.current && mode !== "time") {
      flatpickrRef.current.set("locale", {
        ...Portuguese,
        firstDayOfWeek: 0,
      });
      // Redesenhar o calendário com a configuração correta
      flatpickrRef.current.redraw();
    }

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
      }
    };
  }, [mode, defaultDate]);

  // Update onChange handler when it changes (prevents closure issues)
  useEffect(() => {
    if (flatpickrRef.current && onChange) {
      flatpickrRef.current.set("onChange", (selectedDates: Date[], dateStr: string) => {
        onChange(selectedDates, dateStr);
      });
    }
  }, [onChange]);

  useEffect(() => {
    if (flatpickrRef.current && value !== undefined) {
      flatpickrRef.current.setDate(value, false);
    }
  }, [value]);

  return (
    <div className="grid gap-2">
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          data-testid={dataTestId}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          {mode === "time" ? (
            <Clock className="size-6" />
          ) : (
            <Calendar className="size-6" />
          )}
        </span>
      </div>
    </div>
  );
}
