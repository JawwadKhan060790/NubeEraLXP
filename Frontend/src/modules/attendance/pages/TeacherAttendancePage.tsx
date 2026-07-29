import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar as CalendarIcon, Check, ClipboardList, Save, Search, UserCheck, Users, LayoutGrid, List, ChevronDown, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface TeacherAttendance {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  teacherId: string;
  teacherName: string;
}

interface School {
  id: string;
  name: string;
}

const TeacherAttendancePage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [teachers, setTeachers] = useState<TeacherAttendance[]>([]);
  
  const [schoolsLoading, setSchoolsLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId && selectedDate) {
      fetchTeachersAttendance();
    } else {
      setTeachers([]);
    }
  }, [selectedSchoolId, selectedDate]);

  const fetchSchools = async () => {
    try {
      setSchoolsLoading(true);
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
    } finally {
      setSchoolsLoading(false);
    }
  };

  const fetchTeachersAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance/teachers?date=${selectedDate}&schoolId=${selectedSchoolId}`);
      const rawTeachers = Array.isArray(response.data) ? response.data : (response.data.value || []);
      setTeachers(rawTeachers.map((t: any) => ({
        id: t.id || t.Id || '00000000-0000-0000-0000-000000000000',
        date: t.date || selectedDate,
        status: t.status || 'Present',
        remarks: t.remarks || null,
        teacherId: t.teacher_id || t.teacherId || t.TeacherId,
        teacherName: t.teacher_name || t.teacherName || t.TeacherName || 'Unknown Teacher'
      })));
    } catch (error) {
      console.error('Failed to fetch teachers attendance', error);
      toast.error('Failed to load teachers list.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendanceStatus = (teacherId: string) => {
    setTeachers(prev => prev.map(t => {
      if (t.teacherId === teacherId) {
        return {
          ...t,
          status: t.status === 'Present' ? 'Absent' : 'Present'
        };
      }
      return t;
    }));
  };

  const markAllAsPresent = () => {
    setTeachers(prev => prev.map(t => ({ ...t, status: 'Present' })));
    toast.success('Marked all teachers as Present');
  };

  const markAllAsAbsent = () => {
    setTeachers(prev => prev.map(t => ({ ...t, status: 'Absent' })));
    toast.success('Marked all teachers as Absent');
  };

  const saveAttendance = async () => {
    if (!selectedSchoolId) return;
    try {
      setSaving(true);
      const payload = teachers.map(t => ({
        id: t.id === '00000000-0000-0000-0000-000000000000' ? '00000000-0000-0000-0000-000000000000' : t.id,
        date: selectedDate,
        status: t.status,
        remarks: t.remarks,
        teacher_id: t.teacherId,
        teacher_name: t.teacherName,
        student_id: null
      }));

      await api.post('/attendance/teachers/save', payload, {
        headers: { 'X-School-Id': selectedSchoolId }
      });
      toast.success('Teacher attendance records saved successfully!');
      fetchTeachersAttendance();
    } catch (error) {
      console.error('Failed to save teacher attendance', error);
      toast.error('Failed to save teacher attendance records.');
    } finally {
      setSaving(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = teachers.filter(t => t.status === 'Present').length;
  const absentCount = teachers.filter(t => t.status === 'Absent').length;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary/95 to-primary text-white rounded-[10px] p-6 md:p-8 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-white text-emerald-950 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
            <ClipboardList className="w-3.5 h-3.5 text-emerald-600" /> Teacher Attendance Management
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Record Teacher Attendance</h1>
          <p className="text-xs md:text-sm text-emerald-50/95 font-medium max-w-xl">
            Select a school and date to record daily teacher attendance.
          </p>
        </div>
      </div>

      {/* Select Filters Panel */}
      <div className="bg-white border border-gray-200 rounded-[10px] p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-end">
          
          {/* School Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-gray-400" /> Select School
            </label>
            <div className="relative">
              <select
                value={selectedSchoolId}
                onChange={e => setSelectedSchoolId(e.target.value)}
                className="w-full px-4 pr-10 py-3 bg-white border border-gray-200 rounded-[4px] text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer shadow-sm"
                disabled={schoolsLoading}
              >
                <option value="">-- Choose School --</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Select Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-[4px] text-sm font-semibold outline-none focus:border-primary transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Bulk Action Buttons */}
          {selectedSchoolId && teachers.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={markAllAsPresent}
                className="flex-1 px-3 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-[4px] text-[10px] font-extrabold uppercase transition-all shadow-sm cursor-pointer"
              >
                Mark All Present
              </button>
              <button
                onClick={markAllAsAbsent}
                className="flex-1 px-3 py-3 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-[4px] text-[10px] font-extrabold uppercase transition-all shadow-sm cursor-pointer"
              >
                Clear / Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Teachers List */}
      {selectedSchoolId ? (
        <div className="bg-white border border-gray-200 rounded-[10px] shadow-sm overflow-hidden">
          {/* List Toolbar / Stats */}
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search teachers by name..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-[4px] text-xs outline-none focus:border-primary transition-all font-medium shadow-sm"
                />
              </div>

              {/* Grid / List View Toggle Switch */}
              <div className="flex items-center bg-gray-100 border border-gray-200 rounded-[4px] p-0.5 shadow-sm self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-400 hover:text-slate-600'
                  }`}
                  title="Grid Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-[4px] transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-400 hover:text-slate-600'
                  }`}
                  title="List Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {teachers.length > 0 && (
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-[4px] border border-emerald-100">
                  <UserCheck className="w-3.5 h-3.5" /> Present: {presentCount}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-[4px] border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5" /> Absent: {absentCount}
                </span>
              </div>
            )}
          </div>

          {/* Teacher Grid / List */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Loading teacher attendance...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider">No Teachers Registered</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium">
                Ensure teachers are registered under this school within the settings.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTeachers.map((t) => {
                  const isPresent = t.status === 'Present';
                  return (
                    <div
                      key={t.teacherId}
                      onClick={() => toggleAttendanceStatus(t.teacherId)}
                      className={`p-4 rounded-[10px] border transition-all cursor-pointer flex items-center justify-between gap-4 select-none hover:shadow-md active:scale-98 relative overflow-hidden group ${
                        isPresent
                          ? 'bg-emerald-50/40 border-emerald-500/70 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {isPresent && <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />}
                      
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs uppercase tracking-wider transition-colors shadow-sm ${
                          isPresent 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.teacherName.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase group-hover:text-primary transition-colors">{t.teacherName}</h4>
                          <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest border ${
                            isPresent 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAttendanceStatus(t.teacherId);
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isPresent
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-105'
                            : 'bg-slate-50 border border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200'
                        }`}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Action Save Button */}
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={saving}
                  className="px-5 py-3 bg-primary text-white rounded-[4px] text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-75 cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Attendance Sheet
                </button>
              </div>
            </div>
          ) : (
            /* LIST VIEW TABLE */
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="px-6 py-4">Teacher Full Name</th>
                      <th>Date</th>
                      <th>Status Badge</th>
                      <th className="text-right px-6 py-4">Action Switch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((t) => {
                      const isPresent = t.status === 'Present';
                      return (
                        <tr key={t.teacherId} onClick={() => toggleAttendanceStatus(t.teacherId)} className="group cursor-pointer hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-black uppercase tracking-wider transition-colors shadow-sm ${
                                isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {t.teacherName.charAt(0)}
                              </div>
                              <span className="text-sm font-extrabold text-slate-900 group-hover:text-primary transition-colors">{t.teacherName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-500 font-mono">
                            {selectedDate}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest border ${
                              isPresent 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => toggleAttendanceStatus(t.teacherId)}
                                className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  isPresent
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/15'
                                    : 'bg-slate-50 border border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Save Button */}
              <div className="p-6 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={saving}
                  className="px-5 py-3 bg-primary text-white rounded-[4px] text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-75 cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Attendance Sheet
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 border-dashed rounded-[10px] p-16 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-primary/75">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">Select School to Begin</h3>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-sm mx-auto font-medium">
            Choose a school from the filters above to list teachers and record attendance.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendancePage;
