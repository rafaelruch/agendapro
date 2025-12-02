import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Trash2, ShoppingCart, MapPin, Home, Briefcase, Check, CreditCard } from "lucide-react";
import type { Product, ClientAddress, Client, PaymentMethod } from "@shared/schema";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
    paymentMethod: PaymentMethod;
    notes?: string;
    deliveryAddress?: DeliveryAddress;
    clientAddressId?: string;
    saveAddress?: boolean;
    addressLabel?: string;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  
  // Estado do cliente encontrado
  const [foundClient, setFoundClient] = useState<Client | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  
  // Endereços do cliente
  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<"select" | "new">("select");
  
  // Endereço de entrega (novo)
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryComplement, setDeliveryComplement] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryZipCode, setDeliveryZipCode] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [newAddressLabel, setNewAddressLabel] = useState("Casa");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/inventory/products"],
    enabled: open,
  });

  const activeProducts = products.filter((p) => p.isActive);

  // Buscar cliente por telefone (debounced)
  const searchClientByPhone = useCallback(async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setFoundClient(null);
      setClientAddresses([]);
      setSelectedAddressId(null);
      return;
    }

    setIsSearchingClient(true);
    try {
      const response = await fetch(`/api/clients?search=${cleanPhone}`);
      if (response.ok) {
        const clients = await response.json();
        const exactMatch = clients.find((c: Client) => c.phone === cleanPhone);
        
        if (exactMatch) {
          setFoundClient(exactMatch);
          setClientName(exactMatch.name);
          
          // Buscar endereços do cliente
          const addressResponse = await fetch(`/api/clients/${exactMatch.id}/addresses`);
          if (addressResponse.ok) {
            const addresses = await addressResponse.json();
            setClientAddresses(addresses);
            
            // Selecionar endereço padrão se existir
            const defaultAddr = addresses.find((a: ClientAddress) => a.isDefault);
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id);
              setAddressMode("select");
            } else if (addresses.length > 0) {
              setSelectedAddressId(addresses[0].id);
              setAddressMode("select");
            } else {
              setAddressMode("new");
            }
          }
        } else {
          setFoundClient(null);
          setClientAddresses([]);
          setSelectedAddressId(null);
          setAddressMode("new");
        }
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
    } finally {
      setIsSearchingClient(false);
    }
  }, []);

  // Debounce para busca de cliente
  useEffect(() => {
    const cleanPhone = clientPhone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      const timer = setTimeout(() => {
        searchClientByPhone(clientPhone);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFoundClient(null);
      setClientAddresses([]);
      setSelectedAddressId(null);
    }
  }, [clientPhone, searchClientByPhone]);

  useEffect(() => {
    if (!open) {
      setClientName("");
      setClientPhone("");
      setNotes("");
      setOrderItems([]);
      setSelectedProductId("");
      setPaymentMethod("");
      setFoundClient(null);
      setClientAddresses([]);
      setSelectedAddressId(null);
      setAddressMode("select");
      setDeliveryStreet("");
      setDeliveryNumber("");
      setDeliveryComplement("");
      setDeliveryNeighborhood("");
      setDeliveryCity("");
      setDeliveryZipCode("");
      setDeliveryReference("");
      setSaveNewAddress(true);
      setNewAddressLabel("Casa");
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

  const getSelectedAddress = (): ClientAddress | undefined => {
    return clientAddresses.find((a) => a.id === selectedAddressId);
  };

  const formatAddressDisplay = (address: ClientAddress): string => {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.number) parts.push(address.number);
    if (address.complement) parts.push(address.complement);
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.city) parts.push(address.city);
    return parts.join(", ") || "Endereço incompleto";
  };

  const getAddressIcon = (label: string) => {
    if (label.toLowerCase().includes("trabalho") || label.toLowerCase().includes("work")) {
      return <Briefcase className="h-4 w-4" />;
    }
    return <Home className="h-4 w-4" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientPhone.trim()) {
      return;
    }

    if (orderItems.length === 0) {
      return;
    }

    if (!paymentMethod) {
      return;
    }

    let deliveryAddress: DeliveryAddress | undefined;
    let clientAddressIdToSend: string | undefined;
    let shouldSaveAddress = false;
    let addressLabel: string | undefined;

    if (addressMode === "select" && selectedAddressId) {
      // Enviar o ID do endereço selecionado - o backend buscará os dados
      clientAddressIdToSend = selectedAddressId;
    } else if (addressMode === "new") {
      // Usar novo endereço
      const hasDeliveryAddress = deliveryStreet || deliveryNumber || deliveryNeighborhood || deliveryCity;
      if (hasDeliveryAddress) {
        deliveryAddress = {
          street: deliveryStreet.trim() || undefined,
          number: deliveryNumber.trim() || undefined,
          complement: deliveryComplement.trim() || undefined,
          neighborhood: deliveryNeighborhood.trim() || undefined,
          city: deliveryCity.trim() || undefined,
          zipCode: deliveryZipCode.replace(/\D/g, "") || undefined,
          reference: deliveryReference.trim() || undefined,
        };
        shouldSaveAddress = saveNewAddress;
        addressLabel = newAddressLabel;
      }
    }

    onSubmit({
      client: {
        name: clientName.trim(),
        phone: clientPhone.replace(/\D/g, ""),
      },
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      paymentMethod: paymentMethod as PaymentMethod,
      notes: notes.trim() || undefined,
      deliveryAddress,
      clientAddressId: clientAddressIdToSend,
      saveAddress: shouldSaveAddress,
      addressLabel,
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
                <Label htmlFor="clientPhone">Telefone</Label>
                <div className="relative">
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    data-testid="input-client-phone"
                    required
                  />
                  {isSearchingClient && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </div>
                {foundClient && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Cliente encontrado
                  </p>
                )}
              </div>
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

          {/* Forma de Pagamento */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Forma de Pagamento
              <span className="text-meta-1">*</span>
            </h4>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="select-payment-method"
              required
            >
              <option value="">Selecione a forma de pagamento...</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de Entrega (opcional)
              </h4>
              {clientAddresses.length > 0 && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAddressMode("select")}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      addressMode === "select"
                        ? "bg-primary text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    data-testid="button-address-mode-select"
                  >
                    Salvo ({clientAddresses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressMode("new")}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      addressMode === "new"
                        ? "bg-primary text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    data-testid="button-address-mode-new"
                  >
                    Novo
                  </button>
                </div>
              )}
            </div>

            {addressMode === "select" && clientAddresses.length > 0 ? (
              <div className="space-y-2">
                {clientAddresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAddressId === address.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    data-testid={`address-option-${address.id}`}
                  >
                    <div className={`mt-0.5 ${selectedAddressId === address.id ? "text-primary" : "text-gray-400"}`}>
                      {getAddressIcon(address.label)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-white">
                          {address.label}
                        </span>
                        {address.isDefault && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {formatAddressDisplay(address)}
                      </p>
                      {address.reference && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          Ref: {address.reference}
                        </p>
                      )}
                    </div>
                    {selectedAddressId === address.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
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
                
                {/* Opção para salvar endereço */}
                {(deliveryStreet || deliveryNumber || deliveryNeighborhood) && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="saveAddress"
                        checked={saveNewAddress}
                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        data-testid="checkbox-save-address"
                      />
                      <Label htmlFor="saveAddress" className="text-sm cursor-pointer">
                        Salvar endereço para próximos pedidos
                      </Label>
                    </div>
                    {saveNewAddress && (
                      <div className="mt-3 grid gap-2">
                        <Label htmlFor="addressLabel">Nome do endereço</Label>
                        <select
                          id="addressLabel"
                          value={newAddressLabel}
                          onChange={(e) => setNewAddressLabel(e.target.value)}
                          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          data-testid="select-address-label"
                        >
                          <option value="Casa">Casa</option>
                          <option value="Trabalho">Trabalho</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
            disabled={isLoading || orderItems.length === 0 || !clientName.trim() || !clientPhone.trim() || !paymentMethod}
            data-testid="button-submit-order"
          >
            {isLoading ? "Criando..." : "Criar Pedido"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
