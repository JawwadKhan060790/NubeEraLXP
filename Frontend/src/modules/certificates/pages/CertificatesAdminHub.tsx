import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Plus, Upload, CheckCircle, XCircle, RotateCcw,
  Search, Download, Trash2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import {
  getAllCertificates, approveCertificate, revokeCertificate,
  reissueCertificate, deleteCertificate, downloadCertificatePdf,
  getTemplates, type CertificateListItem, type CertificateTemplate,
} from '@/services/certificateService';
import {
  DashboardPageShell, WelcomeBanner, DashboardTabBar, DashboardWidgetCard, EmptyState,
} from '@/components/dashboard/DashboardKit';

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    Draft:            'bg-slate-100 text-slate-600 dark:bg-[#283548] dark:text-[#cbd5e1]',
    PendingApproval:  'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    Approved:         'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    Issued:           'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    Revoked:          'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    Rejected:         'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-[#283548] dark:text-[#cbd5e1]'}`}>
      {status}
    </span>
  );
};

// ── Main Hub ──────────────────────────────────────────────────────────────────
const TABS = ['All Certificates', 'Pending Approval', 'Issued', 'Revoked', 'Templates'] as const;
type Tab = typeof TABS[number];

const CertificatesAdminHub: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('All Certificates');
  const [certs, setCerts] = useState<CertificateListItem[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [revokeModal, setRevokeModal] = useState<{ id: string; certNumber: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const statusFilter: Record<Tab, string | undefined> = {
    'All Certificates': undefined,
    'Pending Approval': 'PendingApproval',
    'Issued':           'Issued',
    'Revoked':          'Revoked',
    'Templates':        undefined,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'Templates') {
        const t = await getTemplates();
        setTemplates(t);
      } else {
        const data = await getAllCertificates({ status: statusFilter[activeTab], search: search || undefined });
        setCerts(data);
      }
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try { await approveCertificate(id, { approve: true, make_available_to_student: true }); load(); }
    catch { setError('Approve failed.'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try { await approveCertificate(id, { approve: false, rejection_reason: 'Rejected by admin' }); load(); }
    catch { setError('Reject failed.'); }
    finally { setActionLoading(null); }
  };

  const handleRevoke = async () => {
    if (!revokeModal || !revokeReason.trim()) return;
    setActionLoading(revokeModal.id);
    try {
      await revokeCertificate(revokeModal.id, { reason: revokeReason });
      setRevokeModal(null);
      setRevokeReason('');
      load();
    } catch { setError('Revoke failed.'); }
    finally { setActionLoading(null); }
  };

  const handleReissue = async (id: string) => {
    setActionLoading(id);
    try { await reissueCertificate(id); load(); }
    catch { setError('Reissue failed.'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this certificate?')) return;
    setActionLoading(id);
    try { await deleteCertificate(id); load(); }
    catch { setError('Delete failed.'); }
    finally { setActionLoading(null); }
  };

  const handleDownload = async (id: string, certNumber: string) => {
    setActionLoading(id + '-dl');
    try { await downloadCertificatePdf(id, certNumber); }
    catch { setError('Download failed.'); }
    finally { setActionLoading(null); }
  };

  return (
    <DashboardPageShell>

      {/* Header */}
      <WelcomeBanner
        badge="Certificates"
        badgeColor="blue"
        title="Certificate Management"
        subtitle="Generate, approve, and manage student certificates"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/certificates/generate')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Generate
            </button>
            <button
              onClick={() => navigate('/certificates/bulk')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
            >
              <Upload className="w-4 h-4" /> Bulk Generate
            </button>
          </div>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-400/25 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-400 dark:text-rose-400/80 hover:text-rose-600 dark:hover:text-rose-300">✕</button>
        </div>
      )}

      {/* Tabs */}
      <DashboardTabBar
        tabs={TABS.map(t => ({ key: t, label: t }))}
        active={activeTab}
        onChange={(k) => setActiveTab(k as Tab)}
        variant="pills"
      />

      {/* Search bar (not for Templates tab) */}
      {activeTab !== 'Templates' && (
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#64748b]" />
            <input
              type="text"
              placeholder="Search by student name or certificate number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-medium text-slate-600 dark:text-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            onClick={load}
            className="p-2.5 border border-slate-200 dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#283548] transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-[#94a3b8] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : activeTab === 'Templates' ? (
        // ── Templates grid ────────────────────────────────────────────────────
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <DashboardWidgetCard key={t.id}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-black text-slate-900 dark:text-white text-sm">{t.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${t.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-[#283548] dark:text-[#94a3b8]'}`}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#94a3b8] mb-1">{t.program_type} · Grades {t.grade_band}</p>
              {t.tagline && <p className="text-xs text-slate-400 dark:text-[#64748b] italic">{t.tagline}</p>}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#283548]">
                <span className="text-xs text-slate-400 dark:text-[#64748b]">
                  {t.default_principal_name ? `Principal: ${t.default_principal_name}` : 'No default principal'}
                </span>
              </div>
            </DashboardWidgetCard>
          ))}
          {templates.length === 0 && (
            <div className="col-span-3">
              <EmptyState icon={<Award className="w-7 h-7" />} title="No templates found." />
            </div>
          )}
        </div>
      ) : (
        // ── Certificates table ────────────────────────────────────────────────
        <DashboardWidgetCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b] border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60">
                  {['Certificate #', 'Student', 'Grade', 'Program', 'Year', 'Completion', 'Status', 'Downloads', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-[#283548]">
                {certs.map(cert => (
                  <tr key={cert.id} className="hover:bg-slate-50/60 dark:hover:bg-[#283548]/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-primary font-bold">{cert.certificate_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">{cert.student_name}</p>
                      <p className="text-xs text-slate-400 dark:text-[#64748b]">{cert.school_name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-[#cbd5e1] whitespace-nowrap">{cert.grade_name}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-[#cbd5e1] whitespace-nowrap">{cert.program_type}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-[#cbd5e1]">{cert.academic_year}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-[#cbd5e1] whitespace-nowrap">
                      {new Date(cert.completion_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={cert.status} /></td>
                    <td className="px-4 py-3 text-xs text-center text-slate-500 dark:text-[#94a3b8]">{cert.download_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {cert.status === 'PendingApproval' && (
                          <>
                            <button onClick={() => handleApprove(cert.id)} disabled={actionLoading === cert.id} title="Approve"
                              className="p-1.5 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 rounded-lg disabled:opacity-50 transition-all">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReject(cert.id)} disabled={actionLoading === cert.id} title="Reject"
                              className="p-1.5 text-orange-500 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/15 rounded-lg disabled:opacity-50 transition-all">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(cert.status === 'Approved' || cert.status === 'Issued') && (
                          <button onClick={() => setRevokeModal({ id: cert.id, certNumber: cert.certificate_number })} title="Revoke"
                            className="p-1.5 text-rose-500 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-lg transition-all">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {cert.status === 'Revoked' && (
                          <button onClick={() => handleReissue(cert.id)} disabled={actionLoading === cert.id} title="Reissue"
                            className="p-1.5 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/15 rounded-lg disabled:opacity-50 transition-all">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {(cert.status === 'Approved' || cert.status === 'Issued') && (
                          <button onClick={() => handleDownload(cert.id, cert.certificate_number)} disabled={actionLoading === cert.id + '-dl'} title="Download PDF"
                            className="p-1.5 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 rounded-lg disabled:opacity-50 transition-all">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(cert.id)} disabled={actionLoading === cert.id} title="Delete"
                          className="p-1.5 text-slate-400 dark:text-[#64748b] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 dark:hover:text-rose-300 rounded-lg disabled:opacity-50 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {certs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16">
                      <EmptyState icon={<Award className="w-7 h-7" />} title="No certificates found." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DashboardWidgetCard>
      )}

      {/* Revoke Modal */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Revoke Certificate</h2>
            <p className="text-sm text-slate-600 dark:text-[#cbd5e1]">
              You are about to revoke <span className="font-mono font-bold text-slate-800 dark:text-[#e2e8f0]">{revokeModal.certNumber}</span>.
              This action will mark it as invalid and notify the student.
            </p>
            <textarea
              className="w-full border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2.5 text-sm dark:bg-[#283548] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-rose-300"
              rows={3}
              placeholder="Reason for revocation…"
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRevokeModal(null); setRevokeReason(''); }}
                className="px-4 py-2 text-sm border border-slate-200 dark:border-[#334155] dark:text-[#cbd5e1] rounded-xl hover:bg-slate-50 dark:hover:bg-[#283548] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={!revokeReason.trim() || !!actionLoading}
                className="px-4 py-2 text-sm bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-all font-bold"
              >
                {actionLoading ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardPageShell>
  );
};

export default CertificatesAdminHub;
