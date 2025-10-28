import { CalendarView } from "../CalendarView";

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

export default function CalendarViewExample() {
  return (
    <CalendarView
      appointments={mockAppointments}
      onDateClick={(date) => console.log("Data clicada:", date)}
      onAppointmentClick={(id) => console.log("Agendamento clicado:", id)}
    />
  );
}
