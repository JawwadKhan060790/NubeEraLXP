import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import ExportButton from '@/components/export/ExportButton';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { BookOpen, Check, ChevronRight, Edit, GraduationCap, Plus, Search, Trash2, X, FileText, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import FieldError from '@/components/FieldError';
import { parseApiErrors } from '@/utils/errorParser';
import GradeLevelSelect, { fetchMasterGradeLevels, type GradeLevelOption } from '@/components/GradeLevelSelect';

// ── Sub-components (Schools.tsx design system) ────────────────────────────────

const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({ active, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border
    ${size === 'md' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'}
    ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/25'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null; className?: string }> = ({ icon, label, value, className = '' }) => {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#283548] flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-[#94a3b8] mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700 dark:text-[#e2e8f0] leading-snug mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#283548] mb-4">
    <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <h3 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">{title}</h3>
  </div>
);

interface Module {
  id: string;
  name: string;
  grade_level_id: string;
  grade_level_name?: string;
  subject_id?: string | null;
  subject_name?: string | null;
  description?: string;
  pdf_file_url?: string;
  is_active?: boolean;
  assigned_school_count?: number;
}

// ── Assigned-schools indicator ──────────────────────────────────────────────
// Surfaces, right on the Units list, how many schools currently have this Unit
// assigned (via /admin/curriculum-assignment) — previously the only way to see
// this was to open that separate screen and check school-by-school.
const AssignedSchoolsBadge: React.FC<{ count?: number; size?: 'sm' | 'md' }> = ({ count = 0, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border
    ${size === 'md' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'}
    ${count > 0
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-400/25'
      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/25'
    }`}
  >
    {count > 0 ? `${count} School${count === 1 ? '' : 's'}` : 'Not Assigned'}
  </span>
);

const Modules: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Reset to page 1 when filters change (but don't double-fetch if already on p1)
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm, filterGradeId]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [gradeSubjects, setGradeSubjects] = useState<{ id: string; name: string }[]>([]);

  const clearFieldError = (field: string) => {
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const [formData, setFormData] = useState({
    name: '',
    grade_level_id: '',
    subject_id: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    if (formData.grade_level_id) {
      api.get('/subjects', { params: { gradeId: formData.grade_level_id } })
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : res.data.items || [];
          setGradeSubjects(list);
        })
        .catch(err => console.error('Error fetching subjects:', err));
    } else {
      setGradeSubjects([]);
    }
  }, [formData.grade_level_id]);

  const [user, setUser] = useState<any>(null);

  // Load the canonical 1st-10th grade level master list once (used for the stat
  // tile count). Units/Topics are school-agnostic, so the full master list — not
  // any school-scoped subset — is always the correct source here.
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchMasterGradeLevels()
      .then(setGradeLevels)
      .catch(err => console.error('Error fetching grade levels:', err));
  }, []);

  // Re-fetch modules whenever page, page size, search, or grade filter changes
  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, filterGradeId]);

  const fetchData = async () => {
    try {
      const params: Record<string, any> = {
        pageNumber: currentPage,
        pageSize: itemsPerPage,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterGradeId) params.gradeId = filterGradeId;

      const res = await api.get('/modules/paged', { params });
      const paged = res.data;
      const modData: Module[] = paged.items || [];
      setModules(modData);
      setTotalCount(paged.total_count || 0);
      setTotalPages(paged.total_pages || 0);
      if (modData.length > 0) {
        setSelectedModule(prev =>
          prev ? (modData.find(m => m.id === prev.id) ?? modData[0]) : modData[0]
        );
      } else {
        setSelectedModule(null);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!formData.grade_level_id) {
      setFormErrors({ grade_level_id: 'Please select a Grade Level' });
      return;
    }

    try {
      if (editingId) {
        await api.put(`/modules/${editingId}`, formData);
        toast.success('Saved');
      } else {
        await api.post('/modules', formData);
        toast.success('Added');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Save failed', error);
      const errorsMap = parseApiErrors(error);
      setFormErrors(errorsMap);
      if (errorsMap._form) {
        toast.error(errorsMap._form);
      }
    }
  };

  const handleEdit = (module: Module) => {
    setEditingId(module.id);
    setFormData({
      name: module.name,
      grade_level_id: module.grade_level_id,
      subject_id: module.subject_id || '',
      description: module.description || '',
      is_active: module.is_active ?? true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const ok = await requestConfirm({ title: 'Delete Unit', message: `Are you sure you want to delete "${name}"?`, variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/modules/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch (error) { }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', grade_level_id: '', subject_id: '', description: '', is_active: true });
    setFormErrors({});
  };

  // Filtering and pagination are now server-side (GET /api/modules/paged).
  // `modules` already contains only the current page's items.

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header section with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Units & Syllabus</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            {totalCount} Core Curriculum Units Defined
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          <ExportButton
            endpoint="/modules/export"
            fallbackFileName="modules-export.xlsx"
            label="Export to Excel"
          />
          {user?.utype !== 'student' && user?.utype !== 'teacher' && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Unit
            </button>
          )}
        </div>
      </div>

      {/* Counters / Stats Row */}
      {(() => {
        const activeCount = modules.filter(m => m.is_active).length;
        const withPdf = modules.filter(m => m.pdf_file_url).length;
        const moduleStats: StatItem[] = [
          { title: 'Total Units', value: totalCount, icon: <BookOpen className="w-6 h-6" />, color: 'indigo', subtitle: 'All curriculum units' },
          { title: 'Active Modules', value: activeCount, icon: <Check className="w-6 h-6" />, color: 'emerald', subtitle: 'Currently active' },
          { title: 'Inactive', value: modules.filter(m => !m.is_active).length, icon: <X className="w-6 h-6" />, color: 'rose', subtitle: 'Disabled or archived' },
          { title: 'Grade Levels', value: gradeLevels.length, icon: <GraduationCap className="w-6 h-6" />, color: 'amber', subtitle: 'Distinct grade levels covered' },
          // { title: 'With PDF', value: withPdf, icon: <FileText className="w-6 h-6" />, color: 'teal' },
        ];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatGrid stats={moduleStats} />
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL: Units List Selection */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[680px]">
          {/* Search and Filters container */}
          <div className="p-4 border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60">
            {/* Search and grade level filter share one row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search units..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
              <div className="flex-1 min-w-0">
                <GradeLevelSelect
                  value={filterGradeId}
                  onChange={(value) => setFilterGradeId(value)}
                  source="master"
                  valueAs="id"
                  placeholder="All Grades"
                  className="w-full px-3 pr-9 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer appearance-none"
                />
              </div>
            </div>
          </div>

          {/* List scroll container */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#283548] flex-1 min-h-[350px]">
            {modules.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest">
                No units found.
              </div>
            ) : (
              modules.map((m) => {
                const isSelected = selectedModule?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModule(m)}
                    className={`relative px-4 py-3.5 cursor-pointer flex items-center gap-3.5 transition-all duration-200 border-l-[3px] group ${isSelected
                      ? 'bg-indigo-50/70 border-l-indigo-500'
                      : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-l-slate-300'
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-white tracking-tight truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-medium truncate mt-0.5">
                        {m.grade_level_name || 'General Grade'} {m.subject_name ? `• ${m.subject_name}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge active={m.is_active ?? true} />
                      {isSelected && (
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-500 animate-in fade-in slide-in-from-left-2 duration-300" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-[#283548] bg-slate-50/40 dark:bg-[#283548]/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={itemsPerPage}
              totalItems={totalCount}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Details view */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {selectedModule ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">

              {/* Module Detail Card */}
              <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden">
                {/* Color band */}
                <div className={`h-1.5 w-full ${(selectedModule.is_active ?? true)
                  ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400'
                  : 'bg-gradient-to-r from-rose-400 to-rose-300'}`}
                />
                <div className="p-5 space-y-5">
                  {/* Identity row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-800 dark:text-white tracking-tight leading-tight">{selectedModule.name}</h2>
                        <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-medium mt-0.5">{selectedModule.grade_level_name || 'General Grade'}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <StatusBadge active={selectedModule.is_active ?? true} size="md" />
                          <AssignedSchoolsBadge count={selectedModule.assigned_school_count} size="md" />
                        </div>
                      </div>
                    </div>
                    {user?.utype !== 'student' && user?.utype !== 'teacher' && (
                      <div className="flex items-center gap-2 self-start flex-wrap flex-shrink-0">
                        <button
                          onClick={() => handleEdit(selectedModule)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
                          title="Edit Unit"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedModule.id, selectedModule.name)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
                          title="Delete Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Module Details */}
                  <div>
                    <SectionHeader icon={<BookOpen className="w-3.5 h-3.5" />} title="Module Details" />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Grade Level" value={selectedModule.grade_level_name} />
                      <InfoRow icon={<BookOpen className="w-4 h-4" />} label="Subject Hierarchy" value={selectedModule.subject_name || 'No Subject (General Unit)'} />
                      <InfoRow icon={<FileText className="w-4 h-4" />} label="PDF Resource" value={selectedModule.pdf_file_url ? 'Attached' : null} className="col-span-2" />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} title="Unit Objectives & Description" />
                    <div className="bg-slate-50 dark:bg-[#283548] border border-slate-100 dark:border-[#283548] rounded-xl p-4 text-sm font-medium text-slate-600 dark:text-[#cbd5e1] leading-relaxed">
                      {selectedModule.description || 'No curriculum description provided for this unit yet.'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#283548] flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-slate-300 dark:text-[#475569]" />
              </div>
              <p className="text-sm font-bold text-slate-400 dark:text-[#64748b]">No module selected</p>
              <p className="text-xs text-slate-400 dark:text-[#64748b] mt-1">Select a curriculum unit to view its details.</p>
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-[10px] w-full max-w-lg overflow-hidden shadow-xl animate-in zoom-in slide-in-from-bottom-8 duration-300">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{editingId ? 'Edit Unit' : 'Add New Unit'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-100 dark:bg-[#283548] hover:bg-rose-50 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formErrors._form && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formErrors._form}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Unit Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Enter Unit Name" className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all font-bold" />
                <FieldError message={formErrors.name} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Select Grade Level</label>
                <GradeLevelSelect
                  required
                  value={formData.grade_level_id}
                  onChange={(value) => setFormData({ ...formData, grade_level_id: value, subject_id: '' })}
                  source="master"
                  valueAs="id"
                  placeholder="Choose Grade Level"
                />
                <FieldError message={formErrors.grade_level_id} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Subject (Optional)</label>
                <select
                  value={formData.subject_id}
                  onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-indigo-500 transition-all font-bold cursor-pointer"
                >
                  <option value="">No Subject (General Unit)</option>
                  {gradeSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                <FieldError message={formErrors.subject_id} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">About this Unit</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Enter Description" className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all resize-none shadow-sm font-medium" />
                <FieldError message={formErrors.description} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#283548]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="modal-btn-cancel"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="modal-btn-save font-bold uppercase tracking-wider"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Update Unit' : 'Save Unit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title || 'Confirm Action'}
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

export default Modules;
