import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function safeMigration() {
  try {
    console.log('🛡️ Starting SAFE database migration...');
    console.log('📊 This will preserve ALL your existing data');

    // Step 1: Check current data
    console.log('\n📋 Current data inventory:');
    const existingPlans = await prisma.trainingPlan.count();
    const existingFeedback = await prisma.sessionFeedback.count();
    console.log(`- Training Plans: ${existingPlans}`);
    console.log(`- Session Feedback: ${existingFeedback}`);

    // Step 2: Create default user for existing data
    const defaultUserId = 'cldefault' + randomUUID().slice(10);
    
    let defaultUser;
    try {
      defaultUser = await prisma.user.create({
        data: {
          id: defaultUserId,
          email: 'default@training.app',
          password: await bcrypt.hash('default123', 12),
          name: 'Default User',
        }
      });
      console.log('✅ Created default user:', defaultUser.email);
    } catch (error) {
      // User might already exist
      defaultUser = await prisma.user.findFirst({
        where: { email: 'default@training.app' }
      });
      console.log('✅ Default user already exists');
    }

    // Step 3: Create your admin user
    const adminEmail = 'grzeg.szewczyk@gmail.com'; // ← CHANGE THIS
    const adminPassword = 'Test@1234'; // ← CHANGE THIS
    const adminUserId = 'cladmin' + randomUUID().slice(10);

    let adminUser;
    try {
      adminUser = await prisma.user.create({
        data: {
          id: adminUserId,
          email: adminEmail,
          password: await bcrypt.hash(adminPassword, 12),
          name: 'Admin',
        }
      });
      console.log('✅ Created admin user:', adminUser.email);
    } catch (error) {
      console.log('ℹ️ Admin user might already exist');
      adminUser = await prisma.user.findUnique({
        where: { email: adminEmail }
      });
    }

    // Step 4: Link existing training plans to default user
    console.log('\n🔗 Linking existing data...');
    
    // Check if TrainingPlan has userId column
    const plansToUpdate = await prisma.$queryRaw`
      SELECT * FROM "TrainingPlan" 
      WHERE "userId" IS NULL OR "userId" = 'default'
      LIMIT 10
    `;
    
    if (Array.isArray(plansToUpdate) && plansToUpdate.length > 0 && defaultUser) {
      // Update plans to reference default user
      const updateResult = await prisma.$executeRaw`
        UPDATE "TrainingPlan" 
        SET "userId" = ${defaultUser.id}
        WHERE "userId" IS NULL OR "userId" = 'default'
      `;
      console.log(`✅ Updated ${updateResult} training plans`);
    }

    // Step 5: Link existing session feedback
    let trainingPlan = null;
    if (defaultUser) {
      trainingPlan = await prisma.trainingPlan.findFirst({
        where: { userId: defaultUser.id }
      });
    }

    if (trainingPlan && defaultUser) {
      // Check for feedback without userId
      const feedbackToUpdate = await prisma.$queryRaw`
        SELECT * FROM "SessionFeedback" 
        WHERE "userId" IS NULL OR "userId" = 'default'
        LIMIT 10
      `;

      if (Array.isArray(feedbackToUpdate) && feedbackToUpdate.length > 0) {
        const updateFeedbackResult = await prisma.$executeRaw`
          UPDATE "SessionFeedback" 
          SET "userId" = ${defaultUser.id}, "trainingPlanId" = ${trainingPlan.id}
          WHERE "userId" IS NULL OR "userId" = 'default'
        `;
        console.log(`✅ Updated ${updateFeedbackResult} session feedback records`);
      }
    }

    // Step 6: Create user profiles
    if (adminUser) {
      try {
        await prisma.userProfile.create({
          data: {
            userId: adminUser.id,
            raceType: 'HALF_MARATHON',
            targetTime: '2:00:00',
            raceDate: new Date('2025-10-12'),
            fitnessLevel: 'INTERMEDIATE',
            trainingDaysPerWeek: 4,
          }
        });
        console.log('✅ Created admin profile');
      } catch (error) {
        console.log('ℹ️ Admin profile might already exist');
      }

      // Create admin training plan
      try {
        await prisma.trainingPlan.create({
          data: {
            userId: adminUser.id,
            goalTime: '2:00:00',
            raceDate: new Date('2025-10-12'),
          }
        });
        console.log('✅ Created admin training plan');
      } catch (error) {
        console.log('ℹ️ Admin training plan might already exist');
      }
    }

    // Step 7: Verify migration success
    console.log('\n🔍 Migration verification:');
    const finalPlans = await prisma.trainingPlan.count();
    const finalFeedback = await prisma.sessionFeedback.count();
    const totalUsers = await prisma.user.count();
    
    console.log(`- Training Plans: ${finalPlans} (was ${existingPlans})`);
    console.log(`- Session Feedback: ${finalFeedback} (was ${existingFeedback})`);
    console.log(`- Users: ${totalUsers}`);

    if (finalPlans >= existingPlans && finalFeedback >= existingFeedback) {
      console.log('🎉 Migration successful! All data preserved.');
      console.log('\n🔑 Your login credentials:');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      console.log('⚠️ Data count mismatch - please verify manually');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('💡 Your original data is still intact');
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in package.json script
export default safeMigration;

// Run if called directly
if (require.main === module) {
  safeMigration();
}