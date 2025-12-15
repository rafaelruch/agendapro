import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Função para aplicar máscara de telefone brasileiro: (62)98888-7777
function formatPhoneBR(value: string): string {
  let numbers = value.replace(/\D/g, "");
  
  // Remove o código do país 55 se existir no início
  if (numbers.startsWith("55") && numbers.length > 11) {
    numbers = numbers.slice(2);
  }
  
  const limited = numbers.slice(0, 11);
  if (limited.length === 0) return "";
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 7) return `(${limited.slice(0, 2)})${limited.slice(2)}`;
  return `(${limited.slice(0, 2)})${limited.slice(2, 7)}-${limited.slice(7)}`;
}

// Função para remover máscara
function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}

interface QuickClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (clientId: string) => void;
}

export function QuickClientDialog({
  open,
  onOpenChange,
  onClientCreated,
}: QuickClientDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birthdate: "",
  });
  const { toast } = useToast();

  const createClientMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/clients", data),
    onSuccess: (newClient: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente criado",
        description: "Cliente adicionado com sucesso.",
      });
      setFormData({ name: "", phone: "", birthdate: "" });
      onOpenChange(false);
      if (onClientCreated) {
        onClientCreated(newClient.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enviar telefone sem máscara (apenas números)
    createClientMutation.mutate({
      ...formData,
      phone: unformatPhone(formData.phone),
    });
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
            Adicionar Cliente Rápido
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha os dados básicos do cliente para adicioná-lo rapidamente.
          </p>
        </div>
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <div className="grid gap-2">
              <Label htmlFor="quick-name">Nome</Label>
              <Input
                id="quick-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo do cliente"
                data-testid="input-quick-client-name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-phone">Telefone</Label>
              <Input
                id="quick-phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(62)98888-7777"
                data-testid="input-quick-client-phone"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-birthdate">Data de Nascimento (Opcional)</Label>
              <Input
                id="quick-birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                data-testid="input-quick-client-birthdate"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-quick-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createClientMutation.isPending}
              data-testid="button-quick-save"
            >
              {createClientMutation.isPending ? "Criando..." : "Criar Cliente"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
