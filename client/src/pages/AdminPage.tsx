import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Users, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tenant, User } from "@shared/schema";

export default function AdminPage() {
  const { toast } = useToast();
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenantForm, setTenantForm] = useState({ name: "", email: "", phone: "" });
  const [userForm, setUserForm] = useState({ username: "", name: "", email: "", role: "admin", password: "" });

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
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

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administração Master</h1>
          <p className="text-muted-foreground">Gerenciar tenants e usuários do sistema</p>
        </div>
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
    </div>
  );
}
