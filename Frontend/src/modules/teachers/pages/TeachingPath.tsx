/**
 * TeachingPath.tsx
 *
 * Teacher's grade-wise teaching portal — mirrors the StudentLearning workbench layout
 * (3-column: curriculum rail | video + notes | tools dock) but adapted for teachers:
 *  • Grade tabs let the teacher switch between their assigned grades
 *  • Topic status cycling: NotStarted → InProgress → Completed (calls TeacherLessonProgress API)
 *  • Remarks saved alongside status updates
 *  • Full lesson content (PDF, video, diagrams, code, AI browser) visible in the tools dock
 *  • Overall grade completion progress bar
 */

import {
  BookOpen, Bot, Check, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, ChevronUp, Circle, Clock, Code2, Copy, ExternalLink, FileText,
  Focus, Globe, GraduationCap, GripVertical, Image as ImageIcon,
  Loader2, Maximize2, Minimize2, MonitorPlay, NotebookPen,
  PanelLeftClose, PanelLeftOpen, Paperclip, PlayCircle, X, Zap,
} from 'lucide-react';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { toast } from 'sonner';
import api from '@/services/api';
import VideoCarousel from '@/components/VideoCarousel';
import { resolveMediaUrl } from '@/utils/urlHelper';
import PremiumRichTextEditor from '@/components/PremiumRichTextEditor';
import {
  teacherEnhancedService,
  type TeacherLearningPath,
} from '../../../services/teacherEnhancedService';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// ── Types ─────────────────────────────────────────────────────────────────────

type TopicStatus  = 'NotStarted' | 'InProgress' | 'Completed';
type DockTabId    = 'Attachment' | 'Code' | 'Diagram' | 'Overview' | 'Browser';

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

interface RawLesson {
  id: string;
  module_id: string;
  sub_topic: string;
  video_url?: string;
  video_urls?: string[];
  diagram_url?: string;
  procedure?: string;
  code?: string;
  activity?: string;
  serial_number?: number;
  pdf_file_url?: string;
  is_activity?: boolean;
  is_robotics_activity?: boolean;
  is_python_activity?: boolean;
  is_ai_tool_activity?: boolean;
  browser_url?: string;
}

interface RawModule {
  id: string;
  name: string;
  grade_level_id?: string;
  pdf_file_url?: string;
}

/** Lesson enriched with path status + raw content from /lessons */
interface EnrichedLesson {
  lesson_id:    string;
  sub_topic:    string;
  serial_number:number;
  status:       TopicStatus;
  started_at?:  string;
  completed_at?:string;
  remarks?:     string;
  is_activity:  boolean;
  expected_periods: number;
  executed_periods: number;
  executed_hours:   number;
  // raw content
  module_id:    string;
  module_name:  string;
  video_url?:   string;
  video_urls?:  string[];
  diagram_url?: string;
  code?:        string;
  activity?:    string;
  pdf_file_url?:string;
  is_robotics_activity?: boolean;
  is_python_activity?:   boolean;
  is_ai_tool_activity?:  boolean;
  browser_url?: string;
}

interface EnrichedModule {
  module_id:           string;
  module_name:         string;
  total_lessons:       number;
  completed_lessons:   number;
  completion_percentage: number;
  expected_periods:     number;
  executed_periods:     number;
  executed_hours:       number;
  lessons:             EnrichedLesson[];
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TopicStatus, { label: string; icon: React.ElementType; bg: string; text: string; dot: string; border: string }> = {
  NotStarted: { label: 'Not Started', icon: Circle,       bg: 'bg-sky-50',     text: 'text-sky-600',     dot: 'bg-sky-400',     border: 'border-sky-200'     },
  InProgress:  { label: 'In Progress',  icon: Clock,        bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-400',   border: 'border-amber-200'   },
  Completed:   { label: 'Completed',    icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', border: 'border-emerald-200' },
};

const cycleStatus = (s: TopicStatus): TopicStatus =>
  s === 'NotStarted' ? 'InProgress' : s === 'InProgress' ? 'Completed' : 'NotStarted';

const StatusBadge: React.FC<{ status: TopicStatus; size?: 'sm' | 'xs' }> = ({ status, size = 'sm' }) => {
  const cfg  = STATUS_CFG[status];
  const Icon = cfg.icon;
  const px   = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold border ${px} ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={size === 'xs' ? 11 : 13} />
      {cfg.label}
    </span>
  );
};

// ── PDF options (memoised once) ───────────────────────────────────────────────

const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

// ── Main component ────────────────────────────────────────────────────────────

const TeachingPath: React.FC = () => {

  // ── Grade & path data ───────────────────────────────────────────────────────
  const [grades, setGrades]             = useState<{ grade_id: string; section_id?: string; grade_name: string; section_name?: string; completion_percentage: number }[]>([]);
  const [selectedGradeId, setGradeId]  = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(undefined);
  const [gradePath, setGradePath]       = useState<TeacherLearningPath | null>(null);
  const [rawLessons, setRawLessons]     = useState<RawLesson[]>([]);
  const [rawModules, setRawModules]     = useState<RawModule[]>([]);
  const [loading, setLoading]           = useState(true);
  const [gradeLoading, setGradeLoading] = useState(false);

  // ── Workbench UI ─────────────────────────────────────────────────────────────
  const [selectedLesson, setSelectedLesson]     = useState<EnrichedLesson | null>(null);
  const [expandedModules, setExpandedModules]   = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab]               = useState<DockTabId>('Attachment');
  const [sidebarOpen, setSidebarOpen]           = useState(true);
  const [focusMode, setFocusMode]               = useState(false);
  const [videoCollapsed, setVideoCollapsed]     = useState(true);
  const [notesExpanded, setNotesExpanded]       = useState(false);
  const [dockWidth, setDockWidth]               = useState(400);
  const [isFullscreenVideo, setFSVideo]         = useState(false);
  const [isFullscreenMaterials, setFSMats]      = useState(false);
  const dockResizing = useRef(false);

  // ── Notes & status ───────────────────────────────────────────────────────────
  /** Per-lesson remarks stored locally until saved with status */
  const [remarksMap, setRemarksMap]   = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId]   = useState<string | null>(null);
  const [copiedCode, setCopiedCode]   = useState(false);
  const [numPages, setNumPages]       = useState<number | null>(null);
  const [teacherNote, setTeacherNote] = useState('');
  const [savingNote, setSavingNote]   = useState(false);

  // ── Initial load — raw lessons + modules once ─────────────────────────────
  const loadRaw = useCallback(async () => {
    try {
      const [modRes, lesRes] = await Promise.all([
        api.get('/modules'),
        api.get('/lessons'),
      ]);
      const normMod = (m: any): RawModule => ({
        id:             m.id   || m.Id   || '',
        name:           m.name || m.Name || '',
        grade_level_id: m.grade_level_id ?? m.gradeLevelId ?? '',
        pdf_file_url:   m.pdf_file_url ?? m.pdfFileUrl ?? '',
      });
      const normLes = (l: any): RawLesson => ({
        id:                  l.id   || l.Id   || '',
        module_id:           l.module_id   ?? l.moduleId   ?? '',
        sub_topic:           l.sub_topic   ?? l.subTopic   ?? '',
        video_url:           l.video_url   ?? l.videoUrl   ?? '',
        video_urls:          Array.isArray(l.video_urls) ? l.video_urls
                               : Array.isArray(l.videoUrls) ? l.videoUrls
                               : undefined,
        diagram_url:         l.diagram_url ?? l.diagramUrl ?? '',
        procedure:           l.procedure   ?? l.Procedure  ?? '',
        code:                l.code        ?? l.Code       ?? '',
        activity:            l.activity    ?? l.Activity   ?? '',
        serial_number:       l.serial_number ?? l.serialNumber ?? 0,
        pdf_file_url:        l.pdf_file_url ?? l.pdfFileUrl ?? '',
        is_activity:         l.is_activity   ?? l.isActivity   ?? false,
        is_robotics_activity:l.is_robotics_activity ?? l.isRoboticsActivity ?? false,
        is_python_activity:  l.is_python_activity   ?? l.isPythonActivity   ?? false,
        is_ai_tool_activity: l.is_ai_tool_activity  ?? l.isAiToolActivity   ?? false,
        browser_url:         l.browser_url  ?? l.browserUrl  ?? '',
      });
      setRawModules((modRes.data || []).map(normMod));
      setRawLessons((lesRes.data || []).map(normLes));
    } catch {
      toast.error('Failed to load lesson content.');
    }
  }, []);

  // Load teacher grade list
  const loadGrades = useCallback(async () => {
    try {
      const paths = await teacherEnhancedService.getLearningPaths();
      const gs = paths.map(p => ({
        grade_id: p.grade_id,
        section_id: p.section_id,
        grade_name: p.grade_name,
        section_name: p.section_name,
        completion_percentage: p.completion_percentage,
      }));
      setGrades(gs);
      
      const params = new URLSearchParams(window.location.search);
      const queryGradeId = params.get('gradeId');
      const querySectionId = params.get('sectionId');
      if (queryGradeId) {
        setGradeId(queryGradeId);
        setSelectedSectionId(querySectionId || undefined);
      } else if (gs.length > 0) {
        setGradeId(gs[0].grade_id);
        setSelectedSectionId(gs[0].section_id);
      }
    } catch {
      toast.error('Failed to load teaching grades.');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadRaw(), loadGrades()]);
      setLoading(false);
    };
    init();
  }, [loadRaw, loadGrades]);

  // Load grade path whenever selectedGradeId or selectedSectionId changes
  useEffect(() => {
    if (!selectedGradeId) return;
    const load = async () => {
      setGradeLoading(true);
      try {
        const path = await teacherEnhancedService.getLearningPathByGrade(selectedGradeId, selectedSectionId);
        setGradePath(path);
        
        // Auto-expand module if query parameter is present, otherwise first module
        const params = new URLSearchParams(window.location.search);
        const queryModuleId = params.get('moduleId');
        if (queryModuleId) {
          setExpandedModules(prev => ({ ...prev, [queryModuleId]: true }));
        } else if (path.modules.length > 0) {
          setExpandedModules({ [path.modules[0].module_id]: true });
        }
        
        setSelectedLesson(null);
      } catch {
        toast.error('Failed to load grade teaching path.');
      } finally {
        setGradeLoading(false);
      }
    };
    load();
  }, [selectedGradeId, selectedSectionId]);

  // ── Merge path + raw content ──────────────────────────────────────────────
  const enrichedModules = useMemo((): EnrichedModule[] => {
    if (!gradePath) return [];
    return gradePath.modules.map(mod => {
      const rawMod = rawModules.find(m => m.id?.toLowerCase() === mod.module_id?.toLowerCase());
      const lessons: EnrichedLesson[] = mod.topics.map(topic => {
        const raw = rawLessons.find(l => l.id?.toLowerCase() === topic.lesson_id?.toLowerCase());
        const pdfUrl = raw?.pdf_file_url || rawMod?.pdf_file_url || '';
        return {
          lesson_id:    topic.lesson_id,
          sub_topic:    topic.sub_topic,
          serial_number:topic.serial_number,
          status:       topic.status as TopicStatus,
          started_at:   topic.started_at,
          completed_at: topic.completed_at,
          remarks:      topic.remarks,
          is_activity:  topic.is_activity,
          expected_periods: topic.expected_periods || 0,
          executed_periods: topic.executed_periods || 0,
          executed_hours:   topic.executed_hours || 0,
          module_id:    mod.module_id,
          module_name:  mod.module_name,
          video_url:    raw?.video_url || '',
          video_urls:   raw?.video_urls,
          diagram_url:  raw?.diagram_url || '',
          code:         raw?.code || '',
          activity:     raw?.activity || '',
          pdf_file_url: pdfUrl,
          is_robotics_activity: raw?.is_robotics_activity,
          is_python_activity:   raw?.is_python_activity,
          is_ai_tool_activity:  raw?.is_ai_tool_activity,
          browser_url:  raw?.browser_url || '',
        };
      });
      return {
        module_id:           mod.module_id,
        module_name:         mod.module_name,
        total_lessons:       mod.total_lessons,
        completed_lessons:   mod.completed_lessons,
        completion_percentage: mod.completion_percentage,
        expected_periods:     mod.expected_periods || 0,
        executed_periods:     mod.executed_periods || 0,
        executed_hours:       mod.executed_hours || 0,
        lessons,
      };
    });
  }, [gradePath, rawLessons, rawModules]);

  // Auto-select lesson on grade change or query parameter match
  useEffect(() => {
    if (enrichedModules.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const queryLessonId = params.get('lessonId');

      if (queryLessonId) {
        for (const mod of enrichedModules) {
          const matched = mod.lessons.find(l => l.lesson_id.toLowerCase() === queryLessonId.toLowerCase());
          if (matched) {
            setSelectedLesson(matched);
            if (mod.module_id) {
              setExpandedModules(prev => ({ ...prev, [mod.module_id]: true }));
            }
            return;
          }
        }
      }

      if (!selectedLesson && enrichedModules[0].lessons.length > 0) {
        setSelectedLesson(enrichedModules[0].lessons[0]);
      }
    }
  }, [enrichedModules, selectedLesson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise remarks map from loaded lesson data
  useEffect(() => {
    const map: Record<string, string> = {};
    enrichedModules.forEach(m => m.lessons.forEach(l => {
      if (l.remarks) map[l.lesson_id] = l.remarks;
    }));
    setRemarksMap(prev => ({ ...map, ...prev }));
  }, [enrichedModules]);

  // Reset note when lesson changes
  useEffect(() => {
    setTeacherNote(remarksMap[selectedLesson?.lesson_id ?? ''] ?? '');
    setNumPages(null);
  }, [selectedLesson?.lesson_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Grade progress ────────────────────────────────────────────────────────
  const progressPct = useMemo(() => {
    if (!gradePath) return 0;
    const total = gradePath.total_topics;
    if (total === 0) return 0;
    return Math.round((gradePath.completed_topics / total) * 100);
  }, [gradePath]);

  // ── Status update ─────────────────────────────────────────────────────────
  const handleCycleStatus = useCallback(async (lesson: EnrichedLesson) => {
    const next = cycleStatus(lesson.status);
    setUpdatingId(lesson.lesson_id);
    try {
      await teacherEnhancedService.updateTopicStatus({
        lesson_id: lesson.lesson_id,
        grade_id:  selectedGradeId,
        module_id: lesson.module_id,
        section_id: selectedSectionId,
        status:    next,
        remarks:   remarksMap[lesson.lesson_id],
      });
      // Refresh grade path
      const fresh = await teacherEnhancedService.getLearningPathByGrade(selectedGradeId, selectedSectionId);
      setGradePath(fresh);
      // Update selected lesson status locally for instant feedback
      setSelectedLesson(prev => prev?.lesson_id === lesson.lesson_id ? { ...prev, status: next } : prev);
      toast.success(`Marked as ${STATUS_CFG[next].label}`);
    } catch {
      toast.error('Failed to update topic status.');
    } finally {
      setUpdatingId(null);
    }
  }, [selectedGradeId, selectedSectionId, remarksMap]);

  const handleSaveNote = useCallback(async () => {
    if (!selectedLesson) return;
    setSavingNote(true);
    try {
      const note = teacherNote;
      setRemarksMap(prev => ({ ...prev, [selectedLesson.lesson_id]: note }));
      await teacherEnhancedService.updateTopicStatus({
        lesson_id: selectedLesson.lesson_id,
        grade_id:  selectedGradeId,
        module_id: selectedLesson.module_id,
        section_id: selectedSectionId,
        status:    selectedLesson.status,
        remarks:   note,
      });
      toast.success('Notes saved.');
    } catch {
      toast.error('Failed to save notes.');
    } finally {
      setSavingNote(false);
    }
  }, [selectedLesson, selectedGradeId, selectedSectionId, teacherNote]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const allLessons = useMemo(() => enrichedModules.flatMap(m => m.lessons), [enrichedModules]);

  const handleNextLesson = () => {
    if (!selectedLesson) return;
    const idx = allLessons.findIndex(l => l.lesson_id === selectedLesson.lesson_id);
    if (idx < allLessons.length - 1) {
      const n = allLessons[idx + 1];
      setSelectedLesson(n);
      setActiveTab('Attachment');
      setExpandedModules(prev => ({ ...prev, [n.module_id]: true }));
    }
  };

  const handlePrevLesson = () => {
    if (!selectedLesson) return;
    const idx = allLessons.findIndex(l => l.lesson_id === selectedLesson.lesson_id);
    if (idx > 0) {
      const p = allLessons[idx - 1];
      setSelectedLesson(p);
      setActiveTab('Attachment');
      setExpandedModules(prev => ({ ...prev, [p.module_id]: true }));
    }
  };

  // ── Dock tabs ─────────────────────────────────────────────────────────────
  const dockTabs = useMemo(() => {
    if (!selectedLesson) return [] as { id: DockTabId; label: string; icon: React.ElementType }[];
    const tabs: { id: DockTabId; label: string; icon: React.ElementType }[] = [
      { id: 'Attachment', label: 'Lesson Materials', icon: Paperclip },
    ];
    if (selectedLesson.is_ai_tool_activity) tabs.push({ id: 'Browser', label: 'AI Tool', icon: Globe });
    if (selectedLesson.is_robotics_activity || (selectedLesson.is_activity && !selectedLesson.is_python_activity && !selectedLesson.is_ai_tool_activity)) {
      tabs.push({ id: 'Code',    label: 'Robotics Code',     icon: Bot });
      tabs.push({ id: 'Diagram', label: 'Reference Diagram', icon: ImageIcon });
    }
    if (selectedLesson.is_python_activity) {
      tabs.push({ id: 'Code', label: 'Python Code', icon: Code2 });
    }
    tabs.push({ id: 'Overview', label: 'Activity Content', icon: FileText });
    const seen = new Set<string>();
    return tabs.filter(t => !seen.has(t.id) && seen.add(t.id));
  }, [selectedLesson]);

  useEffect(() => {
    if (dockTabs.length > 0 && !dockTabs.find(t => t.id === activeTab)) {
      setActiveTab(dockTabs[0].id);
    }
  }, [dockTabs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dock resize ───────────────────────────────────────────────────────────
  const handleDockResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dockResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dockResizing.current) return;
      setDockWidth(Math.min(700, Math.max(300, window.innerWidth - e.clientX - 24)));
    };
    const onUp = () => {
      if (!dockResizing.current) return;
      dockResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Code copy helper ──────────────────────────────────────────────────────
  const cleanCode = (html: string) => {
    if (!html) return '';
    if (!html.includes('<')) return html.trim();
    return html
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/<[^>]*>/g, '').trim();
  };

  const handleCopyCode = (raw: string) => {
    navigator.clipboard.writeText(cleanCode(raw)).then(() => {
      setCopiedCode(true);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  // ── Video renderer ────────────────────────────────────────────────────────
  const renderVideo = (url: string) => {
    if (!url) return (
      <div className="w-full h-full flex items-center justify-center text-white/10">
        <PlayCircle className="w-20 h-20" />
      </div>
    );
    const isYt = url.includes('youtube.com') || url.includes('youtu.be');
    if (isYt) {
      const vid = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      return <iframe className="w-full h-full border-0" src={`https://www.youtube.com/embed/${vid}?modestbranding=1&rel=0`} allowFullScreen title="Teaching Content" />;
    }
    return <video className="w-full h-full bg-black object-contain" src={resolveMediaUrl(url)} controls controlsList="nodownload" />;
  };

  // ── Dock content renderer ─────────────────────────────────────────────────
  const renderDockContent = (fullscreen = false) => {
    if (!selectedLesson) return null;
    return (
      <>
        {activeTab === 'Overview' && (
          <div className="jodit-content text-sm text-slate-600 leading-relaxed animate-in fade-in duration-300"
            dangerouslySetInnerHTML={{ __html: selectedLesson.activity || '<p class="italic text-slate-400">No activity content configured for this topic.</p>' }}
          />
        )}

        {activeTab === 'Code' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-sm font-black text-indigo-700 tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Required Code
            </h4>
            {selectedLesson.code ? (() => {
              const lines = cleanCode(selectedLesson.code).split('\n');
              return (
                <div className="bg-[#0d1117] rounded-xl overflow-hidden shadow-md font-mono text-xs text-slate-100 max-w-full">
                  <div className="bg-[#161b22] border-b border-[#21262d] px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 pl-2">main.py — Reference Code</span>
                    </div>
                    <button
                      onClick={() => handleCopyCode(selectedLesson.code || '')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all ${copiedCode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <div className="flex overflow-x-auto max-h-[400px] divide-x divide-[#21262d]">
                    <div className="bg-[#0d1117]/90 text-slate-500 text-right pr-3 pl-2 py-4 select-none shrink-0 min-w-[35px]">
                      {lines.map((_, i) => <div key={i} className="leading-6 h-6">{i + 1}</div>)}
                    </div>
                    <div className="flex-1 p-4 overflow-x-auto">
                      {lines.map((line, i) => (
                        <div key={i} className="leading-6 h-6 whitespace-pre text-slate-200 hover:bg-slate-800/30 px-1 rounded-sm">
                          {line || ' '}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-5 text-sm text-slate-400 italic">No code provided for this topic.</div>
            )}
          </div>
        )}

        {activeTab === 'Diagram' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-sm font-black text-violet-700 tracking-widest flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-violet-500" /> Reference Diagram
            </h4>
            <div className="bg-violet-50/40 border border-violet-100 rounded-xl p-5 min-h-[150px]">
              {selectedLesson.diagram_url ? (
                <div className="jodit-content text-sm" dangerouslySetInnerHTML={{ __html: selectedLesson.diagram_url }} />
              ) : (
                <p className="text-sm text-slate-400 italic">No diagram provided.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Browser' && (
          <div className="animate-in fade-in duration-300 space-y-3">
            {selectedLesson.browser_url ? (
              isFrameBlocked(selectedLesson.browser_url) ? (
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-sky-50 to-indigo-50/30 rounded-2xl border border-sky-100 text-center shadow-sm" style={{ height: fullscreen ? 'calc(100vh - 250px)' : '420px' }}>
                  <div className="w-16 h-16 bg-sky-100/80 text-sky-600 rounded-full flex items-center justify-center mb-5 animate-bounce">
                    <Globe className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-black text-slate-800 tracking-tight">External Learning Workspace</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                    Due to security policies of the external site, this tool cannot be loaded inside the learning portal. Click below to launch it safely in a new browser tab.
                  </p>
                  <a
                    href={selectedLesson.browser_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                  >
                    Launch Workspace <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 pb-3 border-b border-sky-100">
                    <Globe className="w-5 h-5 text-sky-500 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-sky-800 tracking-wider">AI Tool</h4>
                      <a href={selectedLesson.browser_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-sky-500 hover:underline truncate block max-w-xs">
                        {selectedLesson.browser_url}
                      </a>
                    </div>
                  </div>
                  <iframe src={selectedLesson.browser_url} title="AI Tool"
                    className="w-full rounded-2xl border border-slate-200 shadow-sm"
                    style={{ height: fullscreen ? 'calc(100vh - 250px)' : '420px' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  />
                </>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-sky-50/40 rounded-2xl border border-dashed border-sky-200">
                <Globe className="w-10 h-10 text-sky-300 mb-4" />
                <p className="text-sm font-black text-sky-500 tracking-wider">No Browser URL configured.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Attachment' && (() => {
          const pdfUrl = selectedLesson.pdf_file_url;
          return (
            <div className="w-full overflow-x-auto animate-in fade-in duration-300">
              {pdfUrl ? (
                <div className="flex flex-col items-center py-2 min-h-[300px]" onContextMenu={e => e.preventDefault()}>
                  <Document
                    key={pdfUrl}
                    file={resolveMediaUrl(pdfUrl)}
                    onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                    options={PDF_OPTIONS}
                    loading={
                      <div className="p-12 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
                        <p className="text-xs font-black text-indigo-400 tracking-widest animate-pulse">Loading materials...</p>
                      </div>
                    }
                    error={
                      <div className="p-12 flex flex-col items-center bg-rose-50/50 rounded-2xl border border-dashed border-rose-100">
                        <Paperclip className="w-8 h-8 text-rose-300 mb-3" />
                        <p className="text-rose-500 font-black text-xs tracking-widest">Failed to load document</p>
                      </div>
                    }
                  >
                    {Array.from({ length: numPages || 0 }, (_, i) => (
                      <div key={i + 1} className="mb-6 last:mb-0 select-none w-full flex justify-center pdf-container">
                        <Page
                          pageNumber={i + 1}
                          width={fullscreen ? Math.min(1000, window.innerWidth - 100) : Math.max(220, dockWidth - 130)}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                          className="shadow-md rounded-lg overflow-hidden bg-white"
                        />
                      </div>
                    ))}
                  </Document>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-indigo-50/30 rounded-2xl border border-dashed border-indigo-200">
                  <Paperclip className="w-10 h-10 text-indigo-300 mb-4" />
                  <p className="text-xs font-black text-indigo-400 tracking-widest">No materials for this lesson</p>
                </div>
              )}
            </div>
          );
        })()}
      </>
    );
  };

  const activeDockTab = dockTabs.find(t => t.id === activeTab);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-base font-bold text-indigo-400 tracking-widest animate-pulse">Loading Teaching Path...</span>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <GraduationCap className="w-14 h-14 text-indigo-200" />
        <p className="text-lg font-bold tracking-wide text-slate-600">No grades assigned yet.</p>
        <p className="text-sm opacity-70">Contact admin or staff to assign grades to your profile.</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-4 mx-auto px-1 py-2 animate-in fade-in duration-300">

        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col gap-4">
          {/* Top Section: Title & Subtitle + Focus Mode button & Progress Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            {/* Title & Selected topic info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-indigo-950 tracking-tight truncate">Teaching Path</h3>
                {selectedLesson ? (
                  <p className="text-xs text-slate-500 font-semibold tracking-wide pt-0.5 truncate">
                    {selectedLesson.module_name}
                    <ChevronRight className="w-3.5 h-3.5 inline-block mx-0.5 -mt-0.5 text-indigo-400" />
                    {selectedLesson.sub_topic}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 font-semibold pt-0.5">Select a topic to begin teaching.</p>
                )}
              </div>
            </div>

            {/* Progress & Focus Mode Controls */}
            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
              {/* Progress bar */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-indigo-100/60 shadow-xs">
                <div className="h-1.5 w-16 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="text-[11px] font-black text-indigo-600 tracking-wider whitespace-nowrap">{progressPct}% done</span>
              </div>

              {/* Focus mode button */}
              <button
                onClick={() => setFocusMode(f => !f)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider transition-all cursor-pointer border
                  ${focusMode ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'}`}
              >
                <Focus className="w-3.5 h-3.5" />
                <span>{focusMode ? 'Exit Focus' : 'Focus Mode'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Section: Grade Tabs (Wrappable grid/flex) */}
          <div className="border-t border-indigo-100/60 pt-3">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Assigned Grades</div>
            <div className="flex flex-wrap gap-1.5">
              {grades.map((g, idx) => {
                const isActive = selectedGradeId === g.grade_id && selectedSectionId === g.section_id;
                const displayName = g.section_name ? `${g.grade_name} - ${g.section_name}` : g.grade_name;
                return (
                  <button
                    key={`${g.grade_id}-${g.section_id || idx}`}
                    onClick={() => {
                      setGradeId(g.grade_id);
                      setSelectedSectionId(g.section_id);
                      setSelectedLesson(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0
                      ${isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-sm shadow-indigo-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/60'}`}
                  >
                    {displayName}
                    {g.completion_percentage > 0 && (
                      <span className={`ml-1.5 text-[11px] ${isActive ? 'text-white/80' : 'text-indigo-400'}`}>
                        {g.completion_percentage.toFixed(0)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Workbench ────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch min-w-0 lg:h-[calc(100vh-165px)] min-h-[600px] lg:min-h-0">

          {/* Left: Curriculum Rail */}
          {!focusMode && (
            <div className={`shrink-0 transition-all duration-300 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${sidebarOpen ? 'w-full lg:w-[290px]' : 'w-full lg:w-[60px]'} ${sidebarOpen ? 'max-h-[50vh] lg:max-h-none' : 'max-h-[48px] lg:max-h-none'}`}>
              <div className="p-3.5 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50/40 flex items-center justify-between shrink-0">
                {sidebarOpen && (
                  <h3 className="font-black text-indigo-900 text-xs tracking-wider truncate pl-1">Topics</h3>
                )}
                <button
                  onClick={() => setSidebarOpen(o => !o)}
                  className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400 hover:text-indigo-600 hover:bg-white transition-all cursor-pointer shrink-0"
                >
                  {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
                {gradeLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  </div>
                ) : enrichedModules.length === 0 ? (
                  sidebarOpen && (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold tracking-wider">
                      No topics found for this grade.
                    </div>
                  )
                ) : enrichedModules.map((mod, idx) => {
                  const isExpanded  = !!expandedModules[mod.module_id];
                  const hasActive   = mod.lessons.some(l => l.lesson_id === selectedLesson?.lesson_id);
                  const modNum      = String(idx + 1).padStart(2, '0');
                  const pct         = mod.completion_percentage;

                  return (
                    <div key={mod.module_id} className="group/mod">
                      <div
                        onClick={() => { if (!sidebarOpen) setSidebarOpen(true); setExpandedModules(p => ({ ...p, [mod.module_id]: !p[mod.module_id] })); }}
                        className={`p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-indigo-50/50 ${isExpanded ? 'bg-indigo-50/40' : ''} ${sidebarOpen ? 'justify-between' : 'justify-center'}`}
                        title={mod.module_name}
                      >
                        <div className={`flex items-center gap-3 truncate ${sidebarOpen ? '' : 'justify-center'}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm shrink-0 transition-all duration-300
                            ${isExpanded || hasActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-105 shadow-indigo-200' : 'bg-slate-100 text-slate-500 group-hover/mod:bg-indigo-100 group-hover/mod:text-indigo-600'}`}>
                            {modNum}
                          </div>
                          {sidebarOpen && (
                            <div className="min-w-0 flex-1">
                              <span className={`text-sm font-extrabold tracking-tight truncate block ${isExpanded ? 'text-indigo-700' : 'text-slate-700'}`}>{mod.module_name}</span>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {pct > 0 && <span className="text-[10px] text-emerald-500 font-bold">{pct.toFixed(0)}% complete</span>}
                                <span className="text-[10px] text-slate-400 dark:text-[#94a3b8] font-semibold">
                                  Periods: {mod.executed_periods}/{mod.expected_periods} ({mod.executed_hours.toFixed(1)}h)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        {sidebarOpen && <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-600' : ''}`} />}
                      </div>

                      {sidebarOpen && isExpanded && (
                        <div className="border-t border-slate-100 bg-white py-1.5 animate-in slide-in-from-top-2 duration-200">
                          {mod.lessons.length === 0 ? (
                            <div className="px-10 py-3 text-xs text-slate-400 italic">No topics in this unit</div>
                          ) : mod.lessons.map(lesson => {
                            const isActive = selectedLesson?.lesson_id === lesson.lesson_id;
                            const cfg      = STATUS_CFG[lesson.status];
                            const Icon     = cfg.icon;
                            return (
                              <div
                                key={lesson.lesson_id}
                                onClick={() => { setSelectedLesson(lesson); setActiveTab('Attachment'); }}
                                className={`relative px-8 py-2.5 text-xs font-bold cursor-pointer transition-all flex flex-col gap-1 ${
                                  isActive
                                    ? 'text-blue-700 bg-blue-50 translate-x-1'
                                    : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50 hover:translate-x-1'
                                }`}
                              >
                                {isActive && (
                                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-teal-400 rounded-r-full" />
                                )}
                                <div className="flex items-center gap-2 w-full">
                                  <Icon className={`w-4 h-4 shrink-0 ${cfg.text}`} />
                                  <span className="truncate flex-1">{lesson.sub_topic}</span>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} title={cfg.label} />
                                </div>
                                <div className="pl-6 text-[10px] text-slate-400 dark:text-[#94a3b8] font-semibold flex items-center gap-1.5">
                                  <span>Expected: {lesson.expected_periods}</span>
                                  <span>•</span>
                                  <span>Executed: {lesson.executed_periods} ({lesson.executed_hours.toFixed(1)}h)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Center: Stage */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">
            {selectedLesson ? (
              <>
                {/* Lesson header */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-col gap-3 shrink-0">
                  {/* Row 1: Module Name & Lesson Topic */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-black text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-2.5 py-0.5 rounded-full tracking-wider">
                        {selectedLesson.module_name}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ⏱️ Expected: {selectedLesson.expected_periods} Periods
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        🎬 Executed: {selectedLesson.executed_periods} Periods ({selectedLesson.executed_hours.toFixed(1)}h)
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight break-words">
                      {selectedLesson.sub_topic}
                    </h2>
                  </div>

                  {/* Row 2: Navigation & Status Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    {/* Left: Navigation buttons */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={handlePrevLesson} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer" title="Previous topic">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={handleNextLesson} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer" title="Next topic">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Right: Status badge & Cycle button */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={selectedLesson.status} />

                      <button
                        onClick={() => handleCycleStatus(selectedLesson)}
                        disabled={!!updatingId}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer
                          ${selectedLesson.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : selectedLesson.status === 'InProgress'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-105 shadow-sm shadow-amber-200'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:brightness-105 shadow-sm shadow-indigo-200'}
                          disabled:opacity-50`}
                      >
                        {updatingId === selectedLesson.lesson_id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {selectedLesson.status === 'NotStarted' ? 'Start Teaching'
                          : selectedLesson.status === 'InProgress' ? 'Mark Completed'
                          : 'Reset Status'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video */}
                {!notesExpanded && (
                  <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden shrink-0 flex flex-col"
                    style={{ height: videoCollapsed ? 'auto' : '40%', minHeight: videoCollapsed ? 'auto' : '250px' }}>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-sky-100 bg-sky-50/40 shrink-0">
                      <span className="text-xs font-bold text-sky-600 tracking-widest">VIDEO</span>
                      <div className="flex items-center gap-2">
                        {!videoCollapsed && (
                          <button onClick={() => setFSVideo(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-600 hover:text-sky-800 rounded-lg text-xs font-bold transition-all cursor-pointer">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setVideoCollapsed(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-600 hover:text-sky-800 rounded-lg text-xs font-bold transition-all cursor-pointer">
                          {videoCollapsed ? <><ChevronDown className="w-3.5 h-3.5" /> Show Video</> : <><ChevronUp className="w-3.5 h-3.5" /> Hide Video</>}
                        </button>
                      </div>
                    </div>
                    {!videoCollapsed && (
                      <div className="flex-1 min-h-0 bg-slate-900 animate-in fade-in duration-300">
                        <VideoCarousel urls={selectedLesson.video_urls ?? (selectedLesson.video_url ? [selectedLesson.video_url] : [])} />
                      </div>
                    )}
                  </div>
                )}

                {/* Teacher Notes strip */}
                <div className="bg-white rounded-2xl border border-violet-100 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-violet-100 bg-violet-50/30 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <NotebookPen className="w-4 h-4 text-violet-600 shrink-0" />
                      <h4 className="text-sm font-black text-violet-900 tracking-wider truncate">Teaching Notes & Remarks</h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleSaveNote}
                        disabled={savingNote}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-widest transition-all shadow-sm cursor-pointer ${savingNote ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:brightness-105 shadow-violet-200'}`}
                      >
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                      <button
                        onClick={() => setNotesExpanded(v => !v)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-100 hover:bg-violet-200 text-violet-600 transition-all cursor-pointer"
                      >
                        {notesExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto px-1 pt-1 pb-1">
                    <PremiumRichTextEditor
                      value={teacherNote}
                      onChange={setTeacherNote}
                      placeholder="Add teaching notes, observations, or remarks for this topic — saved with the topic status..."
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-indigo-100 p-20 text-center text-slate-400 shadow-sm flex flex-col items-center justify-center flex-1">
                <MonitorPlay className="w-16 h-16 text-indigo-200 mb-4" />
                <p className="text-sm font-bold tracking-wider text-slate-500">Select a topic from the curriculum rail</p>
                <p className="text-xs text-slate-400 mt-1">Click any lesson on the left to begin</p>
              </div>
            )}
          </div>

          {/* Right: Tools Dock */}
          {selectedLesson && dockTabs.length > 0 && !notesExpanded && (
            <div
              className="shrink-0 bg-white rounded-2xl border border-purple-100 shadow-sm flex overflow-hidden relative min-h-0 w-full lg:w-[var(--dock-width)] min-h-[350px] lg:min-h-0"
              style={{ '--dock-width': `${dockWidth}px` } as React.CSSProperties}
            >
              {/* Drag handle */}
              <div
                onMouseDown={handleDockResizeStart}
                className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 flex items-center justify-center group/handle hover:bg-purple-100 transition-colors"
              >
                <GripVertical className="w-3 h-3 text-slate-300 group-hover/handle:text-purple-500" />
              </div>

              {/* Tab rail */}
              <div className="w-[58px] shrink-0 border-r border-purple-100 bg-gradient-to-b from-purple-50/60 to-indigo-50/30 flex flex-col items-center pt-4 gap-1.5 pl-2">
                {dockTabs.map(tab => {
                  const Icon     = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.label}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0
                        ${isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 scale-105' : 'text-slate-400 hover:bg-white hover:text-purple-600 hover:shadow-xs'}`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </button>
                  );
                })}
              </div>

              {/* Active tool panel */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b border-purple-100 bg-purple-50/20 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {activeDockTab && <activeDockTab.icon className="w-4 h-4 text-purple-600" />}
                    <h4 className="text-sm font-black text-purple-900 tracking-wider truncate">{activeDockTab?.label}</h4>
                  </div>
                  <button
                    onClick={() => setFSMats(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-600 hover:text-purple-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
                  {renderDockContent(false)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Video Overlay */}
        {isFullscreenVideo && selectedLesson && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md p-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="max-w-5xl w-full aspect-video bg-black rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative flex flex-col">
              <button onClick={() => setFSVideo(false)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-rose-600 hover:text-white text-slate-300 flex items-center justify-center transition-all">
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 w-full bg-black">
                <VideoCarousel urls={selectedLesson.video_urls ?? (selectedLesson.video_url ? [selectedLesson.video_url] : [])} />
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Materials Overlay */}
        {isFullscreenMaterials && selectedLesson && activeDockTab && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md p-4 flex flex-col animate-in fade-in duration-300">
            <div className="max-w-6xl w-full mx-auto flex-1 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-purple-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center gap-2.5">
                  <activeDockTab.icon className="w-5 h-5 text-purple-600" />
                  <h4 className="text-base font-black text-purple-900 tracking-wider uppercase">{activeDockTab.label}</h4>
                </div>
                <button onClick={() => setFSMats(false)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white hover:bg-rose-50 hover:text-rose-500 text-slate-500 border border-purple-100 transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-white custom-scrollbar">
                {renderDockContent(true)}
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
        @media print { body { display: none !important; } }
      `}</style>
    </>
  );
};

export default TeachingPath;
