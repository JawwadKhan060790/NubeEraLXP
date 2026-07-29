import { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, Calendar, User, Phone, Mail, MapPin, 
  ChevronDown, Check, X, ShieldAlert, Award, FileText, ChevronRight, Eye, RefreshCw, Key
} from 'lucide-react';
import api from '@/services/api';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface WebsiteRegistration {
  id: string;
  created_at: string;
  student_full_name: string;
  mobile_number: string;
  email_address: string | null;
  city: string | null;
  grade_interested_in: string | null;
  interested_program: string;
  parent_name: string;
  parent_mobile_number: string;
  message: string | null;
  consent: boolean;
  status: 'New' | 'Contacted' | 'Converted' | 'Rejected';
}

interface Grade {
  id: string;
  grade_level: string;
  grade_name: string;
  school_id?: string;
  school_name?: string;
  is_active: boolean;
}

interface SchoolOption {
  id: string;
  name: string;
  from_grade?: number;
  to_grade?: number;
}

const PROGRAMS = [
  'All',
  'Robotics Training',
  'AI & Coding',
  'Drone Technology',
  '3D Printing',
  'IoT & Electronics',
  'STEM Lab Setup',
];

const STATUSES = ['All', 'New', 'Contacted', 'Converted', 'Rejected'];

const WebsiteRegistrations: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<WebsiteRegistration[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [program, setProgram] = useState('All');

  // Selection
  const [selectedLead, setSelectedLead] = useState<WebsiteRegistration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Conversion Promotion Modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  // Conversion Form
  const [convSchoolId, setConvSchoolId] = useState('');
  const [convGradeId, setConvGradeId] = useState('');
  const [convStudentId, setConvStudentId] = useState('');
  const [convRollNo, setConvRollNo] = useState('');
  const [convPassword, setConvPassword] = useState('');
  const [convParentPassword, setConvParentPassword] = useState('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [page, status, program, pageSize]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/website-registrations', {
        params: {
          search: search || undefined,
          status: status !== 'All' ? status : undefined,
          program: program !== 'All' ? program : undefined,
          page,
          pageSize,
        },
      });
      setRegistrations(resp.data.items);
      setTotalItems(resp.data.total_items);
      setTotalPages(resp.data.total_pages);
    } catch (err: any) {
      toast.error('Failed to load registrations queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  const updateLeadStatus = async (lead: WebsiteRegistration, newStatus: string) => {
    try {
      await api.put(`/website-registrations/${lead.id}`, {
        ...lead,
        status: newStatus,
      });
      toast.success(`Lead status updated to ${newStatus}`);
      fetchRegistrations();
      if (selectedLead?.id === lead.id) {
        setSelectedLead({ ...lead, status: newStatus as any });
      }
    } catch (err: any) {
      toast.error('Failed to update lead status.');
    }
  };

  const fetchGrades = async () => {
    setGradesLoading(true);
    try {
      const [gradesResp, schoolsResp] = await Promise.allSettled([
        api.get('/grades'),
        api.get('/schools'),
      ]);
      if (gradesResp.status === 'fulfilled') {
        setGrades(gradesResp.value.data);
      }
      if (schoolsResp.status === 'fulfilled') {
        setSchools(schoolsResp.value.data);
      }
    } catch (err: any) {
      toast.error('Failed to load grades divisions.');
    } finally {
      setGradesLoading(false);
    }
  };

  // Grade options narrowed to a given school: matching school_id, then narrowed
  // further by the school's configured grade range (falls back to 1-10).
  const gradesForSchool = (schoolId: string): Grade[] => {
    const schoolAllGrades = grades.filter(g => !schoolId || g.school_id === schoolId);
    if (!schoolId) return schoolAllGrades;
    const selectedSchool = schools.find(s => s.id === schoolId);
    if (!selectedSchool) return schoolAllGrades;
    const fromGrade = selectedSchool.from_grade !== undefined && selectedSchool.from_grade !== null ? selectedSchool.from_grade : -1;
    const toGrade = selectedSchool.to_grade !== undefined && selectedSchool.to_grade !== null ? selectedSchool.to_grade : 10;
    return schoolAllGrades.filter(g => {
      const lvl = parseInt(g.grade_level, 10);
      if (isNaN(lvl)) return true;
      return lvl >= fromGrade && lvl <= toGrade;
    });
  };

  const openConvertModal = (lead: WebsiteRegistration) => {
    setSelectedLead(lead);
    setShowDetailModal(false);
    setConvSchoolId(user?.school_id || '');
    setConvGradeId('');
    fetchGrades();

    // Auto generate fields
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setConvStudentId(`VT-${randomSuffix}`);
    setConvRollNo(`R-${randomSuffix}`);
    setConvPassword(`VTStudent@${Math.floor(100 + Math.random() * 900)}`);
    setConvParentPassword(lead.parent_mobile_number || `VTParent@${randomSuffix}`);

    setShowConvertModal(true);
  };

  const generateNewPasswords = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setConvPassword(`VTStudent@${randomSuffix}`);
    if (selectedLead) {
      setConvParentPassword(selectedLead.parent_mobile_number || `VTParent@${randomSuffix}`);
    }
    toast.success('Regenerated credentials');
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!convGradeId) return toast.error('Please assign a Target Grade.');
    if (!convStudentId.trim()) return toast.error('Student registration number is required.');
    if (!convPassword.trim()) return toast.error('Student password is required.');

    setConverting(true);
    try {
      await api.post(`/website-registrations/${selectedLead.id}/convert`, {
        gradeId: convGradeId,
        studentId: convStudentId.trim(),
        rollNo: convRollNo.trim() || null,
        password: convPassword.trim(),
        parentPassword: convParentPassword.trim() || null,
      });

      toast.success('B2C Lead successfully promoted and student profile generated!');
      setShowConvertModal(false);
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lead promotion failed.');
    } finally {
      setConverting(false);
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'New': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'Contacted': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50';
      case 'Converted': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'Rejected': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900/50';
      default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-[#283548] dark:text-[#cbd5e1] dark:border-[#334155]';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Website Registrations</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            {totalItems} Website B2C Admissions Leads Logged
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students, parents, email or phone..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-800 dark:text-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#64748b]">Status:</span>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl outline-none cursor-pointer text-slate-800 dark:text-white"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Program filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#64748b]">Track:</span>
            <div className="relative">
              <select
                value={program}
                onChange={(e) => { setProgram(e.target.value); setPage(1); }}
                className="pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl outline-none cursor-pointer text-slate-800 dark:text-white"
              >
                {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => { setSearch(''); setStatus('All'); setProgram('All'); setPage(1); fetchRegistrations(); }}
            className="px-3.5 py-2 text-xs font-bold text-gray-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#e2e8f0] uppercase tracking-wider transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Grid list / Table */}
      <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 dark:text-[#64748b] gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-extrabold uppercase tracking-widest">Querying admissions queue...</span>
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-20 text-center text-gray-400 dark:text-[#64748b] space-y-2">
            <GraduationCap className="w-12 h-12 text-gray-300 dark:text-[#475569] mx-auto" />
            <p className="text-xs font-extrabold uppercase tracking-widest">No B2C registration leads found</p>
            <p className="text-[11px] text-gray-400 dark:text-[#64748b] font-medium">Verify your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#334155] bg-slate-50 dark:bg-[#0f172a]/50">
                  <th className="p-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#94a3b8] tracking-wider">Date</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#94a3b8] tracking-wider">Student Details</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#94a3b8] tracking-wider">Parent/Guardian</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#94a3b8] tracking-wider">Program Interest</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#94a3b8] tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase text-gray-500 dark:text-[#94a3b8] tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]/50">
                {registrations.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0f172a]/10 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-[#cbd5e1]">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-white uppercase">{lead.student_full_name}</div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-400 dark:text-[#64748b] font-medium">
                          <span>{lead.mobile_number}</span>
                          {lead.email_address && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[150px]">{lead.email_address}</span>
                            </>
                          )}
                          {lead.city && (
                            <>
                              <span>·</span>
                              <span>{lead.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-700 dark:text-[#cbd5e1]">{lead.parent_name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-[#64748b] font-semibold">{lead.parent_mobile_number}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-primary dark:text-cyan-400">{lead.interested_program}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{lead.grade_interested_in || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusBadgeClass(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedLead(lead); setShowDetailModal(true); }}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-[#334155] rounded-lg text-gray-500 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {lead.status !== 'Converted' && (
                          <button
                            onClick={() => openConvertModal(lead)}
                            className="bg-primary text-white px-3 py-1.5 rounded-lg font-extrabold uppercase tracking-widest text-[9px] hover:bg-primary/90 transition-all shadow-sm"
                          >
                            Promote
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>

      {/* Lead Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-150 dark:border-[#334155]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#334155]/80 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-805 dark:text-white uppercase tracking-tight leading-none">Admission Lead Detail</h2>
                <div className="text-[9px] text-gray-400 dark:text-[#64748b] font-bold uppercase tracking-wider mt-1.5">Submitted: {new Date(selectedLead.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#334155] hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Status and Action options */}
              <div className="p-4 bg-slate-50 dark:bg-[#0f172a]/40 rounded-2xl border border-gray-100 dark:border-[#334155]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#64748b]">Current Status:</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusBadgeClass(selectedLead.status)}`}>
                    {selectedLead.status}
                  </span>
                </div>

                {selectedLead.status !== 'Converted' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 dark:text-[#64748b]">Mark as:</span>
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => updateLeadStatus(selectedLead, 'Contacted')}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-blue-200 dark:border-blue-900/50 uppercase"
                      >
                        Contacted
                      </button>
                      <button
                        onClick={() => updateLeadStatus(selectedLead, 'Rejected')}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 text-[10px] font-bold rounded-lg border border-rose-200 dark:border-rose-900/50 uppercase"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Form columns */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">Student Name</div>
                  <div className="font-bold text-slate-800 dark:text-white uppercase">{selectedLead.student_full_name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">Mobile Number</div>
                  <div className="font-semibold text-slate-700 dark:text-[#cbd5e1]">{selectedLead.mobile_number}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">Email Address</div>
                  <div className="font-semibold text-slate-700 dark:text-[#cbd5e1]">{selectedLead.email_address || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">City</div>
                  <div className="font-semibold text-slate-700 dark:text-[#cbd5e1]">{selectedLead.city || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">Grade Level Interest</div>
                  <div className="font-bold text-slate-700 dark:text-[#cbd5e1] uppercase">{selectedLead.grade_interested_in || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">STEM Program Track</div>
                  <div className="font-bold text-primary dark:text-cyan-400">{selectedLead.interested_program}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">Parent / Guardian Name</div>
                  <div className="font-bold text-slate-700 dark:text-[#cbd5e1] uppercase">{selectedLead.parent_name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">Parent Mobile</div>
                  <div className="font-semibold text-slate-700 dark:text-[#cbd5e1]">{selectedLead.parent_mobile_number}</div>
                </div>
              </div>

              {/* Message */}
              {selectedLead.message && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-[#64748b]">Parent Remarks / Message</div>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#0f172a] border border-gray-100 dark:border-[#334155] text-slate-700 dark:text-[#cbd5e1] rounded-2xl whitespace-pre-wrap leading-relaxed text-xs">
                    {selectedLead.message}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-[#0f172a]/50 border-t border-gray-100 dark:border-[#334155]/80 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-500 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                Close
              </button>
              {selectedLead.status !== 'Converted' && (
                <button
                  onClick={() => openConvertModal(selectedLead)}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-md"
                >
                  Promote to Student
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conversion Promotion Form Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-150 dark:border-[#334155]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#334155]/80 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-805 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-500" /> Promote Lead
                </h2>
                <div className="text-[9px] text-gray-400 dark:text-[#64748b] font-bold uppercase tracking-wider mt-1.5">Converting: {selectedLead.student_full_name}</div>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#334155] hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleConvertSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex gap-3 text-xs text-emerald-800 dark:text-emerald-400">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    This lead will be promoted to an active student record. Both Student and Parent logins will be generated under <span className="font-bold">NubeEra School</span>.
                  </p>
                </div>

                {/* School dropdown (hidden when the logged-in user is already bound to one school) */}
                {!user?.school_id && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider ml-1">School</label>
                    <div className="relative">
                      {gradesLoading ? (
                        <div className="w-full py-3 bg-slate-50 dark:bg-[#0f172a] text-slate-400 text-xs font-semibold text-center border rounded-xl">Loading schools...</div>
                      ) : (
                        <>
                          <select
                            required
                            value={convSchoolId}
                            onChange={e => { setConvSchoolId(e.target.value); setConvGradeId(''); }}
                            className="w-full px-4 pr-10 py-3 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-semibold text-xs cursor-pointer shadow-sm appearance-none text-slate-800 dark:text-white"
                          >
                            <option value="">-- Select School --</option>
                            {schools.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Grade dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider ml-1">Assign Class / Grade Level</label>
                  <div className="relative">
                    {gradesLoading ? (
                      <div className="w-full py-3 bg-slate-50 dark:bg-[#0f172a] text-slate-400 text-xs font-semibold text-center border rounded-xl">Loading grades catalog...</div>
                    ) : (
                      <>
                        <select
                          required
                          value={convGradeId}
                          onChange={e => setConvGradeId(e.target.value)}
                          disabled={!user?.school_id && !convSchoolId}
                          className="w-full px-4 pr-10 py-3 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-semibold text-xs cursor-pointer shadow-sm appearance-none text-slate-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {!user?.school_id && !convSchoolId ? '-- Select School First --' : '-- Select Grade --'}
                          </option>
                          {gradesForSchool(convSchoolId || user?.school_id || '').map(g => (
                            <option key={g.id} value={g.id}>{g.grade_name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </>
                    )}
                  </div>
                </div>

                {/* Student code input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider ml-1">Custom Student Registration ID</label>
                  <input
                    type="text"
                    required
                    value={convStudentId}
                    onChange={e => setConvStudentId(e.target.value)}
                    placeholder="Enter Student Registration ID"
                    className="w-full px-4 py-3 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-semibold text-xs text-slate-800 dark:text-white uppercase"
                  />
                </div>

                {/* Roll number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider ml-1">Custom Roll Number</label>
                  <input
                    type="text"
                    value={convRollNo}
                    onChange={e => setConvRollNo(e.target.value)}
                    placeholder="Enter Roll Number"
                    className="w-full px-4 py-3 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-semibold text-xs text-slate-800 dark:text-white uppercase"
                  />
                </div>

                {/* Password fields */}
                <div className="p-4 bg-slate-50 dark:bg-[#0f172a]/60 rounded-2xl border border-gray-100 dark:border-[#334155]/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-primary" /> Credentials Vault
                    </span>
                    <button
                      type="button"
                      onClick={generateNewPasswords}
                      className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      Regenerate
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider ml-0.5">Student Login Password</label>
                    <input
                      type="text"
                      required
                      value={convPassword}
                      onChange={e => setConvPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-semibold text-xs text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider ml-0.5">Parent Login Password</label>
                    <input
                      type="text"
                      value={convParentPassword}
                      onChange={e => setConvParentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-[#334155] rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-semibold text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-[#0f172a]/50 border-t border-gray-100 dark:border-[#334155]/80 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="w-1/2 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-500 dark:text-[#94a3b8] hover:text-slate-800 dark:hover:text-white transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {converting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Approve & Promote
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteRegistrations;
