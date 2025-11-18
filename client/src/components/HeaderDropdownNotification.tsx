import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HeaderDropdownNotification() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stroke hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 z-1 h-2 w-2 rounded-full bg-meta-1">
            <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-stroke dark:border-strokedark mt-2.5">
        <div className="px-4.5 py-3">
          <h5 className="text-sm font-medium">Notificações</h5>
        </div>

        <div className="flex flex-col">
          <div className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4">
            <p className="text-sm">
              <span className="font-medium">Novo agendamento</span> foi criado
            </p>
            <p className="text-xs text-muted-foreground">há 2 minutos</p>
          </div>

          <div className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4">
            <p className="text-sm">
              <span className="font-medium">Cliente</span> confirmou presença
            </p>
            <p className="text-xs text-muted-foreground">há 1 hora</p>
          </div>

          <div className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4">
            <p className="text-sm">
              <span className="font-medium">Lembrete:</span> Agendamento em 30min
            </p>
            <p className="text-xs text-muted-foreground">há 3 horas</p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
