import ConfirmModal from '@/components/ConfirmModal';
import ExportButton from '@/components/export/ExportButton';
import GradeLevelSelect, { fetchMasterGradeLevels, type GradeLevelOption } from '@/components/GradeLevelSelect';
import Pagination from '@/components/Pagination';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import { Check, ChevronDown, ChevronRight, Edit, GraduationCap, Layers, Plus, School, Search, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface Grade {
  id: string;
  grade_level: string;
  grade_level_id?: string | null;
  grade_name: string;
  school_id?: string;
  school_name?: string;
  is_active: boolean;
}

// ── Sub-components (Schools.tsx design system) ────────────────────────────────

const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({ active, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border
    ${size === 'md' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'}
    ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null; className?: string }> = ({ icon, label, value, className = '' }) => {
  if (!value) return null;
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

const Grades: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sections, setSections] = useState<any[]>([]);
  // School filter for the grade list — multi-school admins/staff must pick a school
  // before any grades are shown; accounts locked to one school skip this entirely.
  const [filterSchoolId, setFilterSchoolId] = useState('');

  const isPlatformWide = useMemo(() => {
    const utype = user?.utype;
    return utype === 'superadmin' || utype === 'admin' || utype === 'staff';
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSchoolId]);

  const [formData, setFormData] = useState({
    grade_level: '',
    grade_level_id: '',
    grade_name: '',
    school_id: ''
  });
  const [schools, setSchools] = useState<any[]>([]);
  const [masterLevels, setMasterLevels] = useState<GradeLevelOption[]>([]);

  useEffect(() => {
    fetchMasterGradeLevels().then(setMasterLevels).catch(() => {});
  }, []);

  useEffect(() => {
    if (location.pathname.includes('/create')) {
      resetForm();
      setShowModal(true);
    }
  }, [location]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setFormData(prev => ({ ...prev, school_id: parsed.school_id || '' }));
    }
  }, []);

  // The school whose grades are currently in view: the user's own school when their
  // account is locked to one, otherwise whatever was picked in the filter dropdown.
  const effectiveSchoolId = isPlatformWide ? filterSchoolId : (user?.school_id || '');

  useEffect(() => {
    fetchSections();
    fetchSchools();
  }, [user]);

  useEffect(() => {
    fetchGrades();
  }, [effectiveSchoolId]);

  const fetchSections = async () => {
    try {
      const response = await api.get('/grade-sections');
      setSections(response.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      const resp = await api.get('/schools');
      setSchools(resp.data);
    } catch (e) { }
  };

  const fetchGrades = async () => {
    // No school in view yet (multi-school admin/staff hasn't picked one) — show an
    // empty list instead of every school's grades mixed together.
    if (!effectiveSchoolId) {
      setGrades([]);
      setSelectedGrade(null);
      return;
    }
    try {
      const response = await api.get(`/grades/by-school/${effectiveSchoolId}`);
      const gradeData = response.data;
      const sortedGrades = [...gradeData].sort((a, b) => {
        const aMatch = (a.grade_level || a.grade_name || '').match(/-?\d+/);
        const bMatch = (b.grade_level || b.grade_name || '').match(/-?\d+/);
        const aVal = aMatch ? parseInt(aMatch[0], 10) : 999;
        const bVal = bMatch ? parseInt(bMatch[0], 10) : 999;
        if (aVal !== bVal) return aVal - bVal;
        return (a.grade_name || '').localeCompare(b.grade_name || '');
      });
      setGrades(sortedGrades);
      if (sortedGrades.length > 0) {
        setSelectedGrade(sortedGrades[0]);
      } else {
        setSelectedGrade(null);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.grade_level_id) {
      toast.error('Grade level is required.');
      return;
    }

    const gradeName = formData.grade_name.trim();
    if (!gradeName) {
      toast.error('Grade name is required.');
      return;
    }

    const nameUpper = gradeName.toUpperCase();
    const isBootCampOrFoundation = nameUpper.includes('BOOT CAMP') || nameUpper.includes('FOUNDATION COURSE');
    
    // Check Roman numerals I to X
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const words = nameUpper.split(/[\s\-_]+/);
    const hasRomanNumeral = words.some(w => romanNumerals.includes(w));

    // Check level numbers
    const numMatch = gradeName.match(/-?\d+/);
    const hasValidNumber = numMatch && parseInt(numMatch[0], 10) >= -1 && parseInt(numMatch[0], 10) <= 10;

    if (!isBootCampOrFoundation && !hasRomanNumeral && !hasValidNumber) {
      toast.error('Grade name must contain a valid level name or number (e.g. "Boot camp", "Foundation Course", "Grade I" or "Grade 5").');
      return;
    }

    const payload = {
      grade_name: gradeName,
      grade_level_id: formData.grade_level_id,
      school_id: null
    };

    try {
      if (editingId) {
        await api.put(`/grades/${editingId}`, payload);
        toast.success('Saved');
      } else {
        await api.post('/grades', payload);
        toast.success('Added');
      }
      setShowModal(false);
      resetForm();
      fetchGrades();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.response?.data || 'Could not save';
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Could not save');
    }
  };

  const handleEdit = (grade: Grade) => {
    setEditingId(grade.id);
    setFormData({
      grade_level: grade.grade_level,
      grade_level_id: grade.grade_level_id || '',
      grade_name: grade.grade_name || '',
      school_id: grade.school_id || user?.school_id || ''
    });
    setShowModal(true);
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const ok = await requestConfirm({ title: 'Delete Grade', message: `Do you want to delete "${name}"?`, variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/grades/${id}`);
      toast.success('Deleted');
      fetchGrades();
    } catch (error: any) {
      toast.error('Cannot delete: students exist');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      grade_level: '',
      grade_level_id: '',
      grade_name: '',
      school_id: isPlatformWide ? filterSchoolId : (user?.school_id && user?.school_id !== 'All' ? user.school_id : '')
    });
  };

  // Narrows the standardized 1st-12th master list down to the given school's
  // configured From Grade-To Grade range. No schoolId => full unfiltered list.
  const levelsForSchool = (schoolId: string): GradeLevelOption[] => {
    if (!schoolId) return masterLevels;
    const school = schools.find((s: any) => s.id === schoolId);
    if (!school) return masterLevels;
    const fromGrade = school.from_grade !== undefined && school.from_grade !== null ? school.from_grade : -1;
    const toGrade = school.to_grade !== undefined && school.to_grade !== null ? school.to_grade : 10;
    return masterLevels.filter(o => o.levelNumber >= fromGrade && o.levelNumber <= toGrade);
  };

  const filteredGrades = grades.filter(g =>
    g.grade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.grade_level?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredGrades.length / itemsPerPage);
  const paginatedGrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGrades, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header section with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Grade configuration</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            {grades.length} Active Grade Sub-divisions
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          <ExportButton
            endpoint="/grades/export"
            fallbackFileName="grades-export.xlsx"
            label="Export to Excel"
          />
          {(user?.utype === 'admin' || user?.utype === 'principal' || user?.utype === 'staff') && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Grade
            </button>
          )}
        </div>
      </div>

      {/* Counters / Stats Row */}
      {(() => {
        const gradeStats: StatItem[] = [
          { title: 'Total Grades', value: grades.length, icon: <GraduationCap className="w-6 h-6" />, color: 'indigo', subtitle: 'All academic grades' },
          { title: 'Active Grades', value: grades.filter(g => g.is_active).length, icon: <Check className="w-6 h-6" />, color: 'emerald', subtitle: 'Currently active' },
          { title: 'Inactive', value: grades.filter(g => !g.is_active).length, icon: <X className="w-6 h-6" />, color: 'rose', subtitle: 'Disabled or archived' },
          { title: 'Campuses', value: Array.from(new Set(grades.map(g => g.school_id))).filter(Boolean).length, icon: <School className="w-6 h-6" />, color: 'amber', subtitle: 'Schools offering grades' },
          // { title: 'Unique Levels', value: Array.from(new Set(grades.map(g => g.grade_level))).length, icon: <Users className="w-6 h-6" />, color: 'violet' },
        ];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatGrid stats={gradeStats} />
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL: Grades List Selection */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[680px]">
          {/* Search Bar container — search box and school filter share one row */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search grades..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
              {/* School filter — only shown for accounts not already locked to one school */}
              {isPlatformWide && (
                <div className="relative flex-1">
                  <select
                    value={filterSchoolId}
                    onChange={(e) => setFilterSchoolId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-semibold appearance-none cursor-pointer"
                  >
                    <option value="">Select School</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* List scroll container */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 min-h-[350px]">
            {paginatedGrades.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                {!effectiveSchoolId ? 'Select a school to view its grades.' : 'No grades found.'}
              </div>
            ) : (
              paginatedGrades.map((grade) => {
                const isSelected = selectedGrade?.id === grade.id;
                return (
                  <div
                    key={grade.id}
                    onClick={() => setSelectedGrade(grade)}
                    className={`relative px-4 py-3.5 cursor-pointer flex items-center gap-3.5 transition-all duration-200 border-l-[3px] group ${isSelected
                        ? 'bg-indigo-50/70 border-l-indigo-500'
                        : 'border-l-transparent hover:bg-slate-50 hover:border-l-slate-300'
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 tracking-tight truncate">
                        {grade.grade_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        Level: {grade.grade_level}{grade.school_name && ` | ${grade.school_name}`}
                      </div>
                      {(() => {
                        const gradeSections = sections.filter(s => s.grade_id === grade.id);
                        if (gradeSections.length === 0) return null;
                        return (
                          <div className="text-[9px] text-indigo-500 font-bold mt-0.5 truncate flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5 flex-shrink-0" />
                            <span>Divisions: {gradeSections.map(s => s.section_code).join(', ')}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge active={grade.is_active} />
                      {isSelected && (
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-500 animate-in fade-in slide-in-from-left-2 duration-300" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={itemsPerPage}
              totalItems={filteredGrades.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Grade detail view */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {selectedGrade ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">

              {/* Grade Detail Card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Color band */}
                <div className={`h-1.5 w-full ${selectedGrade.is_active
                  ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400'
                  : 'bg-gradient-to-r from-rose-400 to-rose-300'}`}
                />
                <div className="p-5 space-y-5">
                  {/* Identity row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-lg font-black flex-shrink-0">
                        G{selectedGrade.grade_level}
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">{selectedGrade.grade_name}</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Grade Level {selectedGrade.grade_level}</p>
                        <div className="mt-1.5">
                          <StatusBadge active={selectedGrade.is_active} size="md" />
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-start flex-wrap flex-shrink-0">
                      <button
                        onClick={() => handleEdit(selectedGrade)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
                        title="Edit Grade"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selectedGrade.id, selectedGrade.grade_name)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
                        title="Delete Grade"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Grade Details */}
                  <div>
                    <SectionHeader icon={<GraduationCap className="w-3.5 h-3.5" />} title="Grade Details" />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Grade Name" value={selectedGrade.grade_name} />
                      <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Grade Level" value={selectedGrade.grade_level} />
                      <InfoRow icon={<School className="w-4 h-4" />} label="Campus / Institution" value={selectedGrade.school_name} className="col-span-2" />
                    </div>
                  </div>

                  {/* Grade Sections */}
                  <div>
                    <SectionHeader icon={<Layers className="w-3.5 h-3.5" />} title="Grade Divisions" />
                    {(() => {
                      const gradeSections = sections.filter(s => s.grade_id === selectedGrade.id);
                      if (gradeSections.length === 0) {
                        return <p className="text-xs text-slate-400 italic">No divisions configured for this grade.</p>;
                      }
                      return (
                        <div className="flex flex-wrap gap-2">
                          {gradeSections.map(s => (
                            <div
                              key={s.id}
                              className={`px-3 py-1.5 rounded-xl border text-center flex items-center gap-2 text-xs font-semibold
                                ${s.is_active ? 'bg-indigo-50/70 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                            >
                              <span className="font-black text-sm">{s.section_code}</span>
                              {s.section_name && <span className="opacity-75">({s.section_name})</span>}
                              <span className="px-1.5 py-0.5 rounded bg-white text-[10px] text-indigo-600 font-bold border border-indigo-50/50">
                                {s.student_count} students
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Status tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-xl p-4 border text-center ${selectedGrade.is_active ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      <div className={`text-lg font-black ${selectedGrade.is_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {selectedGrade.is_active ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Grade Status</div>
                    </div>
                    <div className="rounded-xl p-4 border bg-indigo-50 border-indigo-100 text-center">
                      <div className="text-lg font-black text-indigo-700">Level {selectedGrade.grade_level}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Academic Level</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">No grade selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a grade from the list to view its details.</p>
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[10px] w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in slide-in-from-bottom-8 duration-300">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">{editingId ? 'Edit Grade' : 'Add New Grade'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-100 hover:bg-rose-50 hover:text-rose-500 text-gray-400 transition-all"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Grade Level</label>
                <GradeLevelSelect
                  value={formData.grade_level_id}
                  onChange={(val, selected) => {
                    setFormData(prev => ({
                      ...prev,
                      grade_level_id: val,
                      grade_level: selected ? String(selected.levelNumber) : '',
                      grade_name: !prev.grade_name || prev.grade_name.trim() === '' || prev.grade_name.startsWith('Grade ') || prev.grade_name === 'Boot Camp' || prev.grade_name === 'Foundation Course' || prev.grade_name === 'Boot camp' || prev.grade_name === 'foundation course'
                        ? (selected ? selected.name : '')
                        : prev.grade_name
                    }));
                  }}
                  source="master"
                  valueAs="id"
                  required
                  placeholder="Select Level"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Grade Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 5"
                  value={formData.grade_name}
                  onChange={e => setFormData({ ...formData, grade_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
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
                  <span>Save Grade</span>
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

export default Grades;
