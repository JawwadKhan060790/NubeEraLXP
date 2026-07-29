import React, { useState, useEffect } from 'react';
import { Check, CheckCircle, Inbox, Search, Trash2 } from 'lucide-react';
import api from '@/services/api';
import Pagination from '@/components/Pagination';
import ConfirmModal from '@/components/ConfirmModal';
import { useConfirm } from '@/hooks/useConfirm';
import { getDefaultAvatar } from '@/utils';
import { toast } from 'sonner';

const PendingTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const response = await api.get('/teachers');
      // Filter for pending/inactive teachers if API supports it
      const pending = response.data.filter((t: any) => !t.is_active);
      setTeachers(pending);
    } catch (error) {
      console.error('Failed to fetch pending teachers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const { confirmState, requestConfirm } = useConfirm();

  const handleApprove = async (teacher: any) => {
    const ok = await requestConfirm({
      title: 'Approve Teacher',
      message: `Are you sure you want to approve "${teacher.full_name}"? This will allow them to login and access the system.`,
      confirmLabel: 'Approve',
      variant: 'info'
    });
    if (!ok) return;

    try {
      // Assuming PUT /teachers/{id} with is_active: true approves them
      await api.put(`/teachers/${teacher.id}`, {
        ...teacher,
        is_active: true,
        // Ensure required fields for TeacherUpdateDto are present
        password: 'defaultPassword123' // This is a placeholder as backend might require it, though it shouldn't change
      });
      toast.success(`${teacher.full_name} approved successfully`);
      fetchPending();
    } catch (error) {
      console.error('Approval failed', error);
      toast.error('Failed to approve teacher');
    }
  };

  const handleRemove = async (teacher: any) => {
    const ok = await requestConfirm({
      title: 'Reject Request',
      message: `Permanently delete the request from "${teacher.full_name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await api.delete(`/teachers/${teacher.id}`);
      toast.success('Request removed');
      fetchPending();
    } catch (error) {
      console.error('Delete failed', error);
      toast.error('Failed to remove request');
    }
  };

  const filteredTeachers = teachers.filter((teacher: any) =>
    teacher.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.school_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated Data
  const totalPages = Math.ceil(filteredTeachers.length / pageSize);
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teachers..."
            className="w-full pl-9 pr-4 py-2 bg-white border-gray-200 rounded-sm text-xs outline-none focus:border-primary transition-all font-medium"
          />
        </div>
        <div className="px-6 py-2 bg-white border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          {filteredTeachers.length} Results
        </div>
      </div>

      <div className="bg-white border-gray-200 rounded-sm overflow-hidden p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Teacher List</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Needs approval</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-gray-400 text-[10px] md:text-xs font-bold border-b border-gray-100 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-5 whitespace-nowrap">Teacher</th>
                <th className="px-6 py-5 whitespace-nowrap">Email / Username</th>
                <th className="px-6 py-5 whitespace-nowrap">School</th>
                <th className="px-6 py-5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading...</p>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-sm border-gray-100">
                        <Inbox className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No pending requests</p>
                      <p className="text-gray-400 text-[10px] mt-2 font-medium italic">All teachers are approved.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((teacher: any, idx: number) => (
                  <tr key={idx} className="group">
                    <td className="px-6 py-6 font-medium">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-primary/5 rounded-xl flex items-center justify-center p-1 shadow-sm border-gray-100 group-hover:scale-110 transition-transform">
                          <img
                            src={getDefaultAvatar(teacher.gender)}
                            className="w-9 h-9 rounded-lg"
                            alt=""
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-primary transition-colors text-sm md:text-base uppercase tracking-tight">{teacher.full_name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">Pending Approval</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <div className="text-xs text-gray-600 font-bold bg-gray-50 px-3 py-1.5 rounded-xl border-gray-100 inline-block uppercase tracking-wider">
                        {teacher.email?.split('@')[0] || teacher.user_name}
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <span className="text-sm text-gray-700 font-bold uppercase tracking-tight">{teacher.school_name || 'All Schools'}</span>
                    </td>
                    <td className="px-6 py-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(teacher)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleRemove(teacher)}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredTeachers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

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

export default PendingTeachers;
