# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a modern multi-tenant SaaS system for appointment management. It allows multiple businesses (tenants) to use the same platform with complete data isolation. Each tenant manages their own clients, services, appointments, and users. The system includes a comprehensive REST API for integration with N8N and other automation tools. The project's ambition is to provide a robust, scalable, and secure platform for businesses to efficiently manage their scheduling operations, offering significant market potential in the service industry.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

## System Architecture
The system is designed as a multi-tenant SaaS platform with a clear separation between frontend and backend.

### UI/UX Decisions
The frontend utilizes React with TypeScript, Wouter for routing, and Tailwind CSS + Shadcn UI for styling, ensuring a modern, clean, and responsive design with both light and dark theme support. The UI includes dedicated pages for login, master admin, dashboard, calendar view, client management, service catalog, user management, and settings (including API documentation).

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation is enforced using a `tenantId` field in all relevant database tables (`clients`, `services`, `appointments`). Authentication middleware verifies user sessions, and a tenant-specific middleware automatically filters data based on the logged-in user's tenant.
- **Authentication**: Secure login is implemented using `express-session` and `bcrypt` for password hashing. The system supports session-based authentication for the web UI and token-based authentication (Bearer tokens) for API integrations. API tokens are encrypted and managed with creation, listing, and revocation capabilities, with real-time verification.
- **Hierarchical User Management**: Three roles are defined: `master_admin` (manages tenants), `admin` (manages users and data within a tenant), and `user` (restricted access to operational data within a tenant). Frontend menus and API access are controlled based on these roles.
- **API Design**: A comprehensive RESTful API is provided, covering CRUD operations for clients, services, and appointments. All filter operations use query parameters (e.g., `/api/appointments?clientId=xxx&serviceId=yyy`) instead of path parameters for better N8N integration compatibility.
- **Data Validation**: Zod is used for robust data validation across the system.

### Feature Specifications
- **Core Features**: Multi-tenant support, secure authentication, master admin panel, user management (per tenant), service management (with categories and values), appointment scheduling (with optional service linking), appointment editing (including date and time), business hours management, availability checking, quick action checkboxes for appointment completion, and a complete REST API.
- **Appointment Editing**: 
  - Full support for editing all appointment fields: date, time, client, service, duration, status, and notes
  - Available in calendar view (tenant users) and master admin panel (all tenants)
  - API endpoint PUT /api/appointments/:id accepts partial updates (all fields optional)
  - Automatic conflict detection when changing date/time to prevent double-booking
- **Business Hours Management**: 
  - Configure operating hours per day of the week (0=Sunday to 6=Saturday)
  - Multiple time periods per day (e.g., morning and afternoon shifts)
  - Enable/disable specific time periods without deletion
  - CRUD operations: GET /api/business-hours, POST /api/business-hours, PUT /api/business-hours/:id, DELETE /api/business-hours/:id
  - Admin-only access (requires tenant admin or master admin role)
- **Availability API**:
  - GET /api/availability endpoint for checking schedule availability
  - Query parameters (all optional):
    - startDate (optional): Data inicial em formato YYYY-MM-DD. Se não fornecida, usa data atual
    - endDate (optional): Data final em formato YYYY-MM-DD. Se não fornecida, usa 30 dias a partir da data inicial
    - clientId (optional): Filtrar agendamentos por cliente
    - serviceId (optional): Filtrar agendamentos por serviço
  - Returns availability per day with business hours and existing appointments
  - Automatically filters days without configured business hours
  - Supports date range queries for integration with external calendar systems
- **API Token System**: 
  - Tenants can generate and manage their own API tokens through the Settings page
  - Master admins can create and manage API tokens for any tenant through the Admin panel
  - Tokens include metadata (label, creation date, last usage) and revocation capabilities
  - Token shown only once upon creation for security
- **User Role-Based Access Control**: 
  - Granular permissions for `master_admin`, `admin`, and `user` roles, affecting both UI access and API endpoint permissions
  - Master admin users are protected from deletion at both backend (403 error) and frontend (hidden delete button)
  - Visual differentiation: Master admin users display with purple "Master Admin" badge and crown icon
- **Master Admin Panel**: 
  - Tabbed interface for managing tenants, appointments, API tokens, and viewing API documentation
  - Complete appointment management across all tenants with ability to view and edit any appointment
  - Can edit appointment details including date, time, status, client, service, duration, and notes
  - Can create API tokens for any tenant from centralized location
  - Comprehensive API endpoint documentation with curl examples and copy-to-clipboard functionality
  - Cross-tenant API token revocation capability
- **API Documentation Features**:
  - Dynamic base URL using window.location.origin for environment-agnostic examples
  - Copy-to-clipboard button on all cURL examples with visual feedback
  - Complete authentication guides (Bearer Token and Session Cookie)
  - Client search endpoint supports phone number search (in addition to name and email)
- **Bulk Service Import**:
  - CSV template download with example data (GET /api/services/template)
  - Bulk import functionality for services via CSV upload (POST /api/services/import)
  - Support for both Portuguese (nome, categoria, valor, descricao) and English (name, category, value, description) column headers
  - Automatic validation using Zod schemas
  - Detailed import results showing success count and errors
  - File size limit of 5MB for security
  - Empty row detection and skipping
- **Calendar Appointment Details View**:
  - Click on appointment name in calendar to view full details
  - Modal dialog shows complete appointment information
  - Displays client details (name, phone, email), service information (name, category, value), date, time, duration, status and notes
  - Loading states for data fetching
  - Clean UI with icons for better readability
- **Client Phone Uniqueness Validation**:
  - Unique constraint on phone number per tenant in database schema
  - Backend validation before creating new client (returns 409 if phone already exists)
  - Backend validation when updating client phone (allows self-update, blocks duplicates)
  - Clear error messages: "Já existe um cliente cadastrado com este número de telefone"
  - Prevents duplicate client registrations by phone number within the same tenant
- **API Documentation - Complete Schema Alignment**:
  - **Appointment endpoints**: All examples now correctly show duration (required), status (scheduled/completed), notes (optional), createdAt, and tenantId. Removed non-existent fields: title and completed boolean.
    - Includes: GET/POST/PUT /api/appointments, GET /api/clients/:id/appointments, GET /api/services/:id/appointments
  - **Client endpoints**: All examples now only include schema fields (name, email, phone, tenantId). Removed non-existent fields: address and notes.
    - Includes: GET/POST/PUT /api/clients
  - **Tenant endpoints**: Added createdAt field to all response examples
  - **User endpoints**: Added createdAt field to all response examples
  - **100% schema consistency**: All API documentation examples now perfectly match shared/schema.ts definitions

### System Design Choices
- **Backend**: Express.js provides the API layer.
- **Database**: PostgreSQL is used for data persistence, managed with Drizzle ORM.
- **State Management**: TanStack Query handles data management on the frontend.
- **Schema Management**: A shared schema (`shared/schema.ts`) uses Drizzle and Zod for consistency.

## External Dependencies
- **Database**: PostgreSQL (specifically Neon for cloud hosting).
- **ORM**: Drizzle ORM.
- **Backend Framework**: Express.js.
- **Frontend Framework**: React.
- **Styling**: Tailwind CSS and Shadcn UI.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Password Hashing**: Bcrypt.
- **Session Management**: Express-session.
- **Data Validation**: Zod.
- **Integration**: N8N (via HTTP Request to the REST API).

## Deploy e Instalação (Produção)

### Pré-requisitos
- **Banco de Dados PostgreSQL**: Configure um banco PostgreSQL (por exemplo, no Easypanel ou em serviços como Neon, Railway, Supabase)
- **Variável de Ambiente**: `DATABASE_URL` deve apontar para o banco de dados PostgreSQL

### Deploy com Docker (Easypanel)

No Easypanel, o processo é ainda mais simples:

1. **Conecte seu Repositório Git** ao Easypanel
2. **Configure as Variáveis de Ambiente** no painel:
   - `DATABASE_URL`: String de conexão do PostgreSQL (use o banco interno do Easypanel ou externo)
   - `SESSION_SECRET`: Chave secreta para sessions (gerar com `openssl rand -base64 32`)
   - `NODE_ENV`: `production`
   - `HTTPS_ENABLED`: `true` (apenas se sua aplicação estiver com HTTPS configurado. Caso contrário, deixe em branco)
3. **Easypanel fará o build e deploy automaticamente** usando o Dockerfile
4. **Acesse a aplicação** pela URL fornecida pelo Easypanel

**Deploy Manual com Docker** (se não usar Easypanel):
```bash
# Build da imagem
docker build -t agendapro .

# Executar container
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e SESSION_SECRET="sua_chave_secreta" \
  -e NODE_ENV=production \
  agendapro
```

### Primeira Instalação

Existem **duas formas** de criar o primeiro Master Admin:

#### Opção 1: Via Variáveis de Ambiente (**OBRIGATÓRIO** em Produção)

⚠️ **IMPORTANTE**: Em produção (`NODE_ENV=production`), as variáveis de ambiente são **OBRIGATÓRIAS** por segurança. O sistema NÃO criará admin sem elas.

Configure as seguintes variáveis de ambiente **antes do primeiro deploy**:

```bash
# OBRIGATÓRIAS em produção:
MASTER_ADMIN_USERNAME=seu_usuario
MASTER_ADMIN_PASSWORD=sua_senha_segura

# OPCIONAIS (usa valores padrão se não definidas):
MASTER_ADMIN_NAME=Seu Nome Completo      # (Opcional, usa username se não definido)
MASTER_ADMIN_EMAIL=seu@email.com         # (Opcional, gera email automático se não definido)
```

O sistema criará automaticamente o Master Admin no primeiro startup se não existir nenhum admin ainda.

**Nota de Segurança**: Em desenvolvimento local, o sistema usa credenciais padrão para facilitar testes. Mas em produção, variáveis de ambiente são obrigatórias para evitar vazamento de credenciais no repositório Git.

**No Easypanel**:
1. Vá em **Environment Variables**
2. Adicione as variáveis acima
3. Faça o deploy
4. Acesse a aplicação e faça login com as credenciais definidas

#### Opção 2: Via Tela de Setup (Interface Web)

1. **Acesse a Aplicação**: Ao acessar pela primeira vez, o sistema detecta que não há admin configurado
2. **Tela de Setup**: Você será redirecionado automaticamente para `/setup`
3. **Criar Primeiro Admin**:
   - Preencha os dados do primeiro usuário Master Admin
   - Defina username, nome, email e senha
   - Clique em "Instalar AgendaPro"
4. **Login**: Após a instalação, você será redirecionado para a tela de login
5. **Acesso Master Admin**: Use as credenciais criadas para acessar o painel administrativo

### Segurança de Instalação

**IMPORTANTE**: O endpoint `/api/setup` fica publicamente acessível até que o primeiro admin seja criado. Para aumentar a segurança em produção:

1. **Restricão de Rede**: Configure firewall/security groups para limitar acesso durante a primeira instalação
2. **Primeiro Acesso Rápido**: Execute a instalação imediatamente após o deploy
3. **Após Instalação**: O endpoint `/api/setup` automaticamente bloqueia novas instalações após criar o primeiro admin

### Estrutura de Deploy

- **Dockerfile**: Multi-stage build otimizado para produção
- **Migrations Automáticas**: As tabelas do banco são criadas automaticamente no primeiro startup
- **Build Assets**: Frontend compilado está em `client/dist`
- **Backend Compilado**: Server transpilado está em `dist/`
- **Porta**: Aplicação escuta na porta 5000 por padrão

**Nota**: As migrations do banco de dados são executadas automaticamente pelo script `start.sh` antes da aplicação iniciar. Você não precisa rodar nenhum comando manualmente!