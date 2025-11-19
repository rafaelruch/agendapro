import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment, Client } from "@shared/schema";

interface AppointmentWithClient {
  id: string;
  time: string;
  clientName: string;
  status: string;
}

export function HeaderDropdownNotification() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const isLoading = loadingAppointments || loadingClients;

  const todayAppointments: AppointmentWithClient[] = appointments
    .filter(apt => apt.date === today)
    .map(apt => {
      const client = clients.find(c => c.id === apt.clientId);
      return {
        id: apt.id,
        time: apt.time,
        clientName: client?.name || 'Desconhecido',
        status: apt.status,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);

  const notificationCount = todayAppointments.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stroke hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 z-1 h-2 w-2 rounded-full bg-meta-1">
              <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-stroke dark:border-strokedark mt-2.5">
        <div className="px-4.5 py-3">
          <h5 className="text-sm font-medium">Agendamentos de Hoje</h5>
        </div>

        <div className="flex flex-col">
          {isLoading ? (
            <div className="border-t border-stroke dark:border-strokedark px-4.5 py-3">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="border-t border-stroke dark:border-strokedark px-4.5 py-3">
              <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            todayAppointments.map((apt, index) => (
              <div 
                key={apt.id} 
                className="border-t border-stroke dark:border-strokedark px-4.5 py-3 hover:bg-gray-2 dark:hover:bg-meta-4"
                data-testid={`notification-appointment-${index}`}
              >
                <p className="text-sm">
                  <span className="font-medium">{apt.time}</span> - {apt.clientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {apt.status === "scheduled" ? "Agendado" : 
                   apt.status === "completed" ? "Concluído" : 
                   "Cancelado"}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
