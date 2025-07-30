import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get the first user for testing
    const user = await prisma.user.findFirst({
      select: { id: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 });
    }

    // Call the regenerate endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/regenerate-warmups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: user.id }),
    });

    const result = await response.json();

    return NextResponse.json({
      user: user.email,
      regenerationResult: result
    });

  } catch (error) {
    console.error('❌ Error in test regenerate:', error);
    return NextResponse.json(
      { error: 'Failed to test regeneration' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}