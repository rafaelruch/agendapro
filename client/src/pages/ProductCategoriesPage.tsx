import { useState } from "react";
import { 
  Plus, Search, Edit2, Trash2, GripVertical, Tag,
  Package, Coffee, Pizza, Cake, Beer, Wine, IceCream, Sandwich,
  Apple, Beef, Fish, Salad, Soup, Cookie, Croissant, Drumstick,
  UtensilsCrossed, ShoppingBag, Gift, Heart, Star, Sparkles,
  Flame, Leaf, Droplets, Milk, Egg, Wheat, Cherry, Grape,
  type LucideIcon
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/ui/modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProductCategory } from "@shared/schema";

const AVAILABLE_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "Package", icon: Package, label: "Pacote" },
  { name: "Coffee", icon: Coffee, label: "Café" },
  { name: "Pizza", icon: Pizza, label: "Pizza" },
  { name: "Cake", icon: Cake, label: "Bolo" },
  { name: "Beer", icon: Beer, label: "Cerveja" },
  { name: "Wine", icon: Wine, label: "Vinho" },
  { name: "IceCream", icon: IceCream, label: "Sorvete" },
  { name: "Sandwich", icon: Sandwich, label: "Sanduíche" },
  { name: "Apple", icon: Apple, label: "Fruta" },
  { name: "Beef", icon: Beef, label: "Carne" },
  { name: "Fish", icon: Fish, label: "Peixe" },
  { name: "Salad", icon: Salad, label: "Salada" },
  { name: "Soup", icon: Soup, label: "Sopa" },
  { name: "Cookie", icon: Cookie, label: "Biscoito" },
  { name: "Croissant", icon: Croissant, label: "Padaria" },
  { name: "Drumstick", icon: Drumstick, label: "Frango" },
  { name: "UtensilsCrossed", icon: UtensilsCrossed, label: "Refeição" },
  { name: "ShoppingBag", icon: ShoppingBag, label: "Compras" },
  { name: "Gift", icon: Gift, label: "Presente" },
  { name: "Heart", icon: Heart, label: "Favoritos" },
  { name: "Star", icon: Star, label: "Destaque" },
  { name: "Sparkles", icon: Sparkles, label: "Especial" },
  { name: "Flame", icon: Flame, label: "Picante" },
  { name: "Leaf", icon: Leaf, label: "Vegano" },
  { name: "Droplets", icon: Droplets, label: "Bebidas" },
  { name: "Milk", icon: Milk, label: "Laticínios" },
  { name: "Egg", icon: Egg, label: "Ovos" },
  { name: "Wheat", icon: Wheat, label: "Grãos" },
  { name: "Cherry", icon: Cherry, label: "Frutas" },
  { name: "Grape", icon: Grape, label: "Uva" },
];

const getIconComponent = (iconName: string | null): LucideIcon => {
  const found = AVAILABLE_ICONS.find(i => i.name === iconName);
  return found?.icon || Package;
};

export default function ProductCategoriesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    icon: "Package",
    isActive: true,
  });
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useQuery<ProductCategory[]>({
    queryKey: ["/api/inventory/categories"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/inventory/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      setShowDialog(false);
      setEditingCategory(null);
      resetForm();
      toast({
        title: "Categoria criada",
        description: "A categoria foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/inventory/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      setShowDialog(false);
      setEditingCategory(null);
      resetForm();
      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inventory/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiRequest("POST", "/api/inventory/categories/reorder", { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      toast({
        title: "Ordem atualizada",
        description: "A ordem das categorias foi atualizada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCategories = searchQuery
    ? categories.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : categories;

  const sortedCategories = [...filteredCategories].sort((a, b) => a.displayOrder - b.displayOrder);

  const resetForm = () => {
    setFormData({ name: "", icon: "Package", isActive: true });
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || "Package",
      isActive: category.isActive,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria? Os produtos desta categoria ficarão sem categoria.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const moveCategory = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedCategories.length) return;

    const newOrder = [...sortedCategories];
    const [removed] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, removed);

    reorderMutation.mutate(newOrder.map(c => c.id));
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
            Categorias de Produtos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Organize seus produtos em categorias para o cardápio
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            resetForm();
            setShowDialog(true);
          }}
          className="gap-2"
          data-testid="button-add-category"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
          <Input
            type="text"
            placeholder="Buscar categorias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
            data-testid="input-search"
          />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredCategories.length} categoria(s)
        </div>
      </div>

      {sortedCategories.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <Tag className="mx-auto h-12 w-12 text-bodydark2 mb-4" />
          <p className="text-bodydark2 mb-4">
            {searchQuery
              ? "Nenhuma categoria encontrada."
              : "Nenhuma categoria cadastrada ainda."}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                setEditingCategory(null);
                resetForm();
                setShowDialog(true);
              }}
            >
              Criar Primeira Categoria
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 w-16">
                    Ordem
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Nome
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
                {sortedCategories.map((category, index) => (
                  <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => moveCategory(index, "up")}
                          disabled={index === 0 || reorderMutation.isPending}
                          data-testid={`button-move-up-${category.id}`}
                        >
                          ↑
                        </Button>
                        <span className="text-gray-500 text-sm min-w-[20px]">{index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => moveCategory(index, "down")}
                          disabled={index === sortedCategories.length - 1 || reorderMutation.isPending}
                          data-testid={`button-move-down-${category.id}`}
                        >
                          ↓
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const IconComponent = getIconComponent(category.icon);
                          return <IconComponent className="h-5 w-5 text-primary" />;
                        })()}
                        <p className="text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                          {category.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge
                        variant={category.isActive ? "default" : "secondary"}
                        className={category.isActive ? "bg-meta-3 text-white" : ""}
                      >
                        {category.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(category)}
                          className="hover-elevate"
                          data-testid={`button-edit-${category.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(category.id)}
                          className="text-meta-1 hover:text-meta-1 hover-elevate"
                          data-testid={`button-delete-${category.id}`}
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
      )}

      <Modal isOpen={showDialog} onClose={() => setShowDialog(false)}>
        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white" data-testid="text-dialog-title">
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Preencha as informações da categoria.
            </p>
          </div>

          <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Lanches, Bebidas, Sobremesas..."
                data-testid="input-category-name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Ícone da Categoria</Label>
              <div className="grid grid-cols-6 gap-2 p-3 border rounded-lg border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                {AVAILABLE_ICONS.map((iconItem) => {
                  const IconComponent = iconItem.icon;
                  const isSelected = formData.icon === iconItem.name;
                  return (
                    <button
                      key={iconItem.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconItem.name })}
                      className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                      title={iconItem.label}
                      data-testid={`button-icon-${iconItem.name}`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="text-[10px] truncate w-full text-center">{iconItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Categoria Ativa</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Categorias inativas não aparecem no cardápio
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-category-active"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Salvando..."
                : editingCategory
                ? "Salvar"
                : "Criar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
