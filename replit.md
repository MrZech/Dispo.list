# DispoList - Internal Inventory & eBay Listing System

## Overview

DispoList is an internal web-based inventory management and eBay listing system designed to streamline the workflow from physical item intake to eBay CSV export. The system captures inventory quickly (mobile-friendly), progresses items through testing and review stages, stores all eBay CSV-required data, and generates template-accurate CSVs for manual eBay upload.

**Core workflow stages:**
1. Intake (mobile-first, quick capture)
2. Test / Expand Description
3. Draft Listing (eBay-aligned)
4. Second Review
5. CSV Export → Manual eBay Upload

The database serves as the source of truth - eBay CSVs are generated from the database, not manually edited.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **File Uploads**: Uppy with AWS S3 presigned URL flow

The frontend lives in `client/src/` with pages, components, hooks, and lib utilities organized in their respective directories.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Build**: Vite for frontend, esbuild for server bundling

The server uses a storage abstraction pattern (`server/storage.ts`) that interfaces with the database through Drizzle ORM.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync

Key database tables:
- `items` - Core inventory with intake, testing, and eBay listing fields (including ebayCategoryId, ebayConditionId, listingTitle, listingDescription)
- `photos` - Item images with sorting and type classification
- `export_profiles` - CSV template configurations with field mappings
- `users` / `sessions` - Authentication (Replit Auth)

### eBay Integration
- **Category IDs**: Defined in `shared/ebay-categories.ts` - maps to eBay's official category IDs (e.g., 179 = Desktop Computers)
- **Condition IDs**: Standard eBay condition codes (1000 = New, 3000 = Used, 7000 = For Parts)
- **CSV Export**: `/api/csv/ebay-export` generates eBay-compatible draft listing CSV matching their exact template format
- **Auto-generation**: Listing titles and HTML descriptions are auto-generated from specs if not manually entered
- **eBay Script Generator**: Listing description generator at `/ebay-script`
  - Takes item specs from database or pasted Magic Octopus output
  - Generates detailed prompts for copying to ChatGPT or any AI
  - Self-host friendly: no built-in AI dependency, just copy/paste workflow
  - Saves AI responses back to item's eBay listing field for CSV export

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Implementation**: Passport.js with OIDC strategy

### File Storage
- **Service**: Google Cloud Storage via Replit Object Storage
- **Upload Flow**: Presigned URLs - client requests URL from backend, uploads directly to storage
- **Integration**: Uppy dashboard for multi-file uploads with progress tracking

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database access and migrations

### Authentication
- **Replit Auth**: OIDC-based authentication requiring `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET`

### Object Storage
- **Google Cloud Storage**: File uploads via Replit's sidecar service at `http://127.0.0.1:1106`
- **Presigned URLs**: Secure direct-to-storage uploads

### Frontend Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **TanStack Query**: Data fetching and caching
- **Uppy**: File upload management with dashboard UI

### Build Tools
- **Vite**: Frontend development server and bundler
- **esbuild**: Server-side TypeScript bundling
- **Tailwind CSS**: Utility-first styling with PostCSS