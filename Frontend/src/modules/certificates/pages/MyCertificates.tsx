import React, { useState, useEffect } from 'react';
import { Award, Download, QrCode, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import {
  getMyCertificates,
  getChildCertificates,
  downloadCertificatePdf,
  type CertificateListItem,
} from '@/services/certificateService';

const getCurrentRole = (): string => {
  try {
    const u = localStorage.getItem('user');
    return u ? (JSON.parse(u).utype ?? '').toLowerCase() : '';
  } catch {
    return '';
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'Issued' || status === 'Approved')
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (status === 'Revoked')
    return <XCircle className="w-5 h-5 text-red-500" />;
  return <Clock className="w-5 h-5 text-yellow-500" />;
};

// ── Grade-band accent colors for the card ────────────────────────────────────
const gradeBandColor = (level: number) => {
  if (level <= 3) return 'from-violet-700 to-purple-600';
  if (level <= 6) return 'from-blue-700 to-cyan-600';
  if (level <= 8) return 'from-blue-900 to-slate-700';
  return 'from-blue-900 to-indigo-800';
};

// ── Certificate Card ──────────────────────────────────────────────────────────
interface CertCardProps {
  cert: CertificateListItem;
  onDownload: (id: string, num: string) => void;
  downloading: boolean;
}
const CertCard: React.FC<CertCardProps> = ({ cert, onDownload, downloading }) => {
  const canDownload = cert.status === 'Issued' || cert.status === 'Approved';
  const gradeLevel = parseInt(cert.grade_name?.match(/\d+/)?.[0] ?? '5', 10);
  const bg = gradeBandColor(gradeLevel);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Coloured header strip */}
      <div className={`bg-gradient-to-r ${bg} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{cert.program_type}</p>
            <h3 className="text-base font-bold mt-0.5 leading-snug">{cert.course_name}</h3>
          </div>
          <Award className="w-8 h-8 opacity-80 flex-shrink-0" />
        </div>
        <p className="text-xs mt-2 opacity-70 font-mono">{cert.certificate_number}</p>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{cert.student_name}</p>
            <p className="text-xs text-gray-500">{cert.grade_name} · {cert.school_name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon status={cert.status} />
            <span className="text-xs text-gray-600">{cert.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400">Academic Year</p>
            <p className="font-semibold text-gray-700">{cert.academic_year}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-gray-400">Completed</p>
            <p className="font-semibold text-gray-700">{fmt(cert.completion_date)}</p>
          </div>
          {cert.performance_level && (
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400">Grade Awarded</p>
              <p className="font-semibold text-gray-700">{cert.performance_level}</p>
            </div>
          )}
          {cert.percentage != null && (
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400">Score</p>
              <p className="font-semibold text-gray-700">{cert.percentage.toFixed(1)}%</p>
            </div>
          )}
        </div>

        {cert.issued_at && (
          <p className="text-xs text-gray-400">Issued: {fmt(cert.issued_at)}</p>
        )}

        {cert.download_count > 0 && (
          <p className="text-xs text-gray-400">Downloaded {cert.download_count}×</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {canDownload && (
            <button
              onClick={() => onDownload(cert.id, cert.certificate_number)}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {downloading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Download className="w-4 h-4" />}
              Download PDF
            </button>
          )}
          <a
            href={`https://nubeera.tech/verify/${cert.certificate_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Verify
          </a>
        </div>
      </div>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
const MyCertificates: React.FC = () => {
  const isParent = getCurrentRole() === 'parent';

  const [certs, setCerts] = useState<CertificateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const data = isParent ? await getChildCertificates() : await getMyCertificates();
        setCerts(data);
      } catch {
        setError('Failed to load certificates. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isParent]);

  const handleDownload = async (id: string, certNumber: string) => {
    setDownloadingId(id);
    try {
      await downloadCertificatePdf(id, certNumber);
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-900 rounded-xl">
          <Award className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isParent ? "My Children's Certificates" : 'My Certificates'}
          </h1>
          <p className="text-sm text-gray-500">
            {isParent
              ? 'View and download certificates earned by your children'
              : 'View and download your earned certificates'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Award className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No certificates yet</h3>
          <p className="text-sm text-gray-400 mt-1">
            {isParent
              ? "Your children's certificates will appear here once issued."
              : 'Your certificates will appear here once issued by your school.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {certs.map(cert => (
            <CertCard
              key={cert.id}
              cert={cert}
              onDownload={handleDownload}
              downloading={downloadingId === cert.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCertificates;
