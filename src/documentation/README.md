# FMF Gym Management System

## Project Overview

The FMF Gym Management System is a comprehensive single-gym management application built with React, TypeScript, Tailwind CSS, and Supabase. It provides a complete solution for managing gym operations including member management, access control, sales, inventory, and staff shift reconciliation.

## Phase 2 Implementation Status

### ✅ Completed Features
- **Database Schema**: Complete PostgreSQL schema with all required tables and relationships
- **Row Level Security**: Basic RLS policies implemented for role-based access control
- **Shift Management**: Full shift lifecycle with cash reconciliation
- **Real-time Dashboard**: Live statistics from actual database data
- **Member Management**: CRUD operations with search and status calculation
- **Database Service Layer**: Centralized database operations with error handling
- **Custom Hooks**: React hooks for shift management and data fetching

### 🔄 Core Business Logic Implemented
- **Shift-Based Operations**: All transactions require active shift
- **Member Status Calculation**: ACTIVE/IN_GRACE/EXPIRED logic with grace period
- **Cash Reconciliation**: Automatic calculation of expected vs actual cash
- **Audit Trails**: All operations logged with user and timestamp information

## Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for modern, responsive styling
- **React Router** for client-side navigation
- **Lucide React** for consistent iconography
- **Vite** for fast development and optimized builds

### Backend Stack
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** database with Row Level Security (RLS)
- **Real-time subscriptions** for live data updates

## Core Business Logic

### Authentication System
- Email/password authentication via Supabase Auth
- Role-based access control (ADMIN, CS)
- Profile management linked to auth.users

### Shift-Based Operations
The system operates on a strict shift-based model:
- All financial transactions require an active shift
- Staff must declare starting cash float when beginning a shift
- End-of-shift reconciliation includes cash counting and discrepancy reporting
- All transactions and check-ins are linked to shift_id for audit trails

### Membership Management
- Flexible membership plans with configurable durations and pricing
- Registration fees apply only to new members
- Promotional benefits (free months) apply to both new sign-ups and renewals
- Separate membership records for each renewal to maintain history

### Grace Period Logic
Sophisticated member validation system:
- **ACTIVE**: Current date ≤ end date (Green UI)
- **IN GRACE PERIOD**: Beyond end date but within grace period (Amber UI)
- **EXPIRED**: Beyond grace period (Red UI)

Grace period renewals are back-dated to membership expiry, with special handling for outstanding charges.

## Database Schema

### Core Tables
- `system_settings`: Global configuration management
- `profiles`: Staff account information
- `shifts`: Shift management and cash reconciliation
- `members`: Member profiles and contact information
- `membership_plans`: Admin-defined plan templates
- `memberships`: Individual membership purchase records
- `transactions`: Central financial transaction log
- `check_ins`: Entry logging system

### POS & Inventory
- `products`: Inventory management
- `stock_movements`: Inventory change tracking
- `coupon_templates`: Reusable coupon definitions
- `sold_coupons`: Individual coupon sales and usage

## Security Considerations

### Row Level Security (RLS)
- Prepared for role-based data access control
- Admin full CRUD access
- CS operational access restrictions
- User isolation where appropriate

### Audit Trails
- All financial transactions logged with timestamps
- User actions tracked via processed_by fields
- Shift-based operation tracking
- Stock movement history

## User Interface

### Design System
- Professional gym management interface
- Primary orange (#DD6B2C) with supporting color palette
- Responsive design with desktop-first approach
- Consistent 8px spacing system
- Clean typography hierarchy

### Navigation
- Sidebar navigation with role-based menu items
- Breadcrumb system for complex workflows
- Quick action buttons for common tasks
- Search functionality across key data

### Status Indicators
- Color-coded member status (Green/Amber/Red)
- Real-time dashboard metrics
- Alert systems for expiring memberships and low stock
- Transaction status tracking

## Development Guidelines

### File Organization
- Modular component architecture
- Separate concerns (auth, layout, pages, utilities)
- TypeScript interfaces for type safety
- Proper import/export patterns

### State Management
- React Context for authentication state
- Local state for component-specific data
- Supabase real-time subscriptions for live updates

### Error Handling
- Try-catch blocks for async operations
- User-friendly error messages
- Loading states for async operations
- Form validation and feedback

## Future Enhancements

### Planned Features
- Member photo management
- Advanced reporting and analytics
- Automated billing and payment processing
- Mobile app for member check-ins
- Integration with access control hardware

### Scalability Considerations
- Multi-gym support architecture
- Role permission system expansion
- API rate limiting and caching
- Data archiving strategies

## Getting Started

1. Set up Supabase project and configure environment variables
2. Run database migrations to create schema
3. Create initial admin user
4. Configure system settings
5. Begin adding membership plans and staff accounts

The system is designed to be production-ready with proper security, audit trails, and business logic enforcement.