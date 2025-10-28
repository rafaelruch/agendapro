import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EndpointExample {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth: "Bearer Token" | "Session" | "None" | "Master Admin" | "Tenant Admin";
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
  responseExample?: string;
  curlExample: string;
}

const endpoints: { [key: string]: EndpointExample[] } = {
  clientes: [
    {
      method: "GET",
      path: "/api/clients",
      description: "Listar todos os clientes do tenant",
      auth: "Bearer Token",
      queryParams: [
        { name: "search", type: "string", required: false, description: "Buscar clientes por nome ou telefone" }
      ],
      responseExample: `[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "João Silva",
    "phone": "11999999999",
    "email": "joao@exemplo.com",
    "address": "Rua Exemplo, 123",
    "notes": "Cliente VIP",
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/clients" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/clients/:id",
      description: "Buscar um cliente específico",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: `{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "João Silva",
  "phone": "11999999999",
  "email": "joao@exemplo.com",
  "address": "Rua Exemplo, 123",
  "notes": "Cliente VIP",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X GET "https://seudominio.com/api/clients/123e4567-e89b-12d3-a456-426614174000" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/clients",
      description: "Criar um novo cliente",
      auth: "Bearer Token",
      requestBody: `{
  "name": "Maria Santos",
  "phone": "11988888888",
  "email": "maria@exemplo.com",
  "address": "Av. Principal, 456",
  "notes": "Novo cliente"
}`,
      responseExample: `{
  "id": "456e7890-e89b-12d3-a456-426614174111",
  "name": "Maria Santos",
  "phone": "11988888888",
  "email": "maria@exemplo.com",
  "address": "Av. Principal, 456",
  "notes": "Novo cliente",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/clients" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Maria Santos",
    "phone": "11988888888",
    "email": "maria@exemplo.com",
    "address": "Av. Principal, 456",
    "notes": "Novo cliente"
  }'`
    },
    {
      method: "PUT",
      path: "/api/clients/:id",
      description: "Atualizar um cliente existente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      requestBody: `{
  "name": "Maria Santos Oliveira",
  "phone": "11988888888"
}`,
      responseExample: `{
  "id": "456e7890-e89b-12d3-a456-426614174111",
  "name": "Maria Santos Oliveira",
  "phone": "11988888888",
  "email": "maria@exemplo.com",
  "address": "Av. Principal, 456",
  "notes": "Novo cliente",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X PUT "https://seudominio.com/api/clients/456e7890-e89b-12d3-a456-426614174111" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Maria Santos Oliveira",
    "phone": "11988888888"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/clients/:id",
      description: "Deletar um cliente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "https://seudominio.com/api/clients/456e7890-e89b-12d3-a456-426614174111" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/clients/:id/appointments",
      description: "Listar agendamentos de um cliente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: `[
  {
    "id": "apt-123",
    "clientId": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2025-01-15",
    "time": "14:00",
    "title": "Consulta",
    "completed": false
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/clients/123e4567-e89b-12d3-a456-426614174000/appointments" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/clients/:id/stats",
      description: "Obter estatísticas de um cliente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: `{
  "totalAppointments": 15,
  "completedAppointments": 12,
  "pendingAppointments": 3
}`,
      curlExample: `curl -X GET "https://seudominio.com/api/clients/123e4567-e89b-12d3-a456-426614174000/stats" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  servicos: [
    {
      method: "GET",
      path: "/api/services",
      description: "Listar todos os serviços do tenant",
      auth: "Bearer Token",
      queryParams: [
        { name: "search", type: "string", required: false, description: "Buscar serviços por nome ou categoria" }
      ],
      responseExample: `[
  {
    "id": "svc-123",
    "name": "Corte de Cabelo",
    "category": "Estética",
    "value": 50.00,
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/services" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/services/:id",
      description: "Buscar um serviço específico",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do serviço" }
      ],
      responseExample: `{
  "id": "svc-123",
  "name": "Corte de Cabelo",
  "category": "Estética",
  "value": 50.00,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X GET "https://seudominio.com/api/services/svc-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/services",
      description: "Criar um novo serviço",
      auth: "Bearer Token",
      requestBody: `{
  "name": "Manicure",
  "category": "Estética",
  "value": 35.00
}`,
      responseExample: `{
  "id": "svc-456",
  "name": "Manicure",
  "category": "Estética",
  "value": 35.00,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/services" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Manicure",
    "category": "Estética",
    "value": 35.00
  }'`
    },
    {
      method: "PUT",
      path: "/api/services/:id",
      description: "Atualizar um serviço existente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do serviço" }
      ],
      requestBody: `{
  "value": 40.00
}`,
      responseExample: `{
  "id": "svc-456",
  "name": "Manicure",
  "category": "Estética",
  "value": 40.00,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X PUT "https://seudominio.com/api/services/svc-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "value": 40.00
  }'`
    },
    {
      method: "DELETE",
      path: "/api/services/:id",
      description: "Deletar um serviço",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do serviço" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "https://seudominio.com/api/services/svc-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/services/:id/appointments",
      description: "Listar agendamentos de um serviço",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do serviço" }
      ],
      responseExample: `[
  {
    "id": "apt-789",
    "serviceId": "svc-123",
    "date": "2025-01-20",
    "time": "10:00",
    "title": "Corte agendado"
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/services/svc-123/appointments" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  agendamentos: [
    {
      method: "GET",
      path: "/api/appointments",
      description: "Listar todos os agendamentos",
      auth: "Bearer Token",
      queryParams: [
        { name: "clientId", type: "string", required: false, description: "Filtrar por cliente" },
        { name: "serviceId", type: "string", required: false, description: "Filtrar por serviço" },
        { name: "startDate", type: "string", required: false, description: "Data inicial (YYYY-MM-DD)" },
        { name: "endDate", type: "string", required: false, description: "Data final (YYYY-MM-DD)" },
        { name: "date", type: "string", required: false, description: "Verificar disponibilidade em data específica" },
        { name: "time", type: "string", required: false, description: "Verificar disponibilidade em horário específico" }
      ],
      responseExample: `[
  {
    "id": "apt-123",
    "clientId": "cli-456",
    "serviceId": "svc-789",
    "date": "2025-01-15",
    "time": "14:00",
    "title": "Consulta",
    "notes": "Cliente novo",
    "completed": false,
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/appointments?startDate=2025-01-01&endDate=2025-01-31" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/appointments/:id",
      description: "Buscar um agendamento específico",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do agendamento" }
      ],
      responseExample: `{
  "id": "apt-123",
  "clientId": "cli-456",
  "serviceId": "svc-789",
  "date": "2025-01-15",
  "time": "14:00",
  "title": "Consulta",
  "notes": "Cliente novo",
  "completed": false,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X GET "https://seudominio.com/api/appointments/apt-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/appointments",
      description: "Criar um novo agendamento",
      auth: "Bearer Token",
      requestBody: `{
  "clientId": "cli-456",
  "serviceId": "svc-789",
  "date": "2025-01-20",
  "time": "15:00",
  "title": "Nova consulta",
  "notes": "Primeira consulta",
  "completed": false
}`,
      responseExample: `{
  "id": "apt-999",
  "clientId": "cli-456",
  "serviceId": "svc-789",
  "date": "2025-01-20",
  "time": "15:00",
  "title": "Nova consulta",
  "notes": "Primeira consulta",
  "completed": false,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/appointments" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "cli-456",
    "serviceId": "svc-789",
    "date": "2025-01-20",
    "time": "15:00",
    "title": "Nova consulta",
    "notes": "Primeira consulta",
    "completed": false
  }'`
    },
    {
      method: "PUT",
      path: "/api/appointments/:id",
      description: "Atualizar um agendamento",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do agendamento" }
      ],
      requestBody: `{
  "completed": true
}`,
      responseExample: `{
  "id": "apt-999",
  "clientId": "cli-456",
  "serviceId": "svc-789",
  "date": "2025-01-20",
  "time": "15:00",
  "title": "Nova consulta",
  "notes": "Primeira consulta",
  "completed": true,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X PUT "https://seudominio.com/api/appointments/apt-999" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "completed": true
  }'`
    },
    {
      method: "DELETE",
      path: "/api/appointments/:id",
      description: "Deletar um agendamento",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do agendamento" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "https://seudominio.com/api/appointments/apt-999" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ]
};

function MethodBadge({ method }: { method: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    GET: "secondary",
    POST: "default",
    PUT: "outline",
    DELETE: "destructive"
  };
  
  return (
    <Badge variant={variants[method]} data-testid={`badge-method-${method.toLowerCase()}`}>
      {method}
    </Badge>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointExample }) {
  return (
    <Card className="mb-4" data-testid={`card-endpoint-${endpoint.method}-${endpoint.path.replace(/[/:]/g, '-')}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MethodBadge method={endpoint.method} />
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{endpoint.path}</code>
            </div>
            <CardDescription>{endpoint.description}</CardDescription>
          </div>
          <Badge variant="outline" data-testid={`badge-auth-${endpoint.auth.replace(/\s+/g, '-').toLowerCase()}`}>
            {endpoint.auth}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {endpoint.parameters && endpoint.parameters.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Parâmetros da URL:</h4>
            <div className="space-y-1">
              {endpoint.parameters.map((param) => (
                <div key={param.name} className="text-sm">
                  <code className="bg-muted px-2 py-0.5 rounded">{param.name}</code>
                  <span className="text-muted-foreground ml-2">({param.type})</span>
                  {param.required && <Badge variant="outline" className="ml-2">Required</Badge>}
                  <p className="text-muted-foreground ml-6 mt-1">{param.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {endpoint.queryParams && endpoint.queryParams.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Query Parameters:</h4>
            <div className="space-y-1">
              {endpoint.queryParams.map((param) => (
                <div key={param.name} className="text-sm">
                  <code className="bg-muted px-2 py-0.5 rounded">{param.name}</code>
                  <span className="text-muted-foreground ml-2">({param.type})</span>
                  {param.required && <Badge variant="outline" className="ml-2">Required</Badge>}
                  <p className="text-muted-foreground ml-6 mt-1">{param.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {endpoint.requestBody && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Request Body:</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              <code>{endpoint.requestBody}</code>
            </pre>
          </div>
        )}

        {endpoint.responseExample && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Response Example:</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
              <code>{endpoint.responseExample}</code>
            </pre>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">Exemplo cURL:</h4>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
            <code>{endpoint.curlExample}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApiDocumentation() {
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" data-testid="text-api-doc-title">Documentação da API REST</h2>
        <p className="text-muted-foreground">
          Documentação completa de todos os endpoints disponíveis para integração com N8N e outras ferramentas.
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Autenticação</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Todos os endpoints (exceto login) requerem autenticação via Bearer Token no header:
          </p>
          <code className="text-xs bg-background px-2 py-1 rounded block">
            Authorization: Bearer SEU_TOKEN_AQUI
          </code>
          <p className="text-sm text-muted-foreground mt-2">
            Para obter um token, acesse a aba "Tokens de API" e crie um novo token.
          </p>
        </div>
      </div>

      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-api-categories">
          <TabsTrigger value="clientes" data-testid="tab-clientes">Clientes</TabsTrigger>
          <TabsTrigger value="servicos" data-testid="tab-servicos">Serviços</TabsTrigger>
          <TabsTrigger value="agendamentos" data-testid="tab-agendamentos">Agendamentos</TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-300px)] mt-4">
          <TabsContent value="clientes" className="space-y-4">
            {endpoints.clientes.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </TabsContent>

          <TabsContent value="servicos" className="space-y-4">
            {endpoints.servicos.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </TabsContent>

          <TabsContent value="agendamentos" className="space-y-4">
            {endpoints.agendamentos.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
