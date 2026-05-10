import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';
import { executivesAPI } from '@/lib/api';
import { LayoutDashboard, Users, ClipboardList, LogOut, UserCheck } from 'lucide-react';

const staticNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/audits', label: 'Audits', icon: ClipboardList },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    executivesAPI.list().then((res) => {
      const pending = (res.data as any[]).filter((e) => !e.is_approved && e.is_active);
      setPendingCount(pending.length);
    }).catch(() => {});
  }, [router.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 fixed inset-y-0 flex flex-col z-10">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-blue-700">CA Audit Platform</h1>
          <p className="text-xs text-gray-400 mt-0.5">Audit Management System</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {staticNavItems.map(({ href, label, icon: Icon }) => {
            const active =
              router.pathname === href || router.pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}

          {/* Executives — with pending badge */}
          {(() => {
            const active = router.pathname === '/executives';
            return (
              <Link
                href="/executives"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-5 h-5 shrink-0" />
                <span className="flex-1">Executives</span>
                {pendingCount > 0 && (
                  <span className="ml-auto min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })()}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200">
          {user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.name || user.email}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 min-h-screen">{children}</main>
    </div>
  );
}
