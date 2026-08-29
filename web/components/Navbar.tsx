'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, LogIn, LogOut, User as UserIcon, Home, Calculator, GraduationCap, Users, CalendarClock, ShieldCheck, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, signOut, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    router.push('/');
  };

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Study Buddy', href: '/study-buddy', icon: Users },
    { name: 'GPA Calculator', href: '/gpa-calculator', icon: Calculator },
    { name: 'Faculty', href: '/faculty', icon: GraduationCap },
    { name: 'Timetable', href: '/timetable', icon: CalendarClock },
    ...(isAdmin ? [{ name: 'Admin', href: '/admin', icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-[#1e3a8a]" />
            <span className="text-xl font-bold text-gray-900">UniEase</span>
          </Link>

          {/* DESKTOP LINKS (Hidden on Mobile) */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  pathname === link.href ? 'text-[#1e3a8a] bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            ))}
          </div>

          {/* MOBILE MENU BUTTON (Visible only on Mobile) */}
          <div className="lg:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* DESKTOP AUTH */}
          {!loading && (
            <div className="hidden lg:flex items-center border-l pl-4 ml-2 border-gray-200">
              {user ? (
                <button onClick={handleSignOut} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <Link href="/login" className="bg-[#1e3a8a] text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700">
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE OVERLAY (Appears when Hamburger is clicked) */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full bg-white border-b shadow-xl">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-semibold ${
                  pathname === link.href ? 'bg-blue-50 text-[#1e3a8a]' : 'text-gray-700'
                }`}
              >
                <link.icon className="w-6 h-6" />
                {link.name}
              </Link>
            ))}
            {/* Mobile Auth button inside the menu */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              {user ? (
                <button onClick={handleSignOut} className="w-full flex items-center gap-4 px-4 py-4 text-red-600 font-bold">
                  <LogOut className="w-6 h-6" /> Logout
                </button>
              ) : (
                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] text-white py-4 rounded-xl font-bold">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
