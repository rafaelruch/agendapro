import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Users, Trash2, Key, Copy, AlertCircle, Pencil, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiDocumentation } from "@/components/ApiDocumentation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppointmentDialog } from "@/components/AppointmentDialog";
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="tokens">Tokens de API</TabsTrigger>
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
            <p className="text-sm text-muted-foreground">Visualize e edite agendamentos de todos os tenants</p>
          </div>

          {appointmentsLoading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Carregando agendamentos...</p>
            </div>
          ) : allAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Cliente ID</TableHead>
                    <TableHead>Serviço ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAppointments.map((appointment) => {
                    const tenant = tenants.find(t => t.id === appointment.tenantId);
                    const formatDate = (dateStr: string) => {
                      const [year, month, day] = dateStr.split('-');
                      return `${day}/${month}/${year}`;
                    };
                    return (
                      <TableRow key={appointment.id}>
                        <TableCell>{formatDate(appointment.date)}</TableCell>
                        <TableCell>{appointment.time}</TableCell>
                        <TableCell className="font-mono text-xs">{appointment.clientId.substring(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">
                          {appointment.serviceId ? `${appointment.serviceId.substring(0, 8)}...` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={appointment.status === 'completed' ? 'secondary' : 'default'}>
                            {appointment.status === 'completed' ? 'Concluído' : appointment.status === 'scheduled' ? 'Agendado' : 'Cancelado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tenant?.name || appointment.tenantId.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingAppointment(appointment);
                              setAppointmentDialogOpen(true);
                            }}
                            data-testid={`button-edit-appointment-${appointment.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
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

        <TabsContent value="docs" className="mt-6">
          <ApiDocumentation />
        </TabsContent>
      </Tabs>

      {/* Dialog para criar tenant */}
      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tenant</DialogTitle>
            <DialogDescription>Criar um novo cliente para usar o sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setTenantDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTenant} disabled={createTenantMutation.isPending} data-testid="button-save-tenant">
              Criar Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar usuário */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Criar um usuário para o tenant selecionado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending} data-testid="button-save-user">
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar agendamento */}
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={(open) => {
          setAppointmentDialogOpen(open);
          if (!open) setEditingAppointment(null);
        }}
        clients={[]} // Master admin doesn't need client list for editing
        services={[]} // Master admin doesn't need service list for editing
        initialData={editingAppointment}
        onSave={(data) => {
          if (editingAppointment) {
            updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
          }
        }}
      />
    </div>
  );
}
