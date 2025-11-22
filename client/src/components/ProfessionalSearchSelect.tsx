import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface Professional {
  id: string;
  name: string;
  serviceIds: string[];
}

interface ProfessionalSearchSelectProps {
  professionals: Professional[];
  value: string;
  onChange: (professionalId: string) => void;
  placeholder?: string;
  filterByServices?: string[];
}

export function ProfessionalSearchSelect({
  professionals,
  value,
  onChange,
  placeholder = "Buscar e selecionar profissional...",
  filterByServices = [],
}: ProfessionalSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProfessionals = professionals.filter((professional) => {
    const matchesSearch = professional.name.toLowerCase().includes(search.toLowerCase());
    
    if (filterByServices.length === 0) {
      return matchesSearch;
    }
    
    const canPerformAllServices = filterByServices.every(serviceId =>
      professional.serviceIds.includes(serviceId)
    );
    
    return matchesSearch && canPerformAllServices;
  });

  const selectedProfessional = professionals.find((p) => p.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (professionalId: string) => {
    onChange(professionalId);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        type="text"
        placeholder={selectedProfessional?.name || placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        data-testid="input-professional-search"
        className="w-full"
      />

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 max-h-60 overflow-y-auto">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700"
              data-testid="option-professional-none"
            >
              <span className="text-gray-500 dark:text-gray-400 italic">Sem profissional</span>
            </button>
          )}
          {filteredProfessionals.length > 0 ? (
            filteredProfessionals.map((professional) => (
              <button
                key={professional.id}
                type="button"
                onClick={() => handleSelect(professional.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid={`option-professional-${professional.id}`}
              >
                <Check
                  className={`h-4 w-4 ${
                    value === professional.id ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="text-gray-800 dark:text-white/90">{professional.name}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              {filterByServices.length > 0
                ? "Nenhum profissional encontrado que realiza todos os serviços selecionados"
                : "Nenhum profissional encontrado"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
