import api from '@/services/api';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MessageSquare, Plus,
  Send,
  Trash2,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface LessonDropdown {
  id: string;
  subTopic: string;
  moduleId: string;
  moduleName: string;
}

interface DoubtListItem {
  id: string;
  title: string;
  status: 'Open' | 'Answered' | 'Closed';
  studentName: string;
  schoolName: string;
  gradeName: string;
  sectionName?: string;
  lessonTitle?: string;
  moduleName?: string;
  screenshotUrl?: string;
  hasReply: boolean;
  createdAt: string;
}

interface DoubtDetails {
  id: string;
  title: string;
  description: string;
  screenshotUrl?: string;
  status: 'Open' | 'Answered' | 'Closed';
  studentId: string;
  studentName: string;
  studentEmail: string;
  schoolId: string;
  schoolName: string;
  gradeId: string;
  gradeName: string;
  sectionId?: string;
  sectionName?: string;
  lessonId?: string;
  lessonTitle?: string;
  moduleId?: string;
  moduleName?: string;
  teacherReply?: string;
  repliedAt?: string;
  repliedByTeacher?: string;
  createdAt: string;
  closedAt?: string;
}

const StudentDoubtHub: React.FC = () => {
  const [doubts, setDoubts] = useState<DoubtListItem[]>([]);
  const [lessons, setLessons] = useState<LessonDropdown[]>([]);
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtDetails | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');

  useEffect(() => {
    fetchMyDoubts();
    fetchLessons();
  }, []);

  const fetchMyDoubts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doubts/mine');
      const mapped = (res.data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        studentName: d.student_name || d.studentName,
        schoolName: d.school_name || d.schoolName,
        gradeName: d.grade_name || d.gradeName,
        sectionName: d.section_name || d.sectionName,
        lessonTitle: d.lesson_title || d.lessonTitle,
        moduleName: d.module_name || d.moduleName,
        screenshotUrl: d.screenshot_url || d.screenshotUrl,
        hasReply: d.has_reply !== undefined ? d.has_reply : d.hasReply,
        createdAt: d.created_at || d.createdAt,
      }));
      setDoubts(mapped);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load your doubts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await api.get('/doubts/lessons-for-grade');
      const mapped = (res.data || []).map((l: any) => ({
        id: l.id,
        subTopic: l.sub_topic || l.subTopic,
        moduleId: l.module_id || l.moduleId,
        moduleName: l.module_name || l.moduleName
      }));
      setLessons(mapped);
    } catch (err) {
      console.error('Failed to load lessons', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in both title and description.');
      return;
    }

    setSubmitting(true);
    try {
      let finalScreenshotUrl = '';

      if (screenshotFile) {
        finalScreenshotUrl = screenshotPreview;
      }

      await api.post('/doubts', {
        title: title.trim(),
        description: description.trim(),
        lessonId: lessonId ? lessonId : null,
        lesson_id: lessonId ? lessonId : null,
        screenshotUrl: finalScreenshotUrl || null,
        screenshot_url: finalScreenshotUrl || null
      });

      toast.success('Doubt submitted successfully!');
      setShowRaiseModal(false);
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedModuleId('');
      setLessonId('');
      setScreenshotFile(null);
      setScreenshotPreview('');
      
      // Refresh list
      fetchMyDoubts();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to submit doubt.');
    } finally {
      setSubmitting(false);
    }
  };

  const viewDoubtDetails = async (id: string) => {
    try {
      const res = await api.get(`/doubts/${id}`);
      const d = res.data;
      const mapped = {
        id: d.id,
        title: d.title,
        description: d.description,
        screenshotUrl: d.screenshot_url || d.screenshotUrl,
        status: d.status,
        studentId: d.student_id || d.studentId,
        studentName: d.student_name || d.studentName,
        studentEmail: d.student_email || d.studentEmail,
        schoolId: d.school_id || d.schoolId,
        schoolName: d.school_name || d.schoolName,
        gradeId: d.grade_id || d.gradeId,
        gradeName: d.grade_name || d.gradeName,
        sectionId: d.section_id || d.sectionId,
        sectionName: d.section_name || d.sectionName,
        lessonId: d.lesson_id || d.lessonId,
        lessonTitle: d.lesson_title || d.lessonTitle,
        moduleId: d.module_id || d.moduleId,
        moduleName: d.module_name || d.moduleName,
        teacherReply: d.teacher_reply || d.teacherReply,
        repliedAt: d.replied_at || d.repliedAt,
        repliedByTeacher: d.replied_by_teacher || d.repliedByTeacher,
        createdAt: d.created_at || d.createdAt,
        closedAt: d.closed_at || d.closedAt
      };
      setSelectedDoubt(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load doubt details.');
    }
  };

  const handleDeleteDoubt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this doubt?')) return;

    try {
      await api.delete(`/doubts/${id}`);
      toast.success('Doubt deleted successfully.');
      if (selectedDoubt?.id === id) {
        setSelectedDoubt(null);
      }
      fetchMyDoubts();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to delete doubt.');
    }
  };

  const filteredDoubts = doubts.filter(d => {
    if (statusFilter === 'All') return true;
    return d.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Student Doubt Hub</h1>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Ask questions, attach screenshots, and get replies from your teachers.
          </p>
        </div>
        <button
          onClick={() => setShowRaiseModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Raise a New Doubt
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Doubts list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#1e293b] p-2 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs">
            {['All', 'Open', 'Answered', 'Closed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-100 dark:bg-[#283548] text-indigo-600 dark:text-indigo-400 font-black'
                    : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-[#cbd5e1]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-[#334155] shadow-xs">
              <Loader2 size={36} className="animate-spin text-indigo-600" />
            </div>
          ) : filteredDoubts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-[#334155] shadow-xs space-y-4">
              <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 opacity-60" />
              <div className="max-w-xs mx-auto">
                <p className="font-extrabold text-slate-800 dark:text-white text-base">No doubts found</p>
                <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1">
                  {statusFilter === 'All' 
                    ? "You haven't raised any academic doubts yet. Feel free to ask your first question!"
                    : `No doubts match the status filter "${statusFilter}".`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDoubts.map(d => (
                <div
                  key={d.id}
                  onClick={() => viewDoubtDetails(d.id)}
                  className={`bg-white dark:bg-[#1e293b] border ${
                    selectedDoubt?.id === d.id 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                      : 'border-slate-200/80 dark:border-[#334155] hover:border-slate-300 dark:hover:border-[#475569]'
                  } p-5 rounded-2xl shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        d.status === 'Open'
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          : d.status === 'Answered'
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20'
                          : 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-[#94a3b8] border border-slate-200 dark:border-slate-500/20'
                      }`}>
                        {d.status === 'Open' ? <Clock size={10} /> : d.status === 'Answered' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        {d.status}
                      </span>
                      {d.lessonTitle && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-[#283548] text-slate-600 dark:text-[#cbd5e1] border border-slate-100 dark:border-[#334155]">
                          <BookOpen size={10} />
                          {d.moduleName}: {d.lessonTitle}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-snug">{d.title}</h3>
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748b]">
                      Asked on {new Date(d.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} at {new Date(d.createdAt).toLocaleTimeString('en-US', { timeStyle: 'short' })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-[#283548]">
                    {d.status === 'Open' && (
                      <button
                        onClick={(e) => handleDeleteDoubt(d.id, e)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                        title="Delete Doubt"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ChevronRight size={18} className="text-slate-400 hidden md:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Doubt Details view */}
        <div className="lg:sticky lg:top-8 space-y-4">
          {selectedDoubt ? (
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="p-5 space-y-5">
                <div className="flex justify-between items-start pt-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    selectedDoubt.status === 'Open'
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                      : selectedDoubt.status === 'Answered'
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20'
                      : 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-[#94a3b8] border border-slate-200 dark:border-slate-500/20'
                  }`}>
                    {selectedDoubt.status}
                  </span>
                  <button
                    onClick={() => setSelectedDoubt(null)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-[#283548] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white leading-snug">{selectedDoubt.title}</h2>
                  {selectedDoubt.lessonTitle && (
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      Topic: {selectedDoubt.moduleName} - {selectedDoubt.lessonTitle}
                    </p>
                  )}
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748b]">
                    Raised on {new Date(selectedDoubt.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#283548]/40 border border-slate-100 dark:border-[#334155]/60 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Description</p>
                  <p className="text-xs text-slate-700 dark:text-[#cbd5e1] whitespace-pre-line leading-relaxed font-semibold">
                    {selectedDoubt.description}
                  </p>
                </div>

                {selectedDoubt.screenshotUrl && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Attachment</p>
                    <div className="border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden bg-slate-50 dark:bg-[#283548] group relative">
                      <img 
                        src={selectedDoubt.screenshotUrl} 
                        alt="Doubt screenshot" 
                        className="w-full object-contain max-h-56 mx-auto transition-transform hover:scale-[1.02] duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Reply Section */}
                <div className="border-t border-slate-100 dark:border-[#283548] pt-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Teacher Reply</p>
                  {selectedDoubt.teacherReply ? (
                    <div className="bg-green-50/50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/10 rounded-xl p-4 space-y-2">
                      <p className="text-xs text-slate-700 dark:text-[#cbd5e1] whitespace-pre-line leading-relaxed font-semibold">
                        {selectedDoubt.teacherReply}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-green-700 dark:text-green-400 font-bold border-t border-green-100/50 dark:border-green-500/10 pt-2 mt-2">
                        <span>By: {selectedDoubt.repliedByTeacher}</span>
                        <span>{selectedDoubt.repliedAt && new Date(selectedDoubt.repliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 dark:bg-[#283548]/30 rounded-xl border border-dashed border-slate-200 dark:border-[#334155]">
                      <Clock size={20} className="mx-auto text-slate-400 dark:text-slate-600 mb-1.5 opacity-60" />
                      <p className="text-[11px] font-bold text-slate-500 dark:text-[#94a3b8]">Waiting for teacher response...</p>
                    </div>
                  )}
                </div>

                {selectedDoubt.status === 'Closed' && selectedDoubt.closedAt && (
                  <div className="bg-slate-100 dark:bg-slate-800/40 rounded-xl p-3 text-[10px] font-extrabold text-slate-500 dark:text-[#94a3b8] text-center">
                    This doubt was marked resolved and closed on {new Date(selectedDoubt.closedAt).toLocaleDateString()}.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#283548]/20 border border-slate-200/50 dark:border-[#334155]/50 rounded-2xl p-8 text-center space-y-3">
              <MessageSquare size={36} className="mx-auto text-slate-300 dark:text-slate-600 opacity-60" />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                Select a doubt from the list to view full details, screenshot attachments, and replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Raise Doubt Modal */}
      {showRaiseModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-[10px] w-full max-w-lg overflow-hidden shadow-xl animate-in zoom-in slide-in-from-bottom-8 duration-300 flex flex-col relative">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Raise a New Doubt</h2>
              <button 
                onClick={() => setShowRaiseModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-gray-100 dark:bg-[#283548] hover:bg-rose-50 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Confusion regarding variables assignment in Python"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-indigo-500 transition-all font-bold"
                />
              </div>

              {/* Unit Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Linked Unit / Module (Optional)</label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => {
                    setSelectedModuleId(e.target.value);
                    setLessonId(''); // Reset selected topic
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-indigo-500 transition-all font-bold cursor-pointer"
                >
                  <option value="">-- No Specific Unit (General Doubt) --</option>
                  {Array.from(
                    new Map(lessons.map(l => [l.moduleId, l.moduleName])).entries()
                  ).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Linked Topic / Lesson (Optional)</label>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  disabled={!selectedModuleId}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-indigo-500 transition-all font-bold cursor-pointer disabled:opacity-50"
                >
                  <option value="">-- No Specific Topic (General Doubt) --</option>
                  {lessons
                    .filter(l => l.moduleId === selectedModuleId)
                    .map(l => (
                      <option key={l.id} value={l.id}>
                        {l.subTopic}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your doubt here. Explain what you are trying to do, what you expected, and what actually happened..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-[4px] text-sm outline-none focus:border-indigo-500 transition-all resize-none shadow-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Attach Screenshot (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-[#475569] hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-[#283548]/30 rounded-xl px-4 py-3 cursor-pointer text-xs font-bold text-slate-600 dark:text-[#cbd5e1] transition-all flex-1">
                    <ImageIcon size={16} className="text-slate-400" />
                    <span>{screenshotFile ? 'Change Screenshot' : 'Upload Image (<2MB)'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                  {screenshotFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotFile(null);
                        setScreenshotPreview('');
                      }}
                      className="p-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all cursor-pointer border border-red-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {screenshotPreview && (
                  <div className="mt-3 border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden max-h-32 bg-slate-50 dark:bg-[#283548] p-2 flex justify-center animate-in zoom-in duration-200">
                    <img src={screenshotPreview} alt="Preview" className="max-h-28 object-contain" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#283548]">
                <button
                  type="button"
                  onClick={() => setShowRaiseModal(false)}
                  className="modal-btn-cancel"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="modal-btn-save font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Doubt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDoubtHub;
