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
  Clock, 
  CheckCircle, 
  Users, 
  Star, 
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
  RefreshCw,
  Calendar,
  Filter,
  BarChart3,
  Activity,
  MessageCircle,
  Phone,
  ExternalLink
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import ApexCharts from "react-apexcharts";

interface MetricsSummary {
  total_conversations: number;
  avg_response_time_ms: number;
  resolution_rate: number;
  active_conversations: number;
  avg_satisfaction: number;
  handoff_rate: number;
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

interface IntentDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface QualityMetrics {
  avg_messages_to_resolve: number;
  fallback_rate: number;
  top_questions: { question: string; count: number }[];
  sentiment_distribution: { sentiment: string; count: number; percentage: number }[];
  human_interventions: { reason: string; count: number }[];
}

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name?: string;
  channel: string;
  primary_intent?: string;
  status: string;
  satisfaction_score?: number;
  started_at: string;
  ended_at?: string;
  messages_count?: number;
  agent_name?: string;
}

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
}

interface FilterOptions {
  channels: string[];
  intents: string[];
  agents: string[];
}

interface SupabaseConfig {
  supabaseUrl: string;
  supabaseDatabase: string;
  supabaseAnonKey: string;
  supabaseConfigured: boolean;
}

const DATE_PRESETS = [
  { label: "Hoje", value: "today" },
  { label: "Ontem", value: "yesterday" },
  { label: "Últimos 7 dias", value: "7days" },
  { label: "Últimos 30 dias", value: "30days" },
  { label: "Este mês", value: "thisMonth" },
  { label: "Mês anterior", value: "lastMonth" },
  { label: "Personalizado", value: "custom" },
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  if (phone.length <= 4) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}

export default function AiAnalyticsPage() {
  const { toast } = useToast();
  const [datePreset, setDatePreset] = useState("7days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedIntent, setSelectedIntent] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [conversationsPage, setConversationsPage] = useState(1);

  const dateRange = useMemo(() => {
    if (datePreset === "custom" && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate).toISOString(),
      };
    }
    return getDateRange(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("startDate", dateRange.startDate);
    params.set("endDate", dateRange.endDate);
    if (selectedChannel) params.set("channel", selectedChannel);
    if (selectedStatus) params.set("status", selectedStatus);
    if (selectedIntent) params.set("intent", selectedIntent);
    if (selectedAgent) params.set("agentName", selectedAgent);
    return params.toString();
  }, [dateRange, selectedChannel, selectedStatus, selectedIntent, selectedAgent]);

  const { data: supabaseConfig, isLoading: isLoadingConfig } = useQuery<SupabaseConfig>({
    queryKey: ["/api/tenant/supabase-config"],
  });

  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ["/api/analytics/ai/filters"],
    enabled: !!supabaseConfig?.supabaseConfigured,
  });

  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery<MetricsSummary>({
    queryKey: ["/api/analytics/ai/summary", filterParams],
    enabled: !!supabaseConfig?.supabaseConfigured,
  });

  const { data: hourlyHeatmap } = useQuery<HeatmapCell[]>({
    queryKey: ["/api/analytics/ai/heatmap/hourly", filterParams],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const { data: trends } = useQuery<TrendDataPoint[]>({
    queryKey: ["/api/analytics/ai/trends", filterParams],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const { data: funnel } = useQuery<FunnelStep[]>({
    queryKey: ["/api/analytics/ai/funnel", filterParams],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const { data: intentDistribution } = useQuery<IntentDistribution[]>({
    queryKey: ["/api/analytics/ai/intents-distribution", filterParams],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "dashboard",
  });

  const { data: quality } = useQuery<QualityMetrics>({
    queryKey: ["/api/analytics/ai/quality", filterParams],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "quality",
  });

  const { data: conversationsData } = useQuery<{ conversations: Conversation[]; total: number }>({
    queryKey: ["/api/analytics/ai/conversations", filterParams, conversationsPage],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "conversations",
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/analytics/ai/alerts", filterParams],
    enabled: !!supabaseConfig?.supabaseConfigured && activeTab === "alerts",
  });

  const { data: comparison } = useQuery<{ current: number; previous: number; percentChange: number }>({
    queryKey: ["/api/analytics/ai/comparison"],
    enabled: !!supabaseConfig?.supabaseConfigured,
  });

  const handleRefresh = () => {
    refetchSummary();
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/ai"] });
    toast({ title: "Dados atualizados" });
  };

  const heatmapData = useMemo(() => {
    if (!hourlyHeatmap) return [];
    
    const series: { name: string; data: { x: string; y: number }[] }[] = [];
    
    for (let day = 0; day < 7; day++) {
      const dayData: { x: string; y: number }[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const cell = hourlyHeatmap.find(c => c.x === hour && c.y === day);
        dayData.push({
          x: `${String(hour).padStart(2, "0")}h`,
          y: cell?.value || 0,
        });
      }
      series.push({
        name: DAY_NAMES[day],
        data: dayData,
      });
    }
    
    return series;
  }, [hourlyHeatmap]);

  if (isLoadingConfig) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supabaseConfig?.supabaseConfigured) {
    return <SupabaseConfigForm />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Analytics de IA</h1>
          <p className="text-muted-foreground">Métricas e análises de atendimento da IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")} data-testid="button-settings">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Período</Label>
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-40" data-testid="select-date-preset">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {datePreset === "custom" && (
              <>
                <div className="space-y-1">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}

            {filterOptions && (
              <>
                <div className="space-y-1">
                  <Label>Canal</Label>
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="w-32" data-testid="select-channel">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {filterOptions.channels.map(ch => (
                        <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-32" data-testid="select-status">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="transferred">Transferido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filterOptions.intents.length > 0 && (
                  <div className="space-y-1">
                    <Label>Intenção</Label>
                    <Select value={selectedIntent} onValueChange={setSelectedIntent}>
                      <SelectTrigger className="w-36" data-testid="select-intent">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        {filterOptions.intents.map(intent => (
                          <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {filterOptions.agents.length > 0 && (
                  <div className="space-y-1">
                    <Label>Agente</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="w-40" data-testid="select-agent">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {filterOptions.agents.map(agent => (
                          <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="quality" data-testid="tab-quality">
            <Activity className="w-4 h-4 mr-2" />
            Qualidade
          </TabsTrigger>
          <TabsTrigger value="conversations" data-testid="tab-conversations">
            <MessageCircle className="w-4 h-4 mr-2" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              title="Total Atendimentos"
              value={summary?.total_conversations?.toLocaleString("pt-BR") || "0"}
              icon={MessageSquare}
              trend={comparison?.percentChange}
              loading={isLoadingSummary}
            />
            <MetricCard
              title="Tempo Médio Resposta"
              value={formatDuration(summary?.avg_response_time_ms || 0)}
              icon={Clock}
              loading={isLoadingSummary}
            />
            <MetricCard
              title="Taxa Resolução IA"
              value={`${(summary?.resolution_rate || 0).toFixed(1)}%`}
              icon={CheckCircle}
              loading={isLoadingSummary}
            />
            <MetricCard
              title="Ativos Agora"
              value={summary?.active_conversations?.toString() || "0"}
              icon={Users}
              loading={isLoadingSummary}
              highlight={true}
            />
            <MetricCard
              title="NPS Médio"
              value={summary?.avg_satisfaction?.toFixed(1) || "0"}
              icon={Star}
              loading={isLoadingSummary}
            />
            <MetricCard
              title="Taxa Handoff"
              value={`${(summary?.handoff_rate || 0).toFixed(1)}%`}
              icon={ArrowRightLeft}
              loading={isLoadingSummary}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Volume por Dia/Hora</CardTitle>
              </CardHeader>
              <CardContent>
                {heatmapData.length > 0 ? (
                  <ApexCharts
                    options={{
                      chart: { type: "heatmap", toolbar: { show: false } },
                      dataLabels: { enabled: false },
                      colors: ["#0e766e"],
                      xaxis: { type: "category" },
                      tooltip: {
                        y: { formatter: (val: number) => `${val} atendimentos` },
                      },
                    }}
                    series={heatmapData}
                    type="heatmap"
                    height={250}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendência de Volume</CardTitle>
              </CardHeader>
              <CardContent>
                {trends && trends.length > 0 ? (
                  <ApexCharts
                    options={{
                      chart: { type: "area", toolbar: { show: false }, sparkline: { enabled: false } },
                      stroke: { curve: "smooth", width: 2 },
                      fill: { type: "gradient", gradient: { opacityFrom: 0.5, opacityTo: 0 } },
                      colors: ["#0e766e"],
                      xaxis: { categories: trends.map(t => t.label), labels: { show: true } },
                      yaxis: { labels: { formatter: (val: number) => val.toFixed(0) } },
                      tooltip: { y: { formatter: (val: number) => `${val} atendimentos` } },
                    }}
                    series={[{ name: "Atendimentos", data: trends.map(t => t.value) }]}
                    type="area"
                    height={250}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                {funnel && funnel.length > 0 ? (
                  <div className="space-y-3">
                    {funnel.map((step, idx) => (
                      <div key={step.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{step.name}</span>
                          <span className="font-medium">{step.value} ({step.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-6 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${step.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Intenção</CardTitle>
              </CardHeader>
              <CardContent>
                {intentDistribution && intentDistribution.length > 0 ? (
                  <ApexCharts
                    options={{
                      chart: { type: "donut" },
                      labels: intentDistribution.map(i => i.name),
                      colors: ["#0e766e", "#14b8a6", "#5eead4", "#99f6e4", "#ccfbf1", "#f0fdfa"],
                      legend: { position: "bottom" },
                      tooltip: {
                        y: { formatter: (val: number) => `${val} atendimentos` },
                      },
                    }}
                    series={intentDistribution.map(i => i.value)}
                    type="donut"
                    height={250}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          {quality ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  title="Mensagens até Resolução"
                  value={quality.avg_messages_to_resolve.toFixed(1)}
                  icon={MessageSquare}
                />
                <MetricCard
                  title="Taxa de Fallback"
                  value={`${quality.fallback_rate.toFixed(1)}%`}
                  icon={AlertTriangle}
                />
                <MetricCard
                  title="Intervenções Humanas"
                  value={quality.human_interventions.reduce((s, h) => s + h.count, 0).toString()}
                  icon={Users}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição de Sentimento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ApexCharts
                      options={{
                        chart: { type: "pie" },
                        labels: quality.sentiment_distribution.map(s => {
                          const labels: Record<string, string> = { positive: "Positivo", neutral: "Neutro", negative: "Negativo" };
                          return labels[s.sentiment] || s.sentiment;
                        }),
                        colors: ["#22c55e", "#94a3b8", "#ef4444"],
                        legend: { position: "bottom" },
                      }}
                      series={quality.sentiment_distribution.map(s => s.count)}
                      type="pie"
                      height={250}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Motivos de Handoff</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {quality.human_interventions.length > 0 ? (
                      <div className="space-y-2">
                        {quality.human_interventions.map(h => (
                          <div key={h.reason} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span className="text-sm">{h.reason}</span>
                            <Badge variant="secondary">{h.count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-muted-foreground">
                        Nenhum handoff registrado
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Perguntas Mais Frequentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {quality.top_questions.length > 0 ? (
                    <div className="space-y-2">
                      {quality.top_questions.map((q, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded">
                          <span>{q.question}</span>
                          <Badge>{q.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground">
                      Sem dados disponíveis
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Lista de Atendimentos
                {conversationsData && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({conversationsData.total} total)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversationsData?.conversations && conversationsData.conversations.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Contato</th>
                          <th className="text-left p-2">Canal</th>
                          <th className="text-left p-2">Intenção</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Início</th>
                          <th className="text-left p-2">Msgs</th>
                          <th className="text-left p-2">NPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversationsData.conversations.map(conv => (
                          <tr key={conv.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span>{maskPhone(conv.contact_phone)}</span>
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge variant="outline">{conv.channel}</Badge>
                            </td>
                            <td className="p-2">{conv.primary_intent || "-"}</td>
                            <td className="p-2">
                              <Badge variant={
                                conv.status === "resolved" ? "default" :
                                conv.status === "active" ? "secondary" :
                                "outline"
                              }>
                                {conv.status}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {format(new Date(conv.started_at), "dd/MM HH:mm", { locale: ptBR })}
                            </td>
                            <td className="p-2">{conv.messages_count || "-"}</td>
                            <td className="p-2">
                              {conv.satisfaction_score ? (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500" />
                                  {conv.satisfaction_score}
                                </div>
                              ) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-muted-foreground">
                      Página {conversationsPage} de {Math.ceil(conversationsData.total / 20)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={conversationsPage === 1}
                        onClick={() => setConversationsPage(p => p - 1)}
                        data-testid="button-prev-page"
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={conversationsPage >= Math.ceil(conversationsData.total / 20)}
                        onClick={() => setConversationsPage(p => p + 1)}
                        data-testid="button-next-page"
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  Nenhum atendimento encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas e Anomalias</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.severity === "critical" ? "border-red-500 bg-red-50 dark:bg-red-950" :
                        alert.severity === "warning" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" :
                        "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                          alert.severity === "critical" ? "text-red-500" :
                          alert.severity === "warning" ? "text-yellow-500" :
                          "text-blue-500"
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.type}</span>
                            <Badge variant={
                              alert.severity === "critical" ? "destructive" :
                              alert.severity === "warning" ? "default" :
                              "secondary"
                            }>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{alert.message}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  Nenhum alerta encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <SupabaseConfigForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  highlight,
}: {
  title: string;
  value: string;
  icon: any;
  trend?: number;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="h-8 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SupabaseConfigForm() {
  const { toast } = useToast();
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseDatabase, setSupabaseDatabase] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyChanged, setKeyChanged] = useState(false);

  const { data: currentConfig, refetch, isLoading: configLoading } = useQuery<SupabaseConfig>({
    queryKey: ["/api/tenant/supabase-config"],
  });

  // Only load URL and database from config, never the key (it's masked on server)
  useEffect(() => {
    if (currentConfig) {
      if (!supabaseUrl && currentConfig.supabaseUrl) {
        setSupabaseUrl(currentConfig.supabaseUrl);
      }
      if (!supabaseDatabase && currentConfig.supabaseDatabase) {
        setSupabaseDatabase(currentConfig.supabaseDatabase);
      }
    }
  }, [currentConfig]);

  const handleTest = async () => {
    if (!supabaseUrl || !supabaseDatabase || !supabaseAnonKey) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      const response = await apiRequest("POST", "/api/analytics/ai/test-connection", { 
        supabaseUrl, 
        supabaseDatabase, 
        supabaseAnonKey 
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
    // Validate: need URL and database always; key only if not already configured or being changed
    if (!supabaseUrl || !supabaseDatabase) {
      toast({ title: "URL e Database são obrigatórios", variant: "destructive" });
      return;
    }
    
    // If no key configured and none provided, require key
    if (!currentConfig?.supabaseConfigured && !supabaseAnonKey) {
      toast({ title: "Chave Anon é obrigatória para configuração inicial", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Only send key if it was actually changed/provided
      const configData: any = { 
        supabaseUrl, 
        supabaseDatabase 
      };
      
      // Only include key if user typed a new one
      if (supabaseAnonKey) {
        configData.supabaseAnonKey = supabaseAnonKey;
      }

      await apiRequest("PUT", "/api/tenant/supabase-config", configData);

      toast({ title: "Configuração salva com sucesso!" });
      setSupabaseAnonKey(""); // Clear key from state after saving
      setKeyChanged(false);
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
        {currentConfig?.supabaseConfigured && (
          <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-5 h-5" />
              <span>Supabase configurado e conectado</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              URL: {currentConfig.supabaseUrl} | Database: {currentConfig.supabaseDatabase}
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
            {currentConfig?.supabaseConfigured && (
              <span className="text-xs text-muted-foreground ml-2">(deixe vazio para manter a atual)</span>
            )}
          </Label>
          <Input
            id="supabaseAnonKey"
            type="password"
            placeholder={currentConfig?.supabaseConfigured ? "••••••••••• (manter atual)" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
            value={supabaseAnonKey}
            onChange={e => setSupabaseAnonKey(e.target.value)}
            data-testid="input-supabase-key"
          />
          <p className="text-xs text-muted-foreground">
            {currentConfig?.supabaseConfigured 
              ? "Preencha apenas para alterar a chave atual" 
              : "Chave pública de acesso ao Supabase"}
          </p>
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
            O Supabase deve conter as seguintes tabelas para funcionar corretamente:
          </p>
          <div className="text-xs font-mono bg-background p-3 rounded border space-y-1">
            <p><strong>ai_conversations</strong> - Dados dos atendimentos</p>
            <p className="text-muted-foreground pl-4">id, contact_phone, contact_name, channel, primary_intent, status, satisfaction_score, started_at, ended_at, messages_count, avg_response_time_ms, sentiment, agent_name, handoff_reason, tags</p>
            <p className="mt-2"><strong>ai_alerts</strong> - Alertas e anomalias</p>
            <p className="text-muted-foreground pl-4">id, type, severity, message, created_at, resolved_at</p>
            <p className="mt-2"><strong>ai_frequent_questions</strong> - Perguntas frequentes (opcional)</p>
            <p className="text-muted-foreground pl-4">id, question, count, date</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
