import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { QuickClientDialog } from "./QuickClientDialog";
import { TailAdminMultiSelect } from "./TailAdminMultiSelect";
import { ClientSearchSelect } from "./ClientSearchSelect";
import type { InsertAppointment } from "@shared/schema";

// Frontend appointment data - tenantId is set by backend
type FrontendAppointmentData = Omit<InsertAppointment, 'tenantId'>;

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
  value: string;
  duration: number;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  services: Service[];
  onSave: (appointment: FrontendAppointmentData) => void;
  onClientCreated?: () => void;
  initialData?: Partial<FrontendAppointmentData>;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  clients,
  services,
  onSave,
  onClientCreated,
  initialData,
}: AppointmentDialogProps) {
  const defaultFormData = {
    clientId: "",
    serviceIds: [] as string[],
    date: "",
    time: "",
    status: "scheduled",
    notes: "",
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [showQuickClientDialog, setShowQuickClientDialog] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          clientId: initialData.clientId || "",
          serviceIds: initialData.serviceIds || [],
          date: initialData.date || "",
          time: initialData.time || "",
          status: initialData.status || "scheduled",
          notes: initialData.notes || "",
        });
      } else {
        setFormData(defaultFormData);
      }
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.clientId) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    if (!formData.serviceIds || formData.serviceIds.length === 0) {
      alert("Por favor, selecione pelo menos um serviço.");
      return;
    }
    if (!formData.time) {
      alert("Por favor, informe o horário do agendamento.");
      return;
    }
    if (!formData.date) {
      alert("Por favor, informe a data do agendamento.");
      return;
    }
    
    const dataToSave = {
      ...formData,
      serviceIds: formData.serviceIds,
    };
    onSave(dataToSave);
    onOpenChange(false);
  };


  return (
    <>
      <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      <form onSubmit={handleSubmit}>
        <div className="px-6 pt-6 pb-4 sm:px-9.5 sm:pt-9.5 sm:pb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {initialData ? "Editar Agendamento" : "Novo Agendamento"}
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Preencha as informações do agendamento abaixo.
          </p>
        </div>
        <div className="grid gap-4 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <div className="grid gap-2">
              <Label htmlFor="client">Cliente</Label>
              <div className="flex gap-2">
                <ClientSearchSelect
                  clients={clients}
                  value={formData.clientId}
                  onChange={(clientId) => setFormData({ ...formData, clientId })}
                  placeholder="Buscar e selecionar cliente..."
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setShowQuickClientDialog(true)}
                  data-testid="button-add-client"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <TailAdminMultiSelect
              options={services.map(s => ({
                id: s.id,
                name: s.name,
                description: `${s.category} • R$ ${parseFloat(s.value).toFixed(2).replace('.', ',')} • ${s.duration} min`
              }))}
              selected={formData.serviceIds}
              onChange={(serviceIds) => setFormData({ ...formData, serviceIds })}
              label="Serviços"
              placeholder="Selecione um ou mais serviços..."
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-date"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Horário (24h)</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  data-testid="input-time"
                  step="60"
                  required
                  placeholder="14:00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Adicione observações sobre o agendamento..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 pb-6 sm:px-9.5 sm:pb-9.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button type="submit" data-testid="button-save">
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <QuickClientDialog
        open={showQuickClientDialog}
        onOpenChange={setShowQuickClientDialog}
        onClientCreated={(clientId) => {
          setFormData({ ...formData, clientId });
          if (onClientCreated) {
            onClientCreated();
          }
        }}
      />
    </>
  );
}
