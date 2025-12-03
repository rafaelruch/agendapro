import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Package, ShoppingBag, User, X, ChevronDown, LogOut, UtensilsCrossed, ClipboardList, History, MapPin, Menu as MenuIcon, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";

type ActiveSection = "cardapio" | "pedidos" | "historico" | "enderecos";

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

interface MenuData {
  tenant: {
    name: string;
    logoUrl: string | null;
    brandColor: string;
    bannerUrl: string | null;
    minOrderValue: number | null;
  };
  categories: MenuCategory[];
  products: MenuProduct[];
  featuredProducts: MenuProduct[];
  productsOnSale: MenuProduct[];
  deliveryFees: DeliveryNeighborhood[];
}

export default function PublicMenuPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [registerForm, setRegisterForm] = useState({ name: "", phone: "" });
  const [activeSection, setActiveSection] = useState<ActiveSection>("cardapio");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [activeTab, setActiveTab] = useState<"populares" | "promocoes">("populares");

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

  const sidebarMenus = [
    { id: "cardapio" as ActiveSection, label: "Cardápio", icon: UtensilsCrossed },
    { id: "pedidos" as ActiveSection, label: "Pedidos", icon: ClipboardList },
    { id: "historico" as ActiveSection, label: "Histórico", icon: History },
    { id: "enderecos" as ActiveSection, label: "Endereços", icon: MapPin },
  ];

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
        <div className="px-6 py-2">
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

            {/* Perfil / Cadastro à Direita */}
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
                  onClick={() => setActiveSection(menu.id)}
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

        {/* Botão Menu Mobile */}
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="md:hidden fixed bottom-20 left-4 z-40 p-3 rounded-full shadow-lg text-white"
          style={{ backgroundColor: brandColor }}
          data-testid="button-mobile-menu"
        >
          <MenuIcon className="h-6 w-6" />
        </button>

        {/* Sidebar Mobile Overlay */}
        {showMobileSidebar && (
          <div className="md:hidden fixed inset-0 z-[55] bg-black/50" onClick={() => setShowMobileSidebar(false)}>
            <div 
              className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Menu</h3>
                <button 
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <nav className="space-y-2">
                {sidebarMenus.map((menu) => {
                  const Icon = menu.icon;
                  const isActive = activeSection === menu.id;
                  return (
                    <button
                      key={menu.id}
                      onClick={() => {
                        setActiveSection(menu.id);
                        setShowMobileSidebar(false);
                      }}
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
                      data-testid={`sidebar-mobile-${menu.id}`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "" : "text-gray-500"}`} />
                      <span className={`font-medium ${isActive ? "" : "text-gray-700"}`}>
                        {menu.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0">
          {/* Seção: Cardápio */}
          {activeSection === "cardapio" && (
            <div className="flex">
              {/* Área de Produtos */}
              <div className="flex-1 min-w-0 p-6">
                {/* Título Categorias */}
                <h2 className="text-lg font-bold text-gray-800 mb-4">Explorar Categorias</h2>
                
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
                    <UtensilsCrossed className="h-4 w-4" />
                    <span className="font-medium text-sm">Todos</span>
                  </button>
                  {menuData.categories.map((category) => (
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
                  ))}
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
                    Populares
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

                {/* Grid de Produtos */}
                {(() => {
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
                })()}
              </div>

              {/* Carrinho Desktop */}
              <aside className="hidden lg:block w-96 flex-shrink-0 p-6">
                <div className="bg-white rounded-2xl border border-gray-200">
                  {/* Header do Carrinho */}
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-900">Carrinho</h3>
                  </div>

                  {/* Itens do Carrinho */}
                  <div className="p-4 space-y-3 max-h-96 overflow-auto">
                    {cart.length === 0 ? (
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
                    )}
                  </div>

                  {/* Resumo e Botão */}
                  {cart.length > 0 && (
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
                        className="w-full py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                        style={{ backgroundColor: brandColor }}
                        data-testid="button-checkout"
                      >
                        Fazer Pedido
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* Botão Carrinho Mobile */}
          {activeSection === "cardapio" && cart.length > 0 && (
            <button
              onClick={() => setShowMobileCart(true)}
              className="lg:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white"
              style={{ backgroundColor: brandColor }}
              data-testid="button-mobile-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium">{formatCurrency(cartTotal)}</span>
              <span className="bg-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: brandColor }}>
                {cartItemCount}
              </span>
            </button>
          )}

          {/* Modal Carrinho Mobile */}
          {showMobileCart && (
            <div className="lg:hidden fixed inset-0 z-[55] bg-black/50" onClick={() => setShowMobileCart(false)}>
              <div 
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
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

          {/* Seção: Pedidos */}
          {activeSection === "pedidos" && (
            <div className="px-4 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Meus Pedidos</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Você ainda não tem pedidos.</p>
                <button
                  onClick={() => setActiveSection("cardapio")}
                  className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: brandColor }}
                >
                  Ver Cardápio
                </button>
              </div>
            </div>
          )}

          {/* Seção: Histórico */}
          {activeSection === "historico" && (
            <div className="px-4 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico de Pedidos</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Seu histórico de pedidos aparecerá aqui.</p>
              </div>
            </div>
          )}

          {/* Seção: Endereços */}
          {activeSection === "enderecos" && (
            <div className="px-4 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Meus Endereços</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Você ainda não tem endereços salvos.</p>
                <button
                  className="px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: brandColor }}
                >
                  Adicionar Endereço
                </button>
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
