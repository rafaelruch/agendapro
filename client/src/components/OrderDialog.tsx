import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import type { Product } from "@shared/schema";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface DeliveryAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  zipCode?: string;
  reference?: string;
}

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    client: { name: string; phone: string };
    items: { productId: string; quantity: number }[];
    notes?: string;
    deliveryAddress?: DeliveryAddress;
  }) => void;
  isLoading?: boolean;
}

export function OrderDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: OrderDialogProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  
  // Endereço de entrega
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryComplement, setDeliveryComplement] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryZipCode, setDeliveryZipCode] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/inventory/products"],
    enabled: open,
  });

  const activeProducts = products.filter((p) => p.isActive);

  useEffect(() => {
    if (!open) {
      setClientName("");
      setClientPhone("");
      setNotes("");
      setOrderItems([]);
      setSelectedProductId("");
      // Limpar endereço de entrega
      setDeliveryStreet("");
      setDeliveryNumber("");
      setDeliveryComplement("");
      setDeliveryNeighborhood("");
      setDeliveryCity("");
      setDeliveryZipCode("");
      setDeliveryReference("");
    }
  }, [open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setClientPhone(formatted);
  };

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatZipCode(e.target.value);
    setDeliveryZipCode(formatted);
  };

  const addProduct = (productId: string) => {
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = orderItems.find((item) => item.productId === productId);
    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: parseFloat(String(product.price)),
        },
      ]);
    }
    setSelectedProductId("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems(
      orderItems
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId));
  };

  const total = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientPhone.trim()) {
      return;
    }

    if (orderItems.length === 0) {
      return;
    }

    // Montar endereço de entrega apenas se pelo menos um campo estiver preenchido
    const hasDeliveryAddress = deliveryStreet || deliveryNumber || deliveryNeighborhood || deliveryCity;
    const deliveryAddress: DeliveryAddress | undefined = hasDeliveryAddress ? {
      street: deliveryStreet.trim() || undefined,
      number: deliveryNumber.trim() || undefined,
      complement: deliveryComplement.trim() || undefined,
      neighborhood: deliveryNeighborhood.trim() || undefined,
      city: deliveryCity.trim() || undefined,
      zipCode: deliveryZipCode.replace(/\D/g, "") || undefined,
      reference: deliveryReference.trim() || undefined,
    } : undefined;

    onSubmit({
      client: {
        name: clientName.trim(),
        phone: clientPhone.replace(/\D/g, ""),
      },
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      notes: notes.trim() || undefined,
      deliveryAddress,
    });
  };

  const availableProducts = activeProducts.filter(
    (p) => !orderItems.find((item) => item.productId === p.id)
  );

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white" data-testid="text-dialog-title">
            Novo Pedido
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha os dados do cliente e adicione os produtos.
          </p>
        </div>

        <div className="grid gap-5 px-6 pb-6 sm:px-9.5 sm:pb-9.5 max-h-[60vh] overflow-y-auto">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-3">
              Dados do Cliente
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Nome</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome do cliente"
                  data-testid="input-client-name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clientPhone">Telefone</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  data-testid="input-client-phone"
                  required
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-3">
              Produtos
            </h4>

            {availableProducts.length > 0 && (
              <div className="flex gap-2 mb-4">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="select-product"
                >
                  <option value="">Selecione um produto...</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(parseFloat(String(product.price)))}
                      {product.manageStock && product.quantity !== null
                        ? ` (${product.quantity} em estoque)`
                        : ""}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={() => addProduct(selectedProductId)}
                  disabled={!selectedProductId}
                  data-testid="button-add-product"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {orderItems.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <ShoppingCart className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum produto adicionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3"
                    data-testid={`order-item-${item.productId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(item.unitPrice)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="h-8 w-8 p-0"
                        data-testid={`button-decrease-${item.productId}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-white">
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="h-8 w-8 p-0"
                        data-testid={`button-increase-${item.productId}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.productId)}
                        className="h-8 w-8 p-0 text-meta-1 hover:text-meta-1"
                        data-testid={`button-remove-${item.productId}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    Total
                  </span>
                  <span className="text-lg font-bold text-primary" data-testid="text-order-total">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-3">
              Endereço de Entrega (opcional)
            </h4>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="deliveryStreet">Rua</Label>
                  <Input
                    id="deliveryStreet"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    placeholder="Nome da rua"
                    data-testid="input-delivery-street"
                  />
                </div>
                <div className="grid gap-2 grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="deliveryNumber">Número</Label>
                    <Input
                      id="deliveryNumber"
                      value={deliveryNumber}
                      onChange={(e) => setDeliveryNumber(e.target.value)}
                      placeholder="Nº"
                      data-testid="input-delivery-number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="deliveryComplement">Complemento</Label>
                    <Input
                      id="deliveryComplement"
                      value={deliveryComplement}
                      onChange={(e) => setDeliveryComplement(e.target.value)}
                      placeholder="Apto, bloco..."
                      data-testid="input-delivery-complement"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="deliveryNeighborhood">Bairro</Label>
                  <Input
                    id="deliveryNeighborhood"
                    value={deliveryNeighborhood}
                    onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    data-testid="input-delivery-neighborhood"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deliveryCity">Cidade</Label>
                  <Input
                    id="deliveryCity"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="Cidade"
                    data-testid="input-delivery-city"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deliveryZipCode">CEP</Label>
                  <Input
                    id="deliveryZipCode"
                    value={deliveryZipCode}
                    onChange={handleZipCodeChange}
                    placeholder="00000-000"
                    data-testid="input-delivery-zipcode"
                    maxLength={9}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deliveryReference">Ponto de Referência</Label>
                <Input
                  id="deliveryReference"
                  value={deliveryReference}
                  onChange={(e) => setDeliveryReference(e.target.value)}
                  placeholder="Próximo ao mercado, casa azul..."
                  data-testid="input-delivery-reference"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Sem cebola, bem passado..."
              data-testid="input-order-notes"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || orderItems.length === 0 || !clientName.trim() || !clientPhone.trim()}
            data-testid="button-submit-order"
          >
            {isLoading ? "Criando..." : "Criar Pedido"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
