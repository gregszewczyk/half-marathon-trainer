// 🔧 SIMPLE CREDENTIAL UPDATE
// 🆕 NEW FILE: src/scripts/update-credentials.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updateCredentials() {
  try {
    console.log('🔑 Updating admin credentials...');

    // Your new credentials - UPDATE THESE!
    const adminEmail: string = 'grzeg.szewczyk@gmail.com'; // ← CHANGE THIS
    const adminPassword: string = 'Dacek@1991'; // ← CHANGE THIS

    if (adminEmail === 'your.email@example.com') {
      console.log('❌ Please update the email and password in the script first!');
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Check if user with this email exists
    let user = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (user) {
      // Update existing user's password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log(`✅ Updated password for existing user: ${adminEmail}`);
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin',
        }
      });
      console.log(`✅ Created new admin user: ${adminEmail}`);
    }

    console.log('\n🎉 Credentials updated successfully!');
    console.log(`🔑 Your login credentials:`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('\n🚀 You can now login at /auth/login');

  } catch (error) {
    console.error('❌ Failed to update credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use
export default updateCredentials;

// Run if called directly
if (require.main === module) {
  updateCredentials();
}