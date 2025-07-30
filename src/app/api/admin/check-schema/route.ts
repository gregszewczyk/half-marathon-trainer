// 🔍 Database Schema Diagnostic - Check Foreign Key Relationships
// Save as: src/app/api/admin/check-schema/route.ts

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting database schema diagnostic...');

    // Check 1: Verify admin user exists and in which table
    console.log('📋 Checking admin user existence...');
    
    // Try different possible user table/model names
    let adminUser = null;
    let userTableUsed = '';
    
    try {
      adminUser = await prisma.user.findUnique({
        where: { id: 'cmdhtwtil00000vg18swahirhu' }
      });
      userTableUsed = 'User';
      console.log('✅ Found admin in User table:', adminUser ? 'EXISTS' : 'NOT FOUND');
    } catch (error) {
      console.log('❌ User table error:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check 2: Look at existing GeneratedSession records to see structure
    console.log('📋 Checking existing GeneratedSession records...');
    
    const existingSessions = await prisma.generatedSession.findMany({
      take: 2,
      include: {
        user: true // This will fail if relationship is broken
      }
    });
    
    console.log('✅ Found existing sessions:', existingSessions.length);
    console.log('📄 Sample session structure:', JSON.stringify(existingSessions[0], null, 2));

    // Check 3: Try to create a minimal test session to see exact error
    console.log('🧪 Testing minimal session creation...');
    
    try {
      const testSession = await prisma.generatedSession.create({
        data: {
          userId: 'cmdhtwtil00000vg18swahirhu',
          week: 1,
          dayOfWeek: 'Monday',
          sessionType: 'REST', // Use safest session type
          generatedAt: new Date(),
        }
      });
      
      console.log('✅ Test session created successfully:', testSession.id);
      
      // Clean up test session
      await prisma.generatedSession.delete({
        where: { id: testSession.id }
      });
      console.log('🗑️ Test session cleaned up');
      
    } catch (createError) {
      console.log('❌ Test session creation failed:', createError instanceof Error ? createError.message : 'Unknown error');
    }

    // Check 4: Raw database query to see actual constraint
    console.log('🔍 Checking database constraints...');
    
    try {
      const constraints = await prisma.$queryRaw`
        SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
        FROM information_schema.key_column_usage 
        WHERE table_name = 'generated_sessions' 
        AND constraint_name LIKE '%fkey%';
      `;
      console.log('📋 Foreign key constraints:', constraints);
    } catch (constraintError) {
      console.log('❌ Constraint check failed:', constraintError instanceof Error ? constraintError.message : 'Unknown error');
    }

    return NextResponse.json({
      success: true,
      adminUserExists: !!adminUser,
      userTableUsed,
      existingSessionsCount: existingSessions.length,
      diagnosticComplete: true,
      message: 'Check console logs for detailed diagnostic information'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Schema diagnostic failed:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Schema diagnostic failed - check console for details'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}