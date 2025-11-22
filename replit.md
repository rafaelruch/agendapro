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

A custom modal system is implemented using React Portals, rendering into `#modal-root` with high z-index and `backdrop-blur-[32px]` for a professional look. The login page replicates the TailAdmin SignInForm, and the calendar page uses FullCalendar with TailAdmin styling, supporting full CRUD for appointments, conflict detection, and multi-service duration calculation. Date picking is handled by Flatpickr, localized for Brazilian format.

All pagination implementations must follow a specific pattern, integrated directly within the table container, featuring numbered page buttons, "Anterior" and "Próximo" buttons, and specific text formatting for item counts.

Recent production bug fixes addressed cache invalidation race conditions, premature dialog closures, and DatePicker interaction issues. Schema corrections include removing the `email` field from the Clients table, adding a `duration` field to Appointments, and enforcing `phone` as NOT NULL. A critical bug fix ensures that appointment `duration` is correctly calculated and persisted to the database during creation and updates.

### Technical Implementations
- **Multi-Tenant Architecture**: Enforced data isolation via `tenantId` and middleware.
- **Authentication**: `express-session` and `bcrypt` for web sessions; token-based for API.
- **User Management**: `master_admin`, `admin`, and `user` roles with defined access levels.
- **API Design**: Comprehensive RESTful API for CRUD operations, filtering, and N8N compatibility.
- **Data Validation**: Zod for robust schema validation.
- **Core Features**: Multi-tenant, secure auth, master admin panel, user/service/professional management, appointment scheduling/editing, business hours, availability, full REST API.
- **Advanced Features**: Appointment conflict detection (including professional double-booking prevention), flexible business hours, availability API, secure API token system, role-based access control, dynamic API documentation, bulk service import, detailed calendar views, client phone uniqueness, multi-service appointments (total duration calculation), promotional pricing with date-based activation, **professional management with flexible multi-interval schedules, professional filtering in calendar, and professional-specific appointment assignment**.
- **Production Security**: Critical requirements include a mandatory, high-entropy `SESSION_SECRET` environment variable. Security measures include httpOnly, secure, and strict sameSite cookies; rate limiting on auth and API endpoints; trust proxy configuration for Replit and production environments; Zod-based input validation; and secure file upload handling for CSVs (max 5MB, 1000 rows, strict type validation).

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