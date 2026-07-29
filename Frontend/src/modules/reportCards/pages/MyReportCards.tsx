import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, AlertTriangle, RefreshCw, BookOpen } from 'lucide-react';
import {
  getMyReportCards, downloadReportCardPdf,
  type ReportCardListItem,
} from '@/services/reportCardService';

// ─── Grade badge ──────────────────────────────────────────────────────────────
const GradeBadge: React.FC<{ grade?: string; passed: boolean }> = ({ grade, passed }) => {
  const cls = !passed
    ? 'bg-red-100 text-red-700'
    : grade?.startsWith('A')
    ? 'bg-green-100 text-green-800'
    : grade?.startsWith('B')
    ? 'bg-blue-100 text-blue-800'
    : 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-bold ${cls}`}>
      {grade ?? '—'}
    </span>
  );
};

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
const MyReportCards: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReportCardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError('');
    getMyReportCards()
      .then(setItems)
      .catch(() => setError('Failed to load your report cards.'))
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
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">My Report Cards</h1>
            <p className="text-xs text-gray-400">Your academic performance records</p>
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
        <div className="flex justify-center py-16 text-gray-400 text-sm">Loading your report cards…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <BookOpen className="w-12 h-12" />
          <p className="text-sm font-medium">No report cards yet</p>
          <p className="text-xs text-center max-w-xs">Your report cards will appear here once your teacher publishes them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-800">{item.exam_type}</span>
                    {item.exam_name && <span className="text-xs text-gray-400">· {item.exam_name}</span>}
                    <span className="text-xs text-gray-400">{item.academic_year}</span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mb-2">{item.report_card_number}</p>
                  <ProgressBar pct={item.percentage} />
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{item.obtained_marks ? `${item.obtained_marks} / ${item.total_marks} marks` : ''}</span>
                    <span className="font-medium text-gray-700">{item.percentage.toFixed(1)}%</span>
                    {item.rank && <span>Rank #{item.rank}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <GradeBadge grade={item.overall_grade} passed={item.is_passed} />
                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/report-cards/${item.id}`)}
                      title="View Details"
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
      )}
    </div>
  );
};

export default MyReportCards;
