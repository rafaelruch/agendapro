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

A custom modal system is implemented using React Portals, rendering into `#modal-root` with high z-index and `backdrop-blur-[32px]` for a professional look. The login page replicates the TailAdmin SignInForm, and the calendar page uses FullCalendar with TailAdmin styling, supporting full CRUD for appointments, conflict detection, and multi-service duration calculation. **Date picking is handled by react-day-picker (replaces Flatpickr) with ptBR locale, weekStartsOn: 0 (Domingo), and correct day-of-week calculation**.

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

Recent production bug fixes addressed cache invalidation race conditions, premature dialog closures, and DatePicker interaction issues. **CRITICAL FIX (Nov 2025):** Replaced Flatpickr with react-day-picker due to incorrect day-of-week calculations (22/Nov/2025 was showing as Wednesday instead of Saturday). Schema corrections include removing the `email` field from the Clients table, adding a `duration` field to Appointments, and enforcing `phone` as NOT NULL. A critical bug fix ensures that appointment `duration` is correctly calculated and persisted to the database during creation and updates. **Professional assignment now displays correctly in AppointmentDetailsDialog** with dedicated query and UI section.

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