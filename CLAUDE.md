# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Development Commands

**Development Server:**
```bash
npm run dev          # Start development server (with legacy peer deps)
npm run build        # Production build (with --force install)
npm start            # Start production server
```

**Code Quality:**
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run type-check   # TypeScript type checking (tsc --noEmit)
npm run format       # Format code with Prettier
npm test             # Run Jest tests
```

**Database Operations:**
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio GUI
```

**Data Management Scripts:**
```bash
npm run safe-migrate     # Safe data migration (tsx src/scripts/safe-migration.ts)
npm run discover-db      # Database discovery (tsx src/scripts/discover-database.ts)
npm run link-data        # Link existing data (tsx src/scripts/link-existing-data.ts)
npm run minimal-setup    # Minimal database setup
npm run investigate      # Data loss investigation
npm run migrate:data     # Legacy data migration
```

## Project Architecture

### Application Structure
This is a **Next.js 14 App Router** application with the following key architectural patterns:

- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with custom login/signup
- **AI Integration**: Perplexity AI (`sonar-pro` model) for intelligent training adaptations
- **State Management**: Zustand with Immer for complex state updates
- **Styling**: Tailwind CSS with custom design system
- **Testing**: Jest + React Testing Library

### Core Domain Models

The application revolves around **AI-powered half marathon training** with these key entities:

1. **Users & Profiles**: User authentication and detailed training preferences
2. **Training Plans**: 12-week periodized Manchester Half Marathon training (Oct 12, 2025)
3. **Generated Sessions**: AI-generated custom training sessions per user
4. **Session Feedback**: RPE, difficulty, completion tracking that triggers AI adaptations

### AI Integration Architecture

**Trigger Conditions** (in `src/lib/ai/perplexity_service.tsx`):
- High RPE (≥8): Intensity reduction suggestions
- High Difficulty (≥8): Easier alternatives
- Incomplete Sessions: Root cause analysis
- Poor Feeling: Recovery-focused modifications

**AI Endpoints** (`src/app/api/ai/`):
- `adapt-training/`: Main adaptation logic
- `auto-adjust/`: Automatic schedule adjustments  
- `enhanced-rebalance/`: Advanced rebalancing
- `cross-week-modifications/`: Multi-week analysis
- `proactive-week-analysis/`: Preventive adaptations
- `motivational-feedback/`: Encouragement and tips

### Database Schema Highlights

**Key Migration Status**: The app is transitioning from hardcoded plans to user-specific generated plans via the `GeneratedSession` model.

**Critical Relationships**:
- `User` → `UserProfile` (1:1, detailed preferences)
- `User` → `GeneratedSession[]` (1:many, AI-generated custom sessions)
- `User` → `SessionFeedback[]` (1:many, triggers AI adaptations)
- `User` → `TrainingPlan[]` (1:many, legacy structure)

## Path Aliases & Module Resolution

The project uses extensive TypeScript path mapping:
```typescript
"@/*": ["./src/*"]
"@/components/*": ["./src/components/*"]
"@/lib/*": ["./src/lib/*"]
"@/hooks/*": ["./src/hooks/*"]
"@/ai/*": ["./src/lib/ai/*"]
"@/training/*": ["./src/lib/training/*"]
"@/ui/*": ["./src/components/ui/*"]
```

## Environment Requirements

**Required Environment Variables:**
```env
DATABASE_URL=postgresql_connection_string
NEXT_PUBLIC_PERPLEXITY_API_KEY=perplexity_api_key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=secret_key
```

**Node Requirements:**
- Node.js ≥18.0.0
- npm ≥8.0.0

## Training Plan Context

This app is specifically built for **Manchester Half Marathon 2025** training with these constraints:

- **Race Date**: October 12, 2025
- **Target Time**: Sub-2 hours (1:50-1:55 goal)
- **Training Period**: 12 weeks of periodized training
- **Running Club**: MadeRunning Manchester integration
- **Gym Integration**: Push/Pull/Legs schedule with running
- **Injury Considerations**: Hamstring-safe modifications

**Weekly Schedule Pattern**:
- Monday 5PM: Easy run + MadeRunning + Push gym (4:30AM)
- Tuesday: Pull gym (4:30AM)
- Wednesday 5AM: Tempo/Intervals + MadeRunning + Legs gym (6AM)
- Thursday 6PM: Easy run + Push gym (4:30AM)
- Friday: Pull gym (4:30AM)
- Saturday 9AM: Long run + MadeRunning + Legs gym (6AM)
- Sunday: Rest (15K steps walking)

## Testing Configuration

Tests use **Jest with Next.js integration**:
- Test files: `tests/**/*.(test|spec).(ts|tsx)` or `src/**/*.test.(ts|tsx)`
- Coverage threshold: 70% (branches, functions, lines, statements)
- Mocks available for: `garminconnect`, `@tensorflow/tfjs`
- Setup files: `tests/setup.ts`, `tests/env.setup.js`

## Development Notes

**Package Installation**: Use `--legacy-peer-deps` for development and `--force` for builds due to peer dependency conflicts.

**Database Migrations**: The app includes comprehensive migration scripts in `src/scripts/` for transitioning between schema versions safely.

**AI Cost Optimization**: Perplexity API usage is optimized to stay within $5/month budget through intelligent triggering conditions and context-aware prompts.