'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { GraduationCap, Users, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';

interface Counts {
  profiles: number;
  faculty: number;
  studyRequests: number;
  facultyReviews: number;
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    async function loadCounts() {
      const [profiles, faculty, studyRequests, facultyReviews] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('faculty').select('*', { count: 'exact', head: true }),
        supabase.from('study_requests').select('*', { count: 'exact', head: true }),
        supabase.from('faculty_reviews').select('*', { count: 'exact', head: true }),
      ]);
      setCounts({
        profiles: profiles.count ?? 0,
        faculty: faculty.count ?? 0,
        studyRequests: studyRequests.count ?? 0,
        facultyReviews: facultyReviews.count ?? 0,
      });
    }
    loadCounts();
  }, []);

  const cards = [
    { label: 'Registered Students', value: counts?.profiles, icon: Users, href: '/admin/users', color: 'text-[#1e3a8a] bg-blue-50' },
    { label: 'Faculty Members', value: counts?.faculty, icon: GraduationCap, href: '/admin/faculty', color: 'text-purple-600 bg-purple-50' },
    { label: 'Study Requests', value: counts?.studyRequests, icon: MessageSquare, href: '/admin/study-requests', color: 'text-green-600 bg-green-50' },
    { label: 'Faculty Reviews', value: counts?.facultyReviews, icon: ShieldCheck, href: '/admin/faculty', color: 'text-amber-600 bg-amber-50' },
  ];

  if (!counts) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md hover:border-gray-200 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${c.color}`}>
              <c.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500 font-medium">{c.label}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300" />
        </Link>
      ))}
    </div>
  );
}
