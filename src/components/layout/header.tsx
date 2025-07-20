import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { 
  HomeIcon, 
  CalendarIcon, 
  ChartBarIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline'

export function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">HM</span>
            </div>
            <span className="font-bold text-xl text-white">
              Half Marathon Trainer
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ChartBarIcon className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link 
              href="/training" 
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <CalendarIcon className="h-5 w-5" />
              <span>Training</span>
            </Link>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            ) : session ? (
              <div className="flex items-center space-x-3">
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <span className="text-sm text-gray-300 hidden sm:block">
                  {session.user?.name || session.user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => signIn()}
                className="flex items-center space-x-2"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}