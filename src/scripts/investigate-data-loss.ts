// 🔍 DATA RECOVERY INVESTIGATION
// 🆕 NEW FILE: src/scripts/investigate-data-loss.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateDataLoss() {
  try {
    console.log('🔍 Investigating what happened to your data...');

    // Step 1: Check all tables that might contain your data
    console.log('\n📊 Current database state:');

    // Check users table
    try {
      const users = await prisma.$queryRaw`SELECT * FROM users ORDER BY "createdAt"`;
      console.log(`👥 Users found: ${Array.isArray(users) ? users.length : 0}`);
      if (Array.isArray(users) && users.length > 0) {
        users.forEach((user: any) => {
          console.log(`  - ${user.email} (ID: ${user.id}, created: ${user.createdAt})`);
        });
      }
    } catch (error) {
      console.log('❌ Could not access users table:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check training_plans table
    try {
      const plans = await prisma.$queryRaw`SELECT * FROM training_plans ORDER BY "createdAt"`;
      console.log(`📋 Training plans found: ${Array.isArray(plans) ? plans.length : 0}`);
      if (Array.isArray(plans) && plans.length > 0) {
        plans.forEach((plan: any) => {
          console.log(`  - Plan ID: ${plan.id}, userId: ${plan.userId}, created: ${plan.createdAt}`);
        });
      }
    } catch (error) {
      console.log('❌ Could not access training_plans table:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check session_feedback table
    try {
      const feedback = await prisma.$queryRaw`SELECT * FROM session_feedback ORDER BY "submittedAt"`;
      console.log(`💬 Session feedback found: ${Array.isArray(feedback) ? feedback.length : 0}`);
      if (Array.isArray(feedback) && feedback.length > 0) {
        feedback.forEach((fb: any) => {
          console.log(`  - Session: ${fb.sessionType}/${fb.sessionSubType}, userId: ${fb.userId}, completed: ${fb.completed}`);
        });
      }
    } catch (error) {
      console.log('❌ Could not access session_feedback table:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check for any other tables that might have your data
    try {
      const allTables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      console.log('\n📋 All tables in database:');
      if (Array.isArray(allTables)) {
        allTables.forEach((table: any) => {
          console.log(`  - ${table.table_name}`);
        });
      }
    } catch (error) {
      console.log('❌ Could not list tables:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check if there are any backups or other data
    console.log('\n🔍 Looking for any traces of your training data...');
    
    // Check for any records with 'default' or null userId
    try {
      const orphanedFeedback = await prisma.$queryRaw`
        SELECT * FROM session_feedback 
        WHERE "userId" IS NULL OR "userId" = 'default' OR "userId" = ''
      `;
      console.log(`🔍 Orphaned session feedback: ${Array.isArray(orphanedFeedback) ? orphanedFeedback.length : 0}`);
    } catch (error) {
      console.log('Could not check for orphaned feedback');
    }

    console.log('\n💡 Investigation complete. Please check the output above.');
    console.log('If all counts are 0, your data may have been lost during a migration.');
    console.log('If you see any data, we might be able to recover it!');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use
export default investigateDataLoss;

// Run if called directly
if (require.main === module) {
  investigateDataLoss();
}