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
Implemented using wrapper components that maintain the Shadcn API but render TailAdmin Modals with specific styling (z-index `z-999999`, `max-w-3xl` for dialogs, `max-w-lg` for alert dialogs, `rounded-3xl` border radius, `backdrop-blur-[32px]` with `bg-gray-400/50`). This ensures full keyboard accessibility, focus management, and smooth TailAdmin animations.

**Login Page:**
Replicates the TailAdmin SignInForm with a two-column layout (form on left, brand section on right). The brand section features a `bg-brand-950` background with a Calendar icon logo and project text. Social logins and a back button are explicitly removed.

**Calendar Page:**
Utilizes FullCalendar with TailAdmin styling, supporting full CRUD operations for appointments. It includes text truncation for events, frontend validation, backend integration with TanStack Query cache invalidation, multi-service support with duration calculation, and robust conflict detection to prevent overlapping bookings.

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation enforced via `tenantId` and middleware.
- **Authentication**: Secure login with `express-session` and `bcrypt` for web sessions, and token-based for API.
- **User Management**: `master_admin`, `admin`, and `user` roles with defined access levels.
- **API Design**: Comprehensive RESTful API for CRUD operations, filtering, and N8N compatibility.
- **Data Validation**: Zod for robust schema validation.
- **Core Features**: Multi-tenant, secure auth, master admin panel, user/service management, appointment scheduling/editing, business hours, availability, full REST API.
- **Advanced Features**: Appointment conflict detection, flexible business hours, availability API, secure API token system, role-based access control, dynamic API documentation, bulk service import, detailed calendar views, client phone uniqueness, multi-service appointments (total duration calculation), and promotional pricing with date-based activation.
- **Troubleshooting Tools**: Master admin tools for correcting "orphan appointments" and managing service visibility.

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