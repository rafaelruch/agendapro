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
- **API Design**: A comprehensive RESTful API is provided, covering CRUD operations for clients, services, and appointments. It includes query parameters for filtering and supports integration with tools like N8N.
- **Data Validation**: Zod is used for robust data validation across the system.

### Feature Specifications
- **Core Features**: Multi-tenant support, secure authentication, master admin panel, user management (per tenant), service management (with categories and values), appointment scheduling (with optional service linking), quick action checkboxes for appointment completion, and a complete REST API.
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
  - Tabbed interface for managing tenants, API tokens, and viewing API documentation
  - Can create API tokens for any tenant from centralized location
  - Comprehensive API endpoint documentation with curl examples
  - Cross-tenant API token revocation capability

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

#### Opção 1: Via Variáveis de Ambiente (Recomendado para Produção)

Configure as seguintes variáveis de ambiente **antes do primeiro deploy**:

```bash
MASTER_ADMIN_USERNAME=seu_usuario
MASTER_ADMIN_PASSWORD=sua_senha_segura
MASTER_ADMIN_NAME=Seu Nome Completo      # (Opcional, usa username se não definido)
MASTER_ADMIN_EMAIL=seu@email.com         # (Opcional, gera email automático se não definido)
```

O sistema criará automaticamente o Master Admin no primeiro startup se não existir nenhum admin ainda.

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