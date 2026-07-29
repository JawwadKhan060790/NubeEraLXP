import React, { useEffect, useState } from 'react';
import { Bot, Save, Settings, ShieldAlert, Sparkles } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enableCopilot, setEnableCopilot] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/system-settings');
        if (response.data) {
          const val = response.data.EnableCopilot ?? response.data.enableCopilot;
          if (val !== undefined) {
            setEnableCopilot(val === 'true' || val === true || val === 'True');
          }
        }
      } catch (error) {
        console.error('Failed to fetch system settings', error);
        toast.error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggleCopilot = async () => {
    const newStatus = !enableCopilot;
    setSaving(true);
    try {
      await api.put('/system-settings/EnableCopilot', {
        value: newStatus ? 'true' : 'false'
      });
      setEnableCopilot(newStatus);
      toast.success(`NubeEra STEM Copilot ${newStatus ? 'enabled' : 'disabled'} successfully`);
      
      // Dispatch custom event to let ChatButton know configuration changed
      window.dispatchEvent(new Event('system-settings-changed'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Configure system-wide integrations and options
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-100 dark:border-[#283548] overflow-hidden p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">AI & Copilot Configuration</h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-[#283548]">
          {/* Setting Row */}
          <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-500" />
                <h4 className="text-sm font-black text-slate-700 dark:text-[#cbd5e1] tracking-tight">Enable NubeEra STEM Copilot</h4>
              </div>
              <p className="text-xs text-slate-400 dark:text-[#94a3b8] font-medium leading-relaxed">
                When enabled, the floating AI assistant bubble is visible to all authenticated roles (Students, Parents, Teachers, Staff, and Admins). Toggling this off hides the chat button completely throughout the application.
              </p>
            </div>

            <div className="flex items-center">
              <button
                onClick={handleToggleCopilot}
                disabled={saving}
                className={`
                  relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                  ${enableCopilot ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}
                  ${saving ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${enableCopilot ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice Card */}
      <div className="bg-rose-50/50 dark:bg-rose-950/10 backdrop-blur-md rounded-2xl p-6 border border-white dark:border-rose-900/20 shadow-sm flex items-center gap-5 text-rose-950/80 dark:text-rose-200">
        <div className="w-12 h-12 bg-white dark:bg-[#283548] rounded-xl flex items-center justify-center text-rose-500 shadow-sm shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Important Note</p>
          <p className="text-xs font-medium leading-relaxed italic">
            Disabling the STEM Copilot will immediately remove the assistant access for all users. You can re-enable it here at any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
