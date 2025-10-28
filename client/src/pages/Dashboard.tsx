import { useState } from "react";
import { Calendar, Users, CheckCircle2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { AppointmentDialog } from "@/components/AppointmentDialog";

export default function Dashboard() {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

  // TODO: remove mock functionality
  const mockClients = [
    { id: "1", name: "João Silva" },
    { id: "2", name: "Maria Santos" },
    { id: "3", name: "Pedro Oliveira" },
  ];

  const mockAppointments = [
    {
      id: "1",
      clientName: "João Silva",
      time: "14:00",
      duration: 60,
      status: "scheduled" as const,
      notes: "Consulta de acompanhamento mensal",
    },
    {
      id: "2",
      clientName: "Maria Santos",
      time: "16:00",
      duration: 45,
      status: "scheduled" as const,
      notes: "Primeira consulta",
    },
    {
      id: "3",
      clientName: "Pedro Oliveira",
      time: "10:00",
      duration: 30,
      status: "completed" as const,
    },
  ];

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
          value="124"
          icon={Calendar}
          trend={{ value: "12%", positive: true }}
        />
        <StatsCard
          title="Clientes Ativos"
          value="48"
          icon={Users}
          trend={{ value: "8%", positive: true }}
        />
        <StatsCard
          title="Agendamentos Hoje"
          value="8"
          icon={Clock}
        />
        <StatsCard
          title="Concluídos"
          value="98"
          icon={CheckCircle2}
          trend={{ value: "15%", positive: true }}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
        <div className="space-y-3">
          {mockAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onEdit={(id) => console.log("Editar:", id)}
              onDelete={(id) => console.log("Excluir:", id)}
            />
          ))}
        </div>
      </div>

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        clients={mockClients}
        onSave={(data) => console.log("Novo agendamento:", data)}
      />
    </div>
  );
}
