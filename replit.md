# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS system designed for appointment management. It enables multiple businesses to operate on a single platform with complete data isolation, each managing their own clients, services, appointments, and users. The platform includes a comprehensive REST API for integration with N8N and other automation tools, aiming to provide a robust, scalable, and secure solution for efficient scheduling operations in the service industry.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

**IMPORTANT: Documentation Update Rule**
Whenever ANY new feature or implementation is added to the system, it MUST be documented in the Master Admin API Documentation (`client/src/components/ApiDocumentation.tsx`). This ensures that:
1. All API endpoints are properly documented with examples
2. Integration tools like N8N have accurate reference documentation
3. Future development is easier with up-to-date API documentation
4. The development process is more efficient and organized

Always update the API documentation immediately after implementing new features, endpoints, or modifying existing functionality.

## Design System & Component Libraries

### Component Libraries (Already Installed)
The application uses the following React-native libraries for building the interface:
- **Radix UI** (https://www.radix-ui.com/) - Headless, accessible UI primitives (base for Shadcn)
- **Shadcn UI** (https://www.shadcn.io/) - Re-usable components built on Radix UI and Tailwind CSS
- **Ant Design** (https://ant.design/) - Additional component reference for complex UI patterns

### Dashboard Design Reference
For the **tenant dashboard** (client-facing interface), use **TailAdmin React** as the primary visual and layout reference:
- **TailAdmin React**: https://tailadmin.com/react
- **Live Demo**: https://react-demo.tailadmin.com/
- **GitHub Repository**: https://github.com/TailAdmin/free-react-tailwind-admin-dashboard
- **Documentation**: https://tailadmin.com/docs/components/react

### Implementation Guidelines

#### Tenant Dashboard (Client Interface)
**Use TailAdmin React design patterns for:**
1. **Login Page**: Implement using TailAdmin's Sign In page design
   - Clean, centered layout
   - Professional authentication forms
   - Light/dark mode support
   
2. **Dashboard Layout**: Follow TailAdmin's dashboard structure
   - Collapsible sidebar navigation
   - Header with notifications, messages, user dropdown
   - Breadcrumb navigation
   - Card-based data display
   - Charts and data visualization using ApexCharts
   - Responsive layout for mobile/tablet/desktop

3. **UI Components to Adapt**:
   - **Layout**: Sidebar, Header, Breadcrumb
   - **Data Display**: Cards, Tables, Charts, Badges
   - **Forms**: Input fields, Select dropdowns, Date pickers, Checkboxes
   - **Feedback**: Alerts, Modals, Toast notifications
   - **Navigation**: Tabs, Accordion, Pagination

#### Master Admin Panel
**DO NOT CHANGE** the existing master admin panel - it is working correctly and should remain as is.

### Adaptation Strategy
While TailAdmin provides a visual reference, we **DO NOT install TailAdmin** as a dependency. Instead:
1. **Reference the design** from TailAdmin demos and screenshots
2. **Implement using our existing stack**: Shadcn UI + Radix UI + Tailwind CSS
3. **Match the visual aesthetic**: Colors, spacing, layouts, component styles
4. **Adapt patterns**: Convert TailAdmin examples to Shadcn/Radix equivalents

### Key Visual Elements from TailAdmin
- **Color Scheme**: Professional blues and neutrals with semantic colors (success green, warning yellow, danger red)
- **Typography**: Clean, readable fonts with clear hierarchy
- **Spacing**: Consistent padding and margins (4px, 8px, 16px, 24px scale)
- **Cards**: Subtle shadows and borders with rounded corners
- **Dark Mode**: Full dark theme support across all components
- **Responsiveness**: Mobile-first design with collapsible navigation

## System Architecture
The system employs a multi-tenant SaaS architecture with a distinct separation between frontend and backend.

### UI/UX Decisions
The frontend is built with React, TypeScript, Wouter for routing, and Tailwind CSS with Shadcn UI for a modern, responsive design, including light and dark themes. Key UI components include dedicated pages for authentication, administration, dashboards, calendar views, client/service/user management, and system settings.

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation is achieved using a `tenantId` field across all critical database tables, with middleware enforcing tenant-specific data access.
- **Authentication**: Secure login utilizes `express-session` and `bcrypt` for web sessions, and token-based authentication (Bearer tokens) for API integrations, with encrypted and manageable API tokens.
- **Hierarchical User Management**: Features `master_admin`, `admin`, and `user` roles, each with defined access levels for UI and API endpoints.
- **API Design**: A comprehensive RESTful API supports CRUD operations for core entities. It uses query parameters for filtering and single resource lookups for enhanced integration compatibility, particularly with tools like N8N.
- **Data Validation**: Zod is used for robust data validation throughout the system.
- **Core Features**: Includes multi-tenant support, secure authentication, master admin panel, per-tenant user/service management, appointment scheduling and editing, business hours configuration, availability checking, and a full REST API.
- **Advanced Features**: Appointment editing with conflict detection, flexible business hours management, an availability API, a secure API token system, role-based access control, a master admin panel for cross-tenant management and migrations, dynamic API documentation with schema alignment, bulk service import, detailed calendar appointment views, and client phone uniqueness validation.
- **Multi-Service Appointments**: Each appointment can have multiple services associated via the `appointment_services` junction table. The system automatically calculates total duration by summing individual service durations and displays appointment time ranges (e.g., "14:00-16:00" for 120 minutes total). The API enriches all appointment responses with a `serviceIds` array for consistent frontend consumption. **serviceIds is mandatory (minimum 1 service required)** - enforced at schema, API, and database layers to ensure accurate duration calculations and prevent invalid states.
- **Promotional Pricing for Services**: Services support optional promotional pricing with date-based activation. Each service can have `promotionalValue`, `promotionStartDate`, and `promotionEndDate` fields. The system automatically applies promotional pricing when the current date falls within the promotion period, displaying visual indicators (green badge, strikethrough original price) in UI and using promotional values in appointment calculations. Validation ensures atomic promotion management (all three fields required together or none) preventing inconsistent data states. Frontend and backend enforce data integrity through multi-layer validation (UI normalization, backend pre-validation normalization, schema validation, post-validation atomic clearing).
- **Appointment Conflict Detection (Google Calendar-style)**: Comprehensive appointment conflict validation prevents overlapping bookings while allowing adjacent appointments. The system uses time-based overlap detection with precise duration calculations from associated services. Conflicts are detected at storage layer during `createAppointment` and `updateAppointment` operations, with HTTP 409 responses providing detailed error information including conflicting appointment details and next available time slot. Multi-layer validation ensures data integrity: schema validation (serviceIds min 1), pre-transaction validation (service existence and tenant isolation), conflict detection before commit, and atomic post-manipulation validation within transaction to prevent partial commits and guarantee rollback on any validation failure.

### System Design Choices
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend State Management**: TanStack Query.
- **Schema Management**: Shared schemas (`shared/schema.ts`) using Drizzle and Zod ensure consistency.

## External Dependencies
- **Database**: PostgreSQL (e.g., Neon).
- **ORM**: Drizzle ORM.
- **Backend Framework**: Express.js.
- **Frontend Framework**: React.
- **Styling**: Tailwind CSS, Shadcn UI.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Password Hashing**: Bcrypt.
- **Session Management**: Express-session.
- **Data Validation**: Zod.
- **Integration**: N8N.

## Deploy e Configuração de Produção

### Variáveis de Ambiente Obrigatórias (EasyPanel/Produção)

**CRÍTICO:** O sistema requer que as seguintes variáveis de ambiente estejam configuradas corretamente em produção. Sem elas, a aplicação não funcionará corretamente.

#### 1. DATABASE_URL (OBRIGATÓRIA)
A variável `DATABASE_URL` é **absolutamente crítica**. Sem ela, a aplicação usa um banco SQLite vazio temporário e todos os dados ficam invisíveis.

**Configuração no EasyPanel:**
```env
DATABASE_URL=postgres://usuario:senha@host:5432/database?sslmode=disable
```

**Exemplo real (EasyPanel com PostgreSQL interno):**
```env
DATABASE_URL=postgres://postgres:fd2040ea05b8e182e878@server-geral_agenda-pro-db:5432/server-geral?sslmode=disable
```

**Importante:**
- Esta URL deve apontar para o banco PostgreSQL correto
- Se não configurada, a aplicação criará um banco SQLite vazio local
- Todos os dados (clientes, serviços, agendamentos) ficarão invisíveis sem esta variável
- Cada deploy sem DATABASE_URL criará um banco vazio novo

#### 2. Variáveis de Sessão

```env
NODE_ENV=production
SESSION_SECRET=seu-secret-muito-seguro-e-aleatorio-minimo-32-caracteres
```

**Notas:**
- `SESSION_SECRET` deve ser uma string aleatória longa e segura
- Nunca use o mesmo secret de desenvolvimento em produção
- Gere usando: `openssl rand -base64 32`

#### 3. Variáveis do Master Admin (Produção)

```env
MASTER_ADMIN_USERNAME=seu_usuario_admin
MASTER_ADMIN_PASSWORD=SuaSenhaForte123!
MASTER_ADMIN_NAME=Nome do Administrador
MASTER_ADMIN_EMAIL=admin@seudominio.com
```

**Importante:**
- Estas variáveis são **obrigatórias** em produção
- O master admin só será criado se estas variáveis estiverem configuradas
- Sem elas, você não conseguirá acessar o painel administrativo

#### 4. Variáveis Opcionais

```env
# Forçar cookies seguros apenas se tiver HTTPS configurado
FORCE_SECURE_COOKIE=false

# Porta da aplicação (padrão: 5000)
PORT=5000
```

### Processo de Deploy para EasyPanel

#### Passo 1: Configurar Variáveis de Ambiente

1. Acesse seu projeto no EasyPanel
2. Vá em **Environment** ou **Variables**
3. Adicione **todas** as variáveis listadas acima
4. Salve as configurações

#### Passo 2: Deploy da Aplicação

1. Faça commit das alterações no repositório Git
2. Push para o repositório remoto
3. No EasyPanel, clique em **Rebuild/Redeploy**
4. Aguarde o build e deploy finalizar

#### Passo 3: Sincronizar Schema do Banco de Dados

**SEMPRE** que houver mudanças no schema (`shared/schema.ts`):

1. Faça login como **master admin** na aplicação em produção
2. Acesse **Admin Master** no menu
3. Clique na aba **Migrations**
4. Clique no botão **"Executar db:push"**
5. Aguarde a confirmação de sucesso

**Importante:**
- Este passo sincroniza o schema do PostgreSQL com o código
- Cria/atualiza tabelas e colunas conforme definido em `shared/schema.ts`
- Deve ser executado após qualquer mudança no schema
- É seguro executar múltiplas vezes (idempotente)

### Troubleshooting - Problemas Comuns

#### Problema: "Dados vazios em produção"

**Causa:** `DATABASE_URL` não configurada ou incorreta

**Solução:**
1. Verifique se `DATABASE_URL` está configurada no EasyPanel
2. Confirme que a URL aponta para o banco PostgreSQL correto
3. Redeploy da aplicação após configurar
4. Execute migrations via painel master admin

#### Problema: "Sessão não persiste após login"

**Causa:** Problemas com cookies de sessão

**Solução:**
1. Verifique `SESSION_SECRET` está configurada
2. Confirme `NODE_ENV=production`
3. Se usar HTTPS, configure `FORCE_SECURE_COOKIE=true`
4. Redeploy da aplicação

#### Problema: "Master admin não existe"

**Causa:** Variáveis de ambiente do master admin não configuradas

**Solução:**
1. Configure todas as variáveis `MASTER_ADMIN_*`
2. Redeploy da aplicação
3. O master admin será criado automaticamente no startup

### Checklist de Deploy

Antes de cada deploy em produção, confirme:

- [ ] `DATABASE_URL` configurada apontando para PostgreSQL correto
- [ ] `SESSION_SECRET` configurada com valor seguro
- [ ] `NODE_ENV=production`
- [ ] Variáveis `MASTER_ADMIN_*` configuradas
- [ ] Código commitado e pushed para repositório
- [ ] Build e deploy finalizados com sucesso
- [ ] Migrations executadas via painel master admin (se houver mudanças no schema)
- [ ] Login testado e funcionando
- [ ] Dados visíveis e acessíveis

### Formato de Horário (Brasil - São Paulo)

A aplicação usa o padrão brasileiro de 24 horas (00:00 - 23:59):
- ✅ **Formato correto**: 14:00, 09:30, 23:45
- ❌ **NÃO usa**: AM/PM, 2:00 PM, etc.

Os inputs HTML5 `type="time"` respeitam automaticamente o locale do navegador, exibindo formato 24h para usuários brasileiros.