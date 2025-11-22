import { useState, useRef, useEffect } from "react";
import { Copy, Check, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

const getEndpoints = (baseUrl: string): { [key: string]: EndpointExample[] } => ({
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
    "birthdate": "1990-05-15",
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/clients?search=11999999999" \\
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
  "birthdate": "1985-03-20"
}`,
      responseExample: `{
  "id": "456e7890-e89b-12d3-a456-426614174111",
  "name": "Maria Santos",
  "phone": "11988888888",
  "birthdate": "1985-03-20",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/clients" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Maria Santos",
    "phone": "11988888888",
    "birthdate": "1985-03-20"
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
  "birthdate": "1985-03-20",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/clients/456e7890-e89b-12d3-a456-426614174111" \\
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
      curlExample: `curl -X DELETE "${baseUrl}/api/clients/456e7890-e89b-12d3-a456-426614174111" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  servicos: [
    {
      method: "GET",
      path: "/api/services",
      description: "Listar todos os serviços do tenant (inclui isPromotionActive e effectiveValue)",
      auth: "Bearer Token",
      queryParams: [
        { name: "search", type: "string", required: false, description: "Buscar serviços por nome ou categoria" }
      ],
      responseExample: `[
  {
    "id": "svc-123",
    "name": "Corte de Cabelo",
    "category": "Beleza",
    "value": "50.00",
    "duration": 30,
    "promotionalValue": "35.00",
    "promotionStartDate": "2025-11-15",
    "promotionEndDate": "2025-11-30",
    "isPromotionActive": true,
    "effectiveValue": 35.00,
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/services" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/services",
      description: "Criar um novo serviço",
      auth: "Bearer Token",
      requestBody: `{
  "name": "Manicure",
  "category": "Beleza",
  "value": "35.00",
  "duration": 45
}`,
      responseExample: `{
  "id": "svc-456",
  "name": "Manicure",
  "category": "Beleza",
  "value": "35.00",
  "duration": 45,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/services" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Manicure",
    "category": "Beleza",
    "value": "35.00",
    "duration": 45
  }'`
    }
  ],
  profissionais: [
    {
      method: "GET",
      path: "/api/professionals",
      description: "Listar todos os profissionais do tenant com seus serviços e horários",
      auth: "Bearer Token",
      queryParams: [
        { name: "search", type: "string", required: false, description: "Buscar profissionais por nome" }
      ],
      responseExample: `[
  {
    "id": "prof-123",
    "name": "Ana Silva",
    "active": true,
    "serviceIds": ["svc-123", "svc-456"],
    "schedules": [
      {
        "dayOfWeek": 1,
        "startTime": "08:00",
        "endTime": "12:00"
      },
      {
        "dayOfWeek": 1,
        "startTime": "14:00",
        "endTime": "18:00"
      }
    ],
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/professionals" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/professionals",
      description: "Criar um novo profissional com serviços e horários",
      auth: "Bearer Token",
      requestBody: `{
  "name": "João Santos",
  "serviceIds": ["svc-123", "svc-789"],
  "schedules": [
    {
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": 2,
      "startTime": "08:00",
      "endTime": "17:00"
    }
  ],
  "active": true
}`,
      responseExample: `{
  "id": "prof-456",
  "name": "João Santos",
  "active": true,
  "serviceIds": ["svc-123", "svc-789"],
  "schedules": [
    {
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": 2,
      "startTime": "08:00",
      "endTime": "17:00"
    }
  ],
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/professionals" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Santos",
    "serviceIds": ["svc-123", "svc-789"],
    "schedules": [
      {"dayOfWeek": 1, "startTime": "08:00", "endTime": "17:00"},
      {"dayOfWeek": 2, "startTime": "08:00", "endTime": "17:00"}
    ],
    "active": true
  }'`
    },
    {
      method: "PUT",
      path: "/api/professionals/:id",
      description: "Atualizar um profissional existente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do profissional" }
      ],
      requestBody: `{
  "name": "João Santos Silva",
  "serviceIds": ["svc-123"],
  "schedules": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "18:00"
    }
  ],
  "active": true
}`,
      responseExample: `{
  "id": "prof-456",
  "name": "João Santos Silva",
  "active": true,
  "serviceIds": ["svc-123"],
  "schedules": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "18:00"
    }
  ],
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/professionals/prof-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Santos Silva",
    "serviceIds": ["svc-123"],
    "schedules": [
      {"dayOfWeek": 1, "startTime": "09:00", "endTime": "18:00"}
    ],
    "active": true
  }'`
    },
    {
      method: "DELETE",
      path: "/api/professionals/:id",
      description: "Deletar um profissional",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do profissional" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/professionals/prof-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/professionals/:id/availability",
      description: "Verificar disponibilidade de um profissional em uma data/hora específica",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do profissional" }
      ],
      queryParams: [
        { name: "date", type: "string", required: true, description: "Data no formato YYYY-MM-DD" },
        { name: "time", type: "string", required: true, description: "Hora no formato HH:MM" },
        { name: "duration", type: "number", required: true, description: "Duração em minutos" }
      ],
      responseExample: `{
  "available": true,
  "conflicts": []
}

// Ou em caso de conflito:
{
  "available": false,
  "conflicts": [
    {
      "id": "apt-789",
      "date": "2025-11-25",
      "time": "14:00",
      "duration": 60
    }
  ]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/professionals/prof-123/availability?date=2025-11-25&time=14:00&duration=60" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  agendamentos: [
    {
      method: "GET",
      path: "/api/appointments",
      description: "Listar todos os agendamentos do tenant",
      auth: "Bearer Token",
      queryParams: [
        { name: "date", type: "string", required: false, description: "Filtrar por data (YYYY-MM-DD)" },
        { name: "status", type: "string", required: false, description: "Filtrar por status (scheduled, completed, cancelled)" }
      ],
      responseExample: `[
  {
    "id": "apt-123",
    "clientId": "client-456",
    "date": "2025-11-20",
    "time": "14:00",
    "duration": 60,
    "status": "scheduled",
    "notes": "Cliente preferencial",
    "services": ["svc-123", "svc-456"],
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/appointments?date=2025-11-20" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/appointments",
      description: "Criar um novo agendamento (duration calculado automaticamente)",
      auth: "Bearer Token",
      requestBody: `{
  "clientId": "client-456",
  "serviceIds": ["svc-123", "svc-456"],
  "date": "2025-11-20",
  "time": "14:00",
  "status": "scheduled",
  "notes": "Cliente preferencial"
}`,
      responseExample: `{
  "id": "apt-789",
  "clientId": "client-456",
  "date": "2025-11-20",
  "time": "14:00",
  "duration": 75,
  "status": "scheduled",
  "notes": "Cliente preferencial",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/appointments" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "client-456",
    "serviceIds": ["svc-123", "svc-456"],
    "date": "2025-11-20",
    "time": "14:00",
    "status": "scheduled"
  }'`
    }
  ],
  tokens: [
    {
      method: "POST",
      path: "/api/settings/api-tokens",
      description: "Criar um novo token de API",
      auth: "Bearer Token",
      requestBody: `{
  "label": "N8N Produção"
}`,
      responseExample: `{
  "id": "token-123",
  "label": "N8N Produção",
  "token": "apt_1234567890abcdef...",
  "createdAt": "2025-11-19T10:00:00Z"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/settings/api-tokens" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "label": "N8N Produção"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/settings/api-tokens/:id",
      description: "Revogar um token de API",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do token" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/settings/api-tokens/token-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ]
});

const sections = [
  { id: "overview", label: "Visão Geral" },
  { id: "authentication", label: "Autenticação" },
  { id: "clientes", label: "Clientes" },
  { id: "servicos", label: "Serviços" },
  { id: "profissionais", label: "Profissionais" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "tokens", label: "Tokens de API" }
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      className="absolute top-2 right-2 h-8 px-2 text-xs"
      data-testid="button-copy-code"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 mr-1" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 mr-1" />
          Copiar
        </>
      )}
    </Button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors = {
    GET: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    POST: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    PUT: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    DELETE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${colors[method as keyof typeof colors]}`}>
      {method}
    </span>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointExample }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-6 overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <MethodBadge method={endpoint.method} />
          <code className="text-sm font-mono text-gray-900 dark:text-gray-100">{endpoint.path}</code>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{endpoint.description}</p>
        
        {/* Auth Badge */}
        <div className="mt-3">
          <Badge variant="outline" className="text-xs">
            🔐 {endpoint.auth}
          </Badge>
        </div>
      </div>

      {/* Body: Two Columns */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Left Column: Parameters & Request Body */}
        <div className="p-6 border-r border-gray-200 dark:border-gray-700">
          {/* Parameters */}
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Path Parameters</h4>
              <div className="space-y-2">
                {endpoint.parameters.map((param) => (
                  <div key={param.name} className="text-sm">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {param.name}
                    </code>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">{param.type}</span>
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{param.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Params */}
          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Query Parameters</h4>
              <div className="space-y-2">
                {endpoint.queryParams.map((param) => (
                  <div key={param.name} className="text-sm">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {param.name}
                    </code>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">{param.type}</span>
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{param.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body */}
          {endpoint.requestBody && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Request Body</h4>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                <code>{endpoint.requestBody}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Right Column: Code Example */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          {/* cURL Example */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Exemplo cURL</h4>
            <div className="relative">
              <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{endpoint.curlExample}</code>
              </pre>
              <CopyButton text={endpoint.curlExample} />
            </div>
          </div>

          {/* Response Example */}
          {endpoint.responseExample && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Exemplo de Resposta</h4>
              <div className="relative">
                <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <code>{endpoint.responseExample}</code>
                </pre>
                <CopyButton text={endpoint.responseExample} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ApiDocumentation() {
  const [activeSection, setActiveSection] = useState("overview");
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const baseUrl = window.location.origin;
  const endpoints = getEndpoints(baseUrl);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Detect active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("[data-section]");
      let current = "overview";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          current = section.getAttribute("data-section") || "overview";
        }
      });

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 fixed h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Documentação da API</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">AgendaPro REST API</p>

          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                data-testid={`nav-${section.id}`}
              >
                <div className="flex items-center justify-between">
                  {section.label}
                  {activeSection === section.id && <ChevronRight className="h-4 w-4" />}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="max-w-6xl mx-auto p-6 lg:p-10" ref={contentRef}>
          {/* Overview */}
          <section id="overview" data-section="overview" className="mb-16">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              API REST AgendaPro
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Documentação completa para integração com N8N, Zapier e outras ferramentas de automação.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">🔗 Base URL</h3>
              <code className="text-sm bg-white dark:bg-gray-900 px-3 py-1.5 rounded border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                {baseUrl}
              </code>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" data-section="authentication" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Autenticação</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              A API AgendaPro utiliza tokens Bearer para autenticação. Você pode gerar tokens na página de Configurações.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-3">📝 Como Gerar um Token</h3>
              <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>Faça login como <strong>Admin do Tenant</strong></li>
                <li>Navegue até <strong>Configurações → Tokens de API</strong></li>
                <li>Clique em <strong>"Criar Token"</strong></li>
                <li>Dê um nome (ex: "N8N Produção") e copie o token gerado</li>
                <li className="text-red-600 dark:text-red-400 font-semibold">⚠️ O token só é exibido UMA VEZ! Salve em local seguro</li>
              </ol>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Exemplo de Requisição</h3>
              <div className="relative">
                <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code>{`curl -X GET "${baseUrl}/api/clients" \\\n  -H "Authorization: Bearer SEU_TOKEN_AQUI"`}</code>
                </pre>
                <CopyButton text={`curl -X GET "${baseUrl}/api/clients" \\\n  -H "Authorization: Bearer SEU_TOKEN_AQUI"`} />
              </div>
            </div>
          </section>

          {/* Clientes */}
          <section id="clientes" data-section="clientes" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Clientes</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Gerencie clientes do seu tenant. Campos: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">name</code>, <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">phone</code> (obrigatório), <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">birthdate</code> (opcional).
            </p>
            {endpoints.clientes.map((endpoint, idx) => (
              <EndpointCard key={idx} endpoint={endpoint} />
            ))}
          </section>

          {/* Serviços */}
          <section id="servicos" data-section="servicos" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Serviços</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Gerencie serviços oferecidos. A API retorna automaticamente <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">isPromotionActive</code> e <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">effectiveValue</code> para facilitar integrações.
            </p>
            {endpoints.servicos.map((endpoint, idx) => (
              <EndpointCard key={idx} endpoint={endpoint} />
            ))}
          </section>

          {/* Profissionais */}
          <section id="profissionais" data-section="profissionais" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profissionais</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Gerencie profissionais do seu tenant. Cada profissional pode realizar múltiplos serviços e ter horários de atendimento flexíveis por dia da semana.
            </p>
            {endpoints.profissionais.map((endpoint, idx) => (
              <EndpointCard key={idx} endpoint={endpoint} />
            ))}
          </section>

          {/* Agendamentos */}
          <section id="agendamentos" data-section="agendamentos" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agendamentos</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crie e gerencie agendamentos. O campo <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">duration</code> é calculado automaticamente com base nos serviços selecionados.
            </p>

            {/* Nota sobre Duration */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">✅ Campo `duration` - Cálculo Automático</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <p>
                  <strong>NÃO envie</strong> o campo <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">duration</code> ao criar ou atualizar agendamentos!
                </p>
                <p>
                  O backend calcula automaticamente a duração somando os <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">serviceIds</code> selecionados.
                </p>
                <p className="font-semibold text-green-800 dark:text-green-400">
                  ✅ <strong>Para N8N</strong>: Envie apenas <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">clientId</code>, <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">serviceIds</code>, <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">date</code>, <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">time</code>, <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">status</code> e <code className="text-xs bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">notes</code> (opcional).
                </p>
              </div>
            </div>

            {endpoints.agendamentos.map((endpoint, idx) => (
              <EndpointCard key={idx} endpoint={endpoint} />
            ))}
          </section>

          {/* Tokens de API */}
          <section id="tokens" data-section="tokens" className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tokens de API</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Gerencie tokens de autenticação para integração com ferramentas externas.
            </p>
            {endpoints.tokens.map((endpoint, idx) => (
              <EndpointCard key={idx} endpoint={endpoint} />
            ))}
          </section>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              © 2025 AgendaPro • Documentação da API REST
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
