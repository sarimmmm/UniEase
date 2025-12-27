'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, LogIn, LogOut, User as UserIcon, Home, Calculator, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Helper function to handle active state styles
  const getLinkStyle = (path: string) => 
    `px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base flex items-center gap-2 ${
      pathname === path
        ? 'text-[#1e3a8a] bg-blue-50'
        : 'text-gray-700 hover:text-[#1e3a8a] hover:bg-blue-50'
    }`;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-[#1e3a8a]" />
            <span className="text-lg sm:text-xl font-bold text-gray-900">UniEase</span>
          </Link>

          {/* NAVIGATION LINKS */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* 1. HOME */}
            <Link href="/" className={getLinkStyle('/')}>
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {/* 2. STUDY BUDDY */}
            <Link href="/study-buddy" className={getLinkStyle('/study-buddy')}>
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Study Buddy</span>
              <span className="sm:hidden">Study</span>
            </Link>

            {/* 3. GPA CALCULATOR */}
            <Link href="/gpa-calculator" className={getLinkStyle('/gpa-calculator')}>
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">GPA Calculator</span>
              <span className="sm:hidden">GPA</span>
            </Link>

            {/* 4. FACULTY */}
            <Link href="/faculty" className={getLinkStyle('/faculty')}>
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Faculty</span>
            </Link>

            {/* AUTH SECTION */}
            {!loading && (
              <div className="ml-2 sm:ml-4 flex items-center border-l pl-2 sm:pl-4 border-gray-200">
                {user ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                      <UserIcon className="w-4 h-4" />
                      <span className="max-w-[150px] truncate">{user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm sm:text-base"
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
                    <span>Login</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
