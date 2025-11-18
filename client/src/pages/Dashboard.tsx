import { useState, useMemo } from "react";
import { Calendar, Users, CheckCircle2, Clock, Plus, TrendingUp, TrendingDown, DollarSign, Activity, Edit, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Appointment, Client, Service } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, parseISO } from 'date-fns';
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-today-appointments">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Agendamentos para hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-revenue">
              R$ {stats.currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs flex items-center gap-1 mt-1">
              {stats.revenueChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{stats.revenueChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{stats.revenueChange.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs mês anterior</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-clients">{stats.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed">{stats.completedCount}</div>
            <p className="text-xs flex items-center gap-1 mt-1">
              {stats.appointmentChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{stats.appointmentChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{stats.appointmentChange.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs mês anterior</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Area Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Estatísticas de Agendamentos</CardTitle>
            <CardDescription>Agendamentos nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAgendamentos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="agendamentos" 
                  stroke="#3b82f6" 
                  fillOpacity={1}
                  fill="url(#colorAgendamentos)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Serviços Mais Agendados</CardTitle>
            <CardDescription>Top 3 serviços</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
            ) : (
              topServices.map((service, idx) => (
                <div key={service.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: service.color }}
                      />
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{service.percentage}%</span>
                  </div>
                  <Progress value={service.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {service.count} {service.count === 1 ? 'agendamento' : 'agendamentos'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
            <CardDescription>Agendamentos futuros confirmados</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento futuro</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getClientInitials(apt.clientId)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getClientName(apt.clientId)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getServiceNames(apt.serviceIds)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(apt.date), "dd 'de' MMMM", { locale: ptBR })} às {apt.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos Recentes</CardTitle>
            <CardDescription>Últimos 5 agendamentos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento registrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getClientInitials(apt.clientId)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getClientName(apt.clientId)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {getServiceNames(apt.serviceIds)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(apt.date), 'dd/MM/yyyy', { locale: ptBR })}
                        <br />
                        <span className="text-xs text-muted-foreground">{apt.time}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingAppointment(apt);
                              setShowAppointmentDialog(true);
                            }}
                            data-testid={`button-edit-appointment-${apt.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {apt.status === "scheduled" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                toggleCompleteMutation.mutate({ id: apt.id, completed: true });
                              }}
                              data-testid={`button-complete-appointment-${apt.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={(open) => {
          setShowAppointmentDialog(open);
          if (!open) setEditingAppointment(null);
        }}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        services={services}
        initialData={editingAppointment}
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
