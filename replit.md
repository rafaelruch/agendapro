# AgendaPro - Sistema SaaS de Gerenciamento de Agendas

## Visão Geral
AgendaPro é um sistema SaaS moderno para gerenciamento de agendas multi-cliente com integração completa via API REST para N8N e outras ferramentas de automação.

## Características Principais
- **Multi-cliente**: Gerencie agendas separadas para múltiplos clientes
- **API REST completa**: Endpoints para integração com N8N via HTTP Request
- **Interface moderna**: Design clean e responsivo com tema claro/escuro
- **CRUD completo**: Operações de criar, ler, atualizar e excluir para clientes e agendamentos
- **Persistência em PostgreSQL**: Dados seguros e confiáveis

## Estrutura do Projeto

### Backend
- **Database**: PostgreSQL (Neon) com Drizzle ORM
- **API**: Express.js com rotas REST
- **Validação**: Zod para validação de dados
- **Tabelas**:
  - `clients`: Armazena informações dos clientes
  - `appointments`: Armazena agendamentos com referência ao cliente

### Frontend
- **Framework**: React com TypeScript
- **Roteamento**: Wouter
- **Estilização**: Tailwind CSS + Shadcn UI
- **Estado**: TanStack Query para gerenciamento de dados
- **Tema**: Sistema de tema claro/escuro

### Páginas
1. **Dashboard**: Visão geral com estatísticas e agendamentos do dia
2. **Calendário**: Visualização em calendário mensal dos agendamentos
3. **Clientes**: Gerenciamento completo de clientes
4. **Configurações**: Documentação da API e configurações do sistema

## API REST para N8N

### Endpoints de Clientes

#### GET /api/clients
Lista todos os clientes
```json
Response: [
  {
    "id": "uuid",
    "name": "Nome do Cliente",
    "email": "cliente@email.com",
    "phone": "(00) 00000-0000"
  }
]
```

#### GET /api/clients/:id
Busca um cliente específico

#### POST /api/clients
Cria um novo cliente
```json
Request Body: {
  "name": "Nome do Cliente",
  "email": "cliente@email.com",
  "phone": "(00) 00000-0000"
}
```

#### PUT /api/clients/:id
Atualiza um cliente existente

#### DELETE /api/clients/:id
Exclui um cliente

### Endpoints de Agendamentos

#### GET /api/appointments
Lista todos os agendamentos
Query params opcionais:
- `clientId`: Filtrar por cliente
- `startDate` e `endDate`: Filtrar por intervalo de datas

#### GET /api/appointments/:id
Busca um agendamento específico

#### POST /api/appointments
Cria um novo agendamento
```json
Request Body: {
  "clientId": "uuid-do-cliente",
  "date": "2025-10-28",
  "time": "14:00",
  "duration": 60,
  "status": "scheduled",
  "notes": "Observações opcionais"
}
```

#### PUT /api/appointments/:id
Atualiza um agendamento existente

#### DELETE /api/appointments/:id
Exclui um agendamento

## Desenvolvimento

### Comandos Disponíveis
```bash
npm run dev          # Inicia o servidor de desenvolvimento
npm run db:push      # Atualiza o schema do banco de dados
```

### Estrutura de Arquivos
```
client/
  src/
    components/      # Componentes reutilizáveis
    pages/          # Páginas da aplicação
    lib/            # Utilitários e configurações
server/
  db.ts             # Configuração do banco de dados
  storage.ts        # Interface de armazenamento
  routes.ts         # Rotas da API
shared/
  schema.ts         # Schema compartilhado (Drizzle + Zod)
```

## Últimas Alterações (28/10/2025)
- Implementado schema completo do banco de dados
- Criadas todas as rotas API REST
- Conectado frontend ao backend com TanStack Query
- Adicionado suporte completo a CRUD para clientes e agendamentos
- Implementadas notificações toast para feedback do usuário
- Adicionada funcionalidade de edição para clientes e agendamentos
