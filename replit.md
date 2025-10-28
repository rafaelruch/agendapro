# AgendaPro - Sistema SaaS de Gerenciamento de Agendas

## Visão Geral
AgendaPro é um sistema SaaS moderno para gerenciamento de agendas multi-cliente com integração completa via API REST para N8N e outras ferramentas de automação.

## Características Principais
- **Multi-cliente**: Gerencie agendas separadas para múltiplos clientes
- **Gerenciamento de Serviços**: Catálogo completo de serviços com nome, categoria e valor
- **Vinculação Serviço-Agendamento**: Agendamentos podem ser vinculados a serviços específicos
- **Ações Rápidas**: Checkbox para marcar agendamentos como concluídos rapidamente
- **API REST completa**: Endpoints para integração com N8N via HTTP Request com exemplos curl
- **Interface moderna**: Design clean e responsivo com tema claro/escuro
- **CRUD completo**: Operações de criar, ler, atualizar e excluir para clientes, serviços e agendamentos
- **Persistência em PostgreSQL**: Dados seguros e confiáveis

## Estrutura do Projeto

### Backend
- **Database**: PostgreSQL (Neon) com Drizzle ORM
- **API**: Express.js com rotas REST
- **Validação**: Zod para validação de dados
- **Tabelas**:
  - `clients`: Armazena informações dos clientes
  - `services`: Armazena serviços com nome, categoria e valor
  - `appointments`: Armazena agendamentos com referência ao cliente e serviço (opcional)

### Frontend
- **Framework**: React com TypeScript
- **Roteamento**: Wouter
- **Estilização**: Tailwind CSS + Shadcn UI
- **Estado**: TanStack Query para gerenciamento de dados
- **Tema**: Sistema de tema claro/escuro

### Páginas
1. **Dashboard**: Visão geral com estatísticas e agendamentos do dia com checkbox de conclusão
2. **Calendário**: Visualização em calendário mensal dos agendamentos
3. **Clientes**: Gerenciamento completo de clientes
4. **Serviços**: Catálogo de serviços com nome, categoria e valor
5. **Configurações**: Documentação completa da API com exemplos curl e configurações do sistema

## API REST para N8N

A documentação completa com exemplos curl está disponível na página de Configurações do sistema. Abaixo um resumo dos endpoints:

### Endpoints de Clientes

#### GET /api/clients
Lista todos os clientes

#### GET /api/clients/{id}
Busca um cliente específico

#### POST /api/clients
Cria um novo cliente
```json
{
  "name": "Nome do Cliente",
  "email": "cliente@email.com",
  "phone": "(00) 00000-0000"
}
```

#### PUT /api/clients/{id}
Atualiza um cliente existente

#### DELETE /api/clients/{id}
Exclui um cliente

### Endpoints de Serviços

#### GET /api/services
Lista todos os serviços

#### GET /api/services/{id}
Busca um serviço específico

#### POST /api/services
Cria um novo serviço
```json
{
  "name": "Corte de Cabelo",
  "category": "Cabelo",
  "value": 50.00
}
```

#### PUT /api/services/{id}
Atualiza um serviço existente

#### DELETE /api/services/{id}
Exclui um serviço

### Endpoints de Agendamentos

#### GET /api/appointments
Lista todos os agendamentos

Query params opcionais:
- `clientId`: Filtrar por cliente
- `serviceId`: Filtrar por serviço
- `startDate` e `endDate`: Filtrar por intervalo de datas
- `date` e `time`: Verificar disponibilidade

#### GET /api/appointments/{id}
Busca um agendamento específico

#### POST /api/appointments
Cria um novo agendamento
```json
{
  "clientId": "uuid-do-cliente",
  "serviceId": "uuid-do-servico",
  "date": "2025-10-28",
  "time": "14:00",
  "duration": 60,
  "status": "scheduled",
  "notes": "Observações opcionais"
}
```

**Nota**: O campo `serviceId` é opcional. Se não fornecido, o agendamento não estará vinculado a um serviço específico.

#### PUT /api/appointments/{id}
Atualiza um agendamento existente

#### DELETE /api/appointments/{id}
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

### Funcionalidades Implementadas
- ✅ Vinculação de serviços a agendamentos via campo `serviceId` (opcional)
- ✅ Seletor de serviço no formulário de agendamento
- ✅ Checkbox para marcar agendamentos como concluídos rapidamente no Dashboard
- ✅ Documentação completa da API com exemplos curl na página de Configurações
- ✅ Uso de {id} em vez de :id na documentação para melhor clareza
- ✅ Interface organizada em abas (Clientes, Serviços, Agendamentos)
- ✅ Exemplos práticos de uso com curl para cada endpoint

### Melhorias de UX
- Checkbox visual para conclusão rápida de agendamentos
- Seleção de serviço ao criar/editar agendamentos
- Documentação mais clara e prática na página de Configurações
- Código de exemplos com URL base dinâmica

### Arquitetura
- Schema atualizado com relacionamento appointments → services
- Migrations executadas com sucesso
- Frontend e backend sincronizados
- Validação de dados mantida em ambas as camadas
