import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
    createClientMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Cliente Rápido</DialogTitle>
            <DialogDescription>
              Preencha os dados básicos do cliente para adicioná-lo rapidamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
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
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
