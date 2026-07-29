import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/services/api';
import { Briefcase, Eye, EyeOff, Lock, Mail, School as SchoolIcon, Star, User as UserIcon, Phone, AlertCircle } from 'lucide-react';
import { isValidEmail, trimAndCollapseSpaces } from '@/utils/validation';
import { parseApiErrors } from '@/utils/errorParser';
import { DUPLICATE_MESSAGES, isDuplicateValue } from '@/utils/duplicateCheck';
import FieldError from '@/components/FieldError';
import PasswordPolicyTracker, { isPasswordValid } from '@/components/PasswordPolicyTracker';
import MobileNumberInput from '@/components/MobileNumberInput';
import { schoolService } from '@/services/schoolService';
import type { School } from '@/types/school.types';

const CreateTeacher: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    employeeId: `T-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
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

  // ── Requirement 2: Multi-School Teacher Assignment ─────────────────────────
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolIds, setSchoolIds] = useState<string[]>([]);
  const [primarySchoolId, setPrimarySchoolId] = useState<string>('');

  useEffect(() => {
    schoolService.getSchools().then(setSchools).catch(() => setSchools([]));
  }, []);

  const toggleSchool = (id: string) => {
    setSchoolIds(prev => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter(s => s !== id) : [...prev, id];
      if (isSelected && primarySchoolId === id) {
        setPrimarySchoolId(next[0] || '');
      }
      return next;
    });
  };

  const setPrimary = (id: string) => {
    setPrimarySchoolId(id);
    setSchoolIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      return toast.error('Please fill in all required fields');
    }

    if (!isPasswordValid(formData.password)) {
      setPasswordTouched(true);
      setFormErrors(prev => ({ ...prev, password: 'Password does not meet validation requirements.' }));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
      return;
    }

    if (formErrors.email) return;

    if (schoolIds.length === 0) {
      // Inline "Select at least one School." message under the picker already covers this.
      return;
    }

    const primaryId = primarySchoolId || schoolIds[0];

    setLoading(true);
    try {
      await api.post('/teachers', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        employee_id: formData.employeeId,
        school_id: primaryId,
        school_ids: schoolIds,
        is_active: true
      });
      toast.success('Teacher account created');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        employeeId: `T-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      });
      setSchoolIds([]);
      setPrimarySchoolId('');
      setPasswordTouched(false);
      setFormErrors({});
    } catch (error: any) {
      console.error('Save failed', error);
      const errorsMap = parseApiErrors(error);
      setFormErrors(errorsMap);
      if (errorsMap._form) {
        toast.error(errorsMap._form);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


      <div className="bg-white rounded-xl p-6 md:p-10 shadow-sm border border-gray-100 max-w-4xl">
        <form onSubmit={handleCreate} className="space-y-6">
          {formErrors._form && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formErrors._form}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                First Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, firstName: trimAndCollapseSpaces(e.target.value) })}
                  placeholder="Enter First Name"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                />
              </div>
              <FieldError message={formErrors.firstName || formErrors.first_name} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Last Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, lastName: trimAndCollapseSpaces(e.target.value) })}
                  placeholder="Enter Last Name"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                />
              </div>
              <FieldError message={formErrors.lastName || formErrors.last_name} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                  onBlur={(e) => checkEmailDuplicate(e.target.value)}
                  placeholder="Enter Email Address"
                  className={`w-full pl-11 pr-4 py-3 bg-white border rounded-md focus:ring-4 transition-all outline-none font-medium text-gray-900 text-sm shadow-sm ${formErrors.email ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:ring-primary/5 focus:border-primary'}`}
                />
              </div>
              <FieldError message={formErrors.email} />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Phone Number
              </label>
              <MobileNumberInput
                label="Phone Number"
                value={formData.phone}
                onChange={val => { setFormData({ ...formData, phone: val }); clearFieldError('phone'); }}
                error={formErrors.phone}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Employee ID
            </label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Enter Employee ID"
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
              />
            </div>
            <FieldError message={formErrors.employeeId || formErrors.employee_id} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Initial Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onBlur={() => setPasswordTouched(true)}
                  placeholder="********"
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError message={formErrors.password} />
              <PasswordPolicyTracker value={formData.password} touched={passwordTouched} />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); clearFieldError('confirmPassword'); }}
                  placeholder="********"
                  className={`w-full pl-11 pr-12 py-3 bg-white border rounded-md focus:ring-4 transition-all outline-none font-medium text-gray-900 text-sm shadow-sm ${formErrors.confirmPassword ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:ring-primary/5 focus:border-primary'}`}
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

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Assigned Schools <span className="text-gray-400 font-medium normal-case">— select one or more, click the star to set Primary</span>
            </label>
            <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto bg-white shadow-sm">
              {schools.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400 font-medium">No schools available.</p>
              ) : (
                schools.map((school) => {
                  const checked = schoolIds.includes(school.id);
                  const isPrimary = primarySchoolId === school.id;
                  return (
                    <label
                      key={school.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSchool(school.id)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0"
                      />
                      <SchoolIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{school.name}</span>
                      {checked && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setPrimary(school.id); }}
                          title={isPrimary ? 'Primary school' : 'Set as primary school'}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all flex-shrink-0 ${
                            isPrimary
                              ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-amber-50 hover:text-amber-500'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${isPrimary ? 'fill-amber-500' : ''}`} />
                          {isPrimary ? 'Primary' : 'Set Primary'}
                        </button>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            {schoolIds.length === 0 && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1.5 ml-1">Select at least one School.</p>
            )}
            <FieldError message={formErrors.school_ids || formErrors.school_id} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-md font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {loading ? 'Please wait...' : 'Add Teacher'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTeacher;
