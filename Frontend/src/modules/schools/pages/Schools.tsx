import { useState, useEffect, useMemo } from 'react';

import { useLocation } from 'react-router-dom';
import {
  Check, Edit, Hash, Plus, School, Search, Trash2, X,
  Phone, Mail, MapPin, User, ShieldCheck, ChevronRight,
  GraduationCap, Activity, AlertCircle, BookOpen, UserCheck, Users,
  TrendingUp, BarChart3, PieChart, BookOpenCheck, Clock, CheckCircle2, Circle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { useConfirm } from '@/hooks/useConfirm';
import { trimAndCollapseSpaces } from '@/utils/validation';
import MobileNumberInput from '@/components/MobileNumberInput';
import FieldError from '@/components/FieldError';
import { parseApiErrors } from '@/utils/errorParser';
import GradeLevelSelect, { invalidateGradeLevelCaches } from '@/components/GradeLevelSelect';
import ExportButton from '@/components/export/ExportButton';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import LocationPickerMap from '@/components/LocationPickerMap';
import PasswordPolicyTracker, { isPasswordValid } from '@/components/PasswordPolicyTracker';

interface SchoolData {
  id: string;
  school_code: string;
  name: string;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  logo_url?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  is_active: boolean;
  from_grade?: number | null;
  to_grade?: number | null;
  from_grade_name?: string | null;
  to_grade_name?: string | null;
  has_valid_grade_range?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({ active, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border
    ${size === 'md' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'}
    ${active
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25'
      : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/25'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ─── School avatar ────────────────────────────────────────────────────────────

const SchoolAvatar: React.FC<{ logoUrl?: string | null; name: string; size?: 'sm' | 'lg' } & { isSelected?: boolean }> = ({
  logoUrl, name, size = 'sm', isSelected = false,
}) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  const base = size === 'lg' ? 'w-16 h-16 rounded-2xl text-xl' : 'w-10 h-10 rounded-xl text-xs';

  return (
    <div className={`${base} flex items-center justify-center font-black flex-shrink-0 overflow-hidden shadow-xs border transition-all ${
      isSelected || size === 'lg'
        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
        : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-400/25'
    }`}>
      {logoUrl
        ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
        : initials || <School className={size === 'lg' ? 'w-7 h-7' : 'w-4 h-4'} />
      }
    </div>
  );
};

// ─── Info row helper ──────────────────────────────────────────────────────────

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({
  icon, label, value,
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
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

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#283548] mb-4">
    <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <h3 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">{title}</h3>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Schools: React.FC = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const location = useLocation();

  // Selected school stats (Requirement 1)
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [assignedTeachers, setAssignedTeachers] = useState<{ id: string; name: string; isPrimary: boolean }[]>([]);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  // Selected school teacher syllabus completion state
  const [selectedSyllabusTeacherId, setSelectedSyllabusTeacherId] = useState<string>('');
  const [teacherSyllabusData, setTeacherSyllabusData] = useState<any>(null);
  const [teacherSyllabusLoading, setTeacherSyllabusLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedSchool?.id) {
      setTeacherSyllabusData(null);
      setSelectedSyllabusTeacherId('');
      return;
    }

    let isMounted = true;
    setTeacherSyllabusLoading(true);

    const params: Record<string, any> = {};
    if (selectedSyllabusTeacherId) params.teacherId = selectedSyllabusTeacherId;

    api.get('/teacher/learning-path/syllabus-completion', { params })
      .then(res => {
        if (!isMounted) return;
        const data = res.data?.data || res.data;
        setTeacherSyllabusData(data);
      })
      .catch(() => {
        if (isMounted) setTeacherSyllabusData(null);
      })
      .finally(() => {
        if (isMounted) setTeacherSyllabusLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedSchool?.id, selectedSyllabusTeacherId]);

  useEffect(() => {
    if (!selectedSchool?.id) {
      setStudentCount(null);
      setAssignedTeachers([]);
      return;
    }

    let isMounted = true;
    setStatsLoading(true);

    Promise.all([
      api.get('/students', { params: { schoolId: selectedSchool.id, pageSize: 1 } }).catch(() => null),
      api.get('/teacher-schools/paged', { params: { schoolId: selectedSchool.id, pageSize: 100 } }).catch(() => null)
    ]).then(([studRes, teachRes]) => {
      if (!isMounted) return;

      if (studRes?.data) {
        const count = studRes.data.total_count ?? studRes.data.totalCount ?? (Array.isArray(studRes.data) ? studRes.data.length : 0);
        setStudentCount(count);
      } else {
        setStudentCount(0);
      }

      if (teachRes?.data) {
        const rawItems = teachRes.data.items || (Array.isArray(teachRes.data) ? teachRes.data : []);
        const mapped = rawItems.map((t: any) => ({
          id: t.teacherId || t.teacher_id || t.id,
          name: t.teacherName || t.teacher_name || t.fullName || t.name || 'Faculty Member',
          isPrimary: Boolean(t.isPrimary ?? t.is_primary)
        }));
        setAssignedTeachers(mapped);
      } else {
        setAssignedTeachers([]);
      }
    }).finally(() => {
      if (isMounted) setStatsLoading(false);
    });

    return () => { isMounted = false; };
  }, [selectedSchool?.id]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const [formData, setFormData] = useState({
    school_code: '',
    name: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    logo_url: '',
    principal_name: '',
    principal_email: '',
    principal_phone: '',
    principal_password: '',
    is_active: true,
    from_grade: '',
    to_grade: '',
    latitude: '',
    longitude: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) =>
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  useEffect(() => { fetchSchools(); }, []);

  useEffect(() => {
    if (location.pathname.includes('/create') || location.search.includes('create=true')) {
      resetForm();
      setShowModal(true);
    }
  }, [location]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    if (showModal) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
      if (response.data.length > 0) {
        setSelectedSchool(response.data[0]);
      } else {
        setSelectedSchool(null);
      }
    } catch (error) {
      console.error('Failed to fetch schools', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const ok = await requestConfirm({
      title: 'Remove School',
      message: `Are you sure you want to remove "${name}"? This cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/schools/${id}`);
      toast.success(`School "${name}" removed successfully`);
      fetchSchools();
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const handleEdit = (school: SchoolData) => {
    setEditingId(school.id);
    setPasswordTouched(false);
    setFormData({
      school_code: school.school_code,
      name: school.name,
      address: school.address || '',
      contact_phone: school.contact_phone || '',
      contact_email: school.contact_email || '',
      logo_url: school.logo_url || '',
      principal_name: school.principal_name || '',
      principal_email: school.principal_email || '',
      principal_phone: school.principal_phone || '',
      principal_password: '',
      is_active: school.is_active,
      from_grade: school.from_grade != null ? String(school.from_grade) : '',
      to_grade: school.to_grade != null ? String(school.to_grade) : '',
      latitude: school.latitude != null ? String(school.latitude) : '',
      longitude: school.longitude != null ? String(school.longitude) : '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const fromNum = formData.from_grade !== '' && formData.from_grade !== null ? parseInt(formData.from_grade, 10) : null;
    const toNum = formData.to_grade !== '' && formData.to_grade !== null ? parseInt(formData.to_grade, 10) : null;

    if (fromNum === null || toNum === null) {
      setFormErrors(prev => ({ ...prev, from_grade: 'Please select both From and To Grade.' }));
      return;
    }
    if (fromNum > toNum) {
      setFormErrors(prev => ({ ...prev, from_grade: 'From Grade cannot be greater than To Grade.' }));
      return;
    }

    const latNum = formData.latitude.trim() !== '' ? parseFloat(formData.latitude) : null;
    const lngNum = formData.longitude.trim() !== '' ? parseFloat(formData.longitude) : null;

    if (!editingId || formData.principal_password) {
      if (!isPasswordValid(formData.principal_password)) {
        setPasswordTouched(true);
        setFormErrors(prev => ({ ...prev, principal_password: 'Password does not meet validation requirements.' }));
        return;
      }
    }

    const payload = { ...formData, from_grade: fromNum, to_grade: toNum, latitude: latNum, longitude: lngNum };

    try {
      if (editingId) {
        await api.put(`/schools/${editingId}`, payload);
        toast.success('School updated successfully!');
      } else {
        await api.post('/schools', payload);
        toast.success('School registered successfully!');
      }
      invalidateGradeLevelCaches();
      setShowModal(false);
      resetForm();
      fetchSchools();
    } catch (error: any) {
      console.error('Save failed', error);
      const errorsMap = parseApiErrors(error);
      setFormErrors(errorsMap);
      if (errorsMap._form) {
        toast.error(errorsMap._form);
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPasswordTouched(false);
    setFormData({
      school_code: '',
      name: '',
      address: '',
      contact_phone: '',
      contact_email: '',
      logo_url: '',
      principal_name: '',
      principal_email: '',
      principal_phone: '',
      principal_password: '',
      is_active: true,
      from_grade: '',
      to_grade: '',
      latitude: '',
      longitude: '',
    });
    setFormErrors({});
  };

  const filteredSchools = useMemo(() => schools.filter(school =>
    school.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.school_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.principal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.principal_email?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [schools, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / itemsPerPage));
  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchools.slice(start, start + itemsPerPage);
  }, [filteredSchools, currentPage, itemsPerPage]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const activeCount = schools.filter(s => s.is_active).length;
  const inactiveCount = schools.filter(s => !s.is_active).length;
  const withPrincipal = schools.filter(s => s.principal_name).length;
  const gradeConfigured = schools.filter(s => s.has_valid_grade_range).length;

  const stats: StatItem[] = [
    {
      title: 'Total Schools',
      value: schools.length,
      icon: <School />,
      color: 'indigo',
      subtitle: 'Registered campuses',
    },
    {
      title: 'Active Schools',
      value: activeCount,
      icon: <Activity />,
      color: 'emerald',
      subtitle: 'Currently operational',
    },
    {
      title: 'Inactive Schools',
      value: inactiveCount,
      icon: <AlertCircle />,
      color: 'rose',
      subtitle: 'Suspended or pending',
    },

    {
      title: 'Grade Configured',
      value: gradeConfigured,
      icon: <BookOpen />,
      color: 'amber',
      subtitle: 'Valid grade range set',
    },

  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">School Directory</h1>
          <p className="text-xs text-slate-400 dark:text-[#64748b] font-semibold uppercase tracking-widest mt-1">
            {schools.length} {schools.length === 1 ? 'Campus' : 'Campuses'} Registered
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <ExportButton
            endpoint="/schools/export"
            fallbackFileName="schools-export.xlsx"
            label="Export to Excel"
          />
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
              text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest
              transition-all shadow-sm hover:shadow-indigo-200 hover:shadow-md focus:outline-none
              focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add School
          </button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        <StatGrid stats={stats} loading={isLoading} />
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-16 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-200 dark:border-indigo-400/25 border-t-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-widest mt-4">
            Loading School Registry…
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT PANEL: School List ────────────────────────────────────── */}
          <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden
            shadow-sm flex flex-col max-h-[680px]"
          >
            {/* Search */}
            <div className="p-4 border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by name, code, principal…"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm
                    outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                    transition-all font-medium text-slate-700 dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-[#64748b] shadow-xs"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 min-h-[350px] divide-y divide-slate-100 dark:divide-[#283548]">
              {paginatedSchools.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#283548] flex items-center justify-center">
                    <School className="w-6 h-6 text-slate-400 dark:text-[#64748b]" />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-widest text-center">
                    {searchTerm ? 'No schools match your search' : 'No schools registered yet'}
                  </p>
                </div>
              ) : (
                paginatedSchools.map(school => {
                  const isSelected = selectedSchool?.id === school.id;
                  return (
                    <div
                      key={school.id}
                      onClick={() => setSelectedSchool(school)}
                      className={`relative px-4 py-3.5 cursor-pointer flex items-center gap-3.5 transition-all duration-200 border-l-4 group ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-500/15 border-l-indigo-600 dark:border-l-indigo-400 shadow-xs'
                          : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-l-slate-300'
                      }`}
                    >
                      <SchoolAvatar logoUrl={school.logo_url} name={school.name} size="sm" isSelected={isSelected} />

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${
                          isSelected ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-800 dark:text-white'
                        }`}>
                          {school.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-semibold truncate mt-0.5">
                          {school.school_code}
                          {school.principal_name && (
                            <> · <span className="text-slate-500 dark:text-[#94a3b8]">{school.principal_name}</span></>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge active={school.is_active} />
                        <ChevronRight className={`w-4 h-4 transition-all duration-200 ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-300 dark:text-[#475569]'
                        }`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 dark:border-[#283548] bg-slate-50/40 dark:bg-[#283548]/40">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={itemsPerPage}
                totalItems={filteredSchools.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
              />
            </div>
          </div>

          {/* ── RIGHT PANEL: Details ───────────────────────────────────────── */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {selectedSchool ? (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">

                {/* Card 1: School Identity */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
                  <div className="p-5 space-y-5">
                    {/* School name + actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <SchoolAvatar logoUrl={selectedSchool.logo_url} name={selectedSchool.name} size="lg" isSelected />
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                              {selectedSchool.name}
                            </h2>
                            <StatusBadge active={selectedSchool.is_active} size="md" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-[#64748b] font-semibold mt-1 flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5" />
                            {selectedSchool.school_code}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start flex-shrink-0">
                        <button
                          onClick={() => handleEdit(selectedSchool)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedSchool.id, selectedSchool.name)}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Grade Range */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                      ${selectedSchool.has_valid_grade_range
                        ? 'bg-indigo-50/60 dark:bg-indigo-500/15 border-indigo-200/60 dark:border-indigo-400/25'
                        : 'bg-amber-50/60 dark:bg-amber-500/15 border-amber-200/60 dark:border-amber-400/25'
                      }`}
                    >
                      <GraduationCap className={`w-4 h-4 flex-shrink-0 ${selectedSchool.has_valid_grade_range ? 'text-indigo-500 dark:text-indigo-300' : 'text-amber-500 dark:text-amber-300'
                        }`} />
                      {selectedSchool.has_valid_grade_range ? (
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-[#e2e8f0]">
                            {selectedSchool.from_grade === selectedSchool.to_grade
                              ? selectedSchool.from_grade_name
                              : `${selectedSchool.from_grade_name} — ${selectedSchool.to_grade_name}`}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-[#64748b] font-medium mt-0.5">
                            {selectedSchool.from_grade === selectedSchool.to_grade
                              ? `Grade ${selectedSchool.from_grade} configured (Single Level)`
                              : `Grades ${selectedSchool.from_grade}–${selectedSchool.to_grade} configured`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">No grade range configured</p>
                      )}
                    </div>

                    {/* Contact info */}
                    <div>
                      <SectionHeader icon={<Phone className="w-3.5 h-3.5" />} title="Contact & Address" />
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={selectedSchool.contact_email} />
                        <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={selectedSchool.contact_phone} />
                        {selectedSchool.address && (
                          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={selectedSchool.address} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Principal Profile */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-5">
                  <SectionHeader icon={<User className="w-3.5 h-3.5" />} title="Principal Profile" />

                  {selectedSchool.principal_name ? (
                    <div className="space-y-4">
                      {/* Avatar row */}
                      <div className="flex items-center gap-3.5 p-4 bg-gradient-to-r from-indigo-50/60 to-slate-50/60 dark:from-indigo-500/15 dark:to-[#283548]/60
                        rounded-xl border border-indigo-100/60 dark:border-indigo-400/25"
                      >
                        <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border-2 border-indigo-200 dark:border-indigo-400/30
                          flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black text-sm uppercase flex-shrink-0"
                        >
                          {selectedSchool.principal_name.trim()[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                            {selectedSchool.principal_name}
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-[#64748b] font-medium">Head Administrator</p>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow
                          icon={<Mail className="w-4 h-4" />}
                          label="Principal Email"
                          value={selectedSchool.principal_email}
                        />
                        <InfoRow
                          icon={<Phone className="w-4 h-4" />}
                          label="Principal Phone"
                          value={selectedSchool.principal_phone}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-2
                      bg-slate-50/60 dark:bg-[#283548]/60 rounded-xl border border-slate-100 dark:border-[#334155]"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#283548] flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400 dark:text-[#64748b]" />
                      </div>
                      <p className="text-xs text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-widest">
                        No Principal Assigned
                      </p>
                    </div>
                  )}
                </div>

                {/* Card 3: School Enrollment & Faculty Summary (Requirement 1) */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-5 space-y-4">
                  <SectionHeader icon={<Users className="w-3.5 h-3.5" />} title="School Enrollment & Faculty" />

                  <div className="grid grid-cols-2 gap-4">
                    {/* Students Count */}
                    <div className="flex items-center gap-3.5 p-4 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-400/20">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Total Students</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white leading-none mt-1">
                          {statsLoading ? '...' : (studentCount ?? 0)}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Teachers Count */}
                    <div className="flex items-center gap-3.5 p-4 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-400/20">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Assigned Teachers</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white leading-none mt-1">
                          {statsLoading ? '...' : assignedTeachers.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Teachers List Pills */}
                  {assignedTeachers.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-2">
                        Assigned Faculty List ({assignedTeachers.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {assignedTeachers.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-[#283548] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            {t.name}
                            {t.isPrimary && (
                              <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold ml-1">
                                Primary
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : !statsLoading && (
                    <p className="text-xs font-semibold text-slate-400 dark:text-[#64748b]">
                      No teachers assigned to this school yet.
                    </p>
                  )}
                </div>

                {/* Card 4: Teacher Syllabus Completion Analytics (with Line and Bar Charts by Teacher) */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#283548]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">
                        Faculty Syllabus Completion
                      </h3>
                    </div>

                    {/* Teacher Selector Filter */}
                    <select
                      value={selectedSyllabusTeacherId}
                      onChange={e => setSelectedSyllabusTeacherId(e.target.value)}
                      className="bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">All Faculty Overview</option>
                      {assignedTeachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {teacherSyllabusLoading ? (
                    <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading syllabus metrics...</div>
                  ) : teacherSyllabusData ? (
                    <div className="space-y-4">
                      {/* Stat summary grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-400/20 rounded-xl p-3 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748b]">Overall Completion</p>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-300 mt-0.5">
                            {Math.round(teacherSyllabusData.overallCompletionPercentage || teacherSyllabusData.overall_completion_percentage || 0)}%
                          </p>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-400/20 rounded-xl p-3 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748b]">Done Topics</p>
                          <p className="text-base font-black text-emerald-600 dark:text-emerald-300 mt-0.5">
                            {teacherSyllabusData.completedTopics ?? teacherSyllabusData.completed_topics ?? 0}
                          </p>
                        </div>
                        <div className="bg-rose-50/50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-400/20 rounded-xl p-3 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748b]">Remaining</p>
                          <p className="text-base font-black text-rose-600 dark:text-rose-300 mt-0.5">
                            {teacherSyllabusData.remainingTopics ?? teacherSyllabusData.remaining_topics ?? 0}
                          </p>
                        </div>
                      </div>

                      {/* Visual Line / Area Graph */}
                      <div className="bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                            Syllabus Completion Trajectory
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {Math.round(teacherSyllabusData.overallCompletionPercentage || teacherSyllabusData.overall_completion_percentage || 0)}% Achieved
                          </span>
                        </div>

                        {/* Interactive SVG Progress Line Graph */}
                        <div className="relative w-full h-20 pt-2">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 0 50 Q 75 40, 150 25 T 300 10 L 300 60 L 0 60 Z"
                              fill="url(#lineGrad)"
                            />
                            <path
                              d="M 0 50 Q 75 40, 150 25 T 300 10"
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <circle cx="75" cy="40" r="4" fill="#6366f1" className="animate-pulse" />
                            <circle cx="150" cy="25" r="4" fill="#6366f1" className="animate-pulse" />
                            <circle cx="300" cy="10" r="5" fill="#4f46e5" />
                          </svg>
                        </div>
                      </div>

                      {/* Grade & Subject Progress Bars by Teacher */}
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider">
                          Grade & Subject Breakdown
                        </p>

                        {((teacherSyllabusData.gradeBreakdown || teacherSyllabusData.grade_breakdown || []) as any[]).length > 0 ? (
                          ((teacherSyllabusData.gradeBreakdown || teacherSyllabusData.grade_breakdown || []) as any[]).map((g: any, idx: number) => {
                            const pct = Math.min(100, Math.max(0, Math.round(g.completionPercentage ?? g.completion_percentage ?? 0)));
                            return (
                              <div key={idx} className="bg-white dark:bg-[#283548] border border-slate-100 dark:border-[#334155] rounded-xl p-3 space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                                  <span className="flex items-center gap-1.5">
                                    <BookOpenCheck className="w-3.5 h-3.5 text-indigo-500" />
                                    {g.gradeName || g.grade_name || `Grade ${idx + 1}`}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-300">
                                    {pct}% ({g.completedTopics ?? g.completed_topics ?? 0}/{g.totalTopics ?? g.total_topics ?? 0} Topics)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 bg-slate-50 dark:bg-[#283548] rounded-xl text-xs font-semibold text-slate-400 text-center">
                            No grade breakdown metrics available.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400">No syllabus metrics found for this selection.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]
                bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#283548] flex items-center justify-center">
                  <School className="w-8 h-8 text-slate-300 dark:text-[#475569]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-500 dark:text-[#94a3b8]">Select a School</p>
                  <p className="text-xs text-slate-400 dark:text-[#64748b] font-medium mt-1">
                    Choose a campus from the list to view its details
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <form onSubmit={handleSaveSchool} className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-5xl shadow-2xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 md:px-8 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#1e293b]">
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingId ? 'Edit School' : 'Register New School'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-[#64748b] font-medium mt-0.5">
                  {editingId ? 'Update campus information below' : 'Fill in the details to add a new campus'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 dark:hover:text-rose-300 text-slate-400 dark:text-[#64748b] transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 md:px-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {formErrors._form && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formErrors._form}</span>
                </div>
              )}

              {/* Basic Info */}
              <div>
                <p className="text-[11px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <School className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" /> School Information
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      School Code <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.school_code}
                        onChange={e => setFormData({ ...formData, school_code: e.target.value })}
                        onBlur={e => setFormData({ ...formData, school_code: trimAndCollapseSpaces(e.target.value) })}
                        placeholder="e.g. SCH-001"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl
                          focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                          outline-none font-semibold text-sm text-slate-800 placeholder:text-slate-400 shadow-xs"
                      />
                    </div>
                    <FieldError message={formErrors.school_code} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      School Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      onBlur={e => setFormData({ ...formData, name: trimAndCollapseSpaces(e.target.value) })}
                      placeholder="Enter full school name"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                        outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 shadow-xs"
                    />
                    <FieldError message={formErrors.name} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <select
                      value={formData.is_active ? 'active' : 'inactive'}
                      onChange={e => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                        outline-none text-sm font-bold text-slate-800 shadow-xs"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive / Hold</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  onBlur={e => setFormData({ ...formData, address: trimAndCollapseSpaces(e.target.value) })}
                  placeholder="Enter campus address"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                    focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                    outline-none h-20 resize-none text-sm font-medium text-slate-700
                    placeholder:text-slate-400 shadow-xs"
                />
                <FieldError message={formErrors.address} />
              </div>

              {/* Geolocation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Geolocation
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600
                      hover:bg-indigo-100 text-[11px] font-bold transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Pick on Map
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="Latitude"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                        outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="Longitude"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                        outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="school@example.com"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                      focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                      outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-xs"
                  />
                  <FieldError message={formErrors.contact_email} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Phone</label>
                  <MobileNumberInput
                    label="Contact Phone"
                    value={formData.contact_phone}
                    onChange={digits => setFormData({ ...formData, contact_phone: digits })}
                    error={formErrors.contact_phone}
                  />
                </div>
              </div>

              {/* Grade Range */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Standardized Grade Range
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mb-4 ml-6">
                  Select the grade range this campus supports (e.g. 1–10, 6–10). This controls
                  which grades appear in all dropdowns, filters, and reports for this school.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      From Grade <span className="text-rose-500">*</span>
                    </label>
                    <GradeLevelSelect
                      source="master"
                      value={formData.from_grade}
                      onChange={levelNumber => setFormData({ ...formData, from_grade: levelNumber })}
                      placeholder="Select starting grade"
                      required
                    />
                    <FieldError message={formErrors.from_grade} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      To Grade <span className="text-rose-500">*</span>
                    </label>
                    <GradeLevelSelect
                      source="master"
                      value={formData.to_grade}
                      onChange={levelNumber => setFormData({ ...formData, to_grade: levelNumber })}
                      placeholder="Select ending grade"
                      required
                    />
                    <FieldError message={formErrors.to_grade} />
                  </div>
                </div>
                {formData.from_grade !== '' && formData.to_grade !== '' &&
                  parseInt(formData.from_grade, 10) > parseInt(formData.to_grade, 10) && (
                    <p className="text-[11px] text-rose-600 font-bold mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      From Grade must not be greater than To Grade.
                    </p>
                  )}
              </div>

              {/* Principal Info */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Principal Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Principal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.principal_name}
                      onChange={e => setFormData({ ...formData, principal_name: e.target.value })}
                      onBlur={e => setFormData({ ...formData, principal_name: trimAndCollapseSpaces(e.target.value) })}
                      placeholder="Full name"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                        outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 shadow-xs"
                    />
                    <FieldError message={formErrors.principal_name} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Principal Phone</label>
                    <MobileNumberInput
                      label="Principal Phone"
                      value={formData.principal_phone}
                      onChange={digits => setFormData({ ...formData, principal_phone: digits })}
                      error={formErrors.principal_phone}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Principal Email / Login ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.principal_email}
                      onChange={e => setFormData({ ...formData, principal_email: e.target.value })}
                      placeholder="principal@example.com"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                        outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-xs"
                    />
                    <FieldError message={formErrors.principal_email} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      {editingId ? 'Change Password (leave blank to keep)' : 'Login Password'}
                      {!editingId && <span className="text-rose-500"> *</span>}
                    </label>
                    <input
                      type="password"
                      required={!editingId}
                      value={formData.principal_password}
                      onChange={e => setFormData({ ...formData, principal_password: e.target.value })}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                        focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all
                        outline-none text-sm font-medium placeholder:text-slate-400 shadow-xs"
                    />
                    <FieldError message={formErrors.principal_password} />
                    <PasswordPolicyTracker value={formData.principal_password} touched={passwordTouched} />
                  </div>
                </div>
              </div>

            </div>

            {/* Form Actions */}
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
                <span>{editingId ? 'Update School' : 'Register School'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Location Picker Modal ─────────────────────────────────────────────── */}
      <LocationPickerMap
        isOpen={showMapPicker}
        initialLat={formData.latitude ? parseFloat(formData.latitude) : null}
        initialLng={formData.longitude ? parseFloat(formData.longitude) : null}
        onClose={() => setShowMapPicker(false)}
        onSelect={(lat, lng) => {
          setFormData(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
          setShowMapPicker(false);
        }}
      />

      {/* ── Confirm Modal ──────────────────────────────────────────────────────── */}
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

export default Schools;
