import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";
import { Label } from "@/components/ui/label";
import type { Appointment, AppointmentWithServices, Client, Service, InsertAppointment } from "@shared/schema";

// Frontend appointment data - tenantId is set by backend
type FrontendAppointmentData = Omit<InsertAppointment, 'tenantId'>;

export default function CalendarPage() {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithServices | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string | null>(null);
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const calendarRef = useRef<FullCalendar>(null);
  const { toast } = useToast();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: professionals = [] } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
  });

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithServices[]>({
    queryKey: ["/api/appointments"],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: FrontendAppointmentData) => apiRequest("POST", "/api/appointments", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowAppointmentDialog(false);
      setEditingAppointment(null);
      setPrefilledDate(null);
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
    mutationFn: ({ id, data }: { id: string; data: FrontendAppointmentData }) =>
      apiRequest("PUT", `/api/appointments/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowAppointmentDialog(false);
      setEditingAppointment(null);
      setSelectedAppointmentId(null);
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setSelectedAppointmentId(null);
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

  // Filter appointments based on professional filter
  const filteredAppointments = appointments.filter((apt) => {
    if (professionalFilter === "all") {
      return true;
    } else if (professionalFilter === "none") {
      return !apt.professionalId;
    } else {
      return apt.professionalId === professionalFilter;
    }
  });

  // Convert appointments to FullCalendar events
  const calendarEvents = filteredAppointments.map((apt) => {
    const client = clients.find((c) => c.id === apt.clientId);
    const aptServices = services.filter((s) => apt.serviceIds?.includes(s.id));
    const serviceNames = aptServices.map((s) => s.name).join(", ");

    // Map status to color
    let colorClass = "primary";
    if (apt.status === "completed") colorClass = "success";
    else if (apt.status === "cancelled") colorClass = "danger";
    else if (apt.status === "retorno") colorClass = "warning";

    return {
      id: apt.id,
      title: `${client?.name || "Cliente"} - ${serviceNames || "Sem serviço"}`,
      start: `${apt.date}T${apt.time}`,
      extendedProps: {
        status: colorClass,
        appointmentId: apt.id,
      },
    };
  });

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // When user selects a date range, open appointment dialog with prefilled date
    setPrefilledDate(selectInfo.startStr.split("T")[0]);
    setEditingAppointment(null);
    setShowAppointmentDialog(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    // When user clicks an event, show appointment details
    const appointmentId = clickInfo.event.extendedProps.appointmentId;
    setSelectedAppointmentId(appointmentId);
  };

  const handleAddEventClick = () => {
    // When user clicks "Add Event" button
    setPrefilledDate(null);
    setEditingAppointment(null);
    setShowAppointmentDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-black dark:text-white">Agenda</h1>
            <p className="text-bodydark2">Visualize e gerencie os agendamentos</p>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="professional-filter" className="text-sm text-bodydark2">
              Filtrar por:
            </Label>
            <select
              id="professional-filter"
              value={professionalFilter}
              onChange={(e) => setProfessionalFilter(e.target.value)}
              className="rounded-lg border border-stroke bg-white dark:bg-boxdark dark:border-strokedark py-2 px-4 text-sm outline-none transition focus:border-primary dark:focus:border-primary"
              data-testid="select-professional-filter"
            >
              <option value="all">Todos os profissionais</option>
              <option value="none">Sem profissional</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="custom-calendar">
            <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={calendarEvents}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            customButtons={{
              addEventButton: {
                text: "Adicionar Agendamento +",
                click: handleAddEventClick,
              },
            }}
            locale="pt-br"
            timeZone="America/Sao_Paulo"
            buttonText={{
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
            }}
          />
        </div>
      </div>
    </div>

      {/* Original AppointmentDialog for full CRUD functionality */}
      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={(open) => {
          setShowAppointmentDialog(open);
          if (!open) {
            setEditingAppointment(null);
            setPrefilledDate(null);
          }
        }}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        services={services}
        initialData={editingAppointment ? {
          clientId: editingAppointment.clientId,
          serviceIds: editingAppointment.serviceIds || [],
          date: editingAppointment.date,
          time: editingAppointment.time,
          status: editingAppointment.status,
          notes: editingAppointment.notes || "",
        } : (prefilledDate ? { date: prefilledDate } : undefined)}
        onSave={(data: FrontendAppointmentData) => {
          if (editingAppointment) {
            updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
          } else {
            createAppointmentMutation.mutate(data);
          }
        }}
        onClientCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        }}
      />

      {/* Original AppointmentDetailsDialog for viewing/editing */}
      <AppointmentDetailsDialog
        appointmentId={selectedAppointmentId}
        open={!!selectedAppointmentId}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        onEdit={() => {
          const appointment = appointments.find(a => a.id === selectedAppointmentId);
          if (appointment) {
            setEditingAppointment(appointment);
            setShowAppointmentDialog(true);
            setSelectedAppointmentId(null);
          }
        }}
        onDelete={(id) => deleteAppointmentMutation.mutate(id)}
      />
    </>
  );
}

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.status || "primary"}`;

  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};
