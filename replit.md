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

**Dashboard Layout (TailAdmin CRM inspired):**
- **Stats Cards**: 4 cards showing key metrics (Agendamentos Hoje, Receita do Mês, Clientes Ativos, Agendamentos Concluídos) with trend indicators
  - Revenue calculations respect promotional pricing based on appointment date (using date-fns parseISO)
  - Percentage changes compare current vs previous month with proper date parsing
  - Safe fallbacks for missing data (appointments without services, unknown clients)
- **Area Chart**: Visual representation of appointments over the last 30 days using Recharts
- **Top Services**: Progress bars showing the 3 most popular services with percentage and count
- **Upcoming Appointments**: List of next 5 future appointments with client avatars and service names
- **Recent Appointments Table**: Interactive table with 5 most recent appointments
  - Edit button to modify appointment details
  - Complete button (✓) to mark scheduled appointments as completed
  - Status badges (Completo, Agendado, Cancelado)
  - Client avatars with initials
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