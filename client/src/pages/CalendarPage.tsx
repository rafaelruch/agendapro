import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/CalendarView";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, AppointmentWithServices, Client, Service } from "@shared/schema";

export default function CalendarPage() {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithServices[]>({
    queryKey: ["/api/appointments"],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowAppointmentDialog(false);
      setEditingAppointment(null);
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowAppointmentDialog(false);
      setEditingAppointment(null);
      setSelectedAppointmentId(null);
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setSelectedAppointmentId(null);
      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatAppointmentsForCalendar = () => {
    return appointments.map(apt => {
      const client = clients.find(c => c.id === apt.clientId);
      
      // Calcular duração total dos serviços
      const appointmentServices = services.filter(s => 
        apt.serviceIds?.includes(s.id)
      );
      const totalDuration = appointmentServices.reduce((sum, service) => 
        sum + (service.duration || 60), 0
      );
      
      return {
        id: apt.id,
        time: `${apt.date}T${apt.time}`, // Formato ISO para split funcionar
        clientName: client?.name || "Cliente desconhecido",
        status: apt.status as "scheduled" | "completed" | "cancelled" | "retorno",
        duration: totalDuration > 0 ? totalDuration : undefined, // Só passa duração se houver serviços
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Calendário</h1>
          <p className="text-muted-foreground">Visualize e gerencie seus agendamentos</p>
        </div>
        <Button onClick={() => setShowAppointmentDialog(true)} data-testid="button-new-appointment">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      <CalendarView
        appointments={formatAppointmentsForCalendar()}
        onDateClick={(date) => console.log("Data clicada:", date)}
        onAppointmentClick={(id) => setSelectedAppointmentId(id)}
      />

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={(open) => {
          setShowAppointmentDialog(open);
          if (!open) setEditingAppointment(null);
        }}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        services={services}
        initialData={editingAppointment}
        onSave={(data) => {
          if (editingAppointment) {
            updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
          } else {
            createAppointmentMutation.mutate(data);
          }
        }}
        onClientCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        }}
      />

      <AppointmentDetailsDialog
        appointmentId={selectedAppointmentId}
        open={!!selectedAppointmentId}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        onEdit={() => {
          const appointment = appointments.find(a => a.id === selectedAppointmentId);
          if (appointment) {
            setEditingAppointment(appointment as any);
            setShowAppointmentDialog(true);
            setSelectedAppointmentId(null);
          }
        }}
        onDelete={(id) => deleteAppointmentMutation.mutate(id)}
      />
    </div>
  );
}
