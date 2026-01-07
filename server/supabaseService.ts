import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface TenantSupabaseConfig {
  supabaseUrl: string;
  supabaseDatabase: string;
  supabaseAnonKey: string;
}

interface AiConversation {
  id: string;
  tenant_id?: string;
  contact_phone: string;
  contact_name?: string;
  channel: string;
  primary_intent?: string;
  status: string;
  satisfaction_score?: number;
  handoff_reason?: string;
  started_at: string;
  ended_at?: string;
  messages_count?: number;
  avg_response_time_ms?: number;
  sentiment?: string;
  agent_name?: string;
  tags?: string[];
}

interface AiMetricsSummary {
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

interface QualityMetrics {
  avg_messages_to_resolve: number;
  fallback_rate: number;
  top_questions: { question: string; count: number }[];
  sentiment_distribution: { sentiment: string; count: number; percentage: number }[];
  human_interventions: { reason: string; count: number }[];
}

interface AiAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  resolved_at?: string;
}

interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  channel?: string;
  status?: string;
  intent?: string;
  agentName?: string;
}

const supabaseClients: Map<string, SupabaseClient> = new Map();

function getSupabaseClient(config: TenantSupabaseConfig): SupabaseClient {
  const cacheKey = `${config.supabaseUrl}:${config.supabaseDatabase}`;
  
  if (supabaseClients.has(cacheKey)) {
    return supabaseClients.get(cacheKey)!;
  }
  
  const fullUrl = config.supabaseUrl.startsWith('http') 
    ? config.supabaseUrl 
    : `https://${config.supabaseUrl}`;
  
  const client = createClient(fullUrl, config.supabaseAnonKey, {
    db: {
      schema: 'public',
    },
  });
  
  supabaseClients.set(cacheKey, client);
  return client;
}

export async function getAiMetricsSummary(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<AiMetricsSummary> {
  const client = getSupabaseClient(config);
  
  let query = client
    .from('ai_conversations')
    .select('*', { count: 'exact' })
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate);
  
  if (filters.channel) {
    query = query.eq('channel', filters.channel);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.intent) {
    query = query.eq('primary_intent', filters.intent);
  }
  if (filters.agentName) {
    query = query.eq('agent_name', filters.agentName);
  }
  
  const { data: conversations, count, error } = await query;
  
  if (error) {
    console.error('Error fetching AI metrics:', error);
    throw new Error(`Erro ao buscar métricas: ${error.message}`);
  }
  
  const total = count || 0;
  const convs = conversations || [];
  
  const activeQuery = await client
    .from('ai_conversations')
    .select('id', { count: 'exact' })
    .eq('status', 'active')
    .is('ended_at', null);
  
  const activeCount = activeQuery.count || 0;
  
  const resolvedWithoutHandoff = convs.filter(c => c.status === 'resolved' && !c.handoff_reason).length;
  const handoffCount = convs.filter(c => c.handoff_reason).length;
  
  const avgResponseTime = convs.length > 0
    ? convs.reduce((sum, c) => sum + (c.avg_response_time_ms || 0), 0) / convs.length
    : 0;
  
  const satisfactionScores = convs.filter(c => c.satisfaction_score != null);
  const avgSatisfaction = satisfactionScores.length > 0
    ? satisfactionScores.reduce((sum, c) => sum + c.satisfaction_score, 0) / satisfactionScores.length
    : 0;
  
  return {
    total_conversations: total,
    avg_response_time_ms: Math.round(avgResponseTime),
    resolution_rate: total > 0 ? (resolvedWithoutHandoff / total) * 100 : 0,
    active_conversations: activeCount,
    avg_satisfaction: Number(avgSatisfaction.toFixed(1)),
    handoff_rate: total > 0 ? (handoffCount / total) * 100 : 0,
  };
}

export async function getHourlyDayHeatmap(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<HeatmapCell[]> {
  const client = getSupabaseClient(config);
  
  const { data: conversations, error } = await client
    .from('ai_conversations')
    .select('started_at')
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate);
  
  if (error) {
    console.error('Error fetching heatmap data:', error);
    throw new Error(`Erro ao buscar dados do mapa de calor: ${error.message}`);
  }
  
  const heatmap: Record<string, number> = {};
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap[`${day}-${hour}`] = 0;
    }
  }
  
  (conversations || []).forEach(conv => {
    const date = new Date(conv.started_at);
    const day = date.getDay();
    const hour = date.getHours();
    heatmap[`${day}-${hour}`]++;
  });
  
  return Object.entries(heatmap).map(([key, value]) => {
    const [day, hour] = key.split('-').map(Number);
    return { x: hour, y: day, value };
  });
}

export async function getIntentHourHeatmap(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<{ intents: string[]; data: HeatmapCell[] }> {
  const client = getSupabaseClient(config);
  
  const { data: conversations, error } = await client
    .from('ai_conversations')
    .select('started_at, primary_intent')
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate)
    .not('primary_intent', 'is', null);
  
  if (error) {
    console.error('Error fetching intent heatmap:', error);
    throw new Error(`Erro ao buscar mapa de intenções: ${error.message}`);
  }
  
  const intentsSet = new Set<string>();
  const heatmap: Record<string, number> = {};
  
  (conversations || []).forEach(conv => {
    if (conv.primary_intent) {
      intentsSet.add(conv.primary_intent);
      const date = new Date(conv.started_at);
      const hour = date.getHours();
      const key = `${conv.primary_intent}-${hour}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    }
  });
  
  const intents = Array.from(intentsSet).sort();
  
  const data: HeatmapCell[] = [];
  intents.forEach((intent, intentIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${intent}-${hour}`;
      data.push({
        x: hour,
        y: intentIndex,
        value: heatmap[key] || 0,
      });
    }
  });
  
  return { intents, data };
}

export async function getTrendData(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters,
  groupBy: 'hour' | 'day' | 'week' = 'day'
): Promise<TrendDataPoint[]> {
  const client = getSupabaseClient(config);
  
  const { data: conversations, error } = await client
    .from('ai_conversations')
    .select('started_at')
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate)
    .order('started_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching trend data:', error);
    throw new Error(`Erro ao buscar dados de tendência: ${error.message}`);
  }
  
  const groupedData: Record<string, number> = {};
  
  (conversations || []).forEach(conv => {
    const date = new Date(conv.started_at);
    let label: string;
    
    if (groupBy === 'hour') {
      label = `${date.toLocaleDateString('pt-BR')} ${String(date.getHours()).padStart(2, '0')}h`;
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      label = `Sem. ${weekStart.toLocaleDateString('pt-BR')}`;
    } else {
      label = date.toLocaleDateString('pt-BR');
    }
    
    groupedData[label] = (groupedData[label] || 0) + 1;
  });
  
  return Object.entries(groupedData).map(([label, value]) => ({ label, value }));
}

export async function getConversionFunnel(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<FunnelStep[]> {
  const client = getSupabaseClient(config);
  
  const { data: conversations, error } = await client
    .from('ai_conversations')
    .select('status, primary_intent')
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate);
  
  if (error) {
    console.error('Error fetching funnel data:', error);
    throw new Error(`Erro ao buscar dados do funil: ${error.message}`);
  }
  
  const convs = conversations || [];
  const total = convs.length;
  
  const entrada = total;
  const qualificados = convs.filter(c => c.primary_intent).length;
  const agendamentos = convs.filter(c => c.primary_intent === 'agendamento').length;
  const confirmados = convs.filter(c => c.primary_intent === 'agendamento' && c.status === 'resolved').length;
  
  return [
    { name: 'Entrada', value: entrada, percentage: 100 },
    { name: 'Qualificação', value: qualificados, percentage: total > 0 ? (qualificados / total) * 100 : 0 },
    { name: 'Agendamento', value: agendamentos, percentage: total > 0 ? (agendamentos / total) * 100 : 0 },
    { name: 'Confirmação', value: confirmados, percentage: total > 0 ? (confirmados / total) * 100 : 0 },
  ];
}

export async function getIntentDistribution(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<{ name: string; value: number; percentage: number }[]> {
  const client = getSupabaseClient(config);
  
  const { data: conversations, error } = await client
    .from('ai_conversations')
    .select('primary_intent')
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate);
  
  if (error) {
    console.error('Error fetching intent distribution:', error);
    throw new Error(`Erro ao buscar distribuição de intenções: ${error.message}`);
  }
  
  const convs = conversations || [];
  const total = convs.length;
  const intentCounts: Record<string, number> = {};
  
  convs.forEach(conv => {
    const intent = conv.primary_intent || 'Não identificado';
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
  });
  
  return Object.entries(intentCounts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export async function getQualityMetrics(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<QualityMetrics> {
  const client = getSupabaseClient(config);
  
  const { data: conversations, error } = await client
    .from('ai_conversations')
    .select('*')
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate);
  
  if (error) {
    console.error('Error fetching quality metrics:', error);
    throw new Error(`Erro ao buscar métricas de qualidade: ${error.message}`);
  }
  
  const convs = conversations || [];
  const total = convs.length;
  
  const resolvedConvs = convs.filter(c => c.status === 'resolved' && c.messages_count);
  const avgMessages = resolvedConvs.length > 0
    ? resolvedConvs.reduce((sum, c) => sum + (c.messages_count || 0), 0) / resolvedConvs.length
    : 0;
  
  const fallbackCount = convs.filter(c => c.tags?.includes('fallback')).length;
  const fallbackRate = total > 0 ? (fallbackCount / total) * 100 : 0;
  
  const sentimentCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  convs.forEach(conv => {
    const sentiment = conv.sentiment || 'neutral';
    sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
  });
  
  const sentimentDistribution = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
    sentiment,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
  
  const handoffReasons: Record<string, number> = {};
  convs.filter(c => c.handoff_reason).forEach(conv => {
    const reason = conv.handoff_reason!;
    handoffReasons[reason] = (handoffReasons[reason] || 0) + 1;
  });
  
  const humanInterventions = Object.entries(handoffReasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  
  const { data: topQuestions } = await client
    .from('ai_frequent_questions')
    .select('question, count')
    .gte('date', filters.startDate)
    .lte('date', filters.endDate)
    .order('count', { ascending: false })
    .limit(10);
  
  return {
    avg_messages_to_resolve: Number(avgMessages.toFixed(1)),
    fallback_rate: Number(fallbackRate.toFixed(1)),
    top_questions: topQuestions || [],
    sentiment_distribution: sentimentDistribution,
    human_interventions: humanInterventions,
  };
}

export async function getConversationsList(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters,
  page: number = 1,
  limit: number = 20
): Promise<{ conversations: AiConversation[]; total: number }> {
  const client = getSupabaseClient(config);
  
  const offset = (page - 1) * limit;
  
  let query = client
    .from('ai_conversations')
    .select('*', { count: 'exact' })
    .gte('started_at', filters.startDate)
    .lte('started_at', filters.endDate)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (filters.channel) {
    query = query.eq('channel', filters.channel);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.intent) {
    query = query.eq('primary_intent', filters.intent);
  }
  if (filters.agentName) {
    query = query.eq('agent_name', filters.agentName);
  }
  
  const { data: conversations, count, error } = await query;
  
  if (error) {
    console.error('Error fetching conversations list:', error);
    throw new Error(`Erro ao buscar lista de atendimentos: ${error.message}`);
  }
  
  return {
    conversations: conversations || [],
    total: count || 0,
  };
}

export async function getAlerts(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<AiAlert[]> {
  const client = getSupabaseClient(config);
  
  const { data: alerts, error } = await client
    .from('ai_alerts')
    .select('*')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
  
  return alerts || [];
}

export async function getChannelsList(config: TenantSupabaseConfig): Promise<string[]> {
  const client = getSupabaseClient(config);
  
  const { data, error } = await client
    .from('ai_conversations')
    .select('channel')
    .not('channel', 'is', null);
  
  if (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
  
  const channels = (data || []).map((d: { channel: string }) => d.channel);
  return Array.from(new Set(channels)).filter(Boolean) as string[];
}

export async function getIntentsList(config: TenantSupabaseConfig): Promise<string[]> {
  const client = getSupabaseClient(config);
  
  const { data, error } = await client
    .from('ai_conversations')
    .select('primary_intent')
    .not('primary_intent', 'is', null);
  
  if (error) {
    console.error('Error fetching intents:', error);
    return [];
  }
  
  const intents = (data || []).map((d: { primary_intent: string }) => d.primary_intent);
  return Array.from(new Set(intents)).filter(Boolean) as string[];
}

export async function getAgentsList(config: TenantSupabaseConfig): Promise<string[]> {
  const client = getSupabaseClient(config);
  
  const { data, error } = await client
    .from('ai_conversations')
    .select('agent_name')
    .not('agent_name', 'is', null);
  
  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
  
  const agents = (data || []).map((d: { agent_name: string }) => d.agent_name);
  return Array.from(new Set(agents)).filter(Boolean) as string[];
}

export async function testSupabaseConnection(config: TenantSupabaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const client = getSupabaseClient(config);
    
    const { error } = await client
      .from('ai_conversations')
      .select('id')
      .limit(1);
    
    if (error) {
      return { success: false, message: `Erro na conexão: ${error.message}` };
    }
    
    return { success: true, message: 'Conexão estabelecida com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro: ${err.message}` };
  }
}

export async function getMonthComparison(
  config: TenantSupabaseConfig
): Promise<{ current: number; previous: number; percentChange: number }> {
  const client = getSupabaseClient(config);
  
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const { count: currentCount } = await client
    .from('ai_conversations')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', currentMonthStart.toISOString())
    .lte('started_at', now.toISOString());
  
  const { count: previousCount } = await client
    .from('ai_conversations')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', previousMonthStart.toISOString())
    .lte('started_at', previousMonthEnd.toISOString());
  
  const current = currentCount || 0;
  const previous = previousCount || 0;
  const percentChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  
  return { current, previous, percentChange };
}
