# Design Guidelines: SaaS Agenda Management Application

## Design Approach

**Selected Approach:** Hybrid - Material Design System with inspiration from Cal.com and Linear

**Justification:** This is a utility-focused productivity tool requiring information density with excellent usability. Material Design provides robust component patterns for data-heavy interfaces, while Cal.com and Linear offer modern SaaS aesthetics that users expect.

**Core Design Principles:**
1. Information clarity over decorative elements
2. Efficient multi-tenant workflows
3. Scannable data hierarchies
4. Immediate visual feedback for actions

## Typography System

**Font Stack:** Inter (primary), SF Mono (code/data)

**Hierarchy:**
- Page Titles: 32px, 600 weight
- Section Headers: 24px, 600 weight
- Card Titles: 18px, 500 weight
- Body Text: 15px, 400 weight
- Secondary/Meta: 13px, 400 weight
- Labels: 12px, 500 weight, uppercase with letter-spacing

## Layout System

**Spacing Primitives:** Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16

**Grid Structure:**
- Main Container: max-w-7xl with px-4 md:px-6 lg:px-8
- Sidebar: Fixed 280px (desktop), collapsible to 72px, full overlay on mobile
- Content Area: Flexible with proper padding (p-6 md:p-8)
- Card Spacing: gap-4 for grids, space-y-4 for stacks

## Component Library

### Navigation & Layout

**Top Bar (64px height):**
- Client selector dropdown (left)
- Search bar (center, max-w-md)
- User profile + notifications (right)
- Sticky position with subtle border-bottom

**Sidebar Navigation:**
- Dashboard, Calendar, Clients, Settings sections
- Icon + label layout with hover states
- Active state: Background highlight with left border accent
- Collapsible with icon-only mode

### Dashboard Components

**Calendar Views:**
- Month Grid: 7-column grid with date cells (aspect-square)
- Week View: Time slots (15-min increments) with horizontal lanes
- Day View: Single column with hourly divisions
- Appointments: Color-coded cards with time, client name, duration
- Today indicator: Prominent visual marker

**Statistics Cards:**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Metric value: Large (28px), bold
- Metric label: Small (13px), muted
- Trend indicator: Icon + percentage
- Minimal height: 120px with p-6

### Data Management

**Client List:**
- Table view with sortable columns: Name, Email, Total Appointments, Last Activity, Actions
- Row height: 64px with py-3
- Hover state: Subtle background change
- Bulk actions toolbar appears when rows selected

**Appointment Cards:**
- Compact: 80px height with time, client name, status badge
- Expanded: Additional notes, duration, edit/delete actions
- Status badges: Small (h-6), rounded-full, subtle backgrounds

### Forms & Inputs

**Form Layout:**
- Single column max-w-2xl for focused input
- Labels above inputs (mb-2)
- Input height: h-11 with px-4
- Date/time pickers: Native with fallback to custom Material-style pickers
- Multi-step forms: Progress indicator at top

**Modal Dialogs:**
- Centered overlay with max-w-lg
- Header: Title (20px) with close button
- Content: p-6 with proper spacing
- Footer: Action buttons right-aligned with gap-3

### Client Switcher

**Implementation:**
- Dropdown in top bar (w-64)
- Search within dropdown
- Recently accessed clients at top
- Add new client button at bottom
- Current client name always visible

## Interaction Patterns

**Loading States:**
- Skeleton screens for initial data loads
- Spinner overlays for actions (appointments CRUD)
- Optimistic UI updates with rollback on error

**Empty States:**
- Centered illustration (200px max)
- Helpful message (18px)
- Primary CTA button
- Used for: No appointments, no clients, filtered results

**Notifications:**
- Toast messages: Bottom-right corner
- Success: Green accent, 4s auto-dismiss
- Error: Red accent, manual dismiss required
- Info: Blue accent, 6s auto-dismiss

## Page Layouts

**Dashboard:**
- Quick stats row (4 cards)
- Today's schedule (left 2/3)
- Upcoming appointments sidebar (right 1/3)
- No hero section needed

**Calendar Page:**
- View switcher tabs (Month/Week/Day) top-left
- Filter controls top-right
- Full-width calendar grid
- Quick add button: Fixed bottom-right (fab pattern)

**Client Management:**
- Search + filters bar
- Table with pagination
- Side panel for client details (slides in from right)

**Appointment Form:**
- Modal overlay (create/edit)
- Fields: Client selector, Date/time, Duration, Notes, Status
- Smart scheduling: Show conflicts/availability

## Images

No hero images required for this application. This is a utility-focused dashboard where all screen real estate should support productivity.

**Icon Usage:** Material Icons via CDN for consistency across calendar, client, and action icons.

## Accessibility & Quality

- Keyboard navigation for all calendar interactions
- ARIA labels for date cells and appointments
- Focus indicators: 2px outline offset by 2px
- Color contrast: WCAG AA minimum for all text
- Screen reader announcements for CRUD operations