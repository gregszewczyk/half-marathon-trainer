# 🏃‍♂️ Half Marathon Trainer

An AI-powered half marathon training application with Garmin integration and intelligent training adaptations. Built specifically for the Manchester Half Marathon 2025.

## ✨ Features

- **🤖 AI-Powered Adaptations**: Training plans that automatically adjust based on your feedback using Perplexity AI
- **⌚ Garmin Integration**: Seamless sync with Garmin devices for automatic activity tracking
- **📅 Smart Training Calendar**: 12-week periodized training plan with phase-specific workouts
- **📊 Performance Analytics**: Detailed progress tracking and race time predictions
- **🌙 Dark Theme UI**: Modern, responsive interface optimized for all devices
- **👥 MadeRunning Integration**: Compatible with club training sessions

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0+
- npm 8.0.0+
- PostgreSQL 12+
- Perplexity API key

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd half-marathon-trainer
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys to `.env.local`:
   ```env
   NEXT_PUBLIC_PERPLEXITY_API_KEY=your_perplexity_api_key_here
   DATABASE_URL=your_postgresql_connection_string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret_key
   ```

3. **Set up database**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── ai/           # AI integration endpoints
│   ├── dashboard/        # Training dashboard
│   └── training/         # Training calendar
├── components/
│   ├── ui/               # Base UI components
│   ├── ai/               # AI-related components
│   ├── training/         # Training components
│   └── layout/           # Layout components
├── lib/
│   ├── ai/               # AI service layer
│   ├── training/         # Training logic
│   └── utils/            # Utility functions
├── hooks/                # Custom React hooks
├── store/                # State management
└── types/                # TypeScript definitions
```

## 🤖 AI Integration

The app uses **Perplexity AI** (`sonar-pro` model) for intelligent training adaptations:

### Trigger Conditions
- **High RPE (≥8)**: Suggests intensity reduction
- **High Difficulty (≥8)**: Recommends easier alternatives
- **Incomplete Sessions**: Investigates causes and rebuilds confidence
- **Poor Feeling**: Focuses on recovery and external factors

### AI Features
- Context-aware analysis (training phase, injury history)
- Manchester Half Marathon specific recommendations
- Hamstring-safe training modifications
- Cost-optimized API usage (within $5/month budget)

## 📅 Training Plan

### 12-Week Periodization
- **Weeks 1-4**: Base Phase (aerobic foundation)
- **Weeks 5-8**: Build Phase (lactate threshold)
- **Weeks 9-10**: Peak Phase (race-specific fitness)
- **Weeks 11-12**: Taper Phase (recovery + sharpness)

**Note**: Training plan duration is now dynamic (4-20 weeks) based on your race date!

### Weekly Schedule
- **Monday 5PM**: Easy run with MadeRunning + Push gym (4:30AM)
- **Tuesday**: Pull gym (4:30AM)
- **Wednesday 5AM**: Tempo/Intervals with MadeRunning + Legs gym (6AM)
- **Thursday 6PM**: Easy run + Push gym (4:30AM)
- **Friday**: Pull gym (4:30AM)
- **Saturday 9AM**: Long run with MadeRunning + Legs gym (6AM)
- **Sunday**: Rest day (15K steps walking)

## ⌚ Garmin Integration

### Supported Features
- Automatic activity sync
- Pace and heart rate analysis
- GPS data processing
- Activity matching to planned sessions

### Setup
1. Add Garmin credentials to environment variables
2. Connect your Garmin account in the app
3. Activities automatically sync and match to training sessions

## 📊 Performance Tracking

- **Race Time Predictions**: AI-powered predictions based on current fitness
- **Training Load**: RPE and difficulty tracking
- **Progress Visualization**: Charts and analytics
- **Pace Zone Calculations**: Dynamic pace zones based on goal time

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run db:push      # Push database schema
npm run db:studio    # Open Prisma Studio
```

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Perplexity API (sonar-pro model)
- **State**: Zustand with Immer
- **Auth**: NextAuth.js
- **Testing**: Jest + React Testing Library

## 🚢 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
DATABASE_URL=your_production_database_url
NEXT_PUBLIC_PERPLEXITY_API_KEY=your_api_key
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_production_secret
```

## 🎯 Race Information

- **Event**: Manchester Half Marathon
- **Date**: October 12, 2025
- **Goal**: Sub-2 hours (targeting 1:50-1:55)
- **Course**: Flat, fast city course
- **Weather**: Cool October conditions (ideal for racing)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Perplexity AI** for intelligent training adaptations
- **Garmin Connect** for comprehensive fitness data
- **MadeRunning Manchester** for club training sessions
- **Next.js Team** for the amazing React framework
- **Vercel** for hosting and deployment

---

**Built with ❤️ for runners, by runners. Good luck with your half marathon! 🏃‍♂️**

## 📋 Contributing & Development

### TODO List
We maintain an active TODO list to track improvements, bug fixes, and new features. See [TODO.md](./TODO.md) for:
- 🚨 High priority items (bugs, critical fixes)
- 🔧 Medium priority items (features, improvements)
- 🎯 Low priority items (nice-to-have features)

### Adding New Items
When you identify something that needs fixing or improvement:
1. Add it to [TODO.md](./TODO.md) with appropriate priority
2. Include context and any relevant details
3. Update this README if it affects the feature list

### Recent Updates (July 2025)
- ✅ **Dynamic Training Plans**: Plans now adapt to your race date (4-20 weeks)
- ✅ **Smart AI Triggers**: Context-aware adaptations that consider your comments
- ✅ **AI Race Predictions**: Restored predicted time feature with beautiful UI
- ✅ **Improved Messaging**: Fixed misleading AI feedback messages

## 📈 Current Status

- ✅ Core training plan functionality
- ✅ AI adaptations with smart context-aware triggers
- ✅ Session feedback and RPE tracking
- ✅ AI race time predictions
- ✅ Dynamic training plan duration
- ✅ Responsive UI with dark theme
- ✅ Volume calculations and periodization
- 🔄 Garmin integration (ready for testing)
- 🔄 Database persistence (schema ready)
- 🔄 Production deployment

**Ready for training with intelligent AI coaching! 🎯**