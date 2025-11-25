# Front Desk Management System

## Overview

This is a comprehensive front desk management system for Queen City Elite LLC concierge agents. It tracks daily operations across multiple properties, including guest check-ins, resident-specific package tracking with detailed location, daily duties, and shift notes. The system centralizes package management (carrier, tracking, storage), maintains detailed daily reports, and automates email and PDF reports to management. Key capabilities include managing 11 Queen City Elite properties, dynamic property addition, and robust package status tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for lightweight client-side routing.
- **UI Components**: Radix UI primitives with shadcn/ui components.
- **Styling**: Tailwind CSS with CSS variables.
- **State Management**: TanStack Query (React Query) for server state management and caching.
- **Form Handling**: React Hook Form with Zod validation.

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints.
- **Language**: TypeScript throughout the full stack.
- **Data Validation**: Zod schemas shared between client and server.
- **File Structure**: Modular architecture with separate routing, storage, and utility layers.

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations.
- **Connection**: Neon Database serverless PostgreSQL via standard `pg` driver with connection pooling.
- **Schema Management**: Drizzle Kit for migrations.
- **Data Models**: Comprehensive schema for Properties, Daily Reports, Guest Check-ins, Resident-based Package Audits (with status tracking), Daily Duties, Shift Notes, Property-specific Email Settings, Resident Directory, Duty Templates, and User accounts (managers/admins).

### Authentication and Authorization
- **Session Management**: `connect-pg-simple` for PostgreSQL-backed session storage.
- **Security**: Express session middleware with secure cookie configuration.
- **User Authentication**: Username-based login with bcrypt hashing, forced password changes on first login, and manager dashboard with profile and password change functionality.
- **Password Reset System** (November 2025):
  - **Email-Based Recovery**: Secure password reset via email links with one-hour expiration tokens
  - **Security Features**: 
    - Secure random token generation (32-byte cryptographic tokens)
    - One-time use tokens that are invalidated after successful reset
    - Generic success messages to prevent account enumeration
    - Graceful SMTP failure handling (errors logged, not exposed to users)
  - **User Experience**: 
    - Forgot Password page accessible from login screen
    - Reset link sent to registered email addresses
    - Password requirements enforced (10+ chars, uppercase, lowercase, digit)
    - Visual password strength indicators and requirements checklist
  - **Manager Email Addresses**: All 5 manager accounts configured with @queencityelite.com domain emails
  - **Admin Fallback**: Reset URLs logged to server console when SMTP fails (admin can manually provide links)

### Key Features and Implementations
- **Resident-Based Package Tracking**: Detailed package information per resident, including room number, storage location, carrier, tracking number, and status (`active`, `picked_up`, `returned_to_sender`).
- **Dynamic Property Management**: Ability to add new properties with names and addresses, and configure property-specific email recipients.
- **Reporting Enhancements**: Updated PDF and email reports to include resident-specific package details and status.
- **Package Status Tracking System**: Workflow based on package statuses, providing a complete audit trail and real-time summary dashboard.
- **Shift Switching Protection**: Prevents overwriting of original report creator's details; agents can add to existing reports while preserving creator info. Shift times are managed via a dropdown with predefined options.
- **Auto-Send Report Scheduling** (November 2025):
    - **Node-Cron Integration**: Automated report sending at shift end times using node-cron
    - **Scheduled Tasks**: 
      - 7:00 AM - Auto-send 3rd shift reports (11pm-7am)
      - 3:00 PM - Auto-send 1st shift reports (7am-3pm)
      - 11:00 PM - Auto-send 2nd shift reports (3pm-11pm)
    - **Shift Tracking**: Reports track currentShift and shiftStatus to prevent duplicate sends
    - **Email Recipients**: Uses existing email settings configuration for each property
    - **Manual Backup**: "/api/reports/:id/send-now" endpoint for manual report sending
- **Shift Handoff Management** (November 2025):
    - **Automatic Shift Detection**: System automatically detects current shift based on time (7am-3pm = 1st, 3pm-11pm = 2nd, 11pm-7am = 3rd)
    - **Shift Status Tracking**: Reports track individual shift statuses with completion timestamps
    - **End Shift API**: POST /api/reports/:id/end-shift archives shift data and marks as completed
    - **Current Report Endpoint**: GET /api/reports/current/:propertyId retrieves or creates current shift's report
    - **Shift Change Detection**: Frontend detects when shift time changes and alerts agents for handoff
    - **Database Fields**: currentShift (tracks active shift) and shiftStatusJson (tracks completion status per shift)
- **Company Newsletter & Announcements** (November 2025):
    - **Public Announcements Page**: Reverse chronological display with pinned announcements, search/filter by category, "NEW" badges for recent posts (7 days), category badges with icons, smart date formatting, HTML content rendering, mark-as-read functionality
    - **Admin Editor**: Full CRUD operations for creating/editing/deleting announcements with draft/publish workflow, preview functionality, HTML content sanitization using sanitize-html library for XSS protection
    - **Categories**: Company Update, Recognition, Policy Change, Event, Celebration, General (each with distinct icons and colors)
    - **Security**: HTML sanitization in both POST and PATCH endpoints, admin-only access for management, proper authentication/authorization
    - **User Experience**: Unread count badge in navigation with pulse animation, visual indicators for unread announcements, mobile-responsive design, skeleton loading states
    - **Database**: PostgreSQL with announcements and announcement_reads tables, proper indexes for performance, unique constraint on read tracking
- **Manager Dashboard**:
    - **Resident Directory**: Property-based resident management (apartment number, name, email, phone) with auto-fill for package entry. Supports bulk import via CSV/Excel with column mapping.
    - **Daily Task Templates**: Customizable, property-specific duty templates with shift assignments and display order.
    - **Agent Shift Assignments**: Managers can assign agents to specific shifts per property, enabling automatic agent name population in new reports based on current time and shift.
- **API Endpoints**: Comprehensive RESTful APIs for resident management, duty templates, agent shifts, authentication, and announcements.

## External Dependencies

### Database and Storage
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database operations.

### UI and Design System
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework with custom gradient utilities.
- **Lucide React**: Icon library.
- **Google Fonts**: Inter font family.
- **Modern Design Enhancements** (November 2025):
  - **Gradient Backgrounds**: Multi-color gradient headers for visual hierarchy
    - Main Header: Blue gradient (slate-to-blue)
    - Guest Check-ins: Green gradient (emerald-to-green)
    - Package Tracking: Orange gradient (amber-to-orange)
    - Daily Duties: Red-orange gradient (orange-to-red)
    - Shift Notes: Yellow-amber gradient
  - **Animated Elements**: 
    - Pulsing status indicator (green dot) in main header
    - Time badge with live clock display
    - Smooth hover effects on buttons and cards
    - Card lift animations on hover
  - **Enhanced Buttons**: Gradient button styles with hover animations and shadow effects
  - **Mobile Responsiveness**: Touch-friendly controls (44px min-height), responsive grids, optimized spacing
  - **Accessibility**: Enhanced focus states with visible outlines, proper ARIA labels
  - **Loading States**: Skeleton loading animations for better user experience

### Email and Document Generation
- **Nodemailer**: SMTP email sending.
- **PDFKit**: PDF document generation.
- **Date-fns**: Date manipulation and formatting.
- **Sanitize-HTML**: Server-side HTML sanitization for XSS protection.
- **node-cron**: Task scheduling for automated report sending at shift end times.

### Development Tools
- **Replit Integration**: Cartographer plugin.
- **ESBuild**: Fast bundling for production.
- **PostCSS**: CSS processing.

### Form and Data Handling
- **React Hook Form**: Performant form management.
- **Zod**: Runtime type validation and schema definition.
- **Class Variance Authority**: Type-safe CSS class composition.