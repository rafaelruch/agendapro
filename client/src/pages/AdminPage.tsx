import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Users, Trash2, Key, Copy, AlertCircle, Pencil, Calendar as CalendarIcon, Eye, Check, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiDocumentation } from "@/components/ApiDocumentation";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { MigrationsPanel } from "@/components/MigrationsPanel";
import type { Tenant, User, Appointment, Client, Service } from "@shared/schema";

type ApiToken = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  createdBy: string;
};

export default function AdminPage() {
  const baseUrl = window.location.origin;
  const { toast } = useToast();
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenantForm, setTenantForm] = useState({ name: "", email: "", phone: "" });
  const [userForm, setUserForm] = useState({ username: "", name: "", email: "", role: "admin", password: "" });
  const [tokenLabel, setTokenLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenTenantId, setTokenTenantId] = useState<string>("");
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [correctionTenantId, setCorrectionTenantId] = useState<string>("");
  const [defaultServiceId, setDefaultServiceId] = useState<string>("");
  const [orphanCount, setOrphanCount] = useState<number | null>(null);
  const [appointmentsSearch, setAppointmentsSearch] = useState("");
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const appointmentsPerPage = 10;

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: allAppointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/admin/appointments"],
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: false, // Not used in master admin context
  });

  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: false, // Not used in master admin context
  });

  const { data: tokens, isLoading: tokensLoading } = useQuery<ApiToken[]>({
    queryKey: ["/api/admin/tenants", tokenTenantId, "api-tokens"],
    enabled: !!tokenTenantId,
  });

  const createTenantMutation = useMutation({
    mutationFn: async (tenant: any) => {
      const res = await apiRequest("POST", "/api/admin/tenants", { ...tenant, active: true });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setTenantDialogOpen(false);
      setTenantForm({ name: "", email: "", phone: "" });
      toast({ title: "Tenant criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar tenant", description: error.message, variant: "destructive" });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant excluído com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir tenant", description: error.message, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async ({ tenantId, user }: { tenantId: string; user: any }) => {
      const res = await apiRequest("POST", `/api/admin/tenants/${tenantId}/users`, { ...user, active: true });
      return await res.json();
    },
    onSuccess: () => {
      setUserDialogOpen(false);
      setUserForm({ username: "", name: "", email: "", role: "admin", password: "" });
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: async ({ tenantId, label }: { tenantId: string; label: string }) => {
      const response = await fetch(`/api/admin/tenants/${tenantId}/api-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label }),
      });
      if (!response.ok) throw new Error("Failed to create token");
      return (await response.json()) as ApiToken & { token: string };
    },
    onSuccess: (data) => {
      setNewToken(data.token);
      setTokenLabel("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tokenTenantId, "api-tokens"] });
      toast({
        title: "Token criado",
        description: "Copie o token agora, ele não será exibido novamente",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar token",
        variant: "destructive",
      });
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/api-tokens/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants", tokenTenantId, "api-tokens"] });
      toast({
        title: "Token revogado",
        description: "O token foi revogado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao revogar token",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/admin/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      setAppointmentDialogOpen(false);
      setEditingAppointment(null);
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTenant = () => {
    if (!tenantForm.name || !tenantForm.email) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios", variant: "destructive" });
      return;
    }
    createTenantMutation.mutate(tenantForm);
  };

  const handleCreateUser = () => {
    if (!userForm.username || !userForm.name || !userForm.email || !userForm.password) {
      toast({ title: "Erro", description: "Todos os campos são obrigatórios", variant: "destructive" });
      return;
    }
    createUserMutation.mutate({ tenantId: selectedTenantId, user: userForm });
  };

  const openUserDialog = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setUserDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Token copiado para a área de transferência",
    });
  };

  const handleCreateToken = () => {
    if (!tokenTenantId) {
      toast({
        title: "Erro",
        description: "Selecione um tenant primeiro",
        variant: "destructive",
      });
      return;
    }
    if (!tokenLabel.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o token",
        variant: "destructive",
      });
      return;
    }
    createTokenMutation.mutate({ tenantId: tokenTenantId, label: tokenLabel });
  };

  const checkOrphansMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await apiRequest("GET", `/api/admin/orphan-appointments/${tenantId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      setOrphanCount(data.count);
      toast({
        title: `${data.count} agendamento(s) órfão(s)`,
        description: data.count > 0 ? "Encontrados agendamentos sem serviços associados" : "Todos os agendamentos estão corretos",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao verificar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fixOrphansMutation = useMutation({
    mutationFn: async ({ tenantId, defaultServiceId }: { tenantId: string; defaultServiceId: string }) => {
      const res = await apiRequest("POST", `/api/admin/fix-orphan-appointments/${tenantId}`, { defaultServiceId });
      return await res.json();
    },
    onSuccess: (data) => {
      setOrphanCount(null);
      toast({
        title: "Correção concluída!",
        description: data.message,
      });
      setDefaultServiceId("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao corrigir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckOrphans = () => {
    if (!correctionTenantId) {
      toast({
        title: "Erro",
        description: "Selecione um tenant primeiro",
        variant: "destructive",
      });
      return;
    }
    checkOrphansMutation.mutate(correctionTenantId);
  };

  const handleFixOrphans = () => {
    if (!correctionTenantId) {
      toast({
        title: "Erro",
        description: "Selecione um tenant primeiro",
        variant: "destructive",
      });
      return;
    }
    if (!defaultServiceId.trim()) {
      toast({
        title: "Erro",
        description: "Digite o ID do serviço padrão",
        variant: "destructive",
      });
      return;
    }
    fixOrphansMutation.mutate({ tenantId: correctionTenantId, defaultServiceId });
  };

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administração Master</h1>
        <p className="text-muted-foreground">Gerenciar tenants, usuários e tokens de API do sistema</p>
      </div>

      <Tabs defaultValue="tenants" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="tokens">Tokens de API</TabsTrigger>
          <TabsTrigger value="migrations">Migrations</TabsTrigger>
          <TabsTrigger value="correction">Correção</TabsTrigger>
          <TabsTrigger value="docs">Documentação API</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gerencie os clientes (tenants) do sistema</p>
            <Button onClick={() => setTenantDialogOpen(true)} data-testid="button-new-tenant">
              <Plus className="w-4 h-4 mr-2" />
              Novo Tenant
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {tenants.map((tenant) => (
              <Card key={tenant.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle>{tenant.name}</CardTitle>
                        <CardDescription>{tenant.email}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={tenant.active ? "default" : "secondary"}>
                      {tenant.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tenant.phone && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Telefone:</strong> {tenant.phone}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openUserDialog(tenant.id)}
                      data-testid={`button-add-user-${tenant.id}`}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Adicionar Usuário
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o tenant "${tenant.name}"?`)) {
                          deleteTenantMutation.mutate(tenant.id);
                        }
                      }}
                      data-testid={`button-delete-tenant-${tenant.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-bodydark2">Visualize e edite agendamentos de todos os tenants</p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
            <Input
              placeholder="Buscar por cliente, tenant ou status..."
              value={appointmentsSearch}
              onChange={(e) => {
                setAppointmentsSearch(e.target.value);
                setAppointmentsPage(1);
              }}
              className="pl-12"
              data-testid="input-search-appointments"
            />
          </div>

          {appointmentsLoading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-bodydark2">Carregando agendamentos...</p>
            </div>
          ) : (() => {
            const formatDate = (dateStr: string) => {
              const [year, month, day] = dateStr.split('-');
              return `${day}/${month}/${year}`;
            };

            const filteredAppointments = allAppointments.filter((apt) => {
              const tenant = tenants.find(t => t.id === apt.tenantId);
              const searchLower = appointmentsSearch.toLowerCase();
              return (
                apt.clientId.toLowerCase().includes(searchLower) ||
                (tenant?.name || "").toLowerCase().includes(searchLower) ||
                apt.status.toLowerCase().includes(searchLower) ||
                formatDate(apt.date).includes(searchLower)
              );
            });

            const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);
            const startIndex = (appointmentsPage - 1) * appointmentsPerPage;
            const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + appointmentsPerPage);

            if (filteredAppointments.length === 0) {
              return (
                <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
                  <p className="text-bodydark2 mb-4">
                    {appointmentsSearch ? "Nenhum agendamento encontrado para sua busca." : "Nenhum agendamento encontrado."}
                  </p>
                </div>
              );
            }

            return (
              <>
                {/* TailAdmin DataTable */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                        <tr>
                          <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                            Data
                          </th>
                          <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                            Horário
                          </th>
                          <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                            Cliente ID
                          </th>
                          <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                            Status
                          </th>
                          <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                            Tenant
                          </th>
                          <th className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {paginatedAppointments.map((appointment) => {
                          const tenant = tenants.find(t => t.id === appointment.tenantId);
                          
                          return (
                            <tr key={appointment.id} data-testid={`row-appointment-${appointment.id}`}>
                              <td className="px-5 py-4 sm:px-6">
                                <span className="text-gray-800 text-theme-sm dark:text-white/90">
                                  {formatDate(appointment.date)}
                                </span>
                              </td>
                              <td className="px-5 py-4 sm:px-6">
                                <span className="text-gray-800 text-theme-sm dark:text-white/90">
                                  {appointment.time}
                                </span>
                              </td>
                              <td className="px-5 py-4 sm:px-6">
                                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                  {appointment.clientId.substring(0, 8)}...
                                </span>
                              </td>
                              <td className="px-5 py-4 sm:px-6">
                                <Badge
                                  color={
                                    appointment.status === "completed" ? "success" :
                                    appointment.status === "scheduled" ? "warning" :
                                    "error"
                                  }
                                  size="sm"
                                >
                                  {appointment.status === "completed" ? "Concluído" :
                                   appointment.status === "scheduled" ? "Agendado" :
                                   "Cancelado"}
                                </Badge>
                              </td>
                              <td className="px-5 py-4 sm:px-6">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {tenant?.name || appointment.tenantId.substring(0, 8)}
                                </span>
                              </td>
                              <td className="px-5 py-4 sm:px-6">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingAppointment(appointment);
                                      setAppointmentDialogOpen(true);
                                    }}
                                    className="text-brand-500 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                                    data-testid={`button-view-${appointment.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {appointment.status !== "completed" && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={async () => {
                                        try {
                                          await apiRequest("PATCH", `/api/admin/appointments/${appointment.id}/status`, { status: "completed" });
                                          queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
                                          toast({ title: "Sucesso", description: "Agendamento concluído com sucesso!" });
                                        } catch (error) {
                                          toast({ title: "Erro", description: "Erro ao concluir agendamento", variant: "destructive" });
                                        }
                                      }}
                                      className="text-success-600 hover:bg-success-50 hover:text-success-700 dark:text-success-500 dark:hover:bg-success-500/10"
                                      data-testid={`button-complete-${appointment.id}`}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {appointment.status !== "cancelled" && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={async () => {
                                        try {
                                          await apiRequest("PATCH", `/api/admin/appointments/${appointment.id}/status`, { status: "cancelled" });
                                          queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
                                          toast({ title: "Sucesso", description: "Agendamento cancelado com sucesso!" });
                                        } catch (error) {
                                          toast({ title: "Erro", description: "Erro ao cancelar agendamento", variant: "destructive" });
                                        }
                                      }}
                                      className="text-error-600 hover:bg-error-50 hover:text-error-700 dark:text-error-500 dark:hover:bg-error-500/10"
                                      data-testid={`button-cancel-${appointment.id}`}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-4 dark:border-white/[0.05] dark:bg-white/[0.03] rounded-b-xl">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + appointmentsPerPage, filteredAppointments.length)} de {filteredAppointments.length} agendamentos
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAppointmentsPage(p => Math.max(1, p - 1))}
                        disabled={appointmentsPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-800 dark:text-white/90">
                        Página {appointmentsPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAppointmentsPage(p => Math.min(totalPages, p + 1))}
                        disabled={appointmentsPage === totalPages}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="tokens" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tokens de API por Tenant</CardTitle>
              <CardDescription>
                Gere e gerencie tokens de API para cada tenant. Estes tokens permitem integração com N8N, Zapier e outras ferramentas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Selecione um tenant abaixo para visualizar e gerenciar seus tokens de API.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Selecionar Tenant</Label>
                <Select value={tokenTenantId} onValueChange={setTokenTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tokenTenantId && (
                <>
                  {newToken && (
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription className="space-y-2">
                        <p className="font-semibold">Token criado com sucesso! Copie agora:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                            {newToken}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(newToken)}
                            data-testid="button-copy-new-token"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Este token não será exibido novamente. Guarde-o em local seguro.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="token-label">Criar novo token</Label>
                    <div className="flex gap-2">
                      <Input
                        id="token-label"
                        placeholder="Ex: N8N Produção"
                        value={tokenLabel}
                        onChange={(e) => setTokenLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateToken()}
                        data-testid="input-token-label"
                      />
                      <Button 
                        onClick={handleCreateToken}
                        disabled={createTokenMutation.isPending}
                        data-testid="button-create-token"
                      >
                        {createTokenMutation.isPending ? "Criando..." : "Criar Token"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tokens ativos</Label>
                    {tokensLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando tokens...</p>
                    ) : tokens && tokens.length > 0 ? (
                      <div className="space-y-2">
                        {tokens.map((token) => (
                          <div
                            key={token.id}
                            className="flex items-center justify-between p-3 border rounded-md"
                            data-testid={`token-item-${token.id}`}
                          >
                            <div className="flex-1">
                              <p className="font-medium">{token.label}</p>
                              <p className="text-xs text-muted-foreground">
                                Criado em {new Date(token.createdAt).toLocaleDateString('pt-BR')}
                                {token.lastUsedAt && ` • Último uso: ${new Date(token.lastUsedAt).toLocaleDateString('pt-BR')}`}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => revokeTokenMutation.mutate(token.id)}
                              disabled={revokeTokenMutation.isPending}
                              data-testid={`button-revoke-${token.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum token ativo para este tenant</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migrations" className="mt-6">
          <MigrationsPanel />
        </TabsContent>

        <TabsContent value="correction" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Correção de Agendamentos Órfãos</CardTitle>
              <CardDescription>
                Agendamentos órfãos são agendamentos que não possuem nenhum serviço associado.
                Isso pode acontecer quando dados são importados incorretamente ou há problemas na criação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como funciona:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Selecione o tenant que deseja verificar</li>
                    <li>Clique em "Verificar Órfãos" para ver quantos agendamentos estão sem serviços</li>
                    <li>Se houver órfãos, digite o ID de um serviço padrão para associar</li>
                    <li>Clique em "Corrigir Órfãos" para aplicar a correção</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="correction-tenant">Selecione o Tenant</Label>
                  <Select value={correctionTenantId} onValueChange={setCorrectionTenantId}>
                    <SelectTrigger id="correction-tenant" data-testid="select-correction-tenant">
                      <SelectValue placeholder="Selecione um tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCheckOrphans}
                    disabled={!correctionTenantId || checkOrphansMutation.isPending}
                    data-testid="button-check-orphans"
                  >
                    {checkOrphansMutation.isPending ? "Verificando..." : "Verificar Órfãos"}
                  </Button>
                  
                  {orphanCount !== null && (
                    <Badge variant={orphanCount > 0 ? "destructive" : "default"} className="text-base px-4 py-2">
                      {orphanCount} órfão(s) encontrado(s)
                    </Badge>
                  )}
                </div>

                {orphanCount !== null && orphanCount > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Atenção:</strong> Encontrados {orphanCount} agendamento(s) sem serviços associados.
                        Digite o ID de um serviço padrão para associar a todos eles.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="default-service-id">ID do Serviço Padrão</Label>
                      <Input
                        id="default-service-id"
                        value={defaultServiceId}
                        onChange={(e) => setDefaultServiceId(e.target.value)}
                        placeholder="Ex: fe45fbbd-832f-49ec-b926-19195cb9e361"
                        data-testid="input-default-service-id"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Dica: Você pode obter o ID de um serviço acessando a aba de Serviços do tenant
                        ou consultando diretamente no banco de dados.
                      </p>
                    </div>

                    <Button
                      onClick={handleFixOrphans}
                      disabled={!defaultServiceId.trim() || fixOrphansMutation.isPending}
                      variant="destructive"
                      data-testid="button-fix-orphans"
                    >
                      {fixOrphansMutation.isPending ? "Corrigindo..." : "Corrigir Órfãos"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <ApiDocumentation />
        </TabsContent>
      </Tabs>

      {/* Modal para criar tenant */}
      <Modal isOpen={tenantDialogOpen} onClose={() => setTenantDialogOpen(false)} className="sm:max-w-[425px]">
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Novo Tenant</h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Criar um novo cliente para usar o sistema</p>
        </div>
        <div className="space-y-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nome *</Label>
              <Input
                id="tenant-name"
                value={tenantForm.name}
                onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                placeholder="Nome da empresa"
                data-testid="input-tenant-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-email">Email *</Label>
              <Input
                id="tenant-email"
                type="email"
                value={tenantForm.email}
                onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                placeholder="contato@empresa.com"
                data-testid="input-tenant-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-phone">Telefone</Label>
              <Input
                id="tenant-phone"
                value={tenantForm.phone}
                onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                data-testid="input-tenant-phone"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button variant="outline" onClick={() => setTenantDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTenant} disabled={createTenantMutation.isPending} data-testid="button-save-tenant">
              Criar Tenant
            </Button>
          </div>
      </Modal>

      {/* Modal para criar usuário */}
      <Modal isOpen={userDialogOpen} onClose={() => setUserDialogOpen(false)} className="sm:max-w-[425px]">
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Novo Usuário</h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Criar um usuário para o tenant selecionado</p>
        </div>
        <div className="space-y-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <div className="space-y-2">
              <Label htmlFor="user-username">Usuário *</Label>
              <Input
                id="user-username"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="usuario"
                data-testid="input-user-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">Nome Completo *</Label>
              <Input
                id="user-name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="João Silva"
                data-testid="input-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="joao@empresa.com"
                data-testid="input-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Senha *</Label>
              <Input
                id="user-password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Digite a senha"
                data-testid="input-user-password"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending} data-testid="button-save-user">
              Criar Usuário
            </Button>
          </div>
      </Modal>

      {/* Dialog para editar agendamento */}
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={(open) => {
          setAppointmentDialogOpen(open);
          if (!open) setEditingAppointment(null);
        }}
        clients={[]} // Master admin doesn't need client list for editing
        services={[]} // Master admin doesn't need service list for editing
        initialData={editingAppointment || undefined}
        onSave={(data) => {
          if (editingAppointment) {
            updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
          }
        }}
      />
    </div>
  );
}
