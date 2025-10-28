import { useState } from "react";
import { ClientSelector } from "../ClientSelector";

const mockClients = [
  { id: "1", name: "João Silva", email: "joao@example.com" },
  { id: "2", name: "Maria Santos", email: "maria@example.com" },
  { id: "3", name: "Pedro Oliveira", email: "pedro@example.com" },
];

export default function ClientSelectorExample() {
  const [selectedClient, setSelectedClient] = useState(mockClients[0]);

  return (
    <ClientSelector
      clients={mockClients}
      selectedClient={selectedClient}
      onSelectClient={(client) => {
        setSelectedClient(client);
        console.log("Cliente selecionado:", client);
      }}
      onAddClient={() => console.log("Adicionar novo cliente")}
    />
  );
}
