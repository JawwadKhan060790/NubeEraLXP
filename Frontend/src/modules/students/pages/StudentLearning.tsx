import PremiumRichTextEditor from '@/components/PremiumRichTextEditor';
import VideoCarousel from '@/components/VideoCarousel';
import api from '@/services/api';
import { resolveMediaUrl } from '@/utils/urlHelper';
import Editor from '@monaco-editor/react';
import { BookOpen, Bot, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Code2, Copy, ExternalLink, FileText, Focus, Globe, GripVertical, Image as ImageIcon, Lock, Maximize2, Minimize2, MonitorPlay, NotebookPen, PanelLeftClose, PanelLeftOpen, Paperclip, PlayCircle, X, Zap } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { toast } from 'sonner';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface Lesson {
  id: string;
  module_id: string;
  module_name: string;
  sub_topic: string;
  activity?: string;
  video_url?: string;
  video_urls?: string[];
  diagram_url?: string;
  procedure?: string;
  code?: string;
  serial_number?: number;
  pdf_file_url?: string;
  is_activity?: boolean;
  is_robotics_activity?: boolean;
  is_python_activity?: boolean;
  is_ai_tool_activity?: boolean;
  browser_url?: string;
}

interface Module {
  id: string;
  name: string;
  pdf_file_url?: string;
  lessons: Lesson[];
}

type DockTabId = 'Attachment' | 'Code' | 'Diagram' | 'Overview' | 'Browser' | 'PythonEditor';

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

// Friendly hostname + favicon helpers for the "can't embed" workspace card
const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const getFaviconUrl = (url: string): string => {
  const domain = getDomain(url);
  return domain ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}` : '';
};

const StudentLearning: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Lesson Learning Portal States
  const [studentModules, setStudentModules] = useState<Module[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  // `activeTab` now drives the *Tools Dock* only — personal notes are no longer a tab,
  // they live in the always-visible Notes strip next to the video (see redesign rationale).
  const [activeTab, setActiveTab] = useState<DockTabId>('Attachment');
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [selfNote, setSelfNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBrowserUrl, setCopiedBrowserUrl] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(true);

  // Workbench layout states (Adaptive Learning Workbench redesign)
  const [focusMode, setFocusMode] = useState(false);          // hides curriculum rail for deep work
  const [notesExpanded, setNotesExpanded] = useState(false);  // expands the persistent notes strip to full height
  const [dockWidth, setDockWidth] = useState(400);            // resizable Tools Dock width (px)
  const dockResizing = useRef(false);
  const [isFullscreenVideo, setIsFullscreenVideo] = useState(false);
  const [isFullscreenMaterials, setIsFullscreenMaterials] = useState(false);

  // Python Editor States
  const [pyodide, setPyodide] = useState<any>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [editorCode, setEditorCode] = useState('print("Welcome to NubeEra Python Lab")');
  const [lastSavedCode, setLastSavedCode] = useState('print("Welcome to NubeEra Python Lab")');
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);

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

  // Memoized options for PDF performance
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Modules, Lessons, and Completions for the Study Center
      const [modulesRes, lessonsRes, completedRes] = await Promise.all([
        api.get('/modules'),
        api.get('/lessons'),
        api.get('/lessons/completed')
      ]);

      const mods: any[] = modulesRes.data || [];
      const less: any[] = lessonsRes.data || [];
      const completed: string[] = completedRes.data || [];

      setCompletedLessons(completed);

      const normModule = (m: any) => ({
        ...m,
        id: m.id || m.Id || '',
        name: m.name || m.Name || '',
        pdf_file_url: m.pdf_file_url ?? m.pdfFileUrl ?? '',
        grade_level_id: m.grade_level_id ?? m.gradeLevelId ?? '',
      });

      const normLesson = (l: any) => ({
        ...l,
        id: l.id || l.Id || '',
        module_id: l.module_id ?? l.moduleId ?? '',
        module_name: l.module_name ?? l.moduleName ?? '',
        sub_topic: l.sub_topic ?? l.subTopic ?? '',
        video_url: l.video_url ?? l.videoUrl ?? '',
        video_urls: Array.isArray(l.video_urls) ? l.video_urls
          : Array.isArray(l.videoUrls) ? l.videoUrls
          : undefined,
        diagram_url: l.diagram_url ?? l.diagramUrl ?? '',
        serial_number: l.serial_number ?? l.serialNumber ?? 0,
        display_order: l.display_order ?? l.displayOrder ?? 0,
        pdf_file_url: l.pdf_file_url ?? l.pdfFileUrl ?? '',
        is_ai_tool_activity: l.is_ai_tool_activity ?? l.isAiToolActivity ?? false,
        is_robotics_activity: l.is_robotics_activity ?? l.isRoboticsActivity ?? false,
        is_python_activity: l.is_python_activity ?? l.isPythonActivity ?? false,
        browser_url: l.browser_url ?? l.browserUrl ?? '',
        is_activity: l.is_activity ?? l.isActivity ?? false,
      });

      // Modules are already filtered server-side by the student's school + grade (via JWT claims).
      // No client-side grade filter needed — just normalise the shape.
      const filteredMods = mods.map(normModule);

      const normalizedLessons = less.map(normLesson);

      const grouped = filteredMods.map(m => ({
        ...m,
        lessons: normalizedLessons
          .filter((l: any) => l.module_id === m.id)
          .sort((a, b) => {
            const diff = (a.display_order || 0) - (b.display_order || 0);
            if (diff !== 0) return diff;
            return (a.serial_number || 0) - (b.serial_number || 0);
          })
      })).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

      setStudentModules(grouped);

      const allLessons = grouped.flatMap(m => m.lessons);
      const firstUncompleted = allLessons.find(l => !completed.includes(l.id)) || allLessons[0];

      const urlParams = new URLSearchParams(window.location.search);
      const queryLessonId = urlParams.get('lessonId');

      if (queryLessonId) {
        const queryLesson = allLessons.find(l => l.id === queryLessonId);
        if (queryLesson) {
          const queryLessonIdx = allLessons.findIndex(l => l.id === queryLessonId);
          const firstUncompletedIdx = allLessons.findIndex(l => !completed.includes(l.id));
          const isEnabled = completed.includes(queryLessonId) || queryLessonIdx === firstUncompletedIdx || firstUncompletedIdx === -1;
          
          if (isEnabled) {
            setSelectedLesson(queryLesson);
            setExpandedModules({ [queryLesson.module_id]: true });
            return;
          } else {
            toast.warning('This lesson is locked. Redirecting to your current topic.');
          }
        }
      }

      if (allLessons.length > 0) {
        const defaultLesson = firstUncompleted || allLessons[0];
        setSelectedLesson(defaultLesson);
        setExpandedModules({ [defaultLesson.module_id]: true });
      }
    } catch (error) {
      console.error('Failed to fetch learning materials', error);
      toast.error('Failed to load study portal content.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch self note whenever the active lesson changes
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

  // Fetch saved python code
  useEffect(() => {
    const fetchSavedCode = async () => {
      if (selectedLesson && selectedLesson.is_python_activity) {
        try {
          const res = await api.get(`/student-python-code/${selectedLesson.id}`);
          if (res.data && res.data.pythonCode) {
            setEditorCode(res.data.pythonCode);
            setLastSavedCode(res.data.pythonCode);
          } else {
            setEditorCode('print("Welcome to NubeEra Python Lab")');
            setLastSavedCode('print("Welcome to NubeEra Python Lab")');
          }
        } catch (error) {
          console.error('Error fetching saved code:', error);
          setEditorCode('print("Welcome to NubeEra Python Lab")');
          setLastSavedCode('print("Welcome to NubeEra Python Lab")');
        }
      }
    };
    fetchSavedCode();
  }, [selectedLesson]);

  // Manual save Python code
  const handleSaveCode = async (showToast = true) => {
    if (!selectedLesson) return;
    setIsSavingCode(true);
    try {
      const parentModule = studentModules.find(m =>
        m.id?.toLowerCase() === selectedLesson.module_id?.toLowerCase() ||
        m.id?.toLowerCase() === (selectedLesson as any).moduleId?.toLowerCase()
      );
      const courseId = parentModule?.id || selectedLesson.module_id;

      await api.post('/student-python-code', {
        lesson_id: selectedLesson.id,
        course_id: courseId,
        python_code: editorCode
      });
      setLastSavedCode(editorCode);
      if (showToast) {
        toast.success('Saved Successfully');
      }
    } catch (error) {
      console.error('Error saving code:', error);
      if (showToast) {
        toast.error('Failed to save code');
      }
    } finally {
      setIsSavingCode(false);
    }
  };

  // Run Python code via Pyodide
  const runPythonCode = async () => {
    if (!pyodide) {
      toast.error('Python runtime is still loading...');
      return;
    }
    setRunning(true);
    setOutput('');
    try {
      // Setup stdout and stderr redirection in Python
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

  // Auto-save Python code (every 30 seconds if modified)
  useEffect(() => {
    if (activeTab !== 'PythonEditor' || !selectedLesson || !selectedLesson.is_python_activity) return;

    const interval = setInterval(() => {
      if (editorCode !== lastSavedCode) {
        setIsAutosaving(true);
        const parentModule = studentModules.find(m =>
          m.id?.toLowerCase() === selectedLesson.module_id?.toLowerCase() ||
          m.id?.toLowerCase() === (selectedLesson as any).moduleId?.toLowerCase()
        );
        const courseId = parentModule?.id || selectedLesson.module_id;

        api.post('/student-python-code', {
          lesson_id: selectedLesson.id,
          course_id: courseId,
          python_code: editorCode
        }).then(() => {
          setLastSavedCode(editorCode);
          toast.success('Saved Successfully');
          setIsAutosaving(false);
        }).catch((err) => {
          console.error('Auto-save failed:', err);
          setIsAutosaving(false);
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [editorCode, lastSavedCode, activeTab, selectedLesson, studentModules]);

  const handleMarkAsCompleted = async (lessonId: string) => {
    const isCompleted = completedLessons.includes(lessonId);
    try {
      if (isCompleted) {
        await api.delete(`/lessons/${lessonId}/complete`);
        setCompletedLessons(prev => prev.filter(id => id !== lessonId));
        toast.success('Lesson marked as incomplete');
      } else {
        await api.post(`/lessons/${lessonId}/complete`);
        setCompletedLessons(prev => [...prev, lessonId]);
        toast.success('Lesson marked as completed');
      }
    } catch (error) {
      toast.error('Could not save lesson progress');
    }
  };

  const isLessonEnabled = useCallback((lessonId: string): boolean => {
    const all = studentModules.flatMap(m => m.lessons);
    if (all.length === 0) return false;
    const firstUncompletedIdx = all.findIndex(l => !completedLessons.includes(l.id));
    const lessonIdx = all.findIndex(l => l.id === lessonId);
    if (lessonIdx === -1) return false;
    if (completedLessons.includes(lessonId)) return true;
    if (lessonIdx === firstUncompletedIdx) return true;
    if (firstUncompletedIdx === -1) return true;
    return false;
  }, [studentModules, completedLessons]);

  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    const module = studentModules.find(m => m.id === moduleId);
    if (!module) return false;
    if (module.lessons.length === 0) return true;
    return module.lessons.some(l => isLessonEnabled(l.id));
  }, [studentModules, isLessonEnabled]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNextLesson = () => {
    if (!selectedLesson) return;
    const all = studentModules.flatMap(m => m.lessons);
    const idx = all.findIndex(l => l.id === selectedLesson.id);
    if (idx < all.length - 1) {
      const n = all[idx + 1];
      if (isLessonEnabled(n.id)) {
        setSelectedLesson(n);
        setActiveTab('Attachment');
        setExpandedModules(p => ({ ...p, [n.module_id]: true }));
      } else {
        toast.warning('Please complete the current topic before moving to the next.');
      }
    }
  };

  const handlePreviousLesson = () => {
    if (!selectedLesson) return;
    const all = studentModules.flatMap(m => m.lessons);
    const idx = all.findIndex(l => l.id === selectedLesson.id);
    if (idx > 0) {
      const p = all[idx - 1];
      setSelectedLesson(p);
      setActiveTab('Attachment');
      setExpandedModules(prev => ({ ...prev, [p.module_id]: true }));
    }
  };

  const renderVideoPlayer = (url: string) => {
    if (!url) return <div className="w-full h-full flex items-center justify-center text-white/5"><PlayCircle className="w-24 h-24" /></div>;
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    if (isYoutube) {
      const videoId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      return <iframe className="w-full h-full border-0 animate-in fade-in duration-300" src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`} allowFullScreen title="NubeEra Learning" />;
    }
    const resolvedUrl = resolveMediaUrl(url);
    return <video className="w-full h-full bg-black animate-in fade-in duration-300 object-contain" src={resolvedUrl} controls controlsList="nodownload" />;
  };

  const renderActiveTabContent = (isFullscreen = false) => {
    if (!selectedLesson) return null;

    return (
      <> 
        {activeTab === 'Overview' && (
          <div className="jodit-content text-sm text-slate-600 leading-relaxed max-w-none animate-in fade-in duration-300 smooth-scroll " dangerouslySetInnerHTML={{ __html: selectedLesson.activity || '<p className="italic text-slate-400">No activity text configured for this topic.</p>' }} />
        )}

        {activeTab === 'Code' && selectedLesson.is_activity && (
          <div className="space-y-4 animate-in fade-in duration-300 max-w-full">
            <h4 className="text-sm font-black text-blue-700 tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Required Code
            </h4>
            {selectedLesson.code ? (() => {
              const rawCodeLines = cleanCodeText(selectedLesson.code).split('\n');
              return (
                <div className="bg-[#0d1117] border-[#21262d] rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs text-slate-100 max-w-full">
                  {/* Thonny Style Header */}
                  <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2.5 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                      </div>
                      <span className="text-xs font-bold text-slate-400 pl-2">main.py (MicroPython) — Thonny</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(selectedLesson.code || '')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all duration-200 cursor-pointer ${copiedCode
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                        }`}>
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  {/* Code lines container */}
                  <div className="flex overflow-x-auto max-h-[350px] divide-x divide-[#21262d] custom-scrollbar">
                    {/* Numbers */}
                    <div className="bg-[#0d1117]/90 text-slate-500 text-right pr-3 pl-2 py-4 select-none shrink-0 min-w-[35px]">
                      {rawCodeLines.map((_, i) => (
                        <div key={i} className="leading-6 h-6">{i + 1}</div>
                      ))}
                    </div>
                    {/* Code Text */}
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
              <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 shadow-sm text-sm text-slate-400 italic">
                No code provided for this activity.
              </div>
            )}
          </div>
        )}

        {activeTab === 'Diagram' && selectedLesson.is_activity && (
          <div className="space-y-4 animate-in fade-in duration-300 max-w-full">
            <h4 className="text-sm font-black text-violet-700 tracking-widest flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-violet-500" /> Reference Diagram
            </h4>
            <div className="bg-violet-50/40 border border-violet-100 rounded-xl p-5 shadow-sm min-h-[150px] max-w-full">
              {selectedLesson.diagram_url ? (
                <div className="jodit-content text-sm text-slate-600 leading-relaxed max-w-none" dangerouslySetInnerHTML={{ __html: selectedLesson.diagram_url }} />
              ) : (
                <p className="text-sm text-slate-400 italic">No diagram provided.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Attachment' && (() => {
          const parentModule = studentModules.find(m =>
            m.id?.toLowerCase() === selectedLesson.module_id?.toLowerCase() ||
            m.id?.toLowerCase() === (selectedLesson as any).moduleId?.toLowerCase()
          );

          const pdfUrl = selectedLesson.pdf_file_url ||
            (selectedLesson as any).PdfFileUrl ||
            (selectedLesson as any).pdfFileUrl ||
            parentModule?.pdf_file_url ||
            (parentModule as any)?.PdfFileUrl ||
            (parentModule as any)?.pdfFileUrl;

          return (
            <div className="w-full overflow-x-auto animate-in fade-in duration-300 custom-scrollbar">
              {pdfUrl ? (
                <div className="flex flex-col items-center py-2 min-h-[300px] w-full max-w-full overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
                  <Document
                    key={pdfUrl}
                    file={resolveMediaUrl(pdfUrl)}
                    onLoadSuccess={onDocumentLoadSuccess}
                    options={pdfOptions}
                    loading={
                      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[220px] w-full">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-black text-blue-400 tracking-widest animate-pulse">Loading materials...</p>
                      </div>
                    }
                    onLoadError={(error) => {
                      console.error("PDF Load Error:", error);
                      toast.error("Error loading PDF document.");
                    }}
                    error={
                      <div className="p-12 text-center flex flex-col items-center justify-center bg-rose-50/50 rounded-2xl border-dashed border-rose-100 min-h-[200px] w-full">
                        <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center mb-3">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <p className="text-rose-500 font-black text-xs tracking-widest">Failed to load document</p>
                      </div>
                    }
                  >
                    {(() => {
                      const start = 1;
                      const end = numPages || 1;

                      const pages = [];
                      for (let i = start; i <= end; i++) {
                        if (numPages && i > numPages) break;
                        pages.push(
                          <div key={i} className="mb-6 last:mb-0 select-none pdf-container w-full flex justify-center max-w-full overflow-hidden p-1">
                            <Page
                              pageNumber={i}
                              width={isFullscreen ? Math.min(1000, window.innerWidth - 100) : Math.max(220, dockWidth - 130)}
                              renderAnnotationLayer={false}
                              renderTextLayer={false}
                              className="shadow-md border-slate-100 rounded-lg overflow-hidden bg-white max-w-full"
                            />
                          </div>
                        );
                      }
                      return pages.length > 0 ? pages : (numPages ? <div className="p-12 text-center text-slate-400 italic text-xs tracking-wider w-full">No pages found in this document</div> : null);
                    })()}
                  </Document>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 w-full bg-blue-50/30 rounded-2xl border-dashed border-blue-200">
                  <Paperclip className="w-10 h-10 text-blue-300 mb-4" />
                  <p className="text-xs font-black text-blue-400 tracking-widest text-center px-4">No printable slides/materials for this lesson</p>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'Browser' && selectedLesson.is_ai_tool_activity && (
          <div className="animate-in fade-in duration-300 space-y-3">
            {selectedLesson.browser_url ? (
              isFrameBlocked(selectedLesson.browser_url) ? (
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-teal-50 to-blue-50/30 dark:from-slate-900/50 dark:to-slate-800/20 rounded-2xl border border-teal-100 dark:border-teal-900/30 text-center shadow-sm" style={{ height: isFullscreen ? 'calc(100vh - 250px)' : '420px' }}>
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-5 shadow-md border border-teal-100 dark:border-slate-700 overflow-hidden">
                    <img
                      src={getFaviconUrl(selectedLesson.browser_url)}
                      alt=""
                      className="w-8 h-8"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <Globe className="w-8 h-8 text-teal-500" style={{ display: 'none' }} />
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-200 tracking-tight">External Learning Workspace</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-2 leading-relaxed">
                    <span className="font-bold text-teal-600 dark:text-teal-400">{getDomain(selectedLesson.browser_url)}</span> doesn't allow itself to be embedded inside other sites, so it can't load directly in the portal. Launch it in a new tab to continue — your progress here stays untouched.
                  </p>

                  <div className="mt-5 flex items-center gap-2 w-full max-w-sm bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-1.5 py-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1 text-left" title={selectedLesson.browser_url}>
                      {selectedLesson.browser_url}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedLesson.browser_url || '').then(() => {
                          setCopiedBrowserUrl(true);
                          toast.success('Link copied');
                          setTimeout(() => setCopiedBrowserUrl(false), 2000);
                        }).catch(() => toast.error('Failed to copy link'));
                      }}
                      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                      title="Copy link"
                    >
                      {copiedBrowserUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <a
                    href={selectedLesson.browser_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                  >
                    Launch Workspace <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 pb-3 border-b border-teal-100">
                    <Globe className="w-5 h-5 text-teal-500 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-teal-800 tracking-wider">AI Tool</h4>
                      <a
                        href={selectedLesson.browser_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-500 font-semibold hover:underline truncate block max-w-xs"
                      >
                        {selectedLesson.browser_url}
                      </a>
                    </div>
                  </div>
                  <iframe
                    src={selectedLesson.browser_url}
                    title="AI Tool Browser"
                    className="w-full rounded-2xl border border-slate-200 shadow-sm"
                    style={{ height: isFullscreen ? 'calc(100vh - 250px)' : '420px' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  />
                </>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-teal-50/40 rounded-2xl border border-dashed border-teal-200">
                <Globe className="w-10 h-10 text-teal-300 mb-4" />
                <p className="text-sm font-black text-teal-600 tracking-wider text-center px-4">No Browser URL configured.</p>
                <p className="text-xs text-teal-400 mt-1 text-center px-4">Ask your teacher to add a Browser URL in the topic settings.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'PythonEditor' && selectedLesson.is_python_activity && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-violet-600" />
                  <h4 className="text-sm font-black text-violet-900 tracking-wider">Python Workspace</h4>
                </div>
                <span className="text-xs font-bold text-slate-300 tracking-wider">Pyodide stays warm across tab switches</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={runPythonCode}
                  disabled={running || pyodideLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-xs tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {running ? 'Running...' : '▶ Run Code'}
                </button>
                <button
                  onClick={() => handleSaveCode(true)}
                  disabled={isSavingCode}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-400 to-fuchsia-400 hover:brightness-105 disabled:bg-slate-300 text-white font-bold text-xs tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {isSavingCode ? 'Saving...' : '💾 Save Code'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Reset editor to default starter code?')) {
                      setEditorCode('print("Welcome to NubeEra Python Lab")');
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  🔄 Reset
                </button>
              </div>

              <div className={`border border-slate-200 rounded-2xl overflow-hidden shadow-sm ${isFullscreen ? 'h-[450px]' : 'h-[300px]'}`}>
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={editorCode}
                  onChange={(val) => setEditorCode(val || '')}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-violet-900 tracking-wider">Console Output</h4>
                  <button
                    onClick={() => setOutput('')}
                    className="px-3 py-1 bg-violet-100 hover:bg-violet-200 text-violet-600 hover:text-violet-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear Console
                  </button>
                </div>
                <div className={`bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl p-4 font-mono text-xs text-slate-200 overflow-y-auto shadow-inner flex flex-col justify-between ${isFullscreen ? 'h-[240px]' : 'h-[160px]'}`}>
                  <div className="whitespace-pre-wrap select-text text-slate-200">
                    {pyodideLoading ? (
                      <div className="text-slate-400 animate-pulse">Loading Pyodide WASM Runtime...</div>
                    ) : (
                      output || 'Console is empty. Click "Run Code" to execute Python program.'
                    )}
                  </div>
                  {isAutosaving && (
                    <div className="text-xs text-emerald-400 self-end mt-2 select-none animate-pulse">
                      Auto-saving...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // ---- Tools Dock: registry-style tab list (adding a future tool = adding an entry here) ----
  const dockTabs = useMemo(() => {
    if (!selectedLesson) return [] as { id: DockTabId; label: string; icon: any }[];
    const tabs: { id: DockTabId; label: string; icon: any }[] = [
      { id: 'Attachment', label: 'Lesson materials', icon: Paperclip },
    ];
    if (selectedLesson.is_python_activity) {
      tabs.push({ id: 'PythonEditor', label: 'Python editor', icon: Code2 });
      tabs.push({ id: 'Code', label: 'Python code', icon: Code2 });
    }
    if (selectedLesson.is_ai_tool_activity) {
      tabs.push({ id: 'Browser', label: 'Browser', icon: Globe });
    }
    if (selectedLesson.is_robotics_activity || (selectedLesson.is_activity && !selectedLesson.is_python_activity && !selectedLesson.is_ai_tool_activity)) {
      tabs.push({ id: 'Code', label: 'Robotics code', icon: Bot });
      tabs.push({ id: 'Diagram', label: 'Reference diagram', icon: ImageIcon });
    }
    tabs.push({ id: 'Overview', label: 'Read content', icon: FileText });

    // De-duplicate by id (a lesson could theoretically be flagged for more than one activity type)
    const seen = new Set<string>();
    return tabs.filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  }, [selectedLesson]);

  // Keep the active dock tab valid whenever the lesson (and therefore the available tools) changes
  useEffect(() => {
    if (dockTabs.length > 0 && !dockTabs.find(t => t.id === activeTab)) {
      setActiveTab(dockTabs[0].id);
    }
  }, [dockTabs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Resizable Tools Dock — drag the left edge to reclaim width for the editor / diagram / browser ----
  const handleDockResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dockResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dockResizing.current) return;
      const fromRight = window.innerWidth - e.clientX;
      setDockWidth(Math.min(680, Math.max(300, fromRight - 24)));
    };
    const onUp = () => {
      if (!dockResizing.current) return;
      dockResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const activeDockTab = dockTabs.find(t => t.id === activeTab);
  const progressPct = useMemo(() => {
    const all = studentModules.flatMap(m => m.lessons);
    if (all.length === 0) return 0;
    return Math.round((all.filter(l => completedLessons.includes(l.id)).length / all.length) * 100);
  }, [studentModules, completedLessons]);

  const nextLessonInfo = useMemo(() => {
    const all = studentModules.flatMap(m => m.lessons);
    if (!selectedLesson || all.length === 0) return { hasNext: false, nextEnabled: false };
    const currentIdx = all.findIndex(l => l.id === selectedLesson.id);
    const hasNext = currentIdx < all.length - 1;
    const nextLesson = hasNext ? all[currentIdx + 1] : null;
    const nextEnabled = hasNext && nextLesson ? isLessonEnabled(nextLesson.id) : false;
    return { hasNext, nextEnabled };
  }, [studentModules, selectedLesson, isLessonEnabled]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-400 rounded-full animate-spin"></div>
        <span className="text-base font-bold text-blue-400 tracking-widest animate-pulse">Initializing Learning Paths...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 mx-auto px-1 py-2 animate-in fade-in duration-300">
        {/* Compact Top Bar — replaces the old large banner; everything important now lives in the workbench below */}
        <div className="bg-gradient-to-r from-blue-50 via-white to-teal-50 p-3 sm:p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center shrink-0 shadow-md shadow-blue-100">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-black text-blue-950 tracking-tight truncate">Study Materials</h3>
              {selectedLesson ? (
                <p className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wide pt-0.5 truncate">
                  {selectedLesson.module_name} <ChevronRight className="w-3 h-3 inline-block mx-0.5 -mt-0.5" /> {selectedLesson.sub_topic}
                </p>
              ) : (
                <p className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wide pt-0.5">Pick a topic from the lessons list to begin.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="h-1.5 w-20 sm:w-24 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[10px] sm:text-xs font-black text-blue-500 tracking-wider whitespace-nowrap">{progressPct}%</span>
            </div>
            {/* On small screens, show a sidebar toggle + focus button side by side */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer bg-white border border-blue-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
              >
                {sidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Lessons</span>
              </button>
            </div>
            <button
              onClick={() => setFocusMode(f => !f)}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-black tracking-wider transition-all cursor-pointer shrink-0 ${focusMode ? 'bg-gradient-to-r from-blue-400 to-teal-400 text-white shadow-md' : 'bg-white border border-blue-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
              title="Hide the curriculum rail for distraction-free practice"
            >
              <Focus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{focusMode ? 'Exit Focus' : 'Focus Mode'}</span>
            </button>
          </div>
        </div>

        {/* ===== The Workbench: curriculum rail | video + persistent notes | tools dock — all visible together ===== */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch min-w-0" style={{ minHeight: '500px' }}>

          {/* ---- Left: Curriculum Rail (collapsible to an icon-only spine; hidden entirely in Focus Mode) ---- */}
          {!focusMode && (
            <div className={`shrink-0 transition-all duration-300 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden flex flex-col ${sidebarOpen ? 'w-full lg:w-[290px]' : 'w-full lg:w-[60px]'} ${sidebarOpen ? 'max-h-[50vh] lg:max-h-[calc(100vh-170px)]' : 'max-h-[48px] lg:max-h-[calc(100vh-170px)]'}`}>
              <div className="p-3.5 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-teal-50/40 flex items-center justify-between shrink-0">
                {sidebarOpen && (
                  <h3 className="font-black text-blue-900 tracking-tight text-xs tracking-wider truncate pl-1">
                    Lessons
                  </h3>
                )}
                <button
                  onClick={() => setSidebarOpen(o => !o)}
                  className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white transition-all cursor-pointer shrink-0"
                  title={sidebarOpen ? 'Collapse curriculum rail' : 'Expand curriculum rail'}
                >
                  {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto smooth-scroll divide-y divide-slate-100">
                {studentModules.length === 0 ? (
                  sidebarOpen && (
                    <div className="p-8 text-center text-slate-400 text-sm font-bold tracking-wider space-y-1">
                      <p>No study materials found.</p>
                      <p className="font-normal opacity-70 text-xs">Ask your teacher to check that your account is assigned to a grade and that modules exist for it.</p>
                    </div>
                  )
                ) : (
                  studentModules.map((module, idx) => {
                    const isExpanded = expandedModules[module.id];
                    const moduleNum = String(idx + 1).padStart(2, '0');
                    const moduleHasActive = module.lessons.some(l => l.id === selectedLesson?.id);
                    const enabled = isModuleEnabled(module.id);

                    return (
                      <div key={module.id} className="group/mod">
                        <div
                          onClick={() => {
                            if (!enabled) {
                              toast.warning('This unit is locked. Please complete the previous topics first.');
                              return;
                            }
                            if (!sidebarOpen) setSidebarOpen(true);
                            toggleModule(module.id);
                          }}
                          className={`p-3 flex items-center gap-3 transition-all ${
                            enabled 
                              ? 'cursor-pointer hover:bg-blue-50/60' 
                              : 'cursor-not-allowed opacity-50 bg-slate-50/30'
                          } ${isExpanded ? 'bg-blue-50/50' : ''} ${sidebarOpen ? 'justify-between' : 'justify-center'}`}
                          title={enabled ? module.name : `${module.name} (Locked)`}
                        >
                          <div className={`flex items-center gap-3 truncate ${sidebarOpen ? '' : 'justify-center'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm shrink-0 transition-all duration-300 ${
                              !enabled
                                ? 'bg-slate-100 text-slate-400'
                                : isExpanded || moduleHasActive 
                                  ? 'bg-gradient-to-br from-blue-400 to-teal-400 text-white scale-105 shadow-blue-100' 
                                  : 'bg-slate-100 text-slate-500 group-hover/mod:bg-blue-100 group-hover/mod:text-blue-600 group-hover/mod:scale-105'
                            }`}>
                              {!enabled ? <Lock className="w-3.5 h-3.5" /> : moduleNum}
                            </div>
                            {sidebarOpen && (
                              <span className={`text-sm font-extrabold tracking-tight truncate transition-colors duration-300 ${isExpanded ? 'text-blue-700' : 'text-slate-700 group-hover/mod:text-blue-600'}`}>{module.name}</span>
                            )}
                          </div>
                          {sidebarOpen && <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-600' : 'group-hover/mod:text-blue-400'}`} />}
                        </div>

                        {sidebarOpen && isExpanded && (
                          <div className="bg-white border-t border-slate-100 py-1.5 animate-in slide-in-from-top-2 duration-200">
                            {module.lessons.length === 0 ? (
                              <div className="px-10 py-3 text-xs text-slate-400 italic font-semibold uppercase">No topics in this unit</div>
                            ) : (
                              module.lessons.map((lesson) => {
                                const isActive = selectedLesson?.id === lesson.id;
                                const lessonEnabled = isLessonEnabled(lesson.id);
                                return (
                                  <div
                                    key={lesson.id}
                                    onClick={() => {
                                      if (!lessonEnabled) {
                                        toast.warning('Please complete the previous topics first.');
                                        return;
                                      }
                                      setSelectedLesson(lesson);
                                      setActiveTab('Attachment');
                                    }}
                                    className={`relative px-10 py-3 text-xs font-bold transition-all flex items-center gap-3 ${
                                      !lessonEnabled
                                        ? 'text-slate-350 cursor-not-allowed opacity-50 bg-slate-50/10'
                                        : isActive
                                          ? 'text-blue-700 bg-blue-50 translate-x-1 cursor-pointer'
                                          : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50 hover:translate-x-1 cursor-pointer'
                                    }`}
                                    title={lessonEnabled ? lesson.sub_topic : `${lesson.sub_topic} (Locked)`}
                                  >
                                    {isActive && (
                                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-400 to-teal-400 rounded-r-full" />
                                    )}
                                    {!lessonEnabled ? (
                                      <Lock className="w-3.5 h-3.5 text-slate-300" />
                                    ) : lesson.procedure === 'Activity' ? (
                                      <Zap className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                                    ) : (
                                      <BookOpen className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                                    )}
                                    <span className="truncate">{lesson.sub_topic}</span>
                                    {completedLessons.includes(lesson.id) && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-500 shrink-0" />}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ---- Center: Primary Stage — height-capped video + ALWAYS-VISIBLE personal notes strip ---- */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">
            {selectedLesson ? (
              <>
                {/* Lesson header */}
                <div className="bg-white rounded-2xl border border-blue-100 shadow-sm px-5 py-4 flex flex-col gap-3 shrink-0">
                  {/* Row 1: Module Name & Lesson Topic */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-black text-blue-600 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-100 px-2.5 py-0.5 rounded-full tracking-wider">
                        {selectedLesson.module_name}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight break-words">
                      {selectedLesson.sub_topic}
                    </h2>
                  </div>

                  {/* Row 2: Navigation & Status Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    {/* Left: Navigation buttons */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={handlePreviousLesson} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer" title="Previous lesson">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleNextLesson} 
                        disabled={nextLessonInfo.hasNext && !nextLessonInfo.nextEnabled}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                          !nextLessonInfo.hasNext 
                            ? 'border-slate-100 text-slate-200 cursor-not-allowed opacity-50'
                            : nextLessonInfo.nextEnabled
                              ? 'border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 cursor-pointer'
                              : 'border-slate-100 text-slate-200 cursor-not-allowed opacity-50'
                        }`} 
                        title={nextLessonInfo.hasNext ? (nextLessonInfo.nextEnabled ? "Next lesson" : "Next lesson (Locked - complete current first)") : "End of curriculum"}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Right: Status badge & Complete button */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status indicator badge */}
                      <span className={`inline-flex items-center gap-1 rounded-full font-bold px-2.5 py-1 text-xs border ${
                        completedLessons.includes(selectedLesson.id)
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-sky-50 text-sky-600 border-sky-200'
                      }`}>
                        {completedLessons.includes(selectedLesson.id) ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5 text-sky-400" />
                            Not Completed
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => handleMarkAsCompleted(selectedLesson.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer ${
                          completedLessons.includes(selectedLesson.id)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:brightness-105 shadow-sm shadow-blue-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {completedLessons.includes(selectedLesson.id) ? 'Mark Incomplete' : 'Mark Complete'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video — capped height so it can never push the rest of the workspace out of view */}
                {!notesExpanded && (
                  <div className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden shrink-0 flex flex-col" style={{ height: videoCollapsed ? 'auto' : '40%', minHeight: videoCollapsed ? 'auto' : '200px' }}>
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-teal-100 bg-teal-50/40 shrink-0">
                      <span className="text-[10px] sm:text-xs font-bold text-teal-600 tracking-widest">VIDEO</span>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {!videoCollapsed && (
                          <button
                            onClick={() => setIsFullscreenVideo(true)}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-600 hover:text-teal-800 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                            title="View Video Fullscreen"
                          >
                            <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setVideoCollapsed(v => !v)}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-600 hover:text-teal-800 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                        >
                          {videoCollapsed
                            ? <><ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Show</span> Video</>
                            : <><ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Hide</span> Video</>
                          }
                        </button>
                      </div>
                    </div>
                    {!videoCollapsed && (
                      <div className="flex-1 min-h-0 bg-slate-900 animate-in fade-in duration-300" style={{ minHeight: '180px' }}>
                        <VideoCarousel urls={selectedLesson.video_urls ?? (selectedLesson.video_url ? [selectedLesson.video_url] : [])} />
                      </div>
                    )}
                  </div>
                )}

                {/* Persistent Notes Strip — My Notes live next to the video at all times */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-indigo-100/80 dark:border-[#334155] shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden transition-all duration-300">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-50/50 dark:border-[#283548] bg-indigo-50/10 dark:bg-[#283548]/20 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <NotebookPen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-tight truncate">My Notes — always here while you watch</h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleSaveNote}
                        disabled={isSaving}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95 ${
                          isSaving
                            ? 'bg-slate-105 text-slate-400 dark:bg-slate-800 dark:text-slate-500 shadow-none'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500/20 dark:hover:bg-indigo-500/35 dark:text-indigo-300 border border-transparent dark:border-indigo-500/30'
                        }`}
                      >
                        {isSaving ? 'Saving...' : 'Save Note'}
                      </button>
                      <button
                        onClick={() => setNotesExpanded(v => !v)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-805 dark:hover:bg-slate-700 text-slate-600 dark:text-[#cbd5e1] transition-all cursor-pointer"
                        title={notesExpanded ? 'Collapse notes back to strip view' : 'Expand notes to full height'}
                      >
                        {notesExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto smooth-scroll px-1 pt-1 pb-1">
                    <PremiumRichTextEditor
                      value={selfNote}
                      onChange={setSelfNote}
                      placeholder="Jot down what you're learning as you watch — your notes stay right here, beside the video, so you never have to go hunting for them again..."
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-blue-100 p-20 text-center text-slate-300 shadow-sm flex flex-col items-center justify-center flex-1">
                <MonitorPlay className="w-16 h-16 opacity-30 mb-4 text-blue-200" />
                <p className="text-sm font-bold tracking-wider">No Active Topic Selected</p>
              </div>
            )}
          </div>

          {/* ---- Right: Tools Dock — icon tab rail + resizable panel; every tool one click away, never a scroll away ---- */}
          {selectedLesson && dockTabs.length > 0 && !notesExpanded && (
            <div
              className="shrink-0 bg-white rounded-2xl border border-violet-100 shadow-sm flex overflow-hidden relative min-h-0 w-full lg:w-[var(--dock-width)] min-h-[350px] lg:min-h-0"
              style={{ '--dock-width': `${dockWidth}px` } as React.CSSProperties}
            >
              {/* Drag handle */}
              <div
                onMouseDown={handleDockResizeStart}
                className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 flex items-center justify-center group/handle hover:bg-violet-100 transition-colors"
                title="Drag to resize the Tools Dock"
              >
                <GripVertical className="w-3 h-3 text-slate-300 group-hover/handle:text-violet-500 transition-colors" />
              </div>

              {/* Icon tab rail — always visible, so students can SEE every tool exists at a glance */}
              <div className="w-[58px] shrink-0 border-r border-violet-100 bg-gradient-to-b from-violet-50/60 to-pink-50/30 flex flex-col items-center pt-4 gap-1.5 pl-2">
                {dockTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.label}
                      aria-label={tab.label}
                      aria-selected={isActive}
                      role="tab"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${isActive ? 'bg-gradient-to-br from-violet-400 to-pink-400 text-white shadow-md scale-105' : 'text-slate-400 hover:bg-white hover:text-violet-500 hover:shadow-xs'}`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </button>
                  );
                })}
              </div>

              {/* Active tool panel */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b border-violet-100 bg-violet-50/20 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeDockTab && <activeDockTab.icon className="w-4 h-4 text-violet-600" />}
                    <h4 className="text-sm font-black text-violet-900 tracking-wider truncate">{activeDockTab?.label}</h4>
                  </div>
                  <button
                    onClick={() => setIsFullscreenMaterials(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 hover:bg-violet-200 text-violet-600 hover:text-violet-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="View Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                  </button>
                </div>

                <div className={`flex-1 min-h-0 overflow-y-auto smooth-scroll p-5 ${activeTab === 'Attachment' ? 'pdf-smooth-scroll' : ''}`}>
                  {renderActiveTabContent(false)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Video Overlay */}
        {isFullscreenVideo && selectedLesson && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md p-4 sm:p-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="max-w-5xl w-full aspect-video bg-black rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative flex flex-col">
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={() => setIsFullscreenVideo(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-rose-600 hover:text-white text-slate-300 transition-all cursor-pointer backdrop-blur-md border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 w-full h-full bg-black">
                <VideoCarousel urls={selectedLesson.video_urls ?? (selectedLesson.video_url ? [selectedLesson.video_url] : [])} />
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Materials/Tools Dock Overlay */}
        {isFullscreenMaterials && selectedLesson && activeDockTab && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md p-4 sm:p-6 flex flex-col animate-in fade-in duration-300">
            <div className="max-w-6xl w-full mx-auto flex-1 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-violet-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-violet-50 to-pink-50/40">
                <div className="flex items-center gap-2.5">
                  {activeDockTab && <activeDockTab.icon className="w-5 h-5 text-violet-600" />}
                  <h4 className="text-base font-black text-violet-900 tracking-wider uppercase">{activeDockTab?.label}</h4>
                </div>
                <button
                  onClick={() => setIsFullscreenMaterials(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 hover:bg-rose-50 hover:text-rose-500 text-violet-600 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className={`flex-1 min-h-0 overflow-y-auto p-6 bg-white custom-scrollbar ${activeTab === 'Attachment' ? 'pdf-smooth-scroll' : ''}`}>
                {renderActiveTabContent(true)}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .jodit-content p { margin-bottom: 1.5rem; }
        .jodit-content ul { padding-left: 2rem; list-style-type: disc; margin-bottom: 1.5rem; }
        .jodit-content b { font-weight: 800; color: #111; display: inline-block; margin-top: 0.5rem; }
        .pdf-container { user-select: none !important; -webkit-user-select: none !important; }

        /* ── Smooth vertical scroll for lesson materials ────────────────────── */
        .smooth-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
        }
        .smooth-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .smooth-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        .smooth-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 10px;
          transition: background 0.2s;
        }
        .smooth-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        .smooth-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
        }

        .pdf-smooth-scroll { scroll-behavior: smooth; -webkit-overflow-scrolling: touch;   max-height: 100vh; }

        @media print {
            body { display: none !important; }
        }
        @media (max-width: 1280px) {
          .jodit-content { font-size: 0.8rem; }
        }
        @media (max-width: 640px) {
          .jodit-content { font-size: 0.75rem; }
        }
      `}</style>
    </>
  );
};

export default StudentLearning;
