import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProductDialog } from "@/components/ProductDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeText } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductCategory } from "@shared/schema";

export default function InventoryPage() {
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/inventory/products"],
  });

  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/inventory/categories"],
  });

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/inventory/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      setShowProductDialog(false);
      setEditingProduct(null);
      toast({
        title: "Produto criado",
        description: "O produto foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/inventory/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      setShowProductDialog(false);
      setEditingProduct(null);
      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inventory/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, adjustment }: { id: string; adjustment: number }) =>
      apiRequest("PATCH", `/api/inventory/products/${id}/stock`, { adjustment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      toast({
        title: "Estoque ajustado",
        description: "O estoque foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao ajustar estoque",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          normalizeText(p.name).includes(normalizeText(searchQuery)) ||
          normalizeText(p.description).includes(normalizeText(searchQuery))
      )
    : products;

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = (data: any) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowProductDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteProductMutation.mutate(id);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
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
            Produtos / Estoque
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie seus produtos e controle de estoque
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setShowProductDialog(true);
          }}
          className="gap-2"
          data-testid="button-add-product"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
          <Input
            type="text"
            placeholder="Buscar produtos..."
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
          {filteredProducts.length} produto(s) encontrado(s)
        </div>
      </div>

      {paginatedProducts.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <Package className="mx-auto h-12 w-12 text-bodydark2 mb-4" />
          <p className="text-bodydark2 mb-4">
            {searchQuery
              ? "Nenhum produto encontrado com os critérios de busca."
              : "Nenhum produto cadastrado ainda."}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                setEditingProduct(null);
                setShowProductDialog(true);
              }}
            >
              Adicionar Primeiro Produto
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Produto
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Categoria
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                      Preço
                    </TableHead>
                    <TableHead className="px-4 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                      Estoque
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
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                              data-testid={`img-product-${product.id}`}
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-gray-500 text-theme-xs dark:text-gray-400 truncate max-w-xs">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        {product.categoryId && categoryMap.get(product.categoryId) ? (
                          <Badge variant="outline" className="text-gray-600 dark:text-gray-300">
                            {categoryMap.get(product.categoryId)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-theme-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <span className="text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                          {formatCurrency(product.price)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {product.manageStock ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => adjustStockMutation.mutate({ id: product.id, adjustment: -1 })}
                              disabled={product.quantity === 0}
                              data-testid={`button-stock-decrease-${product.id}`}
                            >
                              -
                            </Button>
                            <span className={`min-w-[40px] font-medium ${product.quantity !== null && product.quantity <= 5 ? 'text-meta-1' : 'text-gray-800 dark:text-white/90'}`}>
                              {product.quantity ?? 0}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => adjustStockMutation.mutate({ id: product.id, adjustment: 1 })}
                              data-testid={`button-stock-increase-${product.id}`}
                            >
                              +
                            </Button>
                            {product.quantity !== null && product.quantity <= 5 && (
                              <AlertTriangle className="h-4 w-4 text-meta-1" />
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Ilimitado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                          className={product.isActive ? "bg-meta-3 text-white" : ""}
                        >
                          {product.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                            className="hover-elevate"
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(product.id)}
                            className="text-meta-1 hover:text-meta-1 hover-elevate"
                            data-testid={`button-delete-${product.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} até{" "}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de{" "}
                {filteredProducts.length} produtos
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

      <ProductDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onSubmit={handleSubmit}
        product={editingProduct}
        isLoading={createProductMutation.isPending || updateProductMutation.isPending}
      />
    </div>
  );
}
