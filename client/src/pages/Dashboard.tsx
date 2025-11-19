import { useState, useMemo } from "react";
import { Calendar, Users, CheckCircle2, Clock, Plus, TrendingUp, TrendingDown, DollarSign, Activity, Eye, Edit2, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LineChartOne from "@/components/charts/line/LineChartOne";
import type { Appointment, Client, Service } from "@shared/schema";
import { format, startOfMonth, endOfMonth, parseISO, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipo estendido com serviceIds que vem da API
type AppointmentWithServices = Appointment & {
  serviceIds?: string[];
};

export default function Dashboard() {
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithServices[]>({
    queryKey: ["/api/appointments"],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowAppointmentDialog(false);
      setEditingAppointment(null);
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
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowAppointmentDialog(false);
      setEditingAppointment(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
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

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      // Buscar o appointment completo da API antes de atualizar
      const response = await fetch(`/api/appointments/${id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error("Agendamento não encontrado");
      }
      
      const appointment = await response.json();
      
      // Enviar o objeto completo atualizado
      return apiRequest("PUT", `/api/appointments/${id}`, {
        ...appointment,
        status: completed ? "completed" : "scheduled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cálculos de estatísticas
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = format(new Date(), 'yyyy-MM');
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    
    const todayAppointments = appointments.filter(apt => apt.date === today);
    const currentMonthAppointments = appointments.filter(apt => apt.date.startsWith(currentMonth));
    const lastMonthAppointments = appointments.filter(apt => apt.date.startsWith(lastMonth));
    const completedCount = appointments.filter(apt => apt.status === "completed").length;
    const totalAppointments = appointments.length;
    const completionRate = totalAppointments > 0 ? (completedCount / totalAppointments) * 100 : 0;
    
    // Calcular receita do mês
    const currentMonthRevenue = currentMonthAppointments.reduce((total, apt) => {
      const aptServices = apt.serviceIds || [];
      const revenue = aptServices.reduce((sum: number, serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return sum;
        
        // Usar a data do agendamento para verificar promoção (parsing correto)
        let hasPromotion = false;
        if (service.promotionalValue && service.promotionStartDate && service.promotionEndDate) {
          try {
            const aptDate = parseISO(apt.date);
            const startDate = parseISO(service.promotionStartDate);
            const endDate = parseISO(service.promotionEndDate);
            hasPromotion = aptDate >= startDate && aptDate <= endDate;
          } catch {
            // Se houver erro no parsing, não aplicar promoção
            hasPromotion = false;
          }
        }
        
        const price = hasPromotion ? service.promotionalValue! : service.value;
        return sum + Number(price);
      }, 0);
      return total + revenue;
    }, 0);
    
    const lastMonthRevenue = lastMonthAppointments.reduce((total, apt) => {
      const aptServices = apt.serviceIds || [];
      const revenue = aptServices.reduce((sum: number, serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return sum;
        
        // Usar a data do agendamento para verificar promoção (consistente com mês atual)
        let hasPromotion = false;
        if (service.promotionalValue && service.promotionStartDate && service.promotionEndDate) {
          try {
            const aptDate = parseISO(apt.date);
            const startDate = parseISO(service.promotionStartDate);
            const endDate = parseISO(service.promotionEndDate);
            hasPromotion = aptDate >= startDate && aptDate <= endDate;
          } catch {
            // Se houver erro no parsing, não aplicar promoção
            hasPromotion = false;
          }
        }
        
        const price = hasPromotion ? service.promotionalValue! : service.value;
        return sum + Number(price);
      }, 0);
      return total + revenue;
    }, 0);
    
    const revenueChange = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;
    
    const appointmentChange = lastMonthAppointments.length > 0
      ? ((currentMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length) * 100
      : 0;
    
    return {
      todayAppointments: todayAppointments.length,
      currentMonthRevenue,
      revenueChange,
      completedCount,
      completionRate,
      appointmentChange,
      activeClients: clients.length,
    };
  }, [appointments, clients, services]);

  // Dados para o gráfico de área (últimos 30 dias)
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });
    
    return last30Days.map(date => ({
      date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      agendamentos: appointments.filter(apt => apt.date === date).length,
    }));
  }, [appointments]);

  // Dados para o gráfico semanal (últimas 8 semanas)
  const weeklyChartData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7 + 6));
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - (i * 7));
      
      const weekAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= weekStart && aptDate <= weekEnd;
      });
      
      weeks.push({
        semana: `Sem ${8 - i}`,
        agendamentos: weekAppointments.length,
      });
    }
    
    return weeks;
  }, [appointments]);

  // Serviços mais populares
  const topServices = useMemo(() => {
    const serviceCounts = new Map<string, number>();
    
    appointments.forEach(apt => {
      (apt.serviceIds || []).forEach((serviceId: string) => {
        serviceCounts.set(serviceId, (serviceCounts.get(serviceId) || 0) + 1);
      });
    });
    
    const sorted = Array.from(serviceCounts.entries())
      .map(([id, count]) => ({
        id,
        name: services.find(s => s.id === id)?.name || 'Desconhecido',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    const total = sorted.reduce((sum, s) => sum + s.count, 0);
    
    return sorted.map((s, idx) => ({
      ...s,
      percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
      color: ['#3b82f6', '#8b5cf6', '#ec4899'][idx] || '#6b7280',
    }));
  }, [appointments, services]);

  // Próximos agendamentos
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return appointments
      .filter(apt => apt.date >= today && apt.status === 'scheduled')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      })
      .slice(0, 5);
  }, [appointments]);

  // Últimos agendamentos
  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      })
      .slice(0, 5);
  }, [appointments]);

  const getClientInitials = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return "?";
    return client.name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return "Cliente não encontrado";
    return client.name;
  };

  const getServiceNames = (serviceIds: string[] | undefined) => {
    if (!serviceIds || serviceIds.length === 0) return "Nenhum serviço associado";
    
    const serviceNames = serviceIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter((name): name is string => name !== undefined);
    
    if (serviceNames.length === 0) return "Serviços não encontrados";
    return serviceNames.join(", ");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completo</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Agendado</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos agendamentos e métricas</p>
        </div>
        <Button onClick={() => setShowAppointmentDialog(true)} data-testid="button-new-appointment">
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* LINHA 1: 3 Boxes de Métricas */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3 2xl:gap-7.5">
        {/* Agendamentos Hoje */}
        <div className="relative rounded-sm bg-gradient-to-r from-[#3C50E0] to-[#6571F3] dark:from-[#1F2B6C] dark:to-[#2E3AA8] px-7.5 py-6 shadow-default overflow-hidden">
          <div className="absolute top-0 right-0 bottom-0 left-1/3 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to right, transparent, white 20%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 20%)'
          }}></div>
          
          <div className="relative flex h-11.5 w-11.5 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Clock className="h-5 w-5 text-white" />
          </div>

          <div className="relative mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-white" data-testid="stat-today-appointments">
                {stats.todayAppointments}
              </h4>
              <span className="text-sm font-medium text-white/90">Agendamentos Hoje</span>
            </div>

            <span className="flex items-center gap-1 text-sm font-medium text-white">
              {stats.appointmentChange >= 0 ? '+' : ''}{stats.appointmentChange.toFixed(1)}%
              {stats.appointmentChange >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
        </div>

        {/* Receita do Mês */}
        <div className="relative rounded-sm bg-gradient-to-r from-[#10B981] to-[#34D399] dark:from-[#065F46] dark:to-[#047857] px-7.5 py-6 shadow-default overflow-hidden">
          <div className="absolute top-0 right-0 bottom-0 left-1/3 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to right, transparent, white 20%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 20%)'
          }}></div>
          
          <div className="relative flex h-11.5 w-11.5 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <DollarSign className="h-5 w-5 text-white" />
          </div>

          <div className="relative mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-white" data-testid="stat-revenue">
                R$ {(stats.currentMonthRevenue / 1000).toFixed(1)}k
              </h4>
              <span className="text-sm font-medium text-white/90">Receita do Mês</span>
            </div>

            <span className="flex items-center gap-1 text-sm font-medium text-white">
              {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange.toFixed(1)}%
              {stats.revenueChange >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="relative rounded-sm bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] dark:from-[#92400E] dark:to-[#B45309] px-7.5 py-6 shadow-default overflow-hidden">
          <div className="absolute top-0 right-0 bottom-0 left-1/3 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to right, transparent, white 20%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 20%)'
          }}></div>
          
          <div className="relative flex h-11.5 w-11.5 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Users className="h-5 w-5 text-white" />
          </div>

          <div className="relative mt-4 flex items-end justify-between">
            <div>
              <h4 className="text-title-md font-bold text-white" data-testid="stat-active-clients">
                {stats.activeClients}
              </h4>
              <span className="text-sm font-medium text-white/90">Clientes Ativos</span>
            </div>

            <span className="text-sm font-medium text-white">
              Total
            </span>
          </div>
        </div>
      </div>

      {/* LINHA 2: Line Chart + Taxa de Conclusão */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12 2xl:gap-7.5">
        {/* Line Chart - Crescimento Semanal */}
        <div className="xl:col-span-8">
          <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
            <div className="mb-3">
              <h4 className="text-xl font-semibold text-black dark:text-white">
                Crescimento de Agendamentos
              </h4>
              <p className="text-sm font-medium text-bodydark2">Últimas 8 semanas</p>
            </div>
            <LineChartOne />
          </div>
        </div>

        {/* Taxa de Conclusão */}
        <div className="xl:col-span-4">
          <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
            <div className="mb-3">
              <h4 className="text-xl font-semibold text-black dark:text-white">
                Taxa de Conclusão
              </h4>
              <p className="text-sm font-medium text-bodydark2">Porcentagem de agendamentos concluídos</p>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative h-60 w-60">
                <svg className="transform -rotate-90" width="100%" height="100%" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40 * (stats.completionRate / 100)} ${2 * Math.PI * 40}`}
                    className="text-primary transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-black dark:text-white">
                    {stats.completionRate.toFixed(0)}%
                  </span>
                  <span className="text-sm text-bodydark2 mt-1">
                    {stats.completedCount} concluídos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 3: Serviços Mais Populares */}
      <div>
          <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
            <div className="mb-3">
              <h5 className="text-xl font-semibold text-black dark:text-white">
                Serviços Mais Agendados
              </h5>
            </div>
            <div className="mb-2">
              <p className="text-sm font-medium">Top 3 serviços do mês</p>
            </div>

            <div className="flex flex-col gap-5">
              {topServices.length === 0 ? (
                <p className="text-sm text-bodydark2">Nenhum dado disponível</p>
              ) : (
                topServices.map((service, idx) => (
                  <div key={service.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: service.color }}
                        />
                        <p className="font-medium text-black dark:text-white">
                          {service.name}
                        </p>
                      </div>
                      <span className="font-medium">{service.percentage}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-stroke dark:bg-strokedark overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${service.percentage}%`,
                          backgroundColor: service.color
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-medium text-bodydark2">
                      {service.count} {service.count === 1 ? 'agendamento' : 'agendamentos'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
      </div>

      {/* LINHA 4: Agendamentos Recentes */}
      <div>
          <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
              Agendamentos Recentes
            </h4>

            <div className="flex flex-col">
              <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
                <div className="p-2.5 xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Cliente
                  </h5>
                </div>
                <div className="p-2.5 text-center xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Data
                  </h5>
                </div>
                <div className="p-2.5 text-center xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Horário
                  </h5>
                </div>
                <div className="hidden p-2.5 text-center sm:block xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Status
                  </h5>
                </div>
                <div className="hidden p-2.5 text-center sm:block xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Ações
                  </h5>
                </div>
              </div>

              {recentAppointments.length === 0 ? (
                <div className="p-5 text-center">
                  <p className="text-sm text-bodydark2">Nenhum agendamento registrado</p>
                </div>
              ) : (
                recentAppointments.map((apt, key) => (
                  <div
                    className={`grid grid-cols-3 sm:grid-cols-5 ${
                      key === recentAppointments.length - 1
                        ? ''
                        : 'border-b border-stroke dark:border-strokedark'
                    }`}
                    key={apt.id}
                  >
                    <div className="flex items-center gap-3 p-2.5 xl:p-5">
                      <Avatar className="h-12 w-12 rounded-full">
                        <AvatarFallback className="rounded-full text-sm">
                          {getClientInitials(apt.clientId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black dark:text-white truncate">
                          {getClientName(apt.clientId)}
                        </p>
                        <p className="text-xs text-bodydark2 truncate">
                          {getServiceNames(apt.serviceIds)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center p-2.5 xl:p-5">
                      <p className="text-black dark:text-white">
                        {format(parseISO(apt.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>

                    <div className="flex items-center justify-center p-2.5 xl:p-5">
                      <p className="text-black dark:text-white">{apt.time}</p>
                    </div>

                    <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                      {getStatusBadge(apt.status)}
                    </div>

                    <div className="hidden items-center justify-center gap-2 p-2.5 sm:flex xl:p-5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAppointment(apt);
                          setShowAppointmentDialog(true);
                        }}
                        data-testid={`button-edit-appointment-${apt.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg transition w-8 h-8 text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-500 dark:hover:bg-brand-500/10"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="w-4 h-4"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      {apt.status === "scheduled" && (
                        <button
                          type="button"
                          onClick={() => {
                            toggleCompleteMutation.mutate({ id: apt.id, completed: true });
                          }}
                          data-testid={`button-complete-appointment-${apt.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg transition w-8 h-8 text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-500 dark:hover:bg-green-500/10"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="w-4 h-4"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={(open) => {
          setShowAppointmentDialog(open);
          if (!open) setEditingAppointment(null);
        }}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        services={services}
        initialData={editingAppointment || undefined}
        onSave={(data) => {
          if (editingAppointment) {
            updateAppointmentMutation.mutate({ id: editingAppointment.id, data });
          } else {
            createAppointmentMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
