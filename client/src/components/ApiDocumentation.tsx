import { useState, useRef, useEffect } from "react";
import { Copy, Check, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EndpointExample {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth: "Bearer Token" | "Session" | "None" | "Master Admin" | "Tenant Admin";
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
  responseExample?: string;
  curlExample: string;
  notes?: string;
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
      method: "GET",
      path: "/api/clients/phone/:phone",
      description: "Buscar cliente exatamente pelo número de telefone (ideal para N8N)",
      auth: "Bearer Token",
      parameters: [
        { name: "phone", type: "string", required: true, description: "Número de telefone (apenas números, mínimo 10 dígitos)" }
      ],
      responseExample: `{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "João Silva",
  "phone": "11999999999",
  "birthdate": "1990-05-15",
  "tenantId": "tenant-123"
}

// Se não encontrar:
{
  "error": "Cliente não encontrado com este telefone"
}`,
      curlExample: `curl -X GET "${baseUrl}/api/clients/phone/11999999999" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/clients/:id",
      description: "Obter um cliente específico por ID",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: `{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "João Silva",
  "phone": "11999999999",
  "birthdate": "1990-05-15",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X GET "${baseUrl}/api/clients/123e4567-e89b-12d3-a456-426614174000" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/clients/:id/appointments",
      description: "Listar todos os agendamentos de um cliente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: `[
  {
    "id": "apt-123",
    "date": "2025-12-10",
    "time": "14:00",
    "status": "scheduled",
    "serviceIds": ["svc-123"]
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/clients/client-123/appointments" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/clients/:id/stats",
      description: "Obter estatísticas do cliente (total de agendamentos, etc)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: `{
  "totalAppointments": 15,
  "completedAppointments": 12,
  "cancelledAppointments": 2,
  "upcomingAppointments": 1
}`,
      curlExample: `curl -X GET "${baseUrl}/api/clients/client-123/stats" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/clients/:id/addresses",
      description: "Listar endereços salvos de um cliente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      responseExample: `[
  {
    "id": "addr-123",
    "label": "Casa",
    "street": "Rua das Flores",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "isDefault": true
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/clients/client-123/addresses" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/clients",
      description: "Criar um novo cliente",
      auth: "Bearer Token",
      requestBody: `// CAMPOS OBRIGATÓRIOS:
{
  "name": "Maria Santos",       // OBRIGATÓRIO
  "phone": "11988888888",       // OBRIGATÓRIO - Deve ser único
  "birthdate": "1985-03-20"     // Opcional
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
      method: "POST",
      path: "/api/clients/:id/addresses",
      description: "Adicionar endereço a um cliente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do cliente" }
      ],
      requestBody: `{
  "label": "Trabalho",
  "street": "Av. Paulista",
  "number": "1000",
  "complement": "Sala 101",  // Opcional
  "neighborhood": "Bela Vista",
  "city": "São Paulo",
  "zipCode": "01310-100",  // Opcional
  "reference": "Próximo ao metrô"  // Opcional
}`,
      responseExample: `{
  "id": "addr-456",
  "label": "Trabalho",
  "street": "Av. Paulista",
  "number": "1000",
  "neighborhood": "Bela Vista",
  "isDefault": false
}`,
      curlExample: `curl -X POST "${baseUrl}/api/clients/client-123/addresses" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "label": "Trabalho",
    "street": "Av. Paulista",
    "number": "1000",
    "neighborhood": "Bela Vista",
    "city": "São Paulo"
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
  "name": "Maria Santos Oliveira",  // Opcional
  "phone": "11988888888",  // Opcional
  "birthdate": "1985-03-20"  // Opcional
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
    "name": "Maria Santos Oliveira"
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
      description: "Listar todos os serviços do tenant (inclui campos calculados de promoção)",
      auth: "Bearer Token",
      queryParams: [
        { name: "search", type: "string", required: false, description: "Buscar serviços por nome ou categoria" }
      ],
      responseExample: `[
  {
    "id": "svc-123",
    "name": "Corte de Cabelo",
    "category": "Beleza",
    "description": "Corte masculino ou feminino com lavagem",
    "value": "50.00",
    "duration": 30,
    "imageUrl": "/uploads/services/corte.jpg",
    "isFeatured": true,
    "isActive": true,
    "promotionalValue": "35.00",
    "promotionStartDate": "2025-12-01",
    "promotionEndDate": "2025-12-31",
    "isPromotionActive": true,
    "effectiveValue": 35.00,
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/services" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Com busca:
curl -X GET "${baseUrl}/api/services?search=cabelo" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/services/:id",
      description: "Obter um serviço específico por ID",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do serviço" }
      ],
      responseExample: `{
  "id": "svc-123",
  "name": "Corte de Cabelo",
  "category": "Beleza",
  "description": "Corte masculino ou feminino",
  "value": "50.00",
  "duration": 30,
  "isFeatured": true,
  "isActive": true,
  "isPromotionActive": false,
  "effectiveValue": 50.00
}`,
      curlExample: `curl -X GET "${baseUrl}/api/services/svc-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/services/:id/appointments",
      description: "Listar agendamentos de um serviço específico",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do serviço" }
      ],
      responseExample: `[
  {
    "id": "apt-123",
    "clientId": "client-456",
    "date": "2025-12-10",
    "time": "14:00",
    "status": "scheduled"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/services/svc-123/appointments" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/services",
      description: "Criar um novo serviço",
      auth: "Bearer Token",
      requestBody: `// CAMPOS OBRIGATÓRIOS:
{
  "name": "Manicure",           // OBRIGATÓRIO
  "category": "Beleza",         // OBRIGATÓRIO
  "value": "35.00",             // OBRIGATÓRIO - Valor em reais
  "duration": 45,               // OBRIGATÓRIO - Duração em minutos
  "description": "Descrição",   // Opcional
  "imageUrl": "/uploads/...",   // Opcional
  "isFeatured": false,          // Opcional, default: false
  "isActive": true,             // Opcional, default: true
  "promotionalValue": "25.00",  // Opcional - Valor promocional
  "promotionStartDate": "2025-12-01",  // Opcional
  "promotionEndDate": "2025-12-31"     // Opcional
}`,
      responseExample: `{
  "id": "svc-456",
  "name": "Manicure",
  "category": "Beleza",
  "value": "35.00",
  "duration": 45,
  "description": "Serviço completo de manicure",
  "isFeatured": false,
  "isActive": true,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/services" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Manicure",
    "category": "Beleza",
    "value": "35.00",
    "duration": 45,
    "description": "Serviço completo de manicure"
  }'`
    },
    {
      method: "PUT",
      path: "/api/services/:id",
      description: "Atualizar um serviço existente (todos os campos são opcionais)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do serviço" }
      ],
      requestBody: `{
  "name": "Manicure Premium",  // Opcional
  "value": "45.00",  // Opcional
  "description": "Serviço premium com esmalte importado",  // Opcional
  "isFeatured": true,  // Opcional
  "isActive": true,  // Opcional
  "promotionalValue": "35.00",  // Opcional
  "promotionStartDate": "2025-12-01",  // Opcional
  "promotionEndDate": "2025-12-31"  // Opcional
}`,
      responseExample: `{
  "id": "svc-456",
  "name": "Manicure Premium",
  "value": "45.00",
  "description": "Serviço premium com esmalte importado",
  "isFeatured": true,
  "isActive": true
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/services/svc-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "value": "45.00",
    "isFeatured": true
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
      curlExample: `curl -X DELETE "${baseUrl}/api/services/svc-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  profissionais: [
    {
      method: "GET",
      path: "/api/professionals",
      description: "Listar todos os profissionais do tenant com seus serviços e horários",
      auth: "Bearer Token",
      queryParams: [
        { name: "search", type: "string", required: false, description: "Buscar profissionais por nome" },
        { name: "serviceIds", type: "string", required: false, description: "Filtrar por serviços (IDs separados por vírgula)" }
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
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Filtrar por serviços:
curl -X GET "${baseUrl}/api/professionals?serviceIds=svc-123,svc-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/professionals/:id",
      description: "Obter um profissional específico com detalhes",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do profissional" }
      ],
      responseExample: `{
  "id": "prof-123",
  "name": "Ana Silva",
  "active": true,
  "serviceIds": ["svc-123", "svc-456"],
  "schedules": [...]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/professionals/prof-123" \\
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
      curlExample: `curl -X GET "${baseUrl}/api/professionals/prof-123/availability?date=2025-12-10&time=14:00&duration=60" \\
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
  "schedules": [...]
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
  "name": "João Santos Silva",  // Opcional
  "serviceIds": ["svc-123"],  // Opcional
  "schedules": [...],  // Opcional
  "active": true  // Opcional
}`,
      responseExample: `{
  "id": "prof-456",
  "name": "João Santos Silva",
  "active": true,
  "serviceIds": ["svc-123"],
  "schedules": [...]
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/professionals/prof-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Santos Silva",
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
    }
  ],
  agendamentos: [
    {
      method: "GET",
      path: "/api/appointments",
      description: "Listar agendamentos do tenant com filtros opcionais. NOTA: Master Admin deve informar tenantId obrigatoriamente.",
      auth: "Bearer Token",
      queryParams: [
        { name: "tenantId", type: "string", required: false, description: "OBRIGATÓRIO para Master Admin - ID do tenant a consultar" },
        { name: "id", type: "string", required: false, description: "Buscar agendamento específico por ID (ideal para N8N)" },
        { name: "date", type: "string", required: false, description: "Filtrar por data específica (YYYY-MM-DD)" },
        { name: "time", type: "string", required: false, description: "Verificar disponibilidade (usar com date)" },
        { name: "startDate", type: "string", required: false, description: "Data inicial para intervalo (YYYY-MM-DD)" },
        { name: "endDate", type: "string", required: false, description: "Data final para intervalo (YYYY-MM-DD)" },
        { name: "clientId", type: "string", required: false, description: "Filtrar por cliente específico" },
        { name: "serviceId", type: "string", required: false, description: "Filtrar por serviço específico" },
        { name: "status", type: "string", required: false, description: "Filtrar por status: scheduled, completed, cancelled" }
      ],
      responseExample: `// Exemplo: Agendamentos do dia 2025-12-10
[
  {
    "id": "apt-123",
    "clientId": "client-456",
    "professionalId": "prof-789",
    "date": "2025-12-10",
    "time": "09:00",
    "duration": 60,
    "status": "scheduled",
    "notes": "Primeiro horário",
    "serviceIds": ["svc-123"],
    "tenantId": "tenant-123"
  }
]

// Verificar disponibilidade (com date+time):
{
  "available": true
}`,
      curlExample: `# Buscar agendamento por ID (ideal para N8N):
curl -X GET "${baseUrl}/api/appointments?id=apt-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Filtrar por data específica:
curl -X GET "${baseUrl}/api/appointments?date=2025-12-10" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Verificar se horário está disponível:
curl -X GET "${baseUrl}/api/appointments?date=2025-12-10&time=14:00" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Filtrar por intervalo de datas:
curl -X GET "${baseUrl}/api/appointments?startDate=2025-12-01&endDate=2025-12-31" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Combinar múltiplos filtros:
curl -X GET "${baseUrl}/api/appointments?startDate=2025-12-01&endDate=2025-12-31&status=scheduled&clientId=client-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Master Admin - DEVE informar tenantId:
curl -X GET "${baseUrl}/api/appointments?tenantId=tenant-123&date=2025-12-10" \\
  -H "Cookie: connect.sid=SEU_COOKIE_DE_SESSAO"`
    },
    {
      method: "GET",
      path: "/api/appointments/:id",
      description: "Obter um agendamento específico por ID",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do agendamento" }
      ],
      responseExample: `{
  "id": "apt-123",
  "clientId": "client-456",
  "professionalId": "prof-789",
  "date": "2025-12-10",
  "time": "14:00",
  "duration": 60,
  "status": "scheduled",
  "notes": "Cliente preferencial",
  "serviceIds": ["svc-123", "svc-456"]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/appointments/apt-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/appointments",
      description: "Criar um novo agendamento (duration é calculado automaticamente pelos serviços)",
      auth: "Bearer Token",
      requestBody: `// CAMPOS OBRIGATÓRIOS:
{
  "clientId": "client-456",      // OBRIGATÓRIO - ID do cliente
  "serviceIds": ["svc-123"],     // OBRIGATÓRIO - Array de IDs de serviços
  "date": "2025-12-10",          // OBRIGATÓRIO - Data (YYYY-MM-DD)
  "time": "14:00",               // OBRIGATÓRIO - Horário (HH:MM)
  "professionalId": "prof-123",  // Opcional - ID do profissional
  "status": "scheduled",         // Opcional, default: "scheduled"
  "notes": "Observação"          // Opcional
}`,
      responseExample: `{
  "id": "apt-789",
  "clientId": "client-456",
  "professionalId": "prof-123",
  "date": "2025-12-10",
  "time": "14:00",
  "duration": 75,
  "status": "scheduled",
  "notes": "Cliente preferencial",
  "serviceIds": ["svc-123", "svc-456"]
}`,
      curlExample: `curl -X POST "${baseUrl}/api/appointments" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "client-456",
    "serviceIds": ["svc-123", "svc-456"],
    "date": "2025-12-10",
    "time": "14:00",
    "professionalId": "prof-123"
  }'`
    },
    {
      method: "PUT",
      path: "/api/appointments?id=:id",
      description: "Reagendar/Atualizar um agendamento existente (IDEAL PARA N8N - via query parameter)",
      auth: "Bearer Token",
      queryParams: [
        { name: "id", type: "string", required: true, description: "ID do agendamento a ser atualizado" }
      ],
      requestBody: `{
  "date": "2025-12-15",  // Opcional
  "time": "16:00",  // Opcional
  "status": "scheduled",  // Opcional: scheduled, completed, cancelled
  "clientId": "client-456",  // Opcional
  "serviceIds": ["svc-123"],  // Opcional
  "professionalId": "prof-123",  // Opcional
  "notes": "Reagendado via N8N"  // Opcional
}`,
      responseExample: `{
  "id": "apt-789",
  "clientId": "client-456",
  "professionalId": "prof-123",
  "date": "2025-12-15",
  "time": "16:00",
  "duration": 75,
  "status": "scheduled",
  "notes": "Reagendado via N8N"
}`,
      curlExample: `# Reagendar para nova data e horário:
curl -X PUT "${baseUrl}/api/appointments?id=apt-789" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "2025-12-15",
    "time": "16:00"
  }'

# Cancelar agendamento:
curl -X PUT "${baseUrl}/api/appointments?id=apt-789" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "cancelled"
  }'

# Marcar como concluído:
curl -X PUT "${baseUrl}/api/appointments?id=apt-789" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "completed"
  }'`
    },
    {
      method: "PUT",
      path: "/api/appointments/:id",
      description: "Reagendar/Atualizar um agendamento (via path parameter)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do agendamento" }
      ],
      requestBody: `{
  "date": "2025-12-15",
  "time": "16:00"
}`,
      responseExample: `{
  "id": "apt-789",
  "date": "2025-12-15",
  "time": "16:00",
  "status": "scheduled"
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/appointments/apt-789" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "2025-12-15",
    "time": "16:00"
  }'`
    },
    {
      method: "POST",
      path: "/api/appointments/:id/payment",
      description: "Registrar pagamento de um agendamento (cria transação financeira)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do agendamento" }
      ],
      requestBody: `{
  "paymentMethod": "pix",  // pix, credit, debit, cash, transfer
  "amount": 150.00,  // Opcional: usa valor dos serviços se não informado
  "discount": 10.00  // Opcional
}`,
      responseExample: `{
  "id": "apt-789",
  "status": "completed",
  "paymentMethod": "pix",
  "totalPaid": 140.00
}`,
      curlExample: `curl -X POST "${baseUrl}/api/appointments/apt-789/payment" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paymentMethod": "pix",
    "discount": 10.00
  }'`
    },
    {
      method: "DELETE",
      path: "/api/appointments/:id",
      description: "Excluir um agendamento",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do agendamento" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/appointments/apt-789" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  horarioComercial: [
    {
      method: "GET",
      path: "/api/business-hours",
      description: "Listar horários de funcionamento do estabelecimento",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "bh-123",
    "dayOfWeek": 1,
    "startTime": "08:00",
    "endTime": "18:00",
    "isOpen": true
  },
  {
    "id": "bh-124",
    "dayOfWeek": 2,
    "startTime": "08:00",
    "endTime": "18:00",
    "isOpen": true
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/business-hours" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/business-hours",
      description: "Criar horário de funcionamento",
      auth: "Bearer Token",
      requestBody: `{
  "dayOfWeek": 1,  // 0=Domingo, 1=Segunda, ..., 6=Sábado
  "startTime": "08:00",
  "endTime": "18:00",
  "isOpen": true
}`,
      responseExample: `{
  "id": "bh-125",
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "18:00",
  "isOpen": true
}`,
      curlExample: `curl -X POST "${baseUrl}/api/business-hours" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "dayOfWeek": 1,
    "startTime": "08:00",
    "endTime": "18:00",
    "isOpen": true
  }'`
    },
    {
      method: "PUT",
      path: "/api/business-hours/:id",
      description: "Atualizar horário de funcionamento",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do horário" }
      ],
      requestBody: `{
  "startTime": "09:00",  // Opcional
  "endTime": "19:00",  // Opcional
  "isOpen": true  // Opcional
}`,
      responseExample: `{
  "id": "bh-125",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "19:00",
  "isOpen": true
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/business-hours/bh-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "startTime": "09:00",
    "endTime": "19:00"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/business-hours/:id",
      description: "Deletar horário de funcionamento",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do horário" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/business-hours/bh-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  disponibilidade: [
    {
      method: "GET",
      path: "/api/availability",
      description: "Obter slots de horários disponíveis para agendamento",
      auth: "Bearer Token",
      queryParams: [
        { name: "date", type: "string", required: true, description: "Data para verificar (YYYY-MM-DD)" },
        { name: "professionalId", type: "string", required: false, description: "ID do profissional (opcional)" },
        { name: "serviceIds", type: "string", required: false, description: "IDs dos serviços separados por vírgula" }
      ],
      responseExample: `{
  "date": "2025-12-10",
  "slots": [
    { "time": "08:00", "available": true },
    { "time": "08:30", "available": true },
    { "time": "09:00", "available": false },
    { "time": "09:30", "available": true },
    { "time": "10:00", "available": true }
  ]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/availability?date=2025-12-10&serviceIds=svc-123,svc-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Com profissional específico:
curl -X GET "${baseUrl}/api/availability?date=2025-12-10&professionalId=prof-123&serviceIds=svc-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  produtos: [
    {
      method: "GET",
      path: "/api/inventory/products",
      description: "Listar todos os produtos do estoque do tenant",
      auth: "Bearer Token",
      queryParams: [
        { name: "search", type: "string", required: false, description: "Buscar produtos por nome" },
        { name: "categoryId", type: "string", required: false, description: "Filtrar por categoria" },
        { name: "active", type: "boolean", required: false, description: "Filtrar apenas produtos ativos (true/false)" }
      ],
      responseExample: `[
  {
    "id": "prod-123",
    "name": "Hambúrguer Artesanal",
    "description": "Pão brioche, 200g de carne, queijo cheddar",
    "price": "35.90",
    "salePrice": "29.90",
    "imageUrl": "/uploads/products/hamburguer.jpg",
    "categoryId": "cat-123",
    "manageStock": true,
    "quantity": 50,
    "isActive": true,
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/inventory/products" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Com filtros:
curl -X GET "${baseUrl}/api/inventory/products?categoryId=cat-123&active=true" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Com busca:
curl -X GET "${baseUrl}/api/inventory/products?search=hamburguer" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/inventory/products/:id",
      description: "Obter um produto específico",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do produto" }
      ],
      responseExample: `{
  "id": "prod-123",
  "name": "Hambúrguer Artesanal",
  "description": "Pão brioche, 200g de carne, queijo cheddar",
  "price": "35.90",
  "salePrice": "29.90",
  "categoryId": "cat-123",
  "manageStock": true,
  "quantity": 50,
  "isActive": true
}`,
      curlExample: `curl -X GET "${baseUrl}/api/inventory/products/prod-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/inventory/products",
      description: "Criar um novo produto",
      auth: "Bearer Token",
      requestBody: `{
  "name": "Hambúrguer Artesanal",
  "price": 35.90,
  "description": "Pão brioche, 200g de carne",  // Opcional
  "salePrice": 29.90,  // Opcional - preço promocional
  "imageUrl": "/uploads/products/hamburguer.jpg",  // Opcional
  "categoryId": "cat-123",  // Opcional
  "manageStock": true,  // Opcional, default: false
  "quantity": 50,  // Obrigatório se manageStock=true
  "isActive": true  // Opcional, default: true
}`,
      responseExample: `{
  "id": "prod-456",
  "name": "Hambúrguer Artesanal",
  "price": "35.90",
  "manageStock": true,
  "quantity": 50,
  "isActive": true
}`,
      curlExample: `curl -X POST "${baseUrl}/api/inventory/products" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Hambúrguer Artesanal",
    "price": 35.90,
    "description": "Pão brioche, 200g de carne",
    "manageStock": true,
    "quantity": 50
  }'`
    },
    {
      method: "PUT",
      path: "/api/inventory/products/:id",
      description: "Atualizar um produto existente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do produto" }
      ],
      requestBody: `{
  "name": "Hambúrguer Premium",  // Opcional
  "price": 39.90,  // Opcional
  "salePrice": 34.90,  // Opcional
  "quantity": 100,  // Opcional
  "isActive": true  // Opcional
}`,
      responseExample: `{
  "id": "prod-456",
  "name": "Hambúrguer Premium",
  "price": "39.90",
  "quantity": 100
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/inventory/products/prod-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "price": 39.90,
    "quantity": 100
  }'`
    },
    {
      method: "PATCH",
      path: "/api/inventory/products/:id/stock",
      description: "Ajustar estoque de um produto (adicionar ou remover quantidade)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do produto" }
      ],
      requestBody: `{
  "adjustment": 10  // Positivo para adicionar, negativo para remover
}`,
      responseExample: `{
  "id": "prod-456",
  "quantity": 60,
  "previousQuantity": 50
}`,
      curlExample: `# Adicionar 10 unidades:
curl -X PATCH "${baseUrl}/api/inventory/products/prod-456/stock" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"adjustment": 10}'

# Remover 5 unidades:
curl -X PATCH "${baseUrl}/api/inventory/products/prod-456/stock" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"adjustment": -5}'`
    },
    {
      method: "DELETE",
      path: "/api/inventory/products/:id",
      description: "Deletar um produto",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do produto" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/inventory/products/prod-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  categoriasProdutos: [
    {
      method: "GET",
      path: "/api/inventory/categories",
      description: "Listar categorias de produtos",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "cat-123",
    "name": "Lanches",
    "displayOrder": 1,
    "isActive": true
  },
  {
    "id": "cat-124",
    "name": "Bebidas",
    "displayOrder": 2,
    "isActive": true
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/inventory/categories" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/inventory/categories",
      description: "Criar categoria de produto",
      auth: "Bearer Token",
      requestBody: `{
  "name": "Sobremesas",
  "displayOrder": 3,  // Opcional
  "isActive": true  // Opcional, default: true
}`,
      responseExample: `{
  "id": "cat-125",
  "name": "Sobremesas",
  "displayOrder": 3,
  "isActive": true
}`,
      curlExample: `curl -X POST "${baseUrl}/api/inventory/categories" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Sobremesas",
    "displayOrder": 3
  }'`
    },
    {
      method: "POST",
      path: "/api/inventory/categories/reorder",
      description: "Reordenar categorias de produtos",
      auth: "Bearer Token",
      requestBody: `{
  "categoryIds": ["cat-124", "cat-123", "cat-125"]
}`,
      responseExample: `{
  "success": true,
  "message": "Categorias reordenadas com sucesso"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/inventory/categories/reorder" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "categoryIds": ["cat-124", "cat-123", "cat-125"]
  }'`
    },
    {
      method: "PUT",
      path: "/api/inventory/categories/:id",
      description: "Atualizar categoria de produto",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID da categoria" }
      ],
      requestBody: `{
  "name": "Sobremesas Especiais",  // Opcional
  "isActive": true  // Opcional
}`,
      responseExample: `{
  "id": "cat-125",
  "name": "Sobremesas Especiais",
  "isActive": true
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/inventory/categories/cat-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Sobremesas Especiais"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/inventory/categories/:id",
      description: "Deletar categoria de produto",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID da categoria" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/inventory/categories/cat-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  pedidos: [
    {
      method: "GET",
      path: "/api/orders",
      description: "Listar todos os pedidos do tenant (com detalhes de cliente e itens)",
      auth: "Bearer Token",
      queryParams: [
        { name: "status", type: "string", required: false, description: "Filtrar por status: pending, preparing, ready, delivered, cancelled" },
        { name: "active", type: "boolean", required: false, description: "Listar apenas pedidos ativos (true)" }
      ],
      responseExample: `[
  {
    "id": "order-123",
    "orderNumber": 42,
    "status": "pending",
    "total": "85.80",
    "notes": "Sem cebola no hambúrguer",
    "createdAt": "2025-12-05T14:30:00Z",
    "client": {
      "id": "client-456",
      "name": "João Silva",
      "phone": "11999999999"
    },
    "items": [
      {
        "productId": "prod-123",
        "quantity": 2,
        "unitPrice": "35.90",
        "product": {
          "id": "prod-123",
          "name": "Hambúrguer Artesanal"
        }
      }
    ],
    "deliveryAddress": {
      "street": "Rua das Flores",
      "number": "123",
      "neighborhood": "Centro"
    }
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/orders" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Filtrar por status:
curl -X GET "${baseUrl}/api/orders?status=pending" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Apenas pedidos ativos:
curl -X GET "${baseUrl}/api/orders?active=true" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/orders/active",
      description: "Listar pedidos ativos para o painel da cozinha (pending, preparing, ready)",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "order-123",
    "orderNumber": 42,
    "status": "preparing",
    "total": "85.80",
    "createdAt": "2025-12-05T14:30:00Z",
    "client": { "name": "João Silva", "phone": "11999999999" },
    "items": [{ "quantity": 2, "product": { "name": "Hambúrguer" } }]
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/orders/active" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/orders/:id",
      description: "Obter um pedido específico com todos os detalhes",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do pedido" }
      ],
      responseExample: `{
  "id": "order-123",
  "orderNumber": 42,
  "status": "pending",
  "total": "85.80",
  "client": {...},
  "items": [...],
  "deliveryAddress": {...}
}`,
      curlExample: `curl -X GET "${baseUrl}/api/orders/order-123" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/orders",
      description: "Criar um novo pedido (cria cliente automaticamente se não existir pelo telefone)",
      auth: "Bearer Token",
      requestBody: `// CAMPOS OBRIGATÓRIOS:
{
  "client": {                              // OBRIGATÓRIO
    "phone": "11999999999",                // OBRIGATÓRIO
    "name": "João Silva"                   // OBRIGATÓRIO
  },
  "items": [                               // OBRIGATÓRIO - mínimo 1 item
    { "productId": "prod-123", "quantity": 2 }
  ],
  "paymentMethod": "pix",                  // Opcional: pix, credit, debit, cash, transfer
  "notes": "Sem cebola",                   // Opcional
  "deliveryAddress": {                     // Opcional
    "street": "Rua das Flores",
    "number": "123",
    "neighborhood": "Centro",
    "complement": "Apto 101",              // Opcional
    "reference": "Próximo ao mercado"      // Opcional
  },
  "clientAddressId": "addr-123",           // Opcional: usar endereço salvo
  "saveAddress": true,                     // Opcional: salvar endereço
  "addressLabel": "Casa"                   // Opcional: rótulo do endereço
}`,
      responseExample: `{
  "id": "order-789",
  "orderNumber": 43,
  "status": "pending",
  "total": "85.80",
  "notes": "Sem cebola no hambúrguer",
  "createdAt": "2025-12-05T15:00:00Z",
  "client": {
    "id": "client-new-or-existing",
    "name": "João Silva",
    "phone": "11999999999"
  },
  "items": [...]
}`,
      curlExample: `curl -X POST "${baseUrl}/api/orders" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client": {
      "phone": "11999999999",
      "name": "João Silva"
    },
    "items": [
      { "productId": "prod-123", "quantity": 2 }
    ],
    "paymentMethod": "pix",
    "notes": "Sem cebola"
  }'`
    },
    {
      method: "PATCH",
      path: "/api/orders/:id/status",
      description: "Atualizar status de um pedido (fluxo: pending → preparing → ready → delivered)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do pedido" }
      ],
      requestBody: `{
  "status": "preparing"  // pending, preparing, ready, delivered, cancelled
}`,
      responseExample: `{
  "id": "order-789",
  "status": "preparing",
  "updatedAt": "2025-12-05T15:05:00Z"
}`,
      curlExample: `# Iniciar preparo:
curl -X PATCH "${baseUrl}/api/orders/order-789/status" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "preparing"}'

# Marcar como pronto:
curl -X PATCH "${baseUrl}/api/orders/order-789/status" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "ready"}'

# Marcar como entregue:
curl -X PATCH "${baseUrl}/api/orders/order-789/status" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "delivered"}'`
    },
    {
      method: "POST",
      path: "/api/orders/:id/cancel",
      description: "Cancelar um pedido (restaura estoque automaticamente)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do pedido" }
      ],
      responseExample: `{
  "id": "order-789",
  "status": "cancelled",
  "message": "Pedido cancelado e estoque restaurado"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/orders/order-789/cancel" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  financeiro: [
    {
      method: "GET",
      path: "/api/finance/payment-methods",
      description: "Listar formas de pagamento disponíveis",
      auth: "Bearer Token",
      responseExample: `{
  "methods": ["pix", "credit", "debit", "cash", "transfer"],
  "labels": {
    "pix": "PIX",
    "credit": "Cartão de Crédito",
    "debit": "Cartão de Débito",
    "cash": "Dinheiro",
    "transfer": "Transferência"
  }
}`,
      curlExample: `curl -X GET "${baseUrl}/api/finance/payment-methods" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/finance/categories",
      description: "Listar categorias financeiras",
      auth: "Bearer Token",
      queryParams: [
        { name: "type", type: "string", required: false, description: "Filtrar por tipo: income ou expense" }
      ],
      responseExample: `[
  {
    "id": "cat-fin-1",
    "name": "Vendas",
    "type": "income",
    "isDefault": true
  },
  {
    "id": "cat-fin-2",
    "name": "Aluguel",
    "type": "expense",
    "isDefault": false
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/finance/categories" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Apenas receitas:
curl -X GET "${baseUrl}/api/finance/categories?type=income" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Apenas despesas:
curl -X GET "${baseUrl}/api/finance/categories?type=expense" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/finance/categories",
      description: "Criar categoria financeira",
      auth: "Bearer Token",
      requestBody: `// CAMPOS OBRIGATÓRIOS:
{
  "name": "Fornecedores",  // OBRIGATÓRIO
  "type": "expense"        // OBRIGATÓRIO: income ou expense
}`,
      responseExample: `{
  "id": "cat-fin-3",
  "name": "Fornecedores",
  "type": "expense",
  "isDefault": false
}`,
      curlExample: `curl -X POST "${baseUrl}/api/finance/categories" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Fornecedores",
    "type": "expense"
  }'`
    },
    {
      method: "GET",
      path: "/api/finance/transactions",
      description: "Listar transações financeiras com filtros (múltiplos filtros podem ser combinados)",
      auth: "Bearer Token",
      queryParams: [
        { name: "type", type: "string", required: false, description: "Filtrar por tipo: income ou expense" },
        { name: "startDate", type: "string", required: false, description: "Data inicial (YYYY-MM-DD)" },
        { name: "endDate", type: "string", required: false, description: "Data final (YYYY-MM-DD)" },
        { name: "paymentMethod", type: "string", required: false, description: "Forma de pagamento: pix, credit, debit, cash, transfer" },
        { name: "categoryId", type: "string", required: false, description: "ID da categoria" }
      ],
      responseExample: `[
  {
    "id": "tx-123",
    "type": "income",
    "amount": "150.00",
    "description": "Pedido #42",
    "date": "2025-12-05",
    "paymentMethod": "pix",
    "categoryId": "cat-fin-1",
    "source": "order",
    "referenceId": "order-123"
  },
  {
    "id": "tx-124",
    "type": "expense",
    "amount": "500.00",
    "description": "Aluguel dezembro",
    "date": "2025-12-01",
    "paymentMethod": "transfer",
    "categoryId": "cat-fin-2",
    "source": "manual"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/finance/transactions" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Filtrar por período:
curl -X GET "${baseUrl}/api/finance/transactions?startDate=2025-12-01&endDate=2025-12-31" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Apenas despesas do mês via PIX:
curl -X GET "${baseUrl}/api/finance/transactions?type=expense&startDate=2025-12-01&endDate=2025-12-31&paymentMethod=pix" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Por categoria:
curl -X GET "${baseUrl}/api/finance/transactions?categoryId=cat-fin-2" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/finance/expenses",
      description: "Criar uma despesa manual",
      auth: "Bearer Token",
      requestBody: `// CAMPOS OBRIGATÓRIOS:
{
  "description": "Conta de luz",      // OBRIGATÓRIO
  "amount": 250.00,                   // OBRIGATÓRIO
  "date": "2025-12-05",               // OBRIGATÓRIO (YYYY-MM-DD)
  "paymentMethod": "transfer",        // OBRIGATÓRIO: pix, credit, debit, cash, transfer
  "categoryId": "cat-fin-2",          // Opcional
  "notes": "Referente a novembro"     // Opcional
}`,
      responseExample: `{
  "id": "tx-125",
  "type": "expense",
  "amount": "250.00",
  "description": "Conta de luz",
  "date": "2025-12-05",
  "paymentMethod": "transfer",
  "source": "manual"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/finance/expenses" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "Conta de luz",
    "amount": 250.00,
    "date": "2025-12-05",
    "paymentMethod": "transfer"
  }'`
    },
    {
      method: "POST",
      path: "/api/finance/incomes",
      description: "Criar uma receita manual",
      auth: "Bearer Token",
      requestBody: `// CAMPOS OBRIGATÓRIOS:
{
  "description": "Venda avulsa",     // OBRIGATÓRIO
  "amount": 100.00,                  // OBRIGATÓRIO
  "date": "2025-12-05",              // OBRIGATÓRIO (YYYY-MM-DD)
  "paymentMethod": "cash",           // OBRIGATÓRIO: pix, credit, debit, cash, transfer
  "categoryId": "cat-fin-1",         // Opcional
  "notes": "Venda de produtos"       // Opcional
}`,
      responseExample: `{
  "id": "tx-126",
  "type": "income",
  "amount": "100.00",
  "description": "Venda avulsa",
  "date": "2025-12-05",
  "paymentMethod": "cash",
  "source": "manual"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/finance/incomes" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "Venda avulsa",
    "amount": 100.00,
    "date": "2025-12-05",
    "paymentMethod": "cash"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/finance/transactions/:id",
      description: "Excluir uma transação (apenas transações manuais podem ser excluídas)",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID da transação" }
      ],
      responseExample: `{
  "success": true
}`,
      curlExample: `curl -X DELETE "${baseUrl}/api/finance/transactions/tx-126" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/finance/summary",
      description: "Obter resumo financeiro do período",
      auth: "Bearer Token",
      queryParams: [
        { name: "startDate", type: "string", required: false, description: "Data inicial (YYYY-MM-DD) - default: primeiro dia do mês" },
        { name: "endDate", type: "string", required: false, description: "Data final (YYYY-MM-DD) - default: hoje" }
      ],
      responseExample: `{
  "totalIncome": 5000.00,
  "totalExpense": 2000.00,
  "balance": 3000.00,
  "incomeByCategory": [
    { "categoryId": "cat-fin-1", "categoryName": "Vendas", "total": 4500.00 },
    { "categoryId": "cat-fin-3", "categoryName": "Serviços", "total": 500.00 }
  ],
  "expenseByCategory": [
    { "categoryId": "cat-fin-2", "categoryName": "Aluguel", "total": 1500.00 },
    { "categoryId": "cat-fin-4", "categoryName": "Fornecedores", "total": 500.00 }
  ],
  "incomeByPaymentMethod": {
    "pix": 2000.00,
    "credit": 1500.00,
    "cash": 1500.00
  }
}`,
      curlExample: `curl -X GET "${baseUrl}/api/finance/summary" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Com período específico:
curl -X GET "${baseUrl}/api/finance/summary?startDate=2025-12-01&endDate=2025-12-31" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/finance/monthly-chart",
      description: "Dados para gráfico mensal de receitas e despesas",
      auth: "Bearer Token",
      queryParams: [
        { name: "year", type: "number", required: false, description: "Ano (default: ano atual)" }
      ],
      responseExample: `{
  "year": 2025,
  "months": [
    { "month": 1, "income": 5000.00, "expense": 2000.00 },
    { "month": 2, "income": 5500.00, "expense": 2200.00 },
    { "month": 3, "income": 6000.00, "expense": 2100.00 }
  ]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/finance/monthly-chart?year=2025" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "GET",
      path: "/api/finance/top-products",
      description: "Listar produtos mais vendidos",
      auth: "Bearer Token",
      queryParams: [
        { name: "limit", type: "number", required: false, description: "Quantidade de produtos (default: 10)" }
      ],
      responseExample: `[
  {
    "productId": "prod-123",
    "productName": "Hambúrguer Artesanal",
    "totalSold": 150,
    "totalRevenue": 5385.00
  },
  {
    "productId": "prod-456",
    "productName": "Batata Frita",
    "totalSold": 120,
    "totalRevenue": 1800.00
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/finance/top-products?limit=5" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  adicionais: [
    {
      method: "GET",
      path: "/api/product-addons",
      description: "Listar adicionais de produtos",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "addon-123",
    "name": "Bacon Extra",
    "price": "5.00",
    "isActive": true
  },
  {
    "id": "addon-124",
    "name": "Queijo Extra",
    "price": "3.00",
    "isActive": true
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/product-addons" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/product-addons",
      description: "Criar adicional de produto",
      auth: "Bearer Token",
      requestBody: `{
  "name": "Ovo Frito",
  "price": 2.50,
  "isActive": true  // Opcional, default: true
}`,
      responseExample: `{
  "id": "addon-125",
  "name": "Ovo Frito",
  "price": "2.50",
  "isActive": true
}`,
      curlExample: `curl -X POST "${baseUrl}/api/product-addons" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ovo Frito",
    "price": 2.50
  }'`
    },
    {
      method: "PUT",
      path: "/api/product-addons/:id",
      description: "Atualizar adicional de produto",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do adicional" }
      ],
      requestBody: `{
  "name": "Ovo Frito Artesanal",  // Opcional
  "price": 3.00,  // Opcional
  "isActive": true  // Opcional
}`,
      responseExample: `{
  "id": "addon-125",
  "name": "Ovo Frito Artesanal",
  "price": "3.00",
  "isActive": true
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/product-addons/addon-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "price": 3.00
  }'`
    },
    {
      method: "DELETE",
      path: "/api/product-addons/:id",
      description: "Deletar adicional de produto",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do adicional" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/product-addons/addon-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  bairros: [
    {
      method: "GET",
      path: "/api/delivery-neighborhoods",
      description: "Listar bairros de entrega configurados",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "neighborhood-123",
    "name": "Centro",
    "deliveryFee": "5.00",
    "isActive": true
  },
  {
    "id": "neighborhood-124",
    "name": "Jardim América",
    "deliveryFee": "8.00",
    "isActive": true
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/delivery-neighborhoods" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/delivery-neighborhoods",
      description: "Criar bairro de entrega",
      auth: "Bearer Token",
      requestBody: `{
  "name": "Vila Mariana",
  "deliveryFee": 7.00,
  "isActive": true  // Opcional, default: true
}`,
      responseExample: `{
  "id": "neighborhood-125",
  "name": "Vila Mariana",
  "deliveryFee": "7.00",
  "isActive": true
}`,
      curlExample: `curl -X POST "${baseUrl}/api/delivery-neighborhoods" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Vila Mariana",
    "deliveryFee": 7.00
  }'`
    },
    {
      method: "PUT",
      path: "/api/delivery-neighborhoods/:id",
      description: "Atualizar bairro de entrega",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do bairro" }
      ],
      requestBody: `{
  "name": "Vila Mariana Centro",  // Opcional
  "deliveryFee": 6.00,  // Opcional
  "isActive": true  // Opcional
}`,
      responseExample: `{
  "id": "neighborhood-125",
  "name": "Vila Mariana Centro",
  "deliveryFee": "6.00",
  "isActive": true
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/delivery-neighborhoods/neighborhood-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deliveryFee": 6.00
  }'`
    },
    {
      method: "DELETE",
      path: "/api/delivery-neighborhoods/:id",
      description: "Deletar bairro de entrega",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do bairro" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "${baseUrl}/api/delivery-neighborhoods/neighborhood-125" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
  menuPublico: [
    {
      method: "GET",
      path: "/api/menu/:slug",
      description: "Obter dados do menu público (sem autenticação)",
      auth: "None",
      parameters: [
        { name: "slug", type: "string", required: true, description: "Slug único do menu" }
      ],
      responseExample: `{
  "tenant": {
    "name": "Hamburgueria do João",
    "menuType": "delivery",
    "menuLogoUrl": "/uploads/logos/logo.jpg",
    "menuBrandColor": "#FF5722"
  },
  "products": [...],
  "categories": [...],
  "services": [...],
  "businessHours": [...]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/menu/hamburgueria-do-joao"`
    },
    {
      method: "GET",
      path: "/api/menu/:slug/availability",
      description: "Obter slots de horários disponíveis para agendamento público",
      auth: "None",
      parameters: [
        { name: "slug", type: "string", required: true, description: "Slug único do menu" }
      ],
      queryParams: [
        { name: "date", type: "string", required: true, description: "Data (YYYY-MM-DD)" },
        { name: "serviceIds", type: "string", required: true, description: "IDs dos serviços separados por vírgula" }
      ],
      responseExample: `{
  "date": "2025-12-10",
  "slots": [
    { "time": "08:00", "available": true },
    { "time": "08:30", "available": true },
    { "time": "09:00", "available": false }
  ]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/menu/salao-da-maria/availability?date=2025-12-10&serviceIds=svc-123,svc-456"`
    },
    {
      method: "GET",
      path: "/api/menu/:slug/client/:phone",
      description: "Buscar cliente por telefone no menu público",
      auth: "None",
      parameters: [
        { name: "slug", type: "string", required: true, description: "Slug único do menu" },
        { name: "phone", type: "string", required: true, description: "Telefone do cliente" }
      ],
      responseExample: `{
  "id": "client-123",
  "name": "Maria Silva",
  "phone": "11999999999"
}`,
      curlExample: `curl -X GET "${baseUrl}/api/menu/hamburgueria-do-joao/client/11999999999"`
    },
    {
      method: "GET",
      path: "/api/menu/:slug/client/:phone/orders",
      description: "Listar pedidos de um cliente no menu público",
      auth: "None",
      parameters: [
        { name: "slug", type: "string", required: true, description: "Slug único do menu" },
        { name: "phone", type: "string", required: true, description: "Telefone do cliente" }
      ],
      responseExample: `[
  {
    "id": "order-123",
    "orderNumber": 42,
    "status": "delivered",
    "total": "85.80",
    "createdAt": "2025-12-05T14:30:00Z"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/menu/hamburgueria-do-joao/client/11999999999/orders"`
    },
    {
      method: "GET",
      path: "/api/menu/:slug/client/:phone/appointments",
      description: "Listar agendamentos de um cliente no menu público",
      auth: "None",
      parameters: [
        { name: "slug", type: "string", required: true, description: "Slug único do menu" },
        { name: "phone", type: "string", required: true, description: "Telefone do cliente" }
      ],
      responseExample: `[
  {
    "id": "apt-123",
    "date": "2025-12-10",
    "time": "14:00",
    "status": "scheduled",
    "services": [...]
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/menu/salao-da-maria/client/11999999999/appointments"`
    },
    {
      method: "POST",
      path: "/api/menu/:slug/orders",
      description: "Criar pedido via menu público",
      auth: "None",
      parameters: [
        { name: "slug", type: "string", required: true, description: "Slug único do menu" }
      ],
      requestBody: `{
  "client": {
    "phone": "11999999999",
    "name": "João Silva"
  },
  "items": [
    { "productId": "prod-123", "quantity": 2 }
  ],
  "paymentMethod": "pix",
  "notes": "Sem cebola",
  "deliveryAddress": {
    "street": "Rua das Flores",
    "number": "123",
    "neighborhood": "Centro"
  }
}`,
      responseExample: `{
  "id": "order-789",
  "orderNumber": 43,
  "status": "pending",
  "total": "85.80"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/menu/hamburgueria-do-joao/orders" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client": {"phone": "11999999999", "name": "João"},
    "items": [{"productId": "prod-123", "quantity": 2}],
    "paymentMethod": "pix"
  }'`
    },
    {
      method: "POST",
      path: "/api/menu/:slug/appointments",
      description: "Criar agendamento via menu público",
      auth: "None",
      parameters: [
        { name: "slug", type: "string", required: true, description: "Slug único do menu" }
      ],
      requestBody: `{
  "client": {
    "phone": "11999999999",
    "name": "Maria Silva"
  },
  "serviceIds": ["svc-123", "svc-456"],
  "date": "2025-12-10",
  "time": "14:00",
  "notes": "Primeira vez"
}`,
      responseExample: `{
  "id": "apt-789",
  "date": "2025-12-10",
  "time": "14:00",
  "duration": 75,
  "status": "scheduled"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/menu/salao-da-maria/appointments" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client": {"phone": "11999999999", "name": "Maria"},
    "serviceIds": ["svc-123"],
    "date": "2025-12-10",
    "time": "14:00"
  }'`
    }
  ],
  tokens: [
    {
      method: "GET",
      path: "/api/settings/api-tokens",
      description: "Listar tokens de API do tenant",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "token-123",
    "label": "N8N Produção",
    "createdAt": "2025-11-19T10:00:00Z",
    "lastUsedAt": "2025-12-05T14:30:00Z"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/settings/api-tokens" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
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
  ],
  modulos: [
    {
      method: "GET",
      path: "/api/admin/tenants/:tenantId/modules",
      description: "Listar permissões de módulos de um tenant (Master Admin)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" }
      ],
      responseExample: `{
  "tenantId": "tenant-123",
  "tenantName": "Empresa ABC",
  "modules": [
    {
      "id": "calendar",
      "label": "Agenda",
      "description": "Calendário e agendamentos",
      "isCore": true,
      "enabled": true
    },
    {
      "id": "clients",
      "label": "Clientes",
      "description": "Gestão de clientes",
      "isCore": false,
      "enabled": true
    }
  ]
}`,
      curlExample: `curl -X GET "${baseUrl}/api/admin/tenants/tenant-123/modules" \\
  -H "Cookie: connect.sid=SEU_COOKIE_DE_SESSAO"`
    },
    {
      method: "PUT",
      path: "/api/admin/tenants/:tenantId/modules",
      description: "Atualizar permissões de módulos de um tenant (Master Admin)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" }
      ],
      requestBody: `{
  "enabledModules": ["clients", "services", "professionals", "business-hours", "finance"]
}`,
      responseExample: `{
  "success": true,
  "tenantId": "tenant-123",
  "enabledModules": ["calendar", "clients", "services", "professionals", "business-hours", "finance"],
  "message": "Permissões de módulos atualizadas com sucesso"
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/admin/tenants/tenant-123/modules" \\
  -H "Cookie: connect.sid=SEU_COOKIE_DE_SESSAO" \\
  -H "Content-Type: application/json" \\
  -d '{
    "enabledModules": ["clients", "services", "professionals", "business-hours", "finance"]
  }'`
    }
  ],

  webhooks: [
    {
      method: "GET",
      path: "/api/webhooks",
      description: "Listar todos os webhooks configurados do tenant. Webhooks permitem integração com N8N e outras ferramentas de automação, enviando notificações automáticas quando eventos ocorrem no sistema.",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "wh_abc123",
    "name": "N8N - Novos Clientes",
    "targetUrl": "https://n8n.seudominio.com/webhook/clientes",
    "secret": "***",
    "modules": ["clients", "appointments"],
    "events": ["create", "update"],
    "active": true,
    "retryCount": 3,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/webhooks" \\
  -H "Authorization: Bearer SEU_TOKEN_API"`
    },
    {
      method: "POST",
      path: "/api/webhooks",
      description: "Criar novo webhook. O webhook receberá uma requisição POST com o payload do evento sempre que uma operação correspondente ocorrer no sistema.",
      auth: "Bearer Token",
      requestBody: `{
  "name": "N8N - Novos Clientes",             // (OBRIGATÓRIO) Nome identificador
  "targetUrl": "https://n8n.exemplo.com/webhook/...", // (OBRIGATÓRIO) URL de destino
  "secret": "minha-chave-secreta",            // (opcional) Para assinatura HMAC-SHA256
  "modules": ["clients", "services"],         // (OBRIGATÓRIO) Módulos: clients, services, products, appointments, orders, professionals, finance
  "events": ["create", "update", "delete"],   // (OBRIGATÓRIO) Eventos: create, update, delete
  "active": true                              // (opcional) Status do webhook, default: true
}`,
      responseExample: `{
  "id": "wh_abc123",
  "name": "N8N - Novos Clientes",
  "targetUrl": "https://n8n.exemplo.com/webhook/...",
  "modules": ["clients", "services"],
  "events": ["create", "update", "delete"],
  "active": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}`,
      notes: `**Módulos Disponíveis:**
- clients - Clientes
- services - Serviços  
- products - Produtos
- appointments - Agendamentos
- orders - Pedidos
- professionals - Profissionais
- finance - Transações Financeiras

**Eventos Disponíveis:**
- create - Quando um item é criado
- update - Quando um item é atualizado
- delete - Quando um item é excluído

**Payload do Webhook (POST para sua URL):**
{ "event": "create", "module": "clients", "timestamp": "ISO8601", "tenantId": "...", "data": {...} }

**Headers Enviados:**
- Content-Type: application/json
- X-AgendaPro-Event: create
- X-AgendaPro-Module: clients
- X-AgendaPro-Signature: <HMAC-SHA256> (se secret configurado)`,
      curlExample: `curl -X POST "${baseUrl}/api/webhooks" \\
  -H "Authorization: Bearer SEU_TOKEN_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "N8N - Novos Clientes",
    "targetUrl": "https://n8n.exemplo.com/webhook/abc123",
    "secret": "minha-chave-secreta",
    "modules": ["clients", "appointments"],
    "events": ["create", "update"]
  }'`
    },
    {
      method: "PUT",
      path: "/api/webhooks/:id",
      description: "Atualizar webhook existente",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do webhook" }
      ],
      requestBody: `{
  "name": "N8N - Clientes Atualizados",
  "targetUrl": "https://n8n.exemplo.com/webhook/novo",
  "modules": ["clients"],
  "events": ["update"],
  "active": true
}`,
      responseExample: `{
  "id": "wh_abc123",
  "name": "N8N - Clientes Atualizados",
  "targetUrl": "https://n8n.exemplo.com/webhook/novo",
  "modules": ["clients"],
  "events": ["update"],
  "active": true,
  "updatedAt": "2024-01-16T11:00:00.000Z"
}`,
      curlExample: `curl -X PUT "${baseUrl}/api/webhooks/wh_abc123" \\
  -H "Authorization: Bearer SEU_TOKEN_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "N8N - Clientes Atualizados",
    "events": ["update"]
  }'`
    },
    {
      method: "DELETE",
      path: "/api/webhooks/:id",
      description: "Excluir webhook",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do webhook" }
      ],
      responseExample: `{ "success": true }`,
      curlExample: `curl -X DELETE "${baseUrl}/api/webhooks/wh_abc123" \\
  -H "Authorization: Bearer SEU_TOKEN_API"`
    },
    {
      method: "GET",
      path: "/api/webhooks/:id/deliveries",
      description: "Listar histórico de entregas do webhook. Útil para debug e monitoramento.",
      auth: "Bearer Token",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do webhook" }
      ],
      queryParams: [
        { name: "limit", type: "number", required: false, description: "Número de entregas a retornar (default: 50)" }
      ],
      responseExample: `[
  {
    "id": "del_xyz789",
    "webhookId": "wh_abc123",
    "module": "clients",
    "event": "create",
    "status": "success",
    "responseStatus": 200,
    "attemptCount": 1,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "del_xyz790",
    "webhookId": "wh_abc123",
    "module": "appointments",
    "event": "update",
    "status": "failed",
    "responseStatus": 500,
    "attemptCount": 3,
    "errorMessage": "Connection timeout",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
]`,
      curlExample: `curl -X GET "${baseUrl}/api/webhooks/wh_abc123/deliveries?limit=10" \\
  -H "Authorization: Bearer SEU_TOKEN_API"`
    },
    {
      method: "POST",
      path: "/api/webhooks/deliveries/:deliveryId/retry",
      description: "Reenviar uma entrega que falhou. O sistema tentará enviar o webhook novamente com o payload original.",
      auth: "Bearer Token",
      parameters: [
        { name: "deliveryId", type: "string", required: true, description: "ID da entrega a reenviar" }
      ],
      responseExample: `{
  "success": true,
  "message": "Webhook reenviado com sucesso"
}`,
      curlExample: `curl -X POST "${baseUrl}/api/webhooks/deliveries/del_xyz790/retry" \\
  -H "Authorization: Bearer SEU_TOKEN_API"`
    }
  ],

  webhooksAdmin: [
    {
      method: "GET",
      path: "/api/admin/tenants/:tenantId/webhooks",
      description: "Listar todos os webhooks de um tenant específico (apenas Master Admin). Permite gerenciar webhooks de qualquer tenant do sistema.",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" }
      ],
      responseExample: `[
  {
    "id": "wh_abc123",
    "name": "N8N - Novos Clientes",
    "targetUrl": "https://n8n.seudominio.com/webhook/clientes",
    "modules": ["clients", "appointments"],
    "events": ["create", "update"],
    "active": true,
    "tenantId": "tenant-1",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]`,
      curlExample: `# Este endpoint requer sessão de Master Admin (não suporta Bearer Token)
# Acesse via painel administrativo`
    },
    {
      method: "POST",
      path: "/api/admin/tenants/:tenantId/webhooks",
      description: "Criar webhook para um tenant específico (apenas Master Admin)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" }
      ],
      requestBody: `{
  "name": "N8N - Integração",           // (OBRIGATÓRIO)
  "targetUrl": "https://n8n.exemplo.com/webhook/...", // (OBRIGATÓRIO)
  "secret": "chave-secreta",            // (opcional)
  "modules": ["clients", "services"],   // (OBRIGATÓRIO)
  "events": ["create", "update"],       // (OBRIGATÓRIO)
  "active": true                        // (opcional)
}`,
      responseExample: `{
  "id": "wh_abc123",
  "name": "N8N - Integração",
  "targetUrl": "https://n8n.exemplo.com/webhook/...",
  "modules": ["clients", "services"],
  "events": ["create", "update"],
  "active": true,
  "tenantId": "tenant-1"
}`,
      curlExample: `# Este endpoint requer sessão de Master Admin`
    },
    {
      method: "PUT",
      path: "/api/admin/tenants/:tenantId/webhooks/:id",
      description: "Atualizar webhook de um tenant (apenas Master Admin)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" },
        { name: "id", type: "string", required: true, description: "ID do webhook" }
      ],
      requestBody: `{
  "name": "Nome atualizado",
  "active": false
}`,
      responseExample: `{
  "id": "wh_abc123",
  "name": "Nome atualizado",
  "active": false,
  "updatedAt": "2024-01-16T11:00:00.000Z"
}`,
      curlExample: `# Este endpoint requer sessão de Master Admin`
    },
    {
      method: "DELETE",
      path: "/api/admin/tenants/:tenantId/webhooks/:id",
      description: "Excluir webhook de um tenant (apenas Master Admin)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" },
        { name: "id", type: "string", required: true, description: "ID do webhook" }
      ],
      responseExample: `// HTTP 204 No Content`,
      curlExample: `# Este endpoint requer sessão de Master Admin`
    },
    {
      method: "GET",
      path: "/api/admin/tenants/:tenantId/webhooks/:id/deliveries",
      description: "Visualizar histórico de entregas de um webhook (apenas Master Admin)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" },
        { name: "id", type: "string", required: true, description: "ID do webhook" }
      ],
      responseExample: `[
  {
    "id": "del_xyz789",
    "webhookId": "wh_abc123",
    "module": "clients",
    "event": "create",
    "status": "success",
    "responseStatus": 200,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]`,
      curlExample: `# Este endpoint requer sessão de Master Admin`
    },
    {
      method: "POST",
      path: "/api/admin/tenants/:tenantId/webhooks/deliveries/:deliveryId/retry",
      description: "Reenviar entrega que falhou (apenas Master Admin)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" },
        { name: "deliveryId", type: "string", required: true, description: "ID da entrega" }
      ],
      responseExample: `{
  "message": "Retry agendado com sucesso"
}`,
      curlExample: `# Este endpoint requer sessão de Master Admin`
    }
  ]
});

const sections = [
  { id: "overview", label: "🚀 Início Rápido N8N" },
  { id: "n8nConfig", label: "⚙️ Configuração N8N" },
  { id: "n8nWorkflows", label: "📋 Workflows Prontos" },
  { id: "erros", label: "⚠️ Códigos de Erro" },
  { id: "authentication", label: "🔐 Autenticação" },
  { id: "clientes", label: "Clientes" },
  { id: "servicos", label: "Serviços" },
  { id: "profissionais", label: "Profissionais" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "horarioComercial", label: "Horário Comercial" },
  { id: "disponibilidade", label: "Disponibilidade" },
  { id: "categoriasProdutos", label: "Categorias de Produtos" },
  { id: "produtos", label: "Produtos (Estoque)" },
  { id: "adicionais", label: "Adicionais de Produtos" },
  { id: "pedidos", label: "Pedidos (Delivery)" },
  { id: "bairros", label: "Bairros de Entrega" },
  { id: "financeiro", label: "Financeiro" },
  { id: "menuPublico", label: "Menu Público" },
  { id: "tokens", label: "Tokens de API" },
  { id: "modulos", label: "Módulos (Master Admin)" },
  { id: "webhooks", label: "🔗 Webhooks" },
  { id: "webhooksAdmin", label: "🔗 Webhooks (Master Admin)" }
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
  const colors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    POST: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    PUT: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    DELETE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
    PATCH: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${colors[method] || colors.GET}`}>
      {method}
    </span>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointExample }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-6 overflow-hidden bg-white dark:bg-gray-900">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <MethodBadge method={endpoint.method} />
          <code className="text-sm font-mono text-gray-900 dark:text-gray-100">{endpoint.path}</code>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{endpoint.description}</p>
        
        <div className="mt-3">
          <Badge variant="outline" className="text-xs">
            🔐 {endpoint.auth}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        <div className="p-6 border-r border-gray-200 dark:border-gray-700">
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

          {endpoint.requestBody && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Request Body</h4>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                <code>{endpoint.requestBody}</code>
              </pre>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Exemplo cURL</h4>
            <div className="relative">
              <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{endpoint.curlExample}</code>
              </pre>
              <CopyButton text={endpoint.curlExample} />
            </div>
          </div>

          {endpoint.responseExample && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Response</h4>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                <code>{endpoint.responseExample}</code>
              </pre>
            </div>
          )}

          {endpoint.notes && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Notas</h4>
              <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {endpoint.notes}
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
  const [baseUrl, setBaseUrl] = useState("");
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const endpoints = getEndpoints(baseUrl);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex h-full">
      <nav className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto flex-shrink-0 sticky top-0 h-screen">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Documentação API</h2>
        <ul className="space-y-1">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                data-testid={`nav-${section.id}`}
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${activeSection === section.id ? 'rotate-90' : ''}`} />
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex-1 overflow-y-auto p-6">
        {/* SEÇÃO 1: INÍCIO RÁPIDO N8N */}
        <section ref={(el) => { sectionRefs.current['overview'] = el; }} className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🚀 API REST - Guia N8N</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Documentação otimizada para integração com <strong>N8N</strong>. Todos os exemplos estão prontos para copiar e colar no nó HTTP Request.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">🔗 URL Base da API</h3>
            <div className="relative">
              <code className="text-sm bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded block pr-20">{baseUrl || 'https://seu-dominio.com'}</code>
              <CopyButton text={baseUrl || 'https://seu-dominio.com'} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">1️⃣ Gere seu Token</h4>
              <p className="text-sm text-green-700 dark:text-green-400">
                Acesse Configurações → Tokens de API e crie um token para usar no N8N.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">2️⃣ Configure o N8N</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Crie uma credencial "Header Auth" com nome <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">Authorization</code>.
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">3️⃣ Faça Requisições</h4>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                Use o nó HTTP Request com os exemplos desta documentação.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">⚡ Dicas Importantes para N8N</h3>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-2">
              <li>• <strong>Campos OBRIGATÓRIO:</strong> Procure por este marcador nos exemplos - são campos que causam erro se não enviados</li>
              <li>• <strong>Expressões N8N:</strong> Use <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">{"{{ $json.id }}"}</code> para referenciar dados de nós anteriores</li>
              <li>• <strong>Datas:</strong> Sempre no formato <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">YYYY-MM-DD</code> (ex: 2025-12-05)</li>
              <li>• <strong>Horários:</strong> Sempre no formato <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">HH:MM</code> (ex: 14:30)</li>
              <li>• <strong>Valores monetários:</strong> Envie como número decimal (ex: 150.50, não "R$ 150,50")</li>
            </ul>
          </div>
        </section>

        {/* SEÇÃO 2: CONFIGURAÇÃO N8N */}
        <section ref={(el) => { sectionRefs.current['n8nConfig'] = el; }} className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">⚙️ Configuração do N8N</h2>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Passo 1: Criar Credencial de Autenticação</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-4">
              <li>No N8N, vá em <strong>Credentials</strong> → <strong>Add Credential</strong></li>
              <li>Selecione <strong>Header Auth</strong></li>
              <li>Configure assim:</li>
            </ol>
            <div className="relative">
              <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{`Name: AgendaPro API
Header Name: Authorization
Header Value: Bearer SEU_TOKEN_AQUI`}</code>
              </pre>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Passo 2: Configurar Nó HTTP Request</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Para cada requisição, configure o nó HTTP Request assim:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Para requisições GET:</h4>
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded">
                  <code>{`Method: GET
URL: ${baseUrl}/api/clients
Authentication: Header Auth
Credential: AgendaPro API`}</code>
                </pre>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Para requisições POST/PUT:</h4>
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded">
                  <code>{`Method: POST
URL: ${baseUrl}/api/clients
Authentication: Header Auth
Credential: AgendaPro API
Body Content Type: JSON
Body: (cole o JSON do exemplo)`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usando Expressões N8N nos Campos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Para usar dados dinâmicos de nós anteriores:</p>
            
            <div className="relative">
              <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{`// Exemplo: Criar agendamento usando dados de um formulário
{
  "clientId": "{{ $json.clientId }}",
  "serviceIds": ["{{ $json.serviceId }}"],
  "professionalId": "{{ $json.professionalId }}",
  "date": "{{ $json.date }}",
  "time": "{{ $json.time }}"
}

// Exemplo: Atualizar status usando ID do nó anterior
URL: ${baseUrl}/api/appointments/{{ $json.appointmentId }}/status

// Exemplo: Buscar cliente por telefone de um webhook
URL: ${baseUrl}/api/clients?search={{ $json.phone }}`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* SEÇÃO 3: WORKFLOWS PRONTOS */}
        <section ref={(el) => { sectionRefs.current['n8nWorkflows'] = el; }} className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">📋 Workflows Prontos para N8N</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Exemplos de workflows completos que você pode replicar no N8N:
          </p>

          <div className="space-y-6">
            {/* Workflow 1 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/30 p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-green-800 dark:text-green-300">📅 Workflow: Criar Cliente + Agendamento</h3>
                <p className="text-sm text-green-700 dark:text-green-400">Webhook recebe dados → Cria/busca cliente → Cria agendamento</p>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">1</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Webhook (Trigger)</h4>
                      <p className="text-xs text-gray-500 mb-2">Recebe dados do formulário/chatbot</p>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`// Dados recebidos:
{ "nome": "João", "telefone": "11999999999", "servico": "Corte", "data": "2025-12-10", "hora": "14:00" }`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">2</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">HTTP Request - Buscar Cliente</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`GET ${baseUrl}/api/clients?search={{ $json.telefone }}`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">3</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">IF - Cliente existe?</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`Condição: {{ $json.length > 0 }}`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">3a</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">HTTP Request - Criar Cliente (se não existe)</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`POST ${baseUrl}/api/clients
Body: { "name": "{{ $node.Webhook.json.nome }}", "phone": "{{ $node.Webhook.json.telefone }}" }`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">4</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">HTTP Request - Buscar Serviço por Nome</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`GET ${baseUrl}/api/services`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">5</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">HTTP Request - Criar Agendamento</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`POST ${baseUrl}/api/appointments
Body: {
  "clientId": "{{ $json.clientId }}",
  "serviceIds": ["{{ $json.serviceId }}"],
  "date": "{{ $node.Webhook.json.data }}",
  "time": "{{ $node.Webhook.json.hora }}"
}`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow 2 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-purple-800 dark:text-purple-300">🔔 Workflow: Lembrete de Agendamento</h3>
                <p className="text-sm text-purple-700 dark:text-purple-400">Cron diário → Busca agendamentos → Envia WhatsApp</p>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">1</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Cron (Trigger) - Executar todo dia 8h</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`0 8 * * *`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">2</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">HTTP Request - Buscar Agendamentos de Amanhã</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`GET ${baseUrl}/api/appointments?date={{ $today.plus(1, 'day').format('yyyy-MM-dd') }}&status=scheduled`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">3</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Split In Batches - Para cada agendamento</h4>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">4</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">WhatsApp/SMS - Enviar lembrete</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`Olá {{ $json.client.name }}! Lembrete do seu agendamento amanhã às {{ $json.time }}.`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow 3 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-orange-50 dark:bg-orange-900/30 p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-orange-800 dark:text-orange-300">🍕 Workflow: Pedido via WhatsApp</h3>
                <p className="text-sm text-orange-700 dark:text-orange-400">Webhook WhatsApp → Cria pedido → Notifica cozinha</p>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">1</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Webhook WhatsApp - Recebe pedido</h4>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">2</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">HTTP Request - Criar Pedido</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`POST ${baseUrl}/api/orders
Body: {
  "client": {
    "phone": "{{ $json.from }}",
    "name": "{{ $json.customerName }}"
  },
  "items": [
    { "productId": "{{ $json.productId }}", "quantity": {{ $json.qty }} }
  ],
  "notes": "{{ $json.notes }}",
  "paymentMethod": "pix"
}`}</pre>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">3</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Telegram/Slack - Notificar cozinha</h4>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">{`🆕 Pedido #{{ $json.orderNumber }} - {{ $json.client.name }}`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO 4: CÓDIGOS DE ERRO */}
        <section ref={(el) => { sectionRefs.current['erros'] = el; }} className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">⚠️ Códigos de Erro e Tratamento no N8N</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Como tratar erros da API no seu workflow N8N:
          </p>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Significado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Como resolver no N8N</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-green-500/10 text-green-700 border-green-500/30">200</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Sucesso</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Continue o workflow normalmente</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-green-500/10 text-green-700 border-green-500/30">201</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Criado com sucesso</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">O recurso foi criado. Use o ID retornado.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-red-500/10 text-red-700 border-red-500/30">400</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Dados inválidos</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Verifique se enviou todos os campos OBRIGATÓRIOS</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-red-500/10 text-red-700 border-red-500/30">401</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Não autorizado</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Token inválido ou expirado. Gere um novo token.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-red-500/10 text-red-700 border-red-500/30">403</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Proibido</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Sem permissão. Verifique o role do usuário.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-red-500/10 text-red-700 border-red-500/30">404</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Não encontrado</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Verifique se o ID existe no sistema.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-red-500/10 text-red-700 border-red-500/30">409</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Conflito</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Horário já ocupado ou telefone duplicado.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><Badge className="bg-red-500/10 text-red-700 border-red-500/30">500</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Erro interno</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Problema no servidor. Tente novamente.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">💡 Dica: Tratamento de Erros no N8N</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
              Configure o nó HTTP Request para <strong>não parar em erros</strong>:
            </p>
            <pre className="text-xs bg-amber-100 dark:bg-amber-900/50 p-3 rounded">{`Settings → "Continue On Fail" → ON

Depois use um nó IF para verificar:
Condição: {{ $json.error }} não existe
  ✓ True: Continue o workflow
  ✗ False: Envie notificação de erro`}</pre>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">🔍 Mensagens de Erro Comuns</h4>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <code className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded text-red-700 dark:text-red-300 text-xs">"Conflito de horário"</code>
                <span className="text-blue-700 dark:text-blue-400">→ Agendamento já existe nesse horário</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded text-red-700 dark:text-red-300 text-xs">"Telefone já cadastrado"</code>
                <span className="text-blue-700 dark:text-blue-400">→ Cliente já existe. Use GET para buscar.</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded text-red-700 dark:text-red-300 text-xs">"Token inválido"</code>
                <span className="text-blue-700 dark:text-blue-400">→ Gere um novo token em Configurações.</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded text-red-700 dark:text-red-300 text-xs">"Fora do horário comercial"</code>
                <span className="text-blue-700 dark:text-blue-400">→ Horário solicitado está fora do expediente.</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded text-red-700 dark:text-red-300 text-xs">"Campo obrigatório"</code>
                <span className="text-blue-700 dark:text-blue-400">→ Faltou enviar um campo marcado como OBRIGATÓRIO.</span>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO 5: AUTENTICAÇÃO */}
        <section ref={(el) => { sectionRefs.current['authentication'] = el; }} className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">🔐 Autenticação</h2>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Header de Autenticação (copie para o N8N)</h4>
            <div className="relative">
              <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded-lg">
                <code>Authorization: Bearer seu_token_aqui</code>
              </pre>
              <CopyButton text="Authorization: Bearer seu_token_aqui" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">✅ Endpoints com Token</h4>
              <p className="text-sm text-green-700 dark:text-green-400">
                Todos os endpoints <code>/api/*</code> requerem Bearer Token (exceto menu público).
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">🌐 Endpoints Públicos (sem token)</h4>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                <code>/api/menu/:slug/*</code> - Menu público para clientes.
              </p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">⚠️ Master Admin</h4>
            <p className="text-sm text-red-700 dark:text-red-400">
              Se você é Master Admin e precisa acessar dados de um tenant específico, adicione <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded">?tenantId=xxx</code> na URL.
              <br />Exemplo: <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded">GET /api/appointments?tenantId=tenant-123</code>
            </p>
          </div>
        </section>

        {Object.entries(endpoints).map(([key, endpointList]) => (
          <section key={key} ref={(el) => { sectionRefs.current[key] = el; }} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {sections.find(s => s.id === key)?.label || key}
            </h2>
            {endpointList.map((endpoint, index) => (
              <EndpointCard key={`${key}-${index}`} endpoint={endpoint} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
