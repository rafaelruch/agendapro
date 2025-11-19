import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    promotionalValue: "",
    promotionStartDate: "",
    promotionEndDate: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        category: initialData.category,
        value: initialData.value,
        duration: String(initialData.duration || 60),
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
        promotionalValue: "",
        promotionStartDate: "",
        promotionEndDate: "",
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name: formData.name,
      category: formData.category,
      value: parseFloat(formData.value),
      duration: parseInt(formData.duration),
    };
    
    // Normalizar campos promocionais: converter strings vazias em null
    // APENAS enviar se pelo menos um campo foi preenchido, senão omitir
    const hasPromoValue = formData.promotionalValue && formData.promotionalValue.trim() !== '';
    const hasStartDate = formData.promotionStartDate && formData.promotionStartDate.trim() !== '';
    const hasEndDate = formData.promotionEndDate && formData.promotionEndDate.trim() !== '';
    
    // Se ALGUM campo de promoção foi preenchido, incluir todos (validação detectará inconsistências)
    // Se NENHUM campo foi preenchido E estamos editando, enviar null para remover
    if (hasPromoValue || hasStartDate || hasEndDate) {
      data.promotionalValue = hasPromoValue ? parseFloat(formData.promotionalValue) : null;
      data.promotionStartDate = hasStartDate ? formData.promotionStartDate : null;
      data.promotionEndDate = hasEndDate ? formData.promotionEndDate : null;
    } else if (initialData) {
      // Se estamos EDITANDO e campos estão vazios, enviar null explicitamente para remover
      data.promotionalValue = null;
      data.promotionStartDate = null;
      data.promotionEndDate = null;
    }
    // Se estamos CRIANDO e campos vazios, omitir (não enviar)
    
    onSave(data);
    // NÃO fechar o dialog aqui - o parent fecha no onSuccess da mutation
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} className="sm:max-w-[425px]">
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Editar Serviço" : "Novo Serviço"}
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha as informações do serviço abaixo.
          </p>
        </div>
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
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
          <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-service"
            >
              Cancelar
            </Button>
            <Button type="submit" data-testid="button-save-service">
              Salvar
            </Button>
          </div>
        </form>
    </Modal>
  );
}
