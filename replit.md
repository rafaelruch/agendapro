# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Visão Geral
AgendaPro é um sistema SaaS multi-tenant moderno para gerenciamento de agendas. Múltiplas empresas (tenants) podem usar a mesma plataforma com isolamento completo de dados. Cada tenant gerencia seus próprios clientes, serviços, agendamentos e usuários. Sistema inclui integração completa via API REST para N8N e outras ferramentas de automação.

## Características Principais
- **Multi-Tenant**: Múltiplas empresas usam a mesma plataforma com isolamento total de dados
- **Autenticação Segura**: Sistema de login com senhas criptografadas (bcrypt) e sessões
- **Admin Master**: Painel administrativo para criar e gerenciar tenants
- **Gerenciamento de Usuários**: Cada tenant pode ter múltiplos usuários com diferentes permissões
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
- **Autenticação**: Express-session com bcrypt para hash de senhas
- **Validação**: Zod para validação de dados
- **Tabelas**:
  - `tenants`: Armazena informações das empresas (tenants)
  - `users`: Usuários do sistema com autenticação por senha (bcrypt)
  - `clients`: Armazena informações dos clientes (isolados por tenant)
  - `services`: Armazena serviços com nome, categoria e valor (isolados por tenant)
  - `appointments`: Armazena agendamentos com referência ao cliente e serviço opcional (isolados por tenant)

### Arquitetura Multi-Tenant
- **Isolamento de Dados**: Todas as tabelas têm campo `tenantId` para isolar dados
- **Middleware de Autenticação**: Verifica sessão do usuário antes de acessar rotas protegidas
- **Middleware de Tenant**: Filtra automaticamente dados pelo tenant do usuário logado
- **Roles**: 
  - `master_admin`: Acesso ao painel administrativo para gerenciar tenants
  - `admin`: Administrador do tenant (acesso total aos dados do tenant)
  - `user`: Usuário normal do tenant

### Frontend
- **Framework**: React com TypeScript
- **Roteamento**: Wouter
- **Estilização**: Tailwind CSS + Shadcn UI
- **Estado**: TanStack Query para gerenciamento de dados
- **Tema**: Sistema de tema claro/escuro

### Páginas
1. **Login**: Tela de autenticação com usuário e senha
2. **Admin Master**: Painel para gerenciar tenants e criar usuários (apenas master_admin)
3. **Dashboard**: Visão geral com estatísticas e agendamentos do dia com checkbox de conclusão
4. **Calendário**: Visualização em calendário mensal dos agendamentos
5. **Clientes**: Gerenciamento completo de clientes
6. **Serviços**: Catálogo de serviços com nome, categoria e valor
7. **Configurações**: Documentação completa da API com exemplos curl e configurações do sistema

## Autenticação

### Credenciais de Teste
- **Admin Master**: `admin` / `admin123` (gerenciar tenants)
- **Tenant 1 (Salão de Beleza Premium)**: `maria` / `senha123`
- **Tenant 2 (Clínica Dra. Silva)**: `joao` / `senha123`

### Rotas de Autenticação

#### POST /api/auth/login
Login no sistema
```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### POST /api/auth/logout
Logout do sistema

#### GET /api/auth/me
Retorna dados do usuário logado

## API REST para N8N

**IMPORTANTE**: Todas as rotas de API (exceto login) requerem autenticação via sessão. Os dados retornados são automaticamente filtrados pelo tenant do usuário logado.

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

### Arquitetura Multi-Tenant Implementada
- ✅ Tabelas `tenants` e `users` criadas
- ✅ Todas as tabelas (clients, services, appointments) agora têm `tenantId`
- ✅ Isolamento completo de dados por tenant
- ✅ Sistema de autenticação com sessões e bcrypt
- ✅ Middleware de autenticação e tenant em todas as rotas protegidas
- ✅ Painel administrativo master para gerenciar tenants
- ✅ Criação de usuários por tenant com senhas criptografadas
- ✅ Tela de login com usuário e senha
- ✅ Dados de teste para 2 tenants diferentes

### Funcionalidades Implementadas
- ✅ Vinculação de serviços a agendamentos via campo `serviceId` (opcional)
- ✅ Seletor de serviço no formulário de agendamento
- ✅ Checkbox para marcar agendamentos como concluídos rapidamente no Dashboard
- ✅ Documentação completa da API com exemplos curl na página de Configurações
- ✅ Uso de {id} em vez de :id na documentação para melhor clareza
- ✅ Interface organizada em abas (Clientes, Serviços, Agendamentos)
- ✅ Exemplos práticos de uso com curl para cada endpoint
- ✅ **Sistema de Tokens de API para N8N e integrações**:
  - Tabela `tenantApiTokens` para armazenar tokens criptografados (bcrypt)
  - Tokens mostrados apenas uma vez na criação (segurança)
  - Suporte a criação, listagem e revogação de tokens
  - Metadata completa: label, createdBy, createdAt, lastUsedAt, revokedAt
  - UI completa na página de Configurações para gerenciar tokens

### Segurança
- ✅ Senhas criptografadas com bcrypt (salt rounds: 10)
- ✅ Sessões seguras com express-session
- ✅ **Autenticação Dual**: Session-based (web UI) + API Token-based (N8N/integrações)
- ✅ Tokens de API criptografados com bcrypt antes de armazenar
- ✅ Tokens revogados não podem ser usados (verificação em tempo real)
- ✅ Bearer token tem prioridade sobre session quando ambos estão presentes
- ✅ Autenticação obrigatória em todas as rotas (exceto login)
- ✅ Validação de senha no login
- ✅ Hashes de senha nunca retornados nas respostas da API
- ✅ Isolamento de dados garantido por tenant via middleware

### Correções Técnicas
- Bug corrigido: Autenticação sem senha (vulnerabilidade crítica) - agora requer senha
- Bug corrigido: Radix Select não aceita `value=""`. Solução implementada usando valor sentinela "none" que é convertido para `undefined` no handleSubmit
- Validação garantida: agendamentos sem serviço vinculado agora salvam corretamente com `serviceId = null`
- **Bug crítico corrigido**: Middleware authenticateRequest agora prioriza Bearer token sobre session
  - Antes: Session tinha prioridade, tokens revogados continuavam funcionando se havia session ativa
  - Agora: Bearer token sempre tem prioridade quando presente, tokens revogados são rejeitados imediatamente
  - Testado com E2E: Tokens revogados retornam 401 corretamente

### Próximos Passos Recomendados
- 🔄 Externalizar SESSION_SECRET para variável de ambiente antes de produção
- 🔄 Implementar rate limiting no endpoint de login para prevenir brute-force
- 🔄 Adicionar account lockout após múltiplas tentativas de login falhadas
- 🔄 Implementar busca no frontend para seletores de cliente/serviço (API já suporta via ?search=)
- 🔄 Traduzir toda interface para português (atualmente parcialmente em inglês)
