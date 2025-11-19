import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog-tailadmin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog-tailadmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Briefcase, FileText, CheckCircle2, Circle, Pencil, Trash2, Tag } from "lucide-react";
import type { AppointmentWithServices, Client, Service } from "@shared/schema";
import { getServiceEffectiveValue, isServiceInPromotion } from "@shared/schema";

interface AppointmentDetailsDialogProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: (appointmentId: string) => void;
}

export function AppointmentDetailsDialog({
  appointmentId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: AppointmentDetailsDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: appointment, isLoading } = useQuery<AppointmentWithServices>({
    queryKey: ["/api/appointments", appointmentId],
    enabled: !!appointmentId && open,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", appointment?.clientId],
    enabled: !!appointment?.clientId,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: open,
  });

  const handleDeleteConfirm = () => {
    if (appointmentId && onDelete) {
      onDelete(appointmentId);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

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

  // Calcular serviços selecionados e duração total
  const selectedServices = services.filter(s => 
    appointment?.serviceIds?.includes(s.id)
  );
  const totalDuration = selectedServices.reduce((sum, service) => sum + (service.duration || 60), 0);
  // Usar valor promocional quando aplicável
  const totalValue = selectedServices.reduce((sum, service) => {
    const effectiveValue = getServiceEffectiveValue(service);
    return sum + effectiveValue;
  }, 0);

  // Calcular horário de término apenas se houver duração válida
  const calculateEndTime = (startTime: string, durationMinutes: number): string | null => {
    if (!durationMinutes || durationMinutes <= 0) return null;
    
    const [hours, minutes] = startTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const endTime = appointment ? calculateEndTime(appointment.time, totalDuration) : null;

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
              {client?.birthdate && (
                <p className="text-sm text-muted-foreground" data-testid="text-client-birthdate">
                  Data de Nascimento: {formatDate(client.birthdate)}
                </p>
              )}
            </div>
          </div>

          {/* Serviços */}
          {selectedServices.length > 0 && (
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Serviços</p>
                <div className="space-y-2 mt-1">
                  {selectedServices.map((service) => {
                    const inPromotion = isServiceInPromotion(service);
                    const effectiveValue = getServiceEffectiveValue(service);
                    return (
                      <div key={service.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-muted-foreground" data-testid={`text-service-${service.id}`}>
                              {service.name}
                            </p>
                            {inPromotion && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                                <Tag className="h-3 w-3 mr-0.5" />
                                Promoção
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {service.category} • {service.duration} min
                          </p>
                        </div>
                        <div className="text-right">
                          {inPromotion && (
                            <p className="text-xs text-muted-foreground line-through">
                              R$ {Number(service.value).toFixed(2).replace('.', ',')}
                            </p>
                          )}
                          <p className={`text-sm font-medium ${inPromotion ? 'text-green-600 dark:text-green-400' : ''}`}>
                            R$ {effectiveValue.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Total</p>
                    <p className="text-sm font-semibold" data-testid="text-total-value">
                      R$ {totalValue.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
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
                {endTime ? `${appointment.time} às ${endTime}` : appointment.time}
              </p>
              {totalDuration > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-appointment-duration">
                  Duração total: {totalDuration} minutos
                </p>
              )}
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

        {(onEdit || onDelete) && (
          <DialogFooter className="flex-row gap-2 justify-end">
            {onDelete && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)} 
                data-testid="button-delete-appointment"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
            {onEdit && (
              <Button onClick={onEdit} data-testid="button-edit-appointment">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
              {client && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium text-foreground">Cliente: {client.name}</p>
                  {appointment && (
                    <p className="text-sm text-muted-foreground">
                      {formatDate(appointment.date)} às {appointment.time}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Excluir Agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
