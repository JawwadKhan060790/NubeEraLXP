import React, { useState, useEffect } from 'react';
import { Camera, Edit3, Mail, MapPin, Phone, Shield, X, Check, AtSign } from 'lucide-react';
import api from '@/services/api';
import MobileNumberInput from '@/components/MobileNumberInput';
import FieldError from '@/components/FieldError';
import { DUPLICATE_MESSAGES, isDuplicateValue } from '@/utils/duplicateCheck';
import { isValidEmail, trimAndCollapseSpaces } from '@/utils/validation';
import { getDefaultAvatar } from '@/utils';
import { toast } from 'sonner';
import { useAuthContext } from '@/context/AuthContext';

const getMediaUrl = (url: string | undefined) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.')
  ) {
    return `${protocol}//${host}:5001${url}`;
  }
  return url;
};

const UpdateProfile: React.FC = () => {
  const { updateUser } = useAuthContext();
  const [user, setUser] = useState<any>(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  // The image picked via <input type="file"> is staged here ONLY — it is not
  // uploaded to the server until Save is actually pressed. Previously the
  // onChange handler uploaded immediately and wrote the new URL into formData,
  // so clicking "Cancel" afterward had no way to undo it: the file was already
  // saved server-side and formData already pointed at it. (QA: "the image is
  // updated although you cancel the image change".)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
    parent_guardian_name: '',
    parent_guardian_phone: '',
    parent_guardian_email: '',
    emergency_contact: '',
    qualification: '',
    specialization: '',
    profile_image_url: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState({ email: '', username: '' });

  const clearFieldError = (field: string) =>
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const checkEmailDuplicate = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === originalValues.email.toLowerCase() || !isValidEmail(trimmed)) return;
    if (await isDuplicateValue('email', trimmed)) {
      setFormErrors(prev => ({ ...prev, email: DUPLICATE_MESSAGES.email }));
    }
  };

  const checkUsernameDuplicate = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === originalValues.username.toLowerCase()) return;
    if (await isDuplicateValue('username', trimmed)) {
      setFormErrors(prev => ({ ...prev, username: DUPLICATE_MESSAGES.username }));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      const details = data.student_details || data.teacher_details || {};
      
      const newFormData = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        username: data.username || '',
        phone: data.phone || '',
        date_of_birth: details.date_of_birth ? new Date(details.date_of_birth).toISOString().split('T')[0] : '',
        gender: details.gender || '',
        blood_group: details.blood_group || '',
        address: details.address || '',
        parent_guardian_name: details.parent_guardian_name || '',
        parent_guardian_phone: details.parent_guardian_phone || '',
        parent_guardian_email: details.parent_guardian_email || '',
        emergency_contact: details.emergency_contact || '',
        qualification: details.qualification || '',
        specialization: details.specialization || '',
        profile_image_url: data.profile_image_url || ''
      };
      
      setFormData(newFormData);
      setOriginalValues({
        email: data.email || '',
        username: data.username || ''
      });
      setFormErrors({});
      
      // Update local storage user with most recent basic info
      const updatedUser = { ...user, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to fetch profile details", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formErrors.email || formErrors.username) {
      return;
    }
    setLoading(true);
    try {
      let profileImageUrl = formData.profile_image_url;

      // The image file is only uploaded NOW, on Save — not the moment it was
      // picked. Staging it locally (see file input onChange below) is what
      // lets Cancel discard the change with no server-side trace left behind.
      if (pendingImageFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', pendingImageFile);
        const { data: uploadData } = await api.post('/upload', formDataUpload);
        profileImageUrl = uploadData.url;
      }

      const payload = {
        ...formData,
        profile_image_url: profileImageUrl,
        date_of_birth: formData.date_of_birth === '' ? null : formData.date_of_birth
      };
      await api.put('/users/profile', payload);

      const updatedFields = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        username: formData.username,
        phone: formData.phone,
        profile_image_url: profileImageUrl,
        full_name: `${formData.first_name} ${formData.last_name}`.trim()
      };

      const updatedUser = { ...user, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData(prev => ({ ...prev, profile_image_url: profileImageUrl }));

      // Push the same fields into AuthContext so every other component reading
      // the logged-in user (Dashboard welcome banner, sidebar avatar, etc.) picks
      // up the change immediately.
      updateUser(updatedFields);

      setPendingImageFile(null);
      setImagePreviewUrl('');

      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchProfile(); // Refetch to get formatted dates
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Discard any staged-but-unsaved image, and re-pull formData from the
    // server so unsaved text edits don't linger if the user re-opens Edit.
    setPendingImageFile(null);
    setImagePreviewUrl('');
    setIsEditing(false);
    fetchProfile();
  };

  const isStudent = user.utype === 'student';
  const isTeacher = user.utype === 'teacher';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white  rounded-xl p-6 md:p-8 shadow-sm border border-slate-200  flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white/50 backdrop-blur-md rounded-xl flex items-center justify-center text-primary mb-6 border-4 border-white  shadow-xl overflow-hidden">
                <img
                  src={imagePreviewUrl || getMediaUrl(formData.profile_image_url) || getDefaultAvatar(formData.gender)}
                  alt="Profile"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              {isEditing && (
                <label className="absolute bottom-4 right-0 w-10 h-10 bg-primary text-white rounded-md flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform border-4 border-white ">
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        // Stage locally only — actual upload happens in
                        // handleUpdateProfile on Save. This is what makes
                        // Cancel actually able to discard the change.
                        const file = e.target.files[0];
                        setPendingImageFile(file);
                        setImagePreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-850 ">{user.full_name}</h2>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-3 bg-primary/10 px-6 py-2 rounded-full border border-primary/10">{user.utype}</p>
          </div>

          <div className="bg-white  rounded-xl p-6 md:p-8 shadow-sm border border-slate-200  space-y-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10  flex items-center justify-center text-primary shrink-0 shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 ">Access Level</p>
                <p className="text-sm font-black text-slate-800  uppercase tracking-tight mt-0.5">{user.role}</p>
              </div>
            </div>
            
            <div className="h-px bg-slate-100 " />

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#a353eb]/10 flex items-center justify-center text-[#a353eb] shrink-0 shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 ">Identity & Login</p>
                <p className="text-sm font-bold text-slate-750 truncate mt-0.5">{formData.email || user.email}</p>
                {(formData.username || user.username) && (
                  <p className="text-xs font-mono font-bold text-indigo-600 truncate mt-0.5">@{formData.username || user.username}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleUpdateProfile} className="bg-white rounded-xl p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Profile Details</h3>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white text-primary rounded-md text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm border border-primary/10"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="modal-btn-cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="modal-btn-save"
                    >
                      {loading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
              )}
            </div>

            <div className="space-y-10">
              {/* CORE DETAILS */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full"></div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Personal Info</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">First Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                        required
                        className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-100">{user.first_name || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Last Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                        required
                        className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-100">{user.last_name || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={e => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                            onBlur={e => checkEmailDuplicate(e.target.value)}
                            required
                            className={`w-full pl-11 pr-4 py-3.5 bg-white border rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm ${formErrors.email ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:border-primary'}`}
                          />
                        </div>
                        <FieldError message={formErrors.email} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-md border border-gray-100">
                        <Mail className="w-4 h-4 text-primary" />
                        <p className="text-sm font-bold text-gray-700">{formData.email || user.email || '—'}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Username <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                    {isEditing ? (
                      <div>
                        <div className="relative">
                          <AtSign className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.username}
                            onChange={e => { setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') }); clearFieldError('username'); }}
                            onBlur={e => checkUsernameDuplicate(e.target.value)}
                            placeholder="e.g. john.doe"
                            className={`w-full pl-11 pr-4 py-3.5 bg-white border rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm ${formErrors.username ? 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400' : 'border-gray-200 focus:border-primary'}`}
                          />
                        </div>
                        <FieldError message={formErrors.username} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-md border border-gray-100">
                        <AtSign className="w-4 h-4 text-primary" />
                        <p className="text-sm font-bold text-gray-700 font-mono">{formData.username || user.username || 'Not set'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CONTACT & DEMOGRAPHIC */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full"></div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Extra Details</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Mobile Number</label>
                    {isEditing ? (
                      <MobileNumberInput
                        label="Mobile Number"
                        value={formData.phone}
                        onChange={(digits) => setFormData({ ...formData, phone: digits })}
                      />
                    ) : (
                      <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-md border border-gray-100">
                        <Phone className="w-4 h-4 text-primary" />
                        <p className="text-sm font-bold text-gray-700">{user.phone || 'No phone number'}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Date of Birth</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100">
                        {formData.date_of_birth ? (() => {
                          const d = typeof formData.date_of_birth === 'string' && !formData.date_of_birth.includes('T') ? new Date(`${formData.date_of_birth}T00:00:00`) : new Date(formData.date_of_birth);
                          if (isNaN(d.getTime())) return formData.date_of_birth;
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        })() : 'Not set'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Gender</label>
                    {isEditing ? (
                      <select
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm cursor-pointer appearance-none"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-sm font-bold text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.gender || 'Not set'}</p>
                    )}
                  </div>
                  {(isStudent) && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Blood Group</label>
                      {isEditing ? (
                        <select
                          value={formData.blood_group}
                          onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                          className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm cursor-pointer appearance-none"
                        >
                          <option value="">Select Group</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-bold text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.blood_group || 'Not recorded'}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Address</label>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm resize-none"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.address || 'No address set'}</p>
                  )}
                </div>
              </div>

              {/* ROLE SPECIFIC: TEACHER */}
              {isTeacher && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Work Info</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Qualification</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.qualification}
                          onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                          className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                        />
                      ) : (
                        <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.qualification || '—'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Specialization</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.specialization}
                          onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                          className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                        />
                      ) : (
                        <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.specialization || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ROLE SPECIFIC: STUDENT GUARDIAN */}
              {isStudent && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Parent Info</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Guardian Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.parent_guardian_name}
                          onChange={e => setFormData({ ...formData, parent_guardian_name: e.target.value })}
                          onBlur={e => setFormData({ ...formData, parent_guardian_name: trimAndCollapseSpaces(e.target.value) })}
                          placeholder="Enter Guardian Name"
                          className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-900 text-sm shadow-sm"
                        />
                      ) : (
                        <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.parent_guardian_name || '—'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Parent Mobile Number</label>
                      {isEditing ? (
                        <MobileNumberInput
                          label="Parent Mobile Number"
                          value={formData.parent_guardian_phone}
                          onChange={(digits) => setFormData({ ...formData, parent_guardian_phone: digits })}
                        />
                      ) : (
                        <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.parent_guardian_phone || '—'}</p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Alternate Mobile Number</label>
                      {isEditing ? (
                        <MobileNumberInput
                          label="Alternate Mobile Number"
                          value={formData.emergency_contact}
                          onChange={(digits) => setFormData({ ...formData, emergency_contact: digits })}
                        />
                      ) : (
                        <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-100">{formData.emergency_contact || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* INSTITUTIONAL ASSOCIATION */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-gray-300 rounded-full"></div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">School Info</h4>
                </div>
                <div className="flex items-center gap-4 p-5 rounded-xl bg-brand-50/30 border border-white opacity-80 backdrop-blur-sm">
                  <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">School Name</p>
                    <p className="text-sm font-bold text-gray-700">{user.school_name || 'No School Assigned'}</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium italic ml-1">* School details can only be changed by an Admin.</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateProfile;
