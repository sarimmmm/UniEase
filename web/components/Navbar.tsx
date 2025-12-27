'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, LogIn, LogOut, User as UserIcon, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-[#1e3a8a]" />
            <span className="text-lg sm:text-xl font-bold text-gray-900">UniEase</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className={`px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/'
                  ? 'text-[#1e3a8a] bg-blue-50'
                  : 'text-gray-700 hover:text-[#1e3a8a] hover:bg-blue-50'
              }`}
            >
              <span className="hidden sm:inline">Home</span>
              <Home className="w-4 h-4 sm:hidden" />
            </Link>
            <Link
              href="/study-buddy"
              className={`px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/study-buddy'
                  ? 'text-[#1e3a8a] bg-blue-50'
                  : 'text-gray-700 hover:text-[#1e3a8a] hover:bg-blue-50'
              }`}
            >
              <span className="hidden sm:inline">Study Buddy</span>
              <span className="sm:hidden">Study</span>
            </Link>
            <Link
              href="/faculty"
              className={`px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/faculty'
                  ? 'text-[#1e3a8a] bg-blue-50'
                  : 'text-gray-700 hover:text-[#1e3a8a] hover:bg-blue-50'
              }`}
            >
              Faculty
            </Link>
            <Link
              href="/gpa-calculator"
              className={`px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                pathname === '/gpa-calculator'
                  ? 'text-[#1e3a8a] bg-blue-50'
                  : 'text-gray-700 hover:text-[#1e3a8a] hover:bg-blue-50'
              }`}
            >
              <span className="hidden sm:inline">GPA Calculator</span>
              <span className="sm:hidden">GPA</span>
            </Link>
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-700">
                      <UserIcon className="w-4 h-4" />
                      <span className="hidden md:inline">{user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-700 hover:text-[#1e3a8a] rounded-lg font-medium transition-colors text-sm sm:text-base"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1e3a8a] text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Login</span>
                    <span className="sm:hidden">Login</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

