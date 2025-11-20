import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: string;
  value: string;
  duration: number;
}

interface ServiceSearchMultiSelectProps {
  services: Service[];
  selected: string[];
  onChange: (serviceIds: string[]) => void;
  placeholder?: string;
  label?: string;
}

export function ServiceSearchMultiSelect({
  services,
  selected,
  onChange,
  placeholder = "Digite para buscar e selecionar serviços...",
  label,
}: ServiceSearchMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrar serviços pela busca
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(search.toLowerCase()) ||
    service.category.toLowerCase().includes(search.toLowerCase())
  );

  // Serviços selecionados
  const selectedServices = services.filter((s) => selected.includes(s.id));

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (serviceId: string) => {
    if (selected.includes(serviceId)) {
      // Remover se já selecionado
      onChange(selected.filter(id => id !== serviceId));
    } else {
      // Adicionar à seleção
      onChange([...selected, serviceId]);
    }
    setSearch("");
  };

  const handleRemove = (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(id => id !== serviceId));
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </label>
      )}

      {/* Selected Services Badges */}
      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedServices.map((service) => (
            <span
              key={service.id}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500/10 dark:bg-brand-400/10 px-2.5 py-1.5 text-sm font-medium text-brand-600 dark:text-brand-400"
              data-testid={`chip-service-${service.id}`}
            >
              {service.name}
              <button
                type="button"
                onClick={(e) => handleRemove(service.id, e)}
                className="hover:text-brand-700 dark:hover:text-brand-300"
                data-testid={`button-remove-service-${service.id}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          data-testid="input-service-search"
          className="pl-10"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 max-h-60 overflow-y-auto">
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => {
              const isSelected = selected.includes(service.id);
              
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleSelect(service.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                    isSelected ? "bg-brand-50 dark:bg-brand-950/20" : ""
                  }`}
                  data-testid={`option-service-${service.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-800 dark:text-white/90'}`}>
                        {service.name}
                      </span>
                      {isSelected && (
                        <span className="text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded">
                          Selecionado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <span>{service.category}</span>
                      <span>•</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(service.value)}
                      </span>
                      <span>•</span>
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              {search ? "Nenhum serviço encontrado para sua busca" : "Digite para buscar serviços"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
