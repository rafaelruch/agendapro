import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface Option {
  id: string;
  name: string;
  description?: string;
}

interface TailAdminMultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function TailAdminMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione opções...",
  label,
}: TailAdminMultiSelectProps) {
  const [dropdown, setDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== id));
  };

  const selectedOptions = options.filter((opt) => selected.includes(opt.id));
  const availableOptions = options.filter((opt) => !selected.includes(opt.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </label>
      )}

      {/* Selected Items Display */}
      <div
        onClick={() => setDropdown(!dropdown)}
        className="w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 px-4 outline-none transition focus:border-brand-500 dark:focus:border-brand-400"
        data-testid="container-tailadmin-multiselect"
      >
        <div className="flex flex-wrap gap-2">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-500/10 dark:bg-brand-400/10 px-2.5 py-1.5 text-sm font-medium text-brand-600 dark:text-brand-400"
                data-testid={`chip-option-${option.id}`}
              >
                {option.name}
                <button
                  type="button"
                  onClick={(e) => removeOption(option.id, e)}
                  className="hover:text-brand-700 dark:hover:text-brand-300"
                  data-testid={`button-remove-option-${option.id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Dropdown Options */}
      {dropdown && (
        <div className="absolute z-40 mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-y-auto">
          <div className="flex flex-col">
            {availableOptions.length === 0 ? (
              <div className="px-4 py-3 text-gray-400 dark:text-gray-500 text-center text-sm">
                {selected.length === options.length
                  ? "Todas as opções selecionadas"
                  : "Nenhuma opção disponível"}
              </div>
            ) : (
              availableOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className="cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  data-testid={`option-${option.id}`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.name}
                  </div>
                  {option.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
