import React, { useEffect, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import Pagination from '@/components/Pagination';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { BookOpen, Check, Edit, GraduationCap, Plus, Search, Trash2, X, Users, BookOpenCheck, HelpCircle, ChevronDown, ChevronRight, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import FieldError from '@/components/FieldError';
import { parseApiErrors } from '@/utils/errorParser';
import GradeLevelSelect, { fetchMasterGradeLevels, type GradeLevelOption } from '@/components/GradeLevelSelect';

interface Subject {
  id: string;
  name: string;
  grade_level_id: string;
  grade_level_name: string;
  description?: string;
  is_active: boolean;
  unit_count: number;
  topic_count: number;
  assigned_teacher_ids: string[];
  assigned_teacher_names: string[];
  assigned_student_ids: string[];
  assigned_student_names: string[];
}

interface Unit {
  id: string;
  name: string;
  description?: string;
  lesson_count: number;
  lessons?: { id: string; subTopic: string; expectedPeriods: number }[];
}

const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({ active, size = 'sm' }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border
    ${size === 'md' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'}
    ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/25' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/25'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjectUnits, setSubjectUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Assignment Modal states
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [showAssignStudentModal, setShowAssignStudentModal] = useState(false);
  const [allTeachers, setAllTeachers] = useState<{ id: string; name: string }[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [peopleSearchTerm, setPeopleSearchTerm] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    grade_level_id: '',
    description: '',
    is_active: true
  });

  const clearFieldError = (field: string) => {
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchMasterGradeLevels()
      .then(setGradeLevels)
      .catch(err => console.error('Error fetching grade levels:', err));
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, filterGradeId]);

  useEffect(() => {
    if (selectedSubject) {
      fetchSubjectUnits(selectedSubject.id);
    } else {
      setSubjectUnits([]);
    }
  }, [selectedSubject]);

  const fetchData = async () => {
    try {
      const params: Record<string, any> = {
        pageNumber: currentPage,
        pageSize: itemsPerPage,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterGradeId) params.gradeId = filterGradeId;

      const res = await api.get('/subjects/paged', { params });
      const paged = res.data;
      const data: Subject[] = paged.items || [];
      setSubjects(data);
      setTotalCount(paged.total_count || 0);
      setTotalPages(paged.total_pages || 0);
      if (data.length > 0) {
        setSelectedSubject(prev => {
          const match = data.find(s => s.id === prev?.id);
          return match ? match : data[0];
        });
      } else {
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchSubjectUnits = async (subjectId: string) => {
    setLoadingUnits(true);
    try {
      const res = await api.get('/modules/paged', {
        params: {
          pageSize: 100,
          'Filters[SubjectId]': subjectId
        }
      });
      // For each unit, fetch lessons
      const units: Unit[] = res.data.items || [];
      const unitsWithLessons = await Promise.all(units.map(async (u) => {
        const lessonRes = await api.get('/lessons', { params: { moduleId: u.id } });
        return {
          ...u,
          lessons: lessonRes.data || []
        };
      }));
      setSubjectUnits(unitsWithLessons);
    } catch (error) {
      console.error('Error fetching subject units:', error);
    } finally {
      setLoadingUnits(false);
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
        await api.put(`/subjects/${editingId}`, formData);
        toast.success('Subject saved successfully');
      } else {
        await api.post('/subjects', formData);
        toast.success('Subject added successfully');
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

  const handleEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setFormData({
      name: subject.name,
      grade_level_id: subject.grade_level_id,
      description: subject.description || '',
      is_active: subject.is_active
    });
    setFormErrors({});
    setShowModal(true);
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const ok = await requestConfirm({
      title: 'Delete Subject',
      message: `Are you sure you want to delete "${name}"? This action will unmap all assigned Units.`,
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/subjects/${id}`);
      toast.success('Subject deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', grade_level_id: '', description: '', is_active: true });
    setFormErrors({});
  };

  // Open Teachers Assignment
  const handleAssignTeachersClick = async () => {
    if (!selectedSubject) return;
    setSelectedPeopleIds(selectedSubject.assigned_teacher_ids);
    setPeopleSearchTerm('');
    setShowAssignTeacherModal(true);
    try {
      const res = await api.get('/teachers');
      // Teachers endpoint might return a list or paged list. Handle both.
      const list = Array.isArray(res.data) ? res.data : res.data.items || [];
      setAllTeachers(list.map((t: any) => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`
      })));
    } catch (err) {
      toast.error('Failed to load teachers');
    }
  };

  const handleSaveTeachersAssignment = async () => {
    if (!selectedSubject) return;
    try {
      await api.post(`/subjects/${selectedSubject.id}/assign-teachers`, {
        peopleIds: selectedPeopleIds
      });
      toast.success('Teachers assigned successfully');
      setShowAssignTeacherModal(false);
      // Refresh current subject info
      const res = await api.get(`/subjects/${selectedSubject.id}`);
      setSelectedSubject(res.data);
      // Refresh page list
      fetchData();
    } catch (err) {
      toast.error('Failed to assign teachers');
    }
  };

  // Open Students Assignment
  const handleAssignStudentsClick = async () => {
    if (!selectedSubject) return;
    setSelectedPeopleIds(selectedSubject.assigned_student_ids);
    setPeopleSearchTerm('');
    setShowAssignStudentModal(true);
    try {
      const res = await api.get('/students', { params: { pageSize: 1000 } });
      const list = Array.isArray(res.data) ? res.data : res.data.items || [];
      setAllStudents(list.map((s: any) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`
      })));
    } catch (err) {
      toast.error('Failed to load students');
    }
  };

  const handleSaveStudentsAssignment = async () => {
    if (!selectedSubject) return;
    try {
      await api.post(`/subjects/${selectedSubject.id}/assign-students`, {
        peopleIds: selectedPeopleIds
      });
      toast.success('Students assigned successfully');
      setShowAssignStudentModal(false);
      // Refresh current subject info
      const res = await api.get(`/subjects/${selectedSubject.id}`);
      setSelectedSubject(res.data);
      // Refresh page list
      fetchData();
    } catch (err) {
      toast.error('Failed to assign students');
    }
  };

  const togglePersonSelection = (id: string) => {
    setSelectedPeopleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const activeCount = subjects.filter(s => s.is_active).length;
  const inactiveCount = subjects.filter(s => !s.is_active).length;

  const subjectStats: StatItem[] = [
    { title: 'Total Subjects', value: totalCount, icon: <BookOpen className="w-6 h-6" />, color: 'indigo', subtitle: 'Global academic subjects' },
    { title: 'Active', value: activeCount, icon: <Check className="w-6 h-6" />, color: 'emerald', subtitle: 'Currently in use' },
    { title: 'Inactive', value: inactiveCount, icon: <X className="w-6 h-6" />, color: 'rose', subtitle: 'Archived subjects' },
    { title: 'Grade Levels', value: gradeLevels.length, icon: <GraduationCap className="w-6 h-6" />, color: 'amber', subtitle: 'Master grade ranges' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Subject Management</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            {totalCount} Core Subjects Defined
          </p>
        </div>
        {user?.utype !== 'student' && user?.utype !== 'teacher' && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Add Subject
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatGrid stats={subjectStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: Subject List */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[680px]">
          <div className="p-4 border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search subjects..."
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

          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#283548] flex-1 min-h-[350px]">
            {subjects.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest">
                No subjects found.
              </div>
            ) : (
              subjects.map((sub) => {
                const isSelected = selectedSubject?.id === sub.id;
                const initials = sub.name.substring(0, 2).toUpperCase();
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
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
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-400/20">
                          {sub.grade_level_name}
                        </span>
                        <StatusBadge active={sub.is_active} />
                      </div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {sub.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-semibold text-slate-500 dark:text-[#94a3b8]">
                        <span>{sub.unit_count} Units</span>
                        <span>·</span>
                        <span>{sub.topic_count} Topics</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1 text-indigo-600 dark:text-indigo-400' : 'text-slate-300 group-hover:text-slate-400'}`} />
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-[#283548] bg-slate-50/30 dark:bg-[#1e293b]/30">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={itemsPerPage}
                totalItems={totalCount}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
              />
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Subject Details & Unit Hierarchy */}
        <div className="lg:col-span-7 space-y-6">
          {selectedSubject ? (
            <>
              {/* Card 1: Subject Info */}
              <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-sm space-y-5 relative overflow-hidden">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white border-2 border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center text-xl font-black uppercase shadow-sm flex-shrink-0">
                      {selectedSubject.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-400/25">
                          {selectedSubject.grade_level_name}
                        </span>
                        <StatusBadge active={selectedSubject.is_active} size="md" />
                      </div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight break-words">
                        {selectedSubject.name}
                      </h2>
                    </div>
                  </div>

                  {user?.utype !== 'student' && user?.utype !== 'teacher' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(selectedSubject)}
                        className="px-3.5 py-2 bg-indigo-50/90 hover:bg-indigo-100/90 text-indigo-700 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                        title="Edit Subject"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selectedSubject.id, selectedSubject.name)}
                        className="px-3.5 py-2 bg-rose-50/90 hover:bg-rose-100/90 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-200/70 dark:border-rose-500/30 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {selectedSubject.description && (
                  <div className="bg-slate-50 dark:bg-[#1e293b]/40 rounded-xl p-4 border border-slate-100 dark:border-[#283548] text-xs font-semibold leading-relaxed text-slate-600 dark:text-[#e2e8f0]">
                    {selectedSubject.description}
                  </div>
                )}

                {/* Assigned Educators & Students */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50/50 dark:bg-[#283548]/40 border border-slate-100 dark:border-[#334155] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Assigned Teachers</h4>
                      </div>
                      {user?.utype !== 'student' && user?.utype !== 'teacher' && (
                        <button
                          onClick={handleAssignTeachersClick}
                          className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {selectedSubject.assigned_teacher_names.length === 0 ? (
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-[#64748b]">No teachers assigned.</p>
                      ) : (
                        selectedSubject.assigned_teacher_names.map((name, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-[#e2e8f0] bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-[#334155] px-2.5 py-1.5 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-[#283548]/40 border border-slate-100 dark:border-[#334155] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Studying Students</h4>
                      </div>
                      {user?.utype !== 'student' && user?.utype !== 'teacher' && (
                        <button
                          onClick={handleAssignStudentsClick}
                          className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {selectedSubject.assigned_student_names.length === 0 ? (
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-[#64748b]">No students assigned.</p>
                      ) : (
                        selectedSubject.assigned_student_names.map((name, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-[#e2e8f0] bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-[#334155] px-2.5 py-1.5 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Units & Topics Accordion Tree */}
              <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#283548] mb-4">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <BookOpenCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">Syllabus Breakdown (Units & Topics)</h3>
                </div>

                {loadingUnits ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Loading curriculum hierarchy...
                  </div>
                ) : subjectUnits.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest bg-slate-50/50 dark:bg-[#283548]/10 border border-dashed border-slate-200 dark:border-[#334155] rounded-xl">
                    No curriculum units are currently mapped to this subject.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjectUnits.map((unit) => (
                      <details
                        key={unit.id}
                        className="group border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden"
                      >
                        <summary className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-[#283548]/20 cursor-pointer select-none">
                          <div className="min-w-0 flex-1 pr-4">
                            <h4 className="text-xs font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1">
                              UNIT - {unit.lesson_count} Topics
                            </h4>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">
                              {unit.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="transition-transform group-open:rotate-180">
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            </span>
                          </div>
                        </summary>
                        <div className="p-4 border-t border-slate-100 dark:border-[#334155] space-y-3 bg-white dark:bg-[#1e293b]">
                          {unit.description && (
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-[#94a3b8] leading-relaxed mb-4">
                              {unit.description}
                            </p>
                          )}
                          <div className="space-y-2">
                            <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-[#64748b]">Topics covered:</h5>
                            {!unit.lessons || unit.lessons.length === 0 ? (
                              <p className="text-xs text-slate-400 font-bold italic">No topics defined in this unit yet.</p>
                            ) : (
                              unit.lessons.map((topic, index) => (
                                <div key={topic.id} className="flex items-start gap-3 bg-slate-50 dark:bg-[#283548]/20 border border-slate-100 dark:border-[#334155] p-3 rounded-lg">
                                  <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 text-[10px] font-black">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-[#e2e8f0] leading-snug">
                                      {topic.subTopic}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                      Expected Periods: {topic.expectedPeriods}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border border-slate-200 dark:border-[#334155] rounded-2xl p-8 bg-white dark:bg-[#1e293b] text-center">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-[#64748b] mb-3" />
              <p className="text-xs font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest">
                Select a subject from the list to view breakdown and participants.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Add/Edit Subject */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between bg-slate-50/50 dark:bg-[#283548]/35">
              <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight uppercase">
                {editingId ? 'Edit Subject' : 'Add Subject'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider mb-1.5">Subject Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); clearFieldError('name'); }}
                  placeholder="e.g. Physics, Robotics"
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                />
                <FieldError message={formErrors.name} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider mb-1.5">Grade Level</label>
                <GradeLevelSelect
                  value={formData.grade_level_id}
                  onChange={(value) => { setFormData(prev => ({ ...prev, grade_level_id: value })); clearFieldError('grade_level_id'); }}
                  source="master"
                  valueAs="id"
                  placeholder="Select Grade Level"
                  className="w-full px-3 pr-9 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer"
                />
                <FieldError message={formErrors.grade_level_id} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => { setFormData(prev => ({ ...prev, description: e.target.value })); clearFieldError('description'); }}
                  placeholder="Describe the subject goals or topics..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none"
                />
                <FieldError message={formErrors.description} />
              </div>

              {editingId && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-slate-600 dark:text-[#e2e8f0] cursor-pointer">
                    Subject is Active and available
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#283548] mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#283548] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Teachers */}
      {showAssignTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between bg-slate-50/50 dark:bg-[#283548]/35">
              <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight uppercase">
                Assign Teachers
              </h3>
              <button onClick={() => setShowAssignTeacherModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-[#283548]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                <input
                  type="text"
                  value={peopleSearchTerm}
                  onChange={(e) => setPeopleSearchTerm(e.target.value)}
                  placeholder="Search teachers by name..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100 dark:divide-[#283548]">
              {allTeachers
                .filter(t => t.name.toLowerCase().includes(peopleSearchTerm.toLowerCase()))
                .map(teacher => {
                  const selected = selectedPeopleIds.includes(teacher.id);
                  return (
                    <div
                      key={teacher.id}
                      onClick={() => togglePersonSelection(teacher.id)}
                      className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#283548]/20 px-2 rounded-lg transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-[#e2e8f0]">{teacher.name}</span>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-[#475569]'}`}>
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-[#283548] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAssignTeacherModal(false)}
                className="px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#283548] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTeachersAssignment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Assign Students */}
      {showAssignStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between bg-slate-50/50 dark:bg-[#283548]/35">
              <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight uppercase">
                Assign Students
              </h3>
              <button onClick={() => setShowAssignStudentModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-[#283548]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                <input
                  type="text"
                  value={peopleSearchTerm}
                  onChange={(e) => setPeopleSearchTerm(e.target.value)}
                  placeholder="Search students by name..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100 dark:divide-[#283548]">
              {allStudents
                .filter(s => s.name.toLowerCase().includes(peopleSearchTerm.toLowerCase()))
                .map(student => {
                  const selected = selectedPeopleIds.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => togglePersonSelection(student.id)}
                      className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#283548]/20 px-2 rounded-lg transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-[#e2e8f0]">{student.name}</span>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-[#475569]'}`}>
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-[#283548] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAssignStudentModal(false)}
                className="px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#283548] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStudentsAssignment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm"
              >
                Save
              </button>
            </div>
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

export default Subjects;
