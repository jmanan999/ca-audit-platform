import { create } from 'zustand';

// ─── Auth ────────────────────────────────────────────────────────────────────

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
  setUser: (user) => set({ user, isAuthenticated: true }),
}));

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: number;
  company_name: string;
  gst_number: string;
  pan_number?: string;
  cin_number?: string;
  industry: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  financial_year: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface ClientStore {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  removeClient: (id: number) => void;
}

export const useClientStore = create<ClientStore>((set) => ({
  clients: [],
  setClients: (clients) => set({ clients }),
  addClient: (client) => set((s) => ({ clients: [...s.clients, client] })),
  removeClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
}));

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditData {
  id: number;
  client_id: number;
  audit_type: string;
  status: string;
  risk_level: string;
  scope?: string;
  description?: string;
  deadline: string;
  start_date?: string;
  completion_date?: string;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
}

interface AuditStore {
  audits: AuditData[];
  setAudits: (audits: AuditData[]) => void;
  addAudit: (audit: AuditData) => void;
  updateAudit: (id: number, audit: Partial<AuditData>) => void;
  removeAudit: (id: number) => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  audits: [],
  setAudits: (audits) => set({ audits }),
  addAudit: (audit) => set((s) => ({ audits: [...s.audits, audit] })),
  updateAudit: (id, audit) =>
    set((s) => ({ audits: s.audits.map((a) => (a.id === id ? { ...a, ...audit } : a)) })),
  removeAudit: (id) => set((s) => ({ audits: s.audits.filter((a) => a.id !== id) })),
}));

// ─── Verification Item ────────────────────────────────────────────────────────

export type VerificationStatus = 'pending' | 'evidence_submitted' | 'verified' | 'rejected';
export type ItemType =
  | 'vehicle'
  | 'property'
  | 'equipment'
  | 'inventory'
  | 'bank_account'
  | 'financial_record'
  | 'other';

export interface VerificationItem {
  id: number;
  audit_id: number;
  title: string;
  description?: string;
  item_type: ItemType;
  reference_value?: string;
  status: VerificationStatus;
  ca_notes?: string;
  rejection_reason?: string;
  is_ai_parsed: boolean;
  transaction_id?: string;
  ledger_name?: string;
  vendor_name?: string;
  transaction_date?: string;
  is_tally_import?: boolean;
  is_high_risk?: boolean;
  risk_reason?: string;
  created_at: string;
  updated_at: string;
}

interface VerificationItemStore {
  items: VerificationItem[];
  setItems: (items: VerificationItem[]) => void;
  addItems: (items: VerificationItem[]) => void;
  addItem: (item: VerificationItem) => void;
  updateItem: (id: number, patch: Partial<VerificationItem>) => void;
  removeItem: (id: number) => void;
}

export const useVerificationItemStore = create<VerificationItemStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItems: (newItems) =>
    set((s) => {
      const existingIds = new Set(s.items.map((i) => i.id));
      const fresh = newItems.filter((i) => !existingIds.has(i.id));
      return { items: [...s.items, ...fresh] };
    }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  updateItem: (id, patch) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

// ─── Task (legacy, kept for backward compat) ──────────────────────────────────

export interface Task {
  id: number;
  audit_id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline: string;
  estimated_hours?: number;
  time_spent: number;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
}

interface TaskStore {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: number, task: Partial<Task>) => void;
  removeTask: (id: number) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, task) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...task } : t)) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id: number;
  audit_id: number;
  verification_item_id?: number;
  document_type: string;
  document_category: 'brief' | 'evidence';
  file_name: string;
  file_path: string;  // presigned URL when coming from /evidence endpoint
  file_size: number;
  verification_status: string;
  executive_notes?: string;
  latitude?: number;
  longitude?: number;
  device_timestamp?: string;
  extracted_data?: string;
  ai_insights?: string;
  uploaded_by?: number;
  created_at: string;
  updated_at: string;
}

interface DocumentStore {
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: number) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
  removeDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
}));
