import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/CalendarView";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Client, Service } from "@shared/schema";

export default function CalendarPage() {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const { toast } = useToast();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowAppointmentDialog(false);
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

  const formatAppointmentsForCalendar = () => {
    return appointments.map(apt => {
      const client = clients.find(c => c.id === apt.clientId);
      return {
        id: apt.id,
        time: `${apt.date}T${apt.time}`,
        clientName: client?.name || "Cliente desconhecido",
        status: apt.status as "scheduled" | "completed" | "cancelled",
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
        onAppointmentClick={(id) => console.log("Agendamento clicado:", id)}
      />

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        services={services}
        onSave={(data) => createAppointmentMutation.mutate(data)}
      />
    </div>
  );
}
