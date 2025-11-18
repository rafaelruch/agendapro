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

## System Architecture
The system employs a multi-tenant SaaS architecture with a distinct separation between frontend and backend.

### UI/UX Decisions
The frontend uses React, TypeScript, Wouter for routing, and Tailwind CSS with Shadcn UI for a modern, responsive design, including light and dark themes. Key UI components include dedicated pages for authentication, administration, dashboards, calendar views, client/service/user management, and system settings.

**IMPORTANT: TailAdmin CRM EXACT Replication:**
The dashboard layout and styling are EXACTLY replicated from TailAdmin CRM template, not just "inspired". This ensures professional, production-ready UI/UX.

**TailAdmin Exact Colors (CSS Variables):**
- Primary: `#3C50E0` (HSL: 231 71% 56%) - TailAdmin exact blue
- Success/meta-3: `#10B981`
- Warning/meta-2: `#FFA500`
- Stroke: `#E2E8F0`
- Boxdark: `#24303F`
- All color tokens updated in `client/src/index.css` for both light and dark modes

**Header (EXACT TailAdmin):**
- Search bar on the left side
- Notifications, Messages, and Profile dropdowns on the right side
- TailAdmin classes: `border-stroke dark:border-strokedark bg-white dark:bg-boxdark`
- Sticky positioning with z-index 999
- Shadow and border styling matching TailAdmin exactly

**Sidebar (EXACT TailAdmin):**
- Logo with version badge "v1.0"
- Menu groups: MENU, GESTÃO, ADMINISTRAÇÃO (uppercase labels)
- TailAdmin exact spacing: `px-4 py-4`, `px-6 py-5.5`
- Hover states: `hover:bg-graydark dark:hover:bg-meta-4`
- Active state highlighting with `bg-sidebar-accent`

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
- **Styling**: Tailwind CSS, Shadcn UI, Radix UI.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Password Hashing**: Bcrypt.
- **Session Management**: Express-session.
- **Data Validation**: Zod.
- **Integration**: N8N.