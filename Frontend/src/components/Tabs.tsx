import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  variant?: 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  active,
  onChange,
  variant = 'pills',
  className = '',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-slate-200 dark:border-[#334155] pb-px ${className}`}>
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                  : 'border-transparent text-slate-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#e2e8f0]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  // default pills variant: macOS style tab bar selector
  return (
    <div className={`inline-flex items-center gap-1 bg-slate-100 dark:bg-[#283548] p-1 rounded-xl overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            type="button"
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#e2e8f0]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
