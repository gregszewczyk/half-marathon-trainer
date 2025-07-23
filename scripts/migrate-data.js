// scripts/migrate-data.js
const { PrismaClient: LocalPrisma } = require('@prisma/client');

// Local database connection
const local = new LocalPrisma({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Your local database
    }
  }
});

// Production database connection  
const production = new LocalPrisma({
  datasources: {
    db: {
      url: process.env.PRODUCTION_DATABASE_URL // We'll set this
    }
  }
});

async function migrateData() {
  try {
    console.log('🔍 Fetching local data...');
    
    // Get all local training plans
    const localPlans = await local.trainingPlan.findMany({
      include: {
        feedback: true
      }
    });
    
    console.log(`📊 Found ${localPlans.length} training plans locally`);
    
    for (const plan of localPlans) {
      console.log(`📋 Migrating plan for user: ${plan.userId}`);
      
      // Create training plan in production
      const prodPlan = await production.trainingPlan.create({
        data: {
          userId: plan.userId,
          goalTime: plan.goalTime,
          predictedTime: plan.predictedTime,
          currentWeek: plan.currentWeek,
          raceDate: plan.raceDate
        }
      });
      
      console.log(`✅ Created production plan: ${prodPlan.id}`);
      
      // Migrate feedback
      for (const feedback of plan.feedback) {
        await production.sessionFeedback.create({
          data: {
            sessionId: feedback.sessionId,
            week: feedback.week,
            day: feedback.day,
            sessionType: feedback.sessionType,
            sessionSubType: feedback.sessionSubType,
            plannedDistance: feedback.plannedDistance,
            plannedPace: feedback.plannedPace,
            plannedTime: feedback.plannedTime,
            completed: feedback.completed,
            actualPace: feedback.actualPace,
            difficulty: feedback.difficulty,
            rpe: feedback.rpe,
            feeling: feedback.feeling,
            comments: feedback.comments,
            aiModified: feedback.aiModified,
            trainingPlanId: prodPlan.id,
            submittedAt: feedback.submittedAt || new Date()
          }
        });
      }
      
      console.log(`📝 Migrated ${plan.feedback.length} feedback records`);
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await local.$disconnect();
    await production.$disconnect();
  }
}

migrateData();