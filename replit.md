# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## 🚨 REGRA DE OURO - USAR SOMENTE TAILADMIN

**TODO O LAYOUT VISUAL É PARA SEGUIR O TAILADMIN SEM EXCEÇÃO**

- **Fonte única**: `attached_assets/free-react-tailwind-admin-dashboard-main/`
- **Componentes**: Usar SOMENTE componentes do TailAdmin
- **Código**: Copiar código EXATAMENTE como está nos arquivos do TailAdmin
- **Assets**: Usar SOMENTE imagens, SVGs e ícones do TailAdmin
- **Sem outras bibliotecas**: NÃO usar Shadcn, Material-UI, ou qualquer outra biblioteca de UI sem aprovação prévia
- **Documentação completa**: Ver `TAILADMIN_STRUCTURE.md` para estrutura completa do TailAdmin

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

## System Architecture
The system employs a multi-tenant SaaS architecture with a distinct separation between frontend and backend.

### UI/UX Decisions
The frontend uses React, TypeScript, Wouter for routing, and Tailwind CSS with **ONLY TailAdmin components** for a modern, responsive design, including light and dark themes. Key UI components include dedicated pages for authentication, administration, dashboards, calendar views, client/service/user management, and system settings.

**CRITICAL**: All UI components MUST be copied from TailAdmin (`attached_assets/free-react-tailwind-admin-dashboard-main/`). DO NOT use Shadcn, Material-UI, or any other component library without explicit approval.

**IMPORTANT: TailAdmin CRM EXACT Replication:**
The dashboard layout and styling are EXACTLY replicated from TailAdmin CRM template, not just "inspired". This ensures professional, production-ready UI/UX.

**TailAdmin Exact Colors (CSS Variables):**
- Primary: `#3C50E0` (HSL: 231 71% 56%) - TailAdmin exact blue
- Success/meta-3: `#10B981`
- Warning/meta-2: `#FFA500`
- Stroke: `#E2E8F0`
- Boxdark: `#24303F`
- Auth Background: `#1C2434` (brand-950) - Azul escuro exato
- All color tokens updated in `client/src/index.css` for both light and dark modes

**Componentes TailAdmin EXATOS Implementados:**
1. ✅ `GridShape.tsx` - Grid pattern para backgrounds (copiado de `attached_assets/.../src/components/common/GridShape.tsx`)
2. ✅ `ThemeTogglerTwo.tsx` - Toggle de tema circular (copiado de `attached_assets/.../src/components/common/ThemeTogglerTwo.tsx`)
3. ✅ `LoginPage.tsx` - Baseado em SignInForm + AuthPageLayout EXATOS
4. ✅ `auth-logo.svg` - Logo customizada mantendo estilo TailAdmin
5. ✅ `grid-01.svg` - Grid pattern SVG (copiado de `attached_assets/.../public/images/shape/grid-01.svg`)

**Header (EXACT TailAdmin - `client/src/App.tsx`):**
- **Structure**: `sticky top-0 z-99999 flex-col lg:flex-row lg:border-b`
- **Colors**: `bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800`
- **Toggle button**: Single `<SidebarTrigger>` responsive: `w-10 h-10 lg:h-11 lg:w-11 lg:border`
- **Search bar**: `h-11 w-full xl:w-[430px]` with ⌘K shortcut badge (text "⌘" and "K")
- **Focus states**: `focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10`
- **Right side**: Dark mode toggle, notifications, messages, profile (gap-2 2xsm:gap-3)

**Sidebar (EXACT TailAdmin - `client/src/components/AppSidebar.tsx`):**
- **Colors**: `bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800`
- **Logo header**: `px-5 py-8` with Calendar icon `text-brand-500`
- **Title**: `text-gray-800 dark:text-white/90` with version `text-gray-500 dark:text-gray-400`
- **MENU label**: `text-xs uppercase text-gray-400 mb-4`
- **Content padding**: `px-5` with `space-y-4` between items
- **Menu items**:
  - Default: `text-gray-700 dark:text-gray-400`
  - Hover: `hover:bg-gray-100 dark:hover:bg-white/5`
  - Active: `bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400`
  - Icons: `h-5 w-5`, padding: `px-4 py-2`, gap: `gap-2.5`, rounded: `rounded-lg`

**Dashboard Stats Cards (EXACT TailAdmin with Gradients):**
- 4 gradient cards with EXACT TailAdmin color schemes:
  1. Agendamentos Hoje: Blue gradient `from-[#3C50E0] to-[#6571F3]`
  2. Receita do Mês: Green gradient `from-[#10B981] to-[#34D399]`
  3. Clientes Ativos: Orange gradient `from-[#F59E0B] to-[#FBBF24]`
  4. Concluídos: Purple gradient `from-[#8B5CF6] to-[#A78BFA]`
- Icons in semi-transparent white circles: `bg-white/20 backdrop-blur-sm`
- White text: `text-white` with `text-white/90` for labels
- Texture overlay: Dotted pattern on top-right quadrant with mask and gradient fade
- TailAdmin exact spacing: `px-7.5 py-6`
- Dark mode variants for all gradients
- Revenue calculations respect promotional pricing based on appointment date (using date-fns parseISO)
- Percentage changes compare current vs previous month with proper date parsing
- Safe fallbacks for missing data (appointments without services, unknown clients)

**Statistics Chart (EXACT TailAdmin):**
- Tabs: Dia/Semana/Mês with TailAdmin styling (`bg-whiter dark:bg-meta-4`)
- Area chart with TailAdmin color #3C50E0
- CartesianGrid with `stroke="#E2E8F0"` and `vertical={false}`
- Chart container: `px-5 pb-5 pt-7.5 shadow-default`

**Top Services (EXACT TailAdmin):**
- Progress bars showing 3 most popular services
- TailAdmin layout with `gap-5` spacing
- Progress bar height: `h-1.5` with `bg-stroke dark:bg-strokedark`
- Color-coded dots and percentages

**Recent Appointments Table (EXACT TailAdmin Grid Layout):**
- Grid-based layout: `grid-cols-3 sm:grid-cols-5`
- Header background: `bg-gray-2 dark:bg-meta-4`
- Row padding: `p-2.5 xl:p-5`
- Rounded avatars: `h-12 w-12 rounded-full`
- Border between rows: `border-b border-stroke dark:border-strokedark`
- Edit and Complete buttons with hover states
- Status badges: Completo (green), Agendado (secondary), Cancelado (destructive)

**Custom TailAdmin Classes Added to tailwind.config.ts:**
- Spacing: `7.5`, `11.5`, `4.5`, `5.5`, `1.5`, `2.5`
- Typography: `text-title-md`, `text-title-lg`, `text-title-xl`, etc.
- Heights/Widths: `h-11.5`, `w-11.5`, `w-125` (31.25rem)
- Shadow variants: `shadow-default`, `shadow-card`, `shadow-drop-down`
- All metrics update in real-time with proper date parsing and promotional price calculations

**Login Page (EXACT TailAdmin SignInForm - `client/src/pages/LoginPage.tsx`):**
- **Structure**: Two-column layout (form on left, brand section on right)
- **NO back button** (removed as per TailAdmin design)
- **NO social logins** (Google/X buttons removed)
- **Brand Section Right Side**:
  - Background: `bg-brand-950 dark:bg-white/5` (#1C2434 - azul escuro exato do TailAdmin)
  - GridShape: Componente com grid-01.svg nos cantos (top-right e bottom-left)
  - Logo: `auth-logo.svg` customizada para AgendaPro (231x48px)
  - Texto: "Sistema de Gerenciamento de Agendas Multi-Tenant" em `text-gray-400 dark:text-white/60`
- **Form Fields**:
  - Usuário (username): `h-11` input with `shadow-sm` and focus states
  - Senha (password): `h-11` input with accessible toggle button (Eye/EyeOff icons)
  - Manter conectado: TailAdmin checkbox (state stored but not used in backend yet)
  - Esqueceu a senha?: link that shows toast message
  - Fale com o administrador: WhatsApp link (external)
- **Accessibility**: Password toggle is a `<button>` (not span) with dynamic `aria-label` ("Mostrar senha" / "Ocultar senha")
- **TailAdmin Classes**: All classes are valid Tailwind (shadow-sm, focus:ring-2, focus:outline-none, focus:ring-brand-500/10)
- **Theme Toggle**: Fixed bottom-right corner (TailAdmin ThemeTogglerTwo - circular, size-14, bg-brand-500)
- **Test IDs**: input-username, input-password, button-toggle-password, checkbox-keep-logged-in, button-forgot-password, link-whatsapp-admin, button-login

**Calendar Page (EXACT TailAdmin + Full CRUD Integration):**
- **Visual**: FullCalendar component with TailAdmin styling (month/week/day views)
- **Text Truncation**: CSS `truncate overflow-hidden` para evitar textos ultrapassarem células
- **CRUD Operations**:
  - CREATE: Click date → AppointmentDialog → Validate → Create appointment → Toast
  - READ: Appointments displayed as events on calendar
  - UPDATE: Click event → AppointmentDetailsDialog → Edit → Update appointment → Toast
  - DELETE: AppointmentDetailsDialog → Delete → Confirm → Remove appointment → Toast
- **Type Safety**: Uses `FrontendAppointmentData = Omit<InsertAppointment, 'tenantId'>` for frontend payloads (backend injects tenantId automatically from session)
- **Frontend Validation**: AppointmentDialog validates required fields (clientId, serviceIds min 1, date, time) before submitting
- **Backend Integration**: All mutations (create/update/delete) properly invalidate TanStack Query cache for real-time updates
- **Multi-Service Support**: Appointments can have multiple services with total duration calculation
- **Conflict Detection**: Backend prevents overlapping appointments based on calculated durations

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation is enforced using a `tenantId` field and middleware.
- **Authentication**: Secure login uses `express-session` and `bcrypt` for web sessions, and token-based authentication for API integrations.
- **Hierarchical User Management**: Features `master_admin`, `admin`, and `user` roles with defined access levels.
- **API Design**: A comprehensive RESTful API supports CRUD operations, filtering, and single resource lookups, designed for N8N compatibility.
- **Data Validation**: Zod is used for robust data validation.
- **Core Features**: Multi-tenant support, secure authentication, master admin panel, per-tenant user/service management, appointment scheduling and editing, business hours configuration, availability checking, and a full REST API.
- **Advanced Features**: Appointment editing with conflict detection, flexible business hours, availability API, secure API token system, role-based access control, dynamic API documentation, bulk service import, detailed calendar views, client phone uniqueness, multi-service appointments (calculating total duration), and promotional pricing for services with date-based activation.
- **Appointment Conflict Detection**: Prevents overlapping bookings using time-based overlap detection and precise duration calculations, providing detailed error information upon conflict.
- **Troubleshooting & Correction Tools**: Master admin tools exist for correcting "orphan appointments" (appointments without associated services) and ensuring service visibility based on user roles and tenant IDs.

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
- **Styling**: Tailwind CSS, TailAdmin UI (SOMENTE).
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Password Hashing**: Bcrypt.
- **Session Management**: Express-session.
- **Data Validation**: Zod.
- **Integration**: N8N.

## TailAdmin Reference
Para detalhes completos da estrutura do TailAdmin, consulte: **`TAILADMIN_STRUCTURE.md`**
