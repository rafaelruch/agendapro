import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ClientSelectorProps {
  clients: Client[];
  selectedClient: Client | null;
  onSelectClient: (client: Client) => void;
  onAddClient: () => void;
}

export function ClientSelector({
  clients,
  selectedClient,
  onSelectClient,
  onAddClient,
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-64 justify-between"
          data-testid="button-client-selector"
        >
          {selectedClient ? selectedClient.name : "Selecione um cliente"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar cliente..." data-testid="input-search-client" />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onSelectClient(client);
                    setOpen(false);
                  }}
                  data-testid={`client-item-${client.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{client.name}</span>
                    <span className="text-xs text-muted-foreground">{client.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onAddClient();
                  setOpen(false);
                }}
                data-testid="button-add-client"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar novo cliente
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
