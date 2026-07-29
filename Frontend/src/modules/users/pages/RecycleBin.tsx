import { useEffect, useState, useCallback } from 'react';
import {
  Trash2, RotateCcw, AlertTriangle, Search, RefreshCw,
  Building2, GraduationCap, Users, BookOpen, FileText,
  ClipboardList, CalendarDays, BarChart2, Star, ShoppingBag,
  ShoppingCart, Award, User, Ticket,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { useIsRole } from '@/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecycleBinItem {
  id: string;
  entityType: string;
  displayName: string;
  description?: string;
  deletedDate: string;
  deletedBy?: string;
  createdAt: string;
}

interface RecycleBinPage {
  items: RecycleBinItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface RecycleBinSummary {
  counts: Record<string, number>;
  total: number;
}

// ── Entity tab config ─────────────────────────────────────────────────────────

const ENTITY_TABS: Array<{ key: string; label: string; icon: React.ReactNode; color: string }> = [
  { key: 'School',      label: 'Schools',      icon: <Building2  className="w-4 h-4" />, color: 'indigo'  },
  { key: 'Grade',       label: 'Grades',       icon: <GraduationCap className="w-4 h-4" />, color: 'violet'  },
  { key: 'Teacher',     label: 'Teachers',     icon: <Users      className="w-4 h-4" />, color: 'sky'     },
  { key: 'Student',     label: 'Students',     icon: <Users      className="w-4 h-4" />, color: 'teal'    },
  { key: 'Module',      label: 'Modules',      icon: <BookOpen   className="w-4 h-4" />, color: 'emerald' },
  { key: 'Lesson',      label: 'Lessons',      icon: <FileText   className="w-4 h-4" />, color: 'amber'   },
  { key: 'Exam',        label: 'Exams',        icon: <ClipboardList className="w-4 h-4" />, color: 'orange'  },
  { key: 'Scheduler',   label: 'Schedules',    icon: <CalendarDays className="w-4 h-4" />, color: 'rose'    },
  { key: 'Result',      label: 'Results',      icon: <BarChart2  className="w-4 h-4" />, color: 'purple'  },
  { key: 'Event',       label: 'Events',       icon: <Star       className="w-4 h-4" />, color: 'yellow'  },
  { key: 'Ticket',      label: 'Tickets',      icon: <Ticket     className="w-4 h-4" />, color: 'red'     },
  { key: 'Product',     label: 'Products',     icon: <ShoppingBag className="w-4 h-4" />, color: 'lime'    },
  { key: 'Order',       label: 'Orders',       icon: <ShoppingCart className="w-4 h-4" />, color: 'cyan'    },
  { key: 'Certificate', label: 'Certificates', icon: <Award      className="w-4 h-4" />, color: 'pink'    },
  { key: 'User',        label: 'Users',        icon: <User       className="w-4 h-4" />, color: 'slate'   },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  badge: 'bg-indigo-100 text-indigo-700'  },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700'  },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-200',     badge: 'bg-sky-100 text-sky-700'        },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    badge: 'bg-teal-100 text-teal-700'      },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700'},
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700'    },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700'  },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700'      },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700'  },
  yellow:  { bg: 'bg-yellow-50',  text: 'text-yellow-600',  border: 'border-yellow-200',  badge: 'bg-yellow-100 text-yellow-700'  },
  red:     { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700'        },
  lime:    { bg: 'bg-lime-50',    text: 'text-lime-600',    border: 'border-lime-200',    badge: 'bg-lime-100 text-lime-700'      },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700'      },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-200',    badge: 'bg-pink-100 text-pink-700'      },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-700'    },
};

// ── Component ─────────────────────────────────────────────────────────────────

const RecycleBin: React.FC = () => {
  const isSuperAdmin = useIsRole('superadmin');

  const [activeTab, setActiveTab] = useState('School');
  const [summary, setSummary] = useState<RecycleBinSummary | null>(null);
  const [pageData, setPageData] = useState<RecycleBinPage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RecycleBinItem | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/recycle-bin/summary');
      setSummary(res.data);
    } catch {
      // non-critical
    }
  }, []);

  const loadPage = useCallback(async (entityType: string, p: number) => {
    setLoading(true);
    try {
      const res = await api.get('/recycle-bin', {
        params: { entityType, page: p, pageSize: 20 },
      });
      setPageData(res.data);
    } catch {
      toast.error('Failed to load deleted records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    loadPage(activeTab, 1);
  }, [activeTab, loadPage]);

  const handleRestore = async (item: RecycleBinItem) => {
    setActionLoading(item.id);
    try {
      await api.post(`/recycle-bin/${item.entityType}/${item.id}/restore`);
      toast.success(`${item.displayName} restored successfully.`);
      loadPage(activeTab, page);
      loadSummary();
    } catch {
      toast.error('Restore failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (item: RecycleBinItem) => {
    setActionLoading(item.id);
    setConfirmDelete(null);
    try {
      await api.delete(`/recycle-bin/${item.entityType}/${item.id}`);
      toast.success(`${item.displayName} permanently deleted.`);
      loadPage(activeTab, page);
      loadSummary();
    } catch {
      toast.error('Permanent delete failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadPage(activeTab, p);
  };

  // client-side search filter
  const filtered = (pageData?.items ?? []).filter(
    (item) =>
      !search ||
      item.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const activeConfig = ENTITY_TABS.find((t) => t.key === activeTab)!;
  const colors = COLOR_MAP[activeConfig.color];

  return (
    <div className="min-h-screen bg-slate-50/60 p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Recycle Bin</h1>
            <p className="text-sm text-slate-500">
              {summary ? `${summary.total} soft-deleted records across all modules` : 'Soft-deleted records'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { loadPage(activeTab, page); loadSummary(); }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-6">
        {/* ── Left sidebar: entity type tabs ── */}
        <div className="w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-slate-50/60">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categories</p>
            </div>
            <div className="p-2 space-y-0.5">
              {ENTITY_TABS.map((tab) => {
                const count = summary?.counts[tab.key] ?? 0;
                const c = COLOR_MAP[tab.color];
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all border-l-[3px] ${
                      isActive
                        ? `${c.bg} ${c.text} border-l-current font-medium`
                        : 'text-slate-600 border-l-transparent hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={isActive ? c.text : 'text-slate-400'}>{tab.icon}</span>
                      {tab.label}
                    </span>
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? c.badge : 'bg-slate-100 text-slate-500'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Color band */}
            <div className={`h-1.5 w-full bg-gradient-to-r from-red-400 to-rose-500`} />

            {/* Search bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg}`}>
                <span className={colors.text}>{activeConfig.icon}</span>
              </div>
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search deleted ${activeConfig.label.toLowerCase()}…`}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">
                  {search ? 'No results match your search.' : `No deleted ${activeConfig.label.toLowerCase()} found.`}
                </p>
                {!search && (
                  <p className="text-sm text-slate-400">Records deleted from {activeConfig.label} will appear here.</p>
                )}
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const isActing = actionLoading === item.id;
                    return (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
                          <span className={colors.text}>{activeConfig.icon}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{item.displayName}</p>
                          {item.description && (
                            <p className="text-sm text-slate-500 truncate">{item.description}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5">
                            Deleted {new Date(item.deletedDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={isActing}
                            title="Restore"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => setConfirmDelete(item)}
                              disabled={isActing}
                              title="Permanently delete"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pageData && pageData.totalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pageData.totalCount)} of {pageData.totalCount}
                    </p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pageData.totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
                            p === page
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Permanent Delete Confirmation Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Permanently Delete</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-800">{confirmDelete.displayName}</span>?
              This will remove the record and all associated data from the database forever.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmDelete)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;
