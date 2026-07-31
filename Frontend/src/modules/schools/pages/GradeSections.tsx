import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import { type GradeSection } from '@/services/sectionService';
import {
  BookMarked, Check, ChevronDown, ChevronRight, Edit, GraduationCap,
  Layers, Plus, School, Search, Trash2, Users, X, AlertCircle
} from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import FieldError from '@/components/FieldError';
import { parseApiErrors } from '@/utils/errorParser';

// ── Sub-components (matching Grades.tsx design system) ────────────────────────

const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({ active, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border
    ${size === 'md' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'}
    ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | number | null; className?: string }> = ({ icon, label, value, className = '' }) => {
  if (value == null || value === '') return null;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700 leading-snug mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
    <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</h3>
  </div>
);

interface Grade { id: string; grade_name: string; grade_level: string; school_id?: string; }
interface SchoolData { id: string; name: string; from_grade?: number; to_grade?: number; }

const SECTION_CODES = ['A', 'B', 'C', 'D', 'E'];

const GradeSections: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const isAdmin = user?.utype === 'admin' || user?.utype === 'superadmin';
  const isStaff = user?.utype === 'staff' || user?.utype === 'principal';
  const canWrite = isAdmin || isStaff;

  const isPlatformWide = useMemo(() => {
    const utype = user?.utype;
    return utype === 'superadmin' || utype === 'admin' || utype === 'staff';
  }, [user]);

  const [sections, setSections] = useState<GradeSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<GradeSection | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [modalGrades, setModalGrades] = useState<Grade[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchoolId, setFilterSchoolId] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    school_id: '',
    grade_id: '',
    section_code: '',
    section_name: '',
    capacity: 0,
    description: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const { confirmState, requestConfirm } = useConfirm();

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      setFormData(prev => ({ ...prev, school_id: parsed.school_id || '' }));
      if (parsed.school_id) {
        setFilterSchoolId(parsed.school_id);
      }
    }
  }, []);

  const effectiveSchoolId = isPlatformWide ? filterSchoolId : (user?.school_id || filterSchoolId);

  // ── Load reference data (schools only) ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const loadSchools = async () => {
      try {
        const res = await api.get('/schools');
        setSchools(res.data);
      } catch { /* ignore */ }
    };
    loadSchools();
  }, [user]);

  // ── Fetch sections and grades dynamically based on effectiveSchoolId ──
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sectionsUrl = effectiveSchoolId 
        ? `/grade-sections/by-school/${effectiveSchoolId}`
        : '/grade-sections';
      
      const gradesUrl = effectiveSchoolId
        ? `/grades/by-school/${effectiveSchoolId}`
        : '/grades';

      const [sectionsRes, gradesRes] = await Promise.all([
        api.get(sectionsUrl),
        api.get(gradesUrl)
      ]);

      setSections(sectionsRes.data);
      if (sectionsRes.data.length > 0) {
        setSelectedSection(prev => {
          const exists = sectionsRes.data.find((s: GradeSection) => s.id === prev?.id);
          return exists ?? sectionsRes.data[0];
        });
      } else {
        setSelectedSection(null);
      }

      const sortedGrades = [...gradesRes.data].sort((a: Grade, b: Grade) => {
        const av = parseInt(a.grade_level, 10);
        const bv = parseInt(b.grade_level, 10);
        return (isNaN(av) ? 0 : av) - (isNaN(bv) ? 0 : bv) || a.grade_name.localeCompare(b.grade_name);
      });
      setGrades(sortedGrades);

    } catch (err) {
      console.error('Failed to load data', err);
      toast.error('Failed to load divisions or grades');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // ── Fetch grades for the modal's selected school if it's different from the active filter ──
  useEffect(() => {
    if (!showModal) {
      setModalGrades([]);
      return;
    }
    
    const schoolId = formData.school_id;
    if (!schoolId) {
      setModalGrades(grades);
      return;
    }

    if (schoolId === effectiveSchoolId) {
      setModalGrades(grades);
      return;
    }

    let active = true;
    const fetchModalGrades = async () => {
      try {
        const res = await api.get(`/grades/by-school/${schoolId}`);
        if (active) {
          const sorted = [...res.data].sort((a: Grade, b: Grade) => {
            const av = parseInt(a.grade_level, 10);
            const bv = parseInt(b.grade_level, 10);
            return (isNaN(av) ? 0 : av) - (isNaN(bv) ? 0 : bv) || a.grade_name.localeCompare(b.grade_name);
          });
          setModalGrades(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch modal grades', err);
      }
    };
    fetchModalGrades();
    return () => { active = false; };
  }, [showModal, formData.school_id, effectiveSchoolId, grades]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Filtered + paginated ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return sections.filter(s => {
      const matchesSearch = !q ||
        s.section_code.toLowerCase().includes(q) ||
        s.grade_name.toLowerCase().includes(q) ||
        s.school_name?.toLowerCase().includes(q) ||
        s.display_name?.toLowerCase().includes(q);
      const matchesSchool = !filterSchoolId || s.school_id === filterSchoolId;
      const matchesGrade = !filterGradeId || s.grade_id === filterGradeId;
      return matchesSearch && matchesSchool && matchesGrade;
    });
  }, [sections, searchTerm, filterSchoolId, filterGradeId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterSchoolId, filterGradeId]);

  // Narrows the full `grades` list down to a given school's grades (within its
  // configured grade range). Empty schoolId returns every grade unfiltered.
  const gradesForSchool = (schoolId: string, gradeList: Grade[] = grades): Grade[] => {
    const schoolAllGrades = gradeList.filter(g => !schoolId || g.school_id === schoolId || !g.school_id);
    if (!schoolId) return schoolAllGrades;
    const selectedSchool = schools.find(s => s.id === schoolId);
    if (!selectedSchool) return schoolAllGrades;
    const fromGrade = selectedSchool.from_grade !== undefined && selectedSchool.from_grade !== null ? selectedSchool.from_grade : -1;
    const toGrade = selectedSchool.to_grade !== undefined && selectedSchool.to_grade !== null ? selectedSchool.to_grade : 10;
    return schoolAllGrades.filter(g => {
      const lvl = parseInt(g.grade_level, 10);
      if (isNaN(lvl)) return true;
      return lvl >= fromGrade && lvl <= toGrade;
    });
  };



  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats: StatItem[] = useMemo(() => [
    { title: 'Total Divisions', value: sections.length,                             icon: <Layers className="w-6 h-6" />,        color: 'indigo', subtitle: 'All class divisions' },
    { title: 'Active',         value: sections.filter(s => s.is_active).length,    icon: <Check className="w-6 h-6" />,         color: 'emerald', subtitle: 'Currently active' },
    { title: 'Total Students', value: sections.reduce((a, s) => a + s.student_count, 0), icon: <Users className="w-6 h-6" />,    color: 'sky', subtitle: 'Enrolled across divisions' },
    { title: 'Grades With Divisions', value: new Set(sections.map(s => s.grade_id)).size, icon: <GraduationCap className="w-6 h-6" />, color: 'amber', subtitle: 'Grades with at least one division' },
  ], [sections]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      school_id: isPlatformWide ? filterSchoolId : (user?.school_id || ''),
      grade_id: '', section_code: '', section_name: '',
      capacity: 0, description: '', is_active: true,
    });
    setFormErrors({});
  };

  const openCreate = () => { resetForm(); setEditingId(null); setShowModal(true); };

  const openEdit = (s: GradeSection) => {
    setEditingId(s.id);
    setFormData({
      school_id: s.school_id,
      grade_id: s.grade_id,
      section_code: s.section_code,
      section_name: s.section_name || '',
      capacity: s.capacity,
      description: s.description || '',
      is_active: s.is_active,
    });
    setFormErrors({});
    setShowModal(true);
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.grade_id) { errors.grade_id = 'Please select a grade'; }
    if (!formData.section_code) { errors.section_code = 'Please select a division code'; }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingId) {
        await api.put(`/grade-sections/${editingId}`, {
          section_code: formData.section_code,
          section_name: formData.section_name || null,
          capacity: formData.capacity,
          description: formData.description || null,
          is_active: formData.is_active,
        });
        toast.success('Division updated');
      } else {
        await api.post('/grade-sections', {
          school_id: formData.school_id || null,
          grade_id: formData.grade_id,
          section_code: formData.section_code,
          section_name: formData.section_name || null,
          capacity: formData.capacity,
          description: formData.description || null,
        });
        toast.success('Division created');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Save failed', err);
      const errorsMap = parseApiErrors(err);
      setFormErrors(errorsMap);
      if (errorsMap._form) {
        toast.error(errorsMap._form);
      }
    }
  };

  const handleDelete = async (s: GradeSection) => {
    const ok = await requestConfirm({
      title: 'Delete Division',
      message: `Delete division "${s.display_name}"? Students assigned to this division will have their division cleared.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/grade-sections/${s.id}`);
      toast.success('Division deleted');
      if (selectedSection?.id === s.id) setSelectedSection(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete division');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Grade Divisions</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage class divisions (A, B, C …) within each grade</p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Division
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatGrid stats={stats} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL: Sections List Selection */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[680px]">
          {/* Search & Filter container */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 min-w-0 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search divisions…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
              <div className="relative flex-1 min-w-0 w-full">
                <select
                  value={filterSchoolId}
                  onChange={e => { setFilterSchoolId(e.target.value); setFilterGradeId(''); }}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium cursor-pointer"
                >
                  <option value="">All Schools</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative flex-1 min-w-0 w-full">
                <select
                  value={filterGradeId}
                  onChange={e => setFilterGradeId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium cursor-pointer"
                >
                  <option value="">All Grades</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* List scroll container */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 min-h-[350px]">
            {paginated.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                No divisions found.
              </div>
            ) : (
              paginated.map(s => {
                const isSelected = selectedSection?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSection(s)}
                    className={`relative px-4 py-3.5 cursor-pointer flex items-center gap-3.5 transition-all duration-200 border-l-4 group ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-500/15 border-l-indigo-600 dark:border-l-indigo-400 shadow-xs'
                        : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-l-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs uppercase flex-shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-400/25 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/25'
                    }`}>
                      {s.section_code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-800 dark:text-white tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {s.display_name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-semibold truncate mt-0.5">
                        Students: {s.student_count} {s.capacity > 0 && `· Capacity: ${s.capacity}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge active={s.is_active} />
                      {isSelected && (
                        <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-in fade-in slide-in-from-left-2 duration-300" />
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
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={p => { setItemsPerPage(p); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Section detail view */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {selectedSection ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              
              {/* Section Detail Card */}
              <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 space-y-5">
                  {/* Identity row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white border-2 border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center text-xl font-black uppercase shadow-sm flex-shrink-0">
                        {selectedSection.section_code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {selectedSection.display_name}
                          </h2>
                          <StatusBadge active={selectedSection.is_active} size="md" />
                        </div>
                        {selectedSection.section_name && (
                          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-semibold mt-1">
                            {selectedSection.section_name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    {canWrite && (
                      <div className="flex items-center gap-2 self-start flex-wrap flex-shrink-0">
                        <button
                          onClick={() => openEdit(selectedSection)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                          title="Edit Division"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedSection)}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                          title="Delete Division"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Section Details */}
                  <div>
                    <SectionHeader icon={<BookMarked className="w-3.5 h-3.5" />} title="Division Details" />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Grade" value={selectedSection.grade_name} />
                      <InfoRow icon={<Layers className="w-4 h-4" />} label="Division Code" value={selectedSection.section_code} />
                      {selectedSection.section_name && (
                        <InfoRow icon={<Layers className="w-4 h-4" />} label="Division Name" value={selectedSection.section_name} />
                      )}
                      <InfoRow icon={<Users className="w-4 h-4" />} label="Students" value={selectedSection.student_count} />
                      {selectedSection.capacity > 0 && (
                        <InfoRow icon={<Users className="w-4 h-4" />} label="Capacity" value={selectedSection.capacity} />
                      )}
                      {selectedSection.school_name && (
                        <InfoRow icon={<School className="w-4 h-4" />} label="School" value={selectedSection.school_name} />
                      )}
                      {selectedSection.description && (
                        <InfoRow icon={<BookMarked className="w-4 h-4" />} label="Description" value={selectedSection.description} className="col-span-2" />
                      )}
                    </div>
                  </div>

                  {/* Status tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-xl p-4 border text-center ${selectedSection.is_active ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      <div className={`text-lg font-black ${selectedSection.is_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {selectedSection.is_active ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Division Status</div>
                    </div>
                    <div className="rounded-xl p-4 border bg-indigo-50 border-indigo-100 text-center">
                      <div className="text-lg font-black text-indigo-700">
                        {selectedSection.student_count} / {selectedSection.capacity > 0 ? selectedSection.capacity : 'Unlimited'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Enrollment</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Layers className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">No division selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a division from the list to view its details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-[#283548] flex-shrink-0 bg-white dark:bg-[#1e293b]">
              <h2 className="font-black text-slate-800 dark:text-white text-lg">
                {editingId ? 'Edit Division' : 'Add Division'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-slate-500 dark:text-[#64748b] transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {formErrors._form && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formErrors._form}</span>
                </div>
              )}
              {/* School (platform-wide / admin) */}
              {(isPlatformWide || !user?.school_id) && !editingId && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">School</label>
                  <div className="relative">
                    <select
                      value={formData.school_id}
                      onChange={e => setFormData({ ...formData, school_id: e.target.value, grade_id: '' })}
                      className="w-full pl-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <option value="">Select School</option>
                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <FieldError message={formErrors.school_id || formErrors.schoolId} />
                </div>
              )}

              {/* Grade */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Grade <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.grade_id}
                    onChange={e => setFormData({ ...formData, grade_id: e.target.value })}
                    disabled={!!editingId}
                    required
                    className="w-full pl-3 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select grade…</option>
                    {gradesForSchool(editingId ? '' : formData.school_id, modalGrades).map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <FieldError message={formErrors.grade_id || formErrors.gradeId} />
              </div>

              {/* Section Code */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Division Code <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SECTION_CODES.map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setFormData({ ...formData, section_code: code })}
                      className={`w-10 h-10 rounded-xl text-sm font-black border transition-all
                        ${formData.section_code === code
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {code}
                    </button>
                  ))}
                  {/* Custom code input */}
                  <input
                    type="text"
                    placeholder="Other"
                    maxLength={5}
                    value={SECTION_CODES.includes(formData.section_code) ? '' : formData.section_code}
                    onChange={e => setFormData({ ...formData, section_code: e.target.value.toUpperCase() })}
                    className="w-20 px-2 py-2 text-sm border border-slate-200 rounded-xl text-center uppercase focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <FieldError message={formErrors.section_code || formErrors.sectionCode} />
              </div>

              {/* Section Name (optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Division Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Batch"
                  value={formData.section_name}
                  onChange={e => setFormData({ ...formData, section_name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <FieldError message={formErrors.section_name || formErrors.sectionName} />
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Capacity <span className="text-slate-400 font-normal">(0 = unlimited)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <FieldError message={formErrors.capacity} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Any notes about this division…"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <FieldError message={formErrors.description} />
              </div>

              {/* Is Active (edit only) */}
              {editingId && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5
                      ${formData.is_active ? 'bg-indigo-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform
                      ${formData.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Active</span>
                </label>
              )}

            </div>

            {/* Actions */}
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-[#283548] bg-slate-50 dark:bg-[#283548]/30 px-6 py-4 flex items-center justify-end gap-3 z-10 bg-white dark:bg-[#1e293b]">
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
                className="modal-btn-save"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingId ? 'Save Changes' : 'Create Division'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title ?? ''}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.resolve ? () => confirmState.resolve!(true) : () => {}}
        onCancel={confirmState.resolve ? () => confirmState.resolve!(false) : () => {}}
      />
    </div>
  );
};

export default GradeSections;
