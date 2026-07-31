import React, { useEffect, useState } from 'react';
import { 
  HelpCircle, MessageSquare, Clock, CheckCircle2, AlertCircle, 
  ChevronRight, X, Image as ImageIcon, Send, Loader2, BookOpen, Search, User, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

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

const TeacherDoubtHub: React.FC = () => {
  const [doubts, setDoubts] = useState<DoubtListItem[]>([]);
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtDetails | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [closingDoubt, setClosingDoubt] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('Open'); // default to Open/pending doubts
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Form State
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchGradeDoubts();
  }, []);

  const fetchGradeDoubts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doubts/grade');
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
      toast.error('Failed to load doubts for your class.');
    } finally {
      setLoading(false);
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
      setReplyText(mapped.teacherReply || '');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load doubt details.');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoubt) return;
    if (!replyText.trim()) {
      toast.error('Please enter a response.');
      return;
    }

    setSubmittingReply(true);
    try {
      await api.put(`/doubts/${selectedDoubt.id}/reply`, {
        reply: replyText.trim()
      });
      toast.success('Reply submitted successfully!');
      
      // Refresh current details
      viewDoubtDetails(selectedDoubt.id);
      
      // Refresh list
      fetchGradeDoubts();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to submit reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCloseDoubt = async () => {
    if (!selectedDoubt) return;
    if (!confirm('Are you sure you want to mark this doubt as resolved and close it?')) return;

    setClosingDoubt(true);
    try {
      await api.put(`/doubts/${selectedDoubt.id}/close`);
      toast.success('Doubt marked as resolved.');
      
      // Refresh details
      viewDoubtDetails(selectedDoubt.id);
      
      // Refresh list
      fetchGradeDoubts();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to close doubt.');
    } finally {
      setClosingDoubt(false);
    }
  };

  // Filters and search logic
  const filteredDoubts = doubts.filter(d => {
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesSearch = 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.lessonTitle && d.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Doubt Resolution Hub</h1>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Respond to questions submitted by students in your assigned grade and mark them resolved.
          </p>
        </div>
        <div>
          <button
            onClick={fetchGradeDoubts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-[#1e293b] dark:hover:bg-[#283548] text-slate-700 dark:text-[#cbd5e1] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Refresh List
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Doubt management */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls Bar: Search & Status Filters */}
          <div className="grid sm:grid-cols-2 gap-3 bg-white dark:bg-[#1e293b] p-3 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student, topic, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#283548]/40 border border-slate-200/60 dark:border-[#334155] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-850 dark:text-white placeholder:text-slate-450 focus:outline-hidden focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex bg-slate-50 dark:bg-[#283548]/30 p-1 rounded-xl border border-slate-200/50 dark:border-[#334155]/50">
              {['All', 'Open', 'Answered', 'Closed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-white dark:bg-[#1e293b] text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-850'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs">
              <Loader2 size={36} className="animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : filteredDoubts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] shadow-xs space-y-4">
              <MessageSquare size={48} className="mx-auto text-slate-350 dark:text-slate-650 opacity-60" />
              <div className="max-w-xs mx-auto">
                <p className="font-extrabold text-slate-800 dark:text-white text-base">No doubts found</p>
                <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1">
                  {statusFilter === 'Open'
                    ? "Hooray! No pending doubts from your students. You are all caught up!"
                    : "No student doubts match the current filters."}
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
                      ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 dark:ring-indigo-400/20' 
                      : 'border-slate-200/80 dark:border-[#334155] hover:border-slate-350 dark:hover:border-[#475569]'
                  } p-5 rounded-2xl shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        d.status === 'Open'
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200'
                          : d.status === 'Answered'
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200'
                          : 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-[#94a3b8] border border-slate-200'
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
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-[#cbd5e1]">
                      <span className="inline-flex items-center gap-1">
                        <User size={10} />
                        {d.studentName}
                      </span>
                      <span>•</span>
                      <span>{d.gradeName} {d.sectionName ? ` - ${d.sectionName}` : ''}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-400">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-slate-400 hidden md:block" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Resolve doubts details + reply pane */}
        <div className="lg:sticky lg:top-8 space-y-4">
          {selectedDoubt ? (
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in relative overflow-hidden">
              
              <div className="flex justify-between items-start">
                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedDoubt.status === 'Open'
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200'
                    : selectedDoubt.status === 'Answered'
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200'
                    : 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-[#94a3b8] border border-slate-200'
                }`}>
                  {selectedDoubt.status}
                </span>
                <button
                  onClick={() => setSelectedDoubt(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-[#283548] rounded-lg text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Student Metadata */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#283548]/30 p-3 rounded-2xl border border-slate-100 dark:border-[#334155]/60">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  {selectedDoubt.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white text-xs">{selectedDoubt.studentName}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-[#94a3b8] font-semibold mt-0.5">
                    {selectedDoubt.gradeName} {selectedDoubt.sectionName ? ` - ${selectedDoubt.sectionName}` : ''}
                  </p>
                </div>
              </div>

              {/* Title & Topic */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">{selectedDoubt.title}</h3>
                {selectedDoubt.lessonTitle && (
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    Topic: {selectedDoubt.moduleName} - {selectedDoubt.lessonTitle}
                  </p>
                )}
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748b]">
                  Submitted {new Date(selectedDoubt.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Description */}
              <div className="bg-slate-50 dark:bg-[#283548]/40 border border-slate-100 dark:border-[#334155]/60 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Student Explanation</p>
                <p className="text-xs text-slate-700 dark:text-[#cbd5e1] whitespace-pre-line leading-relaxed font-semibold">
                  {selectedDoubt.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedDoubt.screenshotUrl && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Attached Screenshot</p>
                  <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#283548] p-1 flex justify-center">
                    <img 
                      src={selectedDoubt.screenshotUrl} 
                      alt="Student attachment" 
                      className="w-full object-contain max-h-56 mx-auto rounded-xl hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                </div>
              )}

              {/* Action Panels */}
              {selectedDoubt.status !== 'Closed' ? (
                <div className="border-t border-slate-100 dark:border-[#283548] pt-4 space-y-4">
                  {/* Reply Form */}
                  <form onSubmit={handleReplySubmit} className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-[#64748b] tracking-wider">Your Response / Answer</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Type your explanation, hints or python code details to guide the student..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-2xl p-3.5 text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 transition-all resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingReply}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-60 active:scale-98"
                      >
                        {submittingReply ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        <span>{selectedDoubt.teacherReply ? 'Update Response' : 'Send Response'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseDoubt}
                        disabled={closingDoubt}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-[#cbd5e1] rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-slate-200 dark:border-[#334155] cursor-pointer disabled:opacity-60"
                      >
                        {closingDoubt ? 'Closing...' : 'Close Doubt'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="border-t border-slate-100 dark:border-[#283548] pt-4 space-y-4">
                  {selectedDoubt.teacherReply && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Final Resolution Reply</p>
                      <p className="text-xs text-slate-700 dark:text-[#cbd5e1] font-semibold whitespace-pre-line leading-relaxed">
                        {selectedDoubt.teacherReply}
                      </p>
                      <div className="flex justify-between items-center text-[9px] text-emerald-700 dark:text-emerald-400 font-bold border-t border-emerald-100/50 dark:border-emerald-500/10 pt-2 mt-2">
                        <span>Answered by: {selectedDoubt.repliedByTeacher}</span>
                        <span>{selectedDoubt.repliedAt && new Date(selectedDoubt.repliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-100 dark:bg-slate-800/40 rounded-xl p-3.5 text-[10px] font-black text-slate-500 dark:text-[#cbd5e1] text-center border border-slate-250/20">
                    This doubt has been marked resolved and closed.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#283548]/20 border border-slate-200/50 dark:border-[#334155]/50 rounded-2xl p-8 text-center space-y-3">
              <MessageSquare size={36} className="mx-auto text-slate-350 dark:text-slate-650 opacity-60" />
              <p className="text-xs font-bold text-slate-450 dark:text-slate-550 max-w-xs mx-auto">
                Select a doubt from the list to view the description, student screenshots, and submit a reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDoubtHub;
