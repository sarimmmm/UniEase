'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toaster';
import { Loader2, LayoutDashboard, GraduationCap, Users, CalendarClock, ShieldCheck } from 'lucide-react';

const ADMIN_TABS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/faculty', label: 'Faculty', icon: GraduationCap },
  { href: '/admin/study-requests', label: 'Study Requests', icon: Users },
  { href: '/admin/timetable', label: 'Timetable', icon: CalendarClock },
  { href: '/admin/users', label: 'Users', icon: ShieldCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      showToast('Admin access required.', 'error');
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAdmin]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6 border-l-4 border-[#1e3a8a] pl-5 py-0.5">
          <h1 className="text-3xl font-bold tracking-tight text-[#1e3a8a] mb-1">Admin</h1>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
            Manage content without touching the database
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 mb-8">
          {ADMIN_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  active ? 'bg-[#1e3a8a] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
