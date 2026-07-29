import { useState, useEffect, useMemo } from 'react';
import { Award, Briefcase, Check, ChevronDown, Edit, Eye, EyeOff, GraduationCap, Key, Lock, Mail, Plus, Search, Star, Trash2, X, School, User, BookOpen, Users, ChevronRight, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { parseApiErrors } from '@/utils/errorParser';
import MobileNumberInput from '@/components/MobileNumberInput';
import ConfirmModal from '@/components/ConfirmModal';
import FieldError from '@/components/FieldError';
import PasswordPolicyTracker, { isPasswordValid } from '@/components/PasswordPolicyTracker';
import Pagination from '@/components/Pagination';
import { useConfirm } from '@/hooks/useConfirm';
import ExportButton from '@/components/export/ExportButton';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { DUPLICATE_MESSAGES, isDuplicateValue } from '@/utils/duplicateCheck';
import { isValidEmail } from '@/utils/validation';

// ── Sub-components (Schools.tsx design system) ────────────────────────────────

const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({ active, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border
    ${size === 'md' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'}
    ${active ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/25' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-400/25'}`}
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
    <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <h3 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">{title}</h3>
  </div>
);

interface TeacherSchoolMembership {
  school_id: string;
  school_name: string;
  is_primary: boolean;
  is_active: boolean;
}

interface Teacher {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  employee_id: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  is_active: boolean;
  school_id: string;
  school_name: string;
  /** Requirement 2/3: full multi-school membership list for this Teacher. */
  schools?: TeacherSchoolMembership[];
}

const Teachers: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingTeacher, setResettingTeacher] = useState<any | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirm_password: '' });
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [showResetPasswordFields, setShowResetPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [resetPasswordTouched, setResetPasswordTouched] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    employee_id: '',
    specialization: '',
    qualification: '',
    school_id: '',
    school_ids: [] as string[],
    is_active: true
  });
  const [schools, setSchools] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [originalEmail, setOriginalEmail] = useState('');

  const clearFieldError = (field: string) =>
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const checkEmailDuplicate = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === originalEmail || !isValidEmail(trimmed)) return;
    if (await isDuplicateValue('email', trimmed)) {
      setFormErrors(prev => ({ ...prev, email: DUPLICATE_MESSAGES.email }));
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setFormData(prev => ({
        ...prev,
        school_id: parsed.school_id || '',
        school_ids: parsed.school_id ? [parsed.school_id] : prev.school_ids,
      }));
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    if (user?.utype === 'admin' || user?.utype === 'staff' || user?.utype === 'principal') {
      fetchSchools();
      fetchSubjects();
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    if (showModal) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const fetchSchools = async () => {
    try {
      const resp = await api.get('/schools');
      setSchools(resp.data);
    } catch (e) {
      console.error(e);
    }
  }

  const fetchSubjects = async () => {
    try {
      const resp = await api.get('/subjects');
      setSubjectsList(resp.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data);
      if (response.data.length > 0) {
        setSelectedTeacher(response.data[0]);
      } else {
        setSelectedTeacher(null);
      }
    } catch (error) {
      console.error('Failed to fetch teachers', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const ok = await requestConfirm({ title: 'Remove Teacher', message: `Are you sure you want to remove "${name}"?`, confirmLabel: 'Remove', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/teachers/${id}`);
      toast.success(`Teacher "${name}" removed successfully`);
      fetchTeachers();
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setPasswordTouched(false);
    setResetPasswordTouched(false);
    const activeMemberships = (teacher.schools || []).filter(s => s.is_active);
    const primaryFromMemberships = activeMemberships.find(s => s.is_primary)?.school_id;
    
    // Find assigned subjects
    const teacherSubjectIds = subjectsList
      .filter(sub => sub.assigned_teacher_ids && sub.assigned_teacher_ids.includes(teacher.id))
      .map(sub => sub.id);
    setSelectedSubjectIds(teacherSubjectIds);

    setFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone || '',
      password: '',
      confirm_password: '',
      employee_id: teacher.employee_id,
      specialization: teacher.specialization || '',
      qualification: teacher.qualification || '',
      school_id: primaryFromMemberships || teacher.school_id || user?.school_id || '',
      school_ids: activeMemberships.length > 0
        ? activeMemberships.map(s => s.school_id)
        : (teacher.school_id ? [teacher.school_id] : []),
      is_active: teacher.is_active
    });
    setFormErrors({});
    setOriginalEmail(teacher.email || '');
    setShowModal(true);
  };

  const handleResetPassword = (teacher: any) => {
    setResettingTeacher(teacher);
    setResetPasswordData({ password: '', confirm_password: '' });
    setResetPasswordError('');
    setResetPasswordTouched(false);
    setShowResetModal(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingTeacher) return;
    setResetPasswordError('');
    if (!isPasswordValid(resetPasswordData.password)) {
      setResetPasswordTouched(true);
      setResetPasswordError('Password does not meet validation requirements.');
      return;
    }
    if (resetPasswordData.password !== resetPasswordData.confirm_password) {
      setResetPasswordError('Passwords do not match.');
      return;
    }
    try {
      await api.put(`/teachers/${resettingTeacher.id}/reset-password`, {
        password: resetPasswordData.password
      });
      toast.success(`Password updated for ${resettingTeacher.full_name}`);
      setShowResetModal(false);
    } catch (error: any) {
      setResetPasswordError(error?.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!editingId) {
      if (!isPasswordValid(formData.password)) {
        setPasswordTouched(true);
        setFormErrors(prev => ({ ...prev, password: 'Password does not meet validation requirements.' }));
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setFormErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match.' }));
        return;
      }
    }
    if (formErrors.email) return;

    const canMultiSelect = user?.utype === 'admin' || user?.utype === 'staff' || user?.utype === 'principal';

    let schoolIds = canMultiSelect
      ? Array.from(new Set(formData.school_ids.filter(Boolean)))
      : (user?.school_id ? [user.school_id] : []);

    const primarySchoolId = canMultiSelect ? (formData.school_id || schoolIds[0] || '') : (user?.school_id || '');
    if (primarySchoolId && !schoolIds.includes(primarySchoolId)) {
      schoolIds = [...schoolIds, primarySchoolId];
    }

    if (canMultiSelect && schoolIds.length === 0) {
      // Inline "Select at least one School." message under the picker already
      // covers this — no toast needed.
      return;
    }

    const finalData: Record<string, unknown> = {
      ...formData,
      school_id: primarySchoolId || null,
      school_ids: schoolIds,
    };

    try {
      let teacherId = editingId;
      if (editingId) {
        await api.put(`/teachers/${editingId}`, finalData);
      } else {
        const res = await api.post('/teachers', finalData);
        teacherId = res.data?.id;
      }

      // Save subject assignments
      if (teacherId) {
        const promises = subjectsList.map(async (subject) => {
          const isCurrentlyAssigned = subject.assigned_teacher_ids && subject.assigned_teacher_ids.includes(teacherId);
          const shouldBeAssigned = selectedSubjectIds.includes(subject.id);

          if (shouldBeAssigned && !isCurrentlyAssigned) {
            const currentIds = subject.assigned_teacher_ids || [];
            const nextIds = [...currentIds, teacherId];
            await api.post(`/subjects/${subject.id}/assign-teachers`, { peopleIds: nextIds });
          } else if (!shouldBeAssigned && isCurrentlyAssigned) {
            const nextIds = (subject.assigned_teacher_ids || []).filter((id: string) => id !== teacherId);
            await api.post(`/subjects/${subject.id}/assign-teachers`, { peopleIds: nextIds });
          }
        });
        await Promise.all(promises);
      }

      if (editingId) {
        toast.success('Teacher profile updated');
      } else {
        toast.success('Teacher added successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchTeachers();
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
    setResetPasswordTouched(false);
    setSelectedSubjectIds([]);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      employee_id: '',
      specialization: '',
      qualification: '',
      school_id: user?.school_id || '',
      school_ids: user?.school_id ? [user.school_id] : [],
      is_active: true
    });
    setFormErrors({});
    setOriginalEmail('');
  };

  const toggleSchoolSelection = (schoolId: string) => {
    setFormData(prev => {
      const isSelected = prev.school_ids.includes(schoolId);
      const nextIds = isSelected
        ? prev.school_ids.filter(id => id !== schoolId)
        : [...prev.school_ids, schoolId];

      // If the current primary was just unchecked, promote the next remaining
      // selection (if any) so the form never submits an orphaned primary id.
      const nextPrimary = (isSelected && prev.school_id === schoolId)
        ? (nextIds[0] || '')
        : prev.school_id;

      return { ...prev, school_ids: nextIds, school_id: nextPrimary };
    });
  };

  const setPrimarySchool = (schoolId: string) => {
    setFormData(prev => ({
      ...prev,
      school_id: schoolId,
      school_ids: prev.school_ids.includes(schoolId) ? prev.school_ids : [...prev.school_ids, schoolId],
    }));
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.specialization && teacher.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / itemsPerPage));
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTeachers.slice(start, start + itemsPerPage);
  }, [filteredTeachers, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header section with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Teacher Management</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            {teachers.length} Faculty Members · Active Departments
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          <ExportButton
            endpoint="/teachers/export"
            fallbackFileName="teachers-export.xlsx"
            label="Export to Excel"
          />
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Teacher
          </button>
        </div>
      </div>

      {/* Counters / Stats Row */}
      {(() => {
        const teacherStats: StatItem[] = [
          { title: 'Total Teachers', value: teachers.length, icon: <GraduationCap className="w-6 h-6" />, color: 'indigo', subtitle: 'All registered faculty' },
          { title: 'Active Faculty', value: teachers.filter(t => t.is_active).length, icon: <Check className="w-6 h-6" />, color: 'emerald', subtitle: 'Currently active' },
          { title: 'Inactive', value: teachers.filter(t => !t.is_active).length, icon: <X className="w-6 h-6" />, color: 'rose', subtitle: 'Disabled or suspended' },
          { title: 'Institutions', value: new Set(teachers.map(t => t.school_id).filter(Boolean)).size, icon: <School className="w-6 h-6" />, color: 'violet', subtitle: 'Schools with assigned teachers' },
        ];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatGrid stats={teacherStats} loading={isLoading} />
          </div>
        );
      })()}

      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="text-slate-500 dark:text-[#94a3b8] mt-3 text-[10px] font-bold uppercase tracking-widest">Loading Faculty Registry…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT PANEL: Teacher list selection */}
          <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col max-h-[680px]">
            {/* Search Bar container */}
            <div className="p-4 border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search teachers by name or specialty..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
            </div>

            {/* List scroll container */}
            <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#283548] flex-1 min-h-[350px]">
              {paginatedTeachers.length === 0 ? (
                <div className="p-10 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest">
                  No teachers found.
                </div>
              ) : (
                paginatedTeachers.map((teacher) => {
                  const isSelected = selectedTeacher?.id === teacher.id;
                  const initials = `${teacher.first_name?.[0] || ''}${teacher.last_name?.[0] || ''}`.toUpperCase();
                  return (
                    <div
                      key={teacher.id}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`relative px-4 py-3.5 cursor-pointer flex items-center gap-3.5 transition-all duration-200 border-l-[3px] group ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-500/15 border-l-indigo-500'
                          : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-l-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-400/25 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-300 text-xs uppercase flex-shrink-0">
                        {initials || <User className="w-4 h-4 text-indigo-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-white tracking-tight truncate">
                          {teacher.full_name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-medium truncate mt-0.5">
                          {teacher.specialization || 'Core Faculty'} · {teacher.employee_id}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge active={teacher.is_active} />
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
                totalItems={filteredTeachers.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
              />
            </div>
          </div>

          {/* RIGHT PANEL: Selection Details and Schedule */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {selectedTeacher ? (
              <div className="space-y-6">
                
                {/* 1. Core Profile Details Card */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300">
                  {/* Color band */}
                  <div className={`h-1.5 w-full ${selectedTeacher.is_active
                    ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400'
                    : 'bg-gradient-to-r from-rose-400 to-rose-300'}`}
                  />
                  <div className="p-5 space-y-5">
                    {/* Identity row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-400/25 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xl font-black uppercase flex-shrink-0">
                          {selectedTeacher.first_name?.[0] || ''}{selectedTeacher.last_name?.[0] || ''}
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-800 dark:text-white tracking-tight leading-tight">{selectedTeacher.full_name}</h2>
                          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-medium mt-0.5">{selectedTeacher.specialization || 'Core Faculty'}</p>
                          <div className="mt-1.5">
                            <StatusBadge active={selectedTeacher.is_active} size="md" />
                          </div>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-start flex-wrap flex-shrink-0">
                        <button
                          onClick={() => handleEdit(selectedTeacher)}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-400/25 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
                          title="Edit Faculty Profile"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleResetPassword(selectedTeacher)}
                          className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-400/25 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" /> Reset
                        </button>
                        <button
                          onClick={() => handleDelete(selectedTeacher.id, selectedTeacher.full_name)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-400/25 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
                          title="Remove Teacher"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div>
                      <SectionHeader icon={<User className="w-3.5 h-3.5" />} title="Profile Details" />
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow icon={<Mail className="w-4 h-4" />} label="Email Address" value={selectedTeacher.email} className="col-span-2" />
                        <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Employee ID" value={selectedTeacher.employee_id} />
                        <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone Number" value={selectedTeacher.phone} />
                        <InfoRow icon={<Award className="w-4 h-4" />} label="Specialization" value={selectedTeacher.specialization} />
                        <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Qualification" value={selectedTeacher.qualification} />
                        <InfoRow icon={<School className="w-4 h-4" />} label="Institution" value={selectedTeacher.school_name} />
                      </div>
                    </div>

                    {/* Requirement 2/3: Multi-School Membership */}
                    {(selectedTeacher.schools?.length || 0) > 1 && (
                      <div>
                        <SectionHeader icon={<School className="w-3.5 h-3.5" />} title="Assigned Schools" />
                        <div className="flex flex-wrap gap-2">
                          {selectedTeacher.schools!.map(s => (
                            <span
                              key={s.school_id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                s.is_active
                                  ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-400/25'
                                  : 'bg-gray-50 dark:bg-[#283548] text-gray-400 dark:text-[#64748b] border-gray-200 dark:border-[#334155] line-through'
                              }`}
                            >
                              {s.is_primary && <Star className="w-3 h-3 fill-amber-500 text-amber-500" />}
                              {s.school_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Account & Access Info */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
                  <div className="p-5">
                    <SectionHeader icon={<Users className="w-3.5 h-3.5" />} title="Account & Access" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#283548] rounded-xl border border-slate-100 dark:border-[#334155]">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Role</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-[#e2e8f0] mt-0.5">Teacher / Faculty Member</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#283548] rounded-xl border border-slate-100 dark:border-[#334155]">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedTeacher.is_active ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300'}`}>
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Account Status</p>
                          <p className={`text-sm font-semibold mt-0.5 ${selectedTeacher.is_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {selectedTeacher.is_active ? 'Active — Full Access' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#283548] flex items-center justify-center mb-4">
                  <GraduationCap className="w-8 h-8 text-slate-300 dark:text-[#475569]" />
                </div>
                <p className="text-sm font-bold text-slate-400 dark:text-[#64748b]">No faculty selected</p>
                <p className="text-xs text-slate-400 dark:text-[#64748b] mt-1">Select a teacher from the list to view their full profile.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ➕ Add/Edit Faculty Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <form onSubmit={handleSaveTeacher} className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-5xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#1e293b]">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{editingId ? 'Edit Teacher' : 'Add Teacher'}</h2>
                <p className="text-xs text-gray-500 dark:text-[#94a3b8] mt-1 font-semibold uppercase tracking-wider">Update teacher details</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {formErrors._form && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formErrors._form}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Enter First Name"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                  />
                  <FieldError message={formErrors.first_name} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Enter Last Name"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                  />
                  <FieldError message={formErrors.last_name} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                      onBlur={e => checkEmailDuplicate(e.target.value)}
                      placeholder="Enter Email Address"
                      className={`w-full pl-11 pr-4 py-3 bg-white border rounded-[4px] focus:ring-4 transition-all outline-none text-sm font-medium shadow-sm ${formErrors.email ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:ring-primary/5 focus:border-primary'}`}
                    />
                  </div>
                  <FieldError message={formErrors.email} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Phone Number</label>
                  <MobileNumberInput
                    label="Phone Number"
                    value={formData.phone}
                    onChange={val => { setFormData({ ...formData, phone: val }); clearFieldError('phone'); }}
                    error={formErrors.phone}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id}
                    onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                    placeholder="Enter Employee ID"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-bold text-primary tracking-tight text-sm shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
                    disabled={!!editingId}
                  />
                  <FieldError message={formErrors.employee_id} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Specialization</label>
                  <div className="relative">
                    <Award className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                      placeholder="Enter Specialization"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium shadow-sm"
                    />
                  </div>
                  <FieldError message={formErrors.specialization} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Qualification</label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="Enter Qualification"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium shadow-sm"
                    />
                  </div>
                  <FieldError message={formErrors.qualification} />
                </div>
              </div>

              {!editingId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        onBlur={() => setPasswordTouched(true)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FieldError message={formErrors.password} />
                    <PasswordPolicyTracker value={formData.password} touched={passwordTouched} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirm_password}
                        onChange={e => { setFormData({ ...formData, confirm_password: e.target.value }); clearFieldError('confirm_password'); }}
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-12 py-3 bg-white border rounded-[4px] focus:ring-4 transition-all outline-none text-sm font-medium shadow-sm ${formErrors.confirm_password ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:ring-primary/5 focus:border-primary'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FieldError message={formErrors.confirm_password} />
                  </div>
                </div>
              )}

              {(user?.utype === 'admin' || user?.utype === 'staff' || user?.utype === 'principal') && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Assigned Schools <span className="text-gray-400 font-medium normal-case">— select one or more, click the star to set Primary</span>
                  </label>
                  <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-100 max-h-56 overflow-y-auto bg-white shadow-sm">
                    {schools.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-gray-400 font-medium">No schools available.</p>
                    ) : (
                      schools.map(school => {
                        const checked = formData.school_ids.includes(school.id);
                        const isPrimary = formData.school_id === school.id;
                        return (
                          <label
                            key={school.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSchoolSelection(school.id)}
                              className="w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0"
                            />
                            <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{school.name}</span>
                            {checked && (
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setPrimarySchool(school.id); }}
                                title={isPrimary ? 'Primary school' : 'Set as primary school'}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all flex-shrink-0 ${
                                  isPrimary
                                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-amber-50 hover:text-amber-500'
                                }`}
                              >
                                <Star className={`w-3 h-3 ${isPrimary ? 'fill-amber-500' : ''}`} />
                                {isPrimary ? 'Primary' : 'Set Primary'}
                              </button>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                  {formData.school_ids.length === 0 && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1.5 ml-1">Select at least one School.</p>
                  )}
                  <FieldError message={formErrors.school_ids || formErrors.school_id} />
                </div>
              )}

              {(user?.utype === 'admin' || user?.utype === 'staff' || user?.utype === 'principal') && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Assigned Subjects <span className="text-gray-400 font-medium normal-case">— select one or more subjects taught by this teacher</span>
                  </label>
                  <div className="border border-gray-200 dark:border-[#334155] rounded-xl divide-y divide-gray-100 dark:divide-[#334155] max-h-56 overflow-y-auto bg-white dark:bg-[#1e293b] shadow-xs">
                    {subjectsList.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-gray-400 font-medium">No subjects available.</p>
                    ) : (
                      subjectsList.map(subject => {
                        const checked = selectedSubjectIds.includes(subject.id);
                        return (
                          <label
                            key={subject.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-[#283548]/30'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== subject.id));
                                } else {
                                  setSelectedSubjectIds([...selectedSubjectIds, subject.id]);
                                }
                              }}
                              className="w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-gray-700 dark:text-[#e2e8f0] truncate">{subject.name}</span>
                              <span className="block text-[10px] text-gray-400 dark:text-[#94a3b8] font-medium">{subject.grade_level_name}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>

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
                <span>{editingId ? 'Update Teacher' : 'Add Teacher'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Reset Password Modal with rounded-[10px] / rounded-[4px] styling */}
      {showResetModal && resettingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[10px] w-full max-w-md shadow-xl animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Set New Password</h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">For: {resettingTeacher.full_name}</p>
              </div>
              <button type="button" onClick={() => setShowResetModal(false)} className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-50 text-gray-400 hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={resetPasswordData.password}
                    onChange={e => setResetPasswordData({ ...resetPasswordData, password: e.target.value })}
                    onBlur={() => setResetPasswordTouched(true)}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium"
                    placeholder="********"
                  />
                  <PasswordPolicyTracker value={resetPasswordData.password} touched={resetPasswordTouched} />
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordFields(!showResetPasswordFields)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showResetPasswordFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={resetPasswordData.confirm_password}
                    onChange={e => setResetPasswordData({ ...resetPasswordData, confirm_password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium"
                    placeholder="********"
                  />
                </div>
                <FieldError message={resetPasswordError} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
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
                  <span>Update Password</span>
                </button>
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

export default Teachers;
