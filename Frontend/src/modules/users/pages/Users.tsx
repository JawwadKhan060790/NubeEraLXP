import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ChevronDown, 
  Edit, 
  Eye, 
  EyeOff, 
  Key, 
  Lock, 
  Mail, 
  Search, 
  Trash2, 
  X, 
  LayoutGrid, 
  List, 
  School,
  Shield,
  Check,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import ConfirmModal from '@/components/ConfirmModal';
import FieldError from '@/components/FieldError';
import Pagination from '@/components/Pagination';
import { useConfirm } from '@/hooks/useConfirm';
import { DUPLICATE_MESSAGES, isDuplicateValue } from '@/utils/duplicateCheck';
import { isValidEmail } from '@/utils/validation';

interface UserData {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
  utype: string;
  school_id?: string;
  school_name?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

const roleBadgeMap: Record<string, string> = {
  superadmin: 'bg-indigo-50 text-[#6d28d9]   border border-indigo-100 ',
  admin: 'bg-indigo-50 text-[#6d28d9]   border border-indigo-100 ',
  principal: 'bg-purple-50 text-[#a353eb]   border border-purple-100 ',
  teacher: 'bg-blue-50 text-blue-600   border border-blue-100 ',
  staff: 'bg-slate-50 text-slate-600   border border-slate-200 ',
  student: 'bg-emerald-50 text-emerald-600   border border-emerald-100 ',
  parent: 'bg-amber-50 text-amber-600   border border-amber-100 ',
};

const getRoleBadgeClass = (roleStr: string) => {
  const r = roleStr.toLowerCase().replace(/\s/g, '');
  return roleBadgeMap[r] ?? 'bg-slate-50 text-slate-600   border border-slate-200 ';
};

const Users: React.FC = () => {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterSchoolId, setFilterSchoolId] = useState('');
  const [filterRole, setFilterRole] = useState(roleFromUrl || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserData | null>(null);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirm_password: '' });
  const [showResetPasswordFields, setShowResetPasswordFields] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');

  const clearFieldError = (field: string) =>
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const checkEmailDuplicate = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === originalEmail || !isValidEmail(trimmed)) return;
    if (await isDuplicateValue('email', trimmed)) {
      setFormErrors(prev => ({ ...prev, email: DUPLICATE_MESSAGES.email }));
    }
  };

  const checkUsernameDuplicate = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === originalUsername) return;
    if (await isDuplicateValue('username', trimmed)) {
      setFormErrors(prev => ({ ...prev, username: DUPLICATE_MESSAGES.username }));
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // Multiples of 3/4 for cards

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
    role: 'Teacher',
    school_id: '',
    is_active: true
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
    fetchUsers();
    fetchSchools();
  }, []);

  useEffect(() => {
    if (currentUser?.utype === 'admin' || currentUser?.utype === 'staff' || currentUser?.utype === 'superadmin') {
      fetchSchools();
    }
  }, [currentUser]);

  useEffect(() => {
    setFilterRole(roleFromUrl || '');
  }, [roleFromUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    if (showModal) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Failed to fetch schools', error);
    }
  };

  const { confirmState } = useConfirm();

  const handleResetPassword = (targetUser: UserData) => {
    setResettingUser(targetUser);
    setResetPasswordData({ password: '', confirm_password: '' });
    setResetPasswordError('');
    setShowResetModal(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetPasswordError('');
    if (resetPasswordData.password !== resetPasswordData.confirm_password) {
      setResetPasswordError('Passwords do not match.');
      return;
    }
    if (resetPasswordData.password.length < 6) {
      setResetPasswordError('Password must be at least 6 characters.');
      return;
    }

    try {
      await api.put(`/users/${resettingUser.id}/reset-password`, {
        password: resetPasswordData.password
      });
      toast.success(`Password updated for ${resettingUser.full_name || resettingUser.email}`);
      setShowResetModal(false);
    } catch (error: any) {
      setResetPasswordError(error?.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!editingId && formData.password !== formData.confirm_password) {
      setFormErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match.' }));
      return;
    }
    if (formErrors.email || formErrors.username) return;
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username || null,
          role: formData.role,
          school_id: formData.school_id || null,
          is_active: formData.is_active
        });
        toast.success('User updated');
      } else {
        await api.post('/users', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          username: formData.username || null,
          password: formData.password,
          role: formData.role,
          school_id: formData.school_id || null
        });
        toast.success('User added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to save user';
      if (/username/i.test(msg)) {
        setFormErrors(prev => ({ ...prev, username: msg }));
      } else if (/email/i.test(msg)) {
        setFormErrors(prev => ({ ...prev, email: msg }));
      } else {
        toast.error(msg);
      }
    }
  };

  const handleDelete = async (u: UserData) => {
    // Note: this performs a deactivation (soft delete), not a permanent removal —
    // the account, its history, and any linked student/teacher records are kept
    // intact and can be brought back later via "Restore".
    const ok = confirm(
      `Deactivate "${u.full_name || u.email}"? They will no longer be able to log in, but their account and records can be restored later.`
    );
    if (!ok) return;

    try {
      await api.delete(`/users/${u.id}`);
      toast.success('User deactivated successfully. They can be restored later if needed.');
      fetchUsers();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to deactivate user';
      toast.error(msg);
    }
  };

  const handleRestore = async (u: UserData) => {
    const ok = confirm(`Restore "${u.full_name || u.email}" and reactivate their account?`);
    if (!ok) return;

    try {
      await api.post(`/users/${u.id}/restore`);
      toast.success('User restored successfully');
      fetchUsers();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to restore user';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      password: '',
      confirm_password: '',
      role: filterRole || 'Teacher',
      school_id: currentUser?.school_id || '',
      is_active: true
    });
    setFormErrors({});
    setOriginalEmail('');
    setOriginalUsername('');
  };

  const filteredUsers = users.filter(u => {
    const isSelf = currentUser?.id ? (u.id === currentUser.id || (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())) : false;
    const matchesSchool = !filterSchoolId || (u.school_id && String(u.school_id).toLowerCase() === String(filterSchoolId).toLowerCase());
    const matchesRole = !filterRole || 
      (u.role && u.role.toLowerCase() === filterRole.toLowerCase()) || 
      (u.utype && u.utype.toLowerCase() === filterRole.toLowerCase());
    const matchesSearch = !searchTerm || 
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSchool && matchesRole && matchesSearch && !isSelf;
  });

  // Paginated Data
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSchoolId, filterRole, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Top action header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        
        {/* Left column: Search and filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${filterRole ? filterRole + 's' : 'users'}...`}
              className="w-full pl-9 pr-4 py-2 bg-white  border border-slate-250  rounded-md text-xs outline-none focus:border-primary  transition-all font-medium text-slate-700 "
            />
          </div>

          <div className="relative w-full sm:w-48">
            <select
              className="w-full px-3 pr-10 py-2 bg-white  border border-slate-250  rounded-md text-xs outline-none font-bold text-slate-700  focus:border-primary transition-all cursor-pointer appearance-none"
              value={filterSchoolId}
              onChange={(e) => setFilterSchoolId(e.target.value)}
            >
              <option value="">All Schools</option>
              {schools.filter(s => !currentUser?.school_id || s.id === currentUser.school_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Role Filter dropdown (only when not restricted by role query param) */}
          {!roleFromUrl && (
            <div className="relative w-full sm:w-48">
              <select
                className="w-full px-3 pr-10 py-2 bg-white  border border-slate-250  rounded-md text-xs outline-none font-bold text-slate-700  focus:border-primary transition-all cursor-pointer appearance-none"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="SuperAdmin">Super Admin</option>
                <option value="Principal">Principal</option>
                <option value="Teacher">Teacher</option>
                <option value="Staff">Staff</option>
                <option value="Student">Student</option>
                <option value="Parent">Parent</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Right column: Action button + Layout Toggler */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          
          {/* List/Card Layout Toggler */}
          <div className="flex items-center bg-slate-100  p-0.5 rounded-lg border border-slate-200  shadow-sm shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white  text-primary shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 '
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white  text-primary shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 '
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-primary text-white px-4 py-2 rounded-md font-bold uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all outline-none flex items-center justify-center gap-1.5 shadow-sm"
          >
            Add {roleFromUrl || filterRole || 'User'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white  border border-slate-200  p-12 text-center rounded-xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-500  mt-3 text-[10px] font-bold uppercase tracking-widest">Loading directory...</p>
        </div>
      ) : paginatedUsers.length === 0 ? (
        <div className="bg-white  border border-slate-200  p-12 text-center rounded-xl shadow-sm">
          <Shield className="w-10 h-10 text-slate-300  mx-auto mb-3" />
          <p className="text-slate-500  text-xs font-semibold">No users found matching your filter criteria.</p>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW GRID LAYOUT */
        <div className="data-table-wrapper">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>School</th>
                  <th>Role</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800 ">{u.full_name || (u.first_name + ' ' + u.last_name)}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold">{u.email}</span>
                          {u.username && (
                            <span className="text-[10px] text-indigo-600 font-mono font-semibold">@{u.username}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-slate-600  font-medium">{u.school_name || '-'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${getRoleBadgeClass(u.role)}`}>
                          {u.role}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${u.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="data-table-actions justify-end">
                        <button
                          onClick={() => {
                            setEditingId(u.id);
                            setFormData({
                              first_name: u.first_name,
                              last_name: u.last_name,
                              email: u.email,
                              username: u.username || '',
                              password: '',
                              confirm_password: '',
                              role: u.role,
                              school_id: u.school_id || '',
                              is_active: u.is_active
                            });
                            setFormErrors({});
                            setOriginalEmail(u.email || '');
                            setOriginalUsername(u.username || '');
                            setShowModal(true);
                          }}
                          className="action-btn action-btn-edit"
                          title="Edit User"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="action-btn action-btn-key"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {(currentUser?.utype === 'admin' || currentUser?.utype === 'superadmin') && (
                          u.is_active ? (
                            <button
                              onClick={() => handleDelete(u)}
                              className="action-btn action-btn-delete"
                              title="Deactivate User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(u)}
                              className="action-btn action-btn-edit text-emerald-600 hover:text-emerald-700"
                              title="Restore User"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredUsers.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : (
        /* PREMIUM CARD VIEW LAYOUT */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedUsers.map((u) => {
              const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || 'U';
              return (
                <div 
                  key={u.id}
                  className="bg-white  rounded-2xl border border-slate-200  p-5 shadow-sm hover:shadow-md hover:-translate-y-[1.5px] transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header: Initials Avatar + Role badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                        {initials}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${getRoleBadgeClass(u.role)}`}>
                          {u.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${u.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Body: Full name, Email & School details */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-850  truncate leading-snug">
                        {u.full_name || (u.first_name + ' ' + u.last_name)}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-450  font-bold truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{u.email}</span>
                      </div>

                      {u.username && (
                        <div className="text-[10px] text-indigo-600 font-mono font-semibold truncate">
                          @{u.username}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500  font-bold truncate pt-2.5 border-t border-slate-100  mt-1">
                        <School className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{u.school_name || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer with premium light-bg action buttons */}
                  <div className="mt-5 pt-3 border-t border-slate-100  flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(u.id);
                        setFormData({
                          first_name: u.first_name,
                          last_name: u.last_name,
                          email: u.email,
                          username: u.username || '',
                          password: '',
                          confirm_password: '',
                          role: u.role,
                          school_id: u.school_id || '',
                          is_active: u.is_active
                        });
                        setFormErrors({});
                        setOriginalEmail(u.email || '');
                        setOriginalUsername(u.username || '');
                        setShowModal(true);
                      }}
                      className="action-btn action-btn-edit"
                      title="Edit User"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="action-btn action-btn-key"
                      title="Reset Password"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    {(currentUser?.utype === 'admin' || currentUser?.utype === 'superadmin') && (
                      u.is_active ? (
                        <button
                          onClick={() => handleDelete(u)}
                          className="action-btn action-btn-delete"
                          title="Deactivate User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(u)}
                          className="action-btn action-btn-edit text-emerald-600 hover:text-emerald-700"
                          title="Restore User"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredUsers.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white  rounded-xl w-full max-w-4xl shadow-xl animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-slate-100  flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-850  tracking-tight">{editingId ? 'Edit User' : `Add ${roleFromUrl || filterRole || 'User'}`}</h2>
                <p className="text-[10px] md:text-xs text-slate-450 mt-1 font-bold uppercase tracking-wider">Set authentication and profile details</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="w-9 h-9 flex items-center justify-center rounded-md bg-slate-100  hover:bg-rose-50 hover:text-rose-500  text-slate-400 transition-all cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400  uppercase tracking-wider mb-2 ml-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white  border border-slate-200  rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-sm text-slate-800  shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400  uppercase tracking-wider mb-2 ml-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white  border border-slate-200  rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-sm text-slate-800  shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      disabled={!!editingId}
                      value={formData.email}
                      onChange={e => { setFormData({ ...formData, email: e.target.value }); clearFieldError('email'); }}
                      onBlur={e => checkEmailDuplicate(e.target.value)}
                      className={`w-full pl-11 pr-4 py-2.5 bg-white border rounded-md focus:ring-2 transition-all outline-none font-medium text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-450 shadow-sm ${formErrors.email ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`}
                    />
                  </div>
                  <FieldError message={formErrors.email} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Username <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => { setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') }); clearFieldError('username'); }}
                    onBlur={e => checkUsernameDuplicate(e.target.value)}
                    placeholder="e.g. john.doe"
                    className={`w-full px-4 py-2.5 bg-white border rounded-md focus:ring-2 transition-all outline-none font-medium text-sm text-slate-800 shadow-sm ${formErrors.username ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`}
                  />
                  <FieldError message={formErrors.username} />
                </div>
              </div>

              {!editingId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400  uppercase tracking-wider mb-2 ml-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-11 pr-12 py-2.5 bg-white  border border-slate-200  rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium text-sm text-slate-800  shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400  uppercase tracking-wider mb-2 ml-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirm_password}
                        onChange={e => { setFormData({ ...formData, confirm_password: e.target.value }); clearFieldError('confirm_password'); }}
                        className={`w-full pl-11 pr-12 py-2.5 bg-white border rounded-md focus:ring-2 transition-all outline-none font-medium text-sm text-slate-800 shadow-sm ${formErrors.confirm_password ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FieldError message={formErrors.confirm_password} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {!roleFromUrl && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400  uppercase tracking-wider mb-2 ml-1">Access Role</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 pr-10 py-2.5 bg-white  border border-slate-200  rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-semibold text-sm text-slate-800  cursor-pointer shadow-sm appearance-none"
                      >
                        {(currentUser?.utype === 'admin' || currentUser?.utype === 'superadmin') && <option value="SuperAdmin">Super Admin</option>}
                        <option value="Principal">Principal</option>
                        <option value="Teacher">Teacher</option>
                        {currentUser?.utype !== 'staff' && <option value="Staff">Staff</option>}
                        {/*
                          "Student" is intentionally NOT offered when creating a brand-new
                          user here. This generic form has no Grade/Section/StudentId fields,
                          so a Student created through it had no grade assignment (silently
                          defaulting to Grade 1) and no linked Student profile — producing a
                          second, disconnected identity that never matches edits made on the
                          Students panel (e.g. names desyncing to a placeholder like
                          "Student 2"). Student accounts must be created via the dedicated
                          Students panel, which keeps the User + Student records in sync.
                          We still show the option when editing an EXISTING Student so their
                          role renders/saves correctly and isn't forced to change.
                        */}
                        {editingId && formData.role === 'Student' && <option value="Student">Student</option>}
                        <option value="Parent">Parent</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {!editingId && (
                      <p className="mt-1.5 text-[11px] text-slate-400 ml-1">
                        Adding a student? Use the <strong>Students</strong> panel instead — it captures grade, division and login together so records stay in sync.
                      </p>
                    )}
                  </div>
                )}
                
                {(!roleFromUrl || roleFromUrl !== 'Staff') && (
                  <div className={roleFromUrl ? "sm:col-span-2" : ""}>
                    <label className="block text-[10px] font-bold text-slate-400  uppercase tracking-wider mb-2 ml-1">Assigned School</label>
                    <div className="relative">
                      <select
                        // Platform-wide roles (SuperAdmin/Admin/Staff — mirrors
                        // TenantService.PlatformWideRoles on the backend) are allowed
                        // to be assigned "None / Global" with no specific school.
                        // Previously only SuperAdmin was exempted here, so picking
                        // Staff + Global still left this <select> marked `required`,
                        // and the browser's native validation blocked the empty
                        // ("Global") option from being submitted — forcing the user
                        // to pick a real school name instead, which is exactly what
                        // QA reported.
                        required={!['SuperAdmin', 'Admin', 'Staff'].includes(formData.role)}
                        value={formData.school_id}
                        onChange={e => setFormData({ ...formData, school_id: e.target.value })}
                        disabled={currentUser?.utype !== 'admin' && currentUser?.utype !== 'staff' && currentUser?.utype !== 'superadmin'}
                        className="w-full px-4 pr-10 py-2.5 bg-white  border border-slate-200  rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-semibold text-sm text-slate-800  disabled:bg-slate-50  disabled:text-slate-450 cursor-pointer shadow-sm appearance-none"
                      >
                        <option value="">None / Global</option>
                        {schools.filter(s => !currentUser?.school_id || s.id === currentUser.school_id).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {editingId && (
                  <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Account Status</label>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {(currentUser?.utype === 'admin' || currentUser?.utype === 'superadmin')
                          ? 'Set whether this user account is Active or Inactive'
                          : 'Modifying account status requires Admin privileges'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        disabled={currentUser?.utype !== 'admin' && currentUser?.utype !== 'superadmin'}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 disabled:opacity-50"></div>
                      <span className={`ml-2 text-xs font-bold ${formData.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 md:pt-8 border-t border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="modal-btn-cancel"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="modal-btn-save"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Update User' : 'Save User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && resettingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white  rounded-xl w-full max-w-md shadow-xl animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-6 border-b border-slate-100  flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-855  tracking-tight">Set New Password</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">For: {resettingUser.full_name || resettingUser.email}</p>
              </div>
              <button type="button" onClick={() => setShowResetModal(false)} className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-50  text-slate-400 hover:text-rose-500 transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450  uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={resetPasswordData.password}
                    onChange={e => setResetPasswordData({ ...resetPasswordData, password: e.target.value })}
                    className="w-full pl-11 pr-12 py-2.5 bg-slate-50  border border-slate-200  rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800  animate-in"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordFields(!showResetPasswordFields)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    {showResetPasswordFields ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450  uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showResetPasswordFields ? "text" : "password"}
                    required
                    value={resetPasswordData.confirm_password}
                    onChange={e => setResetPasswordData({ ...resetPasswordData, confirm_password: e.target.value })}
                    className="w-full pl-11 pr-12 py-2.5 bg-slate-50  border border-slate-200  rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium text-slate-800 "
                    placeholder="********"
                  />
                </div>
                <FieldError message={resetPasswordError} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="modal-btn-cancel"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="modal-btn-save"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title ?? 'Confirm Action'}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={() => confirmState.resolve?.(true)}
        onCancel={() => confirmState.resolve?.(false)}
      />
    </div>
  );
};

export default Users;
