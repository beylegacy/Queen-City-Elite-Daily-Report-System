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
- **Connection**: Neon Database serverless PostgreSQL for scalable cloud hosting
- **Schema Management**: Drizzle Kit for migrations and database schema evolution
- **Data Models**: Comprehensive schema covering:
  - **Properties**: Name, address, active status
  - **Daily Reports**: Property, date, agent, shift time
  - **Guest Check-ins**: Guest name, apartment, check-in time, notes, shift
  - **Package Audits** (Resident-based): Resident name, room number, storage location, carrier, tracking number, package type, received time, notes, shift
  - **Daily Duties**: Task description, completion status, timestamp
  - **Shift Notes**: Content, shift, update timestamp
  - **Email Settings**: Recipients, send time, format preferences

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