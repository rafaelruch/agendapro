import { AppointmentCard } from "../AppointmentCard";

const mockAppointment = {
  id: "1",
  clientName: "João Silva",
  time: "14:00",
  duration: 60,
  status: "scheduled" as const,
  notes: "Consulta de acompanhamento mensal",
};

export default function AppointmentCardExample() {
  return (
    <AppointmentCard
      appointment={mockAppointment}
      onEdit={(id) => console.log("Editar agendamento:", id)}
      onDelete={(id) => console.log("Excluir agendamento:", id)}
    />
  );
}
