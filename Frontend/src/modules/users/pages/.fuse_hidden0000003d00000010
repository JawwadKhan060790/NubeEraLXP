import {
  CheckCircle2,
  Clock,
  Database,
  DatabaseBackup,
  DownloadCloud,
  FileWarning,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import api from '@/services/api';
import {
  DashboardPageShell, WelcomeBanner, DashboardTabBar,
} from '@/components/dashboard/DashboardKit';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackupHistoryRow {
  id: string;
  file_name: string;
  database_name: string;
  file_size_bytes: number;
  file_size_display: string;
  created_at: string;
  created_by_user_name: string;
  status: 'Success' | 'Failed' | 'InProgress' | string;
  error_message?: string | null;
  duration_ms: number;
  is_file_deleted: boolean;
  can_download: boolean;
}

interface PagedHistory {
  items: BackupHistoryRow[];
  total_count: number;
  page: number;
  page_size: number;
}

interface ModuleStatus {
  is_backup_in_progress: boolean;
  is_restore_in_progress: boolean;
  database_name: string;
}

type TabKey = 'backup' | 'restore' | 'history';

const MAX_RESTORE_FILE_BYTES = 500 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'Success':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
          <CheckCircle2 className="w-3 h-3" /> Success
        </span>
      );
    case 'Failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    case 'InProgress':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
          {status}
        </span>
      );
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const DatabaseBackupRestore: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('backup');
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus | null>(null);

  // Backup tab state
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Restore tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // History tab state
  const [history, setHistory] = useState<PagedHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Failed' | 'InProgress'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<BackupHistoryRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get<ModuleStatus>('/backups/status');
      setModuleStatus(response.data);
    } catch {
      // Non-critical — silently retry on the next poll.
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get<PagedHistory>('/backups', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter === 'All' ? undefined : statusFilter,
          page,
          page_size: pageSize,
        },
      });
      setHistory(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load backup history');
    } finally {
      setHistoryLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const isBusy = !!(moduleStatus?.is_backup_in_progress || moduleStatus?.is_restore_in_progress);

  // ── Create backup ───────────────────────────────────────────────────────────

  const handleCreateBackup = async () => {
    if (isBusy) {
      toast.warning('Another backup or restore operation is currently running. Please wait for it to finish.');
      return;
    }

    setCreatingBackup(true);
    try {
      const response = await api.post('/backups');
      const result = response.data;

      if (result?.status === 'Success') {
        toast.success(`Backup "${result.file_name}" created successfully (${result.file_size_display}).`);
      } else {
        toast.error(result?.error_message || 'Backup failed. Check the history tab for details.');
      }

      await Promise.all([fetchStatus(), fetchHistory()]);
      setActiveTab('history');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  // ── Restore ─────────────────────────────────────────────────────────────────

  const validateAndSetFile = (file: File | null) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.sql')) {
      toast.error('Only .sql dump files are allowed for restore.');
      return;
    }

    if (file.size > MAX_RESTORE_FILE_BYTES) {
      toast.error('The selected file exceeds the maximum allowed size of 500 MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    validateAndSetFile(file);
  };

  const handleRestoreClick = () => {
    if (!selectedFile) {
      toast.error('Please choose a .sql backup file to restore.');
      return;
    }
    if (isBusy) {
      toast.warning('Another backup or restore operation is currently running. Please wait for it to finish.');
      return;
    }
    setConfirmRestoreOpen(true);
  };

  const performRestore = async () => {
    if (!selectedFile) return;
    setConfirmRestoreOpen(false);
    setRestoring(true);

    try {
      const formData = new FormData();
      formData.append('File', selectedFile);
      formData.append('ConfirmRestore', 'true');

      const response = await api.post('/backups/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;

      if (result?.success) {
        toast.success(result.message || 'Database restored successfully.');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast.error(result?.message || 'Restore failed. Please check the audit log for details.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore database');
    } finally {
      setRestoring(false);
      await fetchStatus();
    }
  };

  // ── History actions ─────────────────────────────────────────────────────────

  const handleDownload = async (row: BackupHistoryRow) => {
    if (!row.can_download) {
      toast.error('This backup file is no longer available for download.');
      return;
    }

    setDownloadingId(row.id);
    try {
      const response = await api.get(`/backups/${row.id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', row.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloading "${row.file_name}"…`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download backup file');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(row.id);

    try {
      await api.delete(`/backups/${row.id}`);
      toast.success(`Backup "${row.file_name}" deleted successfully.`);
      await fetchHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete backup');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = history ? Math.max(1, Math.ceil(history.total_count / history.page_size)) : 1;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardPageShell className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page Header */}
      <WelcomeBanner
        badge="System Utilities"
        badgeColor="slate"
        title="Database Backup &amp; Restore"
        subtitle={`Manual dump-file backups for ${moduleStatus?.database_name || 'the system database'}`}
        actions={isBusy ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {moduleStatus?.is_backup_in_progress ? 'Backup in progress…' : 'Restore in progress…'}
            </span>
          </div>
        ) : undefined}
      />

      {/* Tabs */}
      <DashboardTabBar
        tabs={[
          { key: 'backup',  label: 'Backup Database' },
          { key: 'restore', label: 'Restore Database' },
          { key: 'history', label: 'Backup History' },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        variant="pills"
      />

      {/* ── Backup Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden p-6 md:p-10">
          <div className="flex flex-col items-center text-center gap-6 max-w-xl mx-auto py-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center">
              <Database className="w-10 h-10 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Create a Complete Database Backup</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Generates a full dump of <span className="font-bold text-slate-600">{moduleStatus?.database_name || 'the database'}</span> —
                tables, data, stored procedures, functions, views, triggers, indexes and foreign keys —
                and saves it as a downloadable <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">.sql</code> file
                named <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">DatabaseName_YYYYMMDD_HHMMSS.sql</code>.
              </p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup || isBusy}
              className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg transition-all ${
                creatingBackup || isBusy
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]'
              }`}
            >
              {creatingBackup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Backup…
                </>
              ) : (
                <>
                  <DatabaseBackup className="w-4 h-4" /> Create Backup
                </>
              )}
            </button>

            {creatingBackup && (
              <div className="w-full max-w-sm">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse w-full" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                  Running mysqldump — this may take a few minutes for large databases…
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Restore Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          <div className="bg-rose-50/60 backdrop-blur-md rounded-2xl p-6 border border-white shadow-sm flex items-start gap-5 text-rose-950/80">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Warning — Irreversible Action</p>
              <p className="text-xs font-medium leading-relaxed">
                Restoring this backup will overwrite existing data. Only restore from <span className="font-bold">.sql</span> files
                you trust — corrupted or invalid dumps will be rejected before anything is changed.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden p-6 md:p-10">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed rounded-3xl py-14 px-6 cursor-pointer transition-all ${
                dragActive ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <UploadCloud className="w-8 h-8 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">
                  {selectedFile ? selectedFile.name : 'Drag & drop a .sql backup file here, or click to browse'}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — ready to restore`
                    : 'Only .sql files are accepted, up to 500 MB'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <button
                onClick={handleRestoreClick}
                disabled={!selectedFile || restoring || isBusy}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg transition-all ${
                  !selectedFile || restoring || isBusy
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-500 text-white hover:bg-rose-600 hover:shadow-xl active:scale-[0.98]'
                }`}
              >
                {restoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Restoring Database…
                  </>
                ) : (
                  <>
                    <FileWarning className="w-4 h-4" /> Restore Backup
                  </>
                )}
              </button>

              {selectedFile && !restoring && (
                <button
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {restoring && (
              <div className="w-full max-w-sm mx-auto mt-6">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full animate-pulse w-full" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 text-center">
                  Running mysql restore — please don't close this page…
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden p-6 md:p-8">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Backup History</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by file name or created by…"
                  className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="All">All Statuses</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
                <option value="InProgress">In Progress</option>
              </select>

              <button
                onClick={() => fetchHistory()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="px-3 py-3">Backup Name</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">File Size</th>
                  <th className="px-3 py-3">Created By</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Loading history…</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!historyLoading && history && history.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center">
                      <p className="text-sm font-bold text-slate-400">No backups found.</p>
                      <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filter, or create your first backup.</p>
                    </td>
                  </tr>
                )}

                {!historyLoading && history?.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-4">
                      <p className="text-xs font-black text-slate-700 break-all">{row.file_name}</p>
                      {row.error_message && (
                        <p className="text-[10px] text-rose-400 font-medium mt-1 max-w-xs truncate" title={row.error_message}>
                          {row.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">{formatDateTime(row.created_at)}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-xs font-bold text-slate-600">{row.file_size_display}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-xs font-semibold text-slate-500">{row.created_by_user_name}</p>
                    </td>
                    <td className="px-3 py-4">{statusBadge(row.status)}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(row)}
                          disabled={!row.can_download || downloadingId === row.id}
                          title={row.can_download ? 'Download backup file' : 'File no longer available'}
                          className={`p-2 rounded-lg transition-all ${
                            row.can_download
                              ? 'text-indigo-500 hover:bg-indigo-50'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {downloadingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(row)}
                          disabled={row.is_file_deleted || deletingId === row.id}
                          title={row.is_file_deleted ? 'Already deleted' : 'Delete backup file'}
                          className={`p-2 rounded-lg transition-all ${
                            row.is_file_deleted ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50'
                          }`}
                        >
                          {deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {history && history.total_count > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={history.total_count}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              />
            </div>
          )}
        </div>
      )}

      {/* Confirm Restore Dialog — mandatory overwrite warning */}
      <ConfirmModal
        open={confirmRestoreOpen}
        title="Restore Database?"
        message="Restoring this backup will overwrite existing data. Do you want to continue? This action cannot be undone."
        confirmLabel="Yes, Restore"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={performRestore}
        onCancel={() => setConfirmRestoreOpen(false)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Backup File?"
        message={deleteTarget ? `This will permanently remove "${deleteTarget.file_name}" from disk. The history record will be kept for audit purposes.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardPageShell>
  );
};

export default DatabaseBackupRestore;
