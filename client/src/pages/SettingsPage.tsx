import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Copy, Trash2, Key, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BusinessHoursManager } from "@/components/BusinessHoursManager";

type ApiToken = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  createdBy: string;
};

export default function SettingsPage() {
  const baseUrl = window.location.origin;
  const { toast } = useToast();
  const [tokenLabel, setTokenLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  const { data: tokens, isLoading } = useQuery<ApiToken[]>({
    queryKey: ["/api/settings/api-tokens"],
  });

  const createTokenMutation = useMutation({
    mutationFn: async (label: string) => {
      const response = await fetch("/api/settings/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label }),
      });
      if (!response.ok) throw new Error("Failed to create token");
      return (await response.json()) as ApiToken & { token: string };
    },
    onSuccess: (data) => {
      setNewToken(data.token);
      setTokenLabel("");
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-tokens"] });
      toast({
        title: "Token criado",
        description: "Copie o token agora, ele não será exibido novamente",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar token",
        variant: "destructive",
      });
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/settings/api-tokens/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-tokens"] });
      toast({
        title: "Token revogado",
        description: "O token foi revogado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao revogar token",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Token copiado para a área de transferência",
    });
  };

  const handleCreateToken = () => {
    if (!tokenLabel.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o token",
        variant: "destructive",
      });
      return;
    }
    createTokenMutation.mutate(tokenLabel);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema e documentação da API</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Personalize a aparência do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha entre tema claro ou escuro
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tokens de API</CardTitle>
            <CardDescription>
              Gere tokens para autenticação em integrações N8N, Zapier e outras ferramentas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Use tokens de API para autenticar requisições sem precisar fazer login. 
                Cada token identifica automaticamente seu tenant (empresa).
              </AlertDescription>
            </Alert>

            {newToken && (
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-semibold">Token criado com sucesso! Copie agora:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
                      {newToken}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newToken)}
                      data-testid="button-copy-new-token"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este token não será exibido novamente. Guarde-o em local seguro.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="token-label">Criar novo token</Label>
              <div className="flex gap-2">
                <Input
                  id="token-label"
                  placeholder="Ex: N8N Produção"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateToken()}
                  data-testid="input-token-label"
                />
                <Button 
                  onClick={handleCreateToken}
                  disabled={createTokenMutation.isPending}
                  data-testid="button-create-token"
                >
                  {createTokenMutation.isPending ? "Criando..." : "Criar Token"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tokens ativos</Label>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando tokens...</p>
              ) : tokens && tokens.length > 0 ? (
                <div className="space-y-2">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                      data-testid={`token-item-${token.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{token.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Criado em {new Date(token.createdAt).toLocaleDateString('pt-BR')}
                          {token.lastUsedAt && ` • Último uso: ${new Date(token.lastUsedAt).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => revokeTokenMutation.mutate(token.id)}
                        disabled={revokeTokenMutation.isPending}
                        data-testid={`button-revoke-${token.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum token ativo</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horários de Funcionamento</CardTitle>
            <CardDescription>
              Configure os horários em que sua empresa funciona. Esses horários serão usados para verificar disponibilidade de agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessHoursManager />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API de Integração</CardTitle>
            <CardDescription>
              Documentação completa dos endpoints REST para integração com N8N, Zapier e outras ferramentas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Key className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Autenticação com Token de API</p>
                <p className="text-sm mb-2">
                  Use o token de API gerado acima para autenticar suas requisições. 
                  Adicione o header <code className="bg-muted px-1 rounded">Authorization: Bearer SEU_TOKEN</code> em todas as requisições.
                </p>
                <p className="text-sm">
                  <strong>Exemplo:</strong>
                </p>
                <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/clients \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`}
                </pre>
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="clients" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="clients">Clientes</TabsTrigger>
                <TabsTrigger value="services">Serviços</TabsTrigger>
                <TabsTrigger value="professionals">Profissionais</TabsTrigger>
                <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
              </TabsList>

              <TabsContent value="clients" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Endpoints Disponíveis</Label>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/clients</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Listar todos os clientes</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/clients`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/clients/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Buscar cliente específico</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/clients/{id}`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-2 text-white px-2 py-1 rounded font-mono text-xs">POST</code>
                          <span className="font-mono text-muted-foreground">/api/clients</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Criar novo cliente</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X POST ${baseUrl}/api/clients \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "(11) 98765-4321"
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-3 text-white px-2 py-1 rounded font-mono text-xs">PUT</code>
                          <span className="font-mono text-muted-foreground">/api/clients/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Atualizar cliente existente</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X PUT ${baseUrl}/api/clients/{id} \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva",
    "email": "joao.silva@example.com",
    "phone": "(11) 98765-4321"
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-destructive text-white px-2 py-1 rounded font-mono text-xs">DELETE</code>
                          <span className="font-mono text-muted-foreground">/api/clients/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Excluir cliente</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X DELETE ${baseUrl}/api/clients/{id}`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/clients/{"{id}"}/appointments</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Listar todos os agendamentos de um cliente específico</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/clients/{id}/appointments`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/clients/{"{id}"}/stats</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Obter estatísticas de um cliente (total de agendamentos, concluídos, cancelados, último agendamento)</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/clients/{id}/stats`}
                        </pre>
                        <p className="text-muted-foreground text-xs ml-14 mt-2">Resposta exemplo:</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "totalAppointments": 15,
  "completedAppointments": 12,
  "cancelledAppointments": 1,
  "lastAppointment": {
    "id": "...",
    "date": "2025-10-28",
    "time": "14:00",
    "status": "completed"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Endpoints Disponíveis</Label>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/services</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Listar todos os serviços</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/services`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/services/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Buscar serviço específico</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/services/{id}`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-2 text-white px-2 py-1 rounded font-mono text-xs">POST</code>
                          <span className="font-mono text-muted-foreground">/api/services</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Criar novo serviço</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X POST ${baseUrl}/api/services \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Corte de Cabelo",
    "category": "Cabelo",
    "value": 50.00
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-3 text-white px-2 py-1 rounded font-mono text-xs">PUT</code>
                          <span className="font-mono text-muted-foreground">/api/services/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Atualizar serviço existente</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X PUT ${baseUrl}/api/services/{id} \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Corte e Barba",
    "category": "Cabelo",
    "value": 75.00
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-destructive text-white px-2 py-1 rounded font-mono text-xs">DELETE</code>
                          <span className="font-mono text-muted-foreground">/api/services/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Excluir serviço</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X DELETE ${baseUrl}/api/services/{id}`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/services/{"{id}"}/appointments</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Listar todos os agendamentos de um serviço específico</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/services/{id}/appointments`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="professionals" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Endpoints Disponíveis</Label>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/professionals</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Listar todos os profissionais</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/professionals \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-2 text-white px-2 py-1 rounded font-mono text-xs">POST</code>
                          <span className="font-mono text-muted-foreground">/api/professionals</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Criar um novo profissional</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X POST ${baseUrl}/api/professionals \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Dr. João Silva",
    "serviceIds": ["service-id-1", "service-id-2"],
    "schedules": [
      {"dayOfWeek": 1, "startTime": "08:00", "endTime": "12:00"},
      {"dayOfWeek": 1, "startTime": "14:00", "endTime": "18:00"}
    ],
    "active": true
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-3 text-white px-2 py-1 rounded font-mono text-xs">PUT</code>
                          <span className="font-mono text-muted-foreground">/api/professionals/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Atualizar um profissional existente</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X PUT ${baseUrl}/api/professionals/{id} \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Dr. João Silva Updated",
    "serviceIds": ["service-id-1"],
    "schedules": [
      {"dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00"}
    ],
    "active": true
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-4 text-white px-2 py-1 rounded font-mono text-xs">DELETE</code>
                          <span className="font-mono text-muted-foreground">/api/professionals/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Deletar um profissional</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X DELETE ${baseUrl}/api/professionals/{id} \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/professionals/{"{id}"}/availability</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Verificar disponibilidade de um profissional</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/professionals/{id}/availability?date=2025-11-25&time=14:00&duration=60 \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Campos do Profissional</Label>
                    <div className="space-y-1 text-xs">
                      <div className="flex gap-2">
                        <code className="bg-muted px-2 py-1 rounded">name</code>
                        <span className="text-muted-foreground">Nome do profissional (obrigatório)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="bg-muted px-2 py-1 rounded">serviceIds</code>
                        <span className="text-muted-foreground">Array de IDs de serviços (obrigatório, mínimo 1)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="bg-muted px-2 py-1 rounded">schedules</code>
                        <span className="text-muted-foreground">Array de horários (obrigatório, mínimo 1)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="bg-muted px-2 py-1 rounded">active</code>
                        <span className="text-muted-foreground">Status ativo/inativo (padrão: true)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Estrutura de Horários</Label>
                    <div className="space-y-1 text-xs">
                      <div className="flex gap-2">
                        <code className="bg-muted px-2 py-1 rounded">dayOfWeek</code>
                        <span className="text-muted-foreground">Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="bg-muted px-2 py-1 rounded">startTime</code>
                        <span className="text-muted-foreground">Horário de início (formato: HH:MM)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="bg-muted px-2 py-1 rounded">endTime</code>
                        <span className="text-muted-foreground">Horário de término (formato: HH:MM)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="appointments" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Endpoints Disponíveis</Label>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/appointments</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Listar todos os agendamentos (com filtros opcionais)</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`# Listar todos
curl -X GET ${baseUrl}/api/appointments

# Filtrar por cliente
curl -X GET "${baseUrl}/api/appointments?clientId={clientId}"

# Filtrar por serviço
curl -X GET "${baseUrl}/api/appointments?serviceId={serviceId}"

# Filtrar por cliente e serviço
curl -X GET "${baseUrl}/api/appointments?clientId={clientId}&serviceId={serviceId}"

# Filtrar por intervalo de datas
curl -X GET "${baseUrl}/api/appointments?startDate=2025-01-01&endDate=2025-01-31"

# Verificar disponibilidade em data/horário
curl -X GET "${baseUrl}/api/appointments?date=2025-01-15&time=14:00"`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-1 text-white px-2 py-1 rounded font-mono text-xs">GET</code>
                          <span className="font-mono text-muted-foreground">/api/appointments/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Buscar agendamento específico</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET ${baseUrl}/api/appointments/{id}`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-2 text-white px-2 py-1 rounded font-mono text-xs">POST</code>
                          <span className="font-mono text-muted-foreground">/api/appointments</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Criar novo agendamento</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X POST ${baseUrl}/api/appointments \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "uuid-do-cliente",
    "serviceId": "uuid-do-servico",
    "date": "2025-01-15",
    "time": "14:00",
    "duration": 60,
    "status": "scheduled",
    "notes": "Observações opcionais"
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-chart-3 text-white px-2 py-1 rounded font-mono text-xs">PUT</code>
                          <span className="font-mono text-muted-foreground">/api/appointments/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Atualizar agendamento existente</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X PUT ${baseUrl}/api/appointments/{id} \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "uuid-do-cliente",
    "serviceId": "uuid-do-servico",
    "date": "2025-01-15",
    "time": "15:00",
    "duration": 90,
    "status": "completed",
    "notes": "Atualizado"
  }'`}
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-destructive text-white px-2 py-1 rounded font-mono text-xs">DELETE</code>
                          <span className="font-mono text-muted-foreground">/api/appointments/{"{id}"}</span>
                        </div>
                        <p className="text-muted-foreground text-xs ml-14">Excluir agendamento</p>
                        <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X DELETE ${baseUrl}/api/appointments/{id}`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Parâmetros de Consulta (Query Params)</Label>
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground">
                        <code className="bg-muted px-1 py-0.5 rounded">?clientId={"{uuid}"}</code> - Filtrar por cliente
                      </p>
                      <p className="text-muted-foreground">
                        <code className="bg-muted px-1 py-0.5 rounded">?serviceId={"{uuid}"}</code> - Filtrar por serviço
                      </p>
                      <p className="text-muted-foreground">
                        <code className="bg-muted px-1 py-0.5 rounded">?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD</code> - Intervalo de datas
                      </p>
                      <p className="text-muted-foreground">
                        <code className="bg-muted px-1 py-0.5 rounded">?date=YYYY-MM-DD</code> - Data específica
                      </p>
                      <p className="text-muted-foreground">
                        <code className="bg-muted px-1 py-0.5 rounded">?time=HH:MM</code> - Horário específico
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Status Disponíveis</Label>
                    <div className="flex gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-xs">scheduled</code>
                      <code className="bg-muted px-2 py-1 rounded text-xs">completed</code>
                      <code className="bg-muted px-2 py-1 rounded text-xs">cancelled</code>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
