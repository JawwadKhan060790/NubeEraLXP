import React, { useState } from 'react';
import { Eye, EyeOff, Key, Lock, Save, Shield } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

const ChangePassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password
      });
      toast.success('Password changed successfully');
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800">Set New Password</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Enter your current and new password</p>
        </div>

        <form onSubmit={handleSubmit} className="p-0 md:p-2 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Current Password</label>
              <div className="relative mt-2">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={formData.current_password}
                  onChange={e => setFormData({ ...formData, current_password: e.target.value })}
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                >
                  {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                <div className="relative mt-2">
                  <Key className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={formData.new_password}
                    onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm Password</label>
                <div className="relative mt-2">
                  <Key className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={formData.confirm_password}
                    onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-amber-50/50 backdrop-blur-md rounded-2xl p-6 border border-white shadow-sm flex items-center gap-5 text-amber-900/80">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Note</p>
          <p className="text-xs font-medium leading-relaxed italic">
            Changing your password will not log you out. Use your new password the next time you log in.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
