/*
# Data Migration Instructions

## Step 1: Update Database Schema
```bash
# Add the new models to your schema.prisma
npm run db:push
# or
npx prisma db push
```

## Step 2: Install Required Dependencies
```bash
npm install bcryptjs
npm install @types/bcryptjs --save-dev
```

## Step 3: Run Data Migration
Make a POST request to `/api/auth/migrate-data` with your admin credentials:

```javascript
fetch('/api/auth/migrate-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    adminEmail: 'your.email@example.com',
    adminPassword: 'your-secure-password'
  })
});
```

## Step 4: Test Authentication
1. Go to `/auth/login`
2. Login with your admin credentials
3. Verify your existing data is still there
4. Test creating a new user account

## What This Migration Does:
- ✅ Creates your admin user account
- ✅ Preserves all your existing session feedback
- ✅ Keeps your training plan and progress
- ✅ Migrates data to proper user-isolated structure
- ✅ Maintains all AI modifications and settings

## After Migration:
- Your app will require login for all users
- New users get guided onboarding
- Each user has isolated training data
- Your existing progress is preserved
*/