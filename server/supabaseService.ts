import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface TenantSupabaseConfig {
  supabaseUrl: string;
  supabaseDatabase: string;
  supabaseAnonKey: string;
  tableAtendimentos?: string;  // Nome da tabela de atendimentos (default: 'atendimentos')
  tableMensagens?: string;     // Nome da tabela de mensagens (default: 'mensagens')
}

// Estrutura real das tabelas do tenant
interface AtendimentoRecord {
  id: string;
  remotejid: string;       // número de telefone
  nome: string;            // nome do cliente
  timestamp: string;       // data/hora
  agente_atual: string;    // agente em atendimento
  atendimento_finalizado: boolean;  // se já agendou
  follow_up: string;       // follow_up_01, follow_up_02, follow_up_03, follow_up_04
}

// Tabela de mensagens (histórico de conversas)
interface MensagemRecord {
  id: string;
  remotejid: string;           // número de telefone (relaciona com atendimentos)
  conversation_history: string; // histórico da conversa em JSON ou texto
  timestamp: string;           // data/hora da mensagem
}

// Estrutura do conversation_history após parse
interface ConversationHistoryEntry {
  role: 'user' | 'model' | 'assistant';  // 'model' = resposta da IA (Gemini)
  parts: { text: string }[];
}

interface AiMetricsSummary {
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
  x: number;  // hora (0-23)
  y: number;  // dia da semana (0-6)
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

interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  agente?: string;
  status?: string;  // 'finalizado' | 'em_andamento' | 'all'
  followUp?: string;
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

// Funções helper para obter nomes de tabelas
function getTableName(config: TenantSupabaseConfig): string {
  return config.tableAtendimentos || 'atendimentos';
}

function getMensagensTableName(config: TenantSupabaseConfig): string {
  return config.tableMensagens || 'mensagens';
}

export async function getAiMetricsSummary(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<AiMetricsSummary> {
  const client = getSupabaseClient(config);
  const tableName = getTableName(config);
  
  let query = client
    .from(tableName)
    .select('*')
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate);
  
  if (filters.agente) {
    query = query.eq('agente_atual', filters.agente);
  }
  
  const { data: records, error } = await query;
  
  if (error) {
    console.error('Error fetching AI metrics:', error);
    throw new Error(`Erro ao buscar métricas: ${error.message}`);
  }
  
  const atendimentos = records as AtendimentoRecord[] || [];
  const total = atendimentos.length;
  
  const finalizados = atendimentos.filter(a => a.atendimento_finalizado === true).length;
  const emAndamento = atendimentos.filter(a => a.atendimento_finalizado === false).length;
  
  const followUpCounts = {
    follow_up_01: atendimentos.filter(a => a.follow_up === 'follow_up_01').length,
    follow_up_02: atendimentos.filter(a => a.follow_up === 'follow_up_02').length,
    follow_up_03: atendimentos.filter(a => a.follow_up === 'follow_up_03').length,
    follow_up_04: atendimentos.filter(a => a.follow_up === 'follow_up_04').length,
  };
  
  return {
    total_conversations: total,
    finalizados,
    em_andamento: emAndamento,
    taxa_conversao: total > 0 ? (finalizados / total) * 100 : 0,
    follow_ups: followUpCounts,
  };
}

export async function getHourlyDayHeatmap(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<HeatmapCell[]> {
  const client = getSupabaseClient(config);
  const tableName = getTableName(config);
  
  const { data: records, error } = await client
    .from(tableName)
    .select('timestamp')
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate);
  
  if (error) {
    console.error('Error fetching heatmap data:', error);
    throw new Error(`Erro ao buscar heatmap: ${error.message}`);
  }
  
  const atendimentos = records as { timestamp: string }[] || [];
  
  // Matriz 24h x 7 dias
  const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
  
  atendimentos.forEach(record => {
    const date = new Date(record.timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    heatmap[dayOfWeek][hour]++;
  });
  
  // Converter para formato de células
  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (heatmap[day][hour] > 0) {
        cells.push({ x: hour, y: day, value: heatmap[day][hour] });
      }
    }
  }
  
  return cells;
}

export async function getDailyTrends(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<{ daily: TrendDataPoint[]; hourly: TrendDataPoint[] }> {
  const client = getSupabaseClient(config);
  const tableName = getTableName(config);
  
  const { data: records, error } = await client
    .from(tableName)
    .select('timestamp, atendimento_finalizado')
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate)
    .order('timestamp', { ascending: true });
  
  if (error) {
    console.error('Error fetching trends:', error);
    throw new Error(`Erro ao buscar tendências: ${error.message}`);
  }
  
  const atendimentos = records as { timestamp: string; atendimento_finalizado: boolean }[] || [];
  
  // Agrupar por dia
  const dailyMap = new Map<string, number>();
  const hourlyMap = new Map<number, number>();
  
  atendimentos.forEach(record => {
    const date = new Date(record.timestamp);
    const dayKey = date.toISOString().split('T')[0];
    const hour = date.getHours();
    
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });
  
  const daily: TrendDataPoint[] = Array.from(dailyMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  const hourly: TrendDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
    label: `${i}h`,
    value: hourlyMap.get(i) || 0,
  }));
  
  return { daily, hourly };
}

export async function getConversionFunnel(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<FunnelStep[]> {
  const client = getSupabaseClient(config);
  const tableName = getTableName(config);
  
  const { data: records, error } = await client
    .from(tableName)
    .select('atendimento_finalizado, follow_up')
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate);
  
  if (error) {
    console.error('Error fetching funnel:', error);
    throw new Error(`Erro ao buscar funil: ${error.message}`);
  }
  
  const atendimentos = records as { atendimento_finalizado: boolean; follow_up: string }[] || [];
  const total = atendimentos.length;
  
  if (total === 0) {
    return [
      { name: 'Atendimentos Iniciados', value: 0, percentage: 0 },
      { name: 'Follow-up 1', value: 0, percentage: 0 },
      { name: 'Follow-up 2', value: 0, percentage: 0 },
      { name: 'Follow-up 3', value: 0, percentage: 0 },
      { name: 'Follow-up 4', value: 0, percentage: 0 },
      { name: 'Finalizados (Agendados)', value: 0, percentage: 0 },
    ];
  }
  
  const followUp1 = atendimentos.filter(a => 
    ['follow_up_01', 'follow_up_02', 'follow_up_03', 'follow_up_04'].includes(a.follow_up)
  ).length;
  const followUp2 = atendimentos.filter(a => 
    ['follow_up_02', 'follow_up_03', 'follow_up_04'].includes(a.follow_up)
  ).length;
  const followUp3 = atendimentos.filter(a => 
    ['follow_up_03', 'follow_up_04'].includes(a.follow_up)
  ).length;
  const followUp4 = atendimentos.filter(a => a.follow_up === 'follow_up_04').length;
  const finalizados = atendimentos.filter(a => a.atendimento_finalizado === true).length;
  
  return [
    { name: 'Atendimentos Iniciados', value: total, percentage: 100 },
    { name: 'Follow-up 1', value: followUp1, percentage: (followUp1 / total) * 100 },
    { name: 'Follow-up 2', value: followUp2, percentage: (followUp2 / total) * 100 },
    { name: 'Follow-up 3', value: followUp3, percentage: (followUp3 / total) * 100 },
    { name: 'Follow-up 4', value: followUp4, percentage: (followUp4 / total) * 100 },
    { name: 'Finalizados (Agendados)', value: finalizados, percentage: (finalizados / total) * 100 },
  ];
}

export async function getQualityMetrics(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<QualityMetrics> {
  const client = getSupabaseClient(config);
  const tableName = getTableName(config);
  
  const { data: records, error } = await client
    .from(tableName)
    .select('agente_atual, atendimento_finalizado, follow_up')
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate);
  
  if (error) {
    console.error('Error fetching quality metrics:', error);
    throw new Error(`Erro ao buscar métricas de qualidade: ${error.message}`);
  }
  
  const atendimentos = records as AtendimentoRecord[] || [];
  const total = atendimentos.length;
  
  // Métricas por agente
  const agenteMap = new Map<string, { total: number; finalizados: number }>();
  atendimentos.forEach(a => {
    const agente = a.agente_atual || 'Não definido';
    const current = agenteMap.get(agente) || { total: 0, finalizados: 0 };
    current.total++;
    if (a.atendimento_finalizado) current.finalizados++;
    agenteMap.set(agente, current);
  });
  
  const porAgente = Array.from(agenteMap.entries()).map(([agente, stats]) => ({
    agente,
    total: stats.total,
    finalizados: stats.finalizados,
    taxa: stats.total > 0 ? (stats.finalizados / stats.total) * 100 : 0,
  })).sort((a, b) => b.total - a.total);
  
  // Distribuição por follow-up
  const followUpMap = new Map<string, number>();
  atendimentos.forEach(a => {
    const fu = a.follow_up || 'Sem follow-up';
    followUpMap.set(fu, (followUpMap.get(fu) || 0) + 1);
  });
  
  const porFollowUp = Array.from(followUpMap.entries()).map(([follow_up, count]) => ({
    follow_up,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  })).sort((a, b) => b.count - a.count);
  
  return { por_agente: porAgente, por_follow_up: porFollowUp };
}

export async function getAtendimentosList(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: AtendimentoRecord[]; total: number; page: number; pageSize: number }> {
  const client = getSupabaseClient(config);
  const tableName = getTableName(config);
  
  const offset = (page - 1) * pageSize;
  
  let query = client
    .from(tableName)
    .select('*', { count: 'exact' })
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate)
    .order('timestamp', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (filters.agente) {
    query = query.eq('agente_atual', filters.agente);
  }
  if (filters.status === 'finalizado') {
    query = query.eq('atendimento_finalizado', true);
  } else if (filters.status === 'em_andamento') {
    query = query.eq('atendimento_finalizado', false);
  }
  if (filters.followUp) {
    query = query.eq('follow_up', filters.followUp);
  }
  
  const { data, count, error } = await query;
  
  if (error) {
    console.error('Error fetching atendimentos list:', error);
    throw new Error(`Erro ao buscar atendimentos: ${error.message}`);
  }
  
  return {
    data: (data as AtendimentoRecord[]) || [],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getFilterOptions(
  config: TenantSupabaseConfig
): Promise<{ agentes: string[]; followUps: string[] }> {
  const client = getSupabaseClient(config);
  const tableName = getTableName(config);
  
  const { data: records, error } = await client
    .from(tableName)
    .select('agente_atual, follow_up');
  
  if (error) {
    console.error('Error fetching filter options:', error);
    throw new Error(`Erro ao buscar opções de filtro: ${error.message}`);
  }
  
  const atendimentos = records as { agente_atual: string; follow_up: string }[] || [];
  
  const agentes = Array.from(new Set(atendimentos.map(a => a.agente_atual).filter(Boolean))).sort();
  const followUps = Array.from(new Set(atendimentos.map(a => a.follow_up).filter(Boolean))).sort();
  
  return { agentes, followUps };
}

export async function getMonthComparison(
  config: TenantSupabaseConfig,
  currentMonth: string,
  previousMonth: string
): Promise<{ current: AiMetricsSummary; previous: AiMetricsSummary; variation: Record<string, number> }> {
  const currentFilters: AnalyticsFilters = {
    startDate: `${currentMonth}-01`,
    endDate: `${currentMonth}-31`,
  };
  
  const previousFilters: AnalyticsFilters = {
    startDate: `${previousMonth}-01`,
    endDate: `${previousMonth}-31`,
  };
  
  const [current, previous] = await Promise.all([
    getAiMetricsSummary(config, currentFilters),
    getAiMetricsSummary(config, previousFilters),
  ]);
  
  const calcVariation = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };
  
  return {
    current,
    previous,
    variation: {
      total_conversations: calcVariation(current.total_conversations, previous.total_conversations),
      finalizados: calcVariation(current.finalizados, previous.finalizados),
      taxa_conversao: calcVariation(current.taxa_conversao, previous.taxa_conversao),
    },
  };
}

export async function testSupabaseConnection(config: TenantSupabaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const client = getSupabaseClient(config);
    const tableName = getTableName(config);
    const mensagensTableName = getMensagensTableName(config);
    
    // Testar conexão buscando 1 registro da tabela de atendimentos
    const { data: atendData, error: atendError } = await client
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (atendError) {
      return { 
        success: false, 
        message: `Erro na tabela '${tableName}': ${atendError.message}` 
      };
    }
    
    // Testar conexão com a tabela de mensagens
    const { data: msgData, error: msgError } = await client
      .from(mensagensTableName)
      .select('id')
      .limit(1);
    
    if (msgError) {
      return { 
        success: true, 
        message: `Tabela '${tableName}' OK. Tabela '${mensagensTableName}' não encontrada (opcional).` 
      };
    }
    
    return { 
      success: true, 
      message: `Conexão OK! Tabelas '${tableName}' e '${mensagensTableName}' acessíveis.` 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Erro: ${error.message}` 
    };
  }
}

// ==================== TABELA MENSAGENS ====================

// Buscar histórico de conversa por remotejid
export async function getConversationHistory(
  config: TenantSupabaseConfig,
  remotejid: string
): Promise<MensagemRecord[]> {
  const client = getSupabaseClient(config);
  const tableName = getMensagensTableName(config);
  
  const { data, error } = await client
    .from(tableName)
    .select('*')
    .eq('remotejid', remotejid)
    .order('timestamp', { ascending: true });
  
  if (error) {
    console.error('Error fetching conversation history:', error);
    throw new Error(`Erro ao buscar histórico: ${error.message}`);
  }
  
  return (data as MensagemRecord[]) || [];
}

// Buscar estatísticas de mensagens
export async function getMessageStats(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<{ total_messages: number; unique_contacts: number; avg_messages_per_contact: number }> {
  const client = getSupabaseClient(config);
  const tableName = getMensagensTableName(config);
  
  const { data, error, count } = await client
    .from(tableName)
    .select('remotejid', { count: 'exact' })
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate);
  
  if (error) {
    console.error('Error fetching message stats:', error);
    return { total_messages: 0, unique_contacts: 0, avg_messages_per_contact: 0 };
  }
  
  const messages = data || [];
  const totalMessages = count || 0;
  const uniqueContacts = new Set(messages.map((m: any) => m.remotejid)).size;
  const avgMessagesPerContact = uniqueContacts > 0 ? totalMessages / uniqueContacts : 0;
  
  return {
    total_messages: totalMessages,
    unique_contacts: uniqueContacts,
    avg_messages_per_contact: Math.round(avgMessagesPerContact * 10) / 10,
  };
}

// Listar mensagens recentes
export async function getRecentMessages(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: MensagemRecord[]; total: number; page: number; pageSize: number }> {
  const client = getSupabaseClient(config);
  const tableName = getMensagensTableName(config);
  const offset = (page - 1) * pageSize;
  
  const { data, count, error } = await client
    .from(tableName)
    .select('*', { count: 'exact' })
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate)
    .order('timestamp', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (error) {
    console.error('Error fetching recent messages:', error);
    throw new Error(`Erro ao buscar mensagens: ${error.message}`);
  }
  
  return {
    data: (data as MensagemRecord[]) || [],
    total: count || 0,
    page,
    pageSize,
  };
}

// Calcular tempo médio de resposta da IA
export async function getAverageResponseTime(
  config: TenantSupabaseConfig,
  filters: AnalyticsFilters
): Promise<{ avg_response_time_seconds: number; avg_response_time_formatted: string; total_responses: number }> {
  const client = getSupabaseClient(config);
  const tableName = getMensagensTableName(config);
  
  // Buscar todas as mensagens no período, ordenadas por remotejid e timestamp
  const { data, error } = await client
    .from(tableName)
    .select('remotejid, conversation_history, timestamp')
    .gte('timestamp', filters.startDate)
    .lte('timestamp', filters.endDate)
    .order('remotejid', { ascending: true })
    .order('timestamp', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages for response time:', error);
    return { avg_response_time_seconds: 0, avg_response_time_formatted: '0s', total_responses: 0 };
  }
  
  const messages = data || [];
  
  if (messages.length === 0) {
    return { avg_response_time_seconds: 0, avg_response_time_formatted: '0s', total_responses: 0 };
  }
  
  // Agrupar mensagens por remotejid
  const groupedByContact = new Map<string, { role: string; timestamp: Date }[]>();
  
  messages.forEach((msg: any) => {
    const remotejid = msg.remotejid;
    let role = 'unknown';
    
    try {
      const history: ConversationHistoryEntry = JSON.parse(msg.conversation_history);
      role = history.role === 'model' ? 'assistant' : history.role;
    } catch {
      // Se não conseguir parsear, tenta identificar pelo conteúdo
      role = 'unknown';
    }
    
    if (!groupedByContact.has(remotejid)) {
      groupedByContact.set(remotejid, []);
    }
    
    groupedByContact.get(remotejid)!.push({
      role,
      timestamp: new Date(msg.timestamp)
    });
  });
  
  // Calcular tempos de resposta
  const responseTimes: number[] = [];
  
  groupedByContact.forEach((messages) => {
    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1];
      const curr = messages[i];
      
      // Se a mensagem anterior é do usuário e a atual é do assistant/model
      if (prev.role === 'user' && (curr.role === 'assistant' || curr.role === 'model')) {
        const diffMs = curr.timestamp.getTime() - prev.timestamp.getTime();
        // Considerar apenas respostas em até 1 hora (evita outliers)
        if (diffMs > 0 && diffMs < 3600000) {
          responseTimes.push(diffMs / 1000); // Converter para segundos
        }
      }
    }
  });
  
  if (responseTimes.length === 0) {
    return { avg_response_time_seconds: 0, avg_response_time_formatted: '0s', total_responses: 0 };
  }
  
  const avgSeconds = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  
  // Formatar tempo
  let formatted: string;
  if (avgSeconds < 60) {
    formatted = `${Math.round(avgSeconds)}s`;
  } else if (avgSeconds < 3600) {
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = Math.round(avgSeconds % 60);
    formatted = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(avgSeconds / 3600);
    const minutes = Math.round((avgSeconds % 3600) / 60);
    formatted = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  
  return {
    avg_response_time_seconds: Math.round(avgSeconds * 100) / 100,
    avg_response_time_formatted: formatted,
    total_responses: responseTimes.length
  };
}
