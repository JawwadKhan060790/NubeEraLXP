import ConfirmModal from '@/components/ConfirmModal';
import ExportButton from '@/components/export/ExportButton';
import Pagination from '@/components/Pagination';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import { Award, BookOpen, Calendar, Check, ChevronDown, ChevronRight, Clock, Edit, Plus, Search, Trash, Trash2, Upload, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Exam {
  id: string;
  title: string;
  module_id: string;
  module_name?: string;
  grade_id: string;
  grade_name?: string;
  date: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  lesson_id?: string;
  lesson_name?: string;
}

interface Module {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  grade_name: string;
  grade_level?: number | string;
  school_id?: string;
}

interface SchoolData {
  id: string;
  name: string;
  from_grade?: number;
  to_grade?: number;
}

const Exams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Student Interactive Exam States
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submittingExam, setSubmittingExam] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);

  // Teacher Question Builder States
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [builderQuestions, setBuilderQuestions] = useState<any[]>([]);
  const [builderFormData, setBuilderFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A'
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      module_id: '',
      lesson_id: '',
      grade_id: '',
      school_id: '',
      date: '',
      duration_minutes: 60,
      total_marks: 100
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname.includes('/create') || params.get('action') === 'create') {
      resetForm();
      setShowModal(true);
    }
  }, [location]);

  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    module_id: '',
    lesson_id: '',
    grade_id: '',
    school_id: '',
    date: '',
    duration_minutes: 60,
    total_marks: 100
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const isAdmin = user?.utype === 'admin' || user?.utype === 'superadmin';
  const isPrincipal = user?.utype === 'principal';
  const isStaff = user?.utype === 'staff';
  const isTeacher = user?.utype === 'teacher';

  // School scoping for the Target Grade select: single-school roles inherit their
  // own school silently; multi-school roles pick one via the dropdown shown in the form.
  const activeSchoolId = user?.school_id || formData.school_id;
  const filteredGrades = useMemo<Grade[]>(() => {
    if (!activeSchoolId) return grades;
    const selectedSchool = schools.find(s => s.id === activeSchoolId);
    const schoolGrades = grades.filter(g => g.school_id === activeSchoolId || !g.school_id);
    if (!selectedSchool) return schoolGrades;
    const fromGrade = selectedSchool.from_grade !== undefined && selectedSchool.from_grade !== null ? selectedSchool.from_grade : -1;
    const toGrade = selectedSchool.to_grade !== undefined && selectedSchool.to_grade !== null ? selectedSchool.to_grade : 10;
    return schoolGrades.filter(g => {
      const lvl = parseInt(String(g.grade_level ?? ''), 10);
      if (isNaN(lvl)) return true;
      return lvl >= fromGrade && lvl <= toGrade;
    });
  }, [grades, schools, activeSchoolId]);

  useEffect(() => {
    fetchData();
  }, []);

  // Load lessons for the selected module on demand — avoids fetching all lessons at startup
  useEffect(() => {
    if (!formData.module_id) {
      setAllLessons([]);
      return;
    }
    api.get('/lessons/paged', {
      params: { pageSize: 200, 'Filters[ModuleId]': formData.module_id }
    }).then(res => {
      setAllLessons(res.data?.items || []);
    }).catch(() => setAllLessons([]));
  }, [formData.module_id]);

  const fetchData = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const canSeeAllSchools = ['admin', 'superadmin', 'principal', 'staff', 'teacher'].includes(currentUser.utype);

      const calls: Promise<any>[] = [api.get('/exams'), api.get('/modules'), api.get('/grades')];
      if (canSeeAllSchools) calls.push(api.get('/schools'));
      const results = await Promise.all(calls);
      const [examsRes, modulesRes, gradesRes] = results;

      let fetchedExams = examsRes.data;

      if (currentUser.utype === 'student') {
          const userGradeId = currentUser.grade_id || currentUser.gradeId || currentUser.GradeId;
          if (userGradeId && userGradeId !== '00000000-0000-0000-0000-000000000000') {
             const searchId = userGradeId.toString().toLowerCase().trim();
             fetchedExams = fetchedExams.filter((e: any) => {
                 const eGradeId = e.grade_id || e.gradeId || e.GradeId;
                 return eGradeId?.toString().toLowerCase().trim() === searchId;
             });
          } else {
             fetchedExams = [];
          }
      }

      setExams(fetchedExams);
      setModules(modulesRes.data);
      const sortedGrades = [...gradesRes.data].sort((a, b) => {
        const aVal = parseInt(a.grade_level, 10);
        const bVal = parseInt(b.grade_level, 10);
        const aNum = isNaN(aVal) ? 0 : aVal;
        const bNum = isNaN(bVal) ? 0 : bVal;
        if (aNum !== bNum) return aNum - bNum;
        return (a.grade_name || '').localeCompare(b.grade_name || '');
      });
      setGrades(sortedGrades);
      if (results[3]) setSchools(results[3].data || []);
      // allLessons is loaded on-demand when module is selected in the form (see module_id effect)

      if (fetchedExams.length > 0) {
        setSelectedExam(fetchedExams[0]);
      } else {
        setSelectedExam(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.module_id || !formData.grade_id) {
      toast.error('Select Grade and Unit');
      return;
    }

    const payload = {
      title: formData.title,
      module_id: formData.module_id,
      lesson_id: formData.lesson_id || null,
      grade_id: formData.grade_id,
      date: formData.date,
      duration_minutes: formData.duration_minutes,
      total_marks: formData.total_marks,
      school_id : activeSchoolId
    };

    try {
      if (editingId) {
        await api.put(`/exams/${editingId}`, payload);
        toast.success('Saved');
      } else {
        await api.post('/exams', payload);
        toast.success('MCQ Exam Created and Announced!');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id);
    const examGrade = grades.find(g => g.id === exam.grade_id);
    setFormData({
      title: exam.title,
      module_id: exam.module_id || '',
      lesson_id: exam.lesson_id || '',
      grade_id: exam.grade_id || '',
      school_id: examGrade?.school_id || '',
      date: exam.date?.split('Z')[0] || '',
      duration_minutes: exam.duration_minutes || 60,
      total_marks: exam.total_marks || 100
    });
    setShowModal(true);
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string, title: string) => {
    const ok = await requestConfirm({
      title: 'Delete MCQ',
      message: `Do you want to delete "${title}"?`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Student test taking helpers
  const handleTakeQuiz = async (exam: Exam) => {
    if (new Date(exam.date).getTime() > Date.now()) {
      toast.error(`This exam is scheduled for ${new Date(exam.date).toLocaleString()} and cannot be taken before that date.`);
      return;
    }
    setSelectedExam(exam);
    setLoadingQuestions(true);
    setStudentAnswers({});
    setExamResult(null);
    setShowQuizModal(true);
    try {
      // Use paged endpoint with ExamId filter instead of fetching all questions
      const res = await api.get('/questions/paged', {
        params: { pageSize: 200, 'Filters[ExamId]': exam.id }
      });
      const pagedData = res.data;
      setExamQuestions(pagedData.items || []);
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectStudentOption = (questionId: string, option: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmitStudentExam = async () => {
    if (!selectedExam) return;
    
    if (Object.keys(studentAnswers).length < examQuestions.length) {
      const confirmSubmit = await requestConfirm({
        title: 'Unanswered Questions',
        message: 'You have unanswered questions. Submit anyway?',
        variant: 'warning',
        confirmLabel: 'Submit Anyway'
      });
      if (!confirmSubmit) return;
    }

    setSubmittingExam(true);
    try {
      const submission = {
        answers: Object.keys(studentAnswers).map(qId => ({
          question_id: qId,
          selected_option: studentAnswers[qId]
        }))
      };

      const res = await api.post(`/exams/${selectedExam.id}/submit`, submission);
      setExamResult(res.data);
      toast.success('Exam graded successfully!');
      fetchData();
    } catch (error) {
      toast.error('Failed to score exam.');
    } finally {
      setSubmittingExam(false);
    }
  };

  // Teacher Question Builder helpers
  const handleOpenBuilder = async (exam: Exam) => {
    setSelectedExam(exam);
    setBuilderFormData({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A'
    });
    fetchBuilderQuestions(exam.id);
    setShowBuilderModal(true);
  };

  const fetchBuilderQuestions = async (examId: string) => {
    try {
      const res = await api.get('/questions/paged', {
        params: { pageSize: 200, 'Filters[ExamId]': examId }
      });
      setBuilderQuestions(res.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch questions for builder');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    try {
      const payload = {
        exam_id: selectedExam.id,
        question_text: builderFormData.question_text,
        option_a: builderFormData.option_a,
        option_b: builderFormData.option_b,
        option_c: builderFormData.option_c,
        option_d: builderFormData.option_d,
        correct_answer: builderFormData.correct_answer
      };

      await api.post('/questions', payload);
      toast.success('Question added successfully!');
      setBuilderFormData({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A'
      });
      fetchBuilderQuestions(selectedExam.id);
    } catch (error) {
      toast.error('Failed to add question');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!selectedExam) return;
    try {
      await api.delete(`/questions/${qId}`);
      toast.success('Question removed');
      fetchBuilderQuestions(selectedExam.id);
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };


  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(10);

  const filteredExams = useMemo(() => exams.filter(e =>
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.module_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [exams, searchTerm]);

  const examTotalPages = Math.max(1, Math.ceil(filteredExams.length / examPageSize));
  const pagedExams = useMemo(() =>
    filteredExams.slice((examPage - 1) * examPageSize, examPage * examPageSize),
    [filteredExams, examPage, examPageSize]
  );

  // Reset page when search changes
  useEffect(() => { setExamPage(1); }, [searchTerm]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingCount = exams.filter(e => new Date(e.date) >= today).length;
  const completedCount = exams.filter(e => new Date(e.date) < today).length;

  const examStats: StatItem[] = [
    { title: 'Total Exams', value: exams.length, icon: <BookOpen className="w-6 h-6" />, color: 'indigo', subtitle: 'All scheduled tests' },
    { title: 'Upcoming', value: upcomingCount, icon: <Clock className="w-6 h-6" />, color: 'emerald', subtitle: 'Scheduled ahead' },
    { title: 'Completed', value: completedCount, icon: <Check className="w-6 h-6" />, color: 'rose', subtitle: 'Already conducted' },
  ];

  // Sub-components
  const StatusBadge: React.FC<{ active: boolean; size?: 'sm' | 'md' }> = ({ active, size = 'sm' }) => (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Multiple-Choice Tests</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            {exams.length} Active Tests Published
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          {user?.utype !== 'student' && (
            <ExportButton endpoint="/exams/export" fallbackFileName="exams-export.xlsx" label="Export to Excel" />
          )}
          {user?.utype !== 'student' && (
            <button
              onClick={() => navigate('/import')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all outline-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import MCQs</span>
            </button>
          )}
          {user?.utype !== 'student' && (
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Test
            </button>
          )}
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatGrid stats={examStats} loading={loading} />
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 mt-2 text-[10px] font-bold uppercase tracking-widest text-xs">Querying Test Database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: Searchable list */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[680px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tests..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 min-h-[350px]">
              {pagedExams.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                  No tests found.
                </div>
              ) : (
                pagedExams.map((exam) => {
                  const isSelected = selectedExam?.id === exam.id;
                  const isUpcoming = new Date(exam.date) >= new Date();
                  const initials = exam.title.substring(0, 2).toUpperCase();
                  return (
                    <div
                      key={exam.id}
                      onClick={() => setSelectedExam(exam)}
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
                        <div className="text-xs font-black text-slate-800 dark:text-white tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {exam.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-semibold truncate mt-0.5">
                          {exam.grade_name || 'All Grades'} · {exam.module_name || 'General'}
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isUpcoming ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {isUpcoming ? 'Upcoming' : 'Done'}
                      </span>
                      {isSelected && <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <Pagination
                currentPage={examPage}
                totalPages={examTotalPages}
                pageSize={examPageSize}
                totalItems={filteredExams.length}
                onPageChange={setExamPage}
                onPageSizeChange={(s) => { setExamPageSize(s); setExamPage(1); }}
              />
            </div>
          </div>

          {/* RIGHT PANEL: Exam details & Actions */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {selectedExam ? (
              <div className="space-y-6">
                
                {/* Core Profile Card */}
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#283548]">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white border-2 border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center text-sm font-black uppercase flex-shrink-0 shadow-sm">
                        MCQ
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{selectedExam.title}</h2>
                        <div className="text-xs text-slate-500 font-medium mt-1">Grade Level: {selectedExam.grade_name || 'All Grades'}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {user?.utype === 'student' ? (
                        (() => {
                          const isFuture = new Date(selectedExam.date).getTime() > Date.now();
                          return (
                            <button
                              disabled={isFuture}
                              onClick={() => handleTakeQuiz(selectedExam)}
                              className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                                isFuture
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                              }`}
                              title={isFuture ? `Available on ${new Date(selectedExam.date).toLocaleString()}` : 'Start Exam'}
                            >
                              {isFuture ? 'Locked (Upcoming)' : 'Start Exam'}
                            </button>
                          );
                        })()
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenBuilder(selectedExam)}
                            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            title="Manage Questions"
                          >
                            Questions Builder
                          </button>
                          <button
                            onClick={() => handleEdit(selectedExam)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            title="Edit Exam"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(selectedExam.id, selectedExam.title)}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* MCQ Exam Parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Duration allowed", value: `${selectedExam.duration_minutes} Mins`, color: "text-primary", bg: "bg-primary/5", border: "border-primary/10" },
                      { label: "Maximum Marks", value: `${selectedExam.total_marks} Marks`, color: "text-indigo-600", bg: "bg-indigo-600/5", border: "border-indigo-600/10" },
                      { label: "Passing Marks", value: `${Math.round(selectedExam.total_marks * 0.4)} Marks (40%)`, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                    ].map((s) => (
                      <div key={s.label} className={`border ${s.border} ${s.bg} rounded-xl p-3 text-center`}>
                        <div className={`text-[11px] font-bold uppercase truncate ${s.color}`}>{s.value}</div>
                        <div className="text-[8.5px] text-slate-400 font-bold uppercase tracking-widest mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Scheduled date/time */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-semibold text-slate-600 space-y-2">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Evaluation release window</div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        {new Date(selectedExam.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(selectedExam.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  </div>{/* end p-5 */}
                </div>{/* end card */}

              </div>
            ) : (
              <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Select an MCQ exam to view details</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* STUDENT INTERACTIVE EXAM RUNNER & RESULT POPUP */}
      {showQuizModal && selectedExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-3xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#1e293b]">
              <div>
                <span className="text-[9px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">Unit MCQ Evaluation</span>
                <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight pt-1">
                  {selectedExam.title}
                </h2>
              </div>
              {!examResult && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await requestConfirm({
                      title: 'Cancel Exam',
                      message: 'Cancel Exam? Progress will be lost.',
                      variant: 'danger',
                      confirmLabel: 'Yes, Cancel'
                    });
                    if (ok) setShowQuizModal(false);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {loadingQuestions ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : examQuestions.length === 0 ? (
                <div className="text-center py-20 opacity-50 italic text-sm font-bold uppercase tracking-wider">No Questions in this MCQ Exam.</div>
              ) : examResult ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-6 text-center text-slate-800 dark:text-white">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${examResult.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Award className="w-10 h-10 animate-bounce" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">
                      {examResult.passed ? '🎉 Congratulations! You Passed!' : '⚠️ Learning Focus Needed'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#64748b] font-semibold uppercase tracking-wider">
                      Your test answers were scored instantly!
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#283548]/30 rounded-2xl p-6 border border-slate-100 dark:border-[#283548] w-full max-w-md grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider">Score</span>
                      <span className="text-3xl font-black text-slate-800 dark:text-white pt-1">{examResult.obtained_marks} / {examResult.total_marks}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider">Grade</span>
                      <span className={`text-3xl font-black pt-1 ${examResult.passed ? 'text-emerald-600' : 'text-rose-600'}`}>{examResult.grade}</span>
                    </div>
                  </div>

                  <div className="w-full text-left space-y-3 pt-6 border-t border-slate-100 dark:border-[#283548]">
                    <h4 className="text-xs font-black uppercase text-slate-400 dark:text-[#64748b] tracking-widest pl-1">Detailed Question Breakdown</h4>
                    {examQuestions.map((q, idx) => {
                      const selectedOpt = studentAnswers[q.id];
                      const correctOpt = q.correct_answer || q.correctAnswer;
                      const isCorrect = selectedOpt === correctOpt;
                      return (
                        <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50/50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'} space-y-1.5 text-xs font-semibold`}>
                          <p className="text-slate-800 dark:text-white font-extrabold">Q{idx+1}. {q.question_text || q.questionText}</p>
                          <div className="flex gap-4">
                            <span>Your Answer: <strong className={isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{selectedOpt || 'None'}</strong></span>
                            <span>Correct Answer: <strong className="text-emerald-700 dark:text-emerald-400">{correctOpt}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setShowQuizModal(false)}
                    className="bg-primary text-white hover:bg-primary/95 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all w-full max-w-xs cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {examQuestions.map((q, idx) => (
                    <div key={q.id} className="space-y-4 p-5 bg-slate-50/50 dark:bg-[#283548]/30 rounded-2xl border border-slate-100 dark:border-[#283548]">
                      <h4 className="font-extrabold text-slate-800 dark:text-white text-sm md:text-base flex gap-2">
                        <span className="text-primary font-black">Q{idx + 1}.</span>
                        {q.question_text}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {[
                          { key: 'A', text: q.option_a },
                          { key: 'B', text: q.option_b },
                          { key: 'C', text: q.option_c },
                          { key: 'D', text: q.option_d }
                        ].map((opt) => {
                          const isSelected = studentAnswers[q.id] === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => handleSelectStudentOption(q.id, opt.key)}
                              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-primary/5 border-primary text-primary font-extrabold shadow-sm'
                                  : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#283548] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-[#64748b]'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black transition-all ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-[#283548] text-slate-400'}`}>{opt.key}</span>
                              <span className="text-xs md:text-sm font-medium">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!examResult && examQuestions.length > 0 && (
              <div className="flex-shrink-0 border-t border-slate-100 dark:border-[#283548] bg-slate-50 dark:bg-[#283548]/30 px-6 py-4 flex items-center justify-between z-10 bg-white dark:bg-[#1e293b]">
                <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider">
                  Answered: {Object.keys(studentAnswers).length} / {examQuestions.length} Questions
                </span>
                <button
                  type="button"
                  onClick={handleSubmitStudentExam}
                  disabled={submittingExam}
                  className="bg-primary text-white hover:bg-primary/95 disabled:bg-slate-300 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {submittingExam ? 'Submitting Answers...' : 'Submit Answers'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEACHER MCQ QUESTION BUILDER MODAL */}
      {showBuilderModal && selectedExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-4xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#1e293b]">
              <div>
                <span className="text-[9px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">Multiple-Choice Test Builder</span>
                <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight pt-1">
                  Manage Questions - {selectedExam.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              <form onSubmit={handleAddQuestion} className="bg-slate-50 dark:bg-[#283548]/30 border border-slate-200/60 dark:border-[#283548] rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest mb-2">➕ Add New Question</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Question Prompt Text</label>
                  <textarea
                    required
                    rows={2}
                    value={builderFormData.question_text}
                    onChange={e => setBuilderFormData({...builderFormData, question_text: e.target.value})}
                    placeholder="Enter Question Prompt Text"
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Option A (Option One)</label>
                    <input
                      type="text"
                      required
                      value={builderFormData.option_a}
                      onChange={e => setBuilderFormData({...builderFormData, option_a: e.target.value})}
                      placeholder="Enter Option A"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Option B (Option Two)</label>
                    <input
                      type="text"
                      required
                      value={builderFormData.option_b}
                      onChange={e => setBuilderFormData({...builderFormData, option_b: e.target.value})}
                      placeholder="Enter Option B"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Option C (Option Three)</label>
                    <input
                      type="text"
                      required
                      value={builderFormData.option_c}
                      onChange={e => setBuilderFormData({...builderFormData, option_c: e.target.value})}
                      placeholder="Enter Option C"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Option D (Option Four)</label>
                    <input
                      type="text"
                      required
                      value={builderFormData.option_d}
                      onChange={e => setBuilderFormData({...builderFormData, option_d: e.target.value})}
                      placeholder="Enter Option D"
                      className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Correct Answer</label>
                    <div className="relative">
                      <select
                        required
                        value={builderFormData.correct_answer}
                        onChange={e => setBuilderFormData({...builderFormData, correct_answer: e.target.value})}
                        className="w-full pl-4 pr-10 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs font-bold outline-none focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        <option value="A">Option A (Option One)</option>
                        <option value="B">Option B (Option Two)</option>
                        <option value="C">Option C (Option Three)</option>
                        <option value="D">Option D (Option Four)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/95 text-white py-3 rounded-lg font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question to Exam
                  </button>
                </div>
              </form>

              {/* Questions Listing */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 dark:text-[#64748b] tracking-widest pl-1">
                  Active Questions Checklist ({builderQuestions.length})
                </h3>
                {builderQuestions.length === 0 ? (
                  <p className="text-center py-10 opacity-50 italic text-xs font-bold uppercase tracking-widest text-slate-400">No questions added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {builderQuestions.map((q, idx) => (
                      <div key={q.id} className="p-5 rounded-2xl border border-slate-200/60 dark:border-[#283548] bg-white dark:bg-[#1e293b] shadow-sm flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-white">
                            Q{idx + 1}. {q.question_text}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {['A', 'B', 'C', 'D'].map(opt => {
                              const isCorrect = q.correct_answer === opt;
                              return (
                                <div key={opt} className={`px-3 py-2 rounded-lg border text-[11px] font-semibold flex items-center justify-between ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-[#283548]/30 border-slate-100 dark:border-[#283548] text-slate-600 dark:text-slate-300'}`}>
                                  <span>{opt}. {q[`option_${opt.toLowerCase()}`] || q[`option${opt}`]}</span>
                                  {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-100 dark:border-rose-500/20 text-rose-600 rounded-lg p-2 transition-all cursor-pointer flex-shrink-0"
                          title="Delete Question"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-[#283548] bg-slate-50 dark:bg-[#283548]/30 px-6 py-4 flex items-center justify-end gap-3 z-10 bg-white dark:bg-[#1e293b]">
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="modal-btn-cancel"
              >
                <X className="w-3.5 h-3.5" />
                Close Question Builder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MCQ DETAILS FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-lg overflow-hidden shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 bg-white dark:bg-[#1e293b]">
              <div>
                <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {editingId ? 'Edit Multiple-Choice Test' : 'Create New Multiple-Choice Test'}
                </h2>
                <p className="text-xs text-gray-400 dark:text-[#64748b] font-bold uppercase tracking-widest mt-1">Announce test and schedules</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Test Name</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter Test Name"
                  className="w-full px-4 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                />
              </div>

              {(isAdmin || isPrincipal || isStaff || isTeacher) && !user?.school_id && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Assigned Institution</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.school_id}
                      onChange={e => setFormData({...formData, school_id: e.target.value, grade_id: ''})}
                      className="w-full pl-4 pr-10 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs font-bold outline-none focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
                    >
                      <option value="">Select School</option>
                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Target Grade</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.grade_id}
                      onChange={e => setFormData({...formData, grade_id: e.target.value})}
                      disabled={!activeSchoolId}
                      className="w-full pl-4 pr-10 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs font-bold outline-none focus:border-primary transition-all cursor-pointer appearance-none shadow-sm disabled:bg-gray-50 dark:disabled:bg-[#1e293b]/50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">{activeSchoolId ? 'Select Grade' : 'Select school first'}</option>
                      {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.grade_name || `Grade ${g.grade_level}`}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Module Unit</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.module_id}
                      onChange={e => setFormData({...formData, module_id: e.target.value, lesson_id: ''})}
                      className="w-full pl-4 pr-10 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs font-bold outline-none focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
                    >
                      <option value="">Select Unit</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Chapter / Topic</label>
                  <div className="relative">
                    <select
                      value={formData.lesson_id}
                      onChange={e => setFormData({...formData, lesson_id: e.target.value})}
                      className="w-full pl-4 pr-10 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs font-bold outline-none focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
                    >
                      <option value="">Select Topic (Optional)</option>
                      {allLessons.filter(l => l.module_id === formData.module_id).map(l => <option key={l.id} value={l.id}>{l.sub_topic}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.duration_minutes}
                    onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 60})}
                    className="w-full px-4 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Total Marks</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.total_marks}
                    onChange={e => setFormData({...formData, total_marks: parseInt(e.target.value) || 100})}
                    className="w-full px-4 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Release Date & Time</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="datetime-local"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#283548]/30 border border-gray-200 dark:border-[#283548] text-slate-800 dark:text-white rounded-lg text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-slate-100 dark:border-[#283548] bg-slate-50 dark:bg-[#283548]/30 px-6 py-4 flex items-center justify-end gap-3 z-10 bg-white dark:bg-[#1e293b]">
              <button type="button" onClick={() => setShowModal(false)} className="modal-btn-cancel">
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button type="submit" className="modal-btn-save">
                <Check className="w-3.5 h-3.5" />
                Save MCQ
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title || ''}
        message={confirmState.message}
        onConfirm={() => confirmState.resolve?.(true)}
        onCancel={() => confirmState.resolve?.(false)}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
      />
    </div>
  );
};

export default Exams;
