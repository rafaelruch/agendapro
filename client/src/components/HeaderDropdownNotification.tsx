import { useState } from "react";
import { Bell } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment, Client } from "@shared/schema";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

interface AppointmentWithClient {
  id: string;
  time: string;
  clientName: string;
  status: string;
}

export function HeaderDropdownNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const isLoading = loadingAppointments || loadingClients;

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowDetailsDialog(true);
    setIsOpen(false);
  };

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
    <>
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-meta-4 dropdown-toggle"
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 z-1 h-2 w-2 rounded-full bg-meta-1">
              <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
            </span>
          )}
        </button>

        <Dropdown
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          className="w-80 p-0"
        >
          <div className="px-4.5 py-3 border-b border-gray-200 dark:border-gray-800">
            <h5 className="text-sm font-medium text-gray-700 dark:text-white">Agendamentos de Hoje</h5>
          </div>

          <div className="flex flex-col max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4.5 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="px-4.5 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum agendamento para hoje</p>
              </div>
            ) : (
              todayAppointments.map((apt, index) => (
                <div 
                  key={apt.id} 
                  onClick={() => handleAppointmentClick(apt.id)}
                  className="border-t border-gray-200 dark:border-gray-800 px-4.5 py-3 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  data-testid={`notification-appointment-${index}`}
                >
                  <p className="text-sm text-gray-700 dark:text-white">
                    <span className="font-medium">{apt.time}</span> - {apt.clientName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {apt.status === "scheduled" ? "Agendado" : 
                     apt.status === "completed" ? "Concluído" : 
                     "Cancelado"}
                  </p>
                </div>
              ))
            )}
          </div>
        </Dropdown>
      </div>

      {/* Dialog de Detalhes do Agendamento */}
      <AppointmentDetailsDialog
        appointmentId={selectedAppointmentId}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </>
  );
}
