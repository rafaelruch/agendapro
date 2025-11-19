# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS system for appointment management. It enables businesses to manage clients, services, appointments, and users with complete data isolation. The platform includes a comprehensive REST API for integration with N8N and other automation tools, aiming to provide a robust, scalable, and secure solution for efficient scheduling in the service industry.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

**IMPORTANT: Documentation Update Rule**
Whenever ANY new feature or implementation is added to the system, it MUST be documented in the Master Admin API Documentation (`client/src/components/ApiDocumentation.tsx`). This ensures that:
1. All API endpoints are properly documented with examples
2. Integration tools like N8N have accurate reference documentation
3. Future development is easier with up-to-date API documentation
4. The development process is more efficient and organized

Always update the API documentation immediately after implementing new features, endpoints, or modifying existing functionality.

**API Documentation Enhancements (Nov 2025):**
Added comprehensive "GUIA DE TESTE PRÁTICO" (Practical Testing Guide) section to `ApiDocumentation.tsx`:
- Step-by-step guide to generate API tokens via Settings page
- Practical cURL examples for creating clients with real base URL substitution
- Search parameter examples (search by phone/name)
- Testing tips for Postman, Insomnia, and N8N HTTP Request nodes
- Clear explanations of tenant isolation and phone uniqueness constraints
- Visual design with gradient backgrounds and prominent badges for better UX

## System Architecture
The system employs a multi-tenant SaaS architecture with a distinct separation between frontend and backend.

### UI/UX Decisions - REGRA CRÍTICA
**🚨 COMPONENTES UI - SEM EXCEÇÕES:**
TODOS os componentes UI (buttons, forms, tables, alerts, badges, images, dropdowns, videos, charts, modals, inputs, selects, etc.) DEVEM vir EXCLUSIVAMENTE de:

📂 **Fonte Única de Verdade:** `attached_assets/free-react-tailwind-admin-dashboard-main/`

**ESTRUTURA COMPLETA DISPONÍVEL:**
- `src/components/ui/` - Alert, Avatar, Badge, Button, Dropdown, Modal, Table
- `src/components/form/` - Input, Label, Select, TextArea, Checkbox, Radio, Switch, DatePicker, MultiSelect
- `src/components/common/` - ThemeToggle, ComponentCard, PageBreadCrumb, ScrollToTop
- `src/components/charts/` - BarChart, LineChart (com ApexCharts)
- `src/components/tables/` - BasicTable
- `src/layout/` - AppHeader, AppSidebar, AppLayout, Backdrop

**❌ PROIBIDO:** Shadcn/UI, Radix UI, Material-UI, ou qualquer outro component library
**✅ PERMITIDO:** Apenas componentes copiados EXATAMENTE do TailAdmin (path acima)

**TailAdmin Exact Colors (CSS Variables):**
- Primary: `#3C50E0` (HSL: 231 71% 56%)
- Auth Background: `#1C2434` (brand-950)
- All color tokens are updated in `client/src/index.css` for both light and dark modes.

**TailAdmin Modal System:**
Implemented using React Portal and wrapper components. Modal renders via `createPortal` into `#modal-root` with proper z-index layering (`z-[9999]`). CSS fixes ensure modals appear above all elements (sidebar/header z-100). Dialog wrapper (Dialog/DialogTrigger/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter) maintains Shadcn API but renders TailAdmin Modal internally. Styling: `max-w-3xl` for dialogs, `rounded-3xl` border radius, `backdrop-blur-[32px]` with `bg-gray-400/50`, `shadow-xl`. Full keyboard accessibility (Escape key), focus management, and pointer-events handling.

**Login Page:**
Replicates the TailAdmin SignInForm with a two-column layout (form on left, brand section on right). The brand section features a `bg-brand-950` background with a Calendar icon logo and project text. Social logins and a back button are explicitly removed.

**Calendar Page:**
Utilizes FullCalendar with TailAdmin styling, supporting full CRUD operations for appointments. It includes text truncation for events, frontend validation, backend integration with TanStack Query cache invalidation, multi-service support with duration calculation, and robust conflict detection to prevent overlapping bookings.

**DatePicker Component (Flatpickr):**
Implemented `client/src/components/ui/date-picker.tsx` using Flatpickr for professional date/time selection. Supports both `date` and `time` modes with 24-hour format and Brazilian localization. **Critical closure fix**: Separate useEffect updates onChange handler via `flatpickrRef.current.set("onChange", ...)` to prevent form field wiping when selecting dates. Integrated in ClientDialog and AppointmentDialog.

**Production Bug Fixes (Nov 2025):**
1. **Cache Invalidation Race Conditions**: All mutations in ClientsPage and CalendarPage now use `async/await queryClient.invalidateQueries()` to ensure cache updates complete before dialogs close, preventing stale data and "item disappeared" bugs.
2. **Premature Dialog Closures**: Removed `onOpenChange(false)` from submit handlers in AppointmentDialog. Parent components now control dialog closure after mutation success, ensuring errors are properly displayed.
3. **DatePicker Closure Bug**: Fixed critical issue where selecting dates would wipe other form fields. Solution: Second useEffect dynamically updates Flatpickr's onChange callback, preventing closure over stale form state.

**Schema Corrections (Nov 2025):**
1. **Clients Table**: Removed `email` field completely (not used in the application). Table structure: id, tenant_id, name, phone (NOT NULL), birthdate (nullable).
2. **Appointments Table**: Added `duration` field (integer, NOT NULL) to store total appointment duration. Backend automatically calculates duration by summing selected services' durations.
3. **Phone Field**: Enforced as NOT NULL in both schema and database to maintain business logic integrity (uniquePhonePerTenant constraint, getClientByPhone queries).
4. **Duration Calculation**: `insertAppointmentSchema` omits `duration` field (auto-calculated server-side in `DbStorage.createAppointment`), preventing frontend from manually setting values.

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation enforced via `tenantId` and middleware.
- **Authentication**: Secure login with `express-session` and `bcrypt` for web sessions, and token-based for API.
- **User Management**: `master_admin`, `admin`, and `user` roles with defined access levels.
- **API Design**: Comprehensive RESTful API for CRUD operations, filtering, and N8N compatibility.
- **Data Validation**: Zod for robust schema validation.
- **Core Features**: Multi-tenant, secure auth, master admin panel, user/service management, appointment scheduling/editing, business hours, availability, full REST API.
- **Advanced Features**: Appointment conflict detection, flexible business hours, availability API, secure API token system, role-based access control, dynamic API documentation, bulk service import, detailed calendar views, client phone uniqueness, multi-service appointments (total duration calculation), and promotional pricing with date-based activation.
- **Troubleshooting Tools**: Master admin tools for correcting "orphan appointments" and managing service visibility.

### Production Security (PRODUCTION-READY ✅)
**CRITICAL REQUIREMENTS:**
- **SESSION_SECRET**: MANDATORY environment variable (min 32 characters)
  - NO fallback - application fails immediately if not set
  - Generate with: `openssl rand -base64 32`
  - Production enforces minimum entropy (32 chars)

**Security Measures Implemented:**
1. **Session Security**:
   - httpOnly cookies (prevents XSS)
   - secure: true in production (HTTPS only)
   - sameSite: 'strict' in production (CSRF protection)
   - 7-day session lifetime

2. **Rate Limiting** (express-rate-limit):
   - Auth endpoints: 5 attempts / 10 minutes
   - API endpoints: 100 requests / 15 minutes
   - CSV uploads: 10 uploads / hour
   - RFC-compliant headers (RateLimit-*)
   - Skip successful auth attempts

3. **Trust Proxy Configuration** (CRITICAL):
   - **Replit Environment**: Trust proxy AUTO-ENABLED (detects REPL_ID/REPLIT_DB_URL)
   - **Production**: Trust proxy AUTO-ENABLED (NODE_ENV=production)
   - **Local Development**: Trust proxy DISABLED (prevents IP spoofing)
   - **Manual Override**: Set ENABLE_TRUST_PROXY=true if needed
   - Prevents rate limit bypass via X-Forwarded-For spoofing
   - Replit always uses reverse proxy, so trust is required in dev and prod

4. **Input Validation** (Zod):
   - All POST/PUT endpoints validated
   - Login: loginSchema (username, password)
   - Setup: setupSchema (username, name, email, password min 6 chars)
   - Structured error responses with details

5. **File Upload Security** (CSV):
   - Max file size: 5MB
   - Max rows: 1000 services per upload
   - Strict type validation (CSV only)
   - Empty file detection
   - MulterError handling

6. **Environment Variables**:
   - SESSION_SECRET (required, min 32 chars)
   - NODE_ENV (production/development)
   - DATABASE_URL (PostgreSQL connection)
   - ENABLE_TRUST_PROXY (optional, auto-enabled in production)

**Deployment Checklist:**
- [ ] Set SESSION_SECRET environment variable (≥32 chars)
- [ ] Set NODE_ENV=production
- [ ] Configure DATABASE_URL for production database
- [ ] Enable HTTPS on hosting platform
- [ ] Configure trust proxy if behind reverse proxy
- [ ] Test rate limiting behavior
- [ ] Verify secure cookies are set
- [ ] Run smoke tests (login, API calls, CSV import)

### System Design Choices
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend State Management**: TanStack Query.
- **Schema Management**: Shared schemas (`shared/schema.ts`) using Drizzle and Zod ensure consistency.

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