import React, { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/router';
import { authAPI } from '@/lib/api';
import { CheckCircle, Clock, Briefcase, HardHat } from 'lucide-react';

type AccountType = 'ca' | 'executive';

export default function Register() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>('ca');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false); // shows pending-approval screen for executives

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, form.email, form.password);
      await authAPI.register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: accountType === 'ca' ? 'ca_partner' : 'auditor',
      });
      if (accountType === 'ca') {
        router.push('/login');
      } else {
        setDone(true); // show pending approval screen
      }
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Pending approval screen for executives ──────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Created</h2>
          <p className="text-sm text-gray-600 mb-6">
            Your account is <strong>pending approval</strong> from the CA. You'll be able to
            use the field app once your CA approves your account.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 text-left space-y-1.5 mb-6">
            <p className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
              Account created for <strong>{form.email}</strong>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              Waiting for CA approval
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">CA Audit Platform</p>
        </div>

        {/* Account type selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(
            [
              { key: 'ca', label: 'CA / Admin', sub: 'Full dashboard access', Icon: Briefcase },
              { key: 'executive', label: 'Field Executive', sub: 'Mobile app access', Icon: HardHat },
            ] as const
          ).map(({ key, label, sub, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAccountType(key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                accountType === key
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon
                className={`w-6 h-6 ${accountType === key ? 'text-blue-600' : 'text-gray-400'}`}
              />
              <div>
                <p
                  className={`text-sm font-semibold ${
                    accountType === key ? 'text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {label}
                </p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {accountType === 'executive' && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Your account will need approval from your CA before you can use the field app.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min. 6 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+91 98765 43210"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors mt-2"
          >
            {loading
              ? 'Creating account…'
              : accountType === 'ca'
              ? 'Create CA Account'
              : 'Register as Executive'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
