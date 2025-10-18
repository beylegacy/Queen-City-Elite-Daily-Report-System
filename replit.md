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

### Key Features and Implementations
- **Resident-Based Package Tracking**: Detailed package information per resident, including room number, storage location, carrier, tracking number, and status (`active`, `picked_up`, `returned_to_sender`).
- **Dynamic Property Management**: Ability to add new properties with names and addresses, and configure property-specific email recipients.
- **Reporting Enhancements**: Updated PDF and email reports to include resident-specific package details and status.
- **Package Status Tracking System**: Workflow based on package statuses, providing a complete audit trail and real-time summary dashboard.
- **Shift Switching Protection**: Prevents overwriting of original report creator's details; agents can add to existing reports while preserving creator info. Shift times are managed via a dropdown with predefined options.
- **Manager Dashboard**:
    - **Resident Directory**: Property-based resident management (apartment number, name, email, phone) with auto-fill for package entry. Supports bulk import via CSV/Excel with column mapping.
    - **Daily Task Templates**: Customizable, property-specific duty templates with shift assignments and display order.
    - **Agent Shift Assignments**: Managers can assign agents to specific shifts per property, enabling automatic agent name population in new reports based on current time and shift.
- **API Endpoints**: Comprehensive RESTful APIs for resident management, duty templates, agent shifts, and authentication.

## External Dependencies

### Database and Storage
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database operations.

### UI and Design System
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Google Fonts**: Inter font family.

### Email and Document Generation
- **Nodemailer**: SMTP email sending.
- **PDFKit**: PDF document generation.
- **Date-fns**: Date manipulation and formatting.

### Development Tools
- **Replit Integration**: Cartographer plugin.
- **ESBuild**: Fast bundling for production.
- **PostCSS**: CSS processing.

### Form and Data Handling
- **React Hook Form**: Performant form management.
- **Zod**: Runtime type validation and schema definition.
- **Class Variance Authority**: Type-safe CSS class composition.