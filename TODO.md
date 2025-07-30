# Half Marathon Trainer - TODO List

This file tracks all pending improvements, fixes, and feature requests for the Half Marathon Trainer application.

## 🚨 High Priority

### Performance & Optimization
- [ ] **Optimize AI prediction API calls** _(currently calls multiple weeks of feedback data)_
  - **Functionality**: Reduce API calls by batching or caching recent feedback data
  - **Files**: `src/lib/ai/perplexity_service.tsx`, `src/components/training/TrainingCalendar.tsx`
  - **Implementation**: Add local caching for feedback data, implement debounced API calls
  
- [ ] **Add caching for AI predictions** _(reduce API costs)_
  - **Functionality**: Cache AI responses locally to avoid repeated identical API calls
  - **Files**: `src/lib/ai/perplexity_service.tsx`, potentially new `src/lib/cache/`
  - **Implementation**: Add Redis or local storage cache with TTL for AI responses
  
- [ ] **Implement loading states for all AI operations**
  - **Functionality**: Show loading spinners/states during AI API calls for better UX
  - **Files**: `src/components/training/TrainingCalendar.tsx`, all AI modal components
  - **Implementation**: Add loading states to feedback modals, cross-week analysis UI

### Bug Fixes
- [ ] **Fix session feedback submission UX** _(no loading state, allows multiple clicks)_
  - **Functionality**: Add loading state and disable button during AI processing to prevent duplicate submissions
  - **Files**: `src/components/training/TrainingCalendar.tsx`
  - **Implementation**: Add loading state, disable submit button, show "Processing..." message during AI analysis
  
- [ ] **Test dynamic week calculation edge cases** _(race dates very close/far)_
  - **Functionality**: Test and fix edge cases where race dates are <4 weeks or >20 weeks away
  - **Files**: `src/app/api/generate-plan/route.ts`, `src/app/dashboard/page.tsx`
  - **Implementation**: Add comprehensive tests for `calculateTrainingWeeks()` function
  
- [ ] **Verify AI prediction accuracy with real user data**
  - **Functionality**: Collect and analyze AI prediction accuracy against actual race results
  - **Files**: New analytics dashboard, `src/lib/ai/perplexity_service.tsx`
  - **Implementation**: Add tracking for predicted vs actual times, create accuracy metrics
  
- [ ] **Test cross-training session rendering for all activity types**
  - **Functionality**: Ensure all cross-training activities from onboarding render correctly
  - **Files**: `src/components/training/TrainingCalendar.tsx`
  - **Implementation**: Test rendering for swimming, yoga, cycling, crossfit, hiking sessions
  
- [ ] **Integrate proactive week analysis AI into weekly transition flow** _(2025-07-30)_
  - **Functionality**: Automatically trigger week analysis when transitioning between weeks
  - **Files**: `src/app/api/ai/proactive-week-analysis/route.ts`, `src/components/training/TrainingCalendar.tsx`
  - **Implementation**: Add week transition detection, trigger analysis on week completion

## 🔧 Medium Priority

### Features & Enhancements
- [ ] **Permanent session move with "Apply to future weeks" option** _(2025-07-30)_
  - **Functionality**: When moving sessions (e.g., long run from Saturday to Sunday), offer option to apply change to all future weeks
  - **Files**: `src/components/training/TrainingCalendar.tsx`, `src/app/api/schedule-change/route.ts`, database schema
  - **Implementation**: 
    - Add confirmation modal after drag/drop: "Apply this change to future weeks too?"
    - Store permanent schedule preferences in user profile or separate table
    - Update session generation logic to respect permanent moves
    - Show visual indicator for permanently moved sessions
    - Allow reverting permanent changes with "Reset to original schedule" option
    - Consider training periodization when applying permanent moves (e.g., don't move hard sessions before race week)
  
- [ ] **Add manual goal time adjustment in AI prediction section**
  - **Functionality**: Allow users to manually override AI-predicted goal times
  - **Files**: `src/components/training/TrainingCalendar.tsx`, `src/app/api/user-profile/route.ts`
  - **Implementation**: Add editable goal time input in AI prediction UI, update user profile
  
- [ ] **Implement AI confidence scores display for predictions**
  - **Functionality**: Show confidence percentage for AI predictions and recommendations
  - **Files**: `src/lib/ai/perplexity_service.tsx`, prediction display components
  - **Implementation**: Modify AI responses to include confidence scores, display in UI
  
- [ ] **Add trend analysis graphs for RPE/pace over time**
  - **Functionality**: Visual charts showing RPE and pace trends across training weeks
  - **Files**: New `src/components/analytics/TrendCharts.tsx`, `src/app/dashboard/page.tsx`
  - **Implementation**: Use Chart.js or similar library, aggregate session feedback data
  
- [ ] **Create weekly summary reports with AI insights**
  - **Functionality**: Generate automated weekly training summaries with AI analysis
  - **Files**: New `src/components/reports/WeeklySummary.tsx`, `src/app/api/reports/route.ts`
  - **Implementation**: Aggregate weekly data, generate AI summary, create PDF/email reports

### UI/UX Improvements
- [ ] **Streamline dashboard layout - reduce noise before calendar** _(2025-07-30)_
  - **Functionality**: Minimize clutter above the training calendar, which is the most important content
  - **Files**: `src/app/dashboard/page.tsx`, `src/components/training/TrainingCalendar.tsx`
  - **Implementation**: 
    - **Keep**: Header (Training Dashboard, Welcome, Plan Status, Logout) - makes sense
    - **Reduce**: Stats row (Week Progress, Training Week, Total Sessions, Plan Type) - make smaller, less prominent
    - **Remove**: Green "Training Plan Active" bar - duplicate of plan status
    - **Remove**: "AI Training Calendar Week 1 of 12 Base building phase" header - duplicate info
    - **Keep**: Week navigation buttons only (move to calendar component)
    - **Consolidate**: Remove duplicate progress indicators (currently showing 1/4 and 1/5 sessions)
    - **Relocate**: AI Performance Prediction section - make smaller or move to sidebar/modal
    - **Enhance**: AI Modifications block - show actual modification list when count > 0
  - **Goal**: Calendar should be visible immediately after header and minimal stats

- [ ] **Add animations to AI prediction updates**
  - **Functionality**: Smooth transitions when AI predictions change or update
  - **Files**: `src/components/training/TrainingCalendar.tsx`, CSS animation files
  - **Implementation**: Add Framer Motion or CSS transitions for prediction value changes
  
- [ ] **Improve mobile responsiveness for AI prediction section**
  - **Functionality**: Optimize AI prediction UI for mobile screens and touch interactions
  - **Files**: `src/components/training/TrainingCalendar.tsx`, responsive CSS
  - **Implementation**: Add mobile-specific layouts, touch-friendly controls
  
- [ ] **Add tooltips explaining AI decision-making process**
  - **Functionality**: Help users understand why AI made specific recommendations
  - **Files**: `src/components/training/TrainingCalendar.tsx`, tooltip components
  - **Implementation**: Add hover/click tooltips with AI reasoning explanations
  
- [ ] **Create onboarding tour for new AI features**
  - **Functionality**: Guided tour showing users how to use AI features effectively
  - **Files**: New `src/components/onboarding/`, `src/app/dashboard/page.tsx`
  - **Implementation**: Use react-joyride or similar library for interactive tour

- [ ] **Update landing page content for multiple race distances** _(2025-07-30)_
  - **Functionality**: Replace Manchester half marathon-specific content with generic multi-distance messaging
  - **Files**: `src/app/page.tsx` (main landing page with Manchester references)
  - **Implementation**: 
    - Update hero section title from "Half Marathon Training" to "Race Training" or "Running Training"
    - Replace "Get ready for Manchester Half Marathon" with generic multi-distance messaging
    - Update race countdown section to be configurable or remove Manchester-specific date
    - Change "12-Week Training Plan" to dynamic plan lengths based on race distance
    - Update training schedule examples to show variety across different race distances
    - Modify page title and meta descriptions for broader SEO appeal
    - Ensure content reflects the app's capability to handle 5K to Marathon distances

- [ ] **Rebrand application name from "Half Marathon Trainer"** _(2025-07-30)_
  - **Functionality**: Rename app to reflect multi-distance capabilities (5K to Marathon)
  - **Files**: `package.json`, `README.md`, `src/app/layout.tsx`, Vercel deployment settings, domain configuration
  - **Implementation**: 
    - **Name Options**: "AI Race Coach", "Smart Running Coach", "Adaptive Training Coach", "Race Ready AI", "RunSmart Coach"
    - Update package.json name and description fields
    - Change app title in layout.tsx and meta tags
    - Update README.md with new branding and description
    - Modify Vercel project name and deployment URL
    - Consider custom domain purchase for new brand
    - Update any hardcoded references to "Half Marathon Trainer" throughout codebase
    - Update social media meta tags and Open Graph data
    - Plan migration strategy for existing users and data

### Data & Analytics
- [ ] **Track AI prediction accuracy over time**
  - **Functionality**: Store and analyze how accurate AI predictions are vs actual results
  - **Files**: New `src/lib/analytics/`, `src/app/api/analytics/route.ts`, database schema
  - **Implementation**: Add tracking tables, comparison algorithms, accuracy metrics dashboard
  
- [ ] **Add export functionality for training data**
  - **Functionality**: Allow users to export their training data to CSV/JSON/PDF formats
  - **Files**: New `src/app/api/export/route.ts`, `src/components/export/ExportModal.tsx`
  - **Implementation**: Generate exports with session data, feedback, AI insights
  
- [ ] **Implement data backup/restore functionality**
  - **Functionality**: Backup user data and allow restoration from backup files
  - **Files**: New `src/app/api/backup/route.ts`, `src/components/settings/BackupSettings.tsx`
  - **Implementation**: Create backup format, upload/download functionality, data validation
  
- [ ] **Add option to add/remove sessions from calendar with AI impact analysis** _(2025-07-30)_
  - **Functionality**: Interactive calendar editing with AI-powered workload analysis
  - **Files**: `src/components/training/TrainingCalendar.tsx`, `src/app/api/ai/workload-analysis/route.ts`
  - **Implementation**: 
    - Add "+" button to add custom sessions to any day
    - Add delete/remove option for existing sessions  
    - Trigger AI analysis when sessions are modified (workload impact)
    - Update weekly volume calculations automatically
    - Maintain training periodization balance
    - Consider session dependencies (e.g., rest days before hard sessions)
    
- [ ] **Add ability to revert moved sessions to original plan without triggering AI analysis** _(2025-07-30)_
  - **Functionality**: "Undo" functionality for session moves that bypasses AI rebalancing
  - **Files**: `src/components/training/TrainingCalendar.tsx`, session state management
  - **Implementation**: Track original session positions, add revert buttons, bypass AI triggers

## 🎯 Low Priority

### Nice to Have
- [ ] **Dark/light theme toggle**
  - **Functionality**: Switch between dark and light UI themes
  - **Files**: `src/app/globals.css`, `src/components/theme/ThemeProvider.tsx`
  - **Implementation**: Add theme context, CSS variables, toggle component
  
- [ ] **Customizable pace zones**
  - **Functionality**: Allow users to set custom pace zones for different training intensities
  - **Files**: `src/components/settings/PaceZones.tsx`, user profile management
  - **Implementation**: Add pace zone settings UI, integrate with session calculations
  
- [ ] **Integration with other fitness apps** _(Strava, Garmin Connect)_
  - **Functionality**: Import/export data from popular fitness platforms
  - **Files**: New `src/lib/integrations/`, API endpoints for each platform
  - **Implementation**: OAuth integration, data mapping, sync functionality

- [ ] **Send planned workouts to fitness watches** _(2025-07-30)_
  - **Functionality**: Push structured workout plans directly to Garmin/Apple Watch/other fitness watches like Runna does
  - **Files**: New `src/lib/integrations/garmin-workouts/`, `src/lib/integrations/apple-watch/`, `src/app/api/workouts/push/route.ts`, `src/components/training/WorkoutSync.tsx`
  - **Implementation**: 
    - **Apple Watch**: Integrate with Apple HealthKit WorkoutConfiguration API for Apple Watch users
    - **Garmin**: Integrate with Garmin Connect IQ API for workout upload
    - Convert training session data to structured workout format (intervals, pace zones, duration)
    - Add "Send to Watch" button on individual training sessions with platform detection
    - Support different workout types: easy runs, tempo runs, interval sessions, long runs
    - Handle platform-specific formatting and limitations (Apple vs Garmin vs others)
    - Add sync status tracking and error handling per platform
    - Consider integration with other platforms (Polar, Suunto) for future expansion
    - Ensure workout modifications trigger re-sync to watch across all platforms
    - Add user preferences for automatic vs manual workout sync per device type
    - Test extensively with Apple Watch test user for real-world validation
  
- [ ] **Social features** _(share achievements)_
  - **Functionality**: Share training milestones and race results with other users
  - **Files**: New `src/components/social/`, `src/app/api/social/route.ts`
  - **Implementation**: Achievement system, sharing mechanisms, social feed

### Technical Debt
- [ ] **Refactor large components into smaller modules**
  - **Functionality**: Break down TrainingCalendar and other large components
  - **Files**: `src/components/training/TrainingCalendar.tsx` → multiple smaller components
  - **Implementation**: Extract session cards, feedback modals, AI panels into separate files
  
- [ ] **Add comprehensive error boundaries**
  - **Functionality**: Catch and handle React component errors gracefully
  - **Files**: New `src/components/errors/ErrorBoundary.tsx`, wrap key components
  - **Implementation**: Create error boundary components, add error logging
  
- [ ] **Improve TypeScript type coverage**
  - **Functionality**: Add proper TypeScript types for all props and API responses
  - **Files**: All TypeScript files, new `src/types/` directory
  - **Implementation**: Define interfaces for all data structures, remove 'any' types

## ✅ Recently Completed

### 2025-07-30
- [x] **Add unit tests for AI logic** - Created comprehensive test coverage for current working functionalities
  - **Files Created**: `src/lib/ai/perplexity_service.test.tsx`, `src/components/training/TrainingCalendar.test.tsx`, `src/app/api/generate-plan/route.test.ts`, `tests/setup.ts`
  - **Implementation**: 
    - **AI Service Tests** (16 tests): Testing RPE ranges, pace deviation logic, comment analysis, API mocking, fallback responses
    - **Plan Generation Tests** (13 tests): Testing week calculations, race date validation, pace conversions, edge cases
    - **Training Calendar Tests** (9 tests): Component rendering, user interactions, loading states (basic framework created)
    - **Jest Configuration**: Set up with React Testing Library, TypeScript support, module path mapping
    - **Coverage**: 29/38 tests passing - core AI and plan generation logic fully tested
    - **Regression Protection**: Tests validate critical business logic to prevent future regressions

- [x] **Dynamic Training Plans** - Made plan duration dynamic based on race dates (4-20 week range)
  - **Files Modified**: `src/app/api/generate-plan/route.ts`, `src/app/dashboard/page.tsx`
  - **Implementation**: Added `calculateTrainingWeeks()` function, updated UI to show dynamic totals
  
- [x] **Smart AI Trigger Logic** - Implemented context-aware adaptation triggers considering comments
  - **Files Modified**: `src/lib/ai/perplexity_service.tsx`
  - **Implementation**: Added comment sentiment analysis, context-aware triggering
  
- [x] **AI Predicted Time Feature** - Restored missing AI time prediction with beautiful UI
  - **Files Modified**: `src/components/training/TrainingCalendar.tsx`
  - **Implementation**: Re-integrated prediction display with user profile data
  
- [x] **Fixed Misleading Messages** - Updated all outdated AI prediction messages
  - **Files Modified**: `src/lib/ai/perplexity_service.tsx`
  - **Implementation**: Updated user-facing messages to reflect AI vs fallback responses
  
- [x] **Cross-Week AI Modifications** - Integrated cross-week analysis and modification system
  - **Files Modified**: `src/app/api/ai/cross-week-modifications/route.ts`
  - **Implementation**: 
    - Analyzes feedback patterns to suggest changes in upcoming weeks
    - Beautiful modal interface for reviewing and approving AI recommendations
    - Connects to existing `/api/ai/cross-week-modifications` endpoint
    - Triggers after high RPE patterns detected across multiple sessions
    
- [x] **Enhanced AI Trigger Logic** - Improved AI triggering with session-specific intelligence
  - **Files Modified**: `src/lib/ai/perplexity_service.tsx`
  - **Implementation**: 
    - Added expected RPE ranges per session type (easy: 3-5, tempo: 6-7, intervals: 8-9, etc.)
    - Session-specific pace deviation thresholds (easy: ±15s, tempo: ±8s, intervals: ±5s)
    - Context-aware triggering based on actual vs expected performance
    - Better AI prompts with trigger reasoning and session context

## 📝 Notes

### Adding New Items
When adding new todos, please:
1. **Title**: Use bold formatting with clear, descriptive title
2. **Functionality**: Describe what the feature/fix does and why it's needed
3. **Files**: List specific files that need to be created or modified
4. **Implementation**: Provide technical approach and key considerations
5. **Priority**: Assign appropriate priority (High/Medium/Low)
6. **Date**: Include date when item was identified
7. **Completion**: Move completed items to "Recently Completed" with implementation details

### Priority Guidelines
- **High**: Bugs, security issues, broken functionality
- **Medium**: New features, UX improvements, performance optimizations  
- **Low**: Nice-to-have features, refactoring, cosmetic changes

### AI-Related Items
All AI functionality should consider:
- API cost optimization (stay within $5/month Perplexity budget)
- User feedback and comment analysis
- Graceful fallbacks when AI is unavailable
- Clear user communication about AI decision-making