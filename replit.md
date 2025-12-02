# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS appointment management system designed for businesses. It provides comprehensive tools for managing clients, services, **professionals**, and appointments with complete data isolation for each tenant. The platform includes a robust REST API for integration with automation tools like N8N, aiming to deliver a scalable and secure scheduling solution for the service industry.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

Whenever ANY new feature or implementation is added to the system, it MUST be documented in the Master Admin API Documentation (`client/src/components/ApiDocumentation.tsx`). This ensures that:
1. All API endpoints are properly documented with examples
2. Integration tools like N8N have accurate reference documentation
3. Future development is easier with up-to-date API documentation
4. The development process is more efficient and organized

Always update the API documentation immediately after implementing new features, endpoints, or modifying existing functionality.

## System Architecture
The system utilizes a multi-tenant SaaS architecture with a clear separation between frontend and backend.

### UI/UX Decisions
All UI components (buttons, forms, tables, alerts, etc.) MUST be sourced EXCLUSIVELY from `attached_assets/free-react-tailwind-admin-dashboard-main/`. No other component libraries (e.g., Shadcn/UI, Radix UI, Material-UI) are permitted. The system uses exact TailAdmin color schemes defined in `client/src/index.css`.

A custom modal system is implemented using React Portals, rendering into `#modal-root` with high z-index and `backdrop-blur-[32px]` for a professional look. The login page replicates the TailAdmin SignInForm, and the calendar page uses FullCalendar with TailAdmin styling, supporting full CRUD for appointments, conflict detection, and multi-service duration calculation. **Date picking is handled by react-day-picker (replaces Flatpickr) with ptBR locale, weekStartsOn: 0 (Domingo), and correct day-of-week calculation. Supports single/multiple/range/time modes with proper invalid date validation**.

**TABLE STANDARDIZATION (CRITICAL - MANDATORY FOR ALL TABLES):**
ALL data tables across the entire system (Clients, Services, Professionals, Users, etc.) MUST follow this exact pattern from ServicesPage/ClientsPage:

1. **Container Structure**:
   ```tsx
   <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
     <div className="max-w-full overflow-x-auto">
       <Table>...</Table>
     </div>
   </div>
   ```

2. **Table Header**:
   ```tsx
   <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
     <TableRow>
       <TableHead className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
   ```

3. **Table Body**:
   ```tsx
   <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
   ```

4. **Table Cells**:
   - First column: `className="px-5 py-4 sm:px-6 text-start"`
   - Other columns: `className="px-4 py-3 text-start"` (or `text-center` for actions)
   - Text styles: `text-gray-800 text-theme-sm dark:text-white/90` for main, `text-gray-500 text-theme-xs dark:text-gray-400` for secondary

5. **Empty State**:
   ```tsx
   <div className="rounded-sm border border-stroke bg-white px-5 py-12 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
     <p className="text-bodydark2 mb-4">{message}</p>
     {!searchQuery && <Button>Adicionar Primeiro Item</Button>}
   </div>
   ```

6. **Pagination (MANDATORY PATTERN)**:
   ```tsx
   <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
     <p className="text-sm text-gray-500 dark:text-gray-400">
       Mostrando {start} até {end} de {total} items
     </p>
     <div className="flex gap-2">
       <Button size="sm" variant="outline">Anterior</Button>
       <div className="flex items-center gap-1">
         {pages.map(page => (
           <Button size="sm" variant={currentPage === page ? "default" : "ghost"} className="min-w-[36px]">
             {page}
           </Button>
         ))}
       </div>
       <Button size="sm" variant="outline">Próximo</Button>
     </div>
   </div>
   ```

7. **Search Bar**:
   ```tsx
   <div className="relative max-w-md">
     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-bodydark2" />
     <Input placeholder="Buscar..." className="pl-12" />
   </div>
   ```

8. **Action Buttons**:
   ```tsx
   <Button size="sm" variant="ghost" className="hover-elevate">
     <Edit2 className="h-4 w-4" />
   </Button>
   <Button size="sm" variant="ghost" className="text-meta-1 hover:text-meta-1 hover-elevate">
     <Trash2 className="h-4 w-4" />
   </Button>
   ```

**NO EXCEPTIONS**: Every new table page must replicate this structure exactly. Consistency is critical for user experience and maintainability.

Recent production bug fixes addressed cache invalidation race conditions, premature dialog closures, and DatePicker interaction issues. **CRITICAL FIX (Nov 2025):** Replaced Flatpickr with react-day-picker due to incorrect day-of-week calculations (22/Nov/2025 was showing as Wednesday instead of Saturday). New implementation supports single/multiple/range/time modes with invalid date validation (prevents `new Date("")` errors). Schema corrections include removing the `email` field from the Clients table, adding a `duration` field to Appointments, and enforcing `phone` as NOT NULL. A critical bug fix ensures that appointment `duration` is correctly calculated and persisted to the database during creation and updates. **Professional assignment now displays correctly in AppointmentDetailsDialog** with dedicated query and UI section.

### Technical Implementations
- **Multi-Tenant Architecture**: Enforced data isolation via `tenantId` and middleware.
- **Authentication**: `express-session` and `bcrypt` for web sessions; token-based for API.
- **User Management**: `master_admin`, `admin`, and `user` roles with defined access levels.
- **API Design**: Comprehensive RESTful API for CRUD operations, filtering, and N8N compatibility.
- **Data Validation**: Zod for robust schema validation.
- **Core Features**: Multi-tenant, secure auth, master admin panel, user/service/professional management, appointment scheduling/editing, business hours, availability, full REST API.
- **Advanced Features**: Appointment conflict detection (including professional double-booking prevention), flexible business hours, availability API, secure API token system, role-based access control, dynamic API documentation, bulk service import, detailed calendar views, client phone uniqueness, multi-service appointments (total duration calculation), promotional pricing with date-based activation, **professional management with flexible multi-interval schedules, professional filtering in calendar, and professional-specific appointment assignment**.
- **Multi-Address System (Dec 2025)**: Clients can have multiple saved addresses with labels (Casa, Trabalho, Outro). Orders reference `clientAddressId` (FK to client_addresses, ON DELETE SET NULL) while also storing address snapshot fields for historical immutability. OrderDialog supports: phone-based client search, existing address selection, new address creation with optional save to client profile, and label customization.
- **Tenant Module Permissions**: Sistema de permissões de módulos por tenant que permite habilitar/desabilitar funcionalidades específicas para cada cliente.

### Tenant Module Permissions System (CRITICAL - FOLLOW WHEN ADDING NEW MODULES)

**IMPORTANT**: When creating ANY new module/feature in the system, you MUST:
1. Add the module definition to `MODULE_DEFINITIONS` in `shared/schema.ts`
2. Protect the backend routes with `requireModule('module-id')` middleware
3. Update the Sidebar component to respect module permissions
4. Document the new module in this section

**Current Module Registry** (defined in `shared/schema.ts`):
| Module ID | Label | Core? | Default? | Description |
|-----------|-------|-------|----------|-------------|
| `calendar` | Agenda | ✅ Yes | ✅ | Calendário e agendamentos (sempre ativo) |
| `clients` | Clientes | ❌ No | ✅ | Gestão de clientes |
| `services` | Serviços | ❌ No | ✅ | Gestão de serviços |
| `professionals` | Profissionais | ❌ No | ✅ | Gestão de profissionais |
| `business-hours` | Horários | ❌ No | ✅ | Horários de funcionamento |
| `api-tokens` | Tokens API | ❌ No | ❌ | Integração com N8N |
| `users` | Usuários | ❌ No | ❌ | Gestão de usuários do tenant |

**How to add a new module:**
```typescript
// 1. Add to MODULE_DEFINITIONS in shared/schema.ts
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // ... existing modules ...
  {
    id: "new-module",
    label: "Novo Módulo",
    description: "Descrição do novo módulo",
    isCore: false,
    defaultEnabled: true, // true = habilitado por padrão para novos tenants
  },
];

// 2. Protect routes in server/routes.ts
app.get("/api/new-module", requireModule("new-module"), async (req, res) => {
  // ...
});

// 3. Update Sidebar.tsx to include module in navigation
// (already handles visibility via allowedModules from auth context)
```

**Database Table**: `tenant_module_permissions`
- Stores per-tenant module overrides
- Core modules are always enabled (not stored, implicit)
- Only non-core module overrides are stored

**API Endpoints**:
- `GET /api/admin/tenants/:id/modules` - Get tenant module permissions
- `PUT /api/admin/tenants/:id/modules` - Update tenant module permissions
- Module permissions are included in `/api/auth/me` response as `allowedModules[]`
- **Production Security**: Critical requirements include a mandatory, high-entropy `SESSION_SECRET` environment variable. Security measures include httpOnly, secure, and strict sameSite cookies; rate limiting on auth and API endpoints; trust proxy configuration for Replit and production environments; Zod-based input validation; and secure file upload handling for CSVs (max 5MB, 1000 rows, strict type validation).

### Production Deployment & Migrations (CRITICAL)

**IMPORTANTE**: A aplicação é deployada no **Easypanel** (NÃO no Replit). O banco de dados de produção já existe.

**Processo de Migração para Produção**:
1. O painel do **Master Admin** possui uma seção de **Migração SQL**
2. Sempre que criar novas tabelas ou modificar schema, DEVE-SE gerar o script SQL correspondente
3. O script SQL deve ser executado via painel Master Admin em produção

**Ao implementar novas funcionalidades que alteram o banco**:
1. Modificar `shared/schema.ts` com as novas tabelas/colunas
2. Gerar script SQL para a migração (CREATE TABLE, ALTER TABLE, etc.)
3. Documentar o script SQL para o usuário executar no Master Admin
4. Incluir índices necessários para performance

**Exemplo de script de migração**:
```sql
-- Nova tabela client_addresses (Dezembro 2025)
CREATE TABLE IF NOT EXISTS client_addresses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Casa',
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    zip_code TEXT,
    reference TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nova coluna em orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_address_id VARCHAR REFERENCES client_addresses(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_client_addresses_client ON client_addresses(client_id);
```

### System Design Choices
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend State Management**: TanStack Query.
- **Schema Management**: Shared schemas (`shared/schema.ts`) using Drizzle and Zod ensure consistency.
- **Production Deployment**: Easypanel with PostgreSQL. Migrations via Master Admin SQL panel.

## External Dependencies
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **Backend Framework**: Express.js.
- **Frontend Framework**: React.
- **Styling**: Tailwind CSS, TailAdmin UI.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Password Hashing**: Bcrypt.
- **Session Management**: Express-session.
- **Data Validation**: Zod.
- **Integration**: N8N.