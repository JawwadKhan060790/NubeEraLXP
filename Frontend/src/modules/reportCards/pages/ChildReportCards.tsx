import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, AlertTriangle, RefreshCw, Users } from 'lucide-react';
import {
  getParentReportCards, downloadReportCardPdf,
  type ReportCardListItem,
} from '@/services/reportCardService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GradeBadge: React.FC<{ grade?: string; passed: boolean }> = ({ grade, passed }) => {
  const cls = !passed
    ? 'bg-red-100 text-red-700'
    : grade?.startsWith('A') ? 'bg-green-100 text-green-800'
    : grade?.startsWith('B') ? 'bg-blue-100 text-blue-800'
    : 'bg-yellow-100 text-yellow-800';
  return <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${cls}`}>{grade ?? '—'}</span>;
};

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
const ChildReportCards: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReportCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Group by student name
  const grouped = items.reduce<Record<string, ReportCardListItem[]>>((acc, item) => {
    const key = item.student_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const load = () => {
    setLoading(true); setError('');
    getParentReportCards()
      .then(setItems)
      .catch(() => setError('Failed to load report cards.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDownload = async (item: ReportCardListItem) => {
    setDownloadingId(item.id);
    try { await downloadReportCardPdf(item.id, item.report_card_number, item.student_name); }
    catch { setError('Download failed. Please try again.'); }
    finally { setDownloadingId(null); }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Children's Report Cards</h1>
            <p className="text-xs text-gray-400">Academic performance records for your children</p>
          </div>
        </div>
        <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <FileText className="w-12 h-12" />
          <p className="text-sm font-medium">No report cards available</p>
          <p className="text-xs text-center max-w-xs">Report cards will appear here once the school publishes them.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([studentName, cards]) => (
            <div key={studentName}>
              {/* Student section header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-700">{studentName[0]}</span>
                </div>
                <h2 className="text-sm font-semibold text-gray-700">{studentName}</h2>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                  {cards.length} report{cards.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2 ml-9">
                {cards.map(item => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-800">{item.exam_type}</span>
                          {item.exam_name && <span className="text-xs text-gray-400">· {item.exam_name}</span>}
                          <span className="text-xs text-gray-400">{item.academic_year}</span>
                          <span className="text-xs text-gray-400">· {item.grade_name}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mb-2">{item.report_card_number}</p>
                        <ProgressBar pct={item.percentage} />
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{item.percentage.toFixed(1)}%</span>
                          <span className={item.is_passed ? 'text-green-600' : 'text-red-600'}>
                            {item.is_passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <GradeBadge grade={item.overall_grade} passed={item.is_passed} />
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/report-cards/${item.id}`)}
                            title="View"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(item)}
                            disabled={downloadingId === item.id}
                            title="Download PDF"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-50"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildReportCards;
