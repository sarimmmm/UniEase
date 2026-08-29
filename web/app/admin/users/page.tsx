'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toaster';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { fetchAllProfiles, setUserRole } from '@/lib/database';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { ShieldCheck, Shield } from 'lucide-react';

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const { user, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setProfiles(await fetchAllProfiles());
    } finally {
      setLoading(false);
    }
  };

  async function handleToggleRole(profile: Profile) {
    const newRole = profile.role === 'admin' ? 'student' : 'admin';
    if (!confirm(`${newRole === 'admin' ? 'Grant' : 'Revoke'} admin access for ${profile.name || profile.email}?`)) return;
    setUpdatingId(profile.id);
    const result = await setUserRole(profile.id, newRole);
    setUpdatingId(null);
    if (result.success) {
      showToast(`${profile.name || profile.email} is now ${newRole === 'admin' ? 'an admin' : 'a student'}.`, 'success');
      await load();
      if (profile.id === user?.id) await refreshProfile();
    } else {
      showToast(result.error || 'Failed to update role.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Users ({profiles.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase text-gray-400 border-b">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="py-3 pr-4 font-semibold text-gray-900">
                  {p.name || <span className="text-gray-400 italic">Unnamed</span>}
                  {p.id === user?.id && <span className="ml-2 text-[10px] font-bold text-[#1e3a8a] bg-blue-50 px-1.5 py-0.5 rounded">YOU</span>}
                </td>
                <td className="py-3 pr-4 text-gray-600">{p.email}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                      p.role === 'admin' ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.role}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right">
                  <button
                    onClick={() => handleToggleRole(p)}
                    disabled={updatingId === p.id}
                    className={`flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                      p.role === 'admin' ? 'text-red-600 hover:bg-red-50' : 'text-[#1e3a8a] hover:bg-blue-50'
                    }`}
                  >
                    {p.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {p.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
