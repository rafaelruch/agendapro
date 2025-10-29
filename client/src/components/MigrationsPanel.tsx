import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Database, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MigrationsPanel() {
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const runMigrationsMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/migrations/run', { databaseUrl: url });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setLogs(data.logs || []);
    },
    onError: (error: any) => {
      const errorLogs = error.logs || [];
      setLogs([
        ...errorLogs,
        `❌ Erro: ${error.message || 'Erro ao executar migrations'}`
      ]);
    }
  });

  const handleRunMigrations = () => {
    if (!databaseUrl.trim()) {
      setLogs(["❌ Por favor, insira a DATABASE_URL"]);
      return;
    }
    setLogs([]);
    runMigrationsMutation.mutate(databaseUrl);
  };

  const hasSuccess = logs.some(log => log.includes("✅ Migrations concluídas com sucesso"));
  const hasError = logs.some(log => log.includes("❌"));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Executar Migrations Manualmente
          </CardTitle>
          <CardDescription>
            Use este painel para criar/atualizar as tabelas do banco de dados quando necessário.
            Útil para corrigir problemas de migrations ou aplicar novas atualizações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="database-url">DATABASE_URL do PostgreSQL</Label>
            <Input
              id="database-url"
              type="text"
              placeholder="postgresql://user:password@host:5432/database"
              value={databaseUrl}
              onChange={(e) => setDatabaseUrl(e.target.value)}
              disabled={runMigrationsMutation.isPending}
              data-testid="input-database-url"
            />
            <p className="text-sm text-muted-foreground">
              Cole aqui a URL de conexão interna do seu banco de dados PostgreSQL.
              No Easypanel, você encontra isso em: <strong>Database → Connection Info → Internal URL</strong>
            </p>
          </div>

          <Button
            onClick={handleRunMigrations}
            disabled={runMigrationsMutation.isPending || !databaseUrl.trim()}
            className="w-full"
            data-testid="button-run-migrations"
          >
            {runMigrationsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando Migrations...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Executar Migrations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {hasSuccess && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {hasError && <AlertCircle className="h-5 w-5 text-destructive" />}
              Logs de Execução
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasSuccess && (
              <Alert className="mb-4 border-green-600 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Migrations executadas com sucesso! A tabela business_hours foi criada/atualizada.
                </AlertDescription>
              </Alert>
            )}
            {hasError && !hasSuccess && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Erro ao executar migrations. Verifique os logs abaixo.
                </AlertDescription>
              </Alert>
            )}
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-2 font-mono text-sm">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={
                      log.includes("✅") ? "text-green-600" :
                      log.includes("❌") ? "text-destructive" :
                      log.includes("📊") ? "text-blue-600" :
                      "text-muted-foreground"
                    }
                    data-testid={`log-line-${index}`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quando usar este painel?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Primeira instalação:</strong> Se a tabela business_hours não foi criada automaticamente</p>
          <p>• <strong>Após atualizações:</strong> Quando uma nova versão adiciona ou modifica tabelas</p>
          <p>• <strong>Problemas no deploy:</strong> Se o startup automático de migrations falhou</p>
          <p>• <strong>Migração de ambiente:</strong> Ao trocar de servidor ou banco de dados</p>
        </CardContent>
      </Card>
    </div>
  );
}
