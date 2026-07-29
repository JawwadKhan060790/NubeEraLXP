import api from '@/services/api';
import {
  Building2, ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface School {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  grade_name: string;
}

interface Section {
  id: string;
  sectionCode: string;
  sectionName?: string;
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

const AdminDoubtHub: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [items, setItems] = useState<DoubtListItem[]>([]);

  // UI loading
  const [loading, setLoading] = useState<boolean>(false);
  const [closingDoubt, setClosingDoubt] = useState<boolean>(false);
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtDetails | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchDoubts();
  }, [selectedSchoolId, selectedGradeId, selectedSectionId, statusFilter, searchQuery, page]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchGrades(selectedSchoolId);
      setSelectedGradeId('');
      setSections([]);
      setSelectedSectionId('');
    } else {
      setGrades([]);
      setSelectedGradeId('');
      setSections([]);
      setSelectedSectionId('');
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedGradeId) {
      fetchSections(selectedGradeId);
      setSelectedSectionId('');
    } else {
      setSections([]);
      setSelectedSectionId('');
    }
  }, [selectedGradeId]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      const d = response.data;
      const rawSchools = Array.isArray(d) ? d : (d.value || []);
      setSchools(rawSchools.map((s: any) => ({
        id: s.id || s.Id,
        name: s.name || s.Name || 'Unknown School'
      })));
    } catch (error) {
      console.error('Failed to fetch schools', error);
      toast.error('Failed to load schools list.');
    }
  };

  const fetchGrades = async (schoolId: string) => {
    try {
      const response = await api.get(`/grades/by-school/${schoolId}`);
      const d = response.data;
      const rawGrades = Array.isArray(d) ? d : (d.value || []);
      setGrades(rawGrades.map((g: any) => ({
        id: g.id || g.Id,
        grade_name: g.grade_name || g.GradeName || g.gradeName || `Grade ${g.grade_level}`
      })));
    } catch (error) {
      console.error('Failed to fetch grades', error);
    }
  };

  const fetchSections = async (gradeId: string) => {
    try {
      const response = await api.get(`/grade-sections/by-grade/${gradeId}`);
      const rawSections = Array.isArray(response.data) ? response.data : [];
      setSections(rawSections.map((s: any) => ({
        id: s.id || s.Id,
        sectionCode: s.sectionCode || s.SectionCode || 'A',
        sectionName: s.sectionName || s.SectionName
      })));
    } catch (error) {
      console.error('Failed to fetch sections', error);
    }
  };

  const fetchDoubts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSchoolId) params.append('schoolId', selectedSchoolId);
      if (selectedGradeId) params.append('gradeId', selectedGradeId);
      if (selectedSectionId) params.append('sectionId', selectedSectionId);
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const res = await api.get(`/doubts/all?${params.toString()}`);
      const rawItems = res.data?.items || [];
      const mapped = rawItems.map((d: any) => ({
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
      setItems(mapped);
      setTotalCount(res.data?.total || 0);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to retrieve doubts list.');
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve details.');
    }
  };

  const handleCloseDoubt = async () => {
    if (!selectedDoubt) return;
    if (!confirm('Are you sure you want to mark this doubt as resolved and close it?')) return;

    setClosingDoubt(true);
    try {
      await api.put(`/doubts/${selectedDoubt.id}/close`);
      toast.success('Doubt resolved and closed.');
      viewDoubtDetails(selectedDoubt.id);
      fetchDoubts();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to close doubt.');
    } finally {
      setClosingDoubt(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Academic Doubt Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Overview of student questions and academic issues across campuses, grades, and divisions.
          </p>
        </div>
      </div>

      {/* Select Filters Panel */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
        {/* School Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-[#64748b] tracking-wider mb-2 ml-1">Select School</label>
          <select
            value={selectedSchoolId}
            onChange={e => setSelectedSchoolId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="">-- All Schools --</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Grade Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-[#64748b] tracking-wider mb-2 ml-1">Select Grade</label>
          <select
            value={selectedGradeId}
            onChange={e => setSelectedGradeId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
            disabled={!selectedSchoolId}
          >
            <option value="">{!selectedSchoolId ? '-- School Required --' : '-- All Grades --'}</option>
            {grades.map(g => (
              <option key={g.id} value={g.id}>{g.grade_name}</option>
            ))}
          </select>
        </div>

        {/* Section/Division Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-[#64748b] tracking-wider mb-2 ml-1">Select Section</label>
          <select
            value={selectedSectionId}
            onChange={e => setSelectedSectionId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
            disabled={!selectedGradeId}
          >
            <option value="">{!selectedGradeId ? '-- Grade Required --' : '-- All Sections --'}</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.sectionName ? `${s.sectionCode} (${s.sectionName})` : s.sectionCode}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-[#64748b] tracking-wider mb-2 ml-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="">-- All Statuses --</option>
            <option value="Open">Open</option>
            <option value="Answered">Answered</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Search Query */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student or title..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-450 focus:outline-hidden focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Main Grid: list + detail */}
      <div className="grid lg:grid-cols-3 gap-6 items-start animate-fade-in">
        {/* Left list table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin w-8 h-8 text-indigo-500 mx-auto" />
                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest mt-4">Loading student doubts...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 opacity-60 mx-auto" />
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white text-base">No doubts recorded</h4>
                  <p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1 max-w-xs mx-auto">
                    Try modifying the filters or search criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#283548]/50 text-slate-500 dark:text-[#cbd5e1] border-b border-slate-200/65 dark:border-[#334155]/65 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-5 py-4">Student</th>
                      <th className="px-4 py-4">School & Class</th>
                      <th className="px-4 py-4">Doubt Detail</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Asked Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(d => (
                      <tr 
                        key={d.id} 
                        onClick={() => viewDoubtDetails(d.id)}
                        className={`group border-b border-slate-100 dark:border-[#283548] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/35 transition-colors ${selectedDoubt?.id === d.id ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#283548] text-slate-700 dark:text-white flex items-center justify-center font-bold text-xs">
                              {d.studentName.charAt(0)}
                            </div>
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{d.studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-650 dark:text-[#cbd5e1]">
                          <div className="font-extrabold truncate max-w-[140px]">{d.schoolName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8892b0] mt-0.5">
                            {d.gradeName} {d.sectionName ? ` - ${d.sectionName}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[200px]">
                          <div className="font-extrabold text-slate-800 dark:text-white truncate" title={d.title}>{d.title}</div>
                          {d.lessonTitle && (
                            <div className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold truncate mt-0.5">
                              {d.moduleName}: {d.lessonTitle}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            d.status === 'Open'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200'
                              : d.status === 'Answered'
                              ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200'
                              : 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-[#94a3b8] border-slate-200'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] font-bold text-slate-450 dark:text-slate-500">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl p-3.5">
              <span className="text-xs text-slate-500 dark:text-[#94a3b8] font-semibold">
                Showing Page {page} of {totalPages} ({totalCount} total doubts)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => prev - 1)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-[#cbd5e1] rounded-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-[#cbd5e1] rounded-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right side details panel */}
        <div className="lg:sticky lg:top-8 space-y-4">
          {selectedDoubt ? (
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 to-indigo-500" />
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
                    className="p-1 hover:bg-slate-100 dark:hover:bg-[#283548] rounded-lg text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Student Metadata Card */}
                <div className="bg-slate-50 dark:bg-[#283548]/30 p-3.5 rounded-xl border border-slate-100 dark:border-[#334155]/60 space-y-2 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-black">
                      {selectedDoubt.studentName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 dark:text-white leading-tight">{selectedDoubt.studentName}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-[#94a3b8] font-semibold">
                        {selectedDoubt.studentEmail}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 dark:border-[#334155] pt-2 mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-[#cbd5e1] font-bold">
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-black">School Name</p>
                      <p className="mt-0.5 truncate">{selectedDoubt.schoolName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-black">Class Division</p>
                      <p className="mt-0.5 truncate">{selectedDoubt.gradeName} {selectedDoubt.sectionName ? ` - ${selectedDoubt.sectionName}` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">{selectedDoubt.title}</h3>
                  {selectedDoubt.lessonTitle && (
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      Topic: {selectedDoubt.moduleName} - {selectedDoubt.lessonTitle}
                    </p>
                  )}
                  <p className="text-[10px] font-semibold text-slate-450 dark:text-slate-550">
                    Raised {new Date(selectedDoubt.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Description */}
                <div className="bg-slate-50 dark:bg-[#283548]/40 border border-slate-100 dark:border-[#334155]/60 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Student Description</p>
                  <p className="text-xs text-slate-700 dark:text-[#cbd5e1] whitespace-pre-line leading-relaxed font-semibold">
                    {selectedDoubt.description}
                  </p>
                </div>

                {/* Screenshot */}
                {selectedDoubt.screenshotUrl && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Attachment</p>
                    <div className="border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden bg-slate-50 dark:bg-[#283548] p-1">
                      <img 
                        src={selectedDoubt.screenshotUrl} 
                        alt="Screenshot" 
                        className="w-full object-contain max-h-56 mx-auto rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Response detail */}
                <div className="border-t border-slate-100 dark:border-[#283548] pt-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Resolution Status</p>
                  {selectedDoubt.teacherReply ? (
                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-xl p-4 space-y-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Teacher Response</p>
                      <p className="text-xs text-slate-700 dark:text-[#cbd5e1] font-semibold whitespace-pre-line leading-relaxed">
                        {selectedDoubt.teacherReply}
                      </p>
                      <div className="flex justify-between items-center text-[9px] text-emerald-700 dark:text-emerald-400 font-bold border-t border-emerald-100/50 dark:border-emerald-500/10 pt-2 mt-2">
                        <span>By: {selectedDoubt.repliedByTeacher}</span>
                        <span>{selectedDoubt.repliedAt && new Date(selectedDoubt.repliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 dark:bg-[#283548]/30 rounded-xl border border-dashed border-slate-200 dark:border-[#334155] text-slate-400">
                      <Clock size={20} className="mx-auto mb-1.5 opacity-60" />
                      <p className="text-[11px] font-bold">Pending response from class teacher.</p>
                    </div>
                  )}
                </div>

                {/* Close Doubt control for Admins/Staff */}
                {selectedDoubt.status !== 'Closed' && (
                  <button
                    onClick={handleCloseDoubt}
                    disabled={closingDoubt}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {closingDoubt ? 'Closing...' : 'Close Doubt (Mark Resolved)'}
                  </button>
                )}

                {selectedDoubt.status === 'Closed' && selectedDoubt.closedAt && (
                  <div className="bg-slate-100 dark:bg-slate-850/40 rounded-xl p-3 text-[10px] font-bold text-slate-500 dark:text-[#94a3b8] text-center border border-slate-200/50">
                    Doubt closed on {new Date(selectedDoubt.closedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#283548]/20 border border-slate-200/50 dark:border-[#334155]/50 rounded-2xl p-8 text-center space-y-3">
              <MessageSquare size={36} className="mx-auto text-slate-350 dark:text-slate-650 opacity-60" />
              <p className="text-xs font-bold text-slate-450 dark:text-slate-550 max-w-xs mx-auto font-medium">
                Select a doubt from the grid list to examine details, attachments, resolution updates, and admin options.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDoubtHub;
