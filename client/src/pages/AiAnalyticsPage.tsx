import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BarChart3,
  Phone,
  UserCheck,
  Target,
  Repeat,
  ArrowUp,
  ArrowDown,
  Clock
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

interface ResponseTimeData {
  avg_response_time_seconds: number;
  avg_response_time_formatted: string;
  total_responses: number;
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
  { label: "Todos os dados", value: "all" },
  { label: "Hoje", value: "today" },
  { label: "Ontem", value: "yesterday" },
  { label: "Últimos 7 dias", value: "7days" },
  { label: "Últimos 30 dias", value: "30days" },
  { label: "Este mês", value: "thisMonth" },
  { label: "Mês anterior", value: "lastMonth" },
];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  switch (preset) {
    case "all":
      return {
        startDate: new Date(now.getFullYear() - 3, 0, 1).toISOString(),
        endDate: new Date(now.getFullYear() + 1, 11, 31).toISOString(),
      };
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

type TabValue = "dashboard" | "quality" | "conversations" | "settings";

interface TabItem {
  id: TabValue;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function TabWithBadge({ 
  tabs, 
  activeTab, 
  onTabChange 
}: { 
  tabs: TabItem[]; 
  activeTab: TabValue; 
  onTabChange: (tab: TabValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800" data-testid="tabs-list">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          data-testid={`tab-${tab.id}`}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-md text-sm transition-all ${
            activeTab === tab.id
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full ${
              activeTab === tab.id
                ? "bg-brand-500 text-white"
                : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
            }`}>
              {tab.badge > 999 ? "999+" : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function FilterTabs<T extends string>({ 
  options, 
  value, 
  onChange,
  allLabel = "Todos"
}: { 
  options: { value: T; label: string }[]; 
  value: T; 
  onChange: (v: T) => void;
  allLabel?: string;
}) {
  const allOptions = [{ value: "all" as T, label: allLabel }, ...options];
  
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {allOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-2 font-medium rounded-md text-sm transition-all whitespace-nowrap ${
            value === option.value
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  trend,
  trendValue 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        <span className="text-gray-800 dark:text-white/90">{icon}</span>
      </div>
      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</h4>
        </div>
        {trend && trendValue && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium ${
            trend === "up" 
              ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-500" 
              : trend === "down"
              ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-500"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            {trend === "up" && <ArrowUp className="w-3 h-3" />}
            {trend === "down" && <ArrowDown className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

function FollowUpCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="text-center">
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function AiAnalyticsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");
  const [datePreset, setDatePreset] = useState("all");
  const [selectedAgente, setSelectedAgente] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedFollowUp, setSelectedFollowUp] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { startDate, endDate } = useMemo(() => getDateRange(datePreset), [datePreset]);

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

  const { data: responseTimeData } = useQuery<ResponseTimeData>({
    queryKey: ["/api/analytics/ai/messages/response-time", startDate, endDate],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const tabs: TabItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "quality", label: "Por Agente", icon: <Target className="w-4 h-4" /> },
    { id: "conversations", label: "Atendimentos", icon: <MessageSquare className="w-4 h-4" />, badge: atendimentosData?.total },
    { id: "settings", label: "Configurações", icon: <Settings className="w-4 h-4" /> },
  ];

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white" data-testid="text-page-title">
            Analytics IA
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Métricas de atendimento automatizado</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            {DATE_PRESETS.slice(0, 5).map((preset) => (
              <button
                key={preset.value}
                onClick={() => setDatePreset(preset.value)}
                className={`inline-flex items-center px-3 py-2 font-medium rounded-md text-sm transition-all whitespace-nowrap ${
                  datePreset === preset.value
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {filterOptions && filterOptions.agentes.length > 0 && (
              <Select value={selectedAgente} onValueChange={setSelectedAgente}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800" data-testid="select-agente">
                  <SelectValue placeholder="Agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterOptions.agentes.map(agente => (
                    <SelectItem key={agente} value={agente}>{agente}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button 
              size="icon" 
              onClick={() => refetchSummary()} 
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      <TabWithBadge tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "dashboard" && (
        <DashboardTab 
          summary={summary} 
          loadingSummary={loadingSummary}
          heatmapData={heatmapData}
          trendsData={trendsData}
          funnelData={funnelData}
          responseTimeData={responseTimeData}
        />
      )}

      {activeTab === "quality" && (
        <QualityTab qualityData={qualityData} />
      )}

      {activeTab === "conversations" && (
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
      )}

      {activeTab === "settings" && (
        <SupabaseConfigForm currentConfig={supabaseConfig} />
      )}
    </div>
  );
}

function DashboardTab({ 
  summary, 
  loadingSummary,
  heatmapData,
  trendsData,
  funnelData,
  responseTimeData
}: { 
  summary?: MetricsSummary;
  loadingSummary: boolean;
  heatmapData?: HeatmapCell[];
  trendsData?: { daily: TrendDataPoint[]; hourly: TrendDataPoint[] };
  funnelData?: FunnelStep[];
  responseTimeData?: ResponseTimeData;
}) {
  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const conversionTrend = (summary?.taxa_conversao || 0) >= 50 ? "up" : (summary?.taxa_conversao || 0) >= 30 ? "neutral" : "down";
  const responseTimeTrend = (responseTimeData?.avg_response_time_seconds || 0) <= 10 ? "up" : (responseTimeData?.avg_response_time_seconds || 0) <= 30 ? "neutral" : "down";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <MetricCard 
          title="Total Atendimentos"
          value={summary?.total_conversations || 0}
          icon={<MessageSquare className="w-6 h-6" />}
        />
        <MetricCard 
          title="Finalizados (Agendados)"
          value={summary?.finalizados || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          trend="up"
          trendValue={`${summary?.total_conversations ? ((summary?.finalizados || 0) / summary.total_conversations * 100).toFixed(1) : 0}%`}
        />
        <MetricCard 
          title="Em Andamento"
          value={summary?.em_andamento || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <MetricCard 
          title="Taxa de Conversão"
          value={`${(summary?.taxa_conversao || 0).toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={conversionTrend}
          trendValue={conversionTrend === "up" ? "Ótimo" : conversionTrend === "neutral" ? "Regular" : "Baixo"}
        />
        <MetricCard 
          title="Tempo Médio Resposta"
          value={responseTimeData?.avg_response_time_formatted || "0s"}
          icon={<Clock className="w-6 h-6" />}
          trend={responseTimeTrend}
          trendValue={responseTimeTrend === "up" ? "Rápido" : responseTimeTrend === "neutral" ? "Normal" : "Lento"}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FollowUpCard label="Follow-up 1" value={summary?.follow_ups?.follow_up_01 || 0} color="blue" />
        <FollowUpCard label="Follow-up 2" value={summary?.follow_ups?.follow_up_02 || 0} color="green" />
        <FollowUpCard label="Follow-up 3" value={summary?.follow_ups?.follow_up_03 || 0} color="orange" />
        <FollowUpCard label="Follow-up 4" value={summary?.follow_ups?.follow_up_04 || 0} color="purple" />
      </div>

      {heatmapData && heatmapData.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Volume por Hora/Dia</h3>
          <HeatmapChart data={heatmapData} />
        </div>
      )}

      {trendsData && trendsData.daily && trendsData.daily.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tendência Diária</h3>
          <TrendChart data={trendsData.daily} />
        </div>
      )}

      {funnelData && funnelData.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Funil de Conversão</h3>
          <FunnelChart data={funnelData} />
        </div>
      )}
    </div>
  );
}

function QualityTab({ qualityData }: { qualityData?: QualityMetrics }) {
  if (!qualityData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Desempenho por Agente</h3>
        <div className="space-y-4">
          {qualityData.por_agente.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">{item.agente}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{item.total} atendimentos</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600 dark:text-green-400">{item.finalizados} finalizados</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{item.taxa.toFixed(1)}% taxa</div>
              </div>
            </div>
          ))}
          {qualityData.por_agente.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum dado disponível</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Distribuição por Follow-up</h3>
        <div className="space-y-4">
          {qualityData.por_follow_up.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-900/30">
                  <Repeat className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{item.follow_up}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-800 dark:text-white">{item.count}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{item.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
          {qualityData.por_follow_up.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum dado disponível</p>
          )}
        </div>
      </div>
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
  const statusOptions = [
    { value: "finalizado", label: "Finalizados" },
    { value: "em_andamento", label: "Em andamento" },
  ];

  const followUpOptions = filterOptions?.followUps.map(fu => ({ value: fu, label: fu })) || [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="p-5 md:p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Lista de Atendimentos</h3>
          <div className="flex flex-wrap gap-3">
            <FilterTabs
              options={statusOptions}
              value={selectedStatus as any}
              onChange={setSelectedStatus}
              allLabel="Todos Status"
            />
            {followUpOptions.length > 0 && (
              <FilterTabs
                options={followUpOptions}
                value={selectedFollowUp as any}
                onChange={setSelectedFollowUp}
                allLabel="Todos Follow-ups"
              />
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Telefone</th>
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Nome</th>
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Data/Hora</th>
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Agente</th>
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Follow-up</th>
              <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {atendimentosData?.data.map(atendimento => (
              <tr key={atendimento.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-4">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {atendimento.remotejid}
                  </div>
                </td>
                <td className="p-4 text-gray-800 dark:text-white">{atendimento.nome || "-"}</td>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  {format(new Date(atendimento.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </td>
                <td className="p-4 text-gray-800 dark:text-white">{atendimento.agente_atual || "-"}</td>
                <td className="p-4">
                  {atendimento.follow_up && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                      {atendimento.follow_up}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    atendimento.atendimento_finalizado 
                      ? "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-500"
                      : "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                  }`}>
                    {atendimento.atendimento_finalizado ? "Finalizado" : "Em andamento"}
                  </span>
                </td>
              </tr>
            ))}
            {(!atendimentosData?.data || atendimentosData.data.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhum atendimento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {atendimentosData && atendimentosData.total > atendimentosData.pageSize && (
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {((page - 1) * atendimentosData.pageSize) + 1} - {Math.min(page * atendimentosData.pageSize, atendimentosData.total)} de {atendimentosData.total}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="bg-white dark:bg-gray-800"
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * atendimentosData.pageSize >= atendimentosData.total}
              className="bg-white dark:bg-gray-800"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
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
    chart: { type: "heatmap", toolbar: { show: false }, background: "transparent" },
    dataLabels: { enabled: false },
    colors: ["#3b82f6"],
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => `${i}h`),
      labels: { style: { fontSize: "10px", colors: "#6b7280" } },
    },
    yaxis: { labels: { style: { fontSize: "12px", colors: "#6b7280" } } },
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
    theme: { mode: "light" },
  };

  return <ApexCharts type="heatmap" series={series} options={options} height={350} />;
}

function TrendChart({ data }: { data: TrendDataPoint[] }) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, sparkline: { enabled: false }, background: "transparent" },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
    xaxis: { 
      categories: data.map(d => d.label), 
      labels: { rotate: -45, style: { fontSize: "10px", colors: "#6b7280" } } 
    },
    yaxis: { labels: { style: { fontSize: "12px", colors: "#6b7280" } } },
    colors: ["#3b82f6"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e5e7eb" },
    theme: { mode: "light" },
  };

  const series = [{ name: "Atendimentos", data: data.map(d => d.value) }];

  return <ApexCharts type="area" series={series} options={options} height={350} />;
}

function FunnelChart({ data }: { data: FunnelStep[] }) {
  return (
    <div className="space-y-4">
      {data.map((step, idx) => (
        <div key={idx} className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800 dark:text-white">{step.name}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{step.value} ({step.percentage.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-6">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all"
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
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] max-w-2xl mx-auto">
      <div className="p-5 md:p-6 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Configuração do Supabase</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure a conexão com o Supabase para acessar os dados de atendimento da IA
        </p>
      </div>
      
      <div className="p-5 md:p-6 space-y-4">
        {configData?.supabaseConfigured && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Supabase configurado e conectado</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              URL: {configData.supabaseUrl} | Database: {configData.supabaseDatabase}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="supabaseUrl" className="text-gray-700 dark:text-gray-300">URL do Supabase</Label>
          <Input
            id="supabaseUrl"
            placeholder="supabase.ruch.com.br"
            value={supabaseUrl}
            onChange={e => setSupabaseUrl(e.target.value)}
            data-testid="input-supabase-url"
            className="bg-white dark:bg-gray-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Endereço do seu Supabase auto-hospedado
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supabaseDatabase" className="text-gray-700 dark:text-gray-300">Nome do Banco de Dados</Label>
          <Input
            id="supabaseDatabase"
            placeholder="nome_do_banco"
            value={supabaseDatabase}
            onChange={e => setSupabaseDatabase(e.target.value)}
            data-testid="input-supabase-database"
            className="bg-white dark:bg-gray-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nome do banco específico deste tenant no Supabase
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supabaseAnonKey" className="text-gray-700 dark:text-gray-300">
            Chave Anon (anon key)
            {configData?.supabaseConfigured && (
              <span className="text-xs text-gray-500 ml-2">(deixe vazio para manter a atual)</span>
            )}
          </Label>
          <Input
            id="supabaseAnonKey"
            type="password"
            placeholder={configData?.supabaseConfigured ? "••••••••••• (manter atual)" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
            value={supabaseAnonKey}
            onChange={e => setSupabaseAnonKey(e.target.value)}
            data-testid="input-supabase-key"
            className="bg-white dark:bg-gray-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {configData?.supabaseConfigured 
              ? "Preencha apenas para alterar a chave atual" 
              : "Chave pública de acesso ao Supabase"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tableAtendimentos" className="text-gray-700 dark:text-gray-300">Nome da Tabela de Atendimentos</Label>
            <Input
              id="tableAtendimentos"
              placeholder="atendimentos"
              value={tableAtendimentos}
              onChange={e => setTableAtendimentos(e.target.value)}
              data-testid="input-table-atendimentos"
              className="bg-white dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nome da tabela principal (padrão: atendimentos)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tableMensagens" className="text-gray-700 dark:text-gray-300">Nome da Tabela de Mensagens</Label>
            <Input
              id="tableMensagens"
              placeholder="mensagens"
              value={tableMensagens}
              onChange={e => setTableMensagens(e.target.value)}
              data-testid="input-table-mensagens"
              className="bg-white dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nome da tabela de histórico (padrão: mensagens)
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleTest} disabled={testing} data-testid="button-test-connection" className="bg-white dark:bg-gray-800">
            {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-config">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Configuração
          </Button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <h4 className="font-medium text-gray-800 dark:text-white mb-2">Estrutura Esperada das Tabelas</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            O Supabase deve conter a tabela de atendimentos (nome configurável acima) com os campos:
          </p>
          <div className="text-xs font-mono bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
            <p className="text-gray-700 dark:text-gray-300"><strong>id</strong> - UUID do registro</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>remotejid</strong> - Número de telefone do cliente</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>nome</strong> - Nome do cliente</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>timestamp</strong> - Data/hora do atendimento</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>agente_atual</strong> - Agente em atendimento</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>atendimento_finalizado</strong> - Boolean (true quando agendou)</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>follow_up</strong> - follow_up_01, follow_up_02, follow_up_03 ou follow_up_04</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 mb-2">
            A tabela de mensagens (nome configurável acima) é opcional e contém o histórico de conversas.
          </p>
        </div>
      </div>
    </div>
  );
}
