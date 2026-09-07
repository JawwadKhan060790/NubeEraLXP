import ConfirmModal from '@/components/ConfirmModal';
import StatGrid, { type StatItem } from '@/components/StatGrid';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import { schoolCurriculumService } from '@/services/schoolCurriculumService';
import { BookOpen, Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, Edit, GraduationCap, Loader2, Plus, Save, Search, Trash2, User, X } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ScheduleEntry {
  id: string;
  school_id?: string;
  grade_id: string;
  grade_name: string;
  section_id?: string;
  section_code?: string;
  grade_display?: string;
  module_id: string;
  module_name: string;
  lesson_id?: string;
  lesson_sub_topic?: string;
  teacher_id: string;
  teacher_name: string;
  date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  status?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  remarks?: string;
}

interface Grade {
  id: string;
  Id?: string;
  grade_name: string;
  grade_level: string;
  grade_level_id?: string;
  gradeLevelId?: string;
  school_id?: string;
}

interface SectionItem {
  id: string;
  grade_id: string;
  section_code: string;
  display_name: string;
  school_id?: string;
}

const TeacherScheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSections, setAllSections] = useState<SectionItem[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [assignedUnits, setAssignedUnits] = useState<any[]>([]);
  const [assignedTopics, setAssignedTopics] = useState<any[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [showFormModal, setShowFormModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [filterSchoolId, setFilterSchoolId] = useState('');

  // Calendar States for Teacher view
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [viewTab, setViewTab] = useState<'calendar' | 'list'>('calendar');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    school_id: '',
    teacher_id: '',
    grade_id: '',
    section_id: '',
    module_id: '',
    lesson_id: '',
    date: '',
    start_time: '',
    end_time: '',
  });

  const [user, setUser] = useState<any>(null);
  const isPrincipal = user?.role === 'principal' || user?.utype === 'principal';

  useEffect(() => {
    const checkUser = async () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        let parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed.utype === 'teacher') {
          setFormData(prev => ({ ...prev, teacher_id: parsed.teacher_id || parsed.id }));
          setViewTab('calendar'); // Default to calendar for teachers!
        } else {
          setViewTab('list'); // Default to list for staff/admins!
        }
      }
    };
    checkUser();
    fetchAllData();
  }, []);

  useEffect(() => {
    if (location.pathname.includes('/create')) {
      setShowFormModal(true);
    }
  }, [location]);

  // Fetch school curriculum when school_id changes
  useEffect(() => {
    if (formData.school_id) {
      const fetchSchoolCurriculum = async () => {
        setCurriculumLoading(true);
        try {
          const [unitsData, topicsData] = await Promise.all([
            schoolCurriculumService.getSchoolUnits(formData.school_id),
            schoolCurriculumService.getSchoolTopics(formData.school_id)
          ]);
          setAssignedUnits(unitsData || []);
          setAssignedTopics(topicsData || []);
        } catch (err) {
          console.error('Failed to fetch assigned curriculum for school', err);
          toast.error('Failed to load assigned curriculum');
        } finally {
          setCurriculumLoading(false);
        }
      };
      fetchSchoolCurriculum();
    } else {
      setAssignedUnits([]);
      setAssignedTopics([]);
    }
  }, [formData.school_id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [schedulesRes, gradesRes, teachersRes, modulesRes, sectionsRes, schoolsRes] = await Promise.allSettled([
        api.get('/schedulers'),
        api.get('/grades'),
        api.get('/teachers'),
        api.get('/modules'),
        api.get('/grade-sections'),
        api.get('/schools')
      ]);

      if (schedulesRes.status === 'fulfilled') {
        const d = (schedulesRes.value as any).data;
        const rawScheds = Array.isArray(d) ? d : (d.value || []);
        const scheds = rawScheds.map((s: any) => ({
          ...s,
          id: s.id || s.Id,
          school_id: s.school_id || s.SchoolId || '',
          grade_id: s.grade_id || s.GradeId,
          grade_name: s.grade_name || s.GradeName,
          section_id: s.section_id || s.SectionId,
          section_code: s.section_code || s.SectionCode,
          grade_display: s.grade_display || s.GradeDisplay,
          module_id: s.module_id || s.ModuleId,
          module_name: s.module_name || s.ModuleName,
          teacher_id: s.teacher_id || s.TeacherId,
          teacher_name: s.teacher_name || s.TeacherName,
          start_time: s.start_time || s.startTime || s.StartTime || '',
          end_time: s.end_time || s.endTime || s.EndTime || '',
          date: s.date || s.Date || '',
          status: s.status || s.Status || 'NotStarted',
          actual_start_time: s.actual_start_time || s.actualStartTime || s.ActualStartTime || null,
          actual_end_time: s.actual_end_time || s.actualEndTime || s.ActualEndTime || null,
          remarks: s.remarks || s.Remarks || ''
        }));
        setSchedules(scheds);
      }

      if (gradesRes.status === 'fulfilled') {
        setGrades((gradesRes.value as any).data || []);
      }
      if (teachersRes.status === 'fulfilled') {
        setTeachers((teachersRes.value as any).data || []);
      }
      if (modulesRes.status === 'fulfilled') {
        setModules((modulesRes.value as any).data || []);
      }
      if (sectionsRes.status === 'fulfilled') {
        setAllSections((sectionsRes.value as any).data || []);
      }
      if (schoolsRes.status === 'fulfilled') {
        setSchools((schoolsRes.value as any).data || []);
      }
    } catch (e) {
      toast.error('Failed to load scheduler data');
    } finally {
      setLoading(false);
    }
  };

  const availableUnits = useMemo(() => {
    if (!formData.school_id) return [];
    const assignedIds = new Set(assignedUnits.map(u => u.unitId || u.unit_id || u.UnitId));
    const selectedGrade = grades.find(g => g.id === formData.grade_id || g.Id === formData.grade_id);
    const gradeLevelId = selectedGrade?.grade_level_id || selectedGrade?.gradeLevelId;
    return modules.filter(m => {
      const isAssigned = assignedIds.has(m.id || m.Id);
      const matchesGrade = !formData.grade_id || m.grade_level_id === gradeLevelId || m.gradeLevelId === gradeLevelId;
      return isAssigned && matchesGrade;
    });
  }, [assignedUnits, modules, formData.school_id, formData.grade_id, grades]);

  const availableTopics = useMemo(() => {
    if (!formData.school_id) return [];
    const assignedIds = new Set(assignedTopics.map(t => t.topicId || t.topic_id || t.TopicId));
    return assignedTopics
      .map(t => ({
        id: t.topicId || t.topic_id || t.TopicId || '',
        name: t.topicName || t.topic_name || t.TopicName || '',
        module_id: t.unitId || t.unit_id || t.UnitId || ''
      }))
      .filter(t => !formData.module_id || t.module_id === formData.module_id);
  }, [assignedTopics, formData.school_id, formData.module_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedTeacher = teachers.find(t => t.id === formData.teacher_id);
    const selectedGrade = grades.find(g => g.id === formData.grade_id);
    const selectedModule = modules.find(m => m.id === formData.module_id);

    const payload = {
      grade_id: formData.grade_id || null,
      section_id: formData.section_id || null,
      teacher_id: formData.teacher_id || null,
      module_id: formData.module_id || null,
      lesson_id: formData.lesson_id || null,
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      teacher_name: selectedTeacher ? `${selectedTeacher.first_name} ${selectedTeacher.last_name}` : 'Unknown Teacher',
      grade_name: selectedGrade ? selectedGrade.grade_name : 'Unknown Grade',
      module_name: selectedModule ? selectedModule.name : 'General Class',
      is_active: true
    };

    try {
      if (editingId) {
        await api.put(`/schedulers/${editingId}`, { id: editingId, ...payload });
        toast.success('Schedule updated');
      } else {
        await api.post('/schedulers', payload);
        toast.success('Schedule added');
      }
      setShowFormModal(false);
      resetForm();
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving class schedule');
    }
  };

  const handleEdit = (s: ScheduleEntry) => {
    setEditingId(s.id);
    const selectedGrade = grades.find(g => g.id === s.grade_id);
    const schoolId = (s as any).school_id || selectedGrade?.school_id || '';
    setFormData({
      school_id: schoolId,
      teacher_id: s.teacher_id,
      grade_id: s.grade_id,
      section_id: s.section_id || '',
      module_id: s.module_id,
      lesson_id: s.lesson_id || '',
      date: s.date ? s.date.slice(0, 10) : '',
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
    });
    setShowFormModal(true);
  };

  const { confirmState, requestConfirm } = useConfirm();

  const handleDelete = async (id: string) => {
    const yes = await requestConfirm({
      title: 'Remove Class',
      message: 'Are you sure you want to delete this schedule entry?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!yes) return;

    try {
      await api.delete(`/schedulers/${id}`);
      toast.success('Schedule removed');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to remove schedule entry');
    }
  };

  const handleSchoolChange = (schoolId: string) => {
    setFormData(prev => ({
      ...prev,
      school_id: schoolId,
      grade_id: '',
      section_id: '',
      module_id: '',
      lesson_id: ''
    }));
  };

  const handleGradeChange = (gradeId: string) => {
    setFormData(prev => ({ ...prev, grade_id: gradeId, section_id: '', module_id: '', lesson_id: '' }));
  };

  const handleUnitChange = (moduleId: string) => {
    setFormData(prev => ({ ...prev, module_id: moduleId, lesson_id: '' }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      school_id: user?.school_id || '',
      teacher_id: user?.utype === 'teacher' ? (user.teacher_id || user.id) : '',
      grade_id: '',
      section_id: '',
      module_id: '',
      lesson_id: '',
      date: '',
      start_time: '',
      end_time: '',
    });
  };

  // Isolate current teacher's schedules if user role is a teacher
  const isTeacher = user?.utype === 'teacher';

  const mySchedules = schedules.filter(s => {
    if (!isTeacher) return true; // Admins / Staff see all
    const teacherId = (user?.teacher_id || user?.id || user?.teacherId || '').toString().toLowerCase();
    const userId = (user?.id || '').toString().toLowerCase();
    const schedTid = (s.teacher_id || '').toString().toLowerCase();

    const matchesId = (schedTid.length > 0 && (schedTid === teacherId || schedTid === userId));
    const matchesName = user?.full_name && s.teacher_name?.toLowerCase().includes(user.full_name.toLowerCase());
    const matchesUserName = user?.name && s.teacher_name?.toLowerCase().includes(user.name.toLowerCase());
    const matchesTeacherName = user?.teacher_name && s.teacher_name?.toLowerCase().includes(user.teacher_name.toLowerCase());
    return matchesId || matchesName || matchesUserName || matchesTeacherName;
  });

  const filteredSchedules = mySchedules.filter(s => {
    const matchesSearch =
      s.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.module_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = filterSchoolId ? (s.school_id === filterSchoolId || grades.find(g => g.id === s.grade_id)?.school_id === filterSchoolId) : true;
    const matchesGrade = filterGradeId ? s.grade_id === filterGradeId : true;
    return matchesSearch && matchesSchool && matchesGrade;
  });

  useEffect(() => {
    if (filteredSchedules.length > 0) {
      if (!selectedScheduleId || !filteredSchedules.some(s => s.id === selectedScheduleId)) {
        setSelectedScheduleId(filteredSchedules[0].id);
      }
    } else {
      setSelectedScheduleId(null);
    }
  }, [filteredSchedules]);


  // Month Calendar Computations
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonthIndex = new Date(year, month, 1).getDay();
  const daysInMonthCount = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: firstDayOfMonthIndex }, () => null);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const getSchedulesForDay = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredSchedules.filter(s => s.date && s.date.slice(0, 10) === dateString);
  };

  const selectedDaySchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  const renderStatusBadge = (status?: string) => {
    const st = (status || 'NotStarted').toLowerCase();
    switch (st) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
            Completed
          </span>
        );
      case 'inprogress':
      case 'incomplete':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
            In Progress
          </span>
        );
      case 'missed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
            Missed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> {isTeacher ? 'My Academic Schedule' : 'Teacher Timetable Management'}
          </h1>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            {isTeacher ? 'Track your upcoming modules, lesson plans, and assignments' : 'Configure and coordinate curriculum classes for teachers'}
          </p>
        </div>

        {/* Dynamic view tabs switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-md p-0.5 shadow-sm">
            <button
              onClick={() => setViewTab('calendar')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${viewTab === 'calendar' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-700'
                }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewTab('list')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${viewTab === 'list' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-700'
                }`}
            >
              List Directory
            </button>
          </div>

          {!isTeacher && (
            <button
              onClick={() => { resetForm(); setShowFormModal(true); }}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Add Schedule
            </button>
          )}
        </div>
      </div>

      {/* Counters / Stats Row */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayCount = mySchedules.filter(s => s.date?.slice(0, 10) === todayStr).length;
        const upcomingCount = mySchedules.filter(s => s.date?.slice(0, 10) >= todayStr).length;
        const assignedTeachers = new Set(mySchedules.map(s => s.teacher_id)).size;
        const schedulerStats: StatItem[] = [
          { title: 'Total Schedules', value: mySchedules.length, icon: <Calendar className="w-6 h-6" />, color: 'indigo' },
          { title: "Today's Classes", value: todayCount, icon: <Clock className="w-6 h-6" />, color: 'emerald' },
          { title: 'Upcoming Classes', value: upcomingCount, icon: <GraduationCap className="w-6 h-6" />, color: 'sky' },
          { title: 'Assigned Teachers', value: assignedTeachers, icon: <User className="w-6 h-6" />, color: 'amber' },
        ];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatGrid stats={schedulerStats} loading={loading} />
          </div>
        );
      })()}

      {/* Split Panel Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL */}
        <div className="lg:col-span-6 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl flex flex-col overflow-hidden shadow-sm">
          {viewTab === 'calendar' ? (
            /* CALENDAR MASTER LIST */
            <div className="p-5 md:p-6 space-y-6">
              {/* Calendar Month Selector Header */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0f172a] p-3 border border-slate-100 dark:border-[#283548] rounded-xl">
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#162032] hover:bg-slate-100 dark:hover:bg-[#1e293b] flex items-center justify-center transition-all cursor-pointer text-slate-600 dark:text-[#cbd5e1]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest select-none font-mono">
                  {monthNames[month]} {year}
                </span>

                <button
                  onClick={nextMonth}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#162032] hover:bg-slate-100 dark:hover:bg-[#1e293b] flex items-center justify-center transition-all cursor-pointer text-slate-600 dark:text-[#cbd5e1]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekdays Row */}
              <div className="grid grid-cols-7 gap-2 text-center text-[12px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest">
                {daysOfWeek.map(d => <div key={d} className="py-1">{d}</div>)}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2">
                {paddingArray.map((_, idx) => (
                  <div key={`pad-${idx}`} className="aspect-square bg-slate-50/30 dark:bg-[#162032]/20 border border-slate-100/30 dark:border-[#1e293b] rounded-lg opacity-30" />
                ))}

                {daysArray.map(day => {
                  const dayScheds = getSchedulesForDay(day);
                  const isSelected = selectedDay === day;

                  const today = new Date();
                  const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => setSelectedDay(day)}
                      className={`aspect-square rounded-lg border p-1 cursor-pointer flex flex-col justify-between transition-all select-none relative group ${isSelected
                        ? 'bg-primary/5 border-primary shadow-sm'
                        : isToday
                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50'
                          : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#162032]/50'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[12px] font-black ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-[#b0bccc]'}`}>
                          {day}
                        </span>
                        {isToday && (
                          <span className="text-[6px] font-black bg-amber-500 text-white px-1 py-0.2 rounded-[2px] uppercase scale-90">
                            Today
                          </span>
                        )}
                      </div>

                      {dayScheds.length > 0 && (
                        <div className="space-y-0.5">
                          <div className="text-[6px] md:text-[7px] font-black bg-primary text-white px-1 py-0.2 rounded-[2px] truncate max-w-full text-center uppercase tracking-tight">
                            {dayScheds[0].module_name || 'Class'}
                          </div>
                          {dayScheds.length > 1 && (
                            <div className="text-[6px] font-bold text-primary text-center">
                              +{dayScheds.length - 1} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* SEARCHABLE SCHEDULES DIRECTORY LIST */
            <div className="flex flex-col h-full max-h-[680px]">
              {/* Directory Filter Panel */}
              <div className="p-4 border-b border-slate-100 dark:border-[#334155] bg-slate-50/60 dark:bg-[#0f172a] flex flex-row items-center gap-3 flex-shrink-0 w-full overflow-x-auto">
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search schedules..."
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-semibold"
                  />
                </div>

                <div className="relative min-w-[140px]">
                  <select
                    value={filterSchoolId}
                    onChange={(e) => { setFilterSchoolId(e.target.value); setFilterGradeId(''); }}
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 cursor-pointer appearance-none"
                  >
                    <option value="">All Schools</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-[#64748b] pointer-events-none" />
                </div>

                <div className="relative min-w-[120px]">
                  <select
                    value={filterGradeId}
                    onChange={(e) => setFilterGradeId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 cursor-pointer appearance-none"
                  >
                    <option value="">All Grades</option>
                    {grades
                      .filter(g => !filterSchoolId || g.school_id === filterSchoolId)
                      .map(g => <option key={g.id} value={g.id}>{g.grade_name || `Grade ${g.grade_level}`}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-[#64748b] pointer-events-none" />
                </div>
              </div>

              {/* Scrollable list content */}
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#283548] flex-1 min-h-[350px]">
                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest">Retrieving scheduled database...</p>
                  </div>
                ) : filteredSchedules.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 dark:text-[#64748b]">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">No schedule entries match selection filter.</p>
                  </div>
                ) : (
                  filteredSchedules.map((s) => {
                    const isSelected = selectedScheduleId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedScheduleId(s.id)}
                        className={`relative px-4 py-3.5 cursor-pointer flex flex-col transition-all duration-200 border-l-[3px] group ${isSelected
                          ? 'bg-indigo-50/70 border-l-indigo-500'
                          : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-[#283548] hover:border-l-slate-300'
                          }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="text-sm font-bold truncate leading-tight ">{s.module_name || 'General Class'}</h4>
                            <p className="text-[12px] font-medium text-slate-500 dark:text-[#94a3b8] flex items-center gap-1.5">
                              <User className="w-3 h-3" /> {s.teacher_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                            {renderStatusBadge(s.status)}
                            <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-400/25 px-2 py-0.5 rounded-full">
                              {s.grade_display || (s.section_code ? `${s.grade_name} - ${s.section_code}` : s.grade_name)}
                            </span>
                            {isSelected && (
                              <ChevronRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t border-slate-100 dark:border-[#283548]/50 text-[12px] text-slate-400 dark:text-[#64748b] font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" /> {s.date ? s.date.slice(0, 10) : ''} | {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                          </div>
                          {s.actual_end_time && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Completed: {new Date(s.actual_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT DETAIL PANEL */}
        <div className="lg:col-span-6 space-y-6">
          {viewTab === 'calendar' ? (
            /* Day Details View for Calendar Mode */
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 md:p-6 shadow-sm space-y-5 min-h-[400px] flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 dark:border-[#283548] pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Day Highlights</h3>
                    <p className="text-[12px] font-bold text-slate-500 dark:text-[#94a3b8] mt-0.5 uppercase font-mono">
                      {selectedDay ? `${monthNames[month]} ${selectedDay}, ${year}` : 'Select a date'}
                    </p>
                  </div>
                  {selectedDaySchedules.length > 0 && (
                    <span className="bg-primary/10 text-primary border border-primary/20 text-[12px] font-black px-2 py-0.5 rounded-lg uppercase font-mono">
                      {selectedDaySchedules.length} Classes
                    </span>
                  )}
                </div>

                {selectedDaySchedules.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 space-y-3 bg-slate-50 dark:bg-[#0f172a] rounded-2xl border border-dashed border-slate-200 dark:border-[#283548] mt-4">
                    <Calendar className="w-8 h-8 text-slate-300 dark:text-[#3d4b5f]" />
                    <div className="space-y-1">
                      <p className="text-[12px] font-bold text-slate-500 dark:text-[#94a3b8] uppercase tracking-widest">No Classes Scheduled</p>
                      <p className="text-[12px] text-slate-400 dark:text-[#64748b] font-semibold uppercase">Enjoy your day or choose another date on the calendar</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1 mt-4">
                    {selectedDaySchedules.map((s, idx) => (
                      <div
                        key={s.id}
                        onClick={() => navigate(
                          `/teacher/attendance?schedulerId=${s.id}&gradeId=${s.grade_id}&sectionId=${s.section_id || ''}&date=${s.date.slice(0, 10)}&moduleId=${s.module_id || ''}`
                        )}
                        className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-[#283548] rounded-2xl p-4 space-y-3 shadow-inner hover:shadow-md hover:border-primary/40 transition-all relative overflow-hidden group cursor-pointer"
                      >
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />

                        <div className="flex justify-between items-start">
                          <span className="text-[12px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg uppercase tracking-wide font-mono">
                            Class {idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderStatusBadge(s.status)}
                            <div className="flex items-center gap-1 text-[12px] font-bold text-slate-400 dark:text-[#64748b] font-mono">
                              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b]" /> {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">{s.module_name || 'General Class'}</h4>
                          <p className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-wider flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b]" /> {s.grade_display || (s.section_code ? `${s.grade_name} - ${s.section_code}` : s.grade_name)}
                          </p>
                        </div>

                        {s.lesson_sub_topic && (
                          <div className="bg-white dark:bg-[#162032] border border-slate-100 dark:border-[#283548] rounded-lg p-2 text-[10px] font-bold text-slate-500 dark:text-[#94a3b8] flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b] animate-pulse" /> Subtopic: {s.lesson_sub_topic}
                          </div>
                        )}

                        {s.actual_end_time && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-lg p-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between font-mono">
                            <span>Completed At:</span>
                            <span>{new Date(s.actual_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Selected Schedule Detail card for List Mode */
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
              {!selectedScheduleId || !selectedSchedule ? (
                <div className="text-center py-20 my-auto text-slate-400 dark:text-[#64748b]">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-xs font-semibold">Please select a schedule entry from the list to view timeline details.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Subject Title and Grade */}
                  <div className="space-y-2">
                    <span className="text-[12px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      {selectedSchedule.grade_display || (selectedSchedule.section_code ? `${selectedSchedule.grade_name} - ${selectedSchedule.section_code}` : selectedSchedule.grade_name)}
                    </span>
                    <h3 className="text-md md:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                      {selectedSchedule.module_name || 'General Class'}
                    </h3>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-[#283548] pt-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[12px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Assigned Faculty</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 text-white font-black   flex items-center justify-center uppercase">
                          {selectedSchedule.teacher_name ? selectedSchedule.teacher_name[0] : 'T'}
                        </div>
                        <span className="font-extrabold text-slate-700 text-[18px] dark:text-[#c8d2df]">{selectedSchedule.teacher_name}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[12px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Time Slot</span>
                      <span className="font-bold text-slate-600 dark:text-[#cbd5e1] font-mono">
                        {selectedSchedule.start_time.slice(0, 5)} - {selectedSchedule.end_time.slice(0, 5)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[12px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Scheduled Date</span>
                      <span className="font-bold text-slate-600 dark:text-[#cbd5e1] font-mono">
                        {selectedSchedule.date ? selectedSchedule.date.slice(0, 10) : ''}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[12px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Session Status</span>
                      <div>{renderStatusBadge(selectedSchedule.status)}</div>
                    </div>

                    {selectedSchedule.actual_end_time && (
                      <div className="space-y-1">
                        <span className="text-[12px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Completed At</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {new Date(selectedSchedule.actual_end_time).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-[12px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Lesson Subtopic</span>
                      <span className="font-bold text-slate-600 dark:text-[#94a3b8]">
                        {selectedSchedule.lesson_sub_topic || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons for Admins / Staff */}
                  {!isTeacher && (
                    <div className="pt-6 border-t border-slate-100 dark:border-[#283548] flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEdit(selectedSchedule)}
                        className="flex-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg font-bold text-xs tracking-normal transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selectedSchedule.id)}
                        className="flex-1 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg font-bold text-xs tracking-normal transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* POPUP FORM DIALOG DIALOG OVERLAY (ONLY FOR ADMINS/STAFF) */}
      {showFormModal && !isTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-[#1e293b] rounded-2xl w-full max-w-2xl shadow-xl animate-in zoom-in duration-305 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-[#1e293b] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {editingId ? 'Edit Class Schedule' : 'Add New Class Schedule'}
                </h2>
                <p className="text-[10px] text-gray-400 dark:text-[#64748b] font-bold uppercase tracking-widest mt-1">Setup class time and unit</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-[#1e293b] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* School */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">School</label>
                  <select
                    required
                    disabled={isPrincipal}
                    value={formData.school_id}
                    onChange={e => handleSchoolChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Select School</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Teacher */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Teacher</label>
                  <select
                    required
                    value={formData.teacher_id}
                    onChange={e => setFormData(p => ({ ...p, teacher_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Grade */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Grade</label>
                  <select
                    required
                    disabled={!formData.school_id}
                    value={formData.grade_id}
                    onChange={e => handleGradeChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Grade</option>
                    {grades
                      .filter(g => !formData.school_id || g.school_id === formData.school_id)
                      .map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
                  </select>
                </div>

                {/* Division (Section) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">
                    Division <span className="normal-case font-normal text-gray-400 dark:text-[#64748b]">(optional)</span>
                  </label>
                  <select
                    disabled={!formData.school_id}
                    value={formData.section_id}
                    onChange={e => setFormData(p => ({ ...p, section_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">No Division</option>
                    {allSections
                      .filter(s => (!formData.school_id || s.school_id === formData.school_id) && (!formData.grade_id || s.grade_id === formData.grade_id))
                      .map(s => <option key={s.id} value={s.id}>{s.display_name || s.section_code}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Unit (Module) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">
                    Unit (Module) {curriculumLoading && <span className="text-[10px] text-indigo-500 lowercase font-medium animate-pulse">(loading...)</span>}
                  </label>
                  <select
                    disabled={!formData.school_id}
                    value={formData.module_id}
                    onChange={e => handleUnitChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Unit</option>
                    {availableUnits.map(m => <option key={m.id || m.Id} value={m.id || m.Id}>{m.name || m.Name || m.module_name}</option>)}
                  </select>
                </div>

                {/* Topic (Lesson) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">
                    Topic (Lesson) {curriculumLoading && <span className="text-[10px] text-indigo-500 lowercase font-medium animate-pulse">(loading...)</span>}
                  </label>
                  <select
                    disabled={!formData.school_id || !formData.module_id}
                    value={formData.lesson_id}
                    onChange={e => setFormData(p => ({ ...p, lesson_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Topic</option>
                    {availableTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all font-medium shadow-sm" />
                </div>
                {/* Start Time */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">Start Time</label>
                  <input type="time" required value={formData.start_time} onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all font-medium shadow-sm" />
                </div>
                {/* End Time */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider mb-2 ml-1">End Time</label>
                  <input type="time" required value={formData.end_time} onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] text-slate-800 dark:text-white rounded-lg text-sm outline-none focus:border-primary transition-all font-medium shadow-sm" />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-[#1e293b]">
                <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#1e293b] dark:hover:bg-[#334155] text-gray-600 dark:text-[#cbd5e1] rounded-lg font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-black text-xs shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal open={confirmState.open} title={confirmState.title ?? 'Confirm Action'} message={confirmState.message} confirmLabel={confirmState.confirmLabel} cancelLabel={confirmState.cancelLabel} variant={confirmState.variant} onConfirm={() => confirmState.resolve?.(true)} onCancel={() => confirmState.resolve?.(false)} />
    </div>
  );
};

export default TeacherScheduler;