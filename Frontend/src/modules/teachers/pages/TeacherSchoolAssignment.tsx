/**
 * Teacher-School Assignment (Admin/Staff only) — Requirement 2/3/7.2.
 *
 * Manages the many-to-many TeacherSchools join: paged grid of every
 * Teacher-School membership with Active/Inactive + Primary controls, a bulk
 * "assign existing teacher to additional schools" action, and a full audit
 * trail. This is the operational management view; the Teacher Create/Edit
 * forms (task separate from this screen) handle the initial multi-school
 * selection at account-creation time.
 */

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Users, School as SchoolIcon, Star, Power, Trash2, Plus, X, Check, Search,
  ChevronDown, History, Filter, UserCheck, CheckSquare, Square,
} from 'lucide-react';

import { teacherSchoolService } from '@/services/teacherSchoolService';
import { teacherService } from '@/services/teacherService';
import { schoolService } from '@/services/schoolService';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { useConfirm } from '@/hooks/useConfirm';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import Tabs from '@/components/Tabs';

import type { TeacherSchoolAssignment as TeacherSchoolRow, TeacherSchoolAuditLog } from '@/types/teacher.types';
import type { Teacher } from '@/types/teacher.types';
import type { School } from '@/types/school.types';

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border text-[9px] px-2 py-0.5
    ${active ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/25' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-400/25'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#283548] flex items-center justify-center mb-3 text-slate-300 dark:text-[#475569]">
      {icon}
    </div>
    <p className="text-sm font-bold text-slate-400 dark:text-[#64748b]">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 dark:text-[#64748b] mt-1">{subtitle}</p>}
  </div>
);

type TabKey = 'assignments' | 'audit';

const TeacherSchoolAssignment: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('assignments');
  const { confirmState, requestConfirm } = useConfirm();

  // ── Shared lookups ─────────────────────────────────────────────────────
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  // ── Assignments grid ────────────────────────────────────────────────────
  const [rows, setRows] = useState<TeacherSchoolRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterTeacherId, setFilterTeacherId] = useState('');
  const [filterSchoolId, setFilterSchoolId] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // ── Quick stats ─────────────────────────────────────────────────────────
  const [totalAssignments, setTotalAssignments] = useState<number | null>(null);
  const [activeAssignments, setActiveAssignments] = useState<number | null>(null);

  // ── Bulk assign modal ───────────────────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignSchoolIds, setAssignSchoolIds] = useState<Set<string>>(new Set());
  const [assignNotes, setAssignNotes] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [loadingAssignSchools, setLoadingAssignSchools] = useState(false);

  // ── Audit log ───────────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<TeacherSchoolAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditTeacherId, setAuditTeacherId] = useState('');
  const [auditSchoolId, setAuditSchoolId] = useState('');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');

  // ── Fetchers ────────────────────────────────────────────────────────────

  const fetchLookups = async () => {
    try {
      const [t, s] = await Promise.all([teacherService.getTeachers(), schoolService.getSchools()]);
      setTeachers(t);
      setSchools(s);
    } catch (e) {
      console.error('Failed to fetch teachers/schools', e);
      toast.error('Failed to load teachers or schools');
    }
  };

  const fetchStats = async () => {
    try {
      const [allResp, activeResp] = await Promise.all([
        teacherSchoolService.getPaged({ page: 1, pageSize: 1 }),
        teacherSchoolService.getPaged({ page: 1, pageSize: 1, isActive: true }),
      ]);
      setTotalAssignments(allResp.total_count);
      setActiveAssignments(activeResp.total_count);
    } catch (e) {
      console.error('Failed to fetch teacher-school stats', e);
    }
  };

  const fetchRows = async () => {
    setRowsLoading(true);
    try {
      const resp = await teacherSchoolService.getPaged({
        teacherId: filterTeacherId || undefined,
        schoolId: filterSchoolId || undefined,
        isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
        search: search || undefined,
        page,
        pageSize,
      });
      setRows(resp.items);
      setTotal(resp.total_count);
      setTotalPages(resp.total_pages);
    } catch (e) {
      console.error('Failed to fetch teacher-school assignments', e);
      toast.error('Failed to load teacher-school assignments');
    } finally {
      setRowsLoading(false);
    }
  };

  const fetchAuditLog = async () => {
    setAuditLoading(true);
    try {
      const resp = await teacherSchoolService.getAuditLog({
        teacherId: auditTeacherId || undefined,
        schoolId: auditSchoolId || undefined,
        fromDate: auditFromDate || undefined,
        toDate: auditToDate || undefined,
        page: auditPage,
        pageSize: auditPageSize,
      });
      setAuditLogs(resp.items);
      setAuditTotal(resp.total_count);
      setAuditTotalPages(resp.total_pages);
    } catch (e) {
      console.error('Failed to fetch teacher-school audit log', e);
      toast.error('Failed to load audit log');
    } finally {
      setAuditLoading(false);
    }
  };

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchLookups();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setPage(1); }, [filterTeacherId, filterSchoolId, filterStatus]);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTeacherId, filterSchoolId, filterStatus, search, page, pageSize]);

  useEffect(() => {
    if (activeTab !== 'audit') return;
    fetchAuditLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, auditPage, auditPageSize]);

  // ── Row actions ─────────────────────────────────────────────────────────

  const refreshAfterMutation = () => {
    fetchRows();
    fetchStats();
  };

  const handleToggleStatus = async (row: TeacherSchoolRow) => {
    if (row.is_active) {
      const ok = await requestConfirm({
        title: 'Deactivate Membership',
        message: `Deactivate ${row.teacher_name}'s access to ${row.school_name}? They will immediately lose access to this school's data on next login or school switch.`,
        confirmLabel: 'Deactivate',
        variant: 'warning',
      });
      if (!ok) return;
    }
    try {
      await teacherSchoolService.setStatus(row.teacher_id, row.school_id, { is_active: !row.is_active });
      toast.success(`Membership ${row.is_active ? 'deactivated' : 'activated'}`);
      refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update membership status');
    }
  };

  const handleSetPrimary = async (row: TeacherSchoolRow) => {
    if (row.is_primary) return;
    if (!row.is_active) {
      toast.error('Cannot set an inactive school as primary');
      return;
    }
    try {
      await teacherSchoolService.setPrimary({ teacher_id: row.teacher_id, school_id: row.school_id });
      toast.success(`${row.school_name} set as ${row.teacher_name}'s primary school`);
      refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to set primary school');
    }
  };

  const handleRemove = async (row: TeacherSchoolRow) => {
    const ok = await requestConfirm({
      title: 'Remove Membership',
      message: `Remove ${row.teacher_name} from ${row.school_name}? This is a soft delete — the record is kept for audit purposes and can be restored.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await teacherSchoolService.removeAssignment({ teacher_id: row.teacher_id, school_id: row.school_id });
      toast.success('Membership removed');
      refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove membership');
    }
  };

  // ── Bulk assign modal ───────────────────────────────────────────────────

  const openAssignModal = () => {
    setAssignTeacherId('');
    setAssignSchoolIds(new Set());
    setAssignNotes('');
    setShowAssignModal(true);
  };

  const toggleAssignSchool = (schoolId: string) => {
    setAssignSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  };

  // Pre-check the schools this teacher is already (actively) assigned to whenever
  // the selected teacher changes, so the checklist reflects their current state
  // instead of always starting blank.
  useEffect(() => {
    if (!assignTeacherId) {
      setAssignSchoolIds(new Set());
      return;
    }
    let cancelled = false;
    setLoadingAssignSchools(true);
    teacherSchoolService.getByTeacher(assignTeacherId)
      .then((memberships) => {
        if (cancelled) return;
        setAssignSchoolIds(new Set(memberships.filter((m) => m.is_active).map((m) => m.school_id)));
      })
      .catch((e) => {
        console.error('Failed to load existing school assignments for teacher', e);
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignSchools(false);
      });
    return () => { cancelled = true; };
  }, [assignTeacherId]);

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherId || assignSchoolIds.size === 0) {
      toast.error('Select a teacher and at least one school');
      return;
    }
    setAssignSubmitting(true);
    try {
      const result = await teacherSchoolService.assignToSchools({
        teacher_id: assignTeacherId,
        school_ids: Array.from(assignSchoolIds),
        notes: assignNotes || undefined,
      });
      toast.success(`Assigned to ${result.succeeded_count} school(s)${result.skipped_count ? ` · ${result.skipped_count} already assigned` : ''}`);
      if (result.errors.length) toast.error(`${result.errors.length} school(s) failed to assign`);
      setShowAssignModal(false);
      refreshAfterMutation();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign teacher to schools');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────

  const stats: StatItem[] = [
    { title: 'Teachers', value: teachers.length, icon: <Users className="w-6 h-6" />, color: 'indigo', subtitle: 'All registered faculty' },
    { title: 'Schools', value: schools.length, icon: <SchoolIcon className="w-6 h-6" />, color: 'sky', subtitle: 'Available institutions' },
    { title: 'Total Memberships', value: totalAssignments ?? '—', icon: <UserCheck className="w-6 h-6" />, color: 'violet', subtitle: 'All teacher-school links' },
    { title: 'Active Memberships', value: activeAssignments ?? '—', icon: <Check className="w-6 h-6" />, color: 'emerald', subtitle: 'Currently in effect' },
  ];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'assignments', label: 'Assignments', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { key: 'audit', label: 'Audit Log', icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Teacher-School Assignment</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Multi-School Teacher Access Management
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatGrid stats={stats} loading={rowsLoading && teachers.length === 0} />
      </div>

      <Tabs
        tabs={tabs}
        active={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        variant="pills"
        className="mb-4"
      />

      {activeTab === 'assignments' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput); } }}
                  placeholder="Search teacher or school..."
                  className="w-60 pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
              <div className="relative">
                <select
                  value={filterTeacherId}
                  onChange={(e) => setFilterTeacherId(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer max-w-[160px]"
                >
                  <option value="">All Teachers</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={filterSchoolId}
                  onChange={(e) => setFilterSchoolId(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer max-w-[160px]"
                >
                  <option value="">All Schools</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <button
              onClick={openAssignModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Assign Teacher to Schools
            </button>
          </div>

          {rowsLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600 mx-auto" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={<UserCheck className="w-7 h-7" />} title="No memberships found" subtitle="Try adjusting your filters or assign a teacher to a school." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider border-b border-slate-100 dark:border-[#283548]">
                    <th className="px-4 py-3">Teacher</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Primary</th>
                    <th className="px-4 py-3">Assigned By</th>
                    <th className="px-4 py-3">Assigned Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#283548]">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-[#283548]/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{row.teacher_name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-[#94a3b8]">{row.school_name}</td>
                      <td className="px-4 py-3"><StatusPill active={row.is_active} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleSetPrimary(row)} title={row.is_primary ? 'Primary school' : 'Set as primary'} className="flex items-center gap-1 text-amber-500 disabled:opacity-40" disabled={!row.is_active}>
                          <Star className={`w-4 h-4 ${row.is_primary ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-[#94a3b8]">{row.assigned_by_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-[#94a3b8] whitespace-nowrap">{new Date(row.assigned_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(row)}
                            className={`p-1.5 rounded-lg transition-all ${row.is_active ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/25' : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'}`}
                            title={row.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleRemove(row)} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-all" title="Remove">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">Teacher</label>
              <div className="relative">
                <select
                  value={auditTeacherId}
                  onChange={(e) => setAuditTeacherId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer"
                >
                  <option value="">All Teachers</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">School</label>
              <div className="relative">
                <select
                  value={auditSchoolId}
                  onChange={(e) => setAuditSchoolId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer"
                >
                  <option value="">All Schools</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">From</label>
              <input type="date" value={auditFromDate} onChange={(e) => setAuditFromDate(e.target.value)} className="px-3 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">To</label>
              <input type="date" value={auditToDate} onChange={(e) => setAuditToDate(e.target.value)} className="px-3 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium" />
            </div>
            <button
              onClick={() => { setAuditPage(1); fetchAuditLog(); }}
              className="px-4 py-2.5 bg-slate-100 dark:bg-[#283548] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-700 dark:text-[#e2e8f0] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Filter className="w-3.5 h-3.5" /> Apply Filters
            </button>
          </div>

          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
            {auditLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600 mx-auto" />
              </div>
            ) : auditLogs.length === 0 ? (
              <EmptyState icon={<History className="w-7 h-7" />} title="No audit history found" subtitle="Assignment actions will appear here once performed." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider border-b border-slate-100 dark:border-[#283548]">
                      <th className="px-4 py-3">Date / Time</th>
                      <th className="px-4 py-3">Teacher</th>
                      <th className="px-4 py-3">School</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Performed By</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#283548]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-[#283548]/40 transition-colors">
                        <td className="px-4 py-3 text-slate-500 dark:text-[#94a3b8] whitespace-nowrap">{new Date(log.date_time).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{log.teacher_name}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-[#94a3b8]">{log.school_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${/remov|deactivat|unassign/i.test(log.action_performed) ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'}`}>
                            {log.action_performed}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-[#94a3b8]">{log.user_name} <span className="text-slate-400 dark:text-[#64748b]">({log.role})</span></td>
                        <td className="px-4 py-3 text-slate-500 dark:text-[#94a3b8]">{log.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={auditPage}
              totalPages={auditTotalPages}
              pageSize={auditPageSize}
              totalItems={auditTotal}
              onPageChange={setAuditPage}
              onPageSizeChange={(s) => { setAuditPageSize(s); setAuditPage(1); }}
            />
          </div>
        </div>
      )}

      {/* ➕ Bulk Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-[10px] w-full max-w-lg shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Assign Teacher to Schools</h2>
              <button type="button" onClick={() => setShowAssignModal(false)} className="w-9 h-9 flex items-center justify-center rounded-[4px] bg-gray-100 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleBulkAssign} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Teacher</label>
                <div className="relative">
                  <select
                    required
                    value={assignTeacherId}
                    onChange={(e) => setAssignTeacherId(e.target.value)}
                    className="w-full px-4 pr-10 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm cursor-pointer shadow-sm appearance-none"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Schools</label>
                <div className="border border-gray-200 rounded-[4px] max-h-52 overflow-y-auto custom-scrollbar divide-y divide-gray-50 relative">
                  {loadingAssignSchools && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-200 border-t-indigo-600" />
                    </div>
                  )}
                  {schools.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleAssignSchool(s.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {assignSchoolIds.has(s.id) ? <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      {s.name}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                  {assignTeacherId ? `${assignSchoolIds.size} school(s) selected — already-assigned schools are pre-checked` : `${assignSchoolIds.size} school(s) selected`}
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Notes (optional)</label>
                <textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} rows={2} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm resize-none" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setShowAssignModal(false)} className="modal-btn-cancel"><X className="w-3.5 h-3.5" /><span>Cancel</span></button>
                <button type="submit" disabled={assignSubmitting} className="modal-btn-save disabled:opacity-50"><Check className="w-3.5 h-3.5" /><span>Assign</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title ?? 'Confirm Action'}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={() => confirmState.resolve?.(true)}
        onCancel={() => confirmState.resolve?.(false)}
      />
    </div>
  );
};

export default TeacherSchoolAssignment;
