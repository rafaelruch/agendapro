import { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, X, Image as ImageIcon, Plus, Trash2, Star, Tag } from "lucide-react";
import type { Product, ProductCategory, ProductAddon } from "@shared/schema";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  product: Product | null;
  isLoading?: boolean;
}

export function ProductDialog({
  open,
  onOpenChange,
  onSubmit,
  product,
  isLoading,
}: ProductDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    isFeatured: false,
    isOnSale: false,
    manageStock: false,
    quantity: "",
    isActive: true,
    categoryId: "",
    imageUrl: "",
  });

  const [newAddon, setNewAddon] = useState({
    name: "",
    price: "",
    isRequired: false,
    maxQuantity: "1",
  });

  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/inventory/categories"],
    enabled: open,
  });

  const { data: addons = [], refetch: refetchAddons } = useQuery<ProductAddon[]>({
    queryKey: ["/api/product-addons", product?.id],
    queryFn: () => product?.id ? fetch(`/api/product-addons?productId=${product.id}`, { credentials: "include" }).then(r => r.json()) : Promise.resolve([]),
    enabled: open && !!product?.id,
  });

  const createAddonMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/product-addons", data);
    },
    onSuccess: () => {
      refetchAddons();
      setNewAddon({ name: "", price: "", isRequired: false, maxQuantity: "1" });
    },
  });

  const deleteAddonMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/product-addons/${id}`);
    },
    onSuccess: () => {
      refetchAddons();
    },
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: String(product.price),
        salePrice: product.salePrice ? String(product.salePrice) : "",
        isFeatured: product.isFeatured ?? false,
        isOnSale: product.isOnSale ?? false,
        manageStock: product.manageStock,
        quantity: product.quantity !== null ? String(product.quantity) : "",
        isActive: product.isActive,
        categoryId: product.categoryId || "",
        imageUrl: product.imageUrl || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        salePrice: "",
        isFeatured: false,
        isOnSale: false,
        manageStock: false,
        quantity: "",
        isActive: true,
        categoryId: "",
        imageUrl: "",
      });
    }
  }, [product, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    setUploading(true);
    try {
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formDataUpload,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer upload da imagem");
      }

      const { url } = await response.json();
      setFormData({ ...formData, imageUrl: url });
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddAddon = () => {
    if (!newAddon.name || !newAddon.price || !product?.id) return;
    
    createAddonMutation.mutate({
      productId: product.id,
      name: newAddon.name,
      price: parseFloat(newAddon.price),
      isRequired: newAddon.isRequired,
      maxQuantity: parseInt(newAddon.maxQuantity) || 1,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      salePrice: formData.isOnSale && formData.salePrice ? parseFloat(formData.salePrice) : null,
      isFeatured: formData.isFeatured,
      isOnSale: formData.isOnSale,
      manageStock: formData.manageStock,
      quantity: formData.manageStock && formData.quantity ? parseInt(formData.quantity) : null,
      isActive: formData.isActive,
      categoryId: formData.categoryId || null,
      imageUrl: formData.imageUrl || null,
    };
    
    onSubmit(data);
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white" data-testid="text-dialog-title">
            {product ? "Editar Produto" : "Novo Produto"}
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha as informações do produto abaixo.
          </p>
        </div>
        
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5 max-h-[60vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Imagem do Produto</Label>
            <div className="flex items-start gap-4">
              {formData.imageUrl ? (
                <div className="relative">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                    data-testid="img-product-preview"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    data-testid="button-remove-image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  data-testid="input-product-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="button-upload-image"
                >
                  {uploading ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar Imagem
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  JPG, PNG, GIF ou WebP. Máximo 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Produto</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Hambúrguer Artesanal"
              data-testid="input-product-name"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do produto..."
              data-testid="input-product-description"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <select
              id="category"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              data-testid="select-product-category"
            >
              <option value="">Sem categoria</option>
              {categories.filter(c => c.isActive).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              step={0.01}
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              data-testid="input-product-price"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-500" />
              <div className="space-y-0.5">
                <Label htmlFor="isFeatured">Produto em Destaque</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aparece na seção de destaques do cardápio
                </p>
              </div>
            </div>
            <Switch
              id="isFeatured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
              data-testid="switch-is-featured"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-red-500" />
              <div className="space-y-0.5">
                <Label htmlFor="isOnSale">Produto em Promoção</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aparece na seção de promoções do cardápio
                </p>
              </div>
            </div>
            <Switch
              id="isOnSale"
              checked={formData.isOnSale}
              onCheckedChange={(checked) => setFormData({ ...formData, isOnSale: checked })}
              data-testid="switch-is-on-sale"
            />
          </div>

          {formData.isOnSale && (
            <div className="grid gap-2">
              <Label htmlFor="salePrice">Preço Promocional (R$)</Label>
              <Input
                id="salePrice"
                type="number"
                step={0.01}
                min="0"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                placeholder="0.00"
                data-testid="input-product-sale-price"
              />
              {formData.price && formData.salePrice && parseFloat(formData.salePrice) < parseFloat(formData.price) && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Desconto de {Math.round((1 - parseFloat(formData.salePrice) / parseFloat(formData.price)) * 100)}%
                </p>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="manageStock">Controlar Estoque</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ative para limitar a quantidade disponível
              </p>
            </div>
            <Switch
              id="manageStock"
              checked={formData.manageStock}
              onCheckedChange={(checked) => setFormData({ ...formData, manageStock: checked })}
              data-testid="switch-manage-stock"
            />
          </div>
          
          {formData.manageStock && (
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantidade em Estoque</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
                data-testid="input-product-quantity"
              />
            </div>
          )}
          
          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Produto Ativo</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Produtos inativos não aparecem para pedidos
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              data-testid="switch-product-active"
            />
          </div>

          {product?.id && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-white">Adicionais do Produto</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Opções extras que o cliente pode adicionar
                  </p>
                </div>
              </div>

              {addons.length > 0 && (
                <div className="space-y-2">
                  {addons.map((addon) => (
                    <div 
                      key={addon.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-white">{addon.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          R$ {Number(addon.price).toFixed(2)}
                          {addon.isRequired && <span className="ml-2 text-red-500">(Obrigatório)</span>}
                          {addon.maxQuantity > 1 && <span className="ml-2">• Máx: {addon.maxQuantity}</span>}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAddonMutation.mutate(addon.id)}
                        disabled={deleteAddonMutation.isPending}
                        data-testid={`button-delete-addon-${addon.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="addonName">Nome do Adicional</Label>
                    <Input
                      id="addonName"
                      value={newAddon.name}
                      onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                      placeholder="Ex: Bacon extra"
                      data-testid="input-addon-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addonPrice">Preço (R$)</Label>
                    <Input
                      id="addonPrice"
                      type="number"
                      step={0.01}
                      min="0"
                      value={newAddon.price}
                      onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })}
                      placeholder="0.00"
                      data-testid="input-addon-price"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="addonRequired"
                      checked={newAddon.isRequired}
                      onCheckedChange={(checked) => setNewAddon({ ...newAddon, isRequired: checked })}
                      data-testid="switch-addon-required"
                    />
                    <Label htmlFor="addonRequired">Obrigatório</Label>
                  </div>
                  <div>
                    <Label htmlFor="addonMaxQty">Qtd. Máxima</Label>
                    <Input
                      id="addonMaxQty"
                      type="number"
                      min="1"
                      value={newAddon.maxQuantity}
                      onChange={(e) => setNewAddon({ ...newAddon, maxQuantity: e.target.value })}
                      data-testid="input-addon-max-qty"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAddon}
                  disabled={!newAddon.name || !newAddon.price || createAddonMutation.isPending}
                  data-testid="button-add-addon"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createAddonMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          )}
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
          <Button type="submit" disabled={isLoading || uploading} data-testid="button-submit">
            {isLoading ? "Salvando..." : product ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
