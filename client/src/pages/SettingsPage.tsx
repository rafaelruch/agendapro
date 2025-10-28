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
            <CardTitle>API de Integração</CardTitle>
            <CardDescription>
              Configure a integração com N8N para automação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-endpoint">Endpoint da API</Label>
              <Input
                id="api-endpoint"
                value="/api/appointments"
                readOnly
                data-testid="input-api-endpoint"
              />
              <p className="text-sm text-muted-foreground">
                Use este endpoint para integrar com N8N via HTTP Request
              </p>
            </div>
            <div className="space-y-2">
              <Label>Métodos Disponíveis</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">GET</code>
                  <span className="text-muted-foreground">/api/appointments - Listar agendamentos</span>
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
            <Button variant="outline" data-testid="button-copy-api-docs">
              Copiar Documentação
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
