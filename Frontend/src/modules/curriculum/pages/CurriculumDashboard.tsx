/**
 * School Curriculum Dashboard (Admin/Staff only) — Requirement 7.3.
 *
 * Pick a School, see at a glance how much curriculum is assigned to it, how
 * many teachers/students sit under it, and when curriculum was last touched.
 * Read-only — all mutation happens on the Curriculum Assignment screen.
 */

import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock,
  GraduationCap,
  Layers,
  School as SchoolIcon,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import StatGrid, { type StatItem } from '@/components/StatGrid';
import { ROUTES } from '@/constants/routes';
import { schoolCurriculumService } from '@/services/schoolCurriculumService';
import { schoolService } from '@/services/schoolService';

import type { SchoolCurriculumDashboard } from '@/types/curriculum.types';
import type { School } from '@/types/school.types';

const CurriculumDashboard: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [dashboard, setDashboard] = useState<SchoolCurriculumDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setSchoolsLoading(true);
      try {
        const data = await schoolService.getSchools();
        setSchools(data);
        if (data.length > 0) setSelectedSchoolId(data[0].id);
      } catch (e) {
        console.error('Failed to fetch schools', e);
        toast.error('Failed to load schools');
      } finally {
        setSchoolsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) {
      setDashboard(null);
      return;
    }
    (async () => {
      setDashboardLoading(true);
      try {
        const data = await schoolCurriculumService.getDashboard(selectedSchoolId);
        setDashboard(data);
      } catch (e) {
        console.error('Failed to fetch curriculum dashboard', e);
        toast.error('Failed to load curriculum dashboard for this school');
        setDashboard(null);
      } finally {
        setDashboardLoading(false);
      }
    })();
  }, [selectedSchoolId]);

  const stats: StatItem[] = dashboard ? [
    { title: 'Assigned Units', value: dashboard.assigned_unit_count, icon: <Layers className="w-6 h-6" />, color: 'indigo', subtitle: 'Curriculum units in scope' },
    { title: 'Assigned Topics', value: dashboard.assigned_topic_count, icon: <BookOpen className="w-6 h-6" />, color: 'violet', subtitle: 'Topics in scope' },
    { title: 'Teachers', value: dashboard.teacher_count, icon: <Users className="w-6 h-6" />, color: 'emerald', subtitle: 'Faculty covering this curriculum' },
    { title: 'Students', value: dashboard.student_count, icon: <GraduationCap className="w-6 h-6" />, color: 'sky', subtitle: 'Learners under this curriculum' },
  ] : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Curriculum Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Per-School Curriculum Visibility Overview
          </p>
        </div>
        <Link
          to={ROUTES.CURRICULUM_ASSIGNMENT}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
        >
          Manage Assignments <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-4">
        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">School</label>
        <div className="relative max-w-md">
          
          <select
            disabled={schoolsLoading}
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white"
          >
            {schoolsLoading && <option className="text-slate-800 dark:text-white">Loading schools...</option>}
            {!schoolsLoading && schools.length === 0 && <option className="text-slate-800 dark:text-white">No schools found</option>}
            {schools.map((s) => <option key={s.id} value={s.id} className="text-slate-800 dark:text-white">{s.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {!selectedSchoolId ? (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-12 text-center">
          <p className="text-sm font-bold text-slate-400 dark:text-[#64748b]">Select a school to view its curriculum dashboard.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatGrid stats={stats} loading={dashboardLoading} />
          </div>

          {dashboard && (
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 flex-shrink-0">
                  <SchoolIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-base font-black text-slate-800 dark:text-white">{dashboard.school_name}</p>
                  <p className="text-[11px] text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Last assignment activity: {dashboard.last_assignment_date ? new Date(dashboard.last_assignment_date).toLocaleString() : 'No activity yet'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CurriculumDashboard;
