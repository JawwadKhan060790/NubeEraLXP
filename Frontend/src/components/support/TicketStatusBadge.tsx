import React from 'react';

interface TicketStatusBadgeProps {
  status: string;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status }) => {
  const normalized = status.trim().toLowerCase();

  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    open: {
      bg: 'bg-blue-50 border-blue-100 dark:bg-blue-500/15 dark:border-blue-400/25',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500',
      label: 'Open'
    },
    inprogress: {
      bg: 'bg-amber-50 border-amber-100 dark:bg-amber-500/15 dark:border-amber-400/25',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500 animate-pulse',
      label: 'In Progress'
    },
    pending: {
      bg: 'bg-purple-50 border-purple-100 dark:bg-purple-500/15 dark:border-purple-400/25',
      text: 'text-purple-700 dark:text-purple-300',
      dot: 'bg-purple-500',
      label: 'Pending'
    },
    resolved: {
      bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/15 dark:border-emerald-400/25',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      label: 'Resolved'
    },
    closed: {
      bg: 'bg-slate-100 border-slate-200 dark:bg-[#283548] dark:border-[#334155]',
      text: 'text-slate-600 dark:text-[#cbd5e1]',
      dot: 'bg-slate-400',
      label: 'Closed'
    },
    reopened: {
      bg: 'bg-rose-50 border-rose-100 dark:bg-rose-500/15 dark:border-rose-400/25',
      text: 'text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-500 animate-ping',
      label: 'Reopened'
    }
  };

  const current = config[normalized] || config.open;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${current.bg} ${current.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`}></span>
      {current.label}
    </span>
  );
};

export default TicketStatusBadge;
