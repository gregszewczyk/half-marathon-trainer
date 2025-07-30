# Half Marathon Trainer - TODO List

This file tracks all pending improvements, fixes, and feature requests for the Half Marathon Trainer application.

## 🚨 High Priority

### Performance & Optimization
- [ ] Optimize AI prediction API calls (currently calls multiple weeks of feedback data)
- [ ] Add caching for AI predictions to reduce API costs
- [ ] Implement loading states for all AI operations

### Bug Fixes
- [ ] Test dynamic week calculation edge cases (race dates very close/far)
- [ ] Verify AI prediction accuracy with real user data
- [ ] Test cross-training session rendering for all activity types
- [ ] **Integrate proactive week analysis AI into weekly transition flow** _(2025-07-30)_

## 🔧 Medium Priority

### Features & Enhancements
- [ ] Add manual goal time adjustment in AI prediction section
- [ ] Implement AI confidence scores display for predictions
- [ ] Add trend analysis graphs for RPE/pace over time
- [ ] Create weekly summary reports with AI insights

### UI/UX Improvements
- [ ] Add animations to AI prediction updates
- [ ] Improve mobile responsiveness for AI prediction section
- [ ] Add tooltips explaining AI decision-making process
- [ ] Create onboarding tour for new AI features

### Data & Analytics
- [ ] Track AI prediction accuracy over time
- [ ] Add export functionality for training data
- [ ] Implement data backup/restore functionality
- [ ] **Add option to add/remove sessions from calendar with AI impact analysis** _(2025-07-30)_
  - Add "+" button to add custom sessions to any day
  - Add delete/remove option for existing sessions  
  - Trigger AI analysis when sessions are modified (workload impact)
  - Update weekly volume calculations automatically
  - Maintain training periodization balance
  - Consider session dependencies (e.g., rest days before hard sessions)

## 🎯 Low Priority

### Nice to Have
- [ ] Dark/light theme toggle
- [ ] Customizable pace zones
- [ ] Integration with other fitness apps (Strava, Garmin Connect)
- [ ] Social features (share achievements)

### Technical Debt
- [ ] Refactor large components into smaller modules
- [ ] Add comprehensive error boundaries
- [ ] Improve TypeScript type coverage
- [ ] Add unit tests for AI logic

## ✅ Recently Completed

### 2025-07-30
- [x] **Dynamic Training Plans** - Made plan duration dynamic based on race dates (4-20 week range)
- [x] **Smart AI Trigger Logic** - Implemented context-aware adaptation triggers considering comments
- [x] **AI Predicted Time Feature** - Restored missing AI time prediction with beautiful UI
- [x] **Fixed Misleading Messages** - Updated all outdated AI prediction messages
- [x] **Cross-Week AI Modifications** - Integrated cross-week analysis and modification system
  - Analyzes feedback patterns to suggest changes in upcoming weeks
  - Beautiful modal interface for reviewing and approving AI recommendations
  - Connects to existing `/api/ai/cross-week-modifications` endpoint
  - Triggers after high RPE patterns detected across multiple sessions

## 📝 Notes

### Adding New Items
When adding new todos, please:
1. Assign appropriate priority (High/Medium/Low)
2. Add brief description and context
3. Include date when item was identified
4. Move completed items to "Recently Completed" with completion date

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