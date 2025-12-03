import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Package, ShoppingBag, User, X, ChevronDown, LogOut, UtensilsCrossed, ClipboardList, History, MapPin, Menu as MenuIcon, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Check, Loader2, Calendar, Clock, Scissors, AlertTriangle } from "lucide-react";

type ActiveSection = "cardapio" | "pedidos" | "historico" | "enderecos";
type PaymentMethod = "cash" | "pix" | "debit" | "credit";

interface CustomerData {
  name: string;
  phone: string;
}

interface CartItem {
  product: MenuProduct;
  quantity: number;
}

interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryId: string | null;
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePrice?: number | null;
}

interface MenuCategory {
  id: string;
  name: string;
}

interface DeliveryNeighborhood {
  id: string;
  name: string;
  deliveryFee: number;
}

interface ClientOrder {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryNeighborhood: string | null;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface ClientAddress {
  id: string;
  label: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  reference: string | null;
  isDefault: boolean | null;
}

interface MenuService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  duration: number;
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePrice?: number | null;
  promotionalPrice?: number | null;
  promotionalStart?: string | null;
  promotionalEnd?: string | null;
}

interface MenuData {
  tenant: {
    name: string;
    logoUrl: string | null;
    brandColor: string;
    bannerUrl: string | null;
    minOrderValue: number | null;
    menuType: "delivery" | "services";
  };
  categories: MenuCategory[];
  products: MenuProduct[];
  featuredProducts: MenuProduct[];
  productsOnSale: MenuProduct[];
  deliveryFees: DeliveryNeighborhood[];
  services?: MenuService[];
  featuredServices?: MenuService[];
}

export default function PublicMenuPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [registerForm, setRegisterForm] = useState({ name: "", phone: "" });
  const [activeSection, setActiveSection] = useState<ActiveSection>("cardapio");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [activeTab, setActiveTab] = useState<"populares" | "promocoes">("populares");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"telefone" | "dados" | "endereco" | "pagamento" | "confirmacao">("telefone");
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    phone: "",
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
    paymentMethod: "pix" as PaymentMethod,
    notes: "",
    saveAddress: true,
    selectedAddressId: "" as string,
    changeFor: "" as string,
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string; orderNumber: number } | null>(null);
  const [clientFound, setClientFound] = useState<boolean | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<ClientAddress[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
  const [clientHistory, setClientHistory] = useState<ClientOrder[]>([]);
  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [identifiedPhone, setIdentifiedPhone] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  const [selectedServices, setSelectedServices] = useState<MenuService[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Função para obter preço do serviço (considerando promoção)
  const getServicePrice = (service: MenuService) => {
    if (service.promotionalPrice !== null && service.promotionalPrice !== undefined) {
      const now = new Date();
      const start = service.promotionalStart ? new Date(service.promotionalStart) : null;
      const end = service.promotionalEnd ? new Date(service.promotionalEnd) : null;
      
      if ((!start || now >= start) && (!end || now <= end)) {
        return service.promotionalPrice;
      }
    }
    return service.price;
  };

  // Adicionar serviço à seleção
  const addService = (service: MenuService) => {
    if (!selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(prev => [...prev, service]);
    }
  };

  // Remover serviço da seleção
  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  // Total de serviços selecionados
  const servicesTotal = selectedServices.reduce(
    (sum, service) => sum + getServicePrice(service),
    0
  );

  // Duração total dos serviços em minutos
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration,
    0
  );

  // Formatar duração em horas e minutos
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const addToCart = (product: MenuProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const getProductPrice = (product: MenuProduct) => {
    return product.isOnSale && product.salePrice ? product.salePrice : product.price;
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + getProductPrice(item.product) * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const slug = window.location.pathname.replace('/menu/', '');

  // Carregar cliente salvo do localStorage
  useEffect(() => {
    const savedCustomer = localStorage.getItem(`menu_customer_${slug}`);
    if (savedCustomer) {
      try {
        setCustomer(JSON.parse(savedCustomer));
      } catch (e) {
        localStorage.removeItem(`menu_customer_${slug}`);
      }
    }
  }, [slug]);

  const handleRegister = () => {
    if (registerForm.name.trim() && registerForm.phone.trim()) {
      const newCustomer = { name: registerForm.name.trim(), phone: registerForm.phone.trim() };
      setCustomer(newCustomer);
      localStorage.setItem(`menu_customer_${slug}`, JSON.stringify(newCustomer));
      setShowRegisterModal(false);
      setRegisterForm({ name: "", phone: "" });
    }
  };

  const handleLogout = () => {
    setCustomer(null);
    localStorage.removeItem(`menu_customer_${slug}`);
    setShowProfileMenu(false);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const { data: menuData, isLoading, error } = useQuery<MenuData>({
    queryKey: ["/api/menu", slug],
    queryFn: async () => {
      const res = await fetch(`/api/menu/${slug}`);
      if (!res.ok) {
        throw new Error("Cardápio não encontrado");
      }
      return res.json();
    },
    retry: false,
  });

  const brandColor = menuData?.tenant.brandColor || "#ea7c3f";
  
  // Determine menu type
  const isServicesMenu = menuData?.tenant.menuType === "services";

  // Sidebar menus que se adaptam ao tipo de menu
  const sidebarMenus = useMemo(() => {
    return isServicesMenu 
      ? [
          { id: "cardapio" as ActiveSection, label: "Serviços", icon: Scissors },
          { id: "pedidos" as ActiveSection, label: "Agendamentos", icon: Calendar },
          { id: "historico" as ActiveSection, label: "Histórico", icon: History },
        ]
      : [
          { id: "cardapio" as ActiveSection, label: "Cardápio", icon: UtensilsCrossed },
          { id: "pedidos" as ActiveSection, label: "Pedidos", icon: ClipboardList },
          { id: "historico" as ActiveSection, label: "Histórico", icon: History },
          { id: "enderecos" as ActiveSection, label: "Endereços", icon: MapPin },
        ];
  }, [isServicesMenu]);

  // Mutation para criar pedido
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      client: { name: string; phone: string };
      items: { productId: string; quantity: number }[];
      paymentMethod: string;
      notes?: string;
      deliveryAddress?: {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        reference?: string;
      };
      saveAddress?: boolean;
    }) => {
      const res = await fetch(`/api/menu/${slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar pedido");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setOrderSuccess({ orderId: data.orderId, orderNumber: data.orderNumber });
      setCheckoutStep("confirmacao");
      // Salvar cliente no localStorage
      const newCustomer = { name: checkoutForm.name, phone: checkoutForm.phone };
      setCustomer(newCustomer);
      localStorage.setItem(`menu_customer_${slug}`, JSON.stringify(newCustomer));
      // Limpar carrinho
      setCart([]);
    },
  });

  // Estados do fluxo de agendamento
  const [bookingStep, setBookingStep] = useState<"servicos" | "data" | "horario" | "dados" | "confirmacao">("servicos");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [appointmentSuccess, setAppointmentSuccess] = useState<{
    appointmentId: string;
    date: string;
    time: string;
    services: { name: string; value: number }[];
    totalValue: number;
  } | null>(null);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    phone: "",
    notes: "",
  });

  // Buscar disponibilidade para uma data
  const fetchAvailability = async (date: string) => {
    if (!date || selectedServices.length === 0) return;
    
    setIsLoadingSlots(true);
    setAvailableSlots([]);
    
    try {
      const serviceIdsParam = selectedServices.map(s => s.id).join(',');
      const res = await fetch(`/api/menu/${slug}/availability?date=${date}&serviceIds=${serviceIdsParam}`);
      const data = await res.json();
      
      if (data.closed) {
        setAvailableSlots([]);
      } else {
        setAvailableSlots(data.availableSlots || []);
      }
    } catch (error) {
      console.error("Erro ao buscar disponibilidade:", error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Mutation para criar agendamento
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: {
      client: { name: string; phone: string };
      serviceIds: string[];
      date: string;
      time: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/menu/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || "Erro ao criar agendamento");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAppointmentSuccess({
        appointmentId: data.appointmentId,
        date: data.appointment.date,
        time: data.appointment.time,
        services: data.appointment.services,
        totalValue: data.appointment.totalValue,
      });
      setBookingStep("confirmacao");
      // Salvar cliente no localStorage
      const newCustomer = { name: bookingForm.name, phone: bookingForm.phone };
      setCustomer(newCustomer);
      localStorage.setItem(`menu_customer_${slug}`, JSON.stringify(newCustomer));
    },
  });

  // Submeter agendamento
  const submitAppointment = () => {
    createAppointmentMutation.mutate({
      client: {
        name: bookingForm.name,
        phone: bookingForm.phone,
      },
      serviceIds: selectedServices.map(s => s.id),
      date: selectedDate,
      time: selectedTime,
      notes: bookingForm.notes || undefined,
    });
  };

  // Validar passo do booking
  const canProceedBooking = () => {
    if (bookingStep === "servicos") {
      return selectedServices.length > 0;
    }
    if (bookingStep === "data") {
      return !!selectedDate;
    }
    if (bookingStep === "horario") {
      return !!selectedTime;
    }
    if (bookingStep === "dados") {
      return bookingForm.name.trim().length >= 2 && bookingForm.phone.replace(/\D/g, "").length >= 10;
    }
    return false;
  };

  // Próximo passo do booking
  const nextBookingStep = () => {
    if (bookingStep === "servicos") {
      setBookingStep("data");
    } else if (bookingStep === "data") {
      fetchAvailability(selectedDate);
      setBookingStep("horario");
    } else if (bookingStep === "horario") {
      // Preencher dados do cliente se já identificado
      if (customer) {
        setBookingForm(prev => ({
          ...prev,
          name: customer.name,
          phone: customer.phone,
        }));
      }
      setBookingStep("dados");
    } else if (bookingStep === "dados") {
      submitAppointment();
    }
  };

  // Voltar passo do booking
  const prevBookingStep = () => {
    if (bookingStep === "data") setBookingStep("servicos");
    else if (bookingStep === "horario") setBookingStep("data");
    else if (bookingStep === "dados") setBookingStep("horario");
  };

  // Fechar modal de agendamento
  const closeAppointmentModal = () => {
    setShowAppointmentModal(false);
    setBookingStep("servicos");
    setSelectedDate("");
    setSelectedTime("");
    setAvailableSlots([]);
    setAppointmentSuccess(null);
    setBookingForm({ name: "", phone: "", notes: "" });
    // Se confirmou, limpar serviços selecionados
    if (appointmentSuccess) {
      setSelectedServices([]);
    }
  };

  // Carregar pedidos e endereços do cliente
  const loadClientData = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return;
    
    setIsLoadingClientData(true);
    try {
      // Buscar pedidos
      const ordersRes = await fetch(`/api/menu/${slug}/client/${cleanPhone}/orders`);
      const ordersData = await ordersRes.json();
      setClientOrders(ordersData.orders || []);
      setClientHistory(ordersData.history || []);
      
      // Buscar endereços
      const clientRes = await fetch(`/api/menu/${slug}/client/${cleanPhone}`);
      const clientData = await clientRes.json();
      if (clientData.found) {
        setClientAddresses(clientData.addresses || []);
        setCustomer({ name: clientData.client.name, phone: clientData.client.phone });
        localStorage.setItem(`menu_customer_${slug}`, JSON.stringify({ 
          name: clientData.client.name, 
          phone: clientData.client.phone 
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
    } finally {
      setIsLoadingClientData(false);
    }
  };

  // Buscar cliente por telefone (checkout)
  const searchClientByPhone = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return;
    
    setIsSearchingClient(true);
    try {
      const res = await fetch(`/api/menu/${slug}/client/${cleanPhone}`);
      const data = await res.json();
      
      if (data.found) {
        setClientFound(true);
        setCheckoutForm((prev) => ({
          ...prev,
          name: data.client.name,
        }));
        setSavedAddresses(data.addresses || []);
        setIdentifiedPhone(cleanPhone);
        // Se tiver endereço padrão, selecionar
        const defaultAddr = data.addresses?.find((a: any) => a.isDefault);
        if (defaultAddr) {
          setCheckoutForm((prev) => ({
            ...prev,
            selectedAddressId: defaultAddr.id,
            street: defaultAddr.street || "",
            number: defaultAddr.number || "",
            complement: defaultAddr.complement || "",
            neighborhood: defaultAddr.neighborhood || "",
            city: defaultAddr.city || "",
            reference: defaultAddr.reference || "",
          }));
        }
      } else {
        setClientFound(false);
        setSavedAddresses([]);
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      setClientFound(false);
    } finally {
      setIsSearchingClient(false);
    }
  };

  // Identificar cliente para ver pedidos/endereços
  const identifyClient = async () => {
    const cleanPhone = phoneInput.replace(/\D/g, "");
    if (cleanPhone.length < 10) return;
    
    setIsLoadingClientData(true);
    try {
      const res = await fetch(`/api/menu/${slug}/client/${cleanPhone}`);
      const data = await res.json();
      
      if (data.found) {
        setIdentifiedPhone(cleanPhone);
        setCustomer({ name: data.client.name, phone: data.client.phone });
        localStorage.setItem(`menu_customer_${slug}`, JSON.stringify({ 
          name: data.client.name, 
          phone: data.client.phone 
        }));
        setClientAddresses(data.addresses || []);
        setShowPhoneModal(false);
        // Carregar pedidos
        await loadClientData(cleanPhone);
      } else {
        alert("Telefone não encontrado. Faça um pedido primeiro para criar seu cadastro.");
      }
    } catch (error) {
      console.error("Erro ao identificar cliente:", error);
    } finally {
      setIsLoadingClientData(false);
    }
  };

  // Verificar se precisa identificar ao trocar de seção
  const handleSectionChange = (section: ActiveSection) => {
    if ((section === "pedidos" || section === "historico" || section === "enderecos") && !identifiedPhone && !customer) {
      setShowPhoneModal(true);
      setActiveSection(section);
    } else if ((section === "pedidos" || section === "historico" || section === "enderecos") && (identifiedPhone || customer)) {
      setActiveSection(section);
      // Recarregar dados se necessário
      const phone = identifiedPhone || customer?.phone;
      if (phone && clientOrders.length === 0 && clientHistory.length === 0) {
        loadClientData(phone);
      }
    } else {
      setActiveSection(section);
    }
  };

  // Abrir checkout
  const openCheckout = () => {
    // Resetar estado
    setClientFound(null);
    setSavedAddresses([]);
    setCheckoutForm({
      name: "",
      phone: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      reference: "",
      paymentMethod: "pix",
      notes: "",
      saveAddress: true,
      selectedAddressId: "",
      changeFor: "",
    });
    setCheckoutStep("telefone");
    setOrderSuccess(null);
    setShowCheckout(true);
    setShowMobileCart(false);
  };

  // Formatar CEP (00000-000)
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 8);
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
  };

  // Buscar endereço por CEP (ViaCEP)
  const searchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setCheckoutForm((prev) => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Formatar valor monetário para input
  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const amount = parseInt(numbers, 10) / 100;
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Parsear valor do input para número
  const parseCurrencyInput = (value: string): number => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return 0;
    return parseInt(numbers, 10) / 100;
  };

  // Enviar pedido
  const submitOrder = () => {
    const changeForValue = checkoutForm.paymentMethod === "cash" && checkoutForm.changeFor 
      ? parseCurrencyInput(checkoutForm.changeFor) 
      : undefined;
    
    const notes = changeForValue 
      ? `${checkoutForm.notes || ''} | Troco para: R$ ${changeForValue.toFixed(2)}`.trim()
      : checkoutForm.notes;
    
    createOrderMutation.mutate({
      client: {
        name: checkoutForm.name,
        phone: checkoutForm.phone.replace(/\D/g, ""),
      },
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      paymentMethod: checkoutForm.paymentMethod,
      notes: notes || undefined,
      deliveryAddress: {
        street: checkoutForm.street || undefined,
        number: checkoutForm.number || undefined,
        complement: checkoutForm.complement || undefined,
        neighborhood: checkoutForm.neighborhood || undefined,
        city: checkoutForm.city || undefined,
        reference: checkoutForm.reference || undefined,
      },
      saveAddress: checkoutForm.saveAddress,
    });
  };

  // Validar passo atual
  const canProceed = () => {
    if (checkoutStep === "telefone") {
      return checkoutForm.phone.replace(/\D/g, "").length >= 10 && clientFound !== null;
    }
    if (checkoutStep === "dados") {
      return checkoutForm.name.trim().length >= 2;
    }
    if (checkoutStep === "endereco") {
      return true; // Endereço é opcional
    }
    if (checkoutStep === "pagamento") {
      return !!checkoutForm.paymentMethod;
    }
    return false;
  };

  // Próximo passo
  const nextStep = () => {
    if (checkoutStep === "telefone") setCheckoutStep("dados");
    else if (checkoutStep === "dados") setCheckoutStep("endereco");
    else if (checkoutStep === "endereco") setCheckoutStep("pagamento");
    else if (checkoutStep === "pagamento") submitOrder();
  };

  // Voltar passo
  const prevStep = () => {
    if (checkoutStep === "dados") setCheckoutStep("telefone");
    else if (checkoutStep === "endereco") setCheckoutStep("dados");
    else if (checkoutStep === "pagamento") setCheckoutStep("endereco");
  };

  // Fechar checkout
  const closeCheckout = () => {
    setShowCheckout(false);
  };

  const paymentMethods = [
    { id: "pix" as PaymentMethod, label: "PIX", icon: Smartphone },
    { id: "cash" as PaymentMethod, label: "Dinheiro", icon: Banknote },
    { id: "credit" as PaymentMethod, label: "Crédito", icon: CreditCard },
    { id: "debit" as PaymentMethod, label: "Débito", icon: CreditCard },
  ];

  const filteredProducts = useMemo(() => {
    if (!menuData) return [];
    
    let products = menuData.products;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }
    
    if (activeCategory) {
      products = products.filter((p) => p.categoryId === activeCategory);
    }
    
    return products;
  }, [menuData, searchQuery, activeCategory]);

  const groupedProducts = useMemo(() => {
    if (!menuData) return new Map<string, MenuProduct[]>();
    
    const groups = new Map<string, MenuProduct[]>();
    
    if (activeCategory) {
      groups.set(activeCategory, filteredProducts);
    } else {
      menuData.categories.forEach((cat) => {
        const categoryProducts = filteredProducts.filter((p) => p.categoryId === cat.id);
        if (categoryProducts.length > 0) {
          groups.set(cat.id, categoryProducts);
        }
      });
      
      const uncategorized = filteredProducts.filter((p) => !p.categoryId);
      if (uncategorized.length > 0) {
        groups.set("uncategorized", uncategorized);
      }
    }
    
    return groups;
  }, [menuData, filteredProducts, activeCategory]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getCategoryName = (categoryId: string) => {
    if (categoryId === "uncategorized") return "Outros";
    return menuData?.categories.find((c) => c.id === categoryId)?.name || "Outros";
  };

  // Filtro de serviços
  const filteredServices = useMemo(() => {
    if (!menuData?.services) return [];
    
    let services = menuData.services;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          (s.description && s.description.toLowerCase().includes(query))
      );
    }
    
    if (activeCategory) {
      services = services.filter((s) => s.category === activeCategory);
    }
    
    return services;
  }, [menuData?.services, searchQuery, activeCategory]);

  // Categorias únicas de serviços
  const serviceCategories = useMemo(() => {
    if (!menuData?.services) return [];
    const categories = new Set<string>();
    menuData.services.forEach(s => {
      if (s.category) categories.add(s.category);
    });
    return Array.from(categories);
  }, [menuData?.services]);

  // Verificar se serviço está em promoção
  const isServiceOnPromotion = (service: MenuService) => {
    if (!service.promotionalPrice) return false;
    const now = new Date();
    const start = service.promotionalStart ? new Date(service.promotionalStart) : null;
    const end = service.promotionalEnd ? new Date(service.promotionalEnd) : null;
    return (!start || now >= start) && (!end || now <= end);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Cardápio não encontrado</h1>
          <p className="text-gray-600">
            Este cardápio não existe ou não está disponível no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Principal - Estilo iFood */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        {/* Header Desktop */}
        <div className="hidden md:block px-6 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Logo à Esquerda */}
            <div className="flex-shrink-0">
              {menuData.tenant.logoUrl ? (
                <img
                  src={menuData.tenant.logoUrl}
                  alt={menuData.tenant.name}
                  className="h-[6rem] w-[6rem] object-contain rounded-xl"
                  data-testid="img-tenant-logo"
                />
              ) : (
                <div 
                  className="h-[6rem] w-[6rem] rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: brandColor }}
                >
                  <ShoppingBag className="h-10 w-10 text-white" />
                </div>
              )}
            </div>

            {/* Campo de Busca Centralizado */}
            <div className="flex-1 max-w-lg">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:border-transparent text-sm bg-white"
                    style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                    data-testid="input-search"
                  />
                </div>
                
                {/* Botão Filtrar */}
                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: brandColor }}
                  data-testid="button-filter"
                >
                  <span className="hidden sm:inline">Filtrar</span>
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Perfil / Cadastro à Direita Desktop */}
            <div className="flex-shrink-0 relative">
              {customer ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    data-testid="button-profile"
                  >
                    <div 
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: brandColor }}
                    >
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {customer.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>

                  {/* Menu Dropdown do Perfil */}
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.phone}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        data-testid="button-logout"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                  data-testid="button-register"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Cadastrar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Header Mobile */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Logo Menor no Mobile */}
            <div className="flex-shrink-0">
              {menuData.tenant.logoUrl ? (
                <img
                  src={menuData.tenant.logoUrl}
                  alt={menuData.tenant.name}
                  className="h-12 w-12 object-contain rounded-lg"
                  data-testid="img-tenant-logo-mobile"
                />
              ) : (
                <div 
                  className="h-12 w-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: brandColor }}
                >
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
              )}
            </div>

            {/* Busca Expandida */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm bg-white"
                  style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  data-testid="input-search-mobile"
                />
              </div>
            </div>

            {/* Botão Perfil Mobile */}
            {customer ? (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: brandColor }}
                data-testid="button-profile-mobile"
              >
                {customer.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex-shrink-0 p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                data-testid="button-register-mobile"
              >
                <User className="h-5 w-5 text-gray-600" />
              </button>
            )}
          </div>

          {/* Dropdown Perfil Mobile */}
          {showProfileMenu && customer && (
            <div className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                <p className="text-xs text-gray-500">{customer.phone}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                data-testid="button-logout-mobile"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Modal de Cadastro */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Cadastrar</h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-close-register"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  data-testid="input-register-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  data-testid="input-register-phone"
                />
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={handleRegister}
                disabled={!registerForm.name.trim() || !registerForm.phone.trim()}
                className="w-full py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: brandColor }}
                data-testid="button-submit-register"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layout Principal com Sidebar */}
      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-60 flex-shrink-0 p-6">
          <nav className="space-y-2">
            {sidebarMenus.map((menu) => {
              const Icon = menu.icon;
              const isActive = activeSection === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => handleSectionChange(menu.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    isActive
                      ? "border-2 bg-opacity-10"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                  style={isActive ? { 
                    borderColor: brandColor, 
                    backgroundColor: `${brandColor}15`,
                    color: brandColor 
                  } : {}}
                  data-testid={`sidebar-${menu.id}`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "" : "text-gray-500"}`} />
                  <span className={`font-medium ${isActive ? "" : "text-gray-700"}`}>
                    {menu.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Navegação Inferior Mobile - Estilo iFood */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
          <div className="flex items-center justify-around py-2">
            {sidebarMenus.map((menu) => {
              const Icon = menu.icon;
              const isActive = activeSection === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => handleSectionChange(menu.id)}
                  className="flex flex-col items-center gap-1 py-1 px-3 min-w-[60px]"
                  data-testid={`nav-mobile-${menu.id}`}
                >
                  <Icon 
                    className="h-5 w-5 transition-colors" 
                    style={{ color: isActive ? brandColor : '#9CA3AF' }}
                  />
                  <span 
                    className="text-xs font-medium transition-colors"
                    style={{ color: isActive ? brandColor : '#6B7280' }}
                  >
                    {menu.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0 pb-20 md:pb-0">
          {/* Seção: Cardápio / Serviços */}
          {activeSection === "cardapio" && (
            <div className="flex">
              {/* Área de Produtos/Serviços */}
              <div className="flex-1 min-w-0 p-6">
                {/* Título Categorias */}
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                  {isServicesMenu ? "Nossos Serviços" : "Explorar Categorias"}
                </h2>
                
                {/* Pills de Categorias em Grid */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                      activeCategory === null
                        ? "text-white border-transparent"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                    style={activeCategory === null ? { backgroundColor: brandColor } : {}}
                    data-testid="button-category-all"
                  >
                    {isServicesMenu ? <Scissors className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
                    <span className="font-medium text-sm">Todos</span>
                  </button>
                  {isServicesMenu ? (
                    serviceCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                          activeCategory === category
                            ? "text-white border-transparent"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                        style={activeCategory === category ? { backgroundColor: brandColor } : {}}
                        data-testid={`button-category-${category}`}
                      >
                        <Scissors className="h-4 w-4" />
                        <span className="font-medium text-sm">{category}</span>
                      </button>
                    ))
                  ) : (
                    menuData.categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                          activeCategory === category.id
                            ? "text-white border-transparent"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                        style={activeCategory === category.id ? { backgroundColor: brandColor } : {}}
                        data-testid={`button-category-${category.id}`}
                      >
                        <Package className="h-4 w-4" />
                        <span className="font-medium text-sm">{category.name}</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Abas Populares / Promoções */}
                <div className="flex items-center gap-6 mb-4">
                  <button
                    onClick={() => setActiveTab("populares")}
                    className={`text-base font-semibold pb-2 border-b-2 transition-colors ${
                      activeTab === "populares"
                        ? "border-current"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                    style={activeTab === "populares" ? { color: brandColor } : {}}
                    data-testid="tab-populares"
                  >
                    {isServicesMenu ? "Todos" : "Populares"}
                  </button>
                  <button
                    onClick={() => setActiveTab("promocoes")}
                    className={`text-base font-semibold pb-2 border-b-2 transition-colors ${
                      activeTab === "promocoes"
                        ? "border-current"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                    style={activeTab === "promocoes" ? { color: brandColor } : {}}
                    data-testid="tab-promocoes"
                  >
                    Promoções
                  </button>
                </div>

                {/* Grid de Produtos ou Serviços */}
                {isServicesMenu ? (
                  // Grid de Serviços
                  (() => {
                    const displayServices = activeTab === "promocoes" 
                      ? filteredServices.filter(s => isServiceOnPromotion(s))
                      : filteredServices;
                    
                    return displayServices.length === 0 ? (
                      <div className="text-center py-12">
                        <Scissors className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {activeTab === "promocoes"
                            ? "Nenhum serviço em promoção no momento."
                            : searchQuery
                              ? "Nenhum serviço encontrado para sua busca."
                              : "Nenhum serviço disponível no momento."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayServices.map((service) => {
                          const isOnPromotion = isServiceOnPromotion(service);
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          
                          return (
                            <div
                              key={service.id}
                              className={`p-1.5 rounded-2xl bg-white border transition-all hover:shadow-lg ${
                                isSelected ? 'border-2' : 'border-gray-200'
                              }`}
                              style={isSelected ? { borderColor: brandColor } : {}}
                              data-testid={`card-service-${service.id}`}
                            >
                              <div className="bg-white rounded-xl overflow-hidden">
                                {/* Imagem do Serviço */}
                                <div className="relative bg-gray-200 p-4 flex items-center justify-center h-40 rounded-xl">
                                  {isOnPromotion && (
                                    <div 
                                      className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium text-white"
                                      style={{ backgroundColor: brandColor }}
                                    >
                                      Promoção
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div 
                                      className="absolute top-2 right-2 p-1.5 rounded-full text-white"
                                      style={{ backgroundColor: brandColor }}
                                    >
                                      <Check className="w-4 h-4" />
                                    </div>
                                  )}
                                  {service.imageUrl ? (
                                    <img
                                      src={service.imageUrl}
                                      alt={service.name}
                                      className="max-h-full max-w-full object-contain"
                                      loading="lazy"
                                      data-testid={`img-service-${service.id}`}
                                    />
                                  ) : (
                                    <Scissors className="h-16 w-16 text-gray-300" />
                                  )}
                                </div>

                                {/* Info do Serviço */}
                                <div className="p-4">
                                  <h3 className="font-semibold text-gray-900 mb-1">
                                    {service.name}
                                  </h3>
                                  
                                  {/* Duração */}
                                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDuration(service.duration)}</span>
                                  </div>

                                  {/* Descrição */}
                                  {service.description && (
                                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                      {service.description}
                                    </p>
                                  )}
                                  
                                  {/* Preços */}
                                  <div className="flex items-center gap-2 mb-4">
                                    <span 
                                      className="font-bold text-xl"
                                      style={{ color: brandColor }}
                                    >
                                      {formatCurrency(getServicePrice(service))}
                                    </span>
                                    {isOnPromotion && (
                                      <span className="text-sm text-gray-400 line-through">
                                        {formatCurrency(service.price)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Botão Adicionar/Remover */}
                                  {isSelected ? (
                                    <button
                                      onClick={() => removeService(service.id)}
                                      className="w-full py-2.5 rounded-xl font-medium border-2 transition-all"
                                      style={{ 
                                        borderColor: brandColor, 
                                        color: brandColor,
                                        backgroundColor: `${brandColor}10`
                                      }}
                                      data-testid={`button-remove-${service.id}`}
                                    >
                                      Remover
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => addService(service)}
                                      className="w-full py-2.5 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                                      style={{ backgroundColor: brandColor }}
                                      data-testid={`button-add-${service.id}`}
                                    >
                                      Selecionar
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  // Grid de Produtos
                  (() => {
                    const displayProducts = activeTab === "promocoes" 
                      ? filteredProducts.filter(p => p.isOnSale)
                      : filteredProducts;
                    
                    return displayProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {activeTab === "promocoes"
                            ? "Nenhum produto em promoção no momento."
                            : searchQuery
                              ? "Nenhum produto encontrado para sua busca."
                              : "Nenhum produto disponível no momento."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayProducts.map((product) => (
                          <div
                            key={product.id}
                            className="p-1.5 rounded-2xl bg-white border border-gray-200 transition-all hover:shadow-lg"
                            data-testid={`card-product-${product.id}`}
                          >
                            <div className="bg-white rounded-xl overflow-hidden">
                              {/* Imagem do Produto */}
                              <div className="relative bg-gray-200 p-4 flex items-center justify-center h-40 rounded-xl">
                                {product.isOnSale && (
                                  <div 
                                    className="absolute top-2 left-2 p-1.5 rounded-lg"
                                    style={{ backgroundColor: brandColor }}
                                  >
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="max-h-full max-w-full object-contain"
                                    loading="lazy"
                                    data-testid={`img-product-${product.id}`}
                                  />
                                ) : (
                                  <Package className="h-16 w-16 text-gray-300" />
                                )}
                              </div>

                              {/* Info do Produto */}
                              <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                  {product.name}
                                </h3>
                                
                                {/* Preços */}
                                <div className="flex items-center gap-2 mb-4">
                                  <span 
                                    className="font-bold text-xl"
                                    style={{ color: brandColor }}
                                  >
                                    {formatCurrency(getProductPrice(product))}
                                  </span>
                                  {product.isOnSale && product.salePrice && (
                                    <span className="text-sm text-gray-400 line-through">
                                      {formatCurrency(product.price)}
                                    </span>
                                  )}
                                </div>

                                {/* Botão Adicionar */}
                                <button
                                  onClick={() => addToCart(product)}
                                  className="w-full py-2.5 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                                  style={{ backgroundColor: brandColor }}
                                  data-testid={`button-add-${product.id}`}
                                >
                                  Adicionar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Carrinho/Serviços Desktop */}
              <aside className="hidden lg:block w-96 flex-shrink-0 p-6">
                <div className="bg-white rounded-2xl border border-gray-200">
                  {/* Header */}
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-900">
                      {isServicesMenu ? "Serviços Selecionados" : "Carrinho"}
                    </h3>
                  </div>

                  {/* Itens */}
                  <div className="p-4 space-y-3 max-h-96 overflow-auto">
                    {isServicesMenu ? (
                      selectedServices.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Selecione os serviços desejados</p>
                        </div>
                      ) : (
                        selectedServices.map((service) => (
                          <div key={service.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                            {service.imageUrl ? (
                              <img 
                                src={service.imageUrl} 
                                alt={service.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Scissors className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-bold" style={{ color: brandColor }}>
                                  {formatCurrency(getServicePrice(service))}
                                </span>
                                <span className="text-gray-400">• {formatDuration(service.duration)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeService(service.id)}
                              className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <X className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        ))
                      )
                    ) : (
                      cart.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Seu carrinho está vazio</p>
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                            {item.product.imageUrl ? (
                              <img 
                                src={item.product.imageUrl} 
                                alt={item.product.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                              <p className="text-sm font-bold" style={{ color: brandColor }}>
                                {formatCurrency(getProductPrice(item.product))}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Minus className="h-4 w-4 text-gray-600" />
                              </button>
                              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Plus className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>

                  {/* Resumo e Botão */}
                  {isServicesMenu ? (
                    selectedServices.length > 0 && (
                      <div className="p-4 border-t space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duração Total</span>
                          <span className="font-medium">{formatDuration(totalDuration)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span style={{ color: brandColor }}>{formatCurrency(servicesTotal)}</span>
                        </div>
                        <button
                          onClick={() => setShowAppointmentModal(true)}
                          className="w-full py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                          style={{ backgroundColor: brandColor }}
                          data-testid="button-schedule"
                        >
                          Realizar Agendamento
                        </button>
                      </div>
                    )
                  ) : (
                    cart.length > 0 && (
                      <div className="p-4 border-t space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">{formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span style={{ color: brandColor }}>{formatCurrency(cartTotal)}</span>
                        </div>
                        <button
                          onClick={openCheckout}
                          className="w-full py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                          style={{ backgroundColor: brandColor }}
                          data-testid="button-checkout"
                        >
                          Fazer Pedido
                        </button>
                      </div>
                    )
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* Botão Carrinho/Agendamento Mobile - Posicionado acima da navegação */}
          {activeSection === "cardapio" && (isServicesMenu ? selectedServices.length > 0 : cart.length > 0) && (
            <button
              onClick={() => isServicesMenu ? setShowAppointmentModal(true) : setShowMobileCart(true)}
              className="md:hidden fixed bottom-[72px] left-4 right-4 z-40 flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl shadow-lg text-white"
              style={{ backgroundColor: brandColor }}
              data-testid="button-mobile-cart"
            >
              {isServicesMenu ? (
                <>
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Realizar Agendamento</span>
                  <span className="bg-white/20 text-sm font-bold px-2 py-0.5 rounded-full">
                    {selectedServices.length}
                  </span>
                  <span className="ml-auto font-bold">{formatCurrency(servicesTotal)}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-medium">Ver carrinho</span>
                  <span className="bg-white/20 text-sm font-bold px-2 py-0.5 rounded-full">
                    {cartItemCount}
                  </span>
                  <span className="ml-auto font-bold">{formatCurrency(cartTotal)}</span>
                </>
              )}
            </button>
          )}

          {/* Modal Carrinho Mobile */}
          {showMobileCart && (
            <div className="lg:hidden fixed inset-0 z-[55] bg-black/50" onClick={() => setShowMobileCart(false)}>
              <div 
                className="absolute bottom-[60px] left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Carrinho ({cartItemCount} itens)</h3>
                  <button onClick={() => setShowMobileCart(false)} className="p-1 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                      {item.product.imageUrl ? (
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name}
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="h-7 w-7 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                        <p className="font-bold" style={{ color: brandColor }}>
                          {formatCurrency(getProductPrice(item.product) * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span style={{ color: brandColor }}>{formatCurrency(cartTotal)}</span>
                  </div>
                  <button
                    onClick={openCheckout}
                    className="w-full py-3.5 rounded-xl text-white font-medium text-lg transition-opacity hover:opacity-90"
                    style={{ backgroundColor: brandColor }}
                    data-testid="button-checkout-mobile"
                  >
                    Fazer Pedido
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Checkout */}
          {showCheckout && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={closeCheckout}>
              <div 
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header do Checkout */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {checkoutStep === "confirmacao" ? "Pedido Confirmado!" : "Finalizar Pedido"}
                    </h2>
                    {checkoutStep !== "confirmacao" && (
                      <p className="text-sm text-gray-500">
                        {checkoutStep === "telefone" && "Passo 1 de 4 - Seu telefone"}
                        {checkoutStep === "dados" && "Passo 2 de 4 - Seus dados"}
                        {checkoutStep === "endereco" && "Passo 3 de 4 - Endereço de entrega"}
                        {checkoutStep === "pagamento" && "Passo 4 de 4 - Pagamento"}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={closeCheckout}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Conteúdo do Checkout */}
                <div className="flex-1 overflow-auto p-4">
                  {/* Passo 1: Telefone */}
                  {checkoutStep === "telefone" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          value={checkoutForm.phone}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            setCheckoutForm({ ...checkoutForm, phone: formatted });
                            // Buscar cliente quando telefone estiver completo
                            if (formatted.replace(/\D/g, "").length >= 10) {
                              searchClientByPhone(formatted);
                            } else {
                              setClientFound(null);
                            }
                          }}
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-checkout-phone"
                        />
                      </div>
                      
                      {isSearchingClient && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Buscando cadastro...</span>
                        </div>
                      )}
                      
                      {clientFound === true && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-700">
                            <Check className="h-4 w-4" />
                            <span className="text-sm font-medium">Cliente encontrado!</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1">
                            Olá, <strong>{checkoutForm.name}</strong>! Seus dados foram carregados.
                          </p>
                        </div>
                      )}
                      
                      {clientFound === false && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-700">
                            Novo por aqui? Vamos criar seu cadastro no próximo passo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Passo 2: Dados do Cliente */}
                  {checkoutStep === "dados" && (
                    <div className="space-y-4">
                      {clientFound && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-2">
                          <p className="text-sm text-gray-600">
                            Telefone: <strong>{checkoutForm.phone}</strong>
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome completo *
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.name}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                          placeholder="Seu nome"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-checkout-name"
                        />
                      </div>
                    </div>
                  )}

                  {/* Passo 3: Endereço */}
                  {checkoutStep === "endereco" && (
                    <div className="space-y-4">
                      {/* Endereços Salvos */}
                      {savedAddresses.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Endereços salvos</p>
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              onClick={() => {
                                setCheckoutForm({
                                  ...checkoutForm,
                                  selectedAddressId: addr.id,
                                  street: addr.street || "",
                                  number: addr.number || "",
                                  complement: addr.complement || "",
                                  neighborhood: addr.neighborhood || "",
                                  city: addr.city || "",
                                  reference: addr.reference || "",
                                  saveAddress: false,
                                });
                              }}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                checkoutForm.selectedAddressId === addr.id
                                  ? "border-2"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              style={checkoutForm.selectedAddressId === addr.id ? { borderColor: brandColor, backgroundColor: `${brandColor}10` } : {}}
                            >
                              <p className="font-medium text-gray-900">{addr.label || "Endereço"}</p>
                              <p className="text-sm text-gray-600">
                                {addr.street}{addr.number ? `, ${addr.number}` : ""}
                                {addr.complement ? ` - ${addr.complement}` : ""}
                              </p>
                              <p className="text-sm text-gray-500">
                                {addr.neighborhood}{addr.city ? ` - ${addr.city}` : ""}
                              </p>
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setCheckoutForm({
                                ...checkoutForm,
                                selectedAddressId: "",
                                street: "",
                                number: "",
                                complement: "",
                                neighborhood: "",
                                city: "",
                                reference: "",
                                saveAddress: true,
                              });
                            }}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              checkoutForm.selectedAddressId === ""
                                ? "border-2"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            style={checkoutForm.selectedAddressId === "" ? { borderColor: brandColor, backgroundColor: `${brandColor}10` } : {}}
                          >
                            <p className="font-medium text-gray-900">+ Novo endereço</p>
                            <p className="text-sm text-gray-500">Adicionar um novo endereço</p>
                          </button>
                        </div>
                      )}

                      {/* Formulário de novo endereço */}
                      {(savedAddresses.length === 0 || checkoutForm.selectedAddressId === "") && (
                        <>
                          <p className="text-sm text-gray-500 mb-2">Preencha o endereço de entrega (opcional para retirada)</p>
                      {/* CEP - Primeiro campo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={checkoutForm.zipCode}
                            onChange={(e) => {
                              const formatted = formatCep(e.target.value);
                              setCheckoutForm({ ...checkoutForm, zipCode: formatted });
                              if (formatted.replace(/\D/g, "").length === 8) {
                                searchCep(formatted);
                              }
                            }}
                            placeholder="00000-000"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                            style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                            data-testid="input-checkout-zipcode"
                          />
                          {isLoadingCep && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Digite o CEP para preencher automaticamente</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                          <input
                            type="text"
                            value={checkoutForm.street}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, street: e.target.value })}
                            placeholder="Nome da rua"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                            style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                            data-testid="input-checkout-street"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                          <input
                            type="text"
                            value={checkoutForm.number}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, number: e.target.value })}
                            placeholder="Nº"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                            style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                            data-testid="input-checkout-number"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                        <input
                          type="text"
                          value={checkoutForm.complement}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, complement: e.target.value })}
                          placeholder="Apto, bloco, etc."
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-checkout-complement"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                          <input
                            type="text"
                            value={checkoutForm.neighborhood}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, neighborhood: e.target.value })}
                            placeholder="Bairro"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                            style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                            data-testid="input-checkout-neighborhood"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                          <input
                            type="text"
                            value={checkoutForm.city}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, city: e.target.value })}
                            placeholder="Cidade"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                            style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                            data-testid="input-checkout-city"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ponto de referência</label>
                        <input
                          type="text"
                          value={checkoutForm.reference}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, reference: e.target.value })}
                          placeholder="Próximo a..."
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-checkout-reference"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checkoutForm.saveAddress}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, saveAddress: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300"
                            style={{ accentColor: brandColor }}
                          />
                          <span className="text-sm text-gray-700">Salvar endereço para próximos pedidos</span>
                        </label>
                        </>
                      )}
                    </div>
                  )}

                  {/* Passo 4: Pagamento */}
                  {checkoutStep === "pagamento" && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500 mb-2">Escolha a forma de pagamento</p>
                      <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map((method) => {
                          const Icon = method.icon;
                          const isSelected = checkoutForm.paymentMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: method.id, changeFor: "" })}
                              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                isSelected ? "border-2" : "border-gray-200 hover:border-gray-300"
                              }`}
                              style={isSelected ? { borderColor: brandColor, backgroundColor: `${brandColor}10` } : {}}
                              data-testid={`button-payment-${method.id}`}
                            >
                              <Icon className="h-6 w-6" style={{ color: isSelected ? brandColor : '#6B7280' }} />
                              <span className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'}`} style={isSelected ? { color: brandColor } : {}}>
                                {method.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Campo de Troco - apenas para pagamento em dinheiro */}
                      {checkoutForm.paymentMethod === "cash" && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Precisa de troco para quanto?
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={checkoutForm.changeFor}
                              onChange={(e) => setCheckoutForm({ ...checkoutForm, changeFor: formatCurrencyInput(e.target.value) })}
                              placeholder="0,00"
                              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                              style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                              data-testid="input-checkout-change"
                            />
                          </div>
                          {checkoutForm.changeFor && parseCurrencyInput(checkoutForm.changeFor) > 0 && parseCurrencyInput(checkoutForm.changeFor) < cartTotal && (
                            <p className="text-red-500 text-xs mt-2">
                              O valor do troco deve ser maior que o total do pedido ({formatCurrency(cartTotal)})
                            </p>
                          )}
                          {checkoutForm.changeFor && parseCurrencyInput(checkoutForm.changeFor) >= cartTotal && (
                            <p className="text-green-600 text-xs mt-2">
                              Troco: {formatCurrency(parseCurrencyInput(checkoutForm.changeFor) - cartTotal)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Deixe em branco se não precisar de troco
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea
                          value={checkoutForm.notes}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                          placeholder="Alguma observação sobre o pedido?"
                          rows={3}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm resize-none"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-checkout-notes"
                        />
                      </div>

                      {/* Resumo do Pedido */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <h4 className="font-medium text-gray-900 mb-2">Resumo do Pedido</h4>
                        {cart.map((item) => (
                          <div key={item.product.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                            <span className="font-medium">{formatCurrency(getProductPrice(item.product) * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span style={{ color: brandColor }}>{formatCurrency(cartTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirmação */}
                  {checkoutStep === "confirmacao" && orderSuccess && (
                    <div className="text-center py-8">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: `${brandColor}20` }}
                      >
                        <Check className="h-10 w-10" style={{ color: brandColor }} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido Realizado!</h3>
                      <p className="text-gray-600 mb-4">
                        Seu pedido #{orderSuccess.orderNumber} foi enviado com sucesso.
                      </p>
                      <p className="text-sm text-gray-500">
                        Em breve você receberá atualizações sobre o status do seu pedido.
                      </p>
                    </div>
                  )}

                  {/* Erro */}
                  {createOrderMutation.isError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                      <p className="text-red-700 text-sm">{createOrderMutation.error?.message || "Erro ao criar pedido"}</p>
                    </div>
                  )}
                </div>

                {/* Footer do Checkout */}
                <div className="p-4 border-t space-y-3">
                  {checkoutStep !== "confirmacao" ? (
                    <div className="flex gap-3">
                      {checkoutStep !== "telefone" && (
                        <button
                          onClick={prevStep}
                          className="flex-1 py-3 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          data-testid="button-checkout-back"
                        >
                          Voltar
                        </button>
                      )}
                      <button
                        onClick={nextStep}
                        disabled={!canProceed() || createOrderMutation.isPending}
                        className="flex-1 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ backgroundColor: brandColor }}
                        data-testid="button-checkout-next"
                      >
                        {createOrderMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          checkoutStep === "pagamento" ? "Confirmar Pedido" : "Continuar"
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={closeCheckout}
                      className="w-full py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                      style={{ backgroundColor: brandColor }}
                      data-testid="button-checkout-close"
                    >
                      Voltar ao Cardápio
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal de Agendamento */}
          {showAppointmentModal && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={closeAppointmentModal}>
              <div 
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header do Agendamento */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {bookingStep === "confirmacao" ? "Agendamento Confirmado!" : "Realizar Agendamento"}
                    </h2>
                    {bookingStep !== "confirmacao" && (
                      <p className="text-sm text-gray-500">
                        {bookingStep === "servicos" && "Passo 1 de 4 - Serviços selecionados"}
                        {bookingStep === "data" && "Passo 2 de 4 - Escolha a data"}
                        {bookingStep === "horario" && "Passo 3 de 4 - Escolha o horário"}
                        {bookingStep === "dados" && "Passo 4 de 4 - Seus dados"}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={closeAppointmentModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Conteúdo do Agendamento */}
                <div className="flex-1 overflow-auto p-4">
                  {/* Passo 1: Serviços */}
                  {bookingStep === "servicos" && (
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">
                        Confira os serviços selecionados para seu agendamento:
                      </p>
                      <div className="space-y-3">
                        {selectedServices.map((service) => (
                          <div key={service.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                            {service.imageUrl ? (
                              <img 
                                src={service.imageUrl} 
                                alt={service.name}
                                className="w-14 h-14 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Scissors className="h-7 w-7 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{service.name}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{formatDuration(service.duration)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold" style={{ color: brandColor }}>
                                {formatCurrency(getServicePrice(service))}
                              </p>
                            </div>
                            <button
                              onClick={() => removeService(service.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duração total</span>
                          <span className="font-medium">{formatDuration(totalDuration)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span style={{ color: brandColor }}>{formatCurrency(servicesTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passo 2: Data */}
                  {bookingStep === "data" && (
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">
                        Selecione a data para seu agendamento:
                      </p>
                      <div>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          className="w-full p-4 text-lg border rounded-xl focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-booking-date"
                        />
                      </div>
                      {selectedDate && (
                        <p className="text-sm text-gray-600 text-center">
                          Data selecionada: <span className="font-medium">
                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { 
                              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                            })}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Passo 3: Horário */}
                  {bookingStep === "horario" && (
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">
                        Horários disponíveis para{' '}
                        <span className="font-medium">
                          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { 
                            weekday: 'long', day: 'numeric', month: 'long' 
                          })}
                        </span>:
                      </p>
                      {isLoadingSlots ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          <span className="ml-2 text-gray-500">Buscando horários...</span>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                          <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                          <p className="text-yellow-800 font-medium">Nenhum horário disponível</p>
                          <p className="text-yellow-600 text-sm mt-1">
                            Não há horários disponíveis para esta data. Por favor, escolha outra data.
                          </p>
                          <button
                            onClick={() => setBookingStep("data")}
                            className="mt-3 px-4 py-2 rounded-lg text-yellow-700 bg-yellow-100 hover:bg-yellow-200 font-medium transition-colors"
                          >
                            Escolher outra data
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setSelectedTime(slot)}
                              className={`p-3 rounded-xl border-2 font-medium transition-all ${
                                selectedTime === slot
                                  ? 'text-white border-transparent'
                                  : 'text-gray-700 border-gray-200 hover:border-gray-300'
                              }`}
                              style={{
                                backgroundColor: selectedTime === slot ? brandColor : undefined,
                                borderColor: selectedTime === slot ? brandColor : undefined,
                              }}
                              data-testid={`button-slot-${slot.replace(':', '')}`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Passo 4: Dados */}
                  {bookingStep === "dados" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome completo
                        </label>
                        <input
                          type="text"
                          value={bookingForm.name}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Seu nome completo"
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-booking-name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone / WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-booking-phone"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações (opcional)
                        </label>
                        <textarea
                          value={bookingForm.notes}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Alguma observação para o estabelecimento?"
                          rows={2}
                          className="w-full p-3 border rounded-xl resize-none focus:ring-2 focus:border-transparent"
                          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                          data-testid="input-booking-notes"
                        />
                      </div>

                      {/* Resumo do Agendamento */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <h4 className="font-medium text-gray-900 mb-2">Resumo do Agendamento</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Data</span>
                          <span className="font-medium">
                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { 
                              weekday: 'short', day: 'numeric', month: 'short' 
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Horário</span>
                          <span className="font-medium">{selectedTime}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duração</span>
                          <span className="font-medium">{formatDuration(totalDuration)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          {selectedServices.map((service) => (
                            <div key={service.id} className="flex justify-between text-sm">
                              <span className="text-gray-600">{service.name}</span>
                              <span className="font-medium">{formatCurrency(getServicePrice(service))}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span style={{ color: brandColor }}>{formatCurrency(servicesTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirmação */}
                  {bookingStep === "confirmacao" && appointmentSuccess && (
                    <div className="text-center py-8">
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: `${brandColor}20` }}
                      >
                        <Check className="h-10 w-10" style={{ color: brandColor }} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h3>
                      <p className="text-gray-600 mb-4">
                        Seu agendamento foi realizado com sucesso para{' '}
                        <span className="font-medium">
                          {new Date(appointmentSuccess.date + 'T12:00:00').toLocaleDateString('pt-BR', { 
                            weekday: 'long', day: 'numeric', month: 'long' 
                          })}
                        </span>{' '}
                        às <span className="font-medium">{appointmentSuccess.time}</span>.
                      </p>
                      <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1 mb-4">
                        {appointmentSuccess.services.map((service, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{service.name}</span>
                            <span className="font-medium">{formatCurrency(service.value)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span style={{ color: brandColor }}>{formatCurrency(appointmentSuccess.totalValue)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Você receberá uma confirmação em breve.
                      </p>
                    </div>
                  )}

                  {/* Erro */}
                  {createAppointmentMutation.isError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                      <p className="text-red-700 text-sm">{createAppointmentMutation.error?.message || "Erro ao criar agendamento"}</p>
                    </div>
                  )}
                </div>

                {/* Footer do Agendamento */}
                <div className="p-4 border-t space-y-3">
                  {bookingStep !== "confirmacao" ? (
                    <div className="flex gap-3">
                      {bookingStep !== "servicos" && (
                        <button
                          onClick={prevBookingStep}
                          className="flex-1 py-3 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          data-testid="button-booking-back"
                        >
                          Voltar
                        </button>
                      )}
                      <button
                        onClick={nextBookingStep}
                        disabled={!canProceedBooking() || createAppointmentMutation.isPending || (bookingStep === "horario" && availableSlots.length === 0)}
                        className="flex-1 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ backgroundColor: brandColor }}
                        data-testid="button-booking-next"
                      >
                        {createAppointmentMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Agendando...
                          </>
                        ) : (
                          bookingStep === "dados" ? "Confirmar Agendamento" : "Continuar"
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={closeAppointmentModal}
                      className="w-full py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                      style={{ backgroundColor: brandColor }}
                      data-testid="button-booking-close"
                    >
                      Voltar aos Serviços
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seção: Pedidos */}
          {activeSection === "pedidos" && (
            <div className="px-4 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Meus Pedidos</h2>
              {isLoadingClientData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : clientOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Você não tem pedidos em andamento.</p>
                  <button
                    onClick={() => setActiveSection("cardapio")}
                    className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: brandColor }}
                  >
                    Ver Cardápio
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-bold text-gray-900">Pedido #{order.orderNumber}</span>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: order.status === 'pending' ? '#FEF3C7' : 
                                           order.status === 'confirmed' ? '#DBEAFE' :
                                           order.status === 'preparing' ? '#FED7AA' :
                                           order.status === 'ready' ? '#D1FAE5' :
                                           order.status === 'delivering' ? '#E0E7FF' : '#F3F4F6',
                            color: order.status === 'pending' ? '#92400E' : 
                                   order.status === 'confirmed' ? '#1E40AF' :
                                   order.status === 'preparing' ? '#C2410C' :
                                   order.status === 'ready' ? '#065F46' :
                                   order.status === 'delivering' ? '#3730A3' : '#374151'
                          }}
                        >
                          {order.status === 'pending' && 'Pendente'}
                          {order.status === 'confirmed' && 'Confirmado'}
                          {order.status === 'preparing' && 'Preparando'}
                          {order.status === 'ready' && 'Pronto'}
                          {order.status === 'delivering' && 'Saiu para entrega'}
                        </span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.quantity}x {item.productName}</span>
                            <span className="text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span style={{ color: brandColor }}>{formatCurrency(order.total)}</span>
                      </div>
                      {order.deliveryStreet && (
                        <p className="text-xs text-gray-500 mt-2">
                          Entrega: {order.deliveryStreet}{order.deliveryNumber ? `, ${order.deliveryNumber}` : ''} - {order.deliveryNeighborhood}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seção: Histórico */}
          {activeSection === "historico" && (
            <div className="px-4 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico de Pedidos</h2>
              {isLoadingClientData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : clientHistory.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Seu histórico de pedidos aparecerá aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientHistory.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4 opacity-80">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-bold text-gray-900">Pedido #{order.orderNumber}</span>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: order.status === 'delivered' ? '#D1FAE5' : '#FEE2E2',
                            color: order.status === 'delivered' ? '#065F46' : '#991B1B'
                          }}
                        >
                          {order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                        </span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.quantity}x {item.productName}</span>
                            <span className="text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span style={{ color: brandColor }}>{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seção: Endereços */}
          {activeSection === "enderecos" && (
            <div className="px-4 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Meus Endereços</h2>
              {isLoadingClientData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : clientAddresses.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Você ainda não tem endereços salvos.</p>
                  <p className="text-sm text-gray-400">Seus endereços serão salvos automaticamente ao fazer pedidos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientAddresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3"
                    >
                      <div 
                        className="p-2 rounded-full"
                        style={{ backgroundColor: `${brandColor}15` }}
                      >
                        <MapPin className="h-5 w-5" style={{ color: brandColor }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{addr.label || 'Endereço'}</span>
                          {addr.isDefault && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                            >
                              Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {addr.street}{addr.number ? `, ${addr.number}` : ''}
                          {addr.complement ? ` - ${addr.complement}` : ''}
                        </p>
                        <p className="text-sm text-gray-500">
                          {addr.neighborhood}{addr.city ? ` - ${addr.city}` : ''}
                        </p>
                        {addr.reference && (
                          <p className="text-xs text-gray-400 mt-1">Ref: {addr.reference}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal de Identificação por Telefone */}
          {showPhoneModal && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPhoneModal(false)}>
              <div 
                className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b">
                  <h2 className="text-lg font-bold text-gray-900">Identifique-se</h2>
                  <p className="text-sm text-gray-500">Digite seu telefone para ver seus pedidos e endereços</p>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 text-sm"
                      style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                      data-testid="input-phone-identify"
                    />
                  </div>
                </div>
                <div className="p-4 border-t flex gap-3">
                  <button
                    onClick={() => setShowPhoneModal(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={identifyClient}
                    disabled={phoneInput.replace(/\D/g, "").length < 10 || isLoadingClientData}
                    className="flex-1 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: brandColor }}
                  >
                    {isLoadingClientData ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      'Continuar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="bg-white border-t py-4 text-center text-xs text-gray-400">
        Cardápio Digital - {menuData.tenant.name}
      </footer>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
