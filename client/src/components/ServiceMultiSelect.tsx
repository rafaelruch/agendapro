import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent, type FocusEvent } from "react";
import { X, Check } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Service {
  id: string;
  name: string;
  category: string;
  value: string;
  duration: number;
}

interface ServiceMultiSelectProps {
  services: Service[];
  selectedServiceIds: string[];
  onChange: (serviceIds: string[]) => void;
}

export function ServiceMultiSelect({
  services,
  selectedServiceIds,
  onChange,
}: ServiceMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBlur = (e: FocusEvent) => {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  const toggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      onChange(selectedServiceIds.filter(id => id !== serviceId));
    } else {
      onChange([...selectedServiceIds, serviceId]);
    }
  };

  const removeService = (serviceId: string, e: ReactMouseEvent) => {
    e.stopPropagation();
    onChange(selectedServiceIds.filter(id => id !== serviceId));
  };

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDuration = selectedServices.reduce((sum, service) => sum + (service.duration || 60), 0);
  const totalValue = selectedServices.reduce((sum, service) => sum + parseFloat(service.value), 0);

  return (
    <div className="grid gap-2">
      <Label>Serviços (Opcional)</Label>
      
      <div ref={wrapperRef} className="relative w-full" onBlur={handleBlur}>
        {/* Input container with chips inside */}
        <div
          className="min-h-[42px] w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          data-testid="container-service-multiselect"
        >
          <div className="flex flex-wrap gap-2">
            {/* Selected service chips */}
            {selectedServices.map((service) => (
              <span
                key={service.id}
                className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                data-testid={`chip-service-${service.id}`}
              >
                {service.name}
                <button
                  type="button"
                  onClick={(e) => removeService(service.id, e)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
                  data-testid={`button-remove-service-${service.id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            
            {/* Search input */}
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={selectedServices.length === 0 ? "Selecione um ou mais serviços..." : ""}
              className="flex-1 min-w-[120px] border-none outline-none focus:ring-0 text-sm bg-transparent placeholder:text-muted-foreground"
              data-testid="input-search-service"
            />
          </div>
        </div>

        {/* Dropdown options */}
        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-popover shadow-lg">
            {filteredServices.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Nenhum serviço encontrado.
              </div>
            ) : (
              filteredServices.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className="cursor-pointer px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    data-testid={`option-service-${service.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {service.category} • R$ {parseFloat(service.value).toFixed(2).replace('.', ',')} • {service.duration} min
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Total summary */}
      {selectedServices.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-2 mt-1">
          <div>
            <span className="font-medium">Duração total:</span> {totalDuration} min
          </div>
          <div>
            <span className="font-medium">Valor total:</span> R$ {totalValue.toFixed(2).replace('.', ',')}
          </div>
        </div>
      )}
    </div>
  );
}
