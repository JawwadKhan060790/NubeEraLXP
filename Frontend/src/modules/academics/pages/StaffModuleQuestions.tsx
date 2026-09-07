import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Edit, Search, Trash2, X, LayoutGrid, List, HelpCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import Pagination from '@/components/Pagination';
import ConfirmModal from '@/components/ConfirmModal';
import { useConfirm } from '@/hooks/useConfirm';
import FieldError from '@/components/FieldError';
import GradeLevelSelect from '@/components/GradeLevelSelect';
import { parseApiErrors } from '@/utils/errorParser';

interface QuestionData {
  id: string;
  exam_id: string;
  exam_title?: string;
  grade_id?: string;
  grade_name?: string;
  module_id?: string;
  module_name?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  is_active: boolean;
}

interface Module {
  id: string;
  name: string;
  grade_level_id: string;
}

interface Exam {
  id: string;
  title: string;
  module_id: string;
}

const StaffModuleQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState({
    exam_id: '',
    grade_id: '',
    module_id: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: ''
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

  const location = useLocation();

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create' || location.pathname.includes('/create')) {
      setView('create');
    }
  }, [location]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [questionsRes, modulesRes, examsRes] = await Promise.allSettled([
        api.get('/questions'),
        api.get('/modules'),
        api.get('/exams')
      ]);

      if (questionsRes.status === 'fulfilled') setQuestions(questionsRes.value.data);
      if (modulesRes.status === 'fulfilled') {
        setModules(modulesRes.value.data);
        setFilteredModules(modulesRes.value.data);
      }
      if (examsRes.status === 'fulfilled') {
        setExams(examsRes.value.data);
        setFilteredExams(examsRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Units are school-agnostic master content keyed only by GradeLevelId — narrow
  // the Unit dropdown to the selected grade level (no per-school Grade involved).
  const handleGradeChange = (gradeLevelId: string) => {
    setFormData(prev => ({ ...prev, grade_id: gradeLevelId, module_id: '', exam_id: '' }));
    setFilteredModules(modules.filter(m => m.grade_level_id === gradeLevelId));
    setFilteredExams([]);
  };

  const handleModuleChange = (moduleId: string) => {
    setFormData(prev => ({ ...prev, module_id: moduleId, exam_id: '' }));
    setFilteredExams(exams.filter(e => e.module_id === moduleId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.question_text.trim()) { errors.question_text = 'Enter question'; }
    if (!formData.correct_answer) { errors.correct_answer = 'Select correct answer'; }
    if (!formData.option_a.trim()) { errors.option_a = 'Enter Option A'; }
    if (!formData.option_b.trim()) { errors.option_b = 'Enter Option B'; }
    if (!formData.option_c.trim()) { errors.option_c = 'Enter Option C'; }
    if (!formData.option_d.trim()) { errors.option_d = 'Enter Option D'; }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      ...formData,
      exam_id: formData.exam_id || null,
      module_id: formData.module_id || null,
    };

    try {
      if (editingId) {
        await api.put(`/questions/${editingId}`, payload);
        toast.success('Saved');
      } else {
        await api.post('/questions', payload);
        toast.success('Added');
      }
      setView('list');
      fetchData();
    } catch (error) {
      console.error('Save failed', error);
      const errorsMap = parseApiErrors(error);
      setFormErrors(errorsMap);
      if (errorsMap._form) {
        toast.error(errorsMap._form);
      }
    }
  };

  const handleEdit = (q: QuestionData) => {
    const exam = exams.find(e => e.id === q.exam_id);
    const module = modules.find(m => m.id === (exam?.module_id || q.module_id));
    const gradeId = module?.grade_level_id || q.grade_id || '';
    const moduleId = module?.id || q.module_id || '';

    if (gradeId) setFilteredModules(modules.filter(m => m.grade_level_id === gradeId));
    if (moduleId) setFilteredExams(exams.filter(e => e.module_id === moduleId));

    setEditingId(q.id);
    setFormData({
      exam_id: q.exam_id,
      grade_id: gradeId,
      module_id: moduleId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer
    });
    setFormErrors({});
    setView('create');
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string) => {
    const ok = await requestConfirm({ title: 'Delete MCQ', message: 'Do you want to delete this MCQ?', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/questions/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Failed');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ exam_id: '', grade_id: '', module_id: '', question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '' });
    setFormErrors({});
  };

  const filteredQuestions = questions.filter(q =>
    q.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.module_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (viewMode === 'grid') {
      setPageSize(6);
    } else {
      setPageSize(10);
    }
    setCurrentPage(1);
  }, [viewMode]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          {view === 'list' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#64748b] w-3.5 h-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search MCQs..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-xs outline-none focus:border-primary transition-all font-medium shadow-sm dark:text-[#e2e8f0]"
              />
            </div>
          )}

          {/* Grid / List View Toggle Switch */}
          {view === 'list' && (
            <div className="flex items-center bg-gray-100 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-[4px] p-0.5 shadow-sm self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'grid'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-400 dark:text-[#64748b] hover:text-slate-600 dark:hover:text-[#cbd5e1]'
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-[4px] transition-all ${viewMode === 'list'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-400 dark:text-[#64748b] hover:text-slate-600 dark:hover:text-[#cbd5e1]'
                  }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 self-end sm:self-auto">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-[4px] text-xs font-bold transition-all shadow-sm ${view === 'list' ? 'bg-primary text-white' : 'bg-white dark:bg-[#1e293b] text-gray-500 dark:text-[#94a3b8] border border-gray-200 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#283548]'}`}
          >
            List View
          </button>
          <button
            onClick={() => { resetForm(); setView('create'); }}
            className={`px-4 py-2 rounded-[4px] text-xs font-bold transition-all shadow-sm ${view === 'create' ? 'bg-primary text-white' : 'bg-white dark:bg-[#1e293b] text-gray-500 dark:text-[#94a3b8] border border-gray-200 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#283548]'}`}
          >
            + Add MCQ
          </button>
        </div>
      </div>

      {view === 'list' ? (
        loading ? (
          <div className="p-12 text-center bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[10px] shadow-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 dark:text-[#94a3b8] mt-2 text-[10px] font-bold uppercase tracking-widest text-xs">Loading MCQs...</p>
          </div>
        ) : paginatedQuestions.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[10px] shadow-sm">
            <HelpCircle className="w-12 h-12 text-gray-300 dark:text-[#475569] mx-auto mb-3" />
            <p className="text-gray-500 dark:text-[#94a3b8] text-xs font-bold uppercase tracking-widest">No MCQs found</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID CARD VIEW */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[10px] shadow-sm hover:shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all flex flex-col justify-between p-5 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />

                  <div className="space-y-4 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-[4px] self-start uppercase">
                          {q.grade_name || 'General Grade'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold uppercase italic truncate max-w-[150px]">
                          {q.module_name || 'General Unit'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-400/25 rounded-[4px] text-[8px] font-black uppercase tracking-wider">
                        Ans: {q.correct_answer}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug min-h-[3rem] line-clamp-3">
                      {q.question_text}
                    </p>

                    {/* Option Previews */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 dark:text-[#94a3b8] pt-1">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const textKey = `option_${opt.toLowerCase()}` as keyof QuestionData;
                        const isCorrect = q.correct_answer === opt;
                        return (
                          <div
                            key={opt}
                            className={`p-2 border rounded-[4px] truncate flex items-center gap-1.5 ${isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/25 font-black'
                                : 'bg-slate-50 dark:bg-[#283548] text-slate-600 dark:text-[#cbd5e1] border-slate-100 dark:border-[#334155]'
                              }`}
                          >
                            <span className="opacity-60">{opt}:</span>
                            <span className="truncate">{String(q[textKey])}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-[#283548] mt-5 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(q)}
                      className="bg-slate-50 dark:bg-[#283548] hover:bg-primary/10 hover:text-primary border border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94a3b8] rounded-[4px] p-2 transition-all cursor-pointer"
                      title="Edit MCQ"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border border-rose-100 dark:border-rose-400/25 text-rose-600 dark:text-rose-300 rounded-[4px] p-2 transition-all cursor-pointer"
                      title="Remove MCQ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination for Grid view */}
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[10px] overflow-hidden shadow-sm">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredQuestions.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        ) : (
          /* LIST TABLE VIEW */
          <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[10px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Grade & Unit</th>
                    <th>Question Context</th>
                    <th>Correct Option</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuestions.map((q) => (
                    <tr key={q.id} className="group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-tight">{q.grade_name}</span>
                          <span className="text-[10px] text-gray-400 dark:text-[#64748b] font-bold uppercase truncate max-w-[150px]">{q.module_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-md truncate">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{q.question_text}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-400/25 rounded-[4px] text-[10px] font-bold uppercase tracking-tight">Option {q.correct_answer}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="data-table-actions">
                          <button
                            onClick={() => handleEdit(q)}
                            className="action-btn action-btn-edit rounded-[4px]"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="action-btn action-btn-delete rounded-[4px]"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination for Table view */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredQuestions.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )
      ) : (
        /* MCQ CREATE/EDIT FORM */
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[10px] overflow-hidden shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{editingId ? 'Edit MCQ' : 'Add New MCQ'}</h2>
            <button onClick={() => setView('list')} className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-50 dark:bg-[#283548] text-gray-400 dark:text-[#64748b] hover:text-slate-600 dark:hover:text-[#cbd5e1] transition-all"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {formErrors._form && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formErrors._form}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Grade Level</label>
                <GradeLevelSelect
                  value={formData.grade_id}
                  onChange={(value) => handleGradeChange(value)}
                  source="master"
                  valueAs="id"
                  placeholder="Choose Grade Level"
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all cursor-pointer dark:text-[#e2e8f0]"
                />
                <FieldError message={formErrors.grade_id || formErrors.gradeId} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Unit</label>
                <select value={formData.module_id} onChange={e => handleModuleChange(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all cursor-pointer dark:text-[#e2e8f0]">
                  <option value="">Choose Unit</option>
                  {filteredModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <FieldError message={formErrors.module_id || formErrors.moduleId} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Test Name</label>
                <select value={formData.exam_id} onChange={e => setFormData(p => ({ ...p, exam_id: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all cursor-pointer font-semibold shadow-sm dark:text-[#e2e8f0]">
                  <option value="">Choose Test</option>
                  {filteredExams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                </select>
                <FieldError message={formErrors.exam_id || formErrors.examId} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Question Prompt Text</label>
              <textarea rows={3} value={formData.question_text} onChange={e => setFormData(p => ({ ...p, question_text: e.target.value }))} placeholder="Enter Question Prompt Text" className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all resize-none shadow-sm font-medium dark:text-[#e2e8f0]" />
              <FieldError message={formErrors.question_text || formErrors.questionText} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((key, idx) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Option {String.fromCharCode(65 + idx)}</label>
                  <input type="text" value={formData[key]} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))} placeholder={`Enter Option ${String.fromCharCode(65 + idx)}`} className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all shadow-sm font-medium dark:text-[#e2e8f0]" />
                  <FieldError message={formErrors[key]} />
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-gray-100 dark:border-[#283548]">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Correct Answer Option (Default is Option A)</label>
                <select value={formData.correct_answer} onChange={e => setFormData(p => ({ ...p, correct_answer: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-primary transition-all cursor-pointer font-bold text-emerald-700 dark:text-emerald-300">
                  <option value="">Choose Correct Option</option>
                  <option value="A">Option A (Option One)</option>
                  <option value="B">Option B (Option Two)</option>
                  <option value="C">Option C (Option Three)</option>
                  <option value="D">Option D (Option Four)</option>
                </select>
                <FieldError message={formErrors.correct_answer || formErrors.correctAnswer} />
              </div>
              <div className="flex-[2] flex gap-3 items-end">
                <button type="button" onClick={() => setView('list')} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-[#283548] text-gray-600 dark:text-[#cbd5e1] rounded-[4px] font-black text-xs transition-all active:scale-[0.98] hover:bg-gray-200 dark:hover:bg-[#334155]">Cancel</button>
                <button type="submit" className="flex-[2] px-4 py-3 bg-primary text-white rounded-[4px] font-black text-xs shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:scale-[1.02]">Save MCQ</button>
              </div>
            </div>
          </form>
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

export default StaffModuleQuestions;
