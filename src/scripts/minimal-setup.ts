// 🎯 MINIMAL SETUP - Just get calendar working
// 🆕 NEW FILE: src/scripts/minimal-setup.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function minimalSetup() {
  try {
    console.log('🎯 Setting up minimal data to get calendar working...');

    // Step 1: Find your admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'grzeg.szewczyk@gmail.com' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email}`);

    // Step 2: Create just ONE empty training plan (required for calendar to work)
    await prisma.$executeRaw`
      INSERT INTO training_plans (
        "id", "userId", "goalTime", "predictedTime", "currentWeek", 
        "startDate", "raceDate", "createdAt", "updatedAt"
      ) VALUES (
        'cltp' || substr(gen_random_uuid()::text, 1, 10),
        ${adminUser.id},
        '2:00:00',
        '2:00:00',
        1,
        '2025-07-21T00:00:00Z',
        '2025-10-12T00:00:00Z',
        NOW(),
        NOW()
      ) ON CONFLICT DO NOTHING
    `;

    console.log('✅ Created empty training plan');

    // Step 3: Create user profile (required for onboarding flow)
    await prisma.$executeRaw`
      INSERT INTO user_profiles (
        "id", "userId", "raceType", "targetTime", "raceDate", 
        "fitnessLevel", "trainingDaysPerWeek", "preferredDifficulty",
        "createdAt", "updatedAt"
      ) VALUES (
        'clup' || substr(gen_random_uuid()::text, 1, 10),
        ${adminUser.id},
        'HALF_MARATHON',
        '2:00:00',
        '2025-10-12T00:00:00Z',
        'INTERMEDIATE',
        4,
        5,
        NOW(),
        NOW()
      ) ON CONFLICT ("userId") DO NOTHING
    `;

    console.log('✅ Created user profile');

    // Step 4: Verify setup
    const planCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM training_plans WHERE "userId" = ${adminUser.id}
    ` as Array<{count: number}>;
    
    const profileCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM user_profiles WHERE "userId" = ${adminUser.id}
    ` as Array<{count: number}>;

    console.log('\n🎉 Minimal setup completed!');
    console.log(`📊 Setup verification:`);
    console.log(`- Training plans: ${planCount[0]?.count || 0}`);
    console.log(`- User profiles: ${profileCount[0]?.count || 0}`);
    console.log(`- Session feedback: 0 (empty - ready for your real data)`);
    
    console.log('\n🔄 Refresh your dashboard now!');
    console.log('📅 Your training calendar should appear');
    console.log('💪 You can now manually add your real Garmin/Strava sessions');
    console.log('🎯 Dashboard will show 0% completion until you add real data');

  } catch (error) {
    console.error('❌ Failed to create minimal setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use
export default minimalSetup;

// Run if called directly
if (require.main === module) {
  minimalSetup();
}