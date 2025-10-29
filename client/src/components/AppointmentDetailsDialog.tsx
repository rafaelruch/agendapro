import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Briefcase, FileText, CheckCircle2, Circle, Pencil } from "lucide-react";
import type { Appointment, Client, Service } from "@shared/schema";

interface AppointmentDetailsDialogProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function AppointmentDetailsDialog({
  appointmentId,
  open,
  onOpenChange,
  onEdit,
}: AppointmentDetailsDialogProps) {
  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ["/api/appointments", appointmentId],
    enabled: !!appointmentId && open,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", appointment?.clientId],
    enabled: !!appointment?.clientId,
  });

  const { data: service } = useQuery<Service>({
    queryKey: ["/api/services", appointment?.serviceId],
    enabled: !!appointment?.serviceId,
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-appointment-details">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!appointment) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };

  const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
    scheduled: "default",
    completed: "secondary",
    cancelled: "outline",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-appointment-details">
        <DialogHeader>
          <DialogTitle>Detalhes do Agendamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge 
              variant={statusVariants[appointment.status] || "default"}
              data-testid="badge-appointment-status"
            >
              {appointment.status === "completed" ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <Circle className="h-3 w-3 mr-1" />
              )}
              {statusLabels[appointment.status] || appointment.status}
            </Badge>
          </div>

          {/* Cliente */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Cliente</p>
              <p className="text-sm text-muted-foreground" data-testid="text-client-name">
                {client?.name || "Carregando..."}
              </p>
              {client?.phone && (
                <p className="text-sm text-muted-foreground" data-testid="text-client-phone">
                  {client.phone}
                </p>
              )}
              {client?.email && (
                <p className="text-sm text-muted-foreground" data-testid="text-client-email">
                  {client.email}
                </p>
              )}
            </div>
          </div>

          {/* Serviço */}
          {appointment.serviceId && (
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Serviço</p>
                <p className="text-sm text-muted-foreground" data-testid="text-service-name">
                  {service?.name || "Carregando..."}
                </p>
                {service?.category && (
                  <p className="text-xs text-muted-foreground" data-testid="text-service-category">
                    {service.category}
                  </p>
                )}
                {service?.value && (
                  <p className="text-sm font-medium mt-1" data-testid="text-service-value">
                    R$ {Number(service.value).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Data */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Data</p>
              <p className="text-sm text-muted-foreground" data-testid="text-appointment-date">
                {formatDate(appointment.date)}
              </p>
            </div>
          </div>

          {/* Horário e Duração */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Horário</p>
              <p className="text-sm text-muted-foreground" data-testid="text-appointment-time">
                {appointment.time} ({appointment.duration} minutos)
              </p>
            </div>
          </div>

          {/* Observações */}
          {appointment.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Observações</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-appointment-notes">
                  {appointment.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {onEdit && (
          <DialogFooter>
            <Button onClick={onEdit} data-testid="button-edit-appointment">
              <Pencil className="h-4 w-4 mr-2" />
              Editar Agendamento
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
