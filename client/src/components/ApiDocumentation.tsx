import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  setup: [
    {
      method: "GET",
      path: "/api/setup/status",
      description: "Verificar se o sistema já foi instalado",
      auth: "None",
      responseExample: `{
  "installed": true
}`,
      curlExample: `curl -X GET "https://seudominio.com/api/setup/status"`
    },
    {
      method: "POST",
      path: "/api/setup",
      description: "Instalar o sistema (criar primeiro Master Admin)",
      auth: "None",
      requestBody: `{
  "username": "admin",
  "name": "Administrador",
  "email": "admin@empresa.com",
  "password": "senha_segura_aqui"
}`,
      responseExample: `{
  "success": true,
  "message": "Sistema instalado com sucesso",
  "user": {
    "id": "user-001",
    "username": "admin",
    "name": "Administrador"
  }
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/setup" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "admin",
    "name": "Administrador",
    "email": "admin@empresa.com",
    "password": "senha_segura_aqui"
  }'`
    }
  ],
  masteradmin: [
    {
      method: "GET",
      path: "/api/admin/tenants",
      description: "Listar todos os tenants (Master Admin apenas)",
      auth: "Master Admin",
      responseExample: `[
  {
    "id": "tenant-123",
    "name": "Empresa XYZ",
    "email": "contato@empresaxyz.com",
    "phone": "(11) 99999-9999",
    "active": true
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/admin/tenants" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN"`
    },
    {
      method: "POST",
      path: "/api/admin/tenants",
      description: "Criar novo tenant (Master Admin apenas)",
      auth: "Master Admin",
      requestBody: `{
  "name": "Nova Empresa",
  "email": "contato@novaempresa.com",
  "phone": "(11) 98888-8888",
  "active": true
}`,
      responseExample: `{
  "id": "tenant-456",
  "name": "Nova Empresa",
  "email": "contato@novaempresa.com",
  "phone": "(11) 98888-8888",
  "active": true
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/admin/tenants" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN" \\
  -d '{
    "name": "Nova Empresa",
    "email": "contato@novaempresa.com",
    "phone": "(11) 98888-8888",
    "active": true
  }'`
    },
    {
      method: "PUT",
      path: "/api/admin/tenants/:id",
      description: "Atualizar um tenant (Master Admin apenas)",
      auth: "Master Admin",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do tenant" }
      ],
      requestBody: `{
  "name": "Empresa XYZ Atualizada",
  "active": false
}`,
      responseExample: `{
  "id": "tenant-123",
  "name": "Empresa XYZ Atualizada",
  "email": "contato@empresaxyz.com",
  "phone": "(11) 99999-9999",
  "active": false
}`,
      curlExample: `curl -X PUT "https://seudominio.com/api/admin/tenants/tenant-123" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN" \\
  -d '{
    "name": "Empresa XYZ Atualizada",
    "active": false
  }'`
    },
    {
      method: "DELETE",
      path: "/api/admin/tenants/:id",
      description: "Deletar um tenant (Master Admin apenas)",
      auth: "Master Admin",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do tenant" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "https://seudominio.com/api/admin/tenants/tenant-123" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN"`
    },
    {
      method: "POST",
      path: "/api/admin/tenants/:tenantId/users",
      description: "Criar usuário para um tenant (Master Admin apenas)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" }
      ],
      requestBody: `{
  "username": "joao",
  "name": "João Silva",
  "email": "joao@empresaxyz.com",
  "password": "senha123",
  "role": "admin",
  "active": true
}`,
      responseExample: `{
  "id": "user-789",
  "username": "joao",
  "name": "João Silva",
  "email": "joao@empresaxyz.com",
  "role": "admin",
  "active": true,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/admin/tenants/tenant-123/users" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN" \\
  -d '{
    "username": "joao",
    "name": "João Silva",
    "email": "joao@empresaxyz.com",
    "password": "senha123",
    "role": "admin",
    "active": true
  }'`
    },
    {
      method: "GET",
      path: "/api/admin/tenants/:tenantId/api-tokens",
      description: "Listar tokens de API de um tenant (Master Admin apenas)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" }
      ],
      responseExample: `[
  {
    "id": "token-123",
    "label": "N8N Produção",
    "createdAt": "2025-01-15T10:00:00Z",
    "lastUsedAt": "2025-01-20T14:30:00Z",
    "createdBy": "user-123",
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/admin/tenants/tenant-123/api-tokens" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN"`
    },
    {
      method: "POST",
      path: "/api/admin/tenants/:tenantId/api-tokens",
      description: "Criar token de API para um tenant (Master Admin apenas)",
      auth: "Master Admin",
      parameters: [
        { name: "tenantId", type: "string", required: true, description: "ID do tenant" }
      ],
      requestBody: `{
  "label": "N8N Desenvolvimento"
}`,
      responseExample: `{
  "id": "token-456",
  "label": "N8N Desenvolvimento",
  "token": "apt_1234567890abcdef...",
  "createdAt": "2025-01-21T09:00:00Z",
  "lastUsedAt": null,
  "createdBy": "master-admin-123",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/admin/tenants/tenant-123/api-tokens" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN" \\
  -d '{
    "label": "N8N Desenvolvimento"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/admin/api-tokens/:id",
      description: "Revogar token de API de qualquer tenant (Master Admin apenas)",
      auth: "Master Admin",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do token" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "https://seudominio.com/api/admin/api-tokens/token-456" \\
  -H "Cookie: connect.sid=SESSION_ID_MASTER_ADMIN"`
    }
  ],
  autenticacao: [
    {
      method: "POST",
      path: "/api/auth/login",
      description: "Fazer login no sistema",
      auth: "None",
      requestBody: `{
  "username": "seu_usuario",
  "password": "sua_senha"
}`,
      responseExample: `{
  "user": {
    "id": "user-123",
    "username": "joao",
    "name": "João Silva",
    "role": "admin",
    "tenantId": "tenant-123"
  },
  "tenant": {
    "id": "tenant-123",
    "name": "Empresa XYZ"
  }
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "seu_usuario",
    "password": "sua_senha"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/logout",
      description: "Fazer logout do sistema",
      auth: "Session",
      responseExample: `{
  "message": "Logout realizado com sucesso"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/auth/logout" \\
  -H "Cookie: connect.sid=SESSION_ID"`
    },
    {
      method: "GET",
      path: "/api/auth/me",
      description: "Obter dados do usuário autenticado",
      auth: "Session",
      responseExample: `{
  "user": {
    "id": "user-123",
    "username": "joao",
    "name": "João Silva",
    "role": "admin",
    "tenantId": "tenant-123"
  },
  "tenant": {
    "id": "tenant-123",
    "name": "Empresa XYZ"
  }
}`,
      curlExample: `curl -X GET "https://seudominio.com/api/auth/me" \\
  -H "Cookie: connect.sid=SESSION_ID"`
    }
  ],
  usuarios: [
    {
      method: "GET",
      path: "/api/users",
      description: "Listar todos os usuários do tenant (Admin apenas)",
      auth: "Tenant Admin",
      responseExample: `[
  {
    "id": "user-123",
    "username": "joao",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "role": "admin",
    "active": true,
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/users" \\
  -H "Cookie: connect.sid=SESSION_ID"`
    },
    {
      method: "GET",
      path: "/api/users/:id",
      description: "Buscar um usuário específico (Admin apenas)",
      auth: "Tenant Admin",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do usuário" }
      ],
      responseExample: `{
  "id": "user-123",
  "username": "joao",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "role": "admin",
  "active": true,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X GET "https://seudominio.com/api/users/user-123" \\
  -H "Cookie: connect.sid=SESSION_ID"`
    },
    {
      method: "POST",
      path: "/api/users",
      description: "Criar novo usuário no tenant (Admin apenas)",
      auth: "Tenant Admin",
      requestBody: `{
  "username": "maria",
  "name": "Maria Santos",
  "email": "maria@exemplo.com",
  "password": "senha_segura",
  "role": "user",
  "active": true
}`,
      responseExample: `{
  "id": "user-456",
  "username": "maria",
  "name": "Maria Santos",
  "email": "maria@exemplo.com",
  "role": "user",
  "active": true,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/users" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: connect.sid=SESSION_ID" \\
  -d '{
    "username": "maria",
    "name": "Maria Santos",
    "email": "maria@exemplo.com",
    "password": "senha_segura",
    "role": "user",
    "active": true
  }'`
    },
    {
      method: "PUT",
      path: "/api/users/:id",
      description: "Atualizar um usuário (Admin apenas)",
      auth: "Tenant Admin",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do usuário" }
      ],
      requestBody: `{
  "name": "Maria Santos Oliveira",
  "active": false
}`,
      responseExample: `{
  "id": "user-456",
  "username": "maria",
  "name": "Maria Santos Oliveira",
  "email": "maria@exemplo.com",
  "role": "user",
  "active": false,
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X PUT "https://seudominio.com/api/users/user-456" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: connect.sid=SESSION_ID" \\
  -d '{
    "name": "Maria Santos Oliveira",
    "active": false
  }'`
    },
    {
      method: "DELETE",
      path: "/api/users/:id",
      description: "Deletar um usuário (Admin apenas)",
      auth: "Tenant Admin",
      parameters: [
        { name: "id", type: "string", required: true, description: "ID do usuário" }
      ],
      responseExample: "204 No Content",
      curlExample: `curl -X DELETE "https://seudominio.com/api/users/user-456" \\
  -H "Cookie: connect.sid=SESSION_ID"`
    }
  ],
  tokens: [
    {
      method: "GET",
      path: "/api/settings/api-tokens",
      description: "Listar tokens de API do tenant atual",
      auth: "Bearer Token",
      responseExample: `[
  {
    "id": "token-123",
    "label": "N8N Produção",
    "createdAt": "2025-01-15T10:00:00Z",
    "lastUsedAt": "2025-01-20T14:30:00Z",
    "createdBy": "user-123",
    "tenantId": "tenant-123"
  }
]`,
      curlExample: `curl -X GET "https://seudominio.com/api/settings/api-tokens" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    },
    {
      method: "POST",
      path: "/api/settings/api-tokens",
      description: "Criar novo token de API",
      auth: "Bearer Token",
      requestBody: `{
  "label": "N8N Desenvolvimento"
}`,
      responseExample: `{
  "id": "token-456",
  "label": "N8N Desenvolvimento",
  "token": "apt_1234567890abcdef...",
  "createdAt": "2025-01-21T09:00:00Z",
  "lastUsedAt": null,
  "createdBy": "user-123",
  "tenantId": "tenant-123"
}`,
      curlExample: `curl -X POST "https://seudominio.com/api/settings/api-tokens" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "label": "N8N Desenvolvimento"
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
      curlExample: `curl -X DELETE "https://seudominio.com/api/settings/api-tokens/token-456" \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"`
    }
  ],
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

function EndpointCard({ endpoint, baseUrl }: { endpoint: EndpointExample; baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Substituir placeholder de URL pelo baseUrl real
  const curlExample = endpoint.curlExample.replace(/https:\/\/seudominio\.com/g, baseUrl);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(curlExample);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Exemplo cURL copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o exemplo",
        variant: "destructive",
      });
    }
  };
  
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
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Exemplo cURL:</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              data-testid="button-copy-curl"
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
            <code>{curlExample}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApiDocumentation() {
  const baseUrl = window.location.origin;
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" data-testid="text-api-doc-title">Documentação da API REST</h2>
        <p className="text-muted-foreground">
          Documentação completa de todos os endpoints disponíveis para integração com N8N e outras ferramentas.
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Base URL</h3>
            <code className="text-xs bg-background px-2 py-1 rounded block break-all">
              {baseUrl}
            </code>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-semibold mb-3">🔐 Autenticação via Bearer Token (Recomendado para N8N/Zapier)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Use Bearer Token para integrar com N8N, Zapier ou outras ferramentas de automação. 
              Ideal para endpoints de <strong>Clientes</strong>, <strong>Serviços</strong> e <strong>Agendamentos</strong>.
            </p>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">Passo 1: Gerar um Token de API</p>
              <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
                <li>Acesse o painel Admin (Master Admin ou Settings)</li>
                <li>Vá para a aba "Tokens de API"</li>
                <li>Clique em "Criar Token" e dê um nome (ex: "N8N Produção")</li>
                <li>Copie o token gerado (ex: <code className="bg-background px-1 rounded">apt_1234567890abcdef...</code>)</li>
                <li>⚠️ <strong>Guarde em local seguro</strong> - o token só é exibido uma vez!</li>
              </ol>
              
              <p className="font-medium mt-3">Passo 2: Usar o Token nas Requisições</p>
              <p className="text-muted-foreground">Adicione o header em todas as requisições:</p>
              <code className="text-xs bg-background px-2 py-1 rounded block mt-1">
                Authorization: Bearer apt_1234567890abcdef...
              </code>
              
              <p className="text-muted-foreground mt-2">Exemplo prático:</p>
              <pre className="bg-background p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET "${baseUrl}/api/clients" \\
  -H "Authorization: Bearer apt_1234567890abcdef..."`}
              </pre>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-semibold mb-3">🍪 Autenticação via Session Cookie (Admin Web)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Use cookies de sessão para acessar endpoints administrativos via navegador ou scripts que gerenciam cookies.
              Necessário para endpoints de <strong>Usuários</strong>, <strong>Tenants</strong> e operações <strong>Master Admin</strong>.
            </p>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">Passo 1: Fazer Login</p>
              <p className="text-muted-foreground">Faça uma requisição POST para /api/auth/login:</p>
              <pre className="bg-background p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X POST "${baseUrl}/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{
    "username": "seu_usuario",
    "password": "sua_senha"
  }'`}
              </pre>
              
              <p className="font-medium mt-3">Passo 2: Usar o Cookie nas Requisições</p>
              <p className="text-muted-foreground">O cookie <code className="bg-background px-1 rounded">connect.sid</code> será salvo automaticamente. Use-o nas próximas requisições:</p>
              <pre className="bg-background p-2 rounded text-xs mt-1 overflow-auto">
{`curl -X GET "${baseUrl}/api/users" \\
  -b cookies.txt`}
              </pre>
              
              <p className="text-muted-foreground mt-2 text-xs">
                💡 <strong>Dica:</strong> Em ferramentas como Postman ou Insomnia, o cookie é gerenciado automaticamente após o login.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <div className="flex flex-col gap-2">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-api-categories-1">
            <TabsTrigger value="setup" data-testid="tab-setup">Setup</TabsTrigger>
            <TabsTrigger value="masteradmin" data-testid="tab-masteradmin">Master Admin</TabsTrigger>
            <TabsTrigger value="autenticacao" data-testid="tab-autenticacao">Autenticação</TabsTrigger>
            <TabsTrigger value="usuarios" data-testid="tab-usuarios">Usuários</TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-api-categories-2">
            <TabsTrigger value="tokens" data-testid="tab-tokens">Tokens API</TabsTrigger>
            <TabsTrigger value="clientes" data-testid="tab-clientes">Clientes</TabsTrigger>
            <TabsTrigger value="servicos" data-testid="tab-servicos">Serviços</TabsTrigger>
            <TabsTrigger value="agendamentos" data-testid="tab-agendamentos">Agendamentos</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="h-[calc(100vh-350px)] mt-4">
          <TabsContent value="setup" className="space-y-4">
            {endpoints.setup.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>

          <TabsContent value="masteradmin" className="space-y-4">
            {endpoints.masteradmin.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>

          <TabsContent value="autenticacao" className="space-y-4">
            {endpoints.autenticacao.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            {endpoints.usuarios.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>

          <TabsContent value="tokens" className="space-y-4">
            {endpoints.tokens.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>

          <TabsContent value="clientes" className="space-y-4">
            {endpoints.clientes.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>

          <TabsContent value="servicos" className="space-y-4">
            {endpoints.servicos.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>

          <TabsContent value="agendamentos" className="space-y-4">
            {endpoints.agendamentos.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} baseUrl={baseUrl} />
            ))}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
