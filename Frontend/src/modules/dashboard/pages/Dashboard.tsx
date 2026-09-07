import PremiumRichTextEditor from '@/components/PremiumRichTextEditor';
import StatGridCards, { SkeletonStatGrid } from '@/components/StatGrid';
import { DashboardChartCard, DashboardPageShell, StatGrid, WelcomeBanner } from '@/components/dashboard/DashboardKit';
import Editor from '@monaco-editor/react';
import { Award, BarChart3, BookOpen, Building2, Calendar, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, ExternalLink, Globe, GraduationCap, Layers, LogOut, Menu, MessageSquareText, MonitorPlay, PanelLeftOpen, Paperclip, PieChart, PlayCircle, TrendingUp, Users, Zap } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { toast } from 'sonner';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

import {
   CHART_COLORS,
   DashboardAreaChart, DashboardBarChart,
   DashboardDualChart,
   DashboardPieChart
} from '@/components/dashboard/ChartKit';
import type { AdminAnalytics, PrincipalAnalytics, SuperAdminAnalytics } from '@/services/analyticsService';
import { analyticsService } from '@/services/analyticsService';
import api from '@/services/api';
import type { DashboardStats } from '@/types/index';
import { resolveMediaUrl } from '@/utils/urlHelper';

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

interface Lesson {
   id: string;
   module_id: string;
   module_name: string;
   sub_topic: string;
   activity?: string;
   video_url?: string;
   diagram_url?: string;
   procedure?: string;
   serial_number?: number;
   start_page?: number;
   end_page?: number;
   is_activity?: boolean;
   is_robotics_activity?: boolean;
   is_python_activity?: boolean;
   is_ai_tool_activity?: boolean;
   browser_url?: string;
   code?: string;
}

interface Module {
   id: string;
   name: string;
   pdf_file_url?: string;
   lessons: Lesson[];
}

type RoleAnalytics = SuperAdminAnalytics | AdminAnalytics | PrincipalAnalytics | null;

const Dashboard: React.FC = () => {
   const [rawStats, setRawStats] = useState<DashboardStats | null>(null);
   const [analytics, setAnalytics] = useState<RoleAnalytics>(null);
   const [analyticsLoading, setAnalyticsLoading] = useState(true);
   const [schoolFilter, setSchoolFilter] = useState('All');
   const [loading, setLoading] = useState(true);

   // stats == rawStats directly; the schoolFilter is forwarded to the API so the
   // server returns the correctly scoped data. No client-side fake-percentage math.
   const stats = rawStats;

   const [user, setUser] = useState<any>(null);
   const [studentModules, setStudentModules] = useState<Module[]>([]);
   const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
   const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
   const [activeTab, setActiveTab] = useState('Overview');
   const [completedLessons, setCompletedLessons] = useState<string[]>([]);
   const [numPages, setNumPages] = useState<number | null>(null);
   const [selfNote, setSelfNote] = useState('');
   const [isSaving, setIsSaving] = useState(false);
   const [sidebarWidth, setSidebarWidth] = useState(300);
   const [isResizing, setIsResizing] = useState(false);
   const [videoCollapsed, setVideoCollapsed] = useState(false);
   const [isProfileOpen, setIsProfileOpen] = useState(false);

   // Python Editor States
   const [pyodide, setPyodide] = useState<any>(null);
   const [pyodideLoading, setPyodideLoading] = useState(false);
   const [running, setRunning] = useState(false);
   const [output, setOutput] = useState('');
   const [editorCode, setEditorCode] = useState('print("Welcome to NubeEra Python Lab")');
   const [copiedCode, setCopiedCode] = useState(false);

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

   // Admin & Principal interactive dashboard states
   const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

   // Memoized options for PDF performance
   const pdfOptions = useMemo(() => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
   }), []);

   const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
   };

   // Fetch role-specific analytics
   useEffect(() => {
      const fetchAnalytics = async () => {
         const savedUser = localStorage.getItem('user');
         const currentUser = savedUser ? JSON.parse(savedUser) : null;
         const role = (currentUser?.utype || currentUser?.role || '').toLowerCase();
         if (!role || role === 'student') { setAnalyticsLoading(false); return; }
         try {
            let data: RoleAnalytics = null;
            if (role === 'superadmin') data = await analyticsService.getSuperAdmin();
            else if (role === 'admin') data = await analyticsService.getAdmin();
            else if (role === 'principal') data = await analyticsService.getPrincipal();
            setAnalytics(data);
         } catch (err) {
            console.error('Analytics fetch failed:', err);
         } finally {
            setAnalyticsLoading(false);
         }
      };
      fetchAnalytics();
   }, []);

   useEffect(() => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));

      const fetchData = async () => {
         try {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const role = currentUser.utype || currentUser.role?.toLowerCase();
            const isStudent = role === 'student';

            const requests: Promise<any>[] = [
               api.get('/modules'),
               api.get('/lessons')
            ];

            if (!isStudent) {
               requests.push(api.get('/dashboard/stats'));
            } else {
               requests.push(api.get('/lessons/completed'));
            }

            const results = await Promise.allSettled(requests);
            const [modulesRes, lessonsRes] = results;

            if (modulesRes.status === 'fulfilled' && lessonsRes.status === 'fulfilled') {
               const mods: any[] = modulesRes.value.data || [];
               const less: any[] = lessonsRes.value.data || [];

               // Units are school-agnostic master content keyed only by GradeLevelId.
               // The server already scopes /modules to the student's own grade level
               // (and school, via assignment) through the global query filter — no
               // client-side grade filtering needed or possible here.
               const filteredMods = mods;

               // Normalise every lesson: ensure both snake_case and camelCase fields are
               // present so tab conditions work regardless of API serialisation variance
               const normLesson = (l: any) => ({
                  ...l,
                  is_ai_tool_activity: l.is_ai_tool_activity ?? l.isAiToolActivity ?? false,
                  is_robotics_activity: l.is_robotics_activity ?? l.isRoboticsActivity ?? false,
                  is_python_activity: l.is_python_activity ?? l.isPythonActivity ?? false,
                  browser_url: l.browser_url ?? l.browserUrl ?? '',
                  is_activity: l.is_activity ?? l.isActivity ?? false,
                  display_order: l.display_order ?? l.displayOrder ?? 0,
               });

               const grouped = filteredMods.map(m => ({
                  ...m,
                  lessons: less
                     .filter((l: any) => l.module_id === m.id)
                     .map(normLesson)
                     .sort((a, b) => {
                        const diff = (a.display_order || 0) - (b.display_order || 0);
                        if (diff !== 0) return diff;
                        return (a.serial_number || 0) - (b.serial_number || 0);
                     })
               }));

               setStudentModules(grouped);

               if (grouped.length > 0 && grouped[0].lessons.length > 0) {
                  setSelectedLesson(grouped[0].lessons[0]);
                  setExpandedModules({ [grouped[0].id]: true });
               }
            }

            if (isStudent) {
               const completedRes = results[2];
               if (completedRes?.status === 'fulfilled') setCompletedLessons(completedRes.value.data);
            } else {
               const statsRes = results[2];
               if (statsRes?.status === 'fulfilled') setRawStats(statsRes.value.data);
            }

         } catch (error) {
            console.error('Error fetching dashboard data:', error);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   useEffect(() => {
      const savedUser = localStorage.getItem('user');
      const currentUser = savedUser ? JSON.parse(savedUser) : null;
      const role = currentUser?.utype || currentUser?.role?.toLowerCase();
      if (role && role !== 'student') {
         const fetchFilteredStats = async () => {
            try {
               const res = await api.get(`/dashboard/stats?schoolFilter=${schoolFilter}`);
               setRawStats(res.data);
            } catch (err) {
               console.error('Failed to fetch filtered stats:', err);
            }
         };
         fetchFilteredStats();
      }
   }, [schoolFilter]);

   // Handle sidebar resizing
   useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
         if (!isResizing) return;
         let newWidth = e.clientX;
         if (newWidth < 50) newWidth = 0; // Collapse if dragged far left
         if (newWidth > 50 && newWidth < 200) newWidth = 200; // Snap to min width
         if (newWidth > 600) newWidth = 600; // Max width
         setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
         setIsResizing(false);
         document.body.style.cursor = 'default';
      };

      if (isResizing) {
         window.addEventListener('mousemove', handleMouseMove);
         window.addEventListener('mouseup', handleMouseUp);
         document.body.style.cursor = 'col-resize';
      }

      return () => {
         window.removeEventListener('mousemove', handleMouseMove);
         window.removeEventListener('mouseup', handleMouseUp);
      };
   }, [isResizing]);

   // Load self-note when lesson changes
   useEffect(() => {
      setNumPages(null);
      const fetchNote = async () => {
         if (selectedLesson && user) {
            try {
               const res = await api.get(`/student-notes/${selectedLesson.id}`);
               setSelfNote(res.data?.content || '');
            } catch (error) {
               console.error('Error fetching note:', error);
               setSelfNote('');
            }
         }
      };
      fetchNote();
   }, [selectedLesson, user]);

   const handleSaveNote = async () => {
      if (!selectedLesson || !user) return;
      setIsSaving(true);
      try {
         await api.post('/student-notes', {
            lesson_id: selectedLesson.id,
            content: selfNote
         });
         toast.success('Note saved successfully');
      } catch (error) {
         console.error('Error saving note:', error);
         toast.error('Failed to save note');
      } finally {
         setIsSaving(false);
      }
   };

   const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('nubeera_selected_school_id');
      window.location.href = '/login';
   };

   const getUserInitials = () => {
      if (!user?.name) return 'S';
      return user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
   };

   const handleMarkAsCompleted = async (lessonId: string) => {
      try {
         await api.post(`/lessons/${lessonId}/complete`);
         setCompletedLessons(prev => [...prev, lessonId]);
         toast.success('Saved');
      } catch (error) {
         toast.error('Could not save');
      }
   };

   const toggleModule = (id: string) => {
      setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
   };

   const handleNextLesson = () => {
      if (!selectedLesson) return;
      const all = studentModules.flatMap(m => m.lessons);
      const idx = all.findIndex(l => l.id === selectedLesson.id);
      if (idx < all.length - 1) {
         const n = all[idx + 1];
         setSelectedLesson(n);
         setExpandedModules(p => ({ ...p, [n.module_id]: true }));
      }
   };

   const handlePreviousLesson = () => {
      if (!selectedLesson) return;
      const all = studentModules.flatMap(m => m.lessons);
      const idx = all.findIndex(l => l.id === selectedLesson.id);
      if (idx > 0) {
         const p = all[idx - 1];
         setSelectedLesson(p);
         setExpandedModules(prev => ({ ...prev, [p.module_id]: true }));
      }
   };



   const progress = useMemo(() => {
      const totalLessons = studentModules.reduce((acc, m) => acc + m.lessons.length, 0);
      if (totalLessons === 0) return 0;
      return Math.round((completedLessons.length / totalLessons) * 100);
   }, [studentModules, completedLessons]);

   const renderVideoPlayer = (url: string) => {
      if (!url) return <div className="w-full h-full flex items-center justify-center text-white/5"><PlayCircle className="w-24 h-24" /></div>;
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      if (isYoutube) {
         const videoId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
         return <iframe className="w-full h-full border-0" src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`} allowFullScreen title="NubeEra" />;
      }
      const resolvedUrl = resolveMediaUrl(url);
      return <video className="w-full h-full bg-black" src={resolvedUrl} controls controlsList="nodownload" />;
   };



   // ── Analytics chart data (mapped per role) ───────────────────────────────────
   const role = (user?.utype || user?.role || '').toLowerCase();
   const sa = analytics as SuperAdminAnalytics | null;
   const adm = analytics as AdminAnalytics | null;
   const prin = analytics as PrincipalAnalytics | null;

   // Dual enrollment chart
   const enrollmentDual = (() => {
      if (role === 'superadmin')
         return (sa?.school_growth_trend ?? []).map((d, i) => ({
            Month: d.month, Primary: d.value,
            Secondary: (sa?.student_growth_trend ?? [])[i]?.value ?? 0
         }));
      if (role === 'principal')
         return (prin?.enrollment_trend ?? []).map(d => ({ Month: d.month, Primary: d.value, Secondary: 0 }));
      return (adm?.student_admissions_trend ?? []).map((d, i) => ({
         Month: d.month, Primary: d.value,
         Secondary: (adm?.teacher_recruitment_trend ?? [])[i]?.value ?? 0
      }));
   })();

   const enrollmentPrimaryLabel = role === 'superadmin' ? 'Schools' : role === 'principal' ? 'Enrollment' : 'Students';
   const enrollmentSecondaryLabel = role === 'superadmin' ? 'Students' : role === 'principal' ? '' : 'Teachers';

   // User distribution pie
   const userDistPie = (() => {
      if (role === 'superadmin') return (sa?.user_distribution ?? []).map(d => ({ Label: d.label, Value: d.value }));
      if (role === 'principal') return (prin?.pass_fail_distribution ?? []).map(d => ({ Label: d.label, Value: d.value }));
      return (adm?.academic_performance_dist ?? []).map(d => ({ Label: d.label, Value: d.value }));
   })();

   const userDistTitle = role === 'superadmin' ? 'User Distribution' : role === 'principal' ? 'Pass / Fail Distribution' : 'Academic Performance';

   // Bottom-left bar chart
   const topBarData = (() => {
      if (role === 'superadmin') return (sa?.top_schools_by_enrollment ?? []).map(d => ({ Label: d.label, Value: d.value }));
      if (role === 'principal') return (prin?.subject_performance ?? []).map(d => ({ Label: d.label, Value: d.value }));
      return (adm?.attendance_summary_by_school ?? []).map(d => ({ Label: d.label, Value: d.value }));
   })();

   const topBarTitle = role === 'superadmin' ? 'Top Schools by Enrollment' : role === 'principal' ? 'Subject Performance' : 'Attendance by School';

   // Bottom-right trend chart
   const examTrend = (() => {
      if (role === 'superadmin') return (sa?.exam_performance_trend ?? []).map(d => ({ Month: d.month, Value: d.value }));
      if (role === 'principal') return (prin?.exam_results_trend ?? []).map(d => ({ Month: d.month, Value: d.value }));
      return (adm?.exam_results_trend ?? []).map(d => ({ Month: d.month, Value: d.value }));
   })();

   // Legacy fake computations (kept only for the SVG paths code block below)
   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
   const studentData = [45, 60, 80, 110, 130, 150, 190, 210, 230, 260, 290, 320];
   const teacherData = [10, 12, 15, 20, 22, 25, 28, 30, 32, 35, 38, 40];

   if (false) {
      // Suppress TS "unused" warnings for the SVG path vars below
      void months; void studentData; void teacherData;
      // SVG path generation for cubic curves (legacy — no longer rendered)
      let studentLinePath = "";
      let studentFillPath = "";
      let teacherLinePath = "";
      let teacherFillPath = "";
      void studentLinePath; void studentFillPath; void teacherLinePath; void teacherFillPath;

      if (true) {
         const cpX1 = 0;
         const cpY1 = 0; const cpX2 = 0; const cpY2 = 0;
         void cpX1; void cpY1; void cpX2; void cpY2;
      }
   }

   if (loading) return (
      <DashboardPageShell>
         <div className="h-8 w-48 bg-slate-100 rounded-full animate-pulse" />
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatGrid count={8} />
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12 h-72 bg-slate-100 rounded-2xl animate-pulse" />
         </div>
      </DashboardPageShell>
   );

   const isStudent = user?.utype === 'student' || user?.role?.toLowerCase() === 'student';

   if (isStudent) {
      return (
         <div className="flex flex-col h-screen fixed inset-0 bg-white dark:bg-[#0B1220] overflow-hidden text-[#555] dark:text-[#cbd5e1] font-sans z-[999]">
            <header className="h-[64px] bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-[#334155] shadow-[0_2px_8px_rgba(15,30,60,0.07)] flex items-center justify-between px-6 shrink-0 z-50">
               <div className="flex items-center gap-6">
                  <button
                     onClick={() => setSidebarWidth(sidebarWidth === 0 ? 300 : 0)}
                     className="p-2 hover:bg-gray-50 dark:hover:bg-[#283548] rounded-lg transition-colors text-gray-400 dark:text-[#64748b] hover:text-primary"
                     title={sidebarWidth === 0 ? "Expand Sidebar" : "Collapse Sidebar"}
                  >
                     {sidebarWidth === 0 ? <PanelLeftOpen className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>

                  <div className="flex items-center gap-2.5">
                     <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white shadow-sm">
                        <GraduationCap className="w-4.5 h-4.5" />
                     </div>
                     <span className="font-bold text-[15px] tracking-tight text-gray-900 dark:text-white">NubeEra tech</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200 dark:bg-[#334155] hidden md:block"></div>
               </div>

               <div className="flex items-center gap-10">
                  <div className="hidden lg:flex flex-col items-end gap-1.5">
                     <div className="flex items-center gap-4">
                        <div className="w-32 h-1.2 bg-gray-100 dark:bg-[#283548] rounded-full overflow-hidden">
                           <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-primary">{progress}% Progress</span>
                     </div>
                  </div>

                  <div className="h-8 w-px bg-gray-100 dark:bg-[#283548]"></div>

                  <div className="relative">
                     <div
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 cursor-pointer group"
                     >
                        <div className="flex flex-col items-end mr-1 hidden sm:flex">
                           <span className="text-[12px] font-bold text-gray-900 dark:text-white leading-none group-hover:text-primary transition-colors">{user?.name || 'Student'}</span>
                           <span className="text-[9px] font-bold text-gray-400 dark:text-[#64748b] tracking-widest mt-1">Student</span>
                        </div>
                        <div className="w-9 h-9 bg-brand-50 border border-brand-100 rounded-full flex items-center justify-center text-primary font-bold text-xs shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-300">
                           {getUserInitials()}
                        </div>
                     </div>

                     {isProfileOpen && (
                        <>
                           <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                           <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#283548] shadow-2xl rounded-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="px-4 py-3 border-b border-gray-50 dark:border-[#283548] mb-1">
                                 <p className="text-[11px] font-bold text-gray-400 dark:text-[#64748b] tracking-widest">Account</p>
                                 <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate mt-0.5">{user?.email}</p>
                              </div>
                              <button
                                 onClick={handleLogout}
                                 className="w-full px-4 py-2.5 text-left text-[12px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center gap-3 transition-colors"
                              >
                                 <div className="w-7 h-7 bg-rose-100 dark:bg-rose-500/15 rounded-lg flex items-center justify-center">
                                    <LogOut className="w-3.5 h-3.5" />
                                 </div>
                                 Logout
                              </button>
                           </div>
                        </>
                     )}
                  </div>
               </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
               <aside
                  style={{ width: `${sidebarWidth}px`, minWidth: sidebarWidth > 0 ? '200px' : '0px' }}
                  className={`bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-[#334155] shadow-[2px_0_12px_rgba(15,30,60,0.06)] flex flex-col shrink-0 overflow-y-auto no-scrollbar transition-[width] duration-300 ease-out ${sidebarWidth === 0 ? 'border-none shadow-none' : ''}`}
               >
                  {sidebarWidth > 0 && (
                     <>
                        <div className="p-6 pb-2 border-b border-gray-100/50 dark:border-[#283548]/50 mb-2">
                           <h4 className="text-[11px] font-bold text-gray-400 dark:text-[#64748b] tracking-[0.2em]">Learning paths</h4>
                        </div>

                        {studentModules.map((module, idx) => {
                           const isExpanded = expandedModules[module.id];
                           const moduleNum = String(idx + 1).padStart(2, '0');

                           return (
                              <div key={module.id} className="relative group/mod">
                                 <div className={`h-[3px] w-full transition-all duration-300 ${isExpanded ? 'bg-primary' : 'bg-transparent group-hover/mod:bg-brand-50'}`}></div>
                                 <div
                                    onClick={() => toggleModule(module.id)}
                                    className={`p-4 flex items-center justify-between cursor-pointer border-b border-gray-100/50 dark:border-[#283548]/50 transition-all ${isExpanded ? 'bg-brand-50/40' : 'hover:bg-gray-50/50 dark:hover:bg-[#283548]/50'}`}
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-[10px] shadow-sm transition-all ${isExpanded ? 'bg-primary text-white scale-110 shadow-brand/20' : 'bg-gray-100 dark:bg-[#283548] text-gray-500 dark:text-[#94a3b8]'}`}>
                                          {moduleNum}
                                       </div>
                                       <span className={`text-[12px] font-bold tracking-tight truncate ${isExpanded ? 'text-primary' : 'text-gray-600 dark:text-[#cbd5e1]'}`}>{module.name}</span>
                                    </div>
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-[#64748b] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                                 </div>

                                 {isExpanded && (
                                    <div className="bg-white dark:bg-[#1e293b] border-b border-gray-100/50 dark:border-[#283548]/50 animate-in slide-in-from-top-2 duration-300">
                                       {module.lessons.map((lesson) => {
                                          const isActive = selectedLesson?.id === lesson.id;
                                          return (
                                             <div
                                                key={lesson.id}
                                                onClick={() => { setSelectedLesson(lesson); setActiveTab('Overview'); }}
                                                className={`relative px-10 py-4 border-b border-gray-50 dark:border-[#283548]/60 text-[12px] font-bold cursor-pointer transition-all flex items-center gap-3 ${isActive ? 'text-primary bg-brand-50/30 translate-x-1' : 'text-gray-500 dark:text-[#94a3b8] hover:text-primary hover:bg-brand-50/30 hover:translate-x-1'}`}
                                             >
                                                {isActive && (
                                                   <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                                                )}
                                                {lesson.procedure === 'Activity' ? <Zap className={`w-3.5 h-3.5 ${isActive ? 'text-primary animate-pulse' : 'text-gray-300 dark:text-[#475569]'}`} /> : <BookOpen className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-gray-300 dark:text-[#475569]'}`} />}
                                                <span className="truncate">{lesson.sub_topic}</span>
                                                {completedLessons.includes(lesson.id) && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />}
                                             </div>
                                          );
                                       })}
                                    </div>
                                 )}
                              </div>
                           );
                        })}
                     </>
                  )}
               </aside>

               {/* Resizer Handle */}
               <div
                  onMouseDown={() => setIsResizing(true)}
                  onDoubleClick={() => setSidebarWidth(sidebarWidth === 0 ? 300 : 0)}
                  className={`w-1.5 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-40 relative group ${isResizing ? 'bg-primary/50' : 'bg-transparent'}`}
               >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#283548] shadow-sm rounded-full flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="w-0.5 h-0.5 bg-gray-400 dark:bg-[#64748b] rounded-full"></div>
                     <div className="w-0.5 h-0.5 bg-gray-400 dark:bg-[#64748b] rounded-full"></div>
                     <div className="w-0.5 h-0.5 bg-gray-400 dark:bg-[#64748b] rounded-full"></div>
                  </div>
               </div>

               <main className="flex-1 bg-slate-50 dark:bg-[#0B1220] overflow-y-auto no-scrollbar flex flex-col p-10 lg:p-14 relative scroll-smooth overflow-x-hidden">
                  {selectedLesson ? (
                     <div className="max-w-[1100px] w-full mx-auto pb-40">
                        <div className="flex items-center justify-between mb-10">
                           <div>
                              <div className="text-[10px] font-bold text-primary tracking-widest mb-1">{selectedLesson.module_name}</div>
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{selectedLesson.sub_topic}</h2>
                           </div>
                           <button
                              onClick={() => handleMarkAsCompleted(selectedLesson.id)}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-bold text-[11px] tracking-wide transition-all ${completedLessons.includes(selectedLesson.id) ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-brand/20'}`}
                           >
                              <CheckCircle2 className="w-4 h-4" />
                              {completedLessons.includes(selectedLesson.id) ? 'Completed' : 'Mark Complete'}
                           </button>
                        </div>

                        {/* Collapsible Video Section */}
                        <div className="mb-12">
                           <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-[#64748b] tracking-widest">VIDEO</span>
                              <button
                                 onClick={() => setVideoCollapsed(v => !v)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#283548] hover:bg-gray-200 dark:hover:bg-[#334155] text-gray-600 dark:text-[#cbd5e1] hover:text-gray-900 dark:hover:text-white rounded-lg text-[10px] font-bold transition-all"
                              >
                                 {videoCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                 {videoCollapsed ? 'Show Video' : 'Hide Video'}
                              </button>
                           </div>
                           {!videoCollapsed && (
                              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-300">
                                 {renderVideoPlayer(selectedLesson.video_url || '')}
                              </div>
                           )}
                        </div>

                        <div className="border-b border-gray-200 dark:border-[#334155] mb-8 flex overflow-x-auto no-scrollbar">
                           {[
                              { id: 'Attachment', label: 'Notes' },
                              ...(selectedLesson.is_python_activity
                                 ? [{ id: 'PythonEditor', label: '🐍 Python Editor' }]
                                 : []),
                              ...(selectedLesson.is_ai_tool_activity
                                 ? [{ id: 'Browser', label: '🌐 Browser' }]
                                 : []),
                              ...(selectedLesson.is_robotics_activity || (selectedLesson.is_activity && !selectedLesson.is_python_activity && !selectedLesson.is_ai_tool_activity) ? [
                                 { id: 'Code', label: '🤖 Robotics Code' },
                                 { id: 'Diagram', label: 'Reference Diagram' }
                              ] : []),
                              ...(selectedLesson.is_python_activity ? [
                                 { id: 'Code', label: '🐍 Python Code' }
                              ] : []),
                              { id: 'Overview', label: 'Read Content' },
                              { id: 'Notes', label: 'Self Notes' }
                           ].map(tab => (
                              <button
                                 key={tab.id}
                                 onClick={() => setActiveTab(tab.id)}
                                 className={`px-8 py-3.5 text-[11px] font-black tracking-tight transition-all relative shrink-0 ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 dark:text-[#64748b] hover:text-black dark:hover:text-white'}`}
                              >
                                 {tab.label}
                                 {activeTab === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary"></div>}
                              </button>
                           ))}
                        </div>

                        <div className="min-h-[500px] animate-in fade-in duration-500">
                           {activeTab === 'Overview' && (
                              <div className="jodit-content text-[13px] text-[#444] leading-relaxed max-w-4xl" dangerouslySetInnerHTML={{ __html: selectedLesson.activity || '<p>Nothing to read here yet.</p>' }} />
                           )}
                           {activeTab === 'Attachment' && (() => {
                              const parentModule = studentModules.find(m =>
                                 m.id?.toLowerCase() === selectedLesson.module_id?.toLowerCase() ||
                                 m.id?.toLowerCase() === (selectedLesson as any).moduleId?.toLowerCase()
                              );

                              // Robust property check for both snake_case and PascalCase across Module and Lesson
                              const pdfUrl = parentModule?.pdf_file_url ||
                                 (parentModule as any)?.PdfFileUrl ||
                                 (parentModule as any)?.pdfFileUrl ||
                                 selectedLesson.diagram_url ||
                                 (selectedLesson as any).diagramUrl ||
                                 (selectedLesson as any).DiagramUrl ||
                                 (selectedLesson as any).pdf_file_url ||
                                 (selectedLesson as any).PdfFileUrl;

                              return (
                                 <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {pdfUrl ? (
                                       <div className="flex flex-col items-center py-4 min-h-[600px]" onContextMenu={(e) => e.preventDefault()}>
                                          <Document
                                             key={pdfUrl}
                                             file={resolveMediaUrl(pdfUrl)}
                                             onLoadSuccess={onDocumentLoadSuccess}
                                             options={pdfOptions}
                                             loading={
                                                <div className="p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
                                                   <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                                                   <p className="text-[11px] font-black text-gray-400 dark:text-[#64748b] tracking-widest animate-pulse">Initializing notes...</p>
                                                   <p className="text-[9px] text-gray-300 dark:text-[#475569] mt-2 font-bold tracking-tight">Large files may take a moment</p>
                                                </div>
                                             }
                                             onLoadError={(error) => {
                                                console.error("PDF Load Error:", error);
                                                toast.error("Error loading PDF document.");
                                             }}
                                             error={
                                                <div className="p-20 text-center flex flex-col items-center justify-center bg-rose-50/30 rounded-xl border border-dashed border-rose-100 min-h-[300px]">
                                                   <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                                                      <Paperclip className="w-6 h-6" />
                                                   </div>
                                                   <p className="text-rose-500 font-black text-[10px] tracking-widest">Failed to load document</p>
                                                   <button
                                                      onClick={() => window.location.reload()}
                                                      className="mt-4 px-4 py-2 bg-white dark:bg-[#1e293b] border border-rose-200 dark:border-rose-400/25 text-rose-500 dark:text-rose-300 text-[9px] font-black tracking-widest rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all"
                                                   >
                                                      Retry Loading
                                                   </button>
                                                </div>
                                             }
                                          >
                                             {(() => {
                                                const start = selectedLesson.start_page || 1;
                                                const end = selectedLesson.end_page || (numPages || start);

                                                const pages = [];
                                                for (let i = start; i <= end; i++) {
                                                   if (numPages && i > numPages) break;
                                                   pages.push(
                                                      <div key={i} className="mb-10 last:mb-0 select-none pdf-container">
                                                         <Page
                                                            pageNumber={i}
                                                            width={Math.min(window.innerWidth * 0.85, 950)}
                                                            renderAnnotationLayer={false}
                                                            renderTextLayer={false}
                                                            className="shadow-xl border border-gray-100 dark:border-[#334155] rounded-md overflow-hidden"
                                                         />
                                                      </div>
                                                   );
                                                }
                                                return pages.length > 0 ? pages : (numPages ? <div className="p-20 text-center text-gray-400 dark:text-[#64748b] italic text-[10px] tracking-widest">No accessible content</div> : null);
                                             })()}
                                          </Document>
                                       </div>
                                    ) : (
                                       <div className="flex flex-col items-center justify-center py-20 w-full bg-gray-50/20 dark:bg-[#283548]/20 rounded-xl border border-dashed border-gray-200 dark:border-[#334155]">
                                          <Paperclip className="w-12 h-12 text-gray-200 dark:text-[#475569] mb-6" />
                                          <p className="text-[11px] font-black text-gray-400 dark:text-[#64748b] tracking-widest">No notes available for this lesson</p>
                                       </div>
                                    )}
                                 </div>
                              )
                           })()}
                           {activeTab === 'Notes' && (
                              <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-500">
                                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-[#283548]">
                                    <div className="flex items-center gap-3">
                                       <MessageSquareText className="w-5 h-5 text-primary" />
                                       <h4 className="text-xs font-bold text-gray-900 dark:text-white">Personal notes</h4>
                                    </div>
                                    <button
                                       onClick={handleSaveNote}
                                       disabled={isSaving}
                                       className={`px-6 py-2 rounded-md text-[10px] font-bold tracking-wider transition-all shadow-lg ${isSaving ? 'bg-gray-100 dark:bg-[#283548] text-gray-400 dark:text-[#64748b] shadow-none' : 'bg-primary text-white hover:bg-primary-dark shadow-brand/20'}`}
                                    >
                                       {isSaving ? 'Saving...' : 'Save Note'}
                                    </button>
                                 </div>

                                 <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1e293b]">
                                    <PremiumRichTextEditor
                                       value={selfNote}
                                       onChange={setSelfNote}
                                       placeholder="Enter Notes"
                                    />
                                 </div>
                              </div>
                           )}

                           {activeTab === 'Browser' && selectedLesson.is_ai_tool_activity && (
                              <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-500 space-y-3">
                                 {selectedLesson.browser_url ? (
                                    isFrameBlocked(selectedLesson.browser_url) ? (
                                       <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-brand-50 to-gray-50 dark:from-slate-900/50 dark:to-slate-800/20 rounded-2xl border border-brand-100 dark:border-brand-900/30 text-center shadow-sm" style={{ height: '600px' }}>
                                          <div className="w-16 h-16 bg-brand-50/80 dark:bg-brand-950/50 text-primary rounded-full flex items-center justify-center mb-5 animate-bounce">
                                             <Globe className="w-8 h-8" />
                                          </div>
                                          <h4 className="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight">External Learning Workspace</h4>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-2 leading-relaxed">
                                             Due to security policies of the external site, this tool cannot be loaded inside the learning portal. Click below to launch it safely in a new browser tab.
                                          </p>
                                          <a
                                             href={selectedLesson.browser_url}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="mt-6 flex items-center gap-2.5 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                                          >
                                             Launch Workspace <ExternalLink className="w-4 h-4" />
                                          </a>
                                       </div>
                                    ) : (
                                       <>
                                          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-[#283548]">
                                             <span className="text-lg">🌐</span>
                                             <div>
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white">AI Tool</h4>
                                                <a href={selectedLesson.browser_url} target="_blank" rel="noopener noreferrer"
                                                   className="text-[10px] text-primary font-semibold hover:underline truncate block max-w-sm">
                                                   {selectedLesson.browser_url}
                                                </a>
                                             </div>
                                          </div>
                                          <iframe
                                             src={selectedLesson.browser_url}
                                             title="AI Tool Browser"
                                             className="w-full rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm"
                                             style={{ height: '600px' }}
                                             sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                                          />
                                       </>
                                    )
                                 ) : (
                                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-[#283548] rounded-xl border border-dashed border-gray-200 dark:border-[#334155]">
                                       <span className="text-4xl mb-4">🌐</span>
                                       <p className="text-xs font-bold text-gray-500 dark:text-[#94a3b8]">No Browser URL configured for this lesson.</p>
                                       <p className="text-[10px] text-gray-400 dark:text-[#64748b] mt-1">Ask your teacher to add a Browser URL in the topic settings.</p>
                                    </div>
                                 )}
                              </div>
                           )}

                           {activeTab === 'Code' && (selectedLesson.is_robotics_activity || selectedLesson.is_python_activity || selectedLesson.is_activity) && (
                              <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-500 space-y-4">
                                 <h4 className="text-xs font-black text-slate-800 tracking-widest flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-primary" /> Required Code
                                 </h4>
                                 {selectedLesson.code ? (() => {
                                    const rawCodeLines = cleanCodeText(selectedLesson.code).split('\n');
                                    return (
                                       <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs text-slate-100 max-w-full">
                                          <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2.5 flex items-center justify-between select-none">
                                             <span className="text-[11px] font-bold text-slate-400">
                                                {selectedLesson.is_python_activity ? 'main.py (Python)' : 'main.py (MicroPython)'}
                                             </span>
                                             <button
                                                type="button"
                                                onClick={() => handleCopyCode(selectedLesson.code || '')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black transition-all duration-200 cursor-pointer ${copiedCode
                                                   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                   : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                                                   }`}
                                             >
                                                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                {copiedCode ? 'Copied!' : 'Copy Code'}
                                             </button>
                                          </div>
                                          <div className="flex overflow-x-auto max-h-[350px] divide-x divide-[#21262d]">
                                             <div className="bg-[#0d1117]/90 text-slate-500 text-right pr-3 pl-2 py-4 select-none shrink-0 min-w-[35px]">
                                                {rawCodeLines.map((_, i) => (
                                                   <div key={i} className="leading-6 h-6">{i + 1}</div>
                                                ))}
                                             </div>
                                             <div className="flex-1 p-4 bg-[#0d1117]/30 overflow-x-auto min-w-0">
                                                {rawCodeLines.map((line, i) => (
                                                   <div key={i} className="leading-6 h-6 whitespace-pre text-slate-200 hover:bg-slate-800/30 px-1 rounded-sm">
                                                      {line || ' '}
                                                   </div>
                                                ))}
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 })() : (
                                    <div className="bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-xl p-5 text-xs text-gray-400 dark:text-[#64748b] italic">
                                       No code provided for this activity.
                                    </div>
                                 )}
                              </div>
                           )}

                           {activeTab === 'Diagram' && (selectedLesson.is_robotics_activity || selectedLesson.is_activity) && (
                              <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-500 space-y-4">
                                 <h4 className="text-xs font-black text-slate-800 tracking-widest flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-primary" /> Reference Diagram
                                 </h4>
                                 <div className="bg-gray-50 dark:bg-[#283548] border border-gray-200 dark:border-[#334155] rounded-xl p-5 min-h-[150px]">
                                    {selectedLesson.diagram_url ? (
                                       <div className="jodit-content text-sm text-gray-600 dark:text-[#cbd5e1] leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedLesson.diagram_url }} />
                                    ) : (
                                       <p className="text-xs text-gray-405 dark:text-[#64748b] italic">No diagram provided.</p>
                                    )}
                                 </div>
                              </div>
                           )}

                           {activeTab === 'PythonEditor' && selectedLesson.is_python_activity && (
                              <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-500 space-y-6">
                                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-4">
                                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                          <div className="flex items-center gap-2">
                                             <span className="text-xl">🐍</span>
                                             <h4 className="text-xs font-bold text-gray-800 dark:text-[#e2e8f0] tracking-wider">Python Preview Workspace</h4>
                                          </div>

                                          <div className="flex items-center gap-2">
                                             <button
                                                onClick={runPythonCode}
                                                disabled={running || pyodideLoading}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-350 text-white font-bold text-[10px] tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                                             >
                                                {running ? 'Running...' : '▶ Run Code'}
                                             </button>
                                             <button
                                                onClick={() => {
                                                   if (confirm('Reset editor to default starter code?')) {
                                                      setEditorCode(selectedLesson.code || 'print("Welcome to NubeEra Python Lab")');
                                                   }
                                                }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                                             >
                                                🔄 Reset
                                             </button>
                                          </div>
                                       </div>

                                       <div className="border border-gray-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm h-[400px]">
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
                                          <h4 className="text-xs font-black text-slate-800 dark:text-[#e2e8f0] tracking-wider">Console Output</h4>
                                          <button
                                             onClick={() => setOutput('')}
                                             className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
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

                        <div className="fixed bottom-12 right-12 flex items-center gap-6 z-50">
                           <div className="flex items-center gap-8 bg-white dark:bg-[#1e293b] backdrop-blur shadow-[0_8px_32px_rgba(15,30,60,0.15)] rounded-xl border border-slate-200 dark:border-[#334155] px-10 py-3.5">
                              <button onClick={handlePreviousLesson} className="flex items-center gap-2.5 text-[12px] font-black text-[#888] dark:text-[#94a3b8] hover:text-black dark:hover:text-white transition-colors">
                                 <ChevronLeft className="w-5 h-5" /> Back
                              </button>
                              <div className="h-4 w-px bg-gray-300 dark:bg-[#334155]"></div>
                              <button onClick={handleNextLesson} className="flex items-center gap-2.5 text-[12px] font-black text-[#888] dark:text-[#94a3b8] hover:text-black dark:hover:text-white transition-colors">
                                 Next <ChevronRight className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                        <MonitorPlay className="w-32 h-32" />
                     </div>
                  )}
               </main>
            </div>



            <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
            body { font-family: 'Poppins', sans-serif; margin: 0; padding: 0; }
            .no-scrollbar::-webkit-scrollbar {
              display: block;
              width: 4px;
              height: 4px;
            }
            .no-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .no-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(75, 72, 207, 0.25);
              border-radius: 2px;
            }
            .no-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(75, 72, 207, 0.45);
            }
            .dark .no-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(0, 212, 255, 0.25);
            }
            .dark .no-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 212, 255, 0.45);
            }
            .no-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(75, 72, 207, 0.25) transparent;
            }
            .dark .no-scrollbar {
              scrollbar-color: rgba(0, 212, 255, 0.25) transparent;
            }
            .jodit-content p { margin-bottom: 2rem; }
            .jodit-content ul { padding-left: 2.5rem; list-style-type: disc; margin-bottom: 2rem; }
            .jodit-content b { font-weight: 800; color: #111; display: block; margin-bottom: 0.5rem; margin-top: 1rem; }
            
            /* PDF Security */
            .pdf-container { user-select: none !important; -webkit-user-select: none !important; }
            @media print {
                body { display: none !important; }
            .jodit-editor { border: none !important; }
            .jodit-editor { border: none !important; }
            .jodit-workplace { min-height: 400px !important; }
        `}</style>
         </div>
      );
   }

   return (
      <DashboardPageShell>
         {/* ── Welcome Banner ─────────────────────────────────── */}
         <WelcomeBanner
            badge={user?.utype === 'principal' ? 'Principal Portal' : 'Admin Portal'}
            badgeColor={user?.utype === 'principal' ? 'violet' : 'indigo'}
            title={`Welcome back, ${user?.name || 'Administrator'}!`}
            subtitle={
               // Principals oversee exactly one school, so "schools" (plural) reads wrong
               // even when the count happens to be 1 — say "your school" for that role and
               // reserve the schools-count phrasing for platform-wide roles.
               user?.utype === 'principal'
                  ? `Managing your school, ${stats?.total_teachers || 0} faculty members, and ${stats?.total_students || 0} enrolled students.`
                  : `Managing ${stats?.total_schools || 0} active schools, ${stats?.total_teachers || 0} faculty members, and ${stats?.total_students || 0} enrolled students.`
            }
            actions={undefined}
         />

         {/* ── Key Metrics ─────────────────────────────────── */}
         <StatGrid cols={4}>
            <StatGridCards stats={[
               // Principals oversee exactly one school (TotalSchools is always 1 for them
               // server-side), so the plural "Active Schools" label reads wrong — use the
               // singular "Active School" for that role only.
               { title: user?.utype === 'principal' ? 'Active School' : 'Active Schools', value: stats?.total_schools || 0, icon: <Building2 className="w-5 h-5" />, color: 'purple', subtitle: user?.utype === 'principal' ? 'In good standing' : '+2 new this term' },
               { title: 'Academic Grades', value: stats?.total_grades || 0, icon: <Layers className="w-5 h-5" />, color: 'violet', subtitle: 'Primary & Secondary' },
               user?.utype === 'principal'
                  ? { title: 'Scheduled Exams', value: stats?.total_exams || 0, icon: <Calendar className="w-5 h-5" />, color: 'indigo', subtitle: 'Active this term' }
                  : { title: 'Faculty Members', value: stats?.total_teachers || 0, icon: <Users className="w-5 h-5" />, color: 'emerald', subtitle: '99% active ratio' },
               { title: 'Total Students', value: stats?.total_students || 0, icon: <GraduationCap className="w-5 h-5" />, color: 'amber', subtitle: '+12 new enrollments' },
            ]} />
         </StatGrid>

         {/* ── Pending / Secondary Metrics ─────────────────── */}
         {user?.utype !== 'principal' && (
            <StatGrid cols={4}>
               <StatGridCards stats={[
                  { title: 'Pending Teachers', value: stats?.total_teachers_pending || 0, icon: <Users className="w-5 h-5" />, color: 'amber', subtitle: 'Under review' },
                  { title: 'Pending Students', value: stats?.total_students_pending || 0, icon: <GraduationCap className="w-5 h-5" />, color: 'sky', subtitle: 'To verify' },
                  { title: 'Scheduled Exams', value: stats?.total_exams || 0, icon: <Calendar className="w-5 h-5" />, color: 'indigo', subtitle: 'Active this term' },
                  { title: 'Graded Results', value: stats?.total_results || 0, icon: <Award className="w-5 h-5" />, color: 'emerald', subtitle: 'Released' },
               ]} />
            </StatGrid>
         )}

         {/* ── Syllabus and Subject Charts (Requested) ───────── */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <DashboardChartCard
               className="lg:col-span-6"
               title="Syllabus Completion by Grade"
               icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-500" />}
               badge="Coverage"
               badgeVariant="primary"
            >
               <div className="min-h-[260px]">
                  <DashboardBarChart
                     data={((analytics as any)?.syllabus_completion_by_grade || (analytics as any)?.syllabusCompletionByGrade || []).map((d: any) => ({
                        Label: d.label || d.Label || '',
                        Value: d.value ?? d.Value ?? 0,
                     }))}
                     color="#6366f1"
                     height={260}
                     loading={analyticsLoading}
                     suffix="%"
                  />
               </div>
            </DashboardChartCard>

            <DashboardChartCard
               className="lg:col-span-6"
               title="Subjectwise Academic Performance"
               icon={<BarChart3 className="w-4.5 h-4.5 text-teal-600" />}
               badge="Average Score"
               badgeVariant="teal"
            >
               <div className="min-h-[260px]">
                  <DashboardBarChart
                     data={((analytics as any)?.subjectwise_performance || (analytics as any)?.subjectwisePerformance || []).map((d: any) => ({
                        Label: d.label || d.Label || '',
                        Value: d.value ?? d.Value ?? 0,
                     }))}
                     color="#14b8a6"
                     height={260}
                     loading={analyticsLoading}
                     suffix="%"
                     colorful
                  />
               </div>
            </DashboardChartCard>
         </div>

         {/* ── Charts ──────────────────────────────────────── */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Column B: Enrollment / Growth Chart — real analytics */}
            <DashboardChartCard
               className="lg:col-span-12"
               title={role === 'superadmin' ? 'Platform Growth Trend' : role === 'principal' ? 'Student Enrollment Trend' : 'Admissions & Recruitment Trend'}
               icon={<TrendingUp className="w-4.5 h-4.5 text-blue-600" />}
               badge="Monthly"
               badgeVariant="blue"
            >
               <div className="min-h-[260px]">
                  <DashboardDualChart
                     data={enrollmentDual}
                     primaryLabel={enrollmentPrimaryLabel}
                     secondaryLabel={enrollmentSecondaryLabel}
                     primaryColor={CHART_COLORS[3]}
                     secondaryColor={CHART_COLORS[1]}
                     height={260}
                     loading={analyticsLoading}
                  />
               </div>
            </DashboardChartCard>
         </div>

         {/* ── Bottom Analytics Row — real analytics ───────── */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Top Schools / Subject Performance / Attendance by School */}
            <DashboardChartCard
               title={topBarTitle}
               icon={<BarChart3 className="w-4.5 h-4.5 text-teal-600" />}
               badge="By Category"
               badgeVariant="teal"
            >
               <DashboardBarChart
                  data={topBarData}
                  color={CHART_COLORS[5]}
                  height={220}
                  loading={analyticsLoading}
                  layout="horizontal"
                  colorful
               />
            </DashboardChartCard>

            {/* Middle: User Distribution / Pass-Fail / Academic Performance */}
            <DashboardChartCard
               title={userDistTitle}
               icon={<PieChart className="w-4.5 h-4.5 text-blue-600" />}
               badge="Ratio"
               badgeVariant="primary"
            >
               <DashboardPieChart
                  data={userDistPie}
                  height={220}
                  loading={analyticsLoading}
               />
            </DashboardChartCard>

            {/* Right: Exam Performance Trend */}
            <DashboardChartCard
               title="Exam Performance Trend"
               icon={<Award className="w-4.5 h-4.5 text-rose-500" />}
               badge="Monthly Avg"
               badgeVariant="rose"
            >
               <DashboardAreaChart
                  data={examTrend}
                  color={CHART_COLORS[8]}
                  height={220}
                  loading={analyticsLoading}
                  suffix="%"
               />
            </DashboardChartCard>
         </div>
      </DashboardPageShell>
   );
};

export default Dashboard;
