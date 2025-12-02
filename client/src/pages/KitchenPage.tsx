import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS_LABELS, type OrderWithDetails, type OrderStatus } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, ChefHat, Check, XCircle, RefreshCw, Printer } from "lucide-react";
import { printThermalReceipt } from "@/components/ThermalReceipt";

const statusConfig: Record<string, { bgColor: string; borderColor: string; textColor: string }> = {
  pending: { bgColor: "bg-yellow-50 dark:bg-yellow-900/20", borderColor: "border-yellow-400", textColor: "text-yellow-700 dark:text-yellow-300" },
  preparing: { bgColor: "bg-blue-50 dark:bg-blue-900/20", borderColor: "border-blue-400", textColor: "text-blue-700 dark:text-blue-300" },
  ready: { bgColor: "bg-green-50 dark:bg-green-900/20", borderColor: "border-green-400", textColor: "text-green-700 dark:text-green-300" },
};

export default function KitchenPage() {
  const { toast } = useToast();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [transitioningOrders, setTransitioningOrders] = useState<Set<string>>(new Set());

  const { data: orders = [], isLoading, refetch } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders/active"],
    refetchInterval: 5000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      setTransitioningOrders(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setUpdatingOrderId(null);
    },
    onError: (error: Error, variables) => {
      setTransitioningOrders(prev => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
      setUpdatingOrderId(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
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

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  const formatTime = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "HH:mm", { locale: ptBR });
  };

  const getElapsedTime = (date: Date | string | null): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h${mins}min`;
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const handleNextStatus = (order: OrderWithDetails) => {
    const nextStatus: Record<string, OrderStatus> = {
      pending: "preparing",
      preparing: "ready",
      ready: "delivered",
    };
    const next = nextStatus[order.status];
    if (next) {
      setUpdatingOrderId(order.id);
      setTransitioningOrders(prev => new Set(prev).add(order.id));
      updateStatusMutation.mutate({ id: order.id, status: next });
    }
  };

  const getTransitionColor = (orderId: string, currentStatus: string): string => {
    if (!transitioningOrders.has(orderId)) return "";
    
    const nextColors: Record<string, string> = {
      pending: "!bg-blue-200 dark:!bg-blue-800/50 !border-blue-500",
      preparing: "!bg-green-200 dark:!bg-green-800/50 !border-green-500",
      ready: "!bg-gray-200 dark:!bg-gray-800/50 !border-gray-500",
    };
    return nextColors[currentStatus] || "";
  };

  const OrderCard = ({ order, showNextButton = true }: { order: OrderWithDetails; showNextButton?: boolean }) => {
    const config = statusConfig[order.status] || statusConfig.pending;
    const elapsed = getElapsedTime(order.createdAt);
    const isLate = order.createdAt && (new Date().getTime() - new Date(order.createdAt).getTime()) > 15 * 60 * 1000;
    const transitionClass = getTransitionColor(order.id, order.status);
    const isUpdating = updatingOrderId === order.id;

    return (
      <div
        className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-4 transition-all duration-300 hover:shadow-lg ${transitionClass} ${isUpdating ? "scale-95 opacity-80" : ""}`}
        data-testid={`card-order-${order.id}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">
              #{order.orderNumber}
            </span>
            {isLate && (
              <Badge className="bg-red-500 text-white animate-pulse">
                ATRASADO
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {formatTime(order.createdAt)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {elapsed}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <p className="font-semibold text-gray-800 dark:text-white text-lg">
            {order.client.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {order.client.phone}
          </p>
        </div>

        <div className="space-y-1 mb-3 bg-white/50 dark:bg-black/20 rounded-md p-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="font-medium text-gray-800 dark:text-white">
                {item.quantity}x {item.product.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {formatCurrency(parseFloat(String(item.unitPrice)) * item.quantity)}
              </span>
            </div>
          ))}
          {order.notes && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                "{order.notes}"
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-gray-800 dark:text-white">
            {formatCurrency(order.total)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => printThermalReceipt(order)}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              data-testid={`button-print-${order.id}`}
              title="Imprimir pedido"
            >
              <Printer className="h-4 w-4" />
            </Button>
            {order.status !== "ready" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Cancelar este pedido?")) {
                    cancelOrderMutation.mutate(order.id);
                  }
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                data-testid={`button-cancel-${order.id}`}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            {showNextButton && (
              <Button
                size="sm"
                onClick={() => handleNextStatus(order)}
                disabled={isUpdating}
                className={`${
                  order.status === "pending"
                    ? "bg-blue-500 hover:bg-blue-600"
                    : order.status === "preparing"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-500 hover:bg-gray-600"
                } text-white transition-all duration-200 ${isUpdating ? "animate-pulse" : ""}`}
                data-testid={`button-next-${order.id}`}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Atualizando...
                  </>
                ) : order.status === "pending" ? (
                  <>
                    <ChefHat className="h-4 w-4 mr-1" />
                    Preparar
                  </>
                ) : order.status === "preparing" ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Pronto
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Entregar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white" data-testid="text-page-title">
              Painel da Cozinha
            </h1>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {orders.length} pedido(s) ativo(s)
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
              <h2 className="font-bold text-yellow-800 dark:text-yellow-200">
                Pendentes ({pendingOrders.length})
              </h2>
            </div>
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {pendingOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nenhum pedido pendente
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChefHat className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-blue-800 dark:text-blue-200">
                Em Preparo ({preparingOrders.length})
              </h2>
            </div>
            <div className="space-y-3">
              {preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {preparingOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nenhum pedido em preparo
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
              <h2 className="font-bold text-green-800 dark:text-green-200">
                Prontos ({readyOrders.length})
              </h2>
            </div>
            <div className="space-y-3">
              {readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {readyOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nenhum pedido pronto
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
