import React, { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/router';
import { ShieldAlert, Smartphone } from 'lucide-react';

const CA_ROLES = new Set(['admin', 'ca_partner']);

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);

  // When useAuthGuard redirects here with ?reason=not_ca
  const notCA = router.query.reason === 'not_ca';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseToken = await cred.user.getIdToken();
      const response = await authAPI.login(firebaseToken);
      const { access_token, user } = response.data;

      if (!CA_ROLES.has(user.role)) {
        // Executive trying to log into the dashboard — block with clear message
        setError(
          user.role === 'auditor' || user.role === 'article_trainee'
            ? 'This dashboard is for CAs only. Please use the field mobile app instead.'
            : 'Your account does not have dashboard access.',
        );
        return;
      }

      login(user, access_token);
      router.push('/dashboard');
    } catch (err: any) {
      // Don't expose Firebase internals; give clean messages
      const msg: string = err.message ?? '';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError(err.response?.data?.detail ?? msg ?? 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-gray-900">CA Audit Platform</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Banner shown when an executive tries to access the dashboard */}
        {notCA && !error && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Smartphone className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold mb-0.5">Dashboard is for CAs only</p>
              <p className="text-xs">Field executives should use the mobile app.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          New to the platform?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
