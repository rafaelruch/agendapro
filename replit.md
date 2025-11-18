# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS system designed for appointment management. It enables multiple businesses to operate on a single platform with complete data isolation, each managing their own clients, services, appointments, and users. The platform includes a comprehensive REST API for integration with N8N and other automation tools, aiming to provide a robust, scalable, and secure solution for efficient scheduling operations in the service industry.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

**IMPORTANT: Documentation Update Rule**
Whenever ANY new feature or implementation is added to the system, it MUST be documented in the Master Admin API Documentation (`client/src/components/ApiDocumentation.tsx`). This ensures that:
1. All API endpoints are properly documented with examples
2. Integration tools like N8N have accurate reference documentation
3. Future development is easier with up-to-date API documentation
4. The development process is more efficient and organized

Always update the API documentation immediately after implementing new features, endpoints, or modifying existing functionality.

## Design System & Component Libraries

### Component Libraries (Already Installed)
The application uses the following React-native libraries for building the interface:
- **Radix UI** (https://www.radix-ui.com/) - Headless, accessible UI primitives (base for Shadcn)
- **Shadcn UI** (https://www.shadcn.io/) - Re-usable components built on Radix UI and Tailwind CSS
- **Ant Design** (https://ant.design/) - Additional component reference for complex UI patterns

### Dashboard Design Reference
For the **tenant dashboard** (client-facing interface), use **TailAdmin React** as the primary visual and layout reference:
- **TailAdmin React**: https://tailadmin.com/react
- **Live Demo**: https://react-demo.tailadmin.com/
- **GitHub Repository**: https://github.com/TailAdmin/free-react-tailwind-admin-dashboard
- **Documentation**: https://tailadmin.com/docs/components/react

### Implementation Guidelines

#### Tenant Dashboard (Client Interface)
**Use TailAdmin React design patterns for:**
1. **Login Page**: Implement using TailAdmin's Sign In page design
   - Clean, centered layout
   - Professional authentication forms
   - Light/dark mode support
   
2. **Dashboard Layout**: Follow TailAdmin's dashboard structure
   - Collapsible sidebar navigation
   - Header with notifications, messages, user dropdown
   - Breadcrumb navigation
   - Card-based data display
   - Charts and data visualization using ApexCharts
   - Responsive layout for mobile/tablet/desktop

3. **UI Components to Adapt**:
   - **Layout**: Sidebar, Header, Breadcrumb
   - **Data Display**: Cards, Tables, Charts, Badges
   - **Forms**: Input fields, Select dropdowns, Date pickers, Checkboxes
   - **Feedback**: Alerts, Modals, Toast notifications
   - **Navigation**: Tabs, Accordion, Pagination

#### Master Admin Panel
**DO NOT CHANGE** the existing master admin panel - it is working correctly and should remain as is.

### Adaptation Strategy
While TailAdmin provides a visual reference, we **DO NOT install TailAdmin** as a dependency. Instead:
1. **Reference the design** from TailAdmin demos and screenshots
2. **Implement using our existing stack**: Shadcn UI + Radix UI + Tailwind CSS
3. **Match the visual aesthetic**: Colors, spacing, layouts, component styles
4. **Adapt patterns**: Convert TailAdmin examples to Shadcn/Radix equivalents

### Key Visual Elements from TailAdmin
- **Color Scheme**: Professional blues and neutrals with semantic colors (success green, warning yellow, danger red)
- **Typography**: Clean, readable fonts with clear hierarchy
- **Spacing**: Consistent padding and margins (4px, 8px, 16px, 24px scale)
- **Cards**: Subtle shadows and borders with rounded corners
- **Dark Mode**: Full dark theme support across all components
- **Responsiveness**: Mobile-first design with collapsible navigation

## System Architecture
The system employs a multi-tenant SaaS architecture with a distinct separation between frontend and backend.

### UI/UX Decisions
The frontend is built with React, TypeScript, Wouter for routing, and Tailwind CSS with Shadcn UI for a modern, responsive design, including light and dark themes. Key UI components include dedicated pages for authentication, administration, dashboards, calendar views, client/service/user management, and system settings.

### Technical Implementations
- **Multi-Tenant Architecture**: Data isolation is achieved using a `tenantId` field across all critical database tables, with middleware enforcing tenant-specific data access.
- **Authentication**: Secure login utilizes `express-session` and `bcrypt` for web sessions, and token-based authentication (Bearer tokens) for API integrations, with encrypted and manageable API tokens.
- **Hierarchical User Management**: Features `master_admin`, `admin`, and `user` roles, each with defined access levels for UI and API endpoints.
- **API Design**: A comprehensive RESTful API supports CRUD operations for core entities. It uses query parameters for filtering and single resource lookups for enhanced integration compatibility, particularly with tools like N8N.
- **Data Validation**: Zod is used for robust data validation throughout the system.
- **Core Features**: Includes multi-tenant support, secure authentication, master admin panel, per-tenant user/service management, appointment scheduling and editing, business hours configuration, availability checking, and a full REST API.
- **Advanced Features**: Appointment editing with conflict detection, flexible business hours management, an availability API, a secure API token system, role-based access control, a master admin panel for cross-tenant management and migrations, dynamic API documentation with schema alignment, bulk service import, detailed calendar appointment views, and client phone uniqueness validation.
- **Multi-Service Appointments**: Each appointment can have multiple services associated via the `appointment_services` junction table. The system automatically calculates total duration by summing individual service durations and displays appointment time ranges (e.g., "14:00-16:00" for 120 minutes total). The API enriches all appointment responses with a `serviceIds` array for consistent frontend consumption. Appointments without associated services display only the start time (robust fallback for data integrity).
- **Promotional Pricing for Services**: Services support optional promotional pricing with date-based activation. Each service can have `promotionalValue`, `promotionStartDate`, and `promotionEndDate` fields. The system automatically applies promotional pricing when the current date falls within the promotion period, displaying visual indicators (green badge, strikethrough original price) in UI and using promotional values in appointment calculations. Validation ensures atomic promotion management (all three fields required together or none) preventing inconsistent data states. Frontend and backend enforce data integrity through multi-layer validation (UI normalization, backend pre-validation normalization, schema validation, post-validation atomic clearing).

### System Design Choices
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Frontend State Management**: TanStack Query.
- **Schema Management**: Shared schemas (`shared/schema.ts`) using Drizzle and Zod ensure consistency.

## External Dependencies
- **Database**: PostgreSQL (e.g., Neon).
- **ORM**: Drizzle ORM.
- **Backend Framework**: Express.js.
- **Frontend Framework**: React.
- **Styling**: Tailwind CSS, Shadcn UI.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Password Hashing**: Bcrypt.
- **Session Management**: Express-session.
- **Data Validation**: Zod.
- **Integration**: N8N.