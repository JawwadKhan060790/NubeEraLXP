import ConfirmModal from '@/components/ConfirmModal';
import FieldError from '@/components/FieldError';
import GradeLevelSelect from '@/components/GradeLevelSelect';
import Pagination from '@/components/Pagination';
import PremiumRichTextEditor from '@/components/PremiumRichTextEditor';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import VideoCarousel from '@/components/VideoCarousel';
import ExportButton from '@/components/export/ExportButton';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import { parseApiErrors } from '@/utils/errorParser';
import { resolveMediaUrl } from '@/utils/urlHelper';
import Editor from '@monaco-editor/react';
import { AlertCircle, BookOpen, Check, ChevronDown, ChevronRight, Copy, Edit, ExternalLink, FileText, Globe, Paperclip, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface Lesson {
   id: string;
   module_id: string;
   module_name?: string;
   sub_topic: string;
   activity?: string;
   video_url?: string;
   video_urls?: string[];
   diagram_url?: string;
   source?: string;
   procedure?: string;
   serial_number: number;
   pdf_file_url?: string;
   is_active?: boolean;
   is_activity?: boolean;
   is_robotics_activity?: boolean;
   is_python_activity?: boolean;
   is_ai_tool_activity?: boolean;
   browser_url?: string;
   code?: string;
   expected_periods?: number;
}

interface Module {
   id: string;
   name: string;
   grade_level_id: string;
}

const isFrameBlocked = (url: string): boolean => {
   if (!url) return false;
   try {
      const domain = new URL(url).hostname.toLowerCase();
      return (
         domain.includes('tinkercad.com') ||
         domain.includes('scratch.mit.edu') ||
         domain.includes('google.com') ||
         domain.includes('github.com') ||
         domain.includes('replit.com') ||
         domain.includes('figma.com') ||
         domain.includes('canva.com') ||
         (domain.includes('youtube.com') && !url.includes('/embed/')) ||
         domain.includes('youtu.be')
      );
   } catch {
      const lower = url.toLowerCase();
      return lower.includes('tinkercad.com') || lower.includes('scratch.mit.edu') || lower.includes('google.com');
   }
};

const Lessons: React.FC = () => {
   const [lessons, setLessons] = useState<Lesson[]>([]);
   const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
   const [modules, setModules] = useState<Module[]>([]);
   const [showModal, setShowModal] = useState(false);
   const location = useLocation();
   const [editingId, setEditingId] = useState<string | null>(null);
   const [selectedGradeId, setSelectedGradeId] = useState('');
   const [searchTerm, setSearchTerm] = useState('');
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage, setItemsPerPage] = useState(10);
   const [totalCount, setTotalCount] = useState(0);
   const [totalPages, setTotalPages] = useState(0);
   const videoInputRef = useRef<HTMLInputElement>(null);
   const [isUploading, setIsUploading] = useState(false);
   const [user, setUser] = useState<any>(null);
   const isTeacher = user?.utype === 'teacher';

   useEffect(() => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
   }, []);

   // Reset to page 1 on filter change
   useEffect(() => {
      if (currentPage !== 1) setCurrentPage(1);
   }, [searchTerm, selectedGradeId]);

   const [formData, setFormData] = useState({
      module_id: '',
      sub_topic: '',
      activity: '',
      video_url: '',
      diagram_url: '',
      procedure: 'Topic',
      serial_number: 0,
      pdf_file_url: '',
      is_active: true,
      is_activity: false,
      is_robotics_activity: false,
      is_python_activity: false,
      is_ai_tool_activity: false,
      browser_url: '',
      code: '',
      expected_periods: 1,
      display_order: 0
   });
   // Multi-video list (separate from formData for cleaner management)
   const [videoUrls, setVideoUrls] = useState<string[]>(['']);
   const [uploadingVideoIdx, setUploadingVideoIdx] = useState<number | null>(null);
   const videoFileRefs = useRef<(HTMLInputElement | null)[]>([]);
   const [formErrors, setFormErrors] = useState<Record<string, string>>({});

   const clearFieldError = (field: string) => {
      setFormErrors(prev => {
         if (!prev[field]) return prev;
         const next = { ...prev };
         delete next[field];
         return next;
      });
   };

   const [activeTab, setActiveTab] = useState('Overview');
   const [copiedCode, setCopiedCode] = useState(false);
   const [showVideo, setShowVideo] = useState(false);

   // Reset video visibility when selected lesson changes
   useEffect(() => {
      setShowVideo(false);
   }, [selectedLesson]);

   // Python Editor States
   const [pyodide, setPyodide] = useState<any>(null);
   const [pyodideLoading, setPyodideLoading] = useState(false);
   const [running, setRunning] = useState(false);
   const [output, setOutput] = useState('');
   const [editorCode, setEditorCode] = useState('print("Welcome to NubeEra Python Lab")');

   // Load Pyodide WASM Runtime
   useEffect(() => {
      if (activeTab === 'PythonEditor' && !pyodide && !pyodideLoading) {
         setPyodideLoading(true);
         const script = document.createElement('script');
         script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
         script.async = true;
         script.onload = async () => {
            try {
               const loadedPyodide = await (window as any).loadPyodide({
                  indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/'
               });
               setPyodide(loadedPyodide);
               setPyodideLoading(false);
            } catch (err) {
               console.error('Failed to load Pyodide runtime:', err);
               setPyodideLoading(false);
               toast.error('Failed to initialize Python runtime.');
            }
         };
         script.onerror = () => {
            setPyodideLoading(false);
            toast.error('Failed to load Python execution script.');
         };
         document.head.appendChild(script);
      }
   }, [activeTab, pyodide, pyodideLoading]);

   // Reset/Initialize python code when lesson changes
   useEffect(() => {
      if (selectedLesson && selectedLesson.is_python_activity) {
         setEditorCode(selectedLesson.code || 'print("Welcome to NubeEra Python Lab")');
         setOutput('');
      }
   }, [selectedLesson]);

   const runPythonCode = async () => {
      if (!pyodide) {
         toast.error('Python runtime is still loading...');
         return;
      }
      setRunning(true);
      setOutput('');
      try {
         const setupCode = `
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`;
         await pyodide.runPythonAsync(setupCode);
         await pyodide.runPythonAsync(editorCode);

         const stdout = await pyodide.runPythonAsync('sys.stdout.getvalue()');
         const stderr = await pyodide.runPythonAsync('sys.stderr.getvalue()');

         let combined = '';
         if (stdout) combined += stdout;
         if (stderr) combined += stderr;

         setOutput(combined || 'Program executed successfully with no output.');
      } catch (err: any) {
         let combined = '';
         try {
            const stdout = pyodide.runPython('sys.stdout.getvalue()');
            if (stdout) combined += stdout;
         } catch { }
         combined += err.message || String(err);
         setOutput(combined);
      } finally {
         setRunning(false);
      }
   };

   const cleanCodeText = (html: string): string => {
      if (!html) return '';
      if (!html.includes('<') && !html.includes('>')) {
         return html.trim();
      }
      let text = html
         .replace(/<br\s*\/?>/gi, '\n')
         .replace(/<\/p>/gi, '\n')
         .replace(/<p[^>]*>/gi, '')
         .replace(/&nbsp;/g, ' ')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&amp;/g, '&')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'");

      text = text.replace(/<[^>]*>/g, '');
      return text.trim();
   };

   const handleCopyCode = (rawCode: string) => {
      if (!rawCode) return;
      const cleanText = cleanCodeText(rawCode);
      navigator.clipboard.writeText(cleanText).then(() => {
         setCopiedCode(true);
         toast.success('Code copied! Paste into Thonny.');
         setTimeout(() => setCopiedCode(false), 2000);
      }).catch(() => {
         toast.error('Failed to copy code.');
      });
   };

   // Units are school-agnostic master content keyed only by GradeLevelId — narrow
   // the Unit dropdown to the selected grade level (no school context involved).
   const filteredModules = useMemo(() => {
      if (!selectedGradeId) return modules;
      return modules.filter(m => m.grade_level_id === selectedGradeId);
   }, [modules, selectedGradeId]);

   const fetchLessonDetail = async (id: string) => {
      try {
         const res = await api.get(`/lessons/${id}`);
         setSelectedLesson(res.data);
         setActiveTab('Overview');
      } catch (error) {
         toast.error('Could not load details');
      }
   };

   useEffect(() => {
      if (location.pathname.includes('/create')) {
         resetForm();
         setShowModal(true);
      }
   }, [location.pathname]);

   // Load Units once (used for the Unit dropdown, narrowed client-side by grade
   // level). Grade levels themselves are sourced by <GradeLevelSelect> directly.
   useEffect(() => {
      api.get('/modules').then(res => setModules(res.data)).catch(err => console.error('Error fetching modules:', err));
   }, []);

   // Re-fetch lesson list whenever page, size, search, or grade filter changes
   useEffect(() => {
      fetchData();
   }, [currentPage, itemsPerPage, searchTerm, selectedGradeId]);

   const fetchData = async () => {
      try {
         const params: Record<string, any> = {
            pageNumber: currentPage,
            pageSize: itemsPerPage,
         };
         if (searchTerm.trim()) params.search = searchTerm.trim();
         if (selectedGradeId) params.gradeId = selectedGradeId;

         const res = await api.get('/lessons/paged', { params });
         const paged = res.data;
         const lessonData: Lesson[] = paged.items || [];
         setLessons(lessonData);
         setTotalCount(paged.total_count || 0);
         setTotalPages(paged.total_pages || 0);

         if (lessonData.length > 0 && !selectedLesson) {
            fetchLessonDetail(lessonData[0].id);
         } else if (lessonData.length === 0) {
            setSelectedLesson(null);
         }
      } catch (error) {
         console.error('Error fetching lessons:', error);
      }
   };

   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'diagram_url' | 'pdf_file_url') => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      setIsUploading(true);
      try {
         const res = await api.post('/upload', formDataUpload);
         setFormData(prev => ({ ...prev, [field]: res.data.url }));
         toast.success('File uploaded');
      } catch (error) {
         toast.error('Upload failed');
      } finally {
         setIsUploading(false);
      }
   };

   const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      setUploadingVideoIdx(idx);
      try {
         const res = await api.post('/upload', formDataUpload);
         setVideoUrls(prev => prev.map((u, i) => i === idx ? res.data.url : u));
         toast.success('Video uploaded');
      } catch {
         toast.error('Video upload failed');
      } finally {
         setUploadingVideoIdx(null);
         if (e.target) e.target.value = '';
      }
   };

   const handleModuleChange = (moduleId: string) => {
      setFormData(prev => ({
         ...prev,
         module_id: moduleId
      }));
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormErrors({});
      if (!formData.module_id) {
         setFormErrors({ module_id: 'Please select a Unit' });
         return;
      }
      // Clean video URL list: filter blanks, use first entry as legacy VideoUrl
      const cleanUrls = videoUrls.filter(u => u.trim().length > 0);
      const payload = {
         ...formData,
         video_url: cleanUrls[0] ?? '',
         video_urls: cleanUrls,
      };
      try {
         if (editingId) {
            await api.put(`/lessons/${editingId}`, payload);
            toast.success('Saved');
         } else {
            await api.post('/lessons', payload);
            toast.success('Added');
         }
         setShowModal(false);
         resetForm();
         fetchData();
      } catch (error: any) {
         console.error('Save failed', error);
         const errorsMap = parseApiErrors(error);
         setFormErrors(errorsMap);
         if (errorsMap._form) toast.error(errorsMap._form);
      }
   };

   const handleEdit = (lesson: Lesson) => {
      setEditingId(lesson.id);
      setFormData({
         module_id: lesson.module_id,
         sub_topic: lesson.sub_topic,
         activity: lesson.activity || '',
         video_url: lesson.video_url || '',
         diagram_url: lesson.diagram_url || '',
         procedure: lesson.procedure || 'Topic',
         serial_number: lesson.serial_number || 0,
         pdf_file_url: lesson.pdf_file_url || '',
         is_active: lesson.is_active ?? true,
         is_activity: lesson.is_activity || false,
         is_robotics_activity: lesson.is_robotics_activity || false,
         is_python_activity: lesson.is_python_activity || false,
         is_ai_tool_activity: lesson.is_ai_tool_activity || false,
         browser_url: lesson.browser_url || '',
         code: lesson.code || '',
         expected_periods: lesson.expected_periods || 1,
         display_order: lesson.display_order ?? (lesson as any).displayOrder ?? 0
      });
      // Populate video URLs: prefer video_urls array, fall back to video_url
      const existingUrls = lesson.video_urls && lesson.video_urls.length > 0
         ? lesson.video_urls
         : lesson.video_url ? [lesson.video_url] : [''];
      setVideoUrls(existingUrls);
      const mod = modules.find(m => m.id === lesson.module_id);
      if (mod) setSelectedGradeId(mod.grade_level_id);
      setFormErrors({});
      setShowModal(true);
   };

   const { confirmState, requestConfirm } = useConfirm();

   const handleDelete = async (id: string, name: string) => {
      const ok = await requestConfirm({ title: 'Delete Topic', message: `Are you sure you want to delete "${name}"?`, variant: 'danger' });
      if (!ok) return;
      try {
         await api.delete(`/lessons/${id}`);
         toast.success('Deleted');
         fetchData();
      } catch (error) {
         toast.error('Failed to delete');
      }
   };

   const resetForm = () => {
      setEditingId(null);
      setFormData({ module_id: '', sub_topic: '', activity: '', video_url: '', diagram_url: '', procedure: 'Topic', serial_number: totalCount + 1, pdf_file_url: '', is_active: true, is_activity: false, is_robotics_activity: false, is_python_activity: false, is_ai_tool_activity: false, browser_url: '', code: '', expected_periods: 1, display_order: 0 });
      setVideoUrls(['']);
      setSelectedGradeId('');
      setFormErrors({});
   };

   const renderVideoPlayer = (url: string) => {
      if (!url) return null;
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      if (isYoutube) {
         const videoId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
         return <iframe className="w-full h-full border-0 rounded-[8px]" src={`https://www.youtube.com/embed/${videoId}`} allowFullScreen />;
      }
      const resolvedUrl = resolveMediaUrl(url);
      return <video className="w-full h-full bg-black rounded-[8px]" src={resolvedUrl} controls />;
   };

   const lessonStats: StatItem[] = [
      { title: 'Total Lessons', value: totalCount, icon: <BookOpen className="w-6 h-6" />, color: 'indigo', subtitle: 'All curriculum topics' },
      { title: 'Completed', value: lessons.filter(l => l.is_active).length, icon: <Check className="w-6 h-6" />, color: 'emerald', subtitle: 'Active topics' },
      { title: 'Pending', value: lessons.filter(l => !l.is_active).length, icon: <X className="w-6 h-6" />, color: 'rose', subtitle: 'Inactive topics' },
   ];

   return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
         {/* Header Title Section */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Topics & Lesson Plans</h1>
               <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
                  {totalCount} Curated Topics Configured
               </p>
            </div>
            <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
               <ExportButton endpoint="/lessons/export" fallbackFileName="lessons-export.xlsx" label="Export to Excel" />
               {!isTeacher && (
                  <button
                     onClick={() => { resetForm(); setShowModal(true); }}
                     className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
                  >
                     <Plus className="w-3.5 h-3.5" /> Add Topic
                  </button>
               )}
            </div>
         </div>

         {/* Stats Counter Row */}
         <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatGrid stats={lessonStats} loading={false} />
         </div>

         {/* Split panel wrapper */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT PANEL: Searchable List */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[680px]">
               <div className="p-4 border-b border-slate-100 dark:border-[#283548] bg-slate-50/60 dark:bg-[#283548]/60">
                  {/* Search and grade level filter share one row */}
                  <div className="flex items-center gap-2">
                     <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                        <input
                           type="text"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           placeholder="Search topics..."
                           className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium"
                        />
                     </div>

                     <div className="flex-1 min-w-0">
                        <GradeLevelSelect
                           value={selectedGradeId}
                           onChange={(value) => setSelectedGradeId(value)}
                           source="master"
                           valueAs="id"
                           placeholder="All Grades"
                           className="w-full px-3 pr-9 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer appearance-none"
                        />
                     </div>
                  </div>
               </div>

               <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#283548] flex-1 min-h-[350px] custom-scrollbar">
                  {lessons.length === 0 ? (
                     <div className="p-10 text-center text-slate-400 dark:text-[#64748b] text-xs font-bold uppercase tracking-widest">
                        No topics found.
                     </div>
                  ) : (
                     lessons.map((l) => {
                        const isSelected = selectedLesson?.id === l.id;
                        return (
                           <div
                              key={l.id}
                              onClick={() => fetchLessonDetail(l.id)}
                              className={`relative px-4 py-3.5 cursor-pointer flex items-center gap-3.5 transition-all duration-200 border-l-[3px] group ${isSelected
                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-indigo-500'
                                    : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-l-slate-300'
                                 }`}
                           >
                              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                 <BookOpen className="w-5 h-5 text-indigo-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="text-xs font-bold text-slate-800 dark:text-white tracking-tight truncate">
                                    {l.sub_topic}
                                 </div>
                                 <div className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-medium truncate mt-0.5">
                                    {l.module_name || 'General Unit'}
                                 </div>
                              </div>
                              {isSelected && (
                                 <ChevronRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300" />
                              )}
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
                     totalItems={totalCount}
                     onPageChange={setCurrentPage}
                     onPageSizeChange={setItemsPerPage}
                  />
               </div>
            </div>

            {/* RIGHT PANEL: Details preview */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 shadow-sm min-h-[400px]">
               {selectedLesson ? (
                  <div className="space-y-7">

                     {/* Header detail */}
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#283548]">
                        <div>
                           <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-tight">{selectedLesson.sub_topic}</h2>
                           <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[9px] font-bold text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md uppercase">
                                 {selectedLesson.module_name || 'General Unit'}
                              </span>
                              <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-400/25 px-2 py-0.5 rounded-md uppercase">
                                 ⏱️ {selectedLesson.expected_periods || 1} Expected Periods
                              </span>
                              {selectedLesson.pdf_file_url && (
                                 <a
                                    href={resolveMediaUrl(selectedLesson.pdf_file_url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-400/25 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-emerald-100 transition-all cursor-pointer"
                                 >
                                    <FileText className="w-3.5 h-3.5 text-emerald-500" /> Topic PDF
                                 </a>
                              )}
                           </div>
                        </div>

                        {!isTeacher && (
                           <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                              <button
                                 onClick={() => handleEdit(selectedLesson)}
                                 className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg font-bold text-xs tracking-normal transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40 dark:hover:bg-indigo-900/40"
                                 title="Edit Topic"
                              >
                                 <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                 onClick={() => handleDelete(selectedLesson.id, selectedLesson.sub_topic)}
                                 className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg font-bold text-xs tracking-normal transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40 dark:hover:bg-rose-900/40"
                                 title="Delete Topic"
                              >
                                 <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                           </div>
                        )}
                     </div>

                     {/* Video section with carousel */}
                     {((selectedLesson as any).video_urls?.length > 0 || selectedLesson.video_url) && (
                        <div className="bg-slate-50 dark:bg-[#283548]/40 border border-slate-200 dark:border-[#334155] rounded-xl p-4 space-y-3 shadow-xs">
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600 dark:text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
                                 {((selectedLesson as any).video_urls?.length ?? 1) > 1 ? `🎥 Video Slides (${(selectedLesson as any).video_urls?.length})` : `🎥 Video Lesson`}
                              </span>
                              <button type="button" onClick={() => setShowVideo(!showVideo)} className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-indigo-100 dark:border-indigo-950/60 cursor-pointer">
                                 {showVideo ? <span>🙈 Hide Video</span> : <span>👁️ Watch Video</span>}
                              </button>
                           </div>
                           {showVideo && (
                              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 dark:border-[#334155] shadow-inner animate-in slide-in-from-top-2 duration-300">
                                 <VideoCarousel urls={(selectedLesson as any).video_urls?.length > 0 ? (selectedLesson as any).video_urls : selectedLesson.video_url ? [selectedLesson.video_url] : []} />
                              </div>
                           )}
                        </div>
                     )}

                     {/* Tabbed Content — matches student learning path style */}
                     <div className="border-b border-slate-200 dark:border-[#334155] flex overflow-x-auto no-scrollbar">
                        {[
                           { id: 'Overview', label: 'Read Content' },
                           ...(selectedLesson.diagram_url
                              ? [{ id: 'Diagram', label: 'Reference Diagram' }]
                              : []),
                           ...(selectedLesson.is_python_activity
                              ? [{ id: 'PythonEditor', label: '🐍 Python Editor' }]
                              : []),
                           ...(selectedLesson.is_ai_tool_activity
                              ? [{ id: 'Browser', label: '🌐 Browser' }]
                              : []),
                           ...(selectedLesson.is_robotics_activity || (selectedLesson.is_activity && !selectedLesson.is_python_activity && !selectedLesson.is_ai_tool_activity)
                              ? [{ id: 'Code', label: '🤖 Robotics Code' }]
                              : []),
                           ...(selectedLesson.is_python_activity
                              ? [{ id: 'Code', label: '🐍 Python Code' }]
                              : []),
                        ].map(tab => (
                           <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`px-6 py-3 text-[11px] font-bold tracking-tight transition-all relative shrink-0 ${activeTab === tab.id ? 'text-primary' : 'text-slate-400 dark:text-[#64748b] hover:text-slate-700 dark:hover:text-[#e2e8f0]'}`}
                           >
                              {tab.label}
                              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                           </button>
                        ))}
                     </div>

                     <div className="min-h-[300px] animate-in fade-in duration-300 pt-4">
                        {activeTab === 'Overview' && (
                           <div className="jodit-content text-[13px] text-slate-700 dark:text-[#e2e8f0] leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: selectedLesson.activity || '<p class="text-slate-400 italic">No lesson content defined yet.</p>' }}
                           />
                        )}

                        {activeTab === 'Code' && (selectedLesson.is_robotics_activity || selectedLesson.is_python_activity) && (
                           <div className="space-y-3">
                              {selectedLesson.code ? (() => {
                                 const rawLines = cleanCodeText(selectedLesson.code).split('\n');
                                 return (
                                    <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-[11px] text-slate-100">
                                       <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2 flex items-center justify-between select-none">
                                          <span className="text-[10px] font-bold text-slate-400">
                                             {selectedLesson.is_python_activity ? 'main.py (Python)' : 'main.py (MicroPython)'}
                                          </span>
                                          <button
                                             type="button"
                                             onClick={() => handleCopyCode(selectedLesson.code || '')}
                                             className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all duration-200 border cursor-pointer ${copiedCode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'}`}
                                          >
                                             {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                             {copiedCode ? 'Copied' : 'Copy'}
                                          </button>
                                       </div>
                                       <div className="flex overflow-x-auto divide-x divide-[#21262d] max-h-[300px]">
                                          <div className="bg-[#0d1117]/90 text-slate-500 text-right pr-2 pl-2 py-3 select-none shrink-0 min-w-[30px]">
                                             {rawLines.map((_, i) => <div key={i} className="leading-5 h-5">{i + 1}</div>)}
                                          </div>
                                          <div className="flex-1 p-3 bg-[#0d1117]/30 overflow-x-auto min-w-0">
                                             {rawLines.map((line, i) => (
                                                <div key={i} className="leading-5 h-5 whitespace-pre text-slate-200 hover:bg-slate-800/30 px-1 rounded-sm">{line || ' '}</div>
                                             ))}
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })() : (
                                 <div className="p-6 border border-dashed border-slate-200 dark:border-[#334155] rounded-xl text-center text-slate-400 dark:text-[#64748b] italic text-xs">
                                    No code block defined for this topic.
                                 </div>
                              )}
                           </div>
                        )}

                        {activeTab === 'Browser' && selectedLesson.is_ai_tool_activity && (
                           <div className="space-y-2">
                              {selectedLesson.browser_url ? (
                                 isFrameBlocked(selectedLesson.browser_url) ? (
                                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#283548] border border-dashed border-slate-200 dark:border-[#334155] rounded-xl text-center" style={{ height: '480px' }}>
                                       <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                                          <Globe className="w-6 h-6" />
                                       </div>
                                       <h4 className="text-sm font-bold text-slate-800 dark:text-[#e2e8f0]">External Learning Workspace</h4>
                                       <p className="text-xs text-slate-500 dark:text-[#94a3b8] max-w-sm mt-2 leading-relaxed">
                                          Due to security policies of the external site, this tool cannot be loaded inside the learning portal. Click below to launch it safely in a new browser tab.
                                       </p>
                                       <a
                                          href={selectedLesson.browser_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm animate-pulse hover:animate-none"
                                       >
                                          Launch Workspace <ExternalLink className="w-3.5 h-3.5" />
                                       </a>
                                    </div>
                                 ) : (
                                    <>
                                       <div className="flex items-center gap-2 px-1 pb-1">
                                          <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] tracking-wider">URL:</span>
                                          <a href={selectedLesson.browser_url} target="_blank" rel="noopener noreferrer"
                                             className="text-[10px] text-primary font-semibold truncate hover:underline">{selectedLesson.browser_url}</a>
                                       </div>
                                       <iframe
                                          src={selectedLesson.browser_url}
                                          title="AI Tool Browser"
                                          className="w-full rounded-xl border border-slate-200 dark:border-[#334155] shadow-sm"
                                          style={{ height: '480px' }}
                                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                                       />
                                    </>
                                 )
                              ) : (
                                 <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-[#283548] rounded-xl border border-dashed border-slate-200 dark:border-[#334155]">
                                    <span className="text-4xl mb-4">🌐</span>
                                    <p className="text-xs font-bold text-slate-500 dark:text-[#94a3b8]">No Browser URL configured.</p>
                                    <p className="text-[10px] text-slate-400 dark:text-[#64748b] mt-1">Please edit the topic settings to add a Browser URL.</p>
                                 </div>
                              )}
                           </div>
                        )}

                        {activeTab === 'Diagram' && (
                           <div className="space-y-4 animate-in fade-in duration-300 max-w-full">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white tracking-widest flex items-center gap-2">
                                 <Paperclip className="w-4 h-4 text-primary" /> Reference Diagram
                              </h4>
                              <div className="bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl p-5 min-h-[150px]">
                                 {selectedLesson.diagram_url ? (
                                    <div className="jodit-content text-sm text-slate-600 dark:text-[#cbd5e1] leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedLesson.diagram_url }} />
                                 ) : (
                                    <p className="text-xs text-slate-400 dark:text-[#64748b] italic">No diagram provided.</p>
                                 )}
                              </div>
                           </div>
                        )}

                        {activeTab === 'PythonEditor' && selectedLesson.is_python_activity && (
                           <div className="space-y-6 animate-in fade-in duration-300 pt-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                 <div className="lg:col-span-2 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                       <div className="flex items-center gap-2">
                                          <span className="text-xl">🐍</span>
                                          <h4 className="text-xs font-bold text-slate-800 dark:text-white tracking-wider">Python Preview Workspace</h4>
                                       </div>

                                       <div className="flex items-center gap-2">
                                          <button
                                             onClick={runPythonCode}
                                             disabled={running || pyodideLoading}
                                             className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-[#334155] text-white font-bold text-[10px] tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-md animate-all"
                                          >
                                             {running ? 'Running...' : '▶ Run Code'}
                                          </button>
                                          <button
                                             onClick={() => {
                                                if (confirm('Reset editor to default starter code?')) {
                                                   setEditorCode(selectedLesson.code || 'print("Welcome to NubeEra Python Lab")');
                                                }
                                             }}
                                             className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 dark:bg-[#283548] hover:bg-slate-300 dark:hover:bg-[#334155] text-slate-700 dark:text-[#e2e8f0] font-bold text-[10px] tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                                          >
                                             🔄 Reset
                                          </button>
                                       </div>
                                    </div>

                                    <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm h-[400px]">
                                       <Editor
                                          height="100%"
                                          defaultLanguage="python"
                                          theme="vs-dark"
                                          value={editorCode}
                                          onChange={(val) => setEditorCode(val || '')}
                                          options={{
                                             fontSize: 14,
                                             minimap: { enabled: false },
                                             automaticLayout: true,
                                             lineNumbers: 'on',
                                             scrollBeyondLastLine: false,
                                          }}
                                       />
                                    </div>
                                 </div>

                                 <div className="space-y-4 flex flex-col h-full min-h-[400px]">
                                    <div className="flex items-center justify-between">
                                       <h4 className="text-xs font-black text-slate-800 dark:text-white tracking-wider">Console Output</h4>
                                       <button
                                          onClick={() => setOutput('')}
                                          className="px-3 py-1 bg-slate-100 dark:bg-[#283548] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-500 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                       >
                                          Clear Console
                                       </button>
                                    </div>

                                    <div className="flex-1 bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl p-4 font-mono text-xs text-slate-200 overflow-y-auto min-h-[350px] shadow-inner">
                                       <div className="whitespace-pre-wrap select-text text-slate-200">
                                          {pyodideLoading ? (
                                             <div className="text-slate-400 animate-pulse">Loading Pyodide WASM Runtime...</div>
                                          ) : (
                                             output || 'Console is empty. Click "Run Code" to execute Python program.'
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>

                  </div>
               ) : (
                  <div className="p-16 text-center">
                     <BookOpen className="w-12 h-12 text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                     <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest">Select a topic record to view detailed plan</p>
                  </div>
               )}
            </div>

         </div>

         {showModal && (
            <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white dark:bg-[#1e293b] rounded-[10px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-[#283548] flex items-center justify-between">
                     <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{editingId ? 'Edit Topic' : 'Add New Topic'}</h2>
                     <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-[#283548] hover:bg-rose-50 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all"><X className="w-4 h-4" /></button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                     {formErrors._form && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg flex items-center gap-2">
                           <AlertCircle className="w-4 h-4 flex-shrink-0" />
                           <span>{formErrors._form}</span>
                        </div>
                     )}
                     <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Topic Name</label>
                           <input type="text" required value={formData.sub_topic} onChange={e => setFormData({ ...formData, sub_topic: e.target.value })} placeholder="Enter Topic Name" className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md text-sm outline-none focus:border-primary transition-all font-bold shadow-sm" />
                           <FieldError message={formErrors.sub_topic || formErrors.subTopic} />
                        </div>

                        {/* Activity Type Checkboxes */}
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl">
                           <p className="text-[10px] font-bold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Activity Type</p>
                           <div className="flex flex-wrap gap-5">
                              {/* Is Robotics Activity */}
                              <label className="flex items-center gap-2.5 cursor-pointer group">
                                 <input
                                    type="checkbox"
                                    id="is_robotics_activity"
                                    checked={formData.is_robotics_activity}
                                    onChange={e => setFormData({ ...formData, is_robotics_activity: e.target.checked, is_activity: e.target.checked || formData.is_python_activity || formData.is_ai_tool_activity })}
                                    className="w-4 h-4 accent-primary rounded"
                                 />
                                 <span className="text-[12px] font-semibold text-slate-700 dark:text-[#e2e8f0] group-hover:text-primary transition-colors">🤖 Is Robotics Activity</span>
                              </label>
                              {/* Is Python Activity */}
                              <label className="flex items-center gap-2.5 cursor-pointer group">
                                 <input
                                    type="checkbox"
                                    id="is_python_activity"
                                    checked={formData.is_python_activity}
                                    onChange={e => setFormData({ ...formData, is_python_activity: e.target.checked, is_activity: formData.is_robotics_activity || e.target.checked || formData.is_ai_tool_activity })}
                                    className="w-4 h-4 accent-primary rounded"
                                 />
                                 <span className="text-[12px] font-semibold text-slate-700 dark:text-[#e2e8f0] group-hover:text-primary transition-colors">🐍 Is Python Activity</span>
                              </label>
                              {/* Is AI Tool Activity */}
                              <label className="flex items-center gap-2.5 cursor-pointer group">
                                 <input
                                    type="checkbox"
                                    id="is_ai_tool_activity"
                                    checked={formData.is_ai_tool_activity}
                                    onChange={e => setFormData({ ...formData, is_ai_tool_activity: e.target.checked, is_activity: formData.is_robotics_activity || formData.is_python_activity || e.target.checked })}
                                    className="w-4 h-4 accent-primary rounded"
                                 />
                                 <span className="text-[12px] font-semibold text-slate-700 dark:text-[#e2e8f0] group-hover:text-primary transition-colors">🤖 Is AI Tool Activity</span>
                              </label>
                           </div>

                           {/* Browser URL — shown only when Is AI Tool Activity is checked */}
                           {formData.is_ai_tool_activity && (
                              <div className="pt-3 border-t border-slate-200 dark:border-[#334155] space-y-1.5 animate-in fade-in duration-200">
                                 <label className="text-[10px] font-bold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Browser URL <span className="text-primary">*</span></label>
                                 <input
                                    type="url"
                                    value={formData.browser_url}
                                    onChange={e => setFormData({ ...formData, browser_url: e.target.value })}
                                    placeholder="Enter Browser URL"
                                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all font-medium shadow-sm"
                                 />
                                 <p className="text-[10px] text-slate-400 dark:text-[#64748b]">This URL will open in an embedded browser tab in the student learning path.</p>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">


                        <div className="space-y-1.5">


                           <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Expected Periods</label>


                           <input


                              type="number"


                              min={1}


                              required


                              value={formData.expected_periods}


                              onChange={e => setFormData({ ...formData, expected_periods: parseInt(e.target.value) || 1 })}


                              placeholder="Required periods (e.g. 2)"


                              className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md text-sm outline-none focus:border-primary transition-all font-bold shadow-sm"


                           />


                           <FieldError message={formErrors.expected_periods || formErrors.expectedPeriods} />


                        </div>


                        <div className="space-y-1.5">


                           <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Display Order</label>


                           <input


                              type="number"


                              min={0}


                              required


                              value={formData.display_order}


                              onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}


                              placeholder="Display order (e.g. 1)"


                              className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md text-sm outline-none focus:border-primary transition-all font-bold shadow-sm"


                           />


                           <FieldError message={formErrors.display_order || formErrors.displayOrder} />


                        </div>


                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Select Grade Level</label>
                           <GradeLevelSelect
                              required
                              value={selectedGradeId}
                              onChange={(value) => { setSelectedGradeId(value); setFormData(prev => ({ ...prev, module_id: '' })); }}
                              source="master"
                              valueAs="id"
                              placeholder="Choose Grade Level"
                           />
                           <FieldError message={formErrors.grade_level_id} />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Select Unit</label>
                           <div className="relative">
                              <select required value={formData.module_id} onChange={e => handleModuleChange(e.target.value)} className="w-full px-4 pr-10 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-sm cursor-pointer shadow-sm appearance-none">
                                 <option value="">Select Unit</option>
                                 {filteredModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748b] pointer-events-none" />
                           </div>
                           <FieldError message={formErrors.module_id || formErrors.moduleId} />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">
                              🎥 Video Links <span className="text-indigo-400">(YouTube or Direct URL)</span>
                           </label>
                           <div className="space-y-2">
                              {videoUrls.map((url, idx) => (
                                 <div key={idx} className="flex gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 w-5 text-right shrink-0">{idx + 1}.</span>
                                    <input
                                       type="text"
                                       value={url}
                                       onChange={e => setVideoUrls(prev => prev.map((u, i) => i === idx ? e.target.value : u))}
                                       placeholder="YouTube URL or video link..."
                                       className="flex-1 px-3 py-2.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md text-sm outline-none focus:border-primary transition-all"
                                    />
                                    {/* File upload for this row */}
                                    <input
                                       type="file" accept="video/*" className="hidden"
                                       ref={el => { videoFileRefs.current[idx] = el; }}
                                       onChange={e => handleVideoFileUpload(e, idx)}
                                    />
                                    <button type="button"
                                       onClick={() => videoFileRefs.current[idx]?.click()}
                                       className="px-3 py-2.5 bg-gray-100 dark:bg-[#283548] text-gray-600 dark:text-[#cbd5e1] rounded-md hover:bg-gray-200 dark:hover:bg-[#334155] border border-gray-200 dark:border-[#334155] transition-all flex items-center gap-1.5 shrink-0"
                                       title="Upload video file"
                                    >
                                       {uploadingVideoIdx === idx
                                          ? <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                          : <Upload className="w-3.5 h-3.5" />}
                                    </button>
                                    {/* Move up */}
                                    {idx > 0 && (
                                       <button type="button"
                                          onClick={() => setVideoUrls(prev => { const a = [...prev];[a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; })}
                                          className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 dark:bg-[#283548] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-500 text-xs transition-all shrink-0 cursor-pointer"
                                          title="Move up"
                                       >↑</button>
                                    )}
                                    {/* Remove */}
                                    {videoUrls.length > 1 && (
                                       <button type="button"
                                          onClick={() => setVideoUrls(prev => prev.filter((_, i) => i !== idx))}
                                          className="w-7 h-7 flex items-center justify-center rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition-all shrink-0 cursor-pointer"
                                          title="Remove"
                                       >
                                          <X className="w-3.5 h-3.5" />
                                       </button>
                                    )}
                                 </div>
                              ))}
                           </div>
                           <button
                              type="button"
                              onClick={() => setVideoUrls(prev => [...prev, ''])}
                              className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                           >
                              <Plus className="w-3.5 h-3.5" /> Add another video
                           </button>
                           <FieldError message={formErrors.video_url || formErrors.videoUrl} />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Topic Full PDF Book</label>
                           <div className="flex gap-2">
                              <input type="text" value={formData.pdf_file_url} onChange={e => setFormData({ ...formData, pdf_file_url: e.target.value })} placeholder="Enter PDF Link" className="flex-1 px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-md text-sm outline-none focus:border-primary transition-all" />
                              <input type="file" id="pdfFileUrlInput" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'pdf_file_url')} />
                              <button type="button" onClick={() => document.getElementById('pdfFileUrlInput')?.click()} className="px-4 py-2.5 bg-gray-100 dark:bg-[#283548] text-gray-600 dark:text-[#cbd5e1] rounded-md hover:bg-gray-200 dark:hover:bg-[#334155] transition-all flex items-center gap-2 shadow-sm border border-gray-200 dark:border-[#334155]">
                                 {isUploading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                                 <span className="text-[10px] font-bold uppercase">Upload</span>
                              </button>
                           </div>
                           <FieldError message={formErrors.pdf_file_url || formErrors.pdfFileUrl} />
                        </div>
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Lesson Content</label>
                        <div className="border border-gray-200 dark:border-[#334155] rounded-md overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                           <PremiumRichTextEditor
                              value={formData.activity}
                              onChange={newContent => setFormData(prev => ({ ...prev, activity: newContent }))}
                              placeholder="Enter Lesson Content"
                           />
                        </div>
                        <FieldError message={formErrors.activity} />
                     </div>

                     {formData.is_activity && (
                        <>
                           <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Coding Content</label>
                              <textarea
                                 value={formData.code || ''}
                                 onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                 placeholder="Enter Coding Content"
                                 rows={10}
                                 className="w-full px-4 py-3 bg-slate-950 text-slate-100 border border-slate-800 rounded-md font-mono text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-inner leading-relaxed resize-y"
                              />
                              <FieldError message={formErrors.code} />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Diagram Content</label>
                              <div className="border border-gray-200 dark:border-[#334155] rounded-md overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                                 <PremiumRichTextEditor
                                    value={formData.diagram_url || ''}
                                    onChange={newContent => setFormData(prev => ({ ...prev, diagram_url: newContent }))}
                                    placeholder="Enter Diagram Content"
                                 />
                              </div>
                              <FieldError message={formErrors.diagram_url || formErrors.diagramUrl} />
                           </div>
                        </>
                     )}

                     <div className="flex items-center justify-end gap-3 pt-4 sticky bottom-0 bg-white dark:bg-[#1e293b] pb-2 border-t border-gray-100 dark:border-[#283548]">
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
                           <span>Save Topic</span>
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         <style>{`
            .jodit-content p { margin-bottom: 1rem; }
            .jodit-content b { font-weight: 700; color: #333; }
         `}</style>
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

export default Lessons;
