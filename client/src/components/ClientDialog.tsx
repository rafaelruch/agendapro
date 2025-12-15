import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

// Função para aplicar máscara de telefone brasileiro: (62)98888-7777
function formatPhoneBR(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11);
  
  // Aplica a máscara
  if (limited.length === 0) return "";
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 7) return `(${limited.slice(0, 2)})${limited.slice(2)}`;
  return `(${limited.slice(0, 2)})${limited.slice(2, 7)}-${limited.slice(7)}`;
}

// Função para remover máscara (apenas números)
function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (client: any) => void;
  initialData?: any;
}

export function ClientDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
}: ClientDialogProps) {
  const [formData, setFormData] = useState(
    initialData || {
      name: "",
      phone: "",
      birthdate: "",
    }
  );

  // Atualizar formData quando initialData ou open mudar
  useEffect(() => {
    if (open) {
      const data = initialData || {
        name: "",
        phone: "",
        birthdate: "",
      };
      // Aplicar máscara ao telefone existente
      setFormData({
        ...data,
        phone: formatPhoneBR(data.phone || ""),
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enviar telefone sem máscara (apenas números)
    onSave({
      ...formData,
      phone: unformatPhone(formData.phone),
    });
    // NÃO fechar o dialog aqui - o parent fecha no onSuccess da mutation
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Editar Cliente" : "Novo Cliente"}
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha as informações do cliente abaixo.
          </p>
        </div>
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
                data-testid="input-client-name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(62)98888-7777"
                data-testid="input-client-phone"
                required
              />
            </div>
            <DatePicker
              id="birthdate"
              label="Data de Nascimento (Opcional)"
              mode="single"
              value={formData.birthdate || ""}
              onChange={(_, dateStr) => setFormData({ ...formData, birthdate: dateStr })}
              placeholder="Selecione a data"
              data-testid="input-client-birthdate"
            />
          </div>
          <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button type="submit" data-testid="button-save-client">
              Salvar
            </Button>
          </div>
        </form>
    </Modal>
  );
}
