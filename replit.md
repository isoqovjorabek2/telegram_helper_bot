# Replit.md

## Overview

TeleDash is a Telegram bot management dashboard. It combines a **Telegram bot backend** (for receiving and processing user messages via a diagnostic questionnaire) with a **web dashboard** (for monitoring users, messages, and bot activity). The bot asks users psychological diagnostic questions in Uzbek, collects their answers, and generates AI-powered summaries using OpenAI. The dashboard provides a real-time view of all bot interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state, with polling-based data refresh (60s for users, 5s for messages)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, custom font families (Inter for body, Outfit for display)
- **Animations**: Framer Motion for entry animations and transitions
- **Pages**: Dashboard (overview with stats), Users (table view), Messages (feed view), Settings (configuration UI)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express.js running on Node.js with TypeScript (via tsx)
- **Entry point**: `server/index.ts` creates an HTTP server, registers routes, and serves static files in production or uses Vite dev middleware in development
- **Telegram Bot**: Uses `node-telegram-bot-api` with polling mode. The bot runs a 10-question diagnostic flow, stores user state in the database (`testState` JSONB field), and generates AI summaries via OpenAI when the questionnaire completes
- **AI Integration**: OpenAI client configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables (Replit AI Integrations)
- **API Routes**: RESTful endpoints defined in `server/routes.ts`, with route contracts in `shared/routes.ts`
  - `GET /api/users` — list all users
  - `GET /api/users/:id` — get user by Telegram ID
  - `GET /api/messages` — list recent messages (last 100, with joined user data)

### Shared Layer
- `shared/schema.ts` — Drizzle ORM table definitions and Zod schemas for `users` and `messages` tables
- `shared/routes.ts` — API route contract definitions with Zod response schemas
- `shared/models/chat.ts` — Additional schema for `conversations` and `messages` tables (used by Replit AI integrations)

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: `pg` Pool using `DATABASE_URL` environment variable
- **Schema push**: `npm run db:push` uses drizzle-kit to push schema to database
- **Tables**:
  - `users` — Telegram user info, test state (JSONB for questionnaire progress)
  - `messages` — Bot message log with user reference, content, and raw Telegram data
  - `conversations` / chat `messages` — Used by Replit integration modules (separate from bot messages)
- **Storage pattern**: `IStorage` interface in `server/storage.ts` with `DatabaseStorage` implementation

### Replit Integrations (pre-built modules in `server/replit_integrations/` and `client/replit_integrations/`)
These are scaffolded integration modules, not all actively used by the main application:
- **Audio**: Voice recording, playback, speech-to-text, text-to-speech via OpenAI
- **Chat**: Conversation storage and streaming chat routes
- **Image**: Image generation via `gpt-image-1`
- **Batch**: Batch processing with rate limiting and retries

### Build System
- **Development**: `npm run dev` — runs tsx with Vite dev server middleware for HMR
- **Production build**: `npm run build` — Vite builds the client to `dist/public`, esbuild bundles the server to `dist/index.cjs`
- **Production start**: `npm start` — runs the bundled server which serves static files

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (must be provisioned)
- `TELEGRAM_BOT_TOKEN` — Telegram Bot API token (bot won't start without it, but app still runs)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key for AI features
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI-compatible base URL (Replit AI Integrations proxy)

### Third-Party Services
- **PostgreSQL** — Primary data store, required for the application to function
- **Telegram Bot API** — Bot uses long-polling via `node-telegram-bot-api`
- **OpenAI API** — Used for generating diagnostic summaries from questionnaire answers (GPT-4o-mini)
- **Google Fonts** — Inter, Outfit, DM Sans, Fira Code, Geist Mono, Architects Daughter loaded via CDN

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` — ORM and migration tooling
- `node-telegram-bot-api` — Telegram bot interface
- `openai` — OpenAI SDK
- `express` — HTTP server
- `@tanstack/react-query` — Client-side data fetching
- `wouter` — Client-side routing
- `framer-motion` — Animations
- `date-fns` — Date formatting
- `zod` / `drizzle-zod` — Schema validation
- `shadcn/ui` ecosystem (Radix UI, class-variance-authority, tailwind-merge, clsx)