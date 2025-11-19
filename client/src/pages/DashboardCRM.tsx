import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, Users, CheckCircle2, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Badge from "@/components/ui/badge-tailadmin";
import type { Appointment, Client, Service } from "@shared/schema";

type AppointmentWithServices = Appointment & {
  serviceIds?: string[];
};

export default function DashboardCRM() {
  const { data: appointments = [] } = useQuery<AppointmentWithServices[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Cálculos de estatísticas REAIS
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = format(new Date(), 'yyyy-MM');
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    
    const todayAppointments = appointments.filter(apt => apt.date === today);
    const currentMonthAppointments = appointments.filter(apt => apt.date.startsWith(currentMonth));
    const lastMonthAppointments = appointments.filter(apt => apt.date.startsWith(lastMonth));
    const completedCount = appointments.filter(apt => apt.status === "completed").length;
    
    // Calcular receita do mês REAL
    const currentMonthRevenue = currentMonthAppointments.reduce((total, apt) => {
      const aptServices = apt.serviceIds || [];
      const revenue = aptServices.reduce((sum: number, serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return sum;
        
        let hasPromotion = false;
        if (service.promotionalValue && service.promotionStartDate && service.promotionEndDate) {
          try {
            const aptDate = parseISO(apt.date);
            const startDate = parseISO(service.promotionStartDate);
            const endDate = parseISO(service.promotionEndDate);
            hasPromotion = aptDate >= startDate && aptDate <= endDate;
          } catch {
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
        
        let hasPromotion = false;
        if (service.promotionalValue && service.promotionStartDate && service.promotionEndDate) {
          try {
            const aptDate = parseISO(apt.date);
            const startDate = parseISO(service.promotionStartDate);
            const endDate = parseISO(service.promotionEndDate);
            hasPromotion = aptDate >= startDate && aptDate <= endDate;
          } catch {
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

  // Top 3 serviços REAIS
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
    
    return sorted.map(s => ({
      ...s,
      percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
    }));
  }, [appointments, services]);

  // Recent appointments REAIS (últimos 5)
  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime())
      .slice(0, 5)
      .map(apt => {
        const client = clients.find(c => c.id === apt.clientId);
        const aptServices = (apt.serviceIds || [])
          .map(id => services.find(s => s.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        
        const revenue = (apt.serviceIds || []).reduce((sum: number, serviceId: string) => {
          const service = services.find(s => s.id === serviceId);
          if (!service) return sum;
          
          let hasPromotion = false;
          if (service.promotionalValue && service.promotionStartDate && service.promotionEndDate) {
            try {
              const aptDate = parseISO(apt.date);
              const startDate = parseISO(service.promotionStartDate);
              const endDate = parseISO(service.promotionEndDate);
              hasPromotion = aptDate >= startDate && aptDate <= endDate;
            } catch {
              hasPromotion = false;
            }
          }
          
          const price = hasPromotion ? service.promotionalValue! : service.value;
          return sum + Number(price);
        }, 0);
        
        return {
          id: apt.id,
          clientName: client?.name || 'Desconhecido',
          clientPhone: client?.phone || '',
          services: aptServices || 'Sem serviços',
          value: revenue,
          date: apt.date,
          time: apt.time,
          status: apt.status,
        };
      });
  }, [appointments, clients, services]);

  // Gauge options TailAdmin EXATO (from MonthlyTarget.tsx)
  const gaugeValue = stats.completedCount > 0 
    ? Math.round((stats.completedCount / appointments.length) * 100) 
    : 0;

  const gaugeOptions: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "80%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: "#1D2939",
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#465FFF"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Hero Metrics - TailAdmin Style com dados REAIS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        {/* Agendamentos Hoje */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6" data-testid="card-metric-today">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <CalendarIcon className="text-gray-800 size-6 dark:text-white/90" />
          </div>

          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Agendamentos Hoje
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90" data-testid="text-value-today">
                {stats.todayAppointments}
              </h4>
            </div>
            <Badge color={stats.appointmentChange >= 0 ? "success" : "error"} data-testid="badge-change-today" startIcon={stats.appointmentChange >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}>
              {Math.abs(stats.appointmentChange).toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Receita do Mês */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6" data-testid="card-metric-revenue">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <DollarSign className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Receita do Mês
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90" data-testid="text-value-revenue">
                R$ {stats.currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>

            <Badge color={stats.revenueChange >= 0 ? "success" : "error"} data-testid="badge-change-revenue" startIcon={stats.revenueChange >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}>
              {Math.abs(stats.revenueChange).toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6" data-testid="card-metric-clients">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <Users className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Clientes Ativos
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90" data-testid="text-value-clients">
                {stats.activeClients}
              </h4>
            </div>
            <Badge color="info" data-testid="badge-info-clients">
              Total
            </Badge>
          </div>
        </div>

        {/* Concluídos */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6" data-testid="card-metric-completed">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            <CheckCircle2 className="text-gray-800 size-6 dark:text-white/90" />
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Agendamentos Concluídos
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90" data-testid="text-value-completed">
                {stats.completedCount}
              </h4>
            </div>
            <Badge color="success" data-testid="badge-success-completed">
              {gaugeValue}% total
            </Badge>
          </div>
        </div>
      </div>

      {/* Monthly Target Gauge + Top Services */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
        {/* Monthly Target Gauge - TailAdmin EXATO */}
        <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" data-testid="card-gauge">
          <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Taxa de Conclusão
                </h3>
                <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
                  Porcentagem de agendamentos concluídos
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="max-h-[330px]" id="chartDarkStyle">
                <Chart
                  options={gaugeOptions}
                  series={[gaugeValue]}
                  type="radialBar"
                  height={330}
                />
              </div>

              <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                {stats.completedCount} de {appointments.length}
              </span>
            </div>
            <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
              {gaugeValue >= 70 ? 'Excelente taxa de conclusão! Continue assim.' : 'Trabalhe para aumentar a taxa de conclusão.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                Total
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {appointments.length}
              </p>
            </div>

            <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                Concluídos
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {stats.completedCount}
              </p>
            </div>

            <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                Pendentes
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {appointments.length - stats.completedCount}
              </p>
            </div>
          </div>
        </div>

        {/* Top Services REAIS */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6" data-testid="card-services">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Serviços Mais Populares
            </h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Top 3 serviços mais agendados
            </p>
          </div>

          <div className="space-y-6">
            {topServices.length > 0 ? topServices.map((service, index) => (
              <div key={service.id} data-testid={`service-item-${index}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">{service.name}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">{service.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-800">
                  <div 
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-brand-500' : index === 1 ? 'bg-success-500' : 'bg-warning-500'
                    }`}
                    style={{ width: `${service.percentage}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {service.count} agendamentos
                </p>
              </div>
            )) : (
              <p className="text-center text-gray-500 dark:text-gray-400">Nenhum serviço agendado ainda</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Appointments Table - TailAdmin Style */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6" data-testid="card-recent">
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Agendamentos Recentes
            </h3>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <table className="w-full">
            <thead className="border-gray-100 dark:border-gray-800 border-y">
              <tr>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cliente</th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Serviços</th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Valor</th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Data/Hora</th>
                <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentAppointments.length > 0 ? recentAppointments.map((apt, index) => (
                <tr key={apt.id} data-testid={`row-appointment-${index}`}>
                  <td className="py-3">
                    <div>
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {apt.clientName}
                      </p>
                      <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                        {apt.clientPhone}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {apt.services}
                  </td>
                  <td className="py-3 text-gray-800 font-medium text-theme-sm dark:text-white/90">
                    R$ {apt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {format(parseISO(apt.date), 'dd/MM/yyyy', { locale: ptBR })} {apt.time}
                  </td>
                  <td className="py-3">
                    <Badge
                      color={
                        apt.status === "completed" ? "success" :
                        apt.status === "scheduled" ? "warning" :
                        "error"
                      }
                      size="sm"
                    >
                      {apt.status === "completed" ? "Completo" :
                       apt.status === "scheduled" ? "Agendado" :
                       "Cancelado"}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhum agendamento recente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
