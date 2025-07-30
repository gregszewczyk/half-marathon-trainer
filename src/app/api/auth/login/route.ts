import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Login attempt started');
    const { email, password } = await request.json();
    console.log('📧 Email received:', email ? 'present' : 'missing');
    console.log('🔑 Password received:', password ? 'present' : 'missing');

    // Validation
    if (!email || !password) {
      console.log('❌ Validation failed - missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Attempting to find user in database...');
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true // Include profile for dashboard
      }
    });
    console.log('👤 User found:', user ? 'yes' : 'no');

    if (!user) {
      console.log('❌ User not found for email:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('🔐 Verifying password...');
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('✅ Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('✅ User logged in successfully:', user.email);

    return NextResponse.json({
      success: true,
      userId: user.id,
      name: user.name,
      email: user.email,
      hasProfile: !!user.profile
    });

  } catch (error) {
    console.error('❌ Login error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}