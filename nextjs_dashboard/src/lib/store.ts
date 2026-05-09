import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, isAuthenticated: false });
  },
  setUser: (user) => set({ user }),
}));

interface AuditData {
  id: number;
  client_id: number;
  status: string;
  deadline: string;
  risk_level: string;
}

interface AuditStore {
  audits: AuditData[];
  setAudits: (audits: AuditData[]) => void;
  addAudit: (audit: AuditData) => void;
  updateAudit: (id: number, audit: Partial<AuditData>) => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  audits: [],
  setAudits: (audits) => set({ audits }),
  addAudit: (audit) =>
    set((state) => ({ audits: [...state.audits, audit] })),
  updateAudit: (id, audit) =>
    set((state) => ({
      audits: state.audits.map((a) => (a.id === id ? { ...a, ...audit } : a)),
    })),
}));
