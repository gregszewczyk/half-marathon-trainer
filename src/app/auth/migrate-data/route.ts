import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { adminEmail, adminPassword } = await request.json();

    console.log('🔄 Starting data migration...');

    // Create your admin account first
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin', // You can change this
      }
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Create admin profile with your current settings
    const adminProfile = await prisma.userProfile.create({
      data: {
        userId: adminUser.id,
        raceType: 'HALF_MARATHON',
        targetTime: '2:00:00',
        raceDate: new Date('2025-10-12'), // Your Manchester Half Marathon date
        fitnessLevel: 'INTERMEDIATE',
        trainingDaysPerWeek: 4,
      }
    });

    console.log('✅ Admin profile created');

    // Migrate existing training plan
    const existingPlan = await prisma.trainingPlan.findFirst({
      where: { userId: 'default' }
    });

    let migratedPlan;
    if (existingPlan) {
      // Update existing plan to belong to admin user
      migratedPlan = await prisma.trainingPlan.update({
        where: { id: existingPlan.id },
        data: { userId: adminUser.id }
      });
      console.log('✅ Existing training plan migrated');
    } else {
      // Create new training plan
      migratedPlan = await prisma.trainingPlan.create({
        data: {
          userId: adminUser.id,
          goalTime: '2:00:00',
          raceDate: new Date('2025-10-12'),
        }
      });
      console.log('✅ New training plan created');
    }

    // Migrate all existing session feedback to admin user
    const existingFeedback = await prisma.sessionFeedback.findMany({
      where: { 
        userId: 'default' // Only migrate 'default' user data
      }
    });

    if (existingFeedback.length > 0) {
      // Update all existing feedback to belong to admin user
      const updatePromises = existingFeedback.map(feedback =>
        prisma.sessionFeedback.update({
          where: { id: feedback.id },
          data: { 
            userId: adminUser.id,
            trainingPlanId: migratedPlan.id
          }
        })
      );

      await Promise.all(updatePromises);
      console.log(`✅ Migrated ${existingFeedback.length} session feedback records`);
    }

    console.log('🎉 Data migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Data migration completed successfully',
      migratedRecords: {
        user: adminUser.email,
        profile: !!adminProfile,
        trainingPlan: !!migratedPlan,
        sessionFeedback: existingFeedback.length
      }
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}