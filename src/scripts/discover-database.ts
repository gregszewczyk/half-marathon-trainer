// 🔍 DATABASE DISCOVERY SCRIPT
// 🆕 NEW FILE: src/scripts/discover-database.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function discoverDatabase() {
  try {
    console.log('🔍 Discovering your current database structure...');
    
    // Method 1: Try to get table names from information_schema
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      console.log('\n📋 Found these tables:');
      console.log(tables);
    } catch (error) {
      if (error instanceof Error) {
        console.log('❌ Could not query information_schema:', error.message);
      } else {
        console.log('❌ Could not query information_schema:', error);
      }
    }

    // Method 2: Try common table name variations
    const possibleTableNames = [
      'TrainingPlan',
      'training_plans', 
      'trainingplans',
      'SessionFeedback',
      'session_feedback',
      'sessionfeedback',
      'User',
      'users',
      'user'
    ];

    console.log('\n🔍 Testing possible table names:');
    
    for (const tableName of possibleTableNames) {
      try {
        const result = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM ${prisma.$queryRawUnsafe(`"${tableName}"`)}
          LIMIT 1;
        `;
        console.log(`✅ Table "${tableName}" exists with data:`, result);
      } catch (error) {
        console.log(`❌ Table "${tableName}" does not exist`);
      }
    }

    // Method 3: Try to use your existing Prisma models
    console.log('\n🎯 Testing Prisma model access:');
    
    try {
      const planCount = await prisma.trainingPlan.count();
      console.log(`✅ trainingPlan model works - found ${planCount} records`);
    } catch (error) {
      if (error instanceof Error) {
        console.log('❌ trainingPlan model failed:', error.message);
      } else {
        console.log('❌ trainingPlan model failed:', error);
      }
    }

    try {
      const feedbackCount = await prisma.sessionFeedback.count();
      console.log(`✅ sessionFeedback model works - found ${feedbackCount} records`);
    } catch (error) {
      if (error instanceof Error) {
        console.log('❌ sessionFeedback model failed:', error.message);
      } else {
        console.log('❌ sessionFeedback model failed:', error);
      }
    }

    // Method 4: Show current schema
    try {
      console.log('\n📊 Current database schema info:');
      const schemaInfo = await prisma.$queryRaw`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `;
      console.log('Schema details:', schemaInfo);
    } catch (error) {
      if (error instanceof Error) {
        console.log('❌ Could not get schema info:', error.message);
      } else {
        console.log('❌ Could not get schema info:', error);
      }
    }

  } catch (error) {
    console.error('❌ Discovery failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use
export default discoverDatabase;

// Run if called directly
if (require.main === module) {
  discoverDatabase();
}