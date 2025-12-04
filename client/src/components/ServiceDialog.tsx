import { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X, Loader2 } from "lucide-react";
import type { Service } from "@shared/schema";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (service: any) => void;
  initialData?: Service | null;
}

export function ServiceDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
}: ServiceDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    value: "",
    duration: "60",
    description: "",
    imageUrl: "",
    isFeatured: false,
    isActive: true,
    promotionalValue: "",
    promotionStartDate: "",
    promotionEndDate: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        category: initialData.category,
        value: initialData.value,
        duration: String(initialData.duration || 60),
        description: initialData.description || "",
        imageUrl: initialData.imageUrl || "",
        isFeatured: initialData.isFeatured || false,
        isActive: initialData.isActive !== false,
        promotionalValue: initialData.promotionalValue ? String(initialData.promotionalValue) : "",
        promotionStartDate: initialData.promotionStartDate || "",
        promotionEndDate: initialData.promotionEndDate || "",
      });
    } else {
      setFormData({
        name: "",
        category: "",
        value: "",
        duration: "60",
        description: "",
        imageUrl: "",
        isFeatured: false,
        isActive: true,
        promotionalValue: "",
        promotionStartDate: "",
        promotionEndDate: "",
      });
    }
  }, [initialData, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    setUploading(true);
    try {
      const response = await fetch("/api/upload/service-image", {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name: formData.name,
      category: formData.category,
      value: parseFloat(formData.value),
      duration: parseInt(formData.duration),
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
      isFeatured: formData.isFeatured,
      isActive: formData.isActive,
    };
    
    const hasPromoValue = formData.promotionalValue && formData.promotionalValue.trim() !== '';
    const hasStartDate = formData.promotionStartDate && formData.promotionStartDate.trim() !== '';
    const hasEndDate = formData.promotionEndDate && formData.promotionEndDate.trim() !== '';
    
    if (hasPromoValue || hasStartDate || hasEndDate) {
      data.promotionalValue = hasPromoValue ? parseFloat(formData.promotionalValue) : null;
      data.promotionStartDate = hasStartDate ? formData.promotionStartDate : null;
      data.promotionEndDate = hasEndDate ? formData.promotionEndDate : null;
    } else if (initialData) {
      data.promotionalValue = null;
      data.promotionStartDate = null;
      data.promotionEndDate = null;
    }
    
    onSave(data);
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Editar Serviço" : "Novo Serviço"}
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha as informações do serviço abaixo.
          </p>
        </div>
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5 max-h-[60vh] overflow-y-auto">
          
          {/* Imagem do Serviço */}
          <div className="grid gap-2">
            <Label>Imagem do Serviço</Label>
            <div className="flex items-start gap-4">
              {formData.imageUrl ? (
                <div className="relative">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    data-testid="button-remove-service-image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
                  data-testid="button-upload-service-image"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                data-testid="input-service-image"
              />
              <div className="text-xs text-gray-500">
                <p>Formatos: JPG, PNG, GIF</p>
                <p>Tamanho máximo: 5MB</p>
                <p className="font-medium text-primary">Tamanho ideal: 800x557px</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Serviço</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Corte de Cabelo"
              data-testid="input-service-name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descrição detalhada do serviço (opcional)"
              rows={3}
              data-testid="input-service-description"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="Ex: Cabelo, Barba, Estética"
              data-testid="input-service-category"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="0.00"
                data-testid="input-service-value"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                step="1"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
                placeholder="60"
                data-testid="input-service-duration"
                required
              />
            </div>
          </div>

          {/* Opções de exibição */}
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) =>
                  setFormData({ ...formData, isFeatured: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                data-testid="checkbox-service-featured"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Destaque no cardápio</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                data-testid="checkbox-service-active"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ativo no cardápio público</span>
            </label>
          </div>
          
          {/* Seção de Promoção */}
          <div className="border-t pt-4 mt-2">
            <h3 className="text-sm font-semibold mb-3">Promoção (Opcional)</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="promotionalValue">Valor Promocional (R$)</Label>
                <Input
                  id="promotionalValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.promotionalValue}
                  onChange={(e) =>
                    setFormData({ ...formData, promotionalValue: e.target.value })
                  }
                  placeholder="0.00"
                  data-testid="input-service-promotional-value"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="promotionStartDate">Data Início</Label>
                  <Input
                    id="promotionStartDate"
                    type="date"
                    value={formData.promotionStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, promotionStartDate: e.target.value })
                    }
                    data-testid="input-service-promotion-start"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="promotionEndDate">Data Fim</Label>
                  <Input
                    id="promotionEndDate"
                    type="date"
                    value={formData.promotionEndDate}
                    onChange={(e) =>
                      setFormData({ ...formData, promotionEndDate: e.target.value })
                    }
                    data-testid="input-service-promotion-end"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-service"
          >
            Cancelar
          </Button>
          <Button type="submit" data-testid="button-save-service" disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
