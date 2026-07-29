import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/services/api';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import FieldError from '@/components/FieldError';
import { DUPLICATE_MESSAGES, isDuplicateValue } from '@/utils/duplicateCheck';
import { isValidEmail } from '@/utils/validation';

const CreateStaff: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) =>
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const checkEmailDuplicate = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !isValidEmail(trimmed)) return;
    if (await isDuplicateValue('email', trimmed)) {
      setFormErrors(prev => ({ ...prev, email: DUPLICATE_MESSAGES.email }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (formData.password !== formData.confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
      return;
    }
    if (formErrors.email) return;
    setLoading(true);
    try {
      await api.post('/users', {
        email: formData.email,
        password: formData.password,
        role: 'Staff',
        first_name: 'Staff',
        last_name: 'User'
      });
      toast.success('Staff account created');
      setFormData({ email: '', password: '', confirmPassword: '' });
      setFormErrors({});
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to create account';
      if (/email/i.test(msg)) {
        setFormErrors(prev => ({ ...prev, email: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800">Create Account</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Enter staff details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-0 md:p-2 space-y-8">
          <div className="max-w-4xl space-y-3">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                onBlur={e => { const trimmed = e.target.value.trim(); setFormData({ ...formData, email: trimmed }); checkEmailDuplicate(trimmed); }}
                placeholder="Enter Email Address"
                className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl focus:ring-4 transition-all outline-none font-medium text-gray-900 text-sm shadow-sm ${formErrors.email ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:ring-primary/5 focus:border-primary'}`}
              />
            </div>
            <FieldError message={formErrors.email} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="********"
                    className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={e => { setFormData({ ...formData, confirmPassword: e.target.value }); clearFieldError('confirmPassword'); }}
                    placeholder="********"
                    className={`w-full pl-11 pr-12 py-3 bg-white border rounded-xl focus:ring-4 transition-all outline-none font-medium text-gray-900 text-sm shadow-sm ${formErrors.confirmPassword ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:ring-primary/5 focus:border-primary'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={formErrors.confirmPassword} />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-6 border-t border-gray-50">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Add Staff
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
                    </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStaff;
