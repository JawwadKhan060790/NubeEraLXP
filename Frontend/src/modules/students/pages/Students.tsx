import ConfirmModal from '@/components/ConfirmModal';
import ExportButton from '@/components/export/ExportButton';
import FieldError from '@/components/FieldError';
import MobileNumberInput from '@/components/MobileNumberInput';
import Pagination from '@/components/Pagination';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import { teacherEnhancedService, type StudentWeaknessAnalysis, type TeacherLearningPath } from '@/services/teacherEnhancedService';
import { DUPLICATE_MESSAGES, isDuplicateValue } from '@/utils/duplicateCheck';
import { parseApiErrors } from '@/utils/errorParser';
import { isValidEmail, trimAndCollapseSpaces } from '@/utils/validation';
import {
  AlertCircle, AlertTriangle, BarChart3, BookOpen, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight,
  Droplets, Edit, Eye, EyeOff, GraduationCap, Key,
  Loader2,
  Lock, Mail, MapPin, Phone, Plus, School, Search, Trash2, TrendingUp, User, X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

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
    <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <h3 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">{title}</h3>
  </div>
);

interface Student {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  username?: string;
  parent_username?: string;
  student_id: string;
  roll_no?: string;
  grade_id: string;
  grade_name: string;
  section_id?: string;
  section_code?: string;
  section_name?: string;
  grade_display?: string;
  school_id: string;
  school_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  admission_date?: string;
  parent_guardian_name?: string;
  parent_guardian_phone?: string;
  parent_guardian_email?: string;
  emergency_contact?: string;
  personal_note?: string;
  is_active: boolean;
  progress_percentage?: number;
}

interface Grade {
  id: string;
  grade_name: string;
  grade_level: string;
  school_name?: string;
  school_id?: string;
}

interface SchoolData {
  id: string;
  name: string;
  from_grade?: number;
  to_grade?: number;
}

const Students: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const isAdmin = user?.utype === 'admin' || user?.utype === 'superadmin';
  const isPrincipal = user?.utype === 'principal';
  const isStaff = user?.utype === 'staff';
  const isTeacher = user?.utype === 'teacher';

  const isPlatformWide = useMemo(() => {
    const utype = user?.utype;
    return utype === 'superadmin' || utype === 'admin' || utype === 'staff';
  }, [user]);

  // ── Server-side pagination & stats state ──────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [overallTotalCount, setOverallTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [boysCount, setBoysCount] = useState(0);
  const [girlsCount, setGirlsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [allSections, setAllSections] = useState<{ id: string; grade_id: string; section_code: string; display_name: string; school_id?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search is debounced before being sent to the server
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterSchoolId, setFilterSchoolId] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to page 1 when search / filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterSchoolId, filterGradeId, filterSectionId]);

  // Debounce search input — only fire API call 350 ms after the user stops typing
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingStudent, setResettingStudent] = useState<any | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirm_password: '' });
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [showResetPasswordFields, setShowResetPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [parentPasswordTouched, setParentPasswordTouched] = useState(false);
  const [resetPasswordTouched, setResetPasswordTouched] = useState(false);

  // Parent Reset Password State
  const [showParentResetModal, setShowParentResetModal] = useState(false);
  const [resettingParentStudent, setResettingParentStudent] = useState<any | null>(null);
  const [parentResetPasswordData, setParentResetPasswordData] = useState({ password: '', confirm_password: '' });
  const [parentResetPasswordError, setParentResetPasswordError] = useState('');
  const [parentResetPasswordTouched, setParentResetPasswordTouched] = useState(false);

  const handleResetParentPassword = (student: any) => {
    setResettingParentStudent(student);
    setParentResetPasswordData({ password: '', confirm_password: '' });
    setParentResetPasswordError('');
    setParentResetPasswordTouched(false);
    setShowParentResetModal(true);
  };

  const handleParentResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingParentStudent) return;
    setParentResetPasswordError('');
    if (!parentResetPasswordData.password || parentResetPasswordData.password.length < 6) {
      setParentResetPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (parentResetPasswordData.password !== parentResetPasswordData.confirm_password) {
      setParentResetPasswordError('Passwords do not match.');
      return;
    }
    try {
      await api.put(`/students/${resettingParentStudent.id}/reset-parent-password`, {
        password: parentResetPasswordData.password
      });
      toast.success(`Parent password updated for guardian of ${resettingParentStudent.full_name}`);
      setShowParentResetModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reset parent password');
    }
  };

  // Student Academic Progress & Weakness State
  const [studentWeakness, setStudentWeakness] = useState<StudentWeaknessAnalysis | null>(null);
  const [studentLearningPath, setStudentLearningPath] = useState<TeacherLearningPath | null>(null);
  const [loadingAcademicProgress, setLoadingAcademicProgress] = useState(false);

  useEffect(() => {
    if (!selectedStudent?.id) {
      setStudentWeakness(null);
      setStudentLearningPath(null);
      return;
    }
    fetchStudentAcademicDetails(selectedStudent);
  }, [selectedStudent?.id]);

  const fetchStudentAcademicDetails = async (student: any) => {
    if (!student?.id) return;
    setLoadingAcademicProgress(true);
    setStudentWeakness(null);
    setStudentLearningPath(null);

    try {
      const weaknessRes = await teacherEnhancedService.getStudentWeakness(student.id).catch(() => null);
      setStudentWeakness(weaknessRes);
    } catch {
      setStudentWeakness(null);
    }

    try {
      if (student.grade_id) {
        const pathRes = await teacherEnhancedService.getLearningPathByGrade(student.grade_id, student.section_id).catch(() => null);
        setStudentLearningPath(pathRes);
      }
    } catch {
      setStudentLearningPath(null);
    } finally {
      setLoadingAcademicProgress(false);
    }
  };

  const handleResolveWeakTopic = async (topicId: string) => {
    try {
      await teacherEnhancedService.resolveWeakTopic(topicId);
      toast.success('Weakness marked as resolved!');
      if (selectedStudent?.id) {
        const weaknessRes = await teacherEnhancedService.getStudentWeakness(selectedStudent.id).catch(() => null);
        setStudentWeakness(weaknessRes);
      }
    } catch {
      toast.error('Failed to resolve topic');
    }
  };

  const deriveSchoolInitials = (schoolName?: string, schoolCode?: string) => {
    if (schoolCode && schoolCode.trim().length <= 4 && !schoolCode.toUpperCase().startsWith('SCH')) {
      return schoolCode.trim().toUpperCase();
    }
    if (!schoolName) return 'STU';
    const fillers = new Set(['school', 'academy', 'institute', 'college', 'high', 'public', 'the', 'of', 'and', 'in']);
    const words = schoolName.split(/[\s\-.,&/]+/).filter(w => w && !fillers.has(w.toLowerCase()));
    const finalWords = words.length > 0 ? words : schoolName.split(/[\s\-.,&/]+/).filter(Boolean);
    if (finalWords.length === 0) return 'STU';
    if (finalWords.length >= 2) {
      return (finalWords[0][0] + finalWords[1][0]).toUpperCase();
    }
    return finalWords[0].substring(0, 2).toUpperCase();
  };

  const handleSchoolSelect = async (schoolId: string) => {
    let autoId = '';
    if (!editingId && schoolId) {
      try {
        const res: any = await api.get(`/students/next-id?schoolId=${schoolId}`);
        if (res?.student_id) {
          autoId = res.student_id;
        }
      } catch {
        const selectedSchool = schools.find(s => s.id === schoolId);
        if (selectedSchool) {
          const initials = deriveSchoolInitials(selectedSchool.name, (selectedSchool as any).school_code || (selectedSchool as any).code);
          const yr = new Date().getFullYear().toString().slice(-2);
          autoId = `${initials}-${yr}0001`;
        }
      }
    }
    setFormData(prev => ({
      ...prev,
      school_id: schoolId,
      grade_id: '',
      section_id: '',
      student_id: editingId ? prev.student_id : autoId
    }));
  };

  // Academic Year Promotion/Rollover States
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverData, setRolloverData] = useState({
    school_id: '',
    new_academic_year: ''
  });
  const [rolloverConfirmText, setRolloverConfirmText] = useState('');
  const [isRollingOver, setIsRollingOver] = useState(false);

  useEffect(() => {
    if (location.pathname.includes('/create-student')) {
      resetForm();
      setShowModal(true);
    }
  }, [location]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    parent_username: '',
    student_id: '',
    roll_no: '',
    grade_id: '',
    section_id: '',
    school_id: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
    admission_date: new Date().toISOString().split('T')[0],
    parent_guardian_name: '',
    parent_guardian_phone: '',
    parent_guardian_email: '',
    emergency_contact: '',
    personal_note: '',
    password: '',
    confirm_password: '',
    parent_password: '',
    is_active: true
  });

  // Inline, below-the-field validation/duplicate errors shown in red — replaces
  // toast-based form validation. Keyed by formData field name.
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Snapshot of the email/phone/username values an existing student already had when the
  // edit modal opened, so re-blurring an unchanged field never flags itself as
  // a "duplicate" of its own record.
  const [originalValues, setOriginalValues] = useState({ email: '', phone: '', parent_guardian_email: '', username: '', parent_username: '' });

  const clearFieldError = (field: string) =>
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Runs the live duplicate check on blur. `errorKey` is the formErrors field to
  // set (lets parent_guardian_email reuse the 'email' kind under its own key).
  // Deliberately never called for parent_guardian_phone — one parent can have
  // multiple children sharing the same contact number.
  const runDuplicateCheck = async (errorKey: string, kind: 'email' | 'phone' | 'username', value: string, originalValue: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === originalValue) return;
    if (kind === 'email' && !isValidEmail(trimmed)) return;
    const duplicate = await isDuplicateValue(kind, trimmed);
    if (duplicate) {
      setFormErrors(prev => ({ ...prev, [errorKey]: DUPLICATE_MESSAGES[kind] }));
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setFormData(prev => ({ ...prev, school_id: parsed.school_id || '' }));
      setRolloverData(prev => ({ ...prev, school_id: parsed.school_id || '' }));
      if (parsed.utype === 'principal') {
        setFilterSchoolId(parsed.school_id || '');
      }
    }
  }, []);

  const [rolloverErrors, setRolloverErrors] = useState<Record<string, string>>({});

  const handleRolloverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRolloverErrors({});
    if (!rolloverData.school_id) {
      setRolloverErrors(prev => ({ ...prev, school_id: 'Please select a school.' }));
      return;
    }
    if (!rolloverData.new_academic_year.trim()) {
      setRolloverErrors(prev => ({ ...prev, new_academic_year: 'Please enter the new academic year.' }));
      return;
    }
    if (rolloverConfirmText !== 'ROLLOVER') {
      setRolloverErrors(prev => ({ ...prev, confirm_text: 'Please type "ROLLOVER" to confirm the action.' }));
      return;
    }

    setIsRollingOver(true);
    try {
      const response = await api.post('/students/promote', {
        schoolId: rolloverData.school_id,
        newAcademicYear: rolloverData.new_academic_year.trim()
      });
      toast.success(response.data?.message || 'Academic Year Rollover completed successfully!');
      setShowRolloverModal(false);
      setRolloverConfirmText('');
      setRolloverData(prev => ({ ...prev, new_academic_year: '' }));
      setRolloverErrors({});
      fetchData();
    } catch (error: any) {
      console.error('Rollover failed', error);
      const msg = error.response?.data?.message || 'Failed to complete academic year rollover. Ensure student grades are configured correctly.';
      setRolloverErrors(prev => ({ ...prev, confirm_text: msg }));
    } finally {
      setIsRollingOver(false);
    }
  };

  // Fetch reference data (grades + schools + sections) once on mount — these are small lists.
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const calls: Promise<any>[] = [api.get('/grades'), api.get('/grade-sections')];
        if (isAdmin || isPrincipal || isStaff || isTeacher) calls.push(api.get('/schools'));
        const results = await Promise.all(calls);

        const fetchedGrades = results[0].data || [];
        const fetchedSections = results[1].data || [];
        const fetchedSchools = results[2]?.data || [];

        const principalSchoolId = user?.school_id;

        const filteredGrades = isPrincipal && principalSchoolId
          ? fetchedGrades.filter((g: any) => g.school_id === principalSchoolId)
          : fetchedGrades;

        const filteredSections = isPrincipal && principalSchoolId
          ? fetchedSections.filter((s: any) => s.school_id === principalSchoolId)
          : fetchedSections;

        const filteredSchools = isPrincipal && principalSchoolId
          ? fetchedSchools.filter((s: any) => s.id === principalSchoolId)
          : fetchedSchools;

        const sortedGrades = [...filteredGrades].sort((a: Grade, b: Grade) => {
          const aVal = parseInt(a.grade_level, 10);
          const bVal = parseInt(b.grade_level, 10);
          const aNum = isNaN(aVal) ? 999 : aVal;
          const bNum = isNaN(bVal) ? 999 : bVal;
          if (aNum !== bNum) return aNum - bNum;
          return (a.grade_name || '').localeCompare(b.grade_name || '');
        });
        setGrades(sortedGrades);
        setAllSections(filteredSections);
        setSchools(filteredSchools);
      } catch (err) {
        console.error('Failed to load reference data', err);
      }
    };

    if (user) fetchReferenceData();
  }, [user, isAdmin, isPrincipal, isStaff, isTeacher]);

  // ── Server-side student fetch — re-runs on every pagination/filter change ──
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params: Record<string, any> = {
        pageNumber: currentPage,
        pageSize: itemsPerPage,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filterGradeId) params.gradeId = filterGradeId;
      if (filterSectionId) params.sectionId = filterSectionId;

      if (filterStatus === 'all') {
        params['filters[isActive]'] = 'all';
      } else if (filterStatus === 'inactive') {
        params.isActive = false;
      } else {
        params.isActive = true;
      }

      const effectiveSchoolId = isPlatformWide ? filterSchoolId : (user?.school_id || '');
      if (effectiveSchoolId) params.schoolId = effectiveSchoolId;

      const response = await api.get('/students', { params });
      // Response shape (snake_case via ASP.NET SnakeCaseLower policy):
      // { items: Student[], total_count: number, page: number, page_size: number, total_pages: number }
      const data = response.data;
      const items: Student[] = data.items ?? [];
      setStudents(items);
      setTotalCount(data.total_count ?? 0);
      setOverallTotalCount((data.active_count ?? 0) + (data.inactive_count ?? 0));
      setActiveCount(data.active_count ?? items.filter(s => s.is_active).length);
      setInactiveCount(data.inactive_count ?? items.filter(s => !s.is_active).length);
      setBoysCount(data.boys_count ?? items.filter(s => s.gender?.toLowerCase() === 'male').length);
      setGirlsCount(data.girls_count ?? items.filter(s => s.gender?.toLowerCase() === 'female').length);
      setTotalPages(data.total_pages ?? 1);

      // Auto-select first student on page 1 with no active selection
      if (items.length > 0) {
        setSelectedStudent(prev => prev ?? items[0]);
      } else {
        setSelectedStudent(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch students', error);
      const msg = error?.response?.data?.message || 'Failed to load students. Please try again.';
      setFetchError(msg);
      setStudents([]);
      setTotalCount(0);
      setOverallTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, filterSchoolId, filterGradeId, filterSectionId, filterStatus, isPlatformWide, user]);

  // Re-fetch whenever user logs in or pagination/filter state changes
  useEffect(() => {
    if (user) fetchStudents();
  }, [user, fetchStudents]);

  // Convenience alias — used after create/update/delete to refresh the current page
  const fetchData = () => fetchStudents();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    if (showModal) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Guardian Phone is required — parent login uses this as their credential
    if (!formData.parent_guardian_phone || formData.parent_guardian_phone.trim().length < 10) {
      setFormErrors(prev => ({ ...prev, parent_guardian_phone: 'Guardian Phone is required for parent login access.' }));
      return;
    }

    if (!editingId) {
      if (!formData.password || formData.password.length < 6) {
        setFormErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters.' }));
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setFormErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match.' }));
        return;
      }
      if (formData.parent_password && formData.parent_password.length < 6) {
        setFormErrors(prev => ({ ...prev, parent_password: 'Parent password must be at least 6 characters.' }));
        return;
      }
    }
    if (formErrors.email || formErrors.phone || formErrors.parent_guardian_email || formErrors.username || formErrors.parent_username) {
      // A duplicate flagged on blur is still showing — block submit until resolved.
      return;
    }

    const finalData = {
      ...formData,
      school_id: isPlatformWide ? (formData.school_id || null) : (user?.school_id || null),
      // Backend SectionId is a nullable Guid — an empty string fails JSON-to-Guid
      // conversion at the model-binding layer (raw 400, before any validator runs).
      // Grades with no divisions configured leave this blank, so coerce to null.
      section_id: formData.section_id || null
    };

    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, finalData);
        toast.success('Student record updated!');
      } else {
        await api.post('/students', finalData);
        toast.success('Student enrolled successfully!');
        // After enrolling a new student, reset page to 1 so the new student
        // is visible (it appears at the top of the list when sorted by name).
        setCurrentPage(1);
        // If a grade filter was active, clear it so the new student isn't hidden.
        setFilterGradeId('');
        setFilterSectionId('');
        // If the admin scoped by a specific school, keep that filter; but
        // ensure the school filter matches the student's school.
        if (isPlatformWide && (finalData.school_id || user?.school_id)) {
          setFilterSchoolId(finalData.school_id || user?.school_id || '');
        }
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Action failed', error);
      const errorsMap = parseApiErrors(error);
      setFormErrors(errorsMap);
      if (errorsMap._form) {
        toast.error(errorsMap._form);
      }
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setPasswordTouched(false);
    setParentPasswordTouched(false);
    setResetPasswordTouched(false);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      username: student.username || '',
      parent_username: student.parent_username || '',
      student_id: student.student_id,
      roll_no: student.roll_no || '',
      grade_id: student.grade_id,
      section_id: student.section_id || '',
      school_id: student.school_id,
      phone: student.phone || '',
      date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
      gender: student.gender || '',
      blood_group: student.blood_group || '',
      address: student.address || '',
      admission_date: student.admission_date ? new Date(student.admission_date).toISOString().split('T')[0] : '',
      parent_guardian_name: student.parent_guardian_name || '',
      parent_guardian_phone: student.parent_guardian_phone || '',
      parent_guardian_email: student.parent_guardian_email || '',
      emergency_contact: student.emergency_contact || '',
      personal_note: student.personal_note || '',
      is_active: student.is_active,
      password: '',
      confirm_password: '',
      parent_password: ''
    });
    setFormErrors({});
    setOriginalValues({
      email: student.email || '',
      phone: student.phone || '',
      parent_guardian_email: student.parent_guardian_email || '',
      username: student.username || '',
      parent_username: student.parent_username || ''
    });
    setShowModal(true);
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const ok = await requestConfirm({ title: 'Remove Student', message: `Are you sure you want to remove "${name}"?`, confirmLabel: 'Remove', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student unenrolled');
      fetchData();
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const handleResetPassword = (student: any) => {
    setResettingStudent(student);
    setResetPasswordData({ password: '', confirm_password: '' });
    setResetPasswordError('');
    setResetPasswordTouched(false);
    setShowResetModal(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingStudent) return;
    setResetPasswordError('');
    if (!resetPasswordData.password || resetPasswordData.password.length < 6) {
      setResetPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (resetPasswordData.password !== resetPasswordData.confirm_password) {
      setResetPasswordError('Passwords do not match.');
      return;
    }
    try {
      const targetId = resettingStudent.id || resettingStudent.user_id;
      await api.put(`/students/${targetId}/reset-password`, {
        password: resetPasswordData.password
      });
      toast.success(`Password updated for ${resettingStudent.first_name || ''} ${resettingStudent.last_name || ''}`.trim() || 'Student');
      setShowResetModal(false);
    } catch (error: any) {
      setResetPasswordError(error?.response?.data?.message || 'Failed to reset password');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPasswordTouched(false);
    setParentPasswordTouched(false);
    setResetPasswordTouched(false);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      parent_username: '',
      student_id: '',
      roll_no: '',
      grade_id: '',
      section_id: '',
      school_id: isPlatformWide ? filterSchoolId : (user?.school_id || ''),
      phone: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      address: '',
      admission_date: new Date().toISOString().split('T')[0],
      parent_guardian_name: '',
      parent_guardian_phone: '',
      parent_guardian_email: '',
      emergency_contact: '',
      personal_note: '',
      password: '',
      confirm_password: '',
      parent_password: '',
      is_active: true
    });
    setFormErrors({});
    setOriginalValues({ email: '', phone: '', parent_guardian_email: '', username: '', parent_username: '' });
  };

  // ── Server-side pagination: students already arrive pre-filtered and pre-paged ──
  // No client-side filtering or slicing needed.
  const paginatedStudents = students;

  // Shared by both the create/edit form and the list filter bar: narrows the full
  // `grades` list down to the ones that belong to (and fall within the standardized
  // grade range of) a given school. Passing an empty/undefined schoolId returns every
  // grade unfiltered (used when no school is selected yet).
  const gradesForSchool = useCallback((schoolId: string): Grade[] => {
    const schoolAllGrades = grades.filter((g: Grade) => !schoolId || g.school_id === schoolId);
    if (!schoolId) return schoolAllGrades;

    const selectedSchool = schools.find((s) => s.id === schoolId);
    if (!selectedSchool) return schoolAllGrades;

    const fromGrade = selectedSchool.from_grade !== undefined && selectedSchool.from_grade !== null ? selectedSchool.from_grade : -1;
    const toGrade = selectedSchool.to_grade !== undefined && selectedSchool.to_grade !== null ? selectedSchool.to_grade : 10;

    return schoolAllGrades.filter((g: Grade) => {
      const lvl = parseInt(g.grade_level, 10);
      if (isNaN(lvl)) return true;
      return lvl >= fromGrade && lvl <= toGrade;
    });
  }, [grades, schools]);

  const activeSchoolId = isPlatformWide ? formData.school_id : (user?.school_id || formData.school_id);
  const filteredGrades = useMemo<Grade[]>(
    () => gradesForSchool(activeSchoolId),
    [gradesForSchool, activeSchoolId]
  );

  // List filter bar: when the user's school is fixed by their role, the grade filter
  // is silently scoped to it (no school dropdown shown). Otherwise it follows whatever
  // school was picked in the filter bar's own School dropdown.
  const activeFilterSchoolId = isPlatformWide ? filterSchoolId : (user?.school_id || filterSchoolId);
  const filteredGradesForFilterBar = useMemo<Grade[]>(
    () => gradesForSchool(activeFilterSchoolId),
    [gradesForSchool, activeFilterSchoolId]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header section with Title and promotion/enroll buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Student List</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            {overallTotalCount.toLocaleString()} Total Enrolled Students
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <ExportButton
            endpoint="/students/export"
            fallbackFileName="students-export.xlsx"
            label="Export to Excel"
          />
          {isAdmin && (
            <button
              onClick={() => { setShowRolloverModal(true); setRolloverConfirmText(''); setRolloverErrors({}); }}
              className="bg-purple-700 hover:bg-purple-800 text-white border border-purple-600 px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              ↑ Academic Promotion
            </button>
          )}
          {!isTeacher && !isPrincipal && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Enroll Student
            </button>
          )}
        </div>
      </div>

      {/* Counters / Stats Row */}
      {(() => {
        const studentStats: StatItem[] = [
          { title: 'Total Students', value: overallTotalCount, icon: <GraduationCap className="w-6 h-6" />, color: 'indigo', subtitle: 'All enrolled learners' },
          { title: 'Active Students', value: activeCount, icon: <Check className="w-6 h-6" />, color: 'emerald', subtitle: 'Currently active' },
          { title: 'Inactive Students', value: inactiveCount, icon: <X className="w-6 h-6" />, color: 'rose', subtitle: 'Currently inactive' },
          { title: 'Boys', value: boysCount, icon: <User className="w-6 h-6" />, color: 'sky', subtitle: 'Male enrollment' },
          { title: 'Girls', value: girlsCount, icon: <User className="w-6 h-6" />, color: 'violet', subtitle: 'Female enrollment' },
        ];
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatGrid stats={studentStats} loading={isLoading && students.length === 0} />
          </div>
        );
      })()}

      {/* Error banner — shown when API call fails */}
      {fetchError && !isLoading && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-400/25 rounded-[8px] flex items-center gap-3 text-sm text-rose-700 dark:text-rose-300">
          <X className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{fetchError}</span>
          <button
            onClick={fetchData}
            className="ml-auto px-3 py-1 bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 rounded-[4px] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && students.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="text-slate-500 dark:text-[#94a3b8] mt-3 text-[10px] font-bold uppercase tracking-widest">Loading Student Registry…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT PANEL: Student list with Filter */}
          <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col max-h-[680px]">
            {/* Search and Filter container */}
            <div className="p-4 border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60 space-y-3">
              {/* Search, school and grade filters share one row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students by name or ID..."
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                  />
                </div>

                {/* School filter — only shown for roles that aren't already locked to one
                    school; selecting one narrows the Grade filter below it. */}
                {(isPlatformWide || (!user?.school_id && (isAdmin || isPrincipal || isStaff || isTeacher))) && (
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={filterSchoolId}
                      onChange={(e) => { setFilterSchoolId(e.target.value); setFilterGradeId(''); setFilterSectionId(''); }}
                      className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-semibold appearance-none"
                    >
                      <option value="">All Schools</option>
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-[#64748b] pointer-events-none" />
                  </div>
                )}
                <div className="relative flex-1 min-w-0">
                  <select
                    value={filterGradeId}
                    onChange={(e) => { setFilterGradeId(e.target.value); setFilterSectionId(''); }}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-semibold appearance-none"
                  >
                    <option value="">All Grades / Classes</option>
                    {filteredGradesForFilterBar.map(g => (
                      <option key={g.id} value={g.id}>{g.grade_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-[#64748b] pointer-events-none" />
                </div>
                <div className="relative min-w-[95px] flex-initial">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-semibold appearance-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-[#64748b] pointer-events-none" />
                </div>
              </div>
              {/* Section filter — only shown when a grade is selected and sections exist */}
              {filterGradeId && allSections.filter(s => s.grade_id === filterGradeId).length > 0 && (
                <div className="relative">
                  <select
                    value={filterSectionId}
                    onChange={(e) => setFilterSectionId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-semibold appearance-none"
                  >
                    <option value="">All Divisions</option>
                    {allSections
                      .filter(s => s.grade_id === filterGradeId)
                      .map(s => <option key={s.id} value={s.id}>{s.display_name || s.section_code}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-[#64748b] pointer-events-none" />
                </div>
              )}
            </div>

            {/* List scroll container */}
            <div className={`overflow-y-auto divide-y divide-gray-100 flex-1 min-h-[350px] relative transition-opacity duration-150 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {isLoading && students.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
              {paginatedStudents.length === 0 && !isLoading ? (
                <div className="p-10 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest">
                  No students found.
                </div>
              ) : (
                paginatedStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();
                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`relative px-4 py-3.5 cursor-pointer flex items-center gap-3.5 transition-all duration-200 border-l-4 group ${isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-500/15 border-l-indigo-600 dark:border-l-indigo-400 shadow-xs'
                          : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-l-slate-300'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs uppercase flex-shrink-0 border transition-all ${isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-400/25 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/25'
                        }`}>
                        {initials || <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-slate-800 dark:text-white tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {student.full_name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-semibold truncate mt-0.5 flex items-center gap-1.5">
                          <span className="bg-slate-100 dark:bg-[#283548] px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#334155]">
                            {student.grade_display || (student.section_code ? `${student.grade_name} - ${student.section_code}` : student.grade_name) || 'Unassigned'}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-slate-400 dark:text-slate-500">{student.student_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge active={student.is_active} />
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
              {/* Server-side pagination — totalCount and totalPages come from the API response */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={itemsPerPage}
                totalItems={totalCount}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  setSelectedStudent(null);
                }}
                onPageSizeChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                  setSelectedStudent(null);
                }}
              />
            </div>
          </div>

          {/* RIGHT PANEL: Details and Guardian info */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {selectedStudent ? (
              <div className="space-y-6">

                {/* 1. Core Profile Details Card */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="p-5 space-y-5">
                    {/* Identity row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white border-2 border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center text-xl font-black uppercase shadow-sm flex-shrink-0">
                          {selectedStudent.first_name?.[0] || ''}{selectedStudent.last_name?.[0] || ''}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">{selectedStudent.full_name}</h2>
                            <StatusBadge active={selectedStudent.is_active} size="md" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-400/25 px-2 py-0.5 rounded-md font-bold">
                              {selectedStudent.grade_display || selectedStudent.grade_name || 'No Grade Assigned'}
                            </span>
                            <span>·</span>
                            <span>{selectedStudent.school_name}</span>
                          </p>
                        </div>
                      </div>
                      {/* Action buttons */}
                      {!isTeacher && !isPrincipal && (
                        <div className="flex items-center gap-2 self-start flex-wrap flex-shrink-0">
                          <button
                            onClick={() => handleEdit(selectedStudent)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            title="Edit Student Profile"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(selectedStudent)}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" /> Reset
                          </button>
                          <button
                            onClick={() => handleDelete(selectedStudent.id, selectedStudent.full_name)}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Academic Info */}
                    <div>
                      <SectionHeader icon={<GraduationCap className="w-3.5 h-3.5" />} title="Academic Information" />
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow icon={<Mail className="w-4 h-4" />} label="Email Address" value={selectedStudent.email} className="col-span-2" />
                        <InfoRow icon={<User className="w-4 h-4" />} label="Student Username" value={selectedStudent.username} />
                        <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Student ID" value={selectedStudent.student_id} />
                        <InfoRow icon={<School className="w-4 h-4" />} label="Roll Number" value={selectedStudent.roll_no} />
                        <InfoRow icon={<School className="w-4 h-4" />} label="Grade / Division" value={
                          selectedStudent.grade_display ||
                          (selectedStudent.section_code
                            ? `${selectedStudent.grade_name} - ${selectedStudent.section_code}`
                            : selectedStudent.grade_name)
                        } />
                        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Admission Date" value={selectedStudent.admission_date ? new Date(selectedStudent.admission_date).toLocaleDateString() : null} />
                      </div>
                    </div>

                    {/* Demographic Info */}
                    {(selectedStudent.phone || selectedStudent.gender || selectedStudent.blood_group || selectedStudent.date_of_birth || selectedStudent.address) && (
                      <div>
                        <SectionHeader icon={<User className="w-3.5 h-3.5" />} title="Demographic Profile" />
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={selectedStudent.phone} />
                          <InfoRow icon={<User className="w-4 h-4" />} label="Gender" value={selectedStudent.gender} />
                          <InfoRow icon={<Droplets className="w-4 h-4" />} label="Blood Group" value={selectedStudent.blood_group} />
                          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : null} />
                          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Home Address" value={selectedStudent.address} className="col-span-2" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Guardian & Parent Info */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <SectionHeader icon={<User className="w-3.5 h-3.5" />} title="Parent / Guardian Profile" />
                      {!isTeacher && !isPrincipal && (selectedStudent.parent_guardian_email || selectedStudent.parent_guardian_phone || selectedStudent.parent_guardian_name) && (
                        <button
                          onClick={() => handleResetParentPassword(selectedStudent)}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer self-start sm:self-auto"
                          title="Reset Parent Password"
                        >
                          <Key className="w-3.5 h-3.5" /> Reset Parent Password
                        </button>
                      )}
                    </div>
                    {selectedStudent.parent_guardian_name ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#283548] rounded-xl border border-slate-100 dark:border-[#334155]">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-400/25 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold uppercase text-xs flex-shrink-0">
                            {selectedStudent.parent_guardian_name[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-white">{selectedStudent.parent_guardian_name}</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#64748b] font-medium mt-0.5">Primary Guardian</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow icon={<Mail className="w-4 h-4" />} label="Guardian Email" value={selectedStudent.parent_guardian_email} className="col-span-2" />
                          <InfoRow icon={<User className="w-4 h-4" />} label="Guardian Username" value={selectedStudent.parent_username} />
                          <InfoRow icon={<Phone className="w-4 h-4" />} label="Guardian Phone" value={selectedStudent.parent_guardian_phone} />
                          <InfoRow icon={<Phone className="w-4 h-4" />} label="Emergency Contact" value={selectedStudent.emergency_contact} />
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest bg-slate-50 dark:bg-[#283548] rounded-xl border border-slate-100 dark:border-[#334155]">
                        No Guardian Registered
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Student Overall Academic Progress, Unit Completion & Weakness Analysis (Full Width Card) */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
                  <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#283548]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm flex-shrink-0">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic Progress & Weakness Analysis</h3>
                          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-semibold">Real-time topic & unit completion line progress with AI weakness evaluation</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingAcademicProgress && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                        <span className="text-xs font-black px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-400/20">
                          Overall: {selectedStudent.progress_percentage ?? studentLearningPath?.completion_percentage ?? 0}%
                        </span>
                      </div>
                    </div>

                    {/* Overall Progress Line Percentage Bar */}
                    <div className="space-y-2 bg-slate-50 dark:bg-[#283548]/40 p-4 rounded-xl border border-slate-100 dark:border-[#334155]">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Overall Syllabus & Learning Progress
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                          {selectedStudent.progress_percentage ?? studentLearningPath?.completion_percentage ?? 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-[#1e293b] h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-[#334155]">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${Math.min(100, Math.max(0, selectedStudent.progress_percentage ?? studentLearningPath?.completion_percentage ?? 0))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-[#64748b] pt-1">
                        <span>0% (Not Started)</span>
                        <span>50% (Halfway)</span>
                        <span>100% (Fully Completed)</span>
                      </div>
                    </div>

                    {/* Unit / Module Completion Breakdown */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Unit & Topic Completion (Line Percentage Breakdown)
                      </h4>

                      {studentLearningPath?.modules && studentLearningPath.modules.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {studentLearningPath.modules.map((m, idx) => (
                            <div key={m.module_id || idx} className="bg-white dark:bg-[#283548]/30 border border-slate-200/80 dark:border-[#334155] p-4 rounded-xl space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Unit {idx + 1}</span>
                                  <h5 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{m.module_name}</h5>
                                </div>
                                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-400/20">
                                  {m.completion_percentage}%
                                </span>
                              </div>

                              {/* Unit Line Percentage Bar */}
                              <div className="w-full bg-slate-100 dark:bg-[#1e293b] h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                  style={{ width: `${m.completion_percentage}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-[#94a3b8]">
                                <span>{m.completed_lessons} of {m.total_lessons} Topics Completed</span>
                                <span>⏱️ {m.executed_periods} Periods</span>
                              </div>

                              {/* Topic list sample */}
                              {m.topics && m.topics.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 dark:border-[#334155]/60 space-y-1.5">
                                  {m.topics.slice(0, 3).map((t, tidx) => (
                                    <div key={t.lesson_id || tidx} className="flex items-center justify-between text-[11px] font-bold">
                                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                        {t.serial_number ? `${t.serial_number}. ` : ''}{t.sub_topic}
                                      </span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${t.status === 'Completed'
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                          : t.status === 'InProgress'
                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                        }`}>
                                        {t.status}
                                      </span>
                                    </div>
                                  ))}
                                  {m.topics.length > 3 && (
                                    <p className="text-[9px] font-bold text-slate-400 text-right mt-1">+ {m.topics.length - 3} more topics</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest bg-slate-50 dark:bg-[#283548] rounded-xl border border-slate-100 dark:border-[#334155]">
                          No specific units registered for this grade yet. Overall progress: {selectedStudent.progress_percentage ?? 0}%
                        </div>
                      )}
                    </div>

                    {/* Weakness & Identified Learning Gaps */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-[#283548]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Weakness Analysis & Identified Gaps
                        </h4>
                        {studentWeakness?.total_weak_topics !== undefined && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-400/20">
                            {studentWeakness.total_weak_topics} Active Weak Area(s)
                          </span>
                        )}
                      </div>

                      {studentWeakness?.weak_topics && studentWeakness.weak_topics.filter(wt => !wt.is_resolved).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {studentWeakness.weak_topics.filter(wt => !wt.is_resolved).map((wt) => (
                            <div key={wt.id} className="p-4 bg-amber-50/40 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20 rounded-xl space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{wt.module_name}</span>
                                  <h5 className="text-xs font-black text-slate-800 dark:text-white">{wt.lesson_name}</h5>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${wt.weakness_level === 'High'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300'
                                    : wt.weakness_level === 'Medium'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300'
                                      : 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300'
                                  }`}>
                                  {wt.weakness_level} Severity
                                </span>
                              </div>

                              {/* Score progress line */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                  <span>Test Accuracy</span>
                                  <span>{wt.score}/{wt.max_score} ({Math.round((wt.score / (wt.max_score || 1)) * 100)}%)</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${(wt.score / (wt.max_score || 1)) >= 0.6 ? 'bg-emerald-500' : (wt.score / (wt.max_score || 1)) >= 0.35 ? 'bg-amber-400' : 'bg-rose-500'
                                      }`}
                                    style={{ width: `${Math.min(100, Math.max(0, (wt.score / (wt.max_score || 1)) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              {wt.recommended_revision && (
                                <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 p-2 rounded-lg border border-indigo-100 dark:border-indigo-400/20">
                                  💡 {wt.recommended_revision}
                                </p>
                              )}

                              <button
                                onClick={() => handleResolveWeakTopic(wt.id)}
                                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-400/20 text-xs font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>No critical learning gaps or weak topics identified for this student! Excellent progress.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#283548] flex items-center justify-center mb-4">
                  <GraduationCap className="w-8 h-8 text-slate-300 dark:text-[#475569]" />
                </div>
                <p className="text-sm font-bold text-slate-400 dark:text-[#64748b]">No student selected</p>
                <p className="text-xs text-slate-400 dark:text-[#64748b] mt-1">Select a student from the list to view their full profile.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ➕ Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <form onSubmit={handleSaveStudent} className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-5xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#1e293b]">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{editingId ? 'Edit Student' : 'Add Student'}</h2>
                <p className="text-xs text-gray-500 dark:text-[#94a3b8] mt-1 font-semibold uppercase tracking-wider">Enter student information</p>
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 bg-primary h-4 rounded-full"></div>
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      onBlur={e => setFormData({ ...formData, first_name: trimAndCollapseSpaces(e.target.value) })}
                      placeholder="Enter First Name"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                    />
                    <FieldError message={formErrors.first_name} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      onBlur={e => setFormData({ ...formData, last_name: trimAndCollapseSpaces(e.target.value) })}
                      placeholder="Enter Last Name"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                    />
                    <FieldError message={formErrors.last_name} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                      onBlur={e => runDuplicateCheck('email', 'email', e.target.value, originalValues.email)}
                      placeholder="Enter Email Address"
                      className={`w-full px-4 py-3 bg-white dark:bg-[#1e293b] border rounded-[4px] focus:ring-4 transition-all outline-none font-medium text-sm shadow-sm ${formErrors.email ? 'border-rose-300 dark:border-rose-400/40 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 dark:border-[#334155] focus:ring-primary/5 focus:border-primary'}`}
                    />
                    <FieldError message={formErrors.email} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Student Username <span className="text-gray-400 font-normal normal-case"></span></label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e => { setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') }); clearFieldError('username'); }}
                      onBlur={e => runDuplicateCheck('username', 'username', e.target.value, originalValues.username)}
                      placeholder="e.g. john.doe"
                      className={`w-full px-4 py-3 bg-white dark:bg-[#1e293b] border rounded-[4px] focus:ring-4 transition-all outline-none font-medium text-sm shadow-sm ${formErrors.username ? 'border-rose-300 dark:border-rose-400/40 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 dark:border-[#334155] focus:ring-primary/5 focus:border-primary'}`}
                    />
                    <FieldError message={formErrors.username} />
                  </div>
                  {!editingId && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b]" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={formData.password}
                            onChange={e => { setFormData({ ...formData, password: e.target.value }); clearFieldError('password'); }}
                            placeholder="••••••••"
                            className={`w-full pl-11 pr-12 py-3 bg-white dark:bg-[#1e293b] border rounded-[4px] focus:ring-4 transition-all outline-none font-medium text-sm shadow-sm ${formErrors.password ? 'border-rose-300 dark:border-rose-400/40 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 dark:border-[#334155] focus:ring-primary/5 focus:border-primary'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b] hover:text-primary transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError message={formErrors.password} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Confirm Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b]" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={formData.confirm_password}
                            onChange={e => { setFormData({ ...formData, confirm_password: e.target.value }); clearFieldError('confirm_password'); }}
                            placeholder="••••••••"
                            className={`w-full pl-11 pr-12 py-3 bg-white dark:bg-[#1e293b] border rounded-[4px] focus:ring-4 transition-all outline-none font-medium text-sm shadow-sm ${formErrors.confirm_password ? 'border-rose-300 dark:border-rose-400/40 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 dark:border-[#334155] focus:ring-primary/5 focus:border-primary'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b] hover:text-primary transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError message={formErrors.confirm_password} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 bg-primary h-4 rounded-full"></div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Academic Details</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6">
                  {(isPlatformWide || (!user?.school_id && (isAdmin || isPrincipal || isStaff || isTeacher))) && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Assigned Institution</label>
                      <div className="relative">
                        <select
                          required
                          value={formData.school_id}
                          onChange={e => handleSchoolSelect(e.target.value)}
                          className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm cursor-pointer shadow-sm appearance-none"
                        >
                          <option value="">Select School</option>
                          {schools.map(school => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b] pointer-events-none" />
                      </div>
                      <FieldError message={formErrors.school_id} />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Student ID</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.student_id || (formData.school_id ? 'Auto-generated on save' : 'Select school to generate ID')}
                      placeholder="Select school to generate ID"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] font-bold text-indigo-600 dark:text-indigo-400 text-sm shadow-sm cursor-not-allowed select-none"
                    />
                    <FieldError message={formErrors.student_id} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Roll Number</label>
                    <input
                      type="text"
                      value={formData.roll_no}
                      onChange={e => setFormData({ ...formData, roll_no: e.target.value })}
                      placeholder="Enter Roll Number"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                    />
                    <FieldError message={formErrors.roll_no} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Grade Level</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.grade_id}
                        onChange={e => setFormData({ ...formData, grade_id: e.target.value, section_id: '' })}
                        className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm cursor-pointer shadow-sm appearance-none"
                      >
                        <option value="">{activeSchoolId ? 'Select Grade' : 'Please select school first'}</option>
                        {filteredGrades.map(g => (
                          <option key={g.id} value={g.id}>{g.grade_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b] pointer-events-none" />
                    </div>
                    <FieldError message={formErrors.grade_id} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Division</label>
                    <div className="relative">
                      <select
                        value={formData.section_id}
                        onChange={e => setFormData({ ...formData, section_id: e.target.value })}
                        disabled={!formData.grade_id}
                        required={!!(formData.grade_id && allSections.some(s => s.grade_id === formData.grade_id))}
                        className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm cursor-pointer shadow-sm appearance-none disabled:bg-gray-50 dark:disabled:bg-[#283548] disabled:text-gray-400 dark:disabled:text-[#64748b]"
                      >
                        <option value="">
                          {!formData.grade_id
                            ? 'Please select grade first'
                            : allSections.filter(s => s.grade_id === formData.grade_id).length === 0
                              ? 'No divisions available'
                              : 'Select Division'}
                        </option>
                        {allSections
                          .filter(s => s.grade_id === formData.grade_id)
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.display_name ?? `${s.section_code}`}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b] pointer-events-none" />
                    </div>
                    <FieldError message={formErrors.section_id} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                    />
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6">

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Gender</label>
                  <div className="relative">
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm cursor-pointer shadow-sm appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Blood Group</label>
                  <input
                    type="text"
                    value={formData.blood_group}
                    onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                    placeholder="Enter Blood Group"
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Admission Date <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                  <input
                    type="date"
                    value={formData.admission_date}
                    onChange={e => setFormData({ ...formData, admission_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-sm shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Home Address</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  onBlur={e => setFormData({ ...formData, address: trimAndCollapseSpaces(e.target.value) })}
                  placeholder="Enter Address"
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none h-20 resize-none text-sm font-medium shadow-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 bg-indigo-500 h-4 rounded-full"></div>
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Parent / Guardian Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Guardian Name</label>
                    <input
                      type="text"
                      required
                      value={formData.parent_guardian_name}
                      onChange={e => setFormData({ ...formData, parent_guardian_name: e.target.value })}
                      onBlur={e => setFormData({ ...formData, parent_guardian_name: trimAndCollapseSpaces(e.target.value) })}
                      placeholder="Enter Parent / Guardian Name"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-bold text-gray-900 dark:text-white shadow-sm"
                    />
                    <FieldError message={formErrors.parent_guardian_name} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Parent Username  </label>
                    <input
                      type="text"
                      value={formData.parent_username}
                      onChange={e => { setFormData({ ...formData, parent_username: e.target.value.toLowerCase().replace(/\s+/g, '') }); clearFieldError('parent_username'); }}
                      onBlur={e => runDuplicateCheck('parent_username', 'username', e.target.value, originalValues.parent_username)}
                      placeholder="e.g. parent.smith"
                      className={`w-full px-4 py-3 bg-white dark:bg-[#1e293b] border rounded-[4px] focus:ring-4 transition-all outline-none font-medium text-sm shadow-sm ${formErrors.parent_username ? 'border-rose-300 dark:border-rose-400/40 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 dark:border-[#334155] focus:ring-primary/5 focus:border-primary'}`}
                    />
                    <FieldError message={formErrors.parent_username} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Guardian Phone <span className="text-rose-500">*</span></label>
                    <MobileNumberInput
                      label="Guardian Phone"
                      required
                      value={formData.parent_guardian_phone}
                      onChange={(digits) => { setFormData({ ...formData, parent_guardian_phone: digits }); clearFieldError('parent_guardian_phone'); }}
                      error={formErrors.parent_guardian_phone}
                    />
                  </div>

                  {!editingId && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Parent Password</label>
                      <input
                        type="password"
                        value={formData.parent_password}
                        onChange={e => { setFormData({ ...formData, parent_password: e.target.value }); clearFieldError('parent_password'); }}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 bg-white dark:bg-[#1e293b] border rounded-[4px] focus:ring-4 transition-all outline-none text-sm font-medium shadow-sm ${formErrors.parent_password ? 'border-rose-300 dark:border-rose-400/40 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 dark:border-[#334155] focus:ring-primary/5 focus:border-primary'}`}
                      />
                      <FieldError message={formErrors.parent_password} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Administrative / Personal Notes</label>
                <textarea
                  value={formData.personal_note}
                  onChange={e => setFormData({ ...formData, personal_note: e.target.value })}
                  placeholder="Enter Administrative / Personal Notes"
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none h-20 resize-none text-sm font-medium shadow-sm"
                />
              </div>

              {editingId && (
                <div className="bg-slate-50 dark:bg-[#283548]/40 p-4 rounded-xl border border-slate-200 dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">Student & Parent Account Status</label>
                    <p className="text-[11px] text-slate-500 dark:text-[#94a3b8] font-medium">
                      {isAdmin ? 'Inactive blocks student and parent logins. Active allows logins.' : 'Modifying student status requires Admin privileges'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setFormData(prev => ({ ...prev, is_active: true }))}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${formData.is_active
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                          : 'bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#334155] hover:bg-slate-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </button>
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setFormData(prev => ({ ...prev, is_active: false }))}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${!formData.is_active
                          ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                          : 'bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#334155] hover:bg-slate-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Inactive
                    </button>
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
                <span>{editingId ? 'Update Record' : 'Enroll Student'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promo/Rollover Modal */}
      {showRolloverModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-[10px] w-full max-w-md shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Academic Rollover Promotion</h2>
                <p className="text-xs text-gray-500 dark:text-[#94a3b8] mt-1 font-medium">Promote all student cohorts to the next level</p>
              </div>
              <button type="button" onClick={() => setShowRolloverModal(false)} className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-50 dark:bg-[#283548] text-gray-400 dark:text-[#64748b] hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRolloverSubmit} className="p-6 space-y-4">
              {!user?.school_id && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 dark:text-[#64748b] uppercase tracking-widest ml-1">Target School</label>
                  <div className="relative mt-1">
                    <select
                      required
                      value={rolloverData.school_id}
                      onChange={e => { setRolloverData({ ...rolloverData, school_id: e.target.value }); setRolloverErrors(prev => { const next = { ...prev }; delete next.school_id; return next; }); }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] text-xs font-semibold appearance-none"
                    >
                      <option value="">Select School</option>
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b] pointer-events-none" />
                  </div>
                  <FieldError message={rolloverErrors.school_id} />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#64748b] uppercase tracking-widest ml-1">New Academic Year Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter New Academic Year Name"
                  value={rolloverData.new_academic_year}
                  onChange={e => { setRolloverData({ ...rolloverData, new_academic_year: e.target.value }); setRolloverErrors(prev => { const next = { ...prev }; delete next.new_academic_year; return next; }); }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm mt-1"
                />
                <FieldError message={rolloverErrors.new_academic_year} />
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-500/15 border border-rose-100 dark:border-rose-400/25 rounded-[6px] text-xs text-rose-800 dark:text-rose-300">
                <strong>Warning:</strong> This action will promote all students in active grades to their next designated levels. Ensure next-grade pathways are configured correctly. Type <strong className="text-rose-950 dark:text-rose-200 font-black">"ROLLOVER"</strong> below to confirm.
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Type ROLLOVER to confirm"
                  value={rolloverConfirmText}
                  onChange={e => { setRolloverConfirmText(e.target.value); setRolloverErrors(prev => { const next = { ...prev }; delete next.confirm_text; return next; }); }}
                  className="w-full px-4 py-3 border border-rose-200 dark:border-rose-400/25 rounded-[4px] text-sm text-center uppercase tracking-widest font-black text-rose-950 dark:text-rose-200"
                />
                <FieldError message={rolloverErrors.confirm_text} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#283548]">
                <button
                  type="button"
                  onClick={() => setShowRolloverModal(false)}
                  className="modal-btn-cancel"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={isRollingOver}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-[4px] font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 shadow-sm"
                >
                  {isRollingOver ? 'Processing...' : 'Run Rollover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && resettingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-[10px] w-full max-w-md shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Set Student Password</h2>
                <p className="text-xs text-gray-500 dark:text-[#94a3b8] mt-1 font-medium">For: {resettingStudent.full_name}</p>
              </div>
              <button type="button" onClick={() => setShowResetModal(false)} className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-50 dark:bg-[#283548] text-gray-400 dark:text-[#64748b] hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#64748b] uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b]" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={resetPasswordData.password}
                    onChange={e => setResetPasswordData({ ...resetPasswordData, password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordFields(!showResetPasswordFields)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b] hover:text-primary transition-colors"
                  >
                    {showResetPasswordFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#64748b] uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b]" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={resetPasswordData.confirm_password}
                    onChange={e => setResetPasswordData({ ...resetPasswordData, confirm_password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
                <FieldError message={resetPasswordError} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#283548]">
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

      {/* Parent Reset Password Modal */}
      {showParentResetModal && resettingParentStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-[10px] w-full max-w-md shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Set Parent Login Password</h2>
                <p className="text-xs text-gray-500 dark:text-[#94a3b8] mt-1 font-medium">
                  Guardian: {resettingParentStudent.parent_guardian_name || 'Primary Guardian'} (Student: {resettingParentStudent.full_name})
                </p>
              </div>
              <button type="button" onClick={() => setShowParentResetModal(false)} className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-50 dark:bg-[#283548] text-gray-400 dark:text-[#64748b] hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleParentResetSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#64748b] uppercase tracking-widest ml-1">New Parent Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b]" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={parentResetPasswordData.password}
                    onChange={e => setParentResetPasswordData({ ...parentResetPasswordData, password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordFields(!showResetPasswordFields)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b] hover:text-primary transition-colors"
                  >
                    {showResetPasswordFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-[#64748b] uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b]" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={parentResetPasswordData.confirm_password}
                    onChange={e => setParentResetPasswordData({ ...parentResetPasswordData, confirm_password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-medium"
                    placeholder="********"
                  />
                </div>
                <FieldError message={parentResetPasswordError} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#283548]">
                <button
                  type="button"
                  onClick={() => setShowParentResetModal(false)}
                  className="modal-btn-cancel"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-[4px] uppercase tracking-widest text-[10px] flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Parent Password</span>
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

export default Students;
