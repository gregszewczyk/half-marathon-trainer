import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Simple connection test
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Try a simple query
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      userCount
    });
    
  } catch (error) {
    console.error('Database connection failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}