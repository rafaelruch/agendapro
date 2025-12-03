import { useState, useMemo } from "react";
import { Search, Eye, Check, X, Filter, CalendarDays, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Client, Service, Professional } from "@shared/schema";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays, isToday, isTomorrow, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentDetailsDialog } from "@/components/AppointmentDetailsDialog";

type DateFilter = 'today' | 'tomorrow' | 'week' | 'month' | 'last7' | 'last30' | 'custom' | 'all';
type StatusFilter = 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

interface AppointmentWithDetails extends Appointment {
  client?: Client;
  services?: Service[];
  professional?: Professional;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AppointmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [professionalFilter, setProfessionalFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const itemsPerPage = 15;
  const { toast } = useToast();

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ["/api/professionals"],
  });

  const { data: appointmentServices = [] } = useQuery<{ appointmentId: string; serviceId: string }[]>({
    queryKey: ["/api/appointment-services"],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      apiRequest("PUT", `/api/appointments/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Agendamento atualizado",
        description: "O status foi alterado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDateRange = (filter: DateFilter): { start: Date; end: Date } | null => {
    const today = new Date();
    switch (filter) {
      case 'today':
        return { start: today, end: today };
      case 'tomorrow':
        return { start: addDays(today, 1), end: addDays(today, 1) };
      case 'week':
        return { start: startOfWeek(today, { weekStartsOn: 0 }), end: endOfWeek(today, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'last7':
        return { start: subDays(today, 7), end: today };
      case 'last30':
        return { start: subDays(today, 30), end: today };
      case 'custom':
        if (customDate) {
          return { start: customDate, end: customDate };
        }
        return null;
      case 'all':
        return null;
    }
  };

  const enrichedAppointments = useMemo(() => {
    return appointments.map(apt => {
      const client = clients.find(c => c.id === apt.clientId);
      const aptServiceIds = appointmentServices
        .filter(as => as.appointmentId === apt.id)
        .map(as => as.serviceId);
      const aptServices = services.filter(s => aptServiceIds.includes(s.id));
      const professional = apt.professionalId 
        ? professionals.find(p => p.id === apt.professionalId)
        : undefined;

      return {
        ...apt,
        client,
        services: aptServices,
        professional,
      } as AppointmentWithDetails;
    });
  }, [appointments, clients, services, professionals, appointmentServices]);

  const filteredAppointments = useMemo(() => {
    let result = enrichedAppointments;

    // Filter by date
    const dateRange = getDateRange(dateFilter);
    if (dateRange) {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');
      result = result.filter(apt => apt.date >= startStr && apt.date <= endStr);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(apt => apt.status === statusFilter);
    }

    // Filter by professional
    if (professionalFilter !== 'all') {
      result = result.filter(apt => apt.professionalId === professionalFilter);
    }

    // Filter by search (client name or phone)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(apt => 
        apt.client?.name.toLowerCase().includes(query) ||
        apt.client?.phone.toLowerCase().includes(query) ||
        apt.services?.some(s => s.name.toLowerCase().includes(query))
      );
    }

    // Sort by date and time (most recent first)
    result.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });

    return result;
  }, [enrichedAppointments, dateFilter, statusFilter, professionalFilter, searchQuery]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);

  const handleConfirm = (apt: AppointmentWithDetails) => {
    updateAppointmentMutation.mutate({
      id: apt.id,
      data: { status: 'confirmed' }
    });
  };

  const handleComplete = (apt: AppointmentWithDetails) => {
    updateAppointmentMutation.mutate({
      id: apt.id,
      data: { status: 'completed' }
    });
  };

  const handleCancel = (apt: AppointmentWithDetails) => {
    if (confirm(`Tem certeza que deseja cancelar o agendamento de ${apt.client?.name}?`)) {
      updateAppointmentMutation.mutate({
        id: apt.id,
        data: { status: 'cancelled' }
      });
    }
  };

  const handleViewDetails = (apt: AppointmentWithDetails) => {
    setSelectedAppointmentId(apt.id);
    setShowDetailsDialog(true);
  };

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const getServicesTotal = (apt: AppointmentWithDetails) => {
    if (!apt.services || apt.services.length === 0) return 0;
    return apt.services.reduce((sum, s) => sum + parseFloat(s.value?.toString() || '0'), 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-bodydark2">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black dark:text-white">Agendamentos</h1>
          <p className="text-bodydark2">Gerencie todos os seus agendamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {filteredAppointments.length} agendamentos
          </Badge>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
          <Input
            placeholder="Buscar por cliente ou serviço..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-12"
            data-testid="input-search-appointments"
          />
        </div>

        {/* Date Filter */}
        <Select 
          value={dateFilter} 
          onValueChange={(value) => {
            if (value === 'custom') {
              setCustomDateOpen(true);
            }
            setDateFilter(value as DateFilter);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]" data-testid="select-date-filter">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="tomorrow">Amanhã</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="last7">Últimos 7 dias</SelectItem>
            <SelectItem value="last30">Últimos 30 dias</SelectItem>
            <SelectItem value="custom">Data específica</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Picker */}
        {dateFilter === 'custom' && (
          <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[180px] justify-start text-left font-normal"
                data-testid="button-custom-date"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {customDate ? format(customDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="single"
                selected={customDate}
                onSelect={(date) => {
                  setCustomDate(date);
                  setCustomDateOpen(false);
                  setCurrentPage(1);
                }}
                locale={ptBR}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "h-9 w-9 text-center text-sm p-0 relative",
                  day: "h-9 w-9 p-0 font-normal hover-elevate rounded-md inline-flex items-center justify-center",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_hidden: "invisible",
                }}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Status Filter */}
        <Select 
          value={statusFilter} 
          onValueChange={(value) => {
            setStatusFilter(value as StatusFilter);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {/* Professional Filter */}
        {professionals.length > 0 && (
          <Select 
            value={professionalFilter} 
            onValueChange={(value) => {
              setProfessionalFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-professional-filter">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Profissionais</SelectItem>
              {professionals.map(prof => (
                <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {filteredAppointments.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
          <CalendarDays className="h-12 w-12 mx-auto text-bodydark2 mb-4" />
          <p className="text-bodydark2 mb-2">
            {searchQuery || dateFilter !== 'all' || statusFilter !== 'all' || professionalFilter !== 'all'
              ? "Nenhum agendamento encontrado para os filtros selecionados."
              : "Nenhum agendamento cadastrado."}
          </p>
          <p className="text-sm text-bodydark2">
            Tente ajustar os filtros ou criar um novo agendamento no calendário.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Data/Hora
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Cliente
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Serviços
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Profissional
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Valor
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Status
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Pagamento
                  </TableHead>
                  <TableHead className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedAppointments.map((apt) => {
                  const total = getServicesTotal(apt);
                  const hasPaid = !!apt.paymentMethod;

                  return (
                    <TableRow key={apt.id} data-testid={`row-appointment-${apt.id}`}>
                      <TableCell className="px-5 py-4 text-start">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {formatDateLabel(apt.date)}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {apt.time} • {apt.duration} min
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {apt.client?.name || 'Cliente não encontrado'}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {apt.client?.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {apt.services?.slice(0, 2).map(s => (
                            <Badge key={s.id} variant="secondary" className="text-xs">
                              {s.name}
                            </Badge>
                          ))}
                          {apt.services && apt.services.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{apt.services.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {apt.professional?.name || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          R$ {total.toFixed(2).replace('.', ',')}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        <Badge className={`text-xs ${STATUS_COLORS[apt.status] || ''}`}>
                          {STATUS_LABELS[apt.status] || apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-start">
                        {hasPaid ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Pago
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewDetails(apt)}
                            title="Ver detalhes"
                            data-testid={`button-view-${apt.id}`}
                            className="hover-elevate"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {apt.status === 'scheduled' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleConfirm(apt)}
                              title="Confirmar"
                              data-testid={`button-confirm-${apt.id}`}
                              className="text-green-600 hover:text-green-700 hover-elevate"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}

                          {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleComplete(apt)}
                                title="Marcar como concluído"
                                data-testid={`button-complete-${apt.id}`}
                                className="text-blue-600 hover:text-blue-700 hover-elevate"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCancel(apt)}
                                title="Cancelar"
                                data-testid={`button-cancel-${apt.id}`}
                                className="text-red-600 hover:text-red-700 hover-elevate"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, filteredAppointments.length)} de {filteredAppointments.length} agendamentos
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        size="sm"
                        variant={currentPage === page ? "default" : "ghost"}
                        onClick={() => setCurrentPage(page)}
                        data-testid={`button-page-${page}`}
                        className="min-w-[36px]"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Dialog */}
      <AppointmentDetailsDialog
        appointmentId={selectedAppointmentId}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </div>
  );
}
