import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface ClientSearchSelectProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
}

export function ClientSearchSelect({
  clients,
  value,
  onChange,
  placeholder = "Buscar e selecionar cliente...",
}: ClientSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrar clientes
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  // Cliente selecionado
  const selectedClient = clients.find((c) => c.id === value);

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

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        type="text"
        placeholder={selectedClient?.name || placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        data-testid="input-client-search"
        className="w-full"
      />

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 max-h-60 overflow-y-auto">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid={`option-client-${client.id}`}
              >
                <Check
                  className={`h-4 w-4 ${
                    value === client.id ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="text-gray-800 dark:text-white/90">{client.name}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
