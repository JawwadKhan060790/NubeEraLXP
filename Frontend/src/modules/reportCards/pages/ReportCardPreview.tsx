import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Download, CheckCircle, XCircle, Archive,
  User, BookOpen, Calendar, BarChart2, Activity, Star, AlertTriangle,
} from 'lucide-react';
import {
  getReportCardById, publishReportCard, unpublishReportCard, archiveReportCard,
  downloadReportCardPdf, type ReportCardDto,
} from '@/services/reportCardService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const gradeColor = (grade?: string, passed?: boolean) => {
  if (!passed) return 'text-red-600 bg-red-50';
  if (grade?.startsWith('A')) return 'text-green-700 bg-green-50';
  if (grade?.startsWith('B')) return 'text-blue-700 bg-blue-50';
  return 'text-yellow-700 bg-yellow-50';
};

const pctColor = (pct: number) => {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-blue-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Published: 'bg-green-100 text-green-800',
    Archived: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

// ── Publish modal ──────────────────────────────────────────────────────────────
const PublishModal: React.FC<{
  onClose: () => void;
  onConfirm: (toStudent: boolean, toParent: boolean) => void;
  loading: boolean;
}> = ({ onClose, onConfirm, loading }) => {
  const [toStudent, setToStudent] = useState(true);
  const [toParent, setToParent] = useState(true);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Publish Report Card</h3>
        <div className="space-y-3 mb-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={toStudent} onChange={e => setToStudent(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">Visible to Student</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={toParent} onChange={e => setToParent(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">Visible to Parent</span>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onConfirm(toStudent, toParent)} disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
const ReportCardPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rc, setRc] = useState<ReportCardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getReportCardById(id)
      .then(setRc)
      .catch(() => setError('Failed to load report card.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublish = async (toStudent: boolean, toParent: boolean) => {
    if (!id || !rc) return;
    setActionLoading(true);
    try {
      const updated = await publishReportCard(id, { is_visible_to_student: toStudent, is_visible_to_parent: toParent });
      setRc(prev => prev ? { ...prev, ...updated } : prev);
      setShowPublish(false);
    } catch { setError('Publish failed.'); }
    finally { setActionLoading(false); }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await unpublishReportCard(id);
      setRc(prev => prev ? { ...prev, ...updated } : prev);
    } catch { setError('Unpublish failed.'); }
    finally { setActionLoading(false); }
  };

  const handleArchive = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await archiveReportCard(id);
      setRc(prev => prev ? { ...prev, ...updated } : prev);
    } catch { setError('Archive failed.'); }
    finally { setActionLoading(false); }
  };

  const handleDownload = async () => {
    if (!rc) return;
    setDownloading(true);
    try { await downloadReportCardPdf(rc.id, rc.report_card_number, rc.student_name); }
    catch { setError('PDF download failed.'); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64 text-gray-400 text-sm">Loading…</div>
  );
  if (error || !rc) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2 text-red-500">
      <AlertTriangle className="w-8 h-8" />
      <p className="text-sm">{error || 'Report card not found.'}</p>
    </div>
  );

  const attendancePct = rc.total_working_days
    ? Math.round(((rc.days_present ?? 0) / rc.total_working_days) * 100)
    : rc.attendance_percentage;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/report-cards')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">{rc.report_card_number}</h1>
              <StatusBadge status={rc.status} />
            </div>
            <p className="text-xs text-gray-400">{rc.student_name} · {rc.grade_name} · {rc.exam_type} {rc.academic_year}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {downloading ? 'Downloading…' : 'Download PDF'}
          </button>
          {rc.status === 'Draft' && (
            <button
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" /> Publish
            </button>
          )}
          {rc.status === 'Published' && (
            <>
              <button onClick={handleUnpublish} disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <XCircle className="w-4 h-4" /> Unpublish
              </button>
              <button onClick={handleArchive} disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500 text-white text-sm hover:bg-yellow-600 disabled:opacity-50">
                <Archive className="w-4 h-4" /> Archive
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" />{error}
        </div>
      )}

      {/* Score hero */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Overall Result</p>
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-black px-3 py-1 rounded-lg ${gradeColor(rc.overall_grade, rc.is_passed)}`}>
                {rc.overall_grade ?? '—'}
              </span>
              <div>
                <p className="text-2xl font-bold">{rc.percentage.toFixed(1)}%</p>
                <p className="text-blue-200 text-xs">{rc.obtained_marks} / {rc.total_marks} marks</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${rc.is_passed ? 'text-green-300' : 'text-red-300'}`}>
              {rc.is_passed ? 'PASSED' : 'FAILED'}
            </p>
            {rc.gpa && <p className="text-blue-200 text-sm">GPA: {rc.gpa.toFixed(2)}</p>}
            {rc.rank && <p className="text-blue-200 text-sm">Rank: #{rc.rank}</p>}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Student info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-600 mb-3">
            <User className="w-4 h-4" /><span className="text-sm font-semibold">Student Information</span>
          </div>
          {[
            ['Name', rc.student_name],
            ['ID', rc.student_id_number],
            ['Roll No', rc.roll_no],
            ['Grade', rc.grade_name],
            ['Division', rc.section],
            ['School', rc.school_name],
            ['Parent', rc.parent_name],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-gray-400">{k}</span>
              <span className="text-gray-700 font-medium">{v}</span>
            </div>
          ))}
        </div>
        {/* Exam info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-600 mb-3">
            <Calendar className="w-4 h-4" /><span className="text-sm font-semibold">Examination Details</span>
          </div>
          {[
            ['Exam Type', rc.exam_type],
            ['Exam Name', rc.exam_name],
            ['Academic Year', rc.academic_year],
            ['Exam Date', rc.exam_date ? new Date(rc.exam_date).toLocaleDateString() : undefined],
            ['Report No.', rc.report_card_number],
            ['Published At', rc.published_at ? new Date(rc.published_at).toLocaleDateString() : undefined],
            ['Visible to Student', rc.is_visible_to_student ? 'Yes' : 'No'],
            ['Visible to Parent', rc.is_visible_to_parent ? 'Yes' : 'No'],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-gray-400">{k}</span>
              <span className="text-gray-700 font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects table */}
      {rc.subjects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Subject Performance</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-right">Max</th>
                <th className="px-4 py-2 text-right">Obtained</th>
                <th className="px-4 py-2 text-right">%</th>
                <th className="px-4 py-2 text-center">Grade</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rc.subjects.map((s, i) => {
                const pct = s.max_marks > 0 ? (s.obtained_marks / s.max_marks) * 100 : 0;
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{s.subject_name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{s.max_marks}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{s.obtained_marks}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{pct.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.grade === 'F' ? 'text-red-600 bg-red-50' : 'text-blue-700 bg-blue-50'}`}>
                        {s.grade ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${pctColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom row: Attendance + Activities + Skills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance */}
        {rc.total_working_days && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <Calendar className="w-4 h-4" /><span className="text-sm font-semibold">Attendance</span>
            </div>
            <div className="text-center mb-3">
              <p className="text-3xl font-bold text-gray-800">{attendancePct ?? '—'}%</p>
              <p className="text-xs text-gray-400">{rc.days_present ?? '—'} / {rc.total_working_days} days</p>
            </div>
            {attendancePct !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full ${pctColor(attendancePct)}`} style={{ width: `${Math.min(attendancePct, 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Activities */}
        {rc.activities.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-3">
              <Activity className="w-4 h-4" /><span className="text-sm font-semibold">Activities</span>
            </div>
            <div className="space-y-2">
              {rc.activities.map((a, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">{a.activity_name}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    a.rating === 'Excellent' ? 'bg-green-100 text-green-700' :
                    a.rating === 'Good' ? 'bg-blue-100 text-blue-700' :
                    a.rating === 'Satisfactory' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{a.rating}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {rc.skills.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-3">
              <Star className="w-4 h-4" /><span className="text-sm font-semibold">Skills</span>
            </div>
            <div className="space-y-2">
              {rc.skills.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>{s.skill_name}</span>
                    <span className="text-gray-400">{s.rating}/5</span>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(v => (
                      <div key={v} className={`flex-1 h-1.5 rounded-full ${v <= s.rating ? 'bg-purple-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Remarks */}
      {(rc.teacher_remarks || rc.principal_remarks) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rc.teacher_remarks && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Teacher Remarks</p>
              <p className="text-sm text-gray-700">{rc.teacher_remarks}</p>
            </div>
          )}
          {rc.principal_remarks && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Principal Remarks</p>
              <p className="text-sm text-gray-700">{rc.principal_remarks}</p>
            </div>
          )}
        </div>
      )}

      {showPublish && (
        <PublishModal onClose={() => setShowPublish(false)} onConfirm={handlePublish} loading={actionLoading} />
      )}
    </div>
  );
};

export default ReportCardPreview;
