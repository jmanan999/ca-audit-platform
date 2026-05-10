import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useVirtualizer } from '@tanstack/react-virtual';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import VerificationItemCard from '@/components/VerificationItemCard';
import BriefUploader from '@/components/BriefUploader';
import AddItemModal from '@/components/AddItemModal';
import FinalApprovalModal from '@/components/FinalApprovalModal';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useVerificationItemStore, useAuditStore, useClientStore, VerificationItem } from '@/lib/store';
import { auditsAPI, clientsAPI, verificationItemsAPI } from '@/lib/api';
import {
  ArrowLeft, Plus, CheckSquare, X, Calendar, ChevronDown,
  MessageCircle, Mail, Upload, Zap, ShieldAlert, Download,
  FileSpreadsheet, Table2, History, Wifi,
} from 'lucide-react';

type FilterTab = 'all' | 'pending' | 'evidence_submitted' | 'verified' | 'rejected';
type RejectState = { open: boolean; itemId: number | null; reason: string };

const AUDIT_STATUSES = ['planned', 'in_progress', 'under_review', 'completed', 'on_hold'];

export default function AuditDetail() {
  const router = useRouter();
  const { id } = router.query;
  const auditId = id ? parseInt(id as string) : null;
  const { ready } = useAuthGuard();

  const audits = useAuditStore((s) => s.audits);
  const updateAudit = useAuditStore((s) => s.updateAudit);
  const clients = useClientStore((s) => s.clients);
  const setClients = useClientStore((s) => s.setClients);
  const items = useVerificationItemStore((s) => s.items.filter((i) => i.audit_id === auditId));
  const setItems = useVerificationItemStore((s) => s.setItems);
  const addItem = useVerificationItemStore((s) => s.addItem);
  const addItems = useVerificationItemStore((s) => s.addItems);
  const updateItem = useVerificationItemStore((s) => s.updateItem);
  const removeItem = useVerificationItemStore((s) => s.removeItem);

  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('all');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [rejectState, setRejectState] = useState<RejectState>({ open: false, itemId: null, reason: '' });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [showBriefUploader, setShowBriefUploader] = useState(false);

  // Document Request state
  const [showRequestPanel, setShowRequestPanel] = useState(false);
  const [requestList, setRequestList] = useState<{ document: string; reason: string; priority: string }[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [lastRequestedAt, setLastRequestedAt] = useState<string | null>(null);
  const [markingRequested, setMarkingRequested] = useState(false);

  // Tally CSV Import state (existing)
  const [showTallyPanel, setShowTallyPanel] = useState(false);
  const [tallyFile, setTallyFile] = useState<File | null>(null);
  const [tallyImporting, setTallyImporting] = useState(false);
  const [tallyResult, setTallyResult] = useState<{ created: number; skipped: number } | null>(null);
  const [minValue, setMinValue] = useState(50000);
  const [sampleSize, setSampleSize] = useState(25);
  const [sampling, setSampling] = useState(false);
  const [sampleResult, setSampleResult] = useState<{ total_transactions: number; flagged_count: number } | null>(null);

  // Tally Hot-Sync state (new)
  const [showHotSyncPanel, setShowHotSyncPanel] = useState(false);
  const [hotSyncHost, setHotSyncHost] = useState('localhost');
  const [hotSyncPort, setHotSyncPort] = useState(9000);
  const [hotSyncCompany, setHotSyncCompany] = useState('');
  const [hotSyncFrom, setHotSyncFrom] = useState('');
  const [hotSyncTo, setHotSyncTo] = useState('');
  const [hotSyncing, setHotSyncing] = useState(false);
  const [hotSyncResult, setHotSyncResult] = useState<{ created: number; skipped: number } | null>(null);

  // Bulk Excel Upload state (new)
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; failed: number } | null>(null);

  // Audit Trail state (new)
  const [showTrailPanel, setShowTrailPanel] = useState(false);
  const [trail, setTrail] = useState<any[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);

  // Export state (new)
  const [exporting, setExporting] = useState<'zip' | 'pdf' | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const clientName = clients.find((c) => c.id === audit?.client_id)?.company_name;
  const allItems = items;

  const filtered = tab === 'all' ? allItems : allItems.filter((i) => i.status === tab);
  const verifiedCount = allItems.filter((i) => i.status === 'verified').length;
  const rejectedCount = allItems.filter((i) => i.status === 'rejected').length;
  const reviewedCount = verifiedCount + rejectedCount;
  const canFinalize = allItems.length > 0 && reviewedCount === allItems.length;

  const showCheckboxes = tab === 'evidence_submitted';

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 130,
    overscan: 5,
  });

  useEffect(() => {
    if (!ready || !auditId) return;
    const load = async () => {
      try {
        const [auditRes, itemsRes, clientsRes] = await Promise.all([
          auditsAPI.get(auditId),
          verificationItemsAPI.list(auditId, { limit: 500 }),
          clientsAPI.list(),
        ]);
        setAudit(auditRes.data);
        setItems(itemsRes.data);
        setClients(clientsRes.data);
        if (auditRes.data.last_requested_at) {
          setLastRequestedAt(auditRes.data.last_requested_at);
        }
      } catch {
        router.push('/audits');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ready, auditId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!auditId || !audit) return;
    try {
      const res = await auditsAPI.update(auditId, { status: newStatus });
      setAudit(res.data);
      updateAudit(auditId, { status: newStatus });
    } catch {
      alert('Failed to update status');
    }
  };

  const handleQuickVerify = async (itemId: number) => {
    try {
      const res = await verificationItemsAPI.update(itemId, { status: 'verified' });
      updateItem(itemId, res.data);
    } catch {
      alert('Failed to verify item');
    }
  };

  const openReject = (itemId: number) =>
    setRejectState({ open: true, itemId, reason: '' });

  const submitReject = async () => {
    if (!rejectState.itemId || !rejectState.reason.trim()) return;
    try {
      const res = await verificationItemsAPI.update(rejectState.itemId, {
        status: 'rejected',
        rejection_reason: rejectState.reason,
      });
      updateItem(rejectState.itemId, res.data);
      setRejectState({ open: false, itemId: null, reason: '' });
    } catch {
      alert('Failed to reject item');
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm('Delete this verification item?')) return;
    try {
      await verificationItemsAPI.delete(itemId);
      removeItem(itemId);
    } catch {
      alert('Failed to delete item');
    }
  };

  const handleSelect = useCallback((itemId: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkApproving(true);
    try {
      const res = await verificationItemsAPI.bulkVerify(Array.from(selected));
      res.data.forEach((item: VerificationItem) => updateItem(item.id, item));
      setSelected(new Set());
    } catch {
      alert('Bulk approve failed');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleItemsCreated = (newItems: VerificationItem[]) => {
    addItems(newItems);
    setShowBriefUploader(false);
  };

  const handleFinalized = () => {
    setAudit((a: any) => ({ ...a, status: 'completed' }));
    updateAudit(auditId!, { status: 'completed' });
  };

  const handleGenerateRequestList = async () => {
    if (!auditId) return;
    setRequestLoading(true);
    try {
      const res = await auditsAPI.getRequestList(auditId);
      setRequestList(res.data.requirements || []);
      if (res.data.last_requested_at) setLastRequestedAt(res.data.last_requested_at);
    } catch {
      alert('Failed to generate request list');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleMarkRequested = async () => {
    if (!auditId) return;
    setMarkingRequested(true);
    try {
      const res = await auditsAPI.markRequested(auditId);
      setLastRequestedAt(res.data.last_requested_at);
    } catch {
      alert('Failed to mark as requested');
    } finally {
      setMarkingRequested(false);
    }
  };

  const buildForwardMessage = () => {
    const header = `Dear Client,\n\nPlease provide the following documents for our upcoming ${audit?.audit_type || 'Audit'}:\n\n`;
    const body = requestList.map((r, i) => `${i + 1}. ${r.document}`).join('\n');
    return header + body + '\n\nKindly share them at the earliest.\n\nThank you.';
  };

  const handleWhatsApp = async () => {
    await handleMarkRequested();
    const msg = encodeURIComponent(buildForwardMessage());
    window.open(`whatsapp://send?text=${msg}`, '_blank');
  };

  const handleEmail = async () => {
    await handleMarkRequested();
    const subject = encodeURIComponent(`Document Request – ${audit?.audit_type || 'Audit'}`);
    const body = encodeURIComponent(buildForwardMessage());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleTallyImport = async () => {
    if (!auditId || !tallyFile) return;
    setTallyImporting(true);
    try {
      const res = await auditsAPI.tallyImport(auditId, tallyFile);
      setTallyResult({ created: res.data.created, skipped: res.data.skipped });
      if (res.data.items?.length > 0) {
        addItems(res.data.items.map((i: any) => ({
          ...i, audit_id: auditId, item_type: 'financial_record',
          status: 'pending', is_ai_parsed: false, is_tally_import: true,
          is_high_risk: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })));
      }
      setTallyFile(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Import failed');
    } finally {
      setTallyImporting(false);
    }
  };

  const handleAiSample = async () => {
    if (!auditId) return;
    setSampling(true);
    try {
      const res = await auditsAPI.aiSample(auditId, minValue, sampleSize);
      setSampleResult({ total_transactions: res.data.total_transactions, flagged_count: res.data.flagged_count });
      const refreshed = await verificationItemsAPI.list(auditId, { limit: 500 });
      setItems(refreshed.data);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'AI sampling failed');
    } finally {
      setSampling(false);
    }
  };

  // ── Tally Hot-Sync ─────────────────────────────────────────────────
  const handleHotSync = async () => {
    if (!auditId || !hotSyncFrom || !hotSyncTo) return;
    setHotSyncing(true);
    setHotSyncResult(null);
    try {
      const res = await auditsAPI.tallyHotSync(auditId, {
        host: hotSyncHost,
        port: hotSyncPort,
        from_date: hotSyncFrom.replace(/-/g, ''),
        to_date: hotSyncTo.replace(/-/g, ''),
        company: hotSyncCompany || undefined,
      });
      setHotSyncResult({ created: res.data.created, skipped: res.data.skipped });
      if (res.data.items?.length > 0) {
        addItems(res.data.items.map((i: any) => ({
          ...i, audit_id: auditId, item_type: 'financial_record',
          status: 'pending', is_ai_parsed: false, is_tally_import: true,
          is_high_risk: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })));
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Hot-sync failed. Make sure Tally is running with HTTP server enabled.');
    } finally {
      setHotSyncing(false);
    }
  };

  // ── Bulk Excel Upload ──────────────────────────────────────────────
  const handleBulkUpload = async () => {
    if (!auditId || !bulkFile) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const res = await verificationItemsAPI.bulkUpload(auditId, bulkFile);
      setBulkResult({ created: res.data.created, failed: res.data.failed });
      if (res.data.items?.length > 0) {
        addItems(res.data.items.map((i: any) => ({
          ...i, audit_id: auditId, is_ai_parsed: false, is_tally_import: false,
          is_high_risk: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })));
      }
      setBulkFile(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!auditId) return;
    try {
      const res = await verificationItemsAPI.downloadTemplate(auditId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_items_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not download template');
    }
  };

  // ── Audit Trail ────────────────────────────────────────────────────
  const handleLoadTrail = async () => {
    if (!auditId) return;
    setTrailLoading(true);
    try {
      const res = await auditsAPI.getTrail(auditId, 0, 200);
      setTrail(res.data);
    } catch {
      alert('Failed to load audit trail');
    } finally {
      setTrailLoading(false);
    }
  };

  // ── Workpaper Export ───────────────────────────────────────────────
  const handleExport = async (format: 'zip' | 'pdf') => {
    if (!auditId) return;
    setExporting(format);
    try {
      const res = await auditsAPI.exportWorkpaper(auditId, format);
      const mime = format === 'pdf' ? 'application/pdf' : 'application/zip';
      const ext = format;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `workpaper_audit_${auditId}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${allItems.length})` },
    { key: 'pending', label: `Pending (${allItems.filter((i) => i.status === 'pending').length})` },
    { key: 'evidence_submitted', label: `Evidence (${allItems.filter((i) => i.status === 'evidence_submitted').length})` },
    { key: 'verified', label: `Verified (${verifiedCount})` },
    { key: 'rejected', label: `Rejected (${rejectedCount})` },
  ];

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!audit) return null;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.push('/audits')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Audits
        </button>

        {/* ── Audit Header ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-gray-900">{audit.audit_type}</h1>
                <StatusBadge value={audit.status} size="md" />
                <StatusBadge value={audit.risk_level} />
              </div>
              {clientName && <p className="text-sm text-gray-500">{clientName}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <div className="relative">
                <select
                  value={audit.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="appearance-none px-3 py-1.5 pr-7 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AUDIT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {/* Export buttons */}
              <button
                onClick={() => handleExport('zip')}
                disabled={!!exporting}
                title="Download all evidence + workpapers as ZIP"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting === 'zip' ? 'Zipping…' : 'ZIP'}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={!!exporting}
                title="Download summary PDF workpaper"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting === 'pdf' ? 'Generating…' : 'PDF'}
              </button>

              <button
                onClick={() => setShowFinalize(true)}
                disabled={!canFinalize || audit.status === 'completed'}
                title={!canFinalize ? 'All items must be reviewed first' : undefined}
                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              >
                Finalize Audit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Deadline</p>
              <p className="font-medium text-gray-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {new Date(audit.deadline).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Progress</p>
              <p className="font-medium text-gray-800">{reviewedCount}/{allItems.length} reviewed</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Verified</p>
              <p className="font-medium text-green-700">{verifiedCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Rejected</p>
              <p className="font-medium text-red-600">{rejectedCount}</p>
            </div>
          </div>

          <ProgressBar verified={reviewedCount} total={allItems.length} />
        </div>

        {/* ── Brief Upload ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Audit Brief</h2>
            <button onClick={() => setShowBriefUploader((v) => !v)} className="text-xs text-blue-600 hover:text-blue-800">
              {showBriefUploader ? 'Hide' : 'Upload brief'}
            </button>
          </div>
          {showBriefUploader && (
            <BriefUploader auditId={auditId!} onItemsCreated={handleItemsCreated} />
          )}
          {!showBriefUploader && (
            <p className="text-xs text-gray-400">Upload an Excel or PDF brief to auto-create verification items.</p>
          )}
        </div>

        {/* ── Bulk Excel Upload ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Bulk Upload Items (Excel)</h2>
            <button onClick={() => setShowBulkPanel((v) => !v)} className="text-xs text-blue-600 hover:text-blue-800">
              {showBulkPanel ? 'Hide' : 'Open'}
            </button>
          </div>

          {!showBulkPanel && (
            <p className="text-xs text-gray-400">
              Upload up to 1,000 verification items at once using an Excel file. Columns: title, item_type, reference_value, description.
            </p>
          )}

          {showBulkPanel && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-xs text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Table2 className="w-3.5 h-3.5" /> Download Template
                </button>
                <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {bulkFile ? bulkFile.name : 'Choose .xlsx file'}
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  />
                </label>
                <button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || bulkUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {bulkUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
              {bulkResult && (
                <p className={`text-xs font-medium ${bulkResult.failed > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                  ✓ {bulkResult.created} items created
                  {bulkResult.failed > 0 && `, ${bulkResult.failed} rows skipped (missing title)`}.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Document Request Generator ───────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Document Request Generator</h2>
              {lastRequestedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last sent: {new Date(lastRequestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setShowRequestPanel((v) => !v);
                if (!showRequestPanel && requestList.length === 0) handleGenerateRequestList();
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showRequestPanel ? 'Hide' : 'Generate list'}
            </button>
          </div>

          {!showRequestPanel && (
            <p className="text-xs text-gray-400">
              AI generates a missing-document checklist you can forward via WhatsApp or Email.
            </p>
          )}

          {showRequestPanel && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleGenerateRequestList}
                  disabled={requestLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {requestLoading ? 'Analysing…' : 'Regenerate'}
                </button>
                {requestList.length > 0 && (
                  <>
                    <button
                      onClick={handleWhatsApp}
                      disabled={markingRequested}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    <button
                      onClick={handleEmail}
                      disabled={markingRequested}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </button>
                  </>
                )}
              </div>

              {requestLoading && (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  Gemini is analysing audit requirements…
                </div>
              )}

              {!requestLoading && requestList.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {requestList.map((r, i) => (
                    <li key={i} className="py-2.5 flex items-start gap-3">
                      <span className={`mt-0.5 shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                        r.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                        r.priority === 'LOW' ? 'bg-gray-100 text-gray-500' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.priority}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{r.document}</p>
                        <p className="text-xs text-gray-400">{r.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {!requestLoading && requestList.length === 0 && (
                <p className="text-xs text-gray-400 py-2">Click &quot;Regenerate&quot; to analyse this audit.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Tally Bridge: CSV Import & AI Sampling ────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Tally / Zoho CSV Import &amp; AI Sampling</h2>
            <button onClick={() => setShowTallyPanel((v) => !v)} className="text-xs text-blue-600 hover:text-blue-800">
              {showTallyPanel ? 'Hide' : 'Open'}
            </button>
          </div>

          {!showTallyPanel && (
            <p className="text-xs text-gray-400">
              Import a Tally CSV to auto-create verification tasks, then let Gemini flag the riskiest transactions.
            </p>
          )}

          {showTallyPanel && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Step 1 — Import Tally CSV</p>
                <p className="text-xs text-gray-400 mb-3">
                  Required columns: <code className="bg-gray-100 px-1 rounded">transaction_id</code>, <code className="bg-gray-100 px-1 rounded">ledger_name</code>, <code className="bg-gray-100 px-1 rounded">amount</code>.
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {tallyFile ? tallyFile.name : 'Choose CSV file'}
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => setTallyFile(e.target.files?.[0] || null)} />
                  </label>
                  <button
                    onClick={handleTallyImport}
                    disabled={!tallyFile || tallyImporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {tallyImporting ? 'Importing…' : 'Import'}
                  </button>
                </div>
                {tallyResult && (
                  <p className="mt-2 text-xs text-green-700 font-medium">
                    ✓ {tallyResult.created} transactions imported, {tallyResult.skipped} skipped.
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-medium text-gray-700 mb-2">Step 2 — Run AI Risk Sampling</p>
                <div className="flex flex-wrap items-end gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">High-value threshold (₹)</label>
                    <input
                      type="number"
                      value={minValue}
                      onChange={(e) => setMinValue(Number(e.target.value))}
                      step={5000} min={0}
                      className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max samples to flag</label>
                    <input
                      type="number"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Number(e.target.value))}
                      min={5} max={100}
                      className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAiSample}
                  disabled={sampling}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {sampling ? 'Gemini is sampling…' : 'Run AI Sample'}
                </button>
                {sampleResult && (
                  <p className="mt-2 text-xs text-orange-700 font-medium">
                    ✓ {sampleResult.flagged_count} high-risk items flagged out of {sampleResult.total_transactions} transactions.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Tally Hot-Sync ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-600" /> Tally Live Pull (Hot-Sync)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">No CSV needed — connects directly to running Tally</p>
            </div>
            <button onClick={() => setShowHotSyncPanel((v) => !v)} className="text-xs text-blue-600 hover:text-blue-800">
              {showHotSyncPanel ? 'Hide' : 'Connect'}
            </button>
          </div>

          {!showHotSyncPanel && (
            <p className="text-xs text-gray-400">
              Pull vouchers directly from a running Tally Prime / ERP 9 instance on your network. Enable Tally HTTP server under Gateway → F12 → Advanced Config.
            </p>
          )}

          {showHotSyncPanel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tally Host</label>
                  <input
                    type="text"
                    value={hotSyncHost}
                    onChange={(e) => setHotSyncHost(e.target.value)}
                    placeholder="localhost"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Port</label>
                  <input
                    type="number"
                    value={hotSyncPort}
                    onChange={(e) => setHotSyncPort(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={hotSyncFrom}
                    onChange={(e) => setHotSyncFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={hotSyncTo}
                    onChange={(e) => setHotSyncTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Company Name (optional)</label>
                <input
                  type="text"
                  value={hotSyncCompany}
                  onChange={(e) => setHotSyncCompany(e.target.value)}
                  placeholder="Leave blank to use Tally's currently open company"
                  className="w-full max-w-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={handleHotSync}
                disabled={hotSyncing || !hotSyncFrom || !hotSyncTo}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
              >
                <Wifi className="w-3.5 h-3.5" />
                {hotSyncing ? 'Pulling from Tally…' : 'Pull Vouchers Now'}
              </button>
              {hotSyncResult && (
                <p className="text-xs text-green-700 font-medium">
                  ✓ {hotSyncResult.created} vouchers pulled, {hotSyncResult.skipped} already existed.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Audit Trail ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-purple-600" /> Audit Trail
            </h2>
            <button
              onClick={() => {
                setShowTrailPanel((v) => !v);
                if (!showTrailPanel && trail.length === 0) handleLoadTrail();
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showTrailPanel ? 'Hide' : 'View log'}
            </button>
          </div>

          {!showTrailPanel && (
            <p className="text-xs text-gray-400">
              Immutable log of every status change, deletion, import, and export. Legal-grade working paper evidence.
            </p>
          )}

          {showTrailPanel && (
            <div>
              <button
                onClick={handleLoadTrail}
                disabled={trailLoading}
                className="mb-3 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {trailLoading ? 'Loading…' : '↻ Refresh'}
              </button>
              {trail.length === 0 && !trailLoading && (
                <p className="text-xs text-gray-400 py-2">No log entries yet.</p>
              )}
              {trail.length > 0 && (
                <ol className="relative border-l border-gray-200 ml-3 space-y-4">
                  {trail.map((entry) => (
                    <li key={entry.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border border-white bg-purple-400" />
                      <p className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        {' · '}<span className="font-medium text-gray-700">{entry.user_name}</span>
                      </p>
                      <p className="text-sm text-gray-800 mt-0.5">{entry.description}</p>
                      <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium ${
                        entry.action === 'deleted' ? 'bg-red-100 text-red-700' :
                        entry.action === 'finalized' ? 'bg-green-100 text-green-700' :
                        entry.action === 'status_changed' ? 'bg-yellow-100 text-yellow-700' :
                        entry.action === 'imported' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {entry.action}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {/* ── Verification Checklist ────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Verification Checklist</h2>
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <div className="flex gap-1 border-b border-gray-100 mb-4 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelected(new Set()); }}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              {tab === 'all'
                ? 'No verification items yet. Upload a brief or add items manually.'
                : `No items with status "${tab.replace(/_/g, ' ')}".`}
            </div>
          )}

          <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '60vh' }}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vRow) => {
                const item = filtered[vRow.index];
                return (
                  <div
                    key={item.id}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vRow.start}px)`, paddingBottom: '8px' }}
                  >
                    <VerificationItemCard
                      item={item}
                      auditId={auditId!}
                      showCheckbox={showCheckboxes}
                      selected={selected.has(item.id)}
                      onSelect={handleSelect}
                      onVerify={handleQuickVerify}
                      onReject={openReject}
                      onDelete={handleDelete}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk approve sticky footer */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            <strong>{selected.size}</strong> item{selected.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
              Clear
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              <CheckSquare className="w-4 h-4" />
              {bulkApproving ? 'Approving…' : `Approve ${selected.size} Selected`}
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Reject Item</h2>
              <button onClick={() => setRejectState({ open: false, itemId: null, reason: '' })} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Rejection reason *</label>
              <textarea
                value={rejectState.reason}
                onChange={(e) => setRejectState((s) => ({ ...s, reason: e.target.value }))}
                rows={3}
                placeholder="Describe why this item is being rejected…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectState({ open: false, itemId: null, reason: '' })}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectState.reason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddItem && (
        <AddItemModal
          auditId={auditId!}
          onClose={() => setShowAddItem(false)}
          onCreated={(item) => { addItem(item); setShowAddItem(false); }}
        />
      )}

      {showFinalize && (
        <FinalApprovalModal
          auditId={auditId!}
          onClose={() => setShowFinalize(false)}
          onApproved={handleFinalized}
        />
      )}
    </Layout>
  );
}
