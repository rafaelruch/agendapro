import { useState } from "react";
import { Search, Eye, Clock, ChefHat, Check, Truck, XCircle, Plus, Printer } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS_LABELS, type OrderWithDetails, type OrderStatus, type PaymentMethod } from "@shared/schema";
import { OrderDialog } from "@/components/OrderDialog";
import { printThermalReceipt } from "@/components/ThermalReceipt";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<OrderStatus, { color: string; icon: any }> = {
  pending: { color: "bg-yellow-500", icon: Clock },
  preparing: { color: "bg-warning", icon: ChefHat },
  ready: { color: "bg-success", icon: Check },
  delivered: { color: "bg-primary", icon: Truck },
  cancelled: { color: "bg-meta-1", icon: XCircle },
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: {
      client: { name: string; phone: string };
      items: { productId: string; quantity: number }[];
      paymentMethod: PaymentMethod;
      notes?: string;
      deliveryAddress?: {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        zipCode?: string;
        reference?: string;
      };
    }) => apiRequest("POST", "/api/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      setDialogOpen(false);
      toast({
        title: "Pedido criado",
        description: "O pedido foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/orders/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Pedido cancelado",
        description: "O pedido foi cancelado e o estoque restaurado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders.filter((order) => {
    const clientName = order.client?.name || "";
    const clientPhone = order.client?.phone || "";
    
    const matchesSearch =
      !searchQuery ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientPhone.includes(searchQuery) ||
      String(order.orderNumber).includes(searchQuery);

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      pending: "preparing",
      preparing: "ready",
      ready: "delivered",
      delivered: null,
      cancelled: null,
    };
    return flow[currentStatus];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white" data-testid="text-page-title">
            Pedidos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie os pedidos do seu delivery
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-order">
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
            <Input
              type="text"
              placeholder="Buscar por cliente ou número..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-12"
              data-testid="input-search"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="preparing">Em Preparo</SelectItem>
              <SelectItem value="ready">Pronto</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredOrders.length} pedido(s) encontrado(s)
        </div>
      </div>

      {paginatedOrders.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <Clock className="mx-auto h-12 w-12 text-bodydark2 mb-4" />
          <p className="text-bodydark2 mb-4">
            {searchQuery || statusFilter !== "all"
              ? "Nenhum pedido encontrado com os critérios de busca."
              : "Nenhum pedido registrado ainda."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Pedido
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Cliente
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Itens
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Total
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                      Status
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {paginatedOrders.map((order) => {
                    const StatusIcon = statusConfig[order.status as OrderStatus]?.icon || Clock;
                    const nextStatus = getNextStatus(order.status as OrderStatus);
                    
                    return (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div>
                            <p className="text-gray-800 text-theme-sm dark:text-white/90 font-bold">
                              #{order.orderNumber}
                            </p>
                            <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div>
                            <p className="text-gray-800 text-theme-sm dark:text-white/90">
                              {order.client?.name || "Cliente não informado"}
                            </p>
                            <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                              {order.client?.phone || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="max-w-xs">
                            {(order.items || []).slice(0, 2).map((item, idx) => (
                              <p key={idx} className="text-gray-800 text-theme-xs dark:text-white/90 truncate">
                                {item.quantity}x {item.product?.name || "Produto"}
                              </p>
                            ))}
                            {(order.items?.length || 0) > 2 && (
                              <p className="text-gray-500 text-theme-xs dark:text-gray-400">
                                +{order.items.length - 2} mais
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <span className="text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                            {formatCurrency(order.total)}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge
                            className={`${statusConfig[order.status as OrderStatus]?.color || 'bg-gray-500'} text-white`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => printThermalReceipt(order)}
                              className="text-gray-500 hover:text-gray-700"
                              data-testid={`button-print-${order.id}`}
                              title="Imprimir pedido"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {nextStatus && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: order.id, status: nextStatus })}
                                disabled={updateStatusMutation.isPending}
                                className={`text-xs text-white ${
                                  nextStatus === "preparing" 
                                    ? "bg-warning hover:bg-warning/90" 
                                    : nextStatus === "ready" 
                                    ? "bg-success hover:bg-success/90" 
                                    : nextStatus === "delivered" 
                                    ? "bg-primary hover:bg-primary/90" 
                                    : ""
                                }`}
                                data-testid={`button-next-status-${order.id}`}
                              >
                                {ORDER_STATUS_LABELS[nextStatus]}
                              </Button>
                            )}
                            {order.status !== "cancelled" && order.status !== "delivered" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja cancelar este pedido?")) {
                                    cancelOrderMutation.mutate(order.id);
                                  }
                                }}
                                className="text-meta-1 hover:text-meta-1"
                                disabled={cancelOrderMutation.isPending}
                                data-testid={`button-cancel-${order.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} até{" "}
                {Math.min(currentPage * itemsPerPage, filteredOrders.length)} de{" "}
                {filteredOrders.length} pedidos
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
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
                      className="min-w-[36px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <OrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => createOrderMutation.mutate(data)}
        isLoading={createOrderMutation.isPending}
      />
    </div>
  );
}
