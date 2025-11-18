# AgendaPro - Sistema SaaS Multi-Tenant de Gerenciamento de Agendas

## Overview
AgendaPro is a multi-tenant SaaS system designed for appointment management. It enables multiple businesses to operate on a single platform with complete data isolation, each managing their own clients, services, appointments, and users. The platform includes a comprehensive REST API for integration with N8N and other automation tools, aiming to provide a robust, scalable, and secure solution for efficient scheduling operations in the service industry.

## User Preferences
I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before making any major architectural changes or significant feature implementations. Ensure all code is well-documented and follows best practices.

## Design System Reference
The application uses **ngx-admin** as the primary visual design reference:
- **Reference Repository**: https://github.com/akveo/ngx-admin
- **Live Demo**: https://akveo.github.io/ngx-admin/
- **Documentation**: https://akveo.github.io/ngx-admin/docs/

### Theme Configuration
- **Light Mode**: ngx-admin "Corporate" theme - Professional, neutral tones with clean, modern aesthetic
- **Dark Mode**: ngx-admin "Dark" theme - Dark backgrounds with optimized contrast for extended use

### Design Adaptation
While ngx-admin is an Angular template, we adapt its visual design language to our React/Shadcn/Tailwind stack:
- **Component Library**: Shadcn UI components styled to match ngx-admin's visual aesthetic
- **Layout Patterns**: Dashboard layouts, sidebars, cards, and data tables following ngx-admin structure
- **Authentication**: Login and registration pages inspired by ngx-admin auth screens
- **Color Palette**: Corporate theme colors adapted to our Tailwind CSS configuration
- **Typography**: Clean, professional typography matching ngx-admin's readability standards
- **Charts & Data Visualization**: Data presentation following ngx-admin dashboard patterns
- **Responsive Design**: Mobile-first approach consistent with ngx-admin's responsive behavior

### Key Visual Elements from ngx-admin
- Clean, card-based layouts with subtle shadows
- Professional color scheme (blues, greens for success, reds for alerts)
- Consistent spacing and padding
- Status cards with icons and metrics
- Data tables with sorting and filtering
- Modal dialogs and notifications
- Form layouts with clear labels and validation
- Header with theme toggle and user profile
- Collapsible sidebar navigation

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