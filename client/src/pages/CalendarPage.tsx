import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/CalendarView";
import { AppointmentDialog } from "@/components/AppointmentDialog";

export default function CalendarPage() {
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
      time: "2025-10-28T14:00:00",
      clientName: "João Silva",
      status: "scheduled" as const,
    },
    {
      id: "2",
      time: "2025-10-28T16:00:00",
      clientName: "Maria Santos",
      status: "scheduled" as const,
    },
    {
      id: "3",
      time: "2025-10-29T10:00:00",
      clientName: "Pedro Oliveira",
      status: "completed" as const,
    },
  ];

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
        appointments={mockAppointments}
        onDateClick={(date) => console.log("Data clicada:", date)}
        onAppointmentClick={(id) => console.log("Agendamento clicado:", id)}
      />

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        clients={mockClients}
        onSave={(data) => console.log("Novo agendamento:", data)}
      />
    </div>
  );
}
