# Front Desk Management System

## Overview

This is a comprehensive front desk management system designed specifically for Queen City Elite LLC concierge agents to track daily operations across multiple properties. The system manages guest check-ins, resident-specific package tracking with room location details, daily duties, and shift notes. The application provides a centralized platform for front desk agents to track individual packages per resident (with carrier, tracking numbers, and storage locations), maintain detailed daily reports, and send automated reports to management via email and PDF.

## Recent Updates (October 2025)

### Package Tracking System Redesign
- **Resident-Based Tracking**: Complete redesign from location-based counting to individual resident package tracking
- **Detailed Package Information**: Each package now includes resident name, room number, storage location in the package room, carrier (UPS, FedEx, USPS, Amazon, DHL), tracking number, package type, received time, shift, and notes
- **Enhanced UI**: New form-based interface for adding packages with all required and optional fields
- **Package Management**: Ability to add and delete individual packages with real-time summary updates

### Property Management
- **11 Queen City Elite Properties Added**: Element South Park (North & South), The Resident At South Park, Ashton South End, Hazel South Park, The Ascher (North & South), Skye Condos, Lennox South Park, Inspire South Park, Ascent Uptown
- **Dynamic Property Addition**: New dialog interface allowing users to add additional properties on-the-fly with name and address
- **Property Address Tracking**: All properties now include full addresses for better organization

### Reporting Enhancements
- **Updated PDF Reports**: Package sections now display resident-specific details including room numbers and storage locations
- **Enhanced Email Reports**: HTML email templates updated to show complete package information per resident
- **Better Organization**: Reports now clearly show which packages belong to which residents and their locations

### Property-Specific Email Settings (October 6, 2025)
- **Isolated Email Lists**: Each property now has its own separate list of email recipients
- **Dynamic Email Management**: Users can add and remove email addresses for each property through the Reports & Export tab
- **Targeted Report Delivery**: When a report is sent, only the recipients configured for that specific property receive it
- **Independent Configuration**: Email settings for one property don't affect other properties
- **Flexible Recipient Management**: No longer limited to predefined email addresses - users can add any email address per property

### Package Status Tracking System (October 6, 2025)
- **Status-Based Workflow**: Packages now use status tracking (active, picked_up, returned_to_sender) instead of deletion
- **Complete Audit Trail**: All package actions are tracked with timestamps and agent names who handled them
- **Mobile-Optimized UI**: Status buttons designed for touch devices with 44px minimum touch targets
- **Smart Display**: Active packages shown separately from picked up/returned packages for easy management
- **Enhanced Reports**: PDF and email reports now group packages by status showing complete daily package history
- **Package Summary Dashboard**: Real-time summary showing breakdown of active, picked up, returned, and total packages
- **Multi-Device Sync**: React Query ensures package status updates sync across all devices in real-time

### Manager Authentication System (October 9, 2025)
- **Secure Login**: Username-based authentication with bcrypt password hashing for manager and admin accounts
- **Session Management**: Express-session with PostgreSQL persistence, 12-hour default timeout, optional 7-day "Remember me"
- **Forced Password Change**: All new accounts require password change on first login with strict validation (10+ chars, uppercase, lowercase, digit)
- **Manager Dashboard**: Protected route at /manager displaying user profile (full name, username, role) with password change functionality
- **User Database**: PostgreSQL users table with fields: id, username, passwordHash, fullName, role, requiresPasswordChange, createdAt
- **5 Seeded Manager Accounts**:
  - Nasire Bey (nbey) - admin role
  - Vince Kelley (vkelley) - manager role
  - Harlander Townes (htownes) - manager role
  - Robin Saunders (rsaunders) - manager role
  - Katrina Turner (kturner) - manager role
- **Default Password**: "Welcome2024!" for all initial accounts (requires immediate change on first login)
- **API Endpoints**: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, POST /api/auth/change-password
- **Frontend Auth Context**: React context provider managing authentication state, user session, and password change flows

### Package Form Simplification (October 9, 2025)
- **Minimal Required Fields**: Only room/unit number is required when adding packages - all other fields are optional
- **Optional Package Fields**: Resident name, storage location, received time, carrier, tracking number, package type, and notes can be left blank
- **Flexible Data Entry**: Agents can quickly add packages with minimal information and update details later as needed
- **Form Validation**: Updated Zod schema to make all fields except room number optional while maintaining data integrity

### Database Migration and Performance Fix (October 9, 2025)
- **Full PostgreSQL Storage**: Migrated from in-memory storage to PostgreSQL database for complete data persistence
- **Driver Switch**: Replaced neon-http (Data API) with standard pg driver (node-postgres) to fix null rows bug
- **Data Persistence**: All daily reports, packages, check-ins, duties, and notes now persist across page refreshes and server restarts
- **Reliable Queries**: Switched to connection pool-based queries with SSL support for production environment
- **Database Schema**: Updated packageAudits table to support nullable fields (residentName, storageLocation, receivedTime)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing without unnecessary complexity
- **UI Components**: Radix UI primitives with shadcn/ui components for consistent design system
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript throughout the full stack for consistency
- **Data Validation**: Zod schemas shared between client and server for type safety
- **File Structure**: Modular architecture with separate routing, storage, and utility layers

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL via standard pg driver (node-postgres) with connection pooling
- **Schema Management**: Drizzle Kit for migrations and database schema evolution
- **Data Models**: Comprehensive schema covering:
  - **Properties**: Name, address, active status
  - **Daily Reports**: Property, date, agent, shift time
  - **Guest Check-ins**: Guest name, apartment, check-in time, notes, shift
  - **Package Audits** (Resident-based): Resident name, room number, storage location, carrier, tracking number, package type, received time, notes, shift, status (active/picked_up/returned_to_sender), statusChangedAt, statusChangedBy
  - **Daily Duties**: Task description, completion status, timestamp
  - **Shift Notes**: Content, shift, update timestamp
  - **Email Settings**: Property-specific recipients, send time, format preferences (each property has its own email list)

### Authentication and Authorization
- **Session Management**: Connect-pg-simple for PostgreSQL-backed session storage
- **Security**: Express session middleware with secure cookie configuration

### Development and Build Tools
- **Build System**: Vite for fast development and optimized production builds
- **Development Server**: Hot module replacement and error overlay for rapid development
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Package Management**: npm with lock file for reproducible builds

### Real-time Features
- **Live Clock**: Real-time clock display for shift management
- **Auto-refresh**: Query invalidation and refetching for up-to-date data
- **Progress Tracking**: Real-time duty completion tracking with visual progress indicators

## External Dependencies

### Database and Storage
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations with automatic migrations

### UI and Design System
- **Radix UI**: Unstyled, accessible UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Consistent icon library with tree-shaking support
- **Google Fonts**: Inter font family for modern typography

### Email and Document Generation
- **Nodemailer**: SMTP email sending capabilities for automated reports
- **PDFKit**: PDF document generation for formatted reports
- **Date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Replit Integration**: Cartographer plugin for enhanced development experience
- **ESBuild**: Fast bundling for production server builds
- **PostCSS**: CSS processing with Autoprefixer for browser compatibility

### Form and Data Handling
- **React Hook Form**: Performant form management with minimal re-renders
- **Zod**: Runtime type validation and schema definition
- **Class Variance Authority**: Type-safe CSS class composition