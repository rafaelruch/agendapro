import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Product } from "@shared/schema";

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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    manageStock: false,
    quantity: "",
    isActive: true,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: String(product.price),
        manageStock: product.manageStock,
        quantity: product.quantity !== null ? String(product.quantity) : "",
        isActive: product.isActive,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        manageStock: false,
        quantity: "",
        isActive: true,
      });
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      manageStock: formData.manageStock,
      quantity: formData.manageStock && formData.quantity ? parseInt(formData.quantity) : null,
      isActive: formData.isActive,
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
        
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
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
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              step={0.01}
              min={0}
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              data-testid="input-product-price"
              required
            />
          </div>
          
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
                min={0}
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
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Salvando..." : product ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
