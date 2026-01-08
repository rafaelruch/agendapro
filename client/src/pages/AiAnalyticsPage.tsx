import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MessageSquare, 
  CheckCircle, 
  Users, 
  TrendingUp,
  TrendingDown,
  Settings,
  RefreshCw,
  Calendar,
  Filter,
  BarChart3,
  Phone,
  UserCheck,
  Target,
  Repeat
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import ApexCharts from "react-apexcharts";

interface MetricsSummary {
  total_conversations: number;
  finalizados: number;
  em_andamento: number;
  taxa_conversao: number;
  follow_ups: {
    follow_up_01: number;
    follow_up_02: number;
    follow_up_03: number;
    follow_up_04: number;
  };
}

interface HeatmapCell {
  x: number;
  y: number;
  value: number;
}

interface TrendDataPoint {
  label: string;
  value: number;
}

interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
}

interface QualityMetrics {
  por_agente: { agente: string; total: number; finalizados: number; taxa: number }[];
  por_follow_up: { follow_up: string; count: number; percentage: number }[];
}

interface Atendimento {
  id: string;
  remotejid: string;
  nome: string;
  timestamp: string;
  agente_atual: string;
  atendimento_finalizado: boolean;
  follow_up: string;
}

interface FilterOptions {
  agentes: string[];
  followUps: string[];
}

interface SupabaseConfig {
  supabaseUrl: string;
  supabaseDatabase: string;
  supabaseAnonKey: string;
  supabaseTableAtendimentos?: string;
  supabaseTableMensagens?: string;
  supabaseConfigured: boolean;
}

const DATE_PRESETS = [
  { label: "Hoje", value: "today" },
  { label: "Ontem", value: "yesterday" },
  { label: "Últimos 7 dias", value: "7days" },
  { label: "Últimos 30 dias", value: "30days" },
  { label: "Este mês", value: "thisMonth" },
  { label: "Mês anterior", value: "lastMonth" },
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  switch (preset) {
    case "today":
      return {
        startDate: startOfDay(now).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday).toISOString(),
        endDate: endOfDay(yesterday).toISOString(),
      };
    case "7days":
      return {
        startDate: startOfDay(subDays(now, 7)).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    case "30days":
      return {
        startDate: startOfDay(subDays(now, 30)).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    case "thisMonth":
      return {
        startDate: startOfMonth(now).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    case "lastMonth":
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth).toISOString(),
        endDate: endOfMonth(lastMonth).toISOString(),
      };
    default:
      return {
        startDate: startOfDay(subDays(now, 7)).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
  }
}

export default function AiAnalyticsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [datePreset, setDatePreset] = useState("7days");
  const [selectedAgente, setSelectedAgente] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedFollowUp, setSelectedFollowUp] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { startDate, endDate } = useMemo(() => getDateRange(datePreset), [datePreset]);

  const buildQueryString = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...extra,
    });
    if (selectedAgente && selectedAgente !== "all") params.set("agente", selectedAgente);
    if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);
    if (selectedFollowUp && selectedFollowUp !== "all") params.set("followUp", selectedFollowUp);
    return params.toString();
  };

  const { data: supabaseConfig, isLoading: loadingConfig } = useQuery<SupabaseConfig>({
    queryKey: ["/api/tenant/supabase-config"],
  });

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery<MetricsSummary>({
    queryKey: ["/api/analytics/ai/summary", startDate, endDate, selectedAgente],
    enabled: !!supabaseConfig?.supabaseConfigured,
  });

  const { data: heatmapData } = useQuery<HeatmapCell[]>({
    queryKey: ["/api/analytics/ai/heatmap/hourly", startDate, endDate],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const { data: trendsData } = useQuery<{ daily: TrendDataPoint[]; hourly: TrendDataPoint[] }>({
    queryKey: ["/api/analytics/ai/trends", startDate, endDate],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const { data: funnelData } = useQuery<FunnelStep[]>({
    queryKey: ["/api/analytics/ai/funnel", startDate, endDate],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const { data: qualityData } = useQuery<QualityMetrics>({
    queryKey: ["/api/analytics/ai/quality", startDate, endDate, selectedAgente],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "quality",
  });

  const { data: atendimentosData } = useQuery<{ data: Atendimento[]; total: number; page: number; pageSize: number }>({
    queryKey: ["/api/analytics/ai/conversations", startDate, endDate, selectedAgente, selectedStatus, selectedFollowUp, page],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "conversations",
  });

  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ["/api/analytics/ai/filters"],
    enabled: !!supabaseConfig?.supabaseConfigured,
  });

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supabaseConfig?.supabaseConfigured) {
    return (
      <div className="p-6">
        <SupabaseConfigForm />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Analytics IA</h1>
          <p className="text-muted-foreground">Métricas de atendimento automatizado</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-preset">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filterOptions && (
            <Select value={selectedAgente} onValueChange={setSelectedAgente}>
              <SelectTrigger className="w-[150px]" data-testid="select-agente">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os agentes</SelectItem>
                {filterOptions.agentes.map(agente => (
                  <SelectItem key={agente} value={agente}>{agente}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="icon" onClick={() => refetchSummary()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-list">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="quality" data-testid="tab-quality">
            <Target className="w-4 h-4 mr-2" />
            Por Agente
          </TabsTrigger>
          <TabsTrigger value="conversations" data-testid="tab-conversations">
            <MessageSquare className="w-4 h-4 mr-2" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardTab 
            summary={summary} 
            loadingSummary={loadingSummary}
            heatmapData={heatmapData}
            trendsData={trendsData}
            funnelData={funnelData}
          />
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <QualityTab qualityData={qualityData} />
        </TabsContent>

        <TabsContent value="conversations" className="space-y-6">
          <AtendimentosTab 
            atendimentosData={atendimentosData}
            filterOptions={filterOptions}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedFollowUp={selectedFollowUp}
            setSelectedFollowUp={setSelectedFollowUp}
            page={page}
            setPage={setPage}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SupabaseConfigForm currentConfig={supabaseConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab({ 
  summary, 
  loadingSummary,
  heatmapData,
  trendsData,
  funnelData
}: { 
  summary?: MetricsSummary;
  loadingSummary: boolean;
  heatmapData?: HeatmapCell[];
  trendsData?: { daily: TrendDataPoint[]; hourly: TrendDataPoint[] };
  funnelData?: FunnelStep[];
}) {
  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Atendimentos"
          value={summary?.total_conversations || 0}
          icon={<MessageSquare className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard 
          title="Finalizados (Agendados)"
          value={summary?.finalizados || 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <MetricCard 
          title="Em Andamento"
          value={summary?.em_andamento || 0}
          icon={<Users className="w-5 h-5" />}
          color="orange"
        />
        <MetricCard 
          title="Taxa de Conversão"
          value={`${(summary?.taxa_conversao || 0).toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary?.follow_ups?.follow_up_01 || 0}</div>
              <div className="text-sm text-muted-foreground">Follow-up 1</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary?.follow_ups?.follow_up_02 || 0}</div>
              <div className="text-sm text-muted-foreground">Follow-up 2</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary?.follow_ups?.follow_up_03 || 0}</div>
              <div className="text-sm text-muted-foreground">Follow-up 3</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{summary?.follow_ups?.follow_up_04 || 0}</div>
              <div className="text-sm text-muted-foreground">Follow-up 4</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {heatmapData && heatmapData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Volume por Hora/Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <HeatmapChart data={heatmapData} />
            </CardContent>
          </Card>
        )}

        {trendsData && trendsData.daily && trendsData.daily.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tendência Diária</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trendsData.daily} />
            </CardContent>
          </Card>
        )}
      </div>

      {funnelData && funnelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function QualityTab({ qualityData }: { qualityData?: QualityMetrics }) {
  if (!qualityData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desempenho por Agente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityData.por_agente.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium">{item.agente}</div>
                    <div className="text-sm text-muted-foreground">{item.total} atendimentos</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{item.finalizados} finalizados</div>
                  <div className="text-sm text-muted-foreground">{item.taxa.toFixed(1)}% taxa</div>
                </div>
              </div>
            ))}
            {qualityData.por_agente.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityData.por_follow_up.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Repeat className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">{item.follow_up}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{item.count}</div>
                  <div className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
            {qualityData.por_follow_up.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AtendimentosTab({
  atendimentosData,
  filterOptions,
  selectedStatus,
  setSelectedStatus,
  selectedFollowUp,
  setSelectedFollowUp,
  page,
  setPage
}: {
  atendimentosData?: { data: Atendimento[]; total: number; page: number; pageSize: number };
  filterOptions?: FilterOptions;
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  selectedFollowUp: string;
  setSelectedFollowUp: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-lg">Lista de Atendimentos</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="finalizado">Finalizados</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
              </SelectContent>
            </Select>

            {filterOptions && (
              <Select value={selectedFollowUp} onValueChange={setSelectedFollowUp}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Follow-up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterOptions.followUps.map(fu => (
                    <SelectItem key={fu} value={fu}>{fu}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Telefone</th>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Data/Hora</th>
                <th className="text-left p-3 font-medium">Agente</th>
                <th className="text-left p-3 font-medium">Follow-up</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {atendimentosData?.data.map(atendimento => (
                <tr key={atendimento.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {atendimento.remotejid}
                    </div>
                  </td>
                  <td className="p-3">{atendimento.nome || "-"}</td>
                  <td className="p-3">
                    {format(new Date(atendimento.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="p-3">{atendimento.agente_atual || "-"}</td>
                  <td className="p-3">
                    {atendimento.follow_up && (
                      <Badge variant="outline">{atendimento.follow_up}</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={atendimento.atendimento_finalizado ? "default" : "secondary"}>
                      {atendimento.atendimento_finalizado ? "Finalizado" : "Em andamento"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(!atendimentosData?.data || atendimentosData.data.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum atendimento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {atendimentosData && atendimentosData.total > atendimentosData.pageSize && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * atendimentosData.pageSize) + 1} - {Math.min(page * atendimentosData.pageSize, atendimentosData.total)} de {atendimentosData.total}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page * atendimentosData.pageSize >= atendimentosData.total}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeatmapChart({ data }: { data: HeatmapCell[] }) {
  const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const series = DAY_NAMES.map((name, dayIndex) => ({
    name,
    data: Array.from({ length: 24 }, (_, hour) => {
      const cell = data.find(c => c.x === hour && c.y === dayIndex);
      return cell?.value || 0;
    }),
  }));

  const options: ApexCharts.ApexOptions = {
    chart: { type: "heatmap", toolbar: { show: false } },
    dataLabels: { enabled: false },
    colors: ["#3b82f6"],
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => `${i}h`),
      labels: { style: { fontSize: "10px" } },
    },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: "#e5e7eb" },
            { from: 1, to: 10, color: "#93c5fd" },
            { from: 11, to: 30, color: "#3b82f6" },
            { from: 31, to: 100, color: "#1d4ed8" },
          ],
        },
      },
    },
  };

  return <ApexCharts type="heatmap" series={series} options={options} height={250} />;
}

function TrendChart({ data }: { data: TrendDataPoint[] }) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
    xaxis: { categories: data.map(d => d.label), labels: { rotate: -45, style: { fontSize: "10px" } } },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    colors: ["#3b82f6"],
    dataLabels: { enabled: false },
  };

  const series = [{ name: "Atendimentos", data: data.map(d => d.value) }];

  return <ApexCharts type="area" series={series} options={options} height={250} />;
}

function FunnelChart({ data }: { data: FunnelStep[] }) {
  return (
    <div className="space-y-3">
      {data.map((step, idx) => (
        <div key={idx} className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{step.name}</span>
            <span className="text-sm text-muted-foreground">{step.value} ({step.percentage.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-muted rounded-full h-6">
            <div
              className="bg-blue-500 h-6 rounded-full transition-all"
              style={{ width: `${step.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SupabaseConfigForm({ currentConfig }: { currentConfig?: SupabaseConfig }) {
  const { toast } = useToast();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig?.supabaseUrl || "");
  const [supabaseDatabase, setSupabaseDatabase] = useState(currentConfig?.supabaseDatabase || "");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [tableAtendimentos, setTableAtendimentos] = useState(currentConfig?.supabaseTableAtendimentos || "atendimentos");
  const [tableMensagens, setTableMensagens] = useState(currentConfig?.supabaseTableMensagens || "mensagens");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: configData, refetch } = useQuery<SupabaseConfig>({
    queryKey: ["/api/tenant/supabase-config"],
  });

  useEffect(() => {
    if (configData) {
      if (!supabaseUrl && configData.supabaseUrl) {
        setSupabaseUrl(configData.supabaseUrl);
      }
      if (!supabaseDatabase && configData.supabaseDatabase) {
        setSupabaseDatabase(configData.supabaseDatabase);
      }
      if (configData.supabaseTableAtendimentos) {
        setTableAtendimentos(configData.supabaseTableAtendimentos);
      }
      if (configData.supabaseTableMensagens) {
        setTableMensagens(configData.supabaseTableMensagens);
      }
    }
  }, [configData]);

  const handleTest = async () => {
    if (!supabaseUrl || !supabaseDatabase || !supabaseAnonKey) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      const response = await apiRequest("POST", "/api/analytics/ai/test-connection", { 
        supabaseUrl, 
        supabaseDatabase, 
        supabaseAnonKey,
        tableAtendimentos: tableAtendimentos || 'atendimentos',
        tableMensagens: tableMensagens || 'mensagens'
      });
      const result = await response.json();

      if (result.success) {
        toast({ title: "Conexão estabelecida com sucesso!" });
      } else {
        toast({ title: "Falha na conexão", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro ao testar conexão", description: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!supabaseUrl || !supabaseDatabase) {
      toast({ title: "URL e Database são obrigatórios", variant: "destructive" });
      return;
    }
    
    if (!configData?.supabaseConfigured && !supabaseAnonKey) {
      toast({ title: "Chave Anon é obrigatória para configuração inicial", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const configPayload: any = { 
        supabaseUrl, 
        supabaseDatabase,
        supabaseTableAtendimentos: tableAtendimentos || 'atendimentos',
        supabaseTableMensagens: tableMensagens || 'mensagens'
      };
      
      if (supabaseAnonKey) {
        configPayload.supabaseAnonKey = supabaseAnonKey;
      }

      await apiRequest("PUT", "/api/tenant/supabase-config", configPayload);

      toast({ title: "Configuração salva com sucesso!" });
      setSupabaseAnonKey("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ai"] });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configuração do Supabase</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure a conexão com o Supabase para acessar os dados de atendimento da IA
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {configData?.supabaseConfigured && (
          <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-5 h-5" />
              <span>Supabase configurado e conectado</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              URL: {configData.supabaseUrl} | Database: {configData.supabaseDatabase}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="supabaseUrl">URL do Supabase</Label>
          <Input
            id="supabaseUrl"
            placeholder="supabase.ruch.com.br"
            value={supabaseUrl}
            onChange={e => setSupabaseUrl(e.target.value)}
            data-testid="input-supabase-url"
          />
          <p className="text-xs text-muted-foreground">
            Endereço do seu Supabase auto-hospedado
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supabaseDatabase">Nome do Banco de Dados</Label>
          <Input
            id="supabaseDatabase"
            placeholder="nome_do_banco"
            value={supabaseDatabase}
            onChange={e => setSupabaseDatabase(e.target.value)}
            data-testid="input-supabase-database"
          />
          <p className="text-xs text-muted-foreground">
            Nome do banco específico deste tenant no Supabase
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supabaseAnonKey">
            Chave Anon (anon key)
            {configData?.supabaseConfigured && (
              <span className="text-xs text-muted-foreground ml-2">(deixe vazio para manter a atual)</span>
            )}
          </Label>
          <Input
            id="supabaseAnonKey"
            type="password"
            placeholder={configData?.supabaseConfigured ? "••••••••••• (manter atual)" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
            value={supabaseAnonKey}
            onChange={e => setSupabaseAnonKey(e.target.value)}
            data-testid="input-supabase-key"
          />
          <p className="text-xs text-muted-foreground">
            {configData?.supabaseConfigured 
              ? "Preencha apenas para alterar a chave atual" 
              : "Chave pública de acesso ao Supabase"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tableAtendimentos">Nome da Tabela de Atendimentos</Label>
            <Input
              id="tableAtendimentos"
              placeholder="atendimentos"
              value={tableAtendimentos}
              onChange={e => setTableAtendimentos(e.target.value)}
              data-testid="input-table-atendimentos"
            />
            <p className="text-xs text-muted-foreground">
              Nome da tabela principal (padrão: atendimentos)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tableMensagens">Nome da Tabela de Mensagens</Label>
            <Input
              id="tableMensagens"
              placeholder="mensagens"
              value={tableMensagens}
              onChange={e => setTableMensagens(e.target.value)}
              data-testid="input-table-mensagens"
            />
            <p className="text-xs text-muted-foreground">
              Nome da tabela de histórico (padrão: mensagens)
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleTest} disabled={testing} data-testid="button-test-connection">
            {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-config">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Configuração
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Estrutura Esperada das Tabelas</h4>
          <p className="text-sm text-muted-foreground mb-3">
            O Supabase deve conter a tabela de atendimentos (nome configurável acima) com os campos:
          </p>
          <div className="text-xs font-mono bg-background p-3 rounded border space-y-1">
            <p><strong>id</strong> - UUID do registro</p>
            <p><strong>remotejid</strong> - Número de telefone do cliente</p>
            <p><strong>nome</strong> - Nome do cliente</p>
            <p><strong>timestamp</strong> - Data/hora do atendimento</p>
            <p><strong>agente_atual</strong> - Agente em atendimento</p>
            <p><strong>atendimento_finalizado</strong> - Boolean (true quando agendou)</p>
            <p><strong>follow_up</strong> - follow_up_01, follow_up_02, follow_up_03 ou follow_up_04</p>
          </div>
          <p className="text-sm text-muted-foreground mt-3 mb-2">
            A tabela de mensagens (nome configurável acima) é opcional e contém o histórico de conversas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
