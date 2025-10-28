import { useState } from "react";
import { Plus, Search, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientDialog } from "@/components/ClientDialog";

export default function ClientsPage() {
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: remove mock functionality
  const mockClients = [
    {
      id: "1",
      name: "João Silva",
      email: "joao@example.com",
      phone: "(11) 98765-4321",
      totalAppointments: 12,
      lastActivity: "2025-10-27",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@example.com",
      phone: "(11) 98765-1234",
      totalAppointments: 8,
      lastActivity: "2025-10-26",
    },
    {
      id: "3",
      name: "Pedro Oliveira",
      email: "pedro@example.com",
      phone: "(11) 98765-5678",
      totalAppointments: 15,
      lastActivity: "2025-10-28",
    },
  ];

  const filteredClients = mockClients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => setShowClientDialog(true)} data-testid="button-new-client">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-clients"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Total de Agendamentos</TableHead>
              <TableHead>Última Atividade</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.totalAppointments}</TableCell>
                <TableCell>
                  {new Date(client.lastActivity).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-client-menu-${client.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => console.log("Editar:", client.id)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log("Ver agendamentos:", client.id)}>
                        Ver Agendamentos
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => console.log("Excluir:", client.id)}
                        className="text-destructive"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ClientDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        onSave={(data) => console.log("Novo cliente:", data)}
      />
    </div>
  );
}
