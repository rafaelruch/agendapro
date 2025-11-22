import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Label } from "./label";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (value && value.trim() !== "") {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    if (defaultDate) {
      const date = typeof defaultDate === "string" ? new Date(defaultDate) : defaultDate;
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  });
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const [timeValue, setTimeValue] = useState<string>(
    value && mode === "time" ? value : "08:00"
  );

  useEffect(() => {
    if (value !== undefined) {
      if (mode === "time") {
        setTimeValue(value);
      } else if (mode === "single") {
        if (value && value.trim() !== "") {
          const date = new Date(value);
          setSelectedDate(isNaN(date.getTime()) ? undefined : date);
        } else {
          setSelectedDate(undefined);
        }
      }
    }
  }, [value, mode]);

  const handleSingleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsOpen(false);
    
    if (onChange && date) {
      const dateStr = format(date, "yyyy-MM-dd");
      onChange([date], dateStr);
    }
  };

  const handleMultipleDatesSelect = (dates: Date[] | undefined) => {
    const newDates = dates || [];
    setSelectedDates(newDates);
    
    if (onChange) {
      const dateStrs = newDates.map(d => format(d, "yyyy-MM-dd")).join(",");
      onChange(newDates, dateStrs);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    
    if (onChange && range?.from) {
      const dates: Date[] = range.to ? [range.from, range.to] : [range.from];
      const dateStrs = dates.map(d => format(d, "yyyy-MM-dd")).join(",");
      onChange(dates, dateStrs);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    
    if (onChange) {
      onChange([], newTime);
    }
  };

  const getDisplayValue = () => {
    if (mode === "time") {
      return timeValue;
    }
    if (mode === "single" && selectedDate) {
      return format(selectedDate, "dd/MM/yyyy", { locale: ptBR });
    }
    if (mode === "multiple" && selectedDates.length > 0) {
      return selectedDates
        .map(d => format(d, "dd/MM/yyyy", { locale: ptBR }))
        .join(", ");
    }
    if (mode === "range" && selectedRange?.from) {
      const from = format(selectedRange.from, "dd/MM/yyyy", { locale: ptBR });
      const to = selectedRange.to 
        ? format(selectedRange.to, "dd/MM/yyyy", { locale: ptBR })
        : "...";
      return `${from} - ${to}`;
    }
    return "";
  };

  if (mode === "time") {
    return (
      <div className="grid gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <input
            type="time"
            id={id}
            value={timeValue}
            onChange={handleTimeChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            data-testid={dataTestId}
            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
          />
          <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
            <Clock className="size-6" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      
      <div className="relative">
        <input
          type="text"
          id={id}
          value={getDisplayValue()}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          placeholder={placeholder || "Selecione uma data"}
          required={required}
          disabled={disabled}
          readOnly
          data-testid={dataTestId}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 cursor-pointer"
        />
        
        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalendarIcon className="size-6" />
        </span>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            <div className="absolute z-50 mt-2 rounded-lg border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {mode === "single" && (
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSingleDateSelect}
                  locale={ptBR}
                  weekStartsOn={0}
                  className="rdp-custom"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium text-gray-900 dark:text-white",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-brand-50 dark:[&:has([aria-selected])]:bg-brand-900/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md inline-flex items-center justify-center text-gray-900 dark:text-white",
                    day_selected: "bg-brand-600 text-white hover:bg-brand-700 hover:text-white focus:bg-brand-600 focus:text-white dark:bg-brand-600 dark:hover:bg-brand-700",
                    day_today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold",
                    day_outside: "text-gray-400 dark:text-gray-600 opacity-50",
                    day_disabled: "text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed",
                    day_hidden: "invisible",
                  }}
                />
              )}
              
              {mode === "multiple" && (
                <DayPicker
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={handleMultipleDatesSelect}
                  locale={ptBR}
                  weekStartsOn={0}
                  className="rdp-custom"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium text-gray-900 dark:text-white",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-brand-50 dark:[&:has([aria-selected])]:bg-brand-900/20 focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md inline-flex items-center justify-center text-gray-900 dark:text-white",
                    day_selected: "bg-brand-600 text-white hover:bg-brand-700 hover:text-white focus:bg-brand-600 focus:text-white dark:bg-brand-600 dark:hover:bg-brand-700",
                    day_today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold",
                    day_outside: "text-gray-400 dark:text-gray-600 opacity-50",
                    day_disabled: "text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed",
                    day_hidden: "invisible",
                  }}
                />
              )}
              
              {mode === "range" && (
                <DayPicker
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleRangeSelect}
                  locale={ptBR}
                  weekStartsOn={0}
                  className="rdp-custom"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium text-gray-900 dark:text-white",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-brand-50 dark:[&:has([aria-selected])]:bg-brand-900/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md inline-flex items-center justify-center text-gray-900 dark:text-white",
                    day_selected: "bg-brand-600 text-white hover:bg-brand-700 hover:text-white focus:bg-brand-600 focus:text-white dark:bg-brand-600 dark:hover:bg-brand-700",
                    day_today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold",
                    day_outside: "text-gray-400 dark:text-gray-600 opacity-50",
                    day_disabled: "text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed",
                    day_hidden: "invisible",
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
