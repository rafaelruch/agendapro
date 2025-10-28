import { useState } from "react";
import { Calendar, Users, CheckCircle2, Clock, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Client } from "@shared/schema";

export default function Dashboard() {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
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

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(apt => apt.date === today);
  const completedCount = appointments.filter(apt => apt.status === "completed").length;

  const formatAppointmentForCard = (apt: Appointment) => {
    const client = clients.find(c => c.id === apt.clientId);
    return {
      id: apt.id,
      clientName: client?.name || "Cliente desconhecido",
      time: apt.time,
      duration: apt.duration,
      status: apt.status as "scheduled" | "completed" | "cancelled",
      notes: apt.notes || undefined,
    };
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
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos agendamentos</p>
        </div>
        <Button onClick={() => setShowAppointmentDialog(true)} data-testid="button-new-appointment">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Agendamentos"
          value={appointments.length}
          icon={Calendar}
        />
        <StatsCard
          title="Clientes Ativos"
          value={clients.length}
          icon={Users}
        />
        <StatsCard
          title="Agendamentos Hoje"
          value={todayAppointments.length}
          icon={Clock}
        />
        <StatsCard
          title="Concluídos"
          value={completedCount}
          icon={CheckCircle2}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
        {todayAppointments.length === 0 ? (
          <p className="text-muted-foreground">Nenhum agendamento para hoje.</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={formatAppointmentForCard(appointment)}
                onEdit={(id) => {
                  const apt = appointments.find(a => a.id === id);
                  if (apt) {
                    setEditingAppointment(apt);
                    setShowAppointmentDialog(true);
                  }
                }}
                onDelete={(id) => {
                  if (confirm("Tem certeza que deseja excluir este agendamento?")) {
                    deleteAppointmentMutation.mutate(id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={(open) => {
          setShowAppointmentDialog(open);
          if (!open) setEditingAppointment(null);
        }}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        initialData={editingAppointment}
        onSave={(data) => {
          if (editingAppointment) {
            updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
          } else {
            createAppointmentMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
