import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Webhook, 
  Pencil, 
  Trash2, 
  Eye, 
  History,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeText } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { 
  Webhook as WebhookType, 
  WebhookDelivery,
  WebhookModule,
  WebhookEvent 
} from "@shared/schema";
import { 
  WEBHOOK_MODULES, 
  WEBHOOK_MODULE_LABELS, 
  WEBHOOK_EVENTS, 
  WEBHOOK_EVENT_LABELS 
} from "@shared/schema";

interface WebhookWithStats extends WebhookType {
  deliveryStats?: {
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
}

export default function WebhooksPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [showDeliveriesDialog, setShowDeliveriesDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    targetUrl: "",
    secret: "",
    modules: [] as string[],
    events: [] as string[],
    isActive: true,
  });

  const { data: webhooks = [], isLoading } = useQuery<WebhookWithStats[]>({
    queryKey: ["/api/webhooks"],
  });

  const { data: deliveries = [], isLoading: deliveriesLoading, refetch: refetchDeliveries } = useQuery<WebhookDelivery[]>({
    queryKey: ["/api/webhooks", selectedWebhookId, "deliveries"],
    enabled: !!selectedWebhookId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webhooks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setShowDialog(false);
      setEditingWebhook(null);
      resetForm();
      toast({
        title: "Webhook criado",
        description: "O webhook foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/webhooks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setShowDialog(false);
      setEditingWebhook(null);
      resetForm();
      toast({
        title: "Webhook atualizado",
        description: "O webhook foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Webhook excluído",
        description: "O webhook foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (deliveryId: string) => 
      apiRequest("POST", `/api/webhooks/deliveries/${deliveryId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks", selectedWebhookId, "deliveries"] });
      toast({
        title: "Webhook reenviado",
        description: "A entrega será reprocessada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reenviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredWebhooks = searchQuery
    ? webhooks.filter((w) => 
        normalizeText(w.name).includes(normalizeText(searchQuery)) ||
        normalizeText(w.targetUrl).includes(normalizeText(searchQuery))
      )
    : webhooks;

  const totalPages = Math.ceil(filteredWebhooks.length / itemsPerPage);
  const paginatedWebhooks = filteredWebhooks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetForm = () => {
    setFormData({
      name: "",
      targetUrl: "",
      secret: "",
      modules: [],
      events: [],
      isActive: true,
    });
  };

  const handleEdit = (webhook: WebhookType) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      targetUrl: webhook.targetUrl,
      secret: webhook.secret || "",
      modules: webhook.modules || [],
      events: webhook.events || [],
      isActive: webhook.active,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este webhook? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDeliveries = (webhookId: string) => {
    setSelectedWebhookId(webhookId);
    setShowDeliveriesDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.modules.length === 0) {
      toast({
        title: "Selecione ao menos um módulo",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.events.length === 0) {
      toast({
        title: "Selecione ao menos um evento",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: formData.name,
      targetUrl: formData.targetUrl,
      secret: formData.secret || null,
      modules: formData.modules,
      events: formData.events,
      active: formData.isActive,
    };

    if (editingWebhook) {
      updateMutation.mutate({ id: editingWebhook.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleModule = (module: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter(m => m !== module)
        : [...prev.modules, module]
    }));
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const selectAllModules = () => {
    setFormData(prev => ({
      ...prev,
      modules: [...WEBHOOK_MODULES]
    }));
  };

  const selectAllEvents = () => {
    setFormData(prev => ({
      ...prev,
      events: [...WEBHOOK_EVENTS]
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Sucesso</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Falhou</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pendente</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white" data-testid="text-page-title">
            Webhooks
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configure webhooks para integrar com N8N e outras ferramentas de automação
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingWebhook(null);
            resetForm();
            setShowDialog(true);
          }}
          className="gap-2"
          data-testid="button-add-webhook"
        >
          <Plus className="h-4 w-4" />
          Novo Webhook
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
          <Input
            type="text"
            placeholder="Buscar webhooks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-12"
            data-testid="input-search"
          />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredWebhooks.length} webhook(s)
        </div>
      </div>

      {filteredWebhooks.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <Webhook className="mx-auto h-12 w-12 text-bodydark2 mb-4" />
          <p className="text-bodydark2 mb-4">
            {searchQuery
              ? "Nenhum webhook encontrado."
              : "Nenhum webhook cadastrado ainda."}
          </p>
          {!searchQuery && (
            <Button onClick={() => {
              setEditingWebhook(null);
              resetForm();
              setShowDialog(true);
            }}>
              Criar Primeiro Webhook
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Nome
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    URL
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Módulos
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Eventos
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                    Status
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedWebhooks.map((webhook) => (
                  <TableRow key={webhook.id} data-testid={`row-webhook-${webhook.id}`}>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-4 w-4 text-primary" />
                        <span className="font-medium text-gray-800 dark:text-white" data-testid={`text-webhook-name-${webhook.id}`}>
                          {webhook.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate max-w-[200px]">
                          {webhook.targetUrl}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(webhook.targetUrl)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex flex-wrap gap-1">
                        {webhook.modules?.slice(0, 2).map((module) => (
                          <Badge key={module} variant="secondary" className="text-xs">
                            {WEBHOOK_MODULE_LABELS[module as WebhookModule] || module}
                          </Badge>
                        ))}
                        {webhook.modules && webhook.modules.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.modules.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events?.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {WEBHOOK_EVENT_LABELS[event as WebhookEvent] || event}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      {webhook.active ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewDeliveries(webhook.id)}
                          title="Ver histórico de entregas"
                          data-testid={`button-view-deliveries-${webhook.id}`}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(webhook)}
                          title="Editar"
                          data-testid={`button-edit-${webhook.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(webhook.id)}
                          title="Excluir"
                          data-testid={`button-delete-${webhook.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                {Math.min(currentPage * itemsPerPage, filteredWebhooks.length)} de{" "}
                {filteredWebhooks.length} webhooks
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showDialog} onClose={() => setShowDialog(false)}>
        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white" data-testid="text-dialog-title">
              {editingWebhook ? "Editar Webhook" : "Novo Webhook"}
            </h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Configure o webhook para receber notificações de eventos do sistema.
            </p>
          </div>

          <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Webhook *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: N8N - Novos Clientes"
                data-testid="input-webhook-name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetUrl">URL de Destino *</Label>
              <Input
                id="targetUrl"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                placeholder="https://n8n.exemplo.com/webhook/..."
                data-testid="input-webhook-url"
                required
              />
              <p className="text-xs text-gray-500">
                URL onde as requisições POST serão enviadas.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secret">Secret (Opcional)</Label>
              <Input
                id="secret"
                type="password"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="Chave secreta para assinatura HMAC"
                data-testid="input-webhook-secret"
              />
              <p className="text-xs text-gray-500">
                Se definido, o header X-AgendaPro-Signature será enviado com assinatura HMAC-SHA256.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Módulos *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllModules}
                >
                  Selecionar Todos
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                {WEBHOOK_MODULES.map((module) => (
                  <label
                    key={module}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Checkbox
                      checked={formData.modules.includes(module)}
                      onCheckedChange={() => toggleModule(module)}
                      data-testid={`checkbox-module-${module}`}
                    />
                    <span className="text-sm">{WEBHOOK_MODULE_LABELS[module]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Eventos *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllEvents}
                >
                  Selecionar Todos
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Checkbox
                      checked={formData.events.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                      data-testid={`checkbox-event-${event}`}
                    />
                    <span className="text-sm">{WEBHOOK_EVENT_LABELS[event]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Status</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Webhooks inativos não enviarão notificações
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-webhook-active"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-webhook"
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeliveriesDialog} onClose={() => {
        setShowDeliveriesDialog(false);
        setSelectedWebhookId(null);
      }}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Histórico de Entregas
              </h3>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                Últimas {deliveries.length} entregas do webhook
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => refetchDeliveries()}
              disabled={deliveriesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${deliveriesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="px-6 pb-6 sm:px-9.5 sm:pb-9.5 max-h-[60vh] overflow-y-auto">
          {deliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma entrega registrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(delivery.status)}
                      {getStatusBadge(delivery.status)}
                      <Badge variant="outline" className="text-xs">
                        {WEBHOOK_MODULE_LABELS[delivery.module as WebhookModule] || delivery.module}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {WEBHOOK_EVENT_LABELS[delivery.event as WebhookEvent] || delivery.event}
                      </Badge>
                    </div>
                    {delivery.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryMutation.mutate(delivery.id)}
                        disabled={retryMutation.isPending}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reenviar
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Enviado: {new Date(delivery.createdAt!).toLocaleString('pt-BR')}</p>
                    {delivery.responseStatus && (
                      <p>Status HTTP: {delivery.responseStatus}</p>
                    )}
                    {delivery.attemptCount && delivery.attemptCount > 1 && (
                      <p>Tentativas: {delivery.attemptCount}</p>
                    )}
                    {delivery.errorMessage && (
                      <p className="text-red-500">Erro: {delivery.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowDeliveriesDialog(false);
              setSelectedWebhookId(null);
            }}
          >
            Fechar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
