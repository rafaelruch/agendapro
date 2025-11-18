import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  const [open, setOpen] = useState(false);

  const toggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      onChange(selectedServiceIds.filter(id => id !== serviceId));
    } else {
      onChange([...selectedServiceIds, serviceId]);
    }
  };

  const removeService = (serviceId: string) => {
    onChange(selectedServiceIds.filter(id => id !== serviceId));
  };

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, service) => sum + (service.duration || 60), 0);
  const totalValue = selectedServices.reduce((sum, service) => sum + parseFloat(service.value), 0);

  return (
    <div className="grid gap-2">
      <Label>Serviços (Opcional)</Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="button-service-multiselect"
          >
            <span className="text-muted-foreground">
              {selectedServiceIds.length === 0 
                ? "Selecione um ou mais serviços..."
                : `${selectedServiceIds.length} serviço(s) selecionado(s)`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar serviço..." data-testid="input-search-service" />
            <CommandList>
              <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
              <CommandGroup>
                {services.map((service) => (
                  <CommandItem
                    key={service.id}
                    value={`${service.name} ${service.category}`}
                    onSelect={() => toggleService(service.id)}
                    data-testid={`option-service-${service.id}`}
                  >
                    <Checkbox
                      checked={selectedServiceIds.includes(service.id)}
                      className="mr-2"
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{service.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {service.category} • R$ {parseFloat(service.value).toFixed(2).replace('.', ',')} • {service.duration} min
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedServices.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedServices.map((service) => (
              <Badge
                key={service.id}
                variant="secondary"
                className="gap-1 pr-1"
                data-testid={`badge-service-${service.id}`}
              >
                <span className="text-xs font-medium">{service.name}</span>
                <button
                  type="button"
                  className="ml-1 rounded-full hover-elevate active-elevate-2 p-0.5"
                  onClick={() => removeService(service.id)}
                  data-testid={`button-remove-service-${service.id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-2">
            <div>
              <span className="font-medium">Duração total:</span> {totalDuration} min
            </div>
            <div>
              <span className="font-medium">Valor total:</span> R$ {totalValue.toFixed(2).replace('.', ',')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
