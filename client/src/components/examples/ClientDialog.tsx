import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "../ClientDialog";

export default function ClientDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Abrir Diálogo de Cliente</Button>
      <ClientDialog
        open={open}
        onOpenChange={setOpen}
        onSave={(data) => console.log("Salvar cliente:", data)}
      />
    </div>
  );
}
