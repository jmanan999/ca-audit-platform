import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from './store';
import { authAPI } from './api';

const CA_ROLES = new Set(['admin', 'ca_partner']);

export function useAuthGuard() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    if (user) {
      // Already have user — enforce role gate
      if (!CA_ROLES.has(user.role)) {
        logout();
        router.push('/login?reason=not_ca');
      } else {
        setReady(true);
      }
      return;
    }
    authAPI
      .getMe()
      .then((res) => {
        const fetchedUser = res.data;
        if (!CA_ROLES.has(fetchedUser.role)) {
          // Executive or other non-CA role — clear token, send to login with reason
          localStorage.removeItem('access_token');
          logout();
          router.push('/login?reason=not_ca');
          return;
        }
        login(fetchedUser, token);
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        router.push('/login');
      });
  }, []);

  return { user, ready };
}
