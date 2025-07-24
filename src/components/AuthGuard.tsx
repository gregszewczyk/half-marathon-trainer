'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuthed(authenticated);
      
      if (requireAuth && !authenticated) {
        router.push('/auth/login');
        return;
      }
      
      if (!requireAuth && authenticated) {
        router.push('/dashboard');
        return;
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [requireAuth, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}