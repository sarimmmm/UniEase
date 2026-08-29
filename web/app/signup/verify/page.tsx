'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const { verifySignupOtp, resendSignupOtp } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email) {
      setError('Missing email — go back and sign up again.');
      return;
    }
    if (!code.trim()) {
      setError('Enter the code from your email.');
      return;
    }

    setLoading(true);
    const { error } = await verifySignupOtp(email, code.trim());
    setLoading(false);

    if (error) {
      setError(error.message || "That code didn't work. Check it and try again.");
      return;
    }
    router.push('/');
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError('');
    setInfo('');
    const { error } = await resendSignupOtp(email);
    setResending(false);
    if (error) {
      setError(error.message || "Couldn't resend the code. Try again in a moment.");
    } else {
      setInfo('New code sent — check your email.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-[#1e3a8a]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">UniEase</h1>
          <p className="text-blue-200">
            {email ? (
              <>We sent a verification code to <span className="font-semibold text-white">{email}</span></>
            ) : (
              'Check your email for a verification code.'
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {info}
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={12}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter code"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-center text-lg tracking-[0.3em] focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a8a] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & continue'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full text-sm font-medium text-[#1e3a8a] hover:underline disabled:opacity-50"
            >
              {resending ? 'Resending…' : "Didn't get a code? Resend"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Wrong email?{' '}
              <Link href="/signup" className="text-[#1e3a8a] font-semibold hover:underline">
                Sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifySignupPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
