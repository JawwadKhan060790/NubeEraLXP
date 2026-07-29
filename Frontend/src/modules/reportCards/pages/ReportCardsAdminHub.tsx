import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Download, Trash2, Eye, CheckCircle,
  XCircle, Archive, RefreshCw, AlertTriangle, ChevronDown,
} from 'lucide-react';
import {
  getAllReportCards, publishReportCard, unpublishReportCard, archiveReportCard,
  deleteReportCard, downloadReportCardPdf,
  type ReportCardListItem,
} from '@/services/reportCardService';
import {
  DashboardPageShell,
  WelcomeBanner,
  DashboardTabBar,
  DashboardWidgetCard,
} from '@/components/dashboard/DashboardKit';

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    Draft:     'bg-gray-100 text-gray-700',
    Published: 'bg-green-100 text-green-800',
    Archived:  'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

// ── Grade badge ───────────────────────────────────────────────────────────────
const GradeBadge: React.FC<{ grade?: string; passed: boolean }> = ({ grade, passed }) => {
  const color = !passed ? 'text-red-600' : grade?.startsWith('A') ? 'text-green-700' : 'text-blue-700';
  return <span className={`font-bold text-sm ${color}`}>{grade ?? '—'}</span>;
};

const TABS = ['All', 'Draft', 'Published', 'Archived'] as const;
type Tab = typeof TABS[number];

// ── Publish modal ──────────────────────────────────────────────────────────────
interface PublishModalProps {
  item: ReportCardListItem;
  onClose: () => void;
  onConfirm: (visibleToStudent: boolean, visibleToParent: boolean) => void;
  loading: boolean;
}
const PublishModal: React.FC<PublishModalProps> = ({ item, onClose, onConfirm, loading }) => {
  const [toStudent, setToStudent] = useState(true);
  const [toParent, setToParent] = useState(true);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Publish Report Card</h3>
        <p className="text-sm text-gray-500 mb-4">{item.student_name} — {item.exam_type} {item.academic_year}</p>
        <div className="space-y-3 mb-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={toStudent} onChange={e => setToStudent(e.target.checked)}
              className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">Visible to Student</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={toParent} onChange={e => setToParent(e.target.checked)}
              className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">Visible to Parent</span>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onConfirm(toStudent, toParent)}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const ReportCardsAdminHub: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('All');
  const [items, setItems] = useState<ReportCardListItem[]>([]);
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [examType, setExamType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<ReportCardListItem | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getAllReportCards({
        status: tab === 'All' ? undefined : tab,
        search: search || undefined,
        academicYear: academicYear || undefined,
        examType: examType || undefined,
      });
      setItems(data);
    } catch {
      setError('Failed to load report cards.');
    } finally {
      setLoading(false);
    }
  }, [tab, search, academicYear, examType]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async (visibleToStudent: boolean, visibleToParent: boolean) => {
    if (!publishTarget) return;
    setPublishLoading(true);
    try {
      await publishReportCard(publishTarget.id, {
        is_visible_to_student: visibleToStudent,
        is_visible_to_parent: visibleToParent,
      });
      setPublishTarget(null);
      load();
    } catch { setError('Publish failed.'); }
    finally { setPublishLoading(false); }
  };

  const handleUnpublish = async (id: string) => {
    setActionId(id);
    try { await unpublishReportCard(id); load(); }
    catch { setError('Unpublish failed.'); }
    finally { setActionId(null); }
  };

  const handleArchive = async (id: string) => {
    setActionId(id);
    try { await archiveReportCard(id); load(); }
    catch { setError('Archive failed.'); }
    finally { setActionId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this report card? This cannot be undone.')) return;
    setActionId(id);
    try { await deleteReportCard(id); load(); }
    catch { setError('Delete failed.'); }
    finally { setActionId(null); }
  };

  const handleDownload = async (item: ReportCardListItem) => {
    setDownloadingId(item.id);
    try { await downloadReportCardPdf(item.id, item.report_card_number, item.student_name); }
    catch { setError('PDF download failed.'); }
    finally { setDownloadingId(null); }
  };

  const filtered = items.filter(i =>
    !search || i.student_name.toLowerCase().includes(search.toLowerCase()) ||
    i.report_card_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardPageShell>
      {/* Header */}
      <WelcomeBanner
        badge="Report Cards"
        badgeColor="indigo"
        title="Report Cards"
        subtitle="Generate, publish, and manage student report cards"
        actions={
          <button
            onClick={() => navigate('/report-cards/generate')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Generate Report Card
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name or report no…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <input
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          placeholder="Academic year (e.g. 2025-2026)"
          className="w-full sm:w-44 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <select
          value={examType}
          onChange={e => setExamType(e.target.value)}
          className="w-full sm:w-40 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
        >
          <option value="">All Exam Types</option>
          <option>Unit Test</option>
          <option>Mid-Term</option>
          <option>Final Exam</option>
          <option>Annual Exam</option>
        </select>
        <button
          onClick={load}
          className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <DashboardTabBar
        tabs={TABS.map(t => ({ key: t, label: t }))}
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        variant="pills"
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <FileText className="w-10 h-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">No report cards found</p>
        </div>
      ) : (
        <DashboardWidgetCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3">Report No.</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Exam Type</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Visibility</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.report_card_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{item.student_name}</p>
                      <p className="text-xs text-slate-400">{item.student_id_number}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{item.grade_name}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{item.exam_type}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{item.academic_year}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{item.percentage.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-center">
                      <GradeBadge grade={item.overall_grade} passed={item.is_passed} />
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {item.is_visible_to_student && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full">Student</span>
                        )}
                        {item.is_visible_to_parent && (
                          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-black uppercase rounded-full">Parent</span>
                        )}
                        {!item.is_visible_to_student && !item.is_visible_to_parent && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* View */}
                        <button
                          onClick={() => navigate(`/report-cards/${item.id}`)}
                          title="View"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownload(item)}
                          disabled={downloadingId === item.id}
                          title="Download PDF"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 disabled:opacity-50"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {/* Workflow */}
                        {item.status === 'Draft' && (
                          <button
                            onClick={() => setPublishTarget(item)}
                            disabled={actionId === item.id}
                            title="Publish"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'Published' && (
                          <>
                            <button
                              onClick={() => handleUnpublish(item.id)}
                              disabled={actionId === item.id}
                              title="Unpublish"
                              className="p-1.5 rounded-lg hover:bg-yellow-50 text-slate-400 hover:text-yellow-600 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchive(item.id)}
                              disabled={actionId === item.id}
                              title="Archive"
                              className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-600 disabled:opacity-50"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {/* Delete (draft only) */}
                        {item.status === 'Draft' && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={actionId === item.id}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardWidgetCard>
      )}
    </DashboardPageShell>
  );
};

export default ReportCardsAdminHub;
