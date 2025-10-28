import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
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
            <CardTitle>API de Integração - Clientes</CardTitle>
            <CardDescription>
              Endpoints para gerenciar clientes via N8N
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Métodos Disponíveis</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">GET</code>
                  <span className="text-muted-foreground">/api/clients - Listar todos os clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">GET</code>
                  <span className="text-muted-foreground">/api/clients/:id - Buscar cliente específico</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">POST</code>
                  <span className="text-muted-foreground">/api/clients - Criar novo cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">PUT</code>
                  <span className="text-muted-foreground">/api/clients/:id - Atualizar cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">DELETE</code>
                  <span className="text-muted-foreground">/api/clients/:id - Excluir cliente</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Exemplo de Corpo (POST/PUT)</Label>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{`{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "(11) 98765-4321"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API de Integração - Agendamentos</CardTitle>
            <CardDescription>
              Endpoints para gerenciar agendamentos via N8N
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Métodos Disponíveis</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">GET</code>
                  <span className="text-muted-foreground">/api/appointments - Listar agendamentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">GET</code>
                  <span className="text-muted-foreground">/api/appointments/:id - Buscar agendamento específico</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">POST</code>
                  <span className="text-muted-foreground">/api/appointments - Criar agendamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">PUT</code>
                  <span className="text-muted-foreground">/api/appointments/:id - Atualizar agendamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">DELETE</code>
                  <span className="text-muted-foreground">/api/appointments/:id - Excluir agendamento</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Filtros Disponíveis (Query Params)</Label>
              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground">
                  <code className="bg-muted px-1 py-0.5 rounded">?clientId=uuid</code> - Filtrar por cliente
                </p>
                <p className="text-muted-foreground">
                  <code className="bg-muted px-1 py-0.5 rounded">?startDate=2025-01-01&endDate=2025-01-31</code> - Intervalo de datas
                </p>
                <p className="text-muted-foreground">
                  <code className="bg-muted px-1 py-0.5 rounded">?date=2025-01-15</code> - Data específica (verificar disponibilidade)
                </p>
                <p className="text-muted-foreground">
                  <code className="bg-muted px-1 py-0.5 rounded">?time=14:00</code> - Horário específico (verificar disponibilidade)
                </p>
                <p className="text-muted-foreground">
                  <code className="bg-muted px-1 py-0.5 rounded">?date=2025-01-15&time=14:00</code> - Verificar se há agendamento nesse dia/horário
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Exemplo de Corpo (POST/PUT)</Label>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{`{
  "clientId": "uuid-do-cliente",
  "date": "2025-01-15",
  "time": "14:00",
  "duration": 60,
  "status": "scheduled",
  "notes": "Consulta inicial"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
