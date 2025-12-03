import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Package, ShoppingBag } from "lucide-react";

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

  const slug = window.location.pathname.replace('/menu/', '');

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
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo e Nome à Esquerda */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {menuData.tenant.logoUrl ? (
                <img
                  src={menuData.tenant.logoUrl}
                  alt={menuData.tenant.name}
                  className="h-10 w-10 object-contain rounded-lg"
                  data-testid="img-tenant-logo"
                />
              ) : (
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: brandColor }}
                >
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
              )}
              <span 
                className="font-bold text-lg hidden sm:block"
                style={{ color: brandColor }}
                data-testid="text-tenant-name"
              >
                {menuData.tenant.name}
              </span>
            </div>

            {/* Campo de Busca Centralizado */}
            <div className="flex-1 max-w-md mx-4">
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

            {/* Espaço à direita para balancear (pode adicionar mais ações depois) */}
            <div className="hidden md:block w-10" />
          </div>
        </div>
      </header>

      {/* Pills de Categorias */}
      {menuData.categories.length > 0 && (
        <div className="sticky top-[65px] z-40 bg-white shadow-sm border-b">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === null
                    ? "text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={activeCategory === null ? { backgroundColor: brandColor } : {}}
                data-testid="button-category-all"
              >
                Todos
              </button>
              {menuData.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === category.id
                      ? "text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={activeCategory === category.id ? { backgroundColor: brandColor } : {}}
                  data-testid={`button-category-${category.id}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery
                ? "Nenhum produto encontrado para sua busca."
                : "Nenhum produto disponível no momento."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(groupedProducts.entries()).map(([categoryId, products]) => (
              <section key={categoryId}>
                <h2
                  className="text-lg font-bold mb-4 pb-2 border-b-2"
                  style={{ borderColor: brandColor, color: brandColor }}
                  data-testid={`text-category-${categoryId}`}
                >
                  {getCategoryName(categoryId)}
                </h2>
                <div className="space-y-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                      data-testid={`card-product-${product.id}`}
                    >
                      <div className="flex">
                        <div className="flex-1 p-4">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                              {product.description}
                            </p>
                          )}
                          <p
                            className="font-bold text-lg"
                            style={{ color: brandColor }}
                          >
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        {product.imageUrl && (
                          <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              data-testid={`img-product-${product.id}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t py-3 text-center text-xs text-gray-400">
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
