import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const baseUrl = window.location.origin;

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
            <CardTitle>API de Integração</CardTitle>
            <CardDescription>
              Documentação completa dos endpoints REST para integração com N8N, Zapier e outras ferramentas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="clients" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="clients">Clientes</TabsTrigger>
                <TabsTrigger value="services">Serviços</TabsTrigger>
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
