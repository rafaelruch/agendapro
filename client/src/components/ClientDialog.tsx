import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      setFormData(
        initialData || {
          name: "",
          phone: "",
          birthdate: "",
        }
      );
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // NÃO fechar o dialog aqui - o parent fecha no onSuccess da mutation
  };

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} className="sm:max-w-[425px]">
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
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                data-testid="input-client-phone"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthdate">Data de Nascimento (Opcional)</Label>
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate || ""}
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                data-testid="input-client-birthdate"
              />
            </div>
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
