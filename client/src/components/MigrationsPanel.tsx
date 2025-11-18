import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Database, Loader2, AlertCircle, CheckCircle2, Code } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MigrationsPanel() {
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  
  const [sqlDatabaseUrl, setSqlDatabaseUrl] = useState("");
  const [customSql, setCustomSql] = useState("");
  const [sqlLogs, setSqlLogs] = useState<string[]>([]);

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
        `[ERROR] ${error.message || 'Erro ao executar migrations'}`
      ]);
    }
  });

  const runCustomSqlMutation = useMutation({
    mutationFn: async ({ url, sql }: { url: string; sql: string }) => {
      const response = await apiRequest('POST', '/api/migrations/execute-sql', { databaseUrl: url, sql });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setSqlLogs(data.logs || []);
    },
    onError: (error: any) => {
      const errorLogs = error.logs || [];
      setSqlLogs([
        ...errorLogs,
        `[ERROR] ${error.message || 'Erro ao executar SQL'}`
      ]);
    }
  });

  const handleRunMigrations = () => {
    if (!databaseUrl.trim()) {
      setLogs(["[ERROR] Por favor, insira a DATABASE_URL"]);
      return;
    }
    setLogs([]);
    runMigrationsMutation.mutate(databaseUrl);
  };

  const handleRunCustomSql = () => {
    if (!sqlDatabaseUrl.trim()) {
      setSqlLogs(["[ERROR] Por favor, insira a DATABASE_URL"]);
      return;
    }
    if (!customSql.trim()) {
      setSqlLogs(["[ERROR] Por favor, insira o SQL a executar"]);
      return;
    }
    setSqlLogs([]);
    runCustomSqlMutation.mutate({ url: sqlDatabaseUrl, sql: customSql });
  };

  const hasSuccess = logs.some(log => log.includes("[SUCCESS] Migrations concluídas com sucesso"));
  const hasError = logs.some(log => log.includes("[ERROR]"));

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
                      log.includes("[SUCCESS]") ? "text-green-600" :
                      log.includes("[ERROR]") ? "text-destructive" :
                      log.includes("[RUNNING]") ? "text-blue-600" :
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
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Executar SQL Customizado
          </CardTitle>
          <CardDescription>
            Execute comandos SQL diretamente no banco de dados. Útil para adicionar colunas, corrigir dados ou executar migrations customizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Execute apenas SQL que você confia. Comandos destrutivos (DROP, DELETE) podem causar perda de dados permanente.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="sql-database-url">DATABASE_URL do PostgreSQL</Label>
            <Input
              id="sql-database-url"
              type="text"
              placeholder="postgresql://user:password@host:5432/database"
              value={sqlDatabaseUrl}
              onChange={(e) => setSqlDatabaseUrl(e.target.value)}
              disabled={runCustomSqlMutation.isPending}
              data-testid="input-sql-database-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-sql">SQL a Executar</Label>
            <Textarea
              id="custom-sql"
              placeholder="-- Cole aqui o SQL a ser executado&#10;ALTER TABLE services ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;"
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              disabled={runCustomSqlMutation.isPending}
              className="font-mono text-sm min-h-[200px]"
              data-testid="textarea-custom-sql"
            />
            <p className="text-sm text-muted-foreground">
              Suporte completo para SQL PostgreSQL, incluindo DO blocks, CREATE, ALTER, INSERT, etc.
            </p>
          </div>

          <Button
            onClick={handleRunCustomSql}
            disabled={runCustomSqlMutation.isPending || !sqlDatabaseUrl.trim() || !customSql.trim()}
            className="w-full"
            data-testid="button-run-custom-sql"
          >
            {runCustomSqlMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando SQL...
              </>
            ) : (
              <>
                <Code className="mr-2 h-4 w-4" />
                Executar SQL
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {sqlLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {sqlLogs.some(log => log.includes("[SUCCESS]")) && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {sqlLogs.some(log => log.includes("[ERROR]")) && <AlertCircle className="h-5 w-5 text-destructive" />}
              Resultado do SQL
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sqlLogs.some(log => log.includes("[SUCCESS]")) && (
              <Alert className="mb-4 border-green-600 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  SQL executado com sucesso!
                </AlertDescription>
              </Alert>
            )}
            {sqlLogs.some(log => log.includes("[ERROR]")) && !sqlLogs.some(log => log.includes("[SUCCESS]")) && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Erro ao executar SQL. Verifique o resultado abaixo.
                </AlertDescription>
              </Alert>
            )}
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-2 font-mono text-sm">
                {sqlLogs.map((log, index) => (
                  <div
                    key={index}
                    className={
                      log.includes("[SUCCESS]") ? "text-green-600" :
                      log.includes("[ERROR]") ? "text-destructive" :
                      log.includes("[RUNNING]") ? "text-blue-600" :
                      "text-muted-foreground"
                    }
                    data-testid={`sql-log-line-${index}`}
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
          <p>• <strong>SQL Customizado:</strong> Para adicionar colunas faltantes, corrigir dados ou executar migrations específicas</p>
        </CardContent>
      </Card>
    </div>
  );
}
