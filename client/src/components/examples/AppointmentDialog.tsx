import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppointmentDialog } from "../AppointmentDialog";

const mockClients = [
  { id: "1", name: "João Silva" },
  { id: "2", name: "Maria Santos" },
];

export default function AppointmentDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Abrir Diálogo</Button>
      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        clients={mockClients}
        onSave={(data) => console.log("Salvar agendamento:", data)}
      />
    </div>
  );
}
