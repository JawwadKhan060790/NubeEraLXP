import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, CheckCircle, PlusCircle, Check } from 'lucide-react';
import {
  createCertificate,
  bulkCreateCertificates,
  getTemplates,
  type CertificateTemplate,
} from '@/services/certificateService';
import api from '@/services/api';
import {
  DashboardPageShell,
  WelcomeBanner,
  DashboardWidgetCard,
} from '@/components/dashboard/DashboardKit';

const PROGRAM_TYPES = ['STEM', 'Regular', 'Honor', 'Co-Curricular', 'Excellence'];
const PERFORMANCE_LEVELS = ['Excellent', 'Good', 'Distinction', 'Merit', 'Satisfactory', 'Needs Improvement'];

const GenerateCertificate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Decide initial mode from URL pathname
  const initialMode = location.pathname.includes('/bulk') ? 'bulk' : 'single';
  const [mode, setMode] = useState<'single' | 'bulk'>(initialMode);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Dropdown list data
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [grades, setGrades] = useState<{ id: string; grade_name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; studentIdNumber: string }[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);

  // Selected state
  const [schoolId, setSchoolId] = useState(localStorage.getItem('nubeera_selected_school_id') || '');
  const [gradeId, setGradeId] = useState('');
  const [templateId, setTemplateId] = useState('');
  
  // Form fields
  const [courseName, setCourseName] = useState('');
  const [programType, setProgramType] = useState('STEM');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [percentage, setPercentage] = useState('');
  const [performanceLevel, setPerformanceLevel] = useState('');
  const [remarks, setRemarks] = useState('');

  // Signature customization fields
  const [principalName, setPrincipalName] = useState('');
  const [principalDesignation, setPrincipalDesignation] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [directorDesignation, setDirectorDesignation] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffDesignation, setStaffDesignation] = useState('');

  // Single mode selections
  const [studentId, setStudentId] = useState('');

  // Bulk mode selections
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Initial fetch: schools & templates
  useEffect(() => {
    api.get('/schools')
      .then(r => {
        const list = r.data ?? [];
        setSchools(list);
        if (!schoolId && list.length === 1) {
          setSchoolId(list[0].id);
        }
      })
      .catch(() => {});
    
    getTemplates()
      .then(t => setTemplates(t ?? []))
      .catch(() => {});
  }, []);

  // Fetch grades when school changes
  useEffect(() => {
    if (schoolId) {
      api.get(`/grades/by-school/${schoolId}`)
        .then(r => setGrades(r.data ?? []))
        .catch(() => {});
      
      // Filter templates by school if templates exist
      getTemplates(schoolId)
        .then(t => setTemplates(t ?? []))
        .catch(() => {});
    } else {
      setGrades([]);
      setStudents([]);
    }
    setGradeId('');
    setStudentId('');
    setSelectedStudentIds([]);
  }, [schoolId]);

  // Fetch students when grade changes
  useEffect(() => {
    if (gradeId && schoolId) {
      api.get('/students', { params: { schoolId, gradeId, pageSize: 200 } })
        .then(r => setStudents(r.data?.items ?? []))
        .catch(() => {});
    } else {
      setStudents([]);
    }
    setStudentId('');
    setSelectedStudentIds([]);
  }, [gradeId, schoolId]);

  // Fill in template default details when template changes
  useEffect(() => {
    if (templateId) {
      const selectedTpl = templates.find(t => t.id === templateId);
      if (selectedTpl) {
        setProgramType(selectedTpl.program_type || 'STEM');
        setPrincipalName(selectedTpl.default_principal_name || '');
        setPrincipalDesignation(selectedTpl.default_principal_designation || '');
        setDirectorName(selectedTpl.default_director_name || '');
        setDirectorDesignation(selectedTpl.default_director_designation || '');
        setStaffName(selectedTpl.default_staff_name || '');
        setStaffDesignation(selectedTpl.default_staff_designation || '');
      }
    }
  }, [templateId, templates]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSingleSubmit = async () => {
    if (!schoolId || !studentId || !courseName || !academicYear || !completionDate) {
      setError('Please fill in all required fields marked with *');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await createCertificate({
        student_id: studentId,
        school_id: schoolId,
        template_id: templateId || undefined,
        course_name: courseName,
        program_type: programType,
        academic_year: academicYear,
        completion_date: completionDate,
        percentage: percentage ? +percentage : undefined,
        performance_level: performanceLevel || undefined,
        remarks: remarks || undefined,
        principal_name: principalName || undefined,
        principal_designation: principalDesignation || undefined,
        director_name: directorName || undefined,
        director_designation: directorDesignation || undefined,
        staff_name: staffName || undefined,
        staff_designation: staffDesignation || undefined,
      });
      setSuccess('Certificate generated successfully!');
      setTimeout(() => navigate('/certificates/admin'), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to generate certificate.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!schoolId || !gradeId || selectedStudentIds.length === 0 || !courseName || !academicYear || !completionDate) {
      setError('Please select school, grade, at least one student, and all required course details.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await bulkCreateCertificates({
        student_ids: selectedStudentIds,
        school_id: schoolId,
        template_id: templateId || undefined,
        course_name: courseName,
        program_type: programType,
        academic_year: academicYear,
        completion_date: completionDate,
        performance_level: performanceLevel || undefined,
        remarks: remarks || undefined,
        principal_name: principalName || undefined,
        principal_designation: principalDesignation || undefined,
        director_name: directorName || undefined,
        director_designation: directorDesignation || undefined,
        staff_name: staffName || undefined,
        staff_designation: staffDesignation || undefined,
      });
      setSuccess(`Successfully generated ${selectedStudentIds.length} certificates!`);
      setTimeout(() => navigate('/certificates/admin'), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to generate certificates in bulk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardPageShell className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/certificates/admin')}
          className="p-2 border border-slate-200 dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#283548] transition-all text-slate-500 dark:text-[#94a3b8]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b] bg-slate-100 dark:bg-[#283548] px-2 py-0.5 rounded-full">Admin Operations</span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">Generate Certificates</h1>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-slate-100 dark:bg-[#283548] p-1 rounded-xl w-fit border border-slate-200 dark:border-[#334155]">
        {(['single', 'bulk'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              mode === m ? 'bg-white dark:bg-[#1e293b] text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {m === 'single' ? 'Single Student' : 'Bulk (Grade)'}
          </button>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-400/25 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-400/25 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Main card */}
      <DashboardWidgetCard>
        <div className="space-y-6">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b] border-b border-slate-100 dark:border-[#283548] pb-2">Target & Template Info</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* School */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">School campus *</label>
              <select
                value={schoolId}
                onChange={e => setSchoolId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-[#1e293b]"
              >
                <option value="">Select school…</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Certificate Template</label>
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-[#1e293b]"
              >
                <option value="">Select template (Optional)…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Grade Selector (for Bulk mode or student filtering) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">{mode === 'bulk' ? 'Grade level *' : 'Grade level'}</label>
              <select
                value={gradeId}
                onChange={e => setGradeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-[#1e293b]"
                disabled={!schoolId}
              >
                <option value="">Select grade…</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
              </select>
            </div>

            {/* Single Student Selector */}
            {mode === 'single' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Student *</label>
                <select
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-[#1e293b]"
                  disabled={!gradeId}
                >
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentIdNumber})</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Bulk Student Selector Checkboxes */}
          {mode === 'bulk' && gradeId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#283548] pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b]">Select Students *</h3>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {students.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-[#64748b] italic">No students found in this grade.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                  {students.map(s => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => toggleStudentSelection(s.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] text-slate-700 dark:text-[#e2e8f0] hover:bg-slate-50 dark:hover:bg-[#283548]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-[#64748b] truncate mt-0.5">{s.studentIdNumber}</p>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center shrink-0 ml-2">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Course & Academic Details */}
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b] border-b border-slate-100 dark:border-[#283548] pb-2 pt-2">Course & Certificate Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Course Name *</label>
              <input
                type="text"
                placeholder="e.g. Introduction to Robotics"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Program Type *</label>
              <select
                value={programType}
                onChange={e => setProgramType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-[#1e293b]"
              >
                {PROGRAM_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Academic Year *</label>
              <input
                type="text"
                placeholder="2025-2026"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Completion Date *</label>
              <input
                type="date"
                value={completionDate}
                onChange={e => setCompletionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {mode === 'single' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 92.5"
                  value={percentage}
                  onChange={e => setPercentage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Performance Level</label>
              <select
                value={performanceLevel}
                onChange={e => setPerformanceLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white dark:bg-[#1e293b]"
              >
                <option value="">Select Level (Optional)…</option>
                {PERFORMANCE_LEVELS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Remarks</label>
            <textarea
              rows={3}
              placeholder="Add details about the certificate criteria or student performance…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Signature Custimzation */}
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-[#64748b] border-b border-slate-100 dark:border-[#283548] pb-2 pt-2">Signatures & Custom Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Principal Name</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Principal Designation</label>
              <input
                type="text"
                value={principalDesignation}
                onChange={e => setPrincipalDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Director Name</label>
              <input
                type="text"
                value={directorName}
                onChange={e => setDirectorName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Director Designation</label>
              <input
                type="text"
                value={directorDesignation}
                onChange={e => setDirectorDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Staff Name</label>
              <input
                type="text"
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-[#cbd5e1] mb-1.5">Staff Designation</label>
              <input
                type="text"
                value={staffDesignation}
                onChange={e => setStaffDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#283548]">
            <button
              type="button"
              onClick={() => navigate('/certificates/admin')}
              className="px-5 py-2.5 border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-[#283548] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={mode === 'single' ? handleSingleSubmit : handleBulkSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Generating…' : mode === 'single' ? 'Generate Certificate' : 'Generate Certificates'}
            </button>
          </div>
        </div>
      </DashboardWidgetCard>
    </DashboardPageShell>
  );
};

export default GenerateCertificate;
