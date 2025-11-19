import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClientDialog } from "@/components/ClientDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Appointment } from "@shared/schema";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientsPage() {
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const createClientMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/clients", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowClientDialog(false);
      setEditingClient(null);
      toast({
        title: "Cliente criado",
        description: "O cliente foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/clients/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowClientDialog(false);
      setEditingClient(null);
      toast({
        title: "Cliente atualizado",
        description: "O cliente foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const getClientAppointmentCount = (clientId: string) => {
    return appointments.filter(apt => apt.clientId === clientId).length;
  };

  const getClientLastActivity = (clientId: string) => {
    const clientAppointments = appointments
      .filter(apt => apt.clientId === clientId)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return clientAppointments[0]?.date || null;
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-bodydark2">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black dark:text-white">Clientes</h1>
          <p className="text-bodydark2">Gerencie seus clientes cadastrados</p>
        </div>
        <Button onClick={() => setShowClientDialog(true)} data-testid="button-new-client">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
        <Input
          placeholder="Buscar clientes por nome ou telefone..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
          className="pl-12"
          data-testid="input-search-clients"
        />
      </div>

      {/* TailAdmin DataTable */}
      {filteredClients.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="text-bodydark2 mb-4">
            {searchQuery ? "Nenhum cliente encontrado para sua busca." : "Nenhum cliente cadastrado."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowClientDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Cliente
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Telefone
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Agendamentos
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Status
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedClients.map((client) => {
                  const appointmentCount = getClientAppointmentCount(client.id);
                  const lastActivity = getClientLastActivity(client.id);
                  
                  return (
                    <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 rounded-full">
                            <AvatarFallback className="rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 text-sm font-medium">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {client.name}
                            </span>
                            {lastActivity && (
                              <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                Último agendamento: {format(parseISO(lastActivity), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {client.phone || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {appointmentCount} {appointmentCount === 1 ? 'agendamento' : 'agendamentos'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        <Badge
                          variant={appointmentCount > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {appointmentCount > 0 ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingClient(client);
                              setShowClientDialog(true);
                            }}
                            data-testid={`button-edit-client-${client.id}`}
                            className="hover-elevate"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir ${client.name}?`)) {
                                deleteClientMutation.mutate(client.id);
                              }
                            }}
                            data-testid={`button-delete-client-${client.id}`}
                            className="text-meta-1 hover:text-meta-1 hover-elevate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "default" : "ghost"}
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                      className="min-w-[36px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ClientDialog
        open={showClientDialog}
        onOpenChange={(open) => {
          setShowClientDialog(open);
          if (!open) setEditingClient(null);
        }}
        initialData={editingClient}
        onSave={(data) => {
          if (editingClient) {
            updateClientMutation.mutate({ id: editingClient.id, data });
          } else {
            createClientMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
