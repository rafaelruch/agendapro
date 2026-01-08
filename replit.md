# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS appointment management system designed for businesses. It provides comprehensive tools for managing clients, services, professionals, and appointments, ensuring complete data isolation between tenants. The platform includes a robust REST API for integration with automation tools like N8N, a full-featured financial module, and advanced scheduling capabilities. Its primary goal is to offer a scalable, secure, and versatile scheduling and business management solution for the service industry. The project aims to be a leading platform for businesses to streamline operations and enhance customer interaction.

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
The UI exclusively uses components from `attached_assets/free-react-tailwind-admin-dashboard-main/` and adheres to TailAdmin color schemes. A custom React Portal-based modal system is implemented. The login page mirrors TailAdmin's SignInForm, and the calendar utilizes FullCalendar with TailAdmin styling, supporting CRUD operations for appointments, conflict detection, and multi-service duration calculation. Date picking is managed by `react-day-picker` with `ptBR` locale, supporting various selection modes and invalid date validation. All data tables maintain a standardized structure consistent with `ServicesPage`/`ClientsPage`.

### Technical Implementations
- **Multi-Tenancy**: Data isolation is enforced via `tenantId` and middleware.
- **Authentication & Authorization**: `express-session` and `bcrypt` for web sessions; token-based for API. Role-based access control (`master_admin`, `admin`, `user`) defines access levels.
- **API Design**: A RESTful API supports CRUD operations, filtering, and N8N compatibility. Zod is used for data validation.
- **Core Features**: Secure authentication, Master Admin panel, user/service/professional management, appointment scheduling with conflict detection, flexible business hours, availability API, and dynamic API documentation.
- **Advanced Features**: Multi-service appointments with total duration calculation, promotional pricing, professional management with multi-interval schedules, and a multi-address system for clients.
- **Tenant Module Permissions**: A system for enabling/disabling specific functionalities per tenant, defined in `shared/schema.ts` and enforced by backend middleware and UI.
- **Financial Module**: Manages income/expenses, supports automatic transactions from orders/appointments, manual entries, customizable categories, and multiple payment methods.
- **Webhook System**: Provides tenant-scoped webhook configuration for automation tools like N8N. Features HMAC-SHA256 signature authentication, delivery tracking with retry mechanisms, and supports various modules and events (create, update, delete). Webhooks can be managed by both tenant admins and the Master Admin.
- **AI Analytics Module**: Offers AI-powered customer service metrics via a dashboard connected to per-tenant Supabase databases. Tenants configure their Supabase connection, which stores conversation and message data for analysis, trends, and quality metrics. Requires `ai-analytics` module permission.
- **Public Menu System**: Enables tenants to create a public catalog page (`/menu/{slug}`) for either "delivery" (products/orders) or "services" (appointments). Features customizable branding, product categories, and a multi-step appointment booking flow with real-time availability and conflict prevention.
- **Production Deployment**: Managed on Easypanel. Database migrations are handled via a Master Admin SQL Migration panel, using idempotent scripts (`migrations/production_safe_migration.sql`) to ensure schema consistency.

### System Design Choices
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend**: React.
- **State Management**: TanStack Query.
- **Schema Management**: Shared schemas (`shared/schema.ts`) using Drizzle and Zod.
- **Deployment**: Easypanel.

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Backend Framework**: Express.js
- **Frontend Framework**: React
- **Styling**: Tailwind CSS, TailAdmin UI
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Password Hashing**: Bcrypt
- **Session Management**: Express-session
- **Data Validation**: Zod
- **Integration**: N8N
- **Calendar**: FullCalendar
- **Date Picker**: `react-day-picker`