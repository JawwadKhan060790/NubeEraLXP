import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DatabaseBackup,
  FileText,
  GraduationCap,
  Headphones,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MonitorPlay,
  Network,
  Package,
  PieChart,
  School as SchoolIcon,
  Settings2,
  ShoppingBag,
  Trash2,
  UserCheck,
  Users,
  X,
  Zap
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import logoVeri from '../assets/logoveri.png';
import type { UserRole } from '../types/index';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

// ─── Group definitions per role ────────────────────────────────────────────────
const adminGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Institution',
    icon: Building2,
    items: [
      { to: '/schools', icon: SchoolIcon, label: 'Schools' },
      { to: '/data-import', icon: DatabaseBackup, label: 'Data Import' },
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/teachers', icon: UserCheck, label: 'Teachers' },
      { to: '/students', icon: GraduationCap, label: 'Students' },
      { to: '/grades', icon: BookMarked, label: 'Grades' },
      { to: '/grade-sections', icon: Layers, label: 'Divisions' },
    ],
  },
  {
    label: 'Curriculum Management',
    icon: ListChecks,
    items: [
      { to: '/admin/curriculum-assignment', icon: ListChecks, label: 'Curriculum Assignment' },
      { to: '/admin/curriculum-dashboard', icon: PieChart, label: 'Curriculum Dashboard' },
      { to: '/admin/teacher-school-assignment', icon: Network, label: 'Teacher-School Access' },
    ],
  },
  {
    label: 'Academics',
    icon: BookOpen,
    items: [
      { to: '/subjects', icon: BookOpen, label: 'Subjects' },
      { to: '/modules', icon: Layers, label: 'Units' },
      { to: '/lessons', icon: MonitorPlay, label: 'Topics' },
      { to: '/exams', icon: FileText, label: 'MCQ' },
      { to: '/attendance', icon: ClipboardList, label: 'Attendance' },
      { to: '/admin/doubt-hub', icon: HelpCircle, label: 'Doubt Hub' },
    ],
  },
  {
    label: 'E-Commerce',
    icon: Package,
    items: [
      { to: '/shop/admin', icon: Settings2, label: 'Manage Shop' },
      { to: '/shop', icon: ShoppingBag, label: 'STEM Lab Items' },
    ],
  },
  {
    label: 'Engagement',
    icon: Zap,
    items: [
      { to: '/events', icon: Calendar, label: 'School Events' },
      { to: '/admissions/registrations', icon: GraduationCap, label: 'Registrations' },
    ],
  },
  {
    label: 'Support',
    icon: Headphones,
    items: [
      { to: '/support/tickets', icon: LifeBuoy, label: 'Support & Tickets' },
    ],
  },
  // {
  //   label: 'Certificates',
  //   icon: Award,
  //   items: [
  //     { to: '/certificates/admin', icon: Award, label: 'All Certificates' },
  //   ],
  // },
  // {
  //   label: 'Report Cards',
  //   icon: ClipboardCheck,
  //   items: [
  //     { to: '/report-cards/admin',    icon: ClipboardCheck, label: 'All Report Cards' },
  //     { to: '/report-cards/generate', icon: FileText,       label: 'Generate'         },
  //   ],
  // },
  {
    label: 'Settings',
    icon: Settings2,
    items: [
      { to: '/admin/settings', icon: Settings2, label: 'Settings' },
      { to: '/admin/backup-restore', icon: DatabaseBackup, label: 'Backup & Restore' },
      { to: '/admin/recycle-bin', icon: Trash2, label: 'Recycle Bin' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
];

const staffGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Institution',
    icon: Building2,
    items: [
      { to: '/staff/schools/', icon: SchoolIcon, label: 'Schools' },
      { to: '/data-import', icon: DatabaseBackup, label: 'Data Import' },
      { to: '/teachers', icon: UserCheck, label: 'Teachers' },
      { to: '/students', icon: GraduationCap, label: 'Students' },
      { to: '/staff/grades/', icon: BookMarked, label: 'Grades' },
      { to: '/staff/grade-sections/', icon: Layers, label: 'Divisions' },
    ],
  },
  {
    label: 'Curriculum Management',
    icon: ListChecks,
    items: [
      { to: '/admin/curriculum-assignment', icon: ListChecks, label: 'Curriculum Assignment' },
      { to: '/admin/curriculum-dashboard', icon: PieChart, label: 'Curriculum Dashboard' },
      { to: '/admin/teacher-school-assignment', icon: Network, label: 'Teacher-School Access' },
    ],
  },
  {
    label: 'Academics',
    icon: BookOpen,
    items: [
      { to: '/subjects', icon: BookOpen, label: 'Subjects' },
      { to: '/staff/modules/', icon: Layers, label: 'Units' },
      { to: '/staff/lessons/', icon: MonitorPlay, label: 'Topics' },
      { to: '/staff/exams/', icon: FileText, label: 'MCQ' },
      { to: '/staff/scheduler', icon: Calendar, label: 'Teacher Schedule' },
      { to: '/attendance', icon: ClipboardList, label: 'Attendance' },
      { to: '/admin/doubt-hub', icon: HelpCircle, label: 'Doubt Hub' },
    ],
  },
  {
    label: 'E-Commerce',
    icon: Package,
    items: [
      { to: '/shop/admin', icon: Settings2, label: 'Manage Shop' },
      { to: '/shop', icon: ShoppingBag, label: 'STEM Lab Items' },
    ],
  },
  {
    label: 'Engagement',
    icon: Zap,
    items: [
      { to: '/events', icon: Calendar, label: 'School Events' },
      { to: '/admissions/registrations', icon: GraduationCap, label: 'Registrations' },
    ],
  },
  // {
  //   label: 'Certificates',
  //   icon: Award,
  //   items: [
  //     { to: '/certificates/admin', icon: Award, label: 'Certificates' },
  //   ],
  // },
  // {
  //   label: 'Report Cards',
  //   icon: ClipboardCheck,
  //   items: [
  //     { to: '/report-cards/admin', icon: ClipboardCheck, label: 'Report Cards' },
  //   ],
  // },
  {
    label: 'Support',
    icon: Headphones,
    items: [
      { to: '/support/tickets', icon: LifeBuoy, label: 'Support & Tickets' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
];

const principalGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/principal/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'School',
    icon: Building2,
    items: [
      { to: '/students', icon: GraduationCap, label: 'Students' },
      { to: '/attendance', icon: ClipboardList, label: 'Attendance' },
    ],
  },
  {
    label: 'Engagement',
    icon: Zap,
    items: [
      { to: '/events', icon: Calendar, label: 'School Events' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
];

const teacherGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Classroom',
    icon: BookOpen,
    items: [
      { to: '/teacher/student-list', icon: Users, label: 'Students' },
      { to: '/subjects', icon: BookOpen, label: 'Subjects' },
      { to: '/modules', icon: Layers, label: 'Units' },
      { to: '/lessons', icon: MonitorPlay, label: 'Topics' },
      { to: '/teacher/exams/', icon: FileText, label: 'MCQ Exams' },
      { to: '/teacher/teaching-path', icon: BookOpenCheck, label: 'Teaching Path' },
      { to: '/teacher/doubt-hub', icon: HelpCircle, label: 'Doubt Hub' },
    ],
  },
  {
    label: 'Schedule & Attendance',
    icon: Calendar,
    items: [
      { to: '/teacher/schedule-calendar', icon: Calendar, label: 'Period Calendar' },
      { to: '/teacher/teacher-calender', icon: Calendar, label: 'My Schedule' },
      { to: '/teacher/attendance', icon: ClipboardList, label: 'Attendance' },
    ],
  },
  {
    label: 'Progress',
    icon: Users,
    items: [
      { to: '/teacher/grade-students', icon: GraduationCap, label: 'Grade Students' },
      { to: '/teacher/student-weakness', icon: AlertTriangle, label: 'Weakness Analysis' },
    ],
  },
  {
    label: 'Support',
    icon: Headphones,
    items: [
      { to: '/support/tickets', icon: LifeBuoy, label: 'Support & Tickets' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
];

const studentGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/student/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
      { to: '/student/calendar', icon: Calendar, label: 'My Calendar' },
      { to: '/student/learning', icon: BookOpen, label: 'Study Materials' },
      { to: '/student/doubt-hub', icon: HelpCircle, label: 'Doubt Hub' },
    ],
  },
  {
    label: 'E-Commerce',
    icon: Package,
    items: [
      { to: '/shop', icon: ShoppingBag, label: 'STEM Lab Items' },
      { to: '/shop/orders', icon: ClipboardList, label: 'My Orders' },
    ],
  },
  // {
  //   label: 'Certificates',
  //   icon: Award,
  //   items: [
  //     { to: '/certificates/my', icon: Award, label: 'My Certificates' },
  //   ],
  // },
  // {
  //   label: 'Report Cards',
  //   icon: ClipboardCheck,
  //   items: [
  //     { to: '/report-cards/my', icon: ClipboardCheck, label: 'My Report Cards' },
  //   ],
  // },
  {
    label: 'Engagement',
    icon: Zap,
    items: [
      { to: '/events', icon: Calendar, label: 'School Events' },
    ],
  },
  {
    label: 'Support',
    icon: Headphones,
    items: [
      { to: '/support/tickets', icon: LifeBuoy, label: 'Support & Tickets' },
    ],
  },
];

const parentGroups: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/parent/dashboard', icon: LayoutDashboard, label: 'My Children' },
    ],
  },
  {
    label: 'E-Commerce',
    icon: Package,
    items: [
      { to: '/shop', icon: ShoppingBag, label: 'STEM Lab Items' },
      { to: '/shop/orders', icon: ClipboardList, label: 'My Orders' },
    ],
  },
  // {
  //   label: 'Certificates',
  //   icon: Award,
  //   items: [
  //     { to: '/certificates/my', icon: Award, label: "Children's Certificates" },
  //   ],
  // },
  // {
  //   label: 'Report Cards',
  //   icon: ClipboardCheck,
  //   items: [
  //     { to: '/report-cards/child', icon: ClipboardCheck, label: "Children's Progress Reports" },
  //   ],
  // },
  {
    label: 'Engagement',
    icon: Zap,
    items: [
      { to: '/events', icon: Calendar, label: 'School Events' },
    ],
  },
  {
    label: 'Support',
    icon: Headphones,
    items: [
      { to: '/support/tickets', icon: LifeBuoy, label: 'Support & Tickets' },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({
  role,
  isOpen,
  setIsOpen,
  width = 288,
  onWidthChange,
  isCollapsed,
  setIsCollapsed,
}) => {
  const location = useLocation();

  const groups: NavGroup[] = useMemo(() => {
    if (role === 'admin' || role === 'superadmin') return adminGroups;
    if (role === 'staff') return staffGroups;
    if (role === 'principal') return principalGroups;
    if (role === 'teacher') return teacherGroups;
    if (role === 'student') return studentGroups;
    if (role === 'parent') return parentGroups;
    return adminGroups;
  }, [role]);

  // Determine which groups contain the current active route (open by default)
  const initialOpen = useMemo(() => {
    const open: Record<string, boolean> = {};
    groups.forEach((g) => {
      const hasActive = g.items.some((item) => {
        const [p] = item.to.split('?');
        return location.pathname === p || location.pathname.startsWith(p + '/');
      });
      open[g.label] = hasActive || g.label === 'Overview';
    });
    return open;
  }, [groups, location.pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const isItemActive = (to: string) => {
    const [p] = to.split('?');
    // Exact match only — prevents /shop matching /shop/admin etc.
    const clean = p.replace(/\/$/, '');
    return location.pathname === clean || location.pathname === clean + '/';
  };

  const roleLabel: Record<string, string> = {
    admin: 'Admin Area',
    superadmin: 'Super Admin',
    principal: 'Principal',
    staff: 'Staff Area',
    teacher: 'Teacher Area',
    student: 'Student Area',
    parent: 'Parent Area',
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[45] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        id="main-sidebar"
        style={{ width: window.innerWidth >= 1024 ? (isCollapsed ? '72px' : `${width}px`) : undefined }}
        className={`
          bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-[#334155] h-screen fixed top-0 flex flex-col z-50
          transition-all duration-300 shadow-[4px_0_24px_rgba(15,30,60,0.08)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.3)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${isCollapsed ? 'w-[72px]' : 'w-72'}
        `}
      >
        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-violet-400/40 active:bg-violet-500 transition-colors z-[60] hidden lg:block"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = width;
              const onMove = (mv: MouseEvent) => {
                const nw = startW + (mv.clientX - startX);
                if (nw >= 240 && nw <= 450) onWidthChange?.(nw);
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = 'default';
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
              document.body.style.cursor = 'col-resize';
            }}
          />
        )}

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-full flex items-center justify-center shadow-md z-[70] hidden lg:flex text-slate-500 dark:text-[#94a3b8] hover:text-violet-600 hover:border-violet-300 transition-all cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Logo */}
        <div className={`h-[64px] flex items-center border-b border-slate-200 dark:border-[#334155] flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-5 justify-between'}`}>
          <div className="flex items-center">
            <img
              src={logoVeri}
              alt="NubeEra Logo"
              className={`object-contain transition-all duration-300 ${isCollapsed ? 'h-8 w-8' : 'h-10'}`}
            />
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-500 dark:text-[#94a3b8] hover:text-rose-600 transition-all p-1.5 rounded-lg">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className={`py-3 transition-all duration-300 ${isCollapsed ? 'flex justify-center px-2' : 'px-4'}`}>
          <div className={`inline-flex items-center bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/15 rounded-lg border border-violet-200/70 dark:border-violet-400/25 transition-all ${isCollapsed ? 'p-1.5' : 'gap-2 px-3 py-1.5 w-full'}`}>
            <div className="w-2 h-2 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.7)] animate-pulse flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-[11.5px] font-semibold text-violet-700 dark:text-violet-300 leading-none truncate">
                {roleLabel[role] || 'Area'}
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto no-scrollbar pb-8 transition-all duration-300 ${isCollapsed ? 'px-2 space-y-1' : 'px-3 space-y-0.5'}`}>

          {isCollapsed ? (
            /* COLLAPSED: just icons with tooltips */
            groups.flatMap((g) =>
              g.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeOnMobile}
                    className={`
                      relative flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 group
                      ${active
                        ? 'bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20 border border-violet-300/60 dark:border-violet-400/35 shadow-sm'
                        : 'hover:bg-violet-50/60 dark:hover:bg-violet-500/10 border border-transparent hover:border-violet-200/40 dark:hover:border-violet-400/20'
                      }
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] transition-colors ${active ? 'text-violet-600 dark:text-violet-300' : 'text-slate-500 dark:text-[#94a3b8] group-hover:text-violet-500 dark:group-hover:text-violet-400'}`} />
                    {/* Tooltip */}
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-xl pointer-events-none">
                      {item.label}
                      <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 rotate-45" />
                    </div>
                  </NavLink>
                );
              })
            )
          ) : (
            /* EXPANDED: grouped submenus */
            groups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupOpen = openGroups[group.label] ?? false;
              const hasActiveChild = group.items.some((i) => isItemActive(i.to));

              return (
                <div key={group.label} className="mb-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group
                      ${hasActiveChild
                        ? 'bg-violet-50/40 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                        : 'text-slate-500 dark:text-[#94a3b8] hover:bg-slate-50 dark:hover:bg-[#283548] hover:text-slate-700 dark:hover:text-[#e2e8f0]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-[28px] h-[28px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${hasActiveChild ? 'bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-500 dark:to-purple-500 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/40' : 'bg-slate-100 dark:bg-[#283548] text-slate-500 dark:text-[#94a3b8] group-hover:bg-violet-50 dark:group-hover:bg-violet-500/15 group-hover:text-violet-500 dark:group-hover:text-violet-400'}`}>
                        <GroupIcon className="w-[14px] h-[14px]" />
                      </div>
                      <span className={`text-[13px] font-semibold transition-colors ${hasActiveChild ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-[#cbd5e1] group-hover:text-slate-800 dark:group-hover:text-white'}`}>
                        {group.label}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${isGroupOpen ? 'rotate-180' : ''} ${hasActiveChild ? 'text-violet-500 dark:text-violet-400' : 'text-slate-400 dark:text-[#64748b]'}`}
                    />
                  </button>

                  {/* Group Items */}
                  {isGroupOpen && (
                    <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-100 dark:border-[#283548] space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isItemActive(item.to);
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={closeOnMobile}
                            className={`
                              relative flex items-center gap-3 px-3 py-[9px] rounded-xl transition-all duration-200 group
                              ${active
                                ? 'bg-gradient-to-r from-violet-100/80 via-purple-50 to-violet-50/60 dark:from-violet-500/20 dark:via-purple-500/12 dark:to-violet-500/10 border border-violet-200/80 dark:border-violet-400/30 text-violet-700 dark:text-violet-300 shadow-sm'
                                : 'text-slate-600 dark:text-[#cbd5e1] hover:bg-violet-50/50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 border border-transparent hover:border-violet-100/60 dark:hover:border-violet-400/20'
                              }
                            `}
                          >
                            {/* Active left accent bar */}
                            {active && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-violet-500 to-purple-600 dark:from-violet-400 dark:to-purple-400 rounded-r-full shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
                            )}
                            <Icon className={`w-[15px] h-[15px] flex-shrink-0 transition-colors ${active ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-[#64748b] group-hover:text-violet-500 dark:group-hover:text-violet-400'}`} />
                            <span className={`text-[13.5px] transition-all truncate leading-snug ${active ? 'text-violet-700 dark:text-violet-300 font-semibold' : 'text-slate-700 dark:text-[#e2e8f0] font-medium group-hover:text-violet-700 dark:group-hover:text-violet-300'}`}>
                              {item.label}
                            </span>
                            {active && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)] flex-shrink-0" />
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </aside>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: block; width: 3px; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.4); border-radius: 999px; }
      `}</style>
    </>
  );
};

export default Sidebar;
