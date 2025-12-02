# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS appointment management system for businesses, offering tools for managing clients, services, professionals, and appointments with complete data isolation. It features a robust REST API for integration with automation tools like N8N, aiming to be a scalable and secure scheduling solution for the service industry. The platform includes a comprehensive financial module for managing income and expenses, supporting various payment methods and automatic transaction generation from orders and appointments.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

Whenever ANY new feature or implementation is added to the system, it MUST be documented in the Master Admin API Documentation (`client/src/components/ApiDocumentation.tsx`). This ensures that:
1. All API endpoints are properly documented with examples
2. Integration tools like N8N have accurate reference documentation
3. Future development is easier with up-to-date API documentation
4. The development process is more efficient and organized

Always update the API documentation immediately after implementing new features, endpoints, or modifying existing functionality.

## System Architecture

### UI/UX Decisions
All UI components are exclusively sourced from `attached_assets/free-react-tailwind-admin-dashboard-main/` and utilize TailAdmin color schemes. A custom React Portal-based modal system is implemented. The login page replicates TailAdmin SignInForm, and the calendar page uses FullCalendar with TailAdmin styling, supporting CRUD operations for appointments, conflict detection, and multi-service duration calculation. Date picking is handled by `react-day-picker` with `ptBR` locale, supporting single/multiple/range/time modes with invalid date validation.

All data tables throughout the system must adhere to a standardized structure for containers, headers, bodies, cells, empty states, pagination, search bars, and action buttons, mirroring the patterns found in `ServicesPage`/`ClientsPage`.

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation enforced via `tenantId` and middleware.
- **Authentication**: `express-session` and `bcrypt` for web sessions; token-based for API.
- **User Management**: `master_admin`, `admin`, and `user` roles with access levels.
- **API Design**: RESTful API for CRUD, filtering, and N8N compatibility.
- **Data Validation**: Zod for schema validation.
- **Core Features**: Multi-tenant, secure auth, master admin panel, user/service/professional management, appointment scheduling/editing, business hours, availability, full REST API.
- **Advanced Features**: Appointment conflict detection, flexible business hours, availability API, secure API token system, role-based access control, dynamic API documentation, bulk service import, detailed calendar views, client phone uniqueness, multi-service appointments (total duration calculation), promotional pricing, professional management with flexible multi-interval schedules and assignment.
- **Multi-Address System**: Clients can have multiple saved addresses. Orders reference `clientAddressId` and store address snapshots for immutability.
- **Tenant Module Permissions**: A system enabling/disabling specific functionalities (modules) per tenant, defined in `shared/schema.ts` and enforced by backend middleware and UI components. New modules must be registered in `MODULE_DEFINITIONS`, have protected backend routes, and be reflected in the Sidebar.
- **Financial Module**:
    - **Functionalities**: Dashboard, automatic transactions from orders/appointments, manual expense/income registration, customizable categories, multiple payment methods, discounts, filtering.
    - **API Endpoints**: CRUD for categories and manual transactions, transaction listing with filters, financial summary, appointment payment registration.
    - **Integration**: Automatic revenue transactions created upon order delivery or appointment payment registration.

### Production Deployment & Migrations
The application is deployed on Easypanel, not Replit. Production database migrations are managed via the Master Admin SQL Migration panel. Any new tables or schema modifications require generating a corresponding SQL script to be executed in production. This includes updates to `shared/schema.ts`, SQL script generation, and documentation for the Master Admin panel.

### System Design Choices
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend State Management**: TanStack Query.
- **Schema Management**: Shared schemas (`shared/schema.ts`) using Drizzle and Zod.
- **Deployment**: Easypanel.

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
- **Calendar**: FullCalendar.
- **Date Picker**: `react-day-picker`.