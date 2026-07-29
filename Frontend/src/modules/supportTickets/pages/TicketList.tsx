import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  ShieldAlert,
  BarChart3,
  Trash2,
  Sliders,
  CheckSquare,
  Loader2,
  Paperclip,
  Send
} from 'lucide-react';
import api from '@/services/api';
import { supportService } from '@/services/supportService';
import StatGrid from '@/components/StatGrid';
import type { Ticket, TicketCategory } from '@/services/supportService';
import TicketStatusBadge from '@/components/support/TicketStatusBadge';
import Pagination from '@/components/Pagination';

export const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  // Filtering & Query States
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  // Split-panel Detail View States
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Comment Creation States (from TicketDetails)
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [attachmentsData, setAttachmentsData] = useState<any[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [staffList, setStaffList] = useState<{ id: string; fullName: string }[]>([]);

  // Category management states
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  const loadCategories = async () => {
    try {
      const cats = await supportService.getCategories();
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get('/users?role=Staff');
      setStaffList(res.data.map((u: any) => ({ id: u.id, fullName: u.full_name })));
    } catch (e) {
      console.error('Failed to fetch staff members list.', e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        setUserRole(u.utype?.toLowerCase() || 'student');
      } catch (e) {
        setUserRole('student');
      }
    }
    loadCategories();
  }, []);

  const isStaffOrAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || userRole === 'principal';

  useEffect(() => {
    if (isStaffOrAdmin) {
      loadStaff();
    }
  }, [userRole]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await supportService.getTickets({
        status: status || undefined,
        priority: priority || undefined,
        categoryId: categoryId || undefined,
        search: search || undefined,
        page,
        pageSize
      });

      const savedUser = localStorage.getItem('user');
      let parsedUser = currentUser;
      if (!parsedUser && savedUser) {
        try {
          parsedUser = JSON.parse(savedUser);
          setCurrentUser(parsedUser);
        } catch (_) { }
      }

      const role = userRole || (parsedUser?.utype?.toLowerCase() || 'student');
      const isStaffOrAdminCheck = role === 'admin' || role === 'superadmin' || role === 'staff' || role === 'principal';

      let items = res.items;
      if (!isStaffOrAdminCheck && parsedUser) {
        items = res.items.filter(t =>
          t.requester?.id === parsedUser.id ||
          t.requester?.email?.toLowerCase() === parsedUser.email?.toLowerCase()
        );
      }

      setTickets(items);
      setTotalItems(isStaffOrAdminCheck ? res.totalItems : items.length);

      // Auto select first ticket if none selected
      if (items.length > 0 && !selectedTicketId) {
        setSelectedTicketId(items[0].id);
      }
    } catch (e) {
      toast.error('Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [status, priority, categoryId, page, pageSize, userRole, currentUser]);

  // Fetch ticket details when selection changes
  useEffect(() => {
    const fetchDetail = async () => {
      if (!selectedTicketId) {
        setSelectedTicket(null);
        return;
      }
      try {
        setLoadingDetail(true);
        const data = await supportService.getTicketDetail(selectedTicketId);
        setSelectedTicket(data);
      } catch (err) {
        toast.error('Failed to load ticket details.');
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedTicketId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTickets();
  };

  const handleResetFilters = () => {
    setStatus('');
    setPriority('');
    setCategoryId('');
    setSearch('');
    setPage(1);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('Category name is required.');
      return;
    }
    try {
      setCategorySaving(true);
      await supportService.createCategory(newCatName.trim(), newCatDesc.trim());
      toast.success(`Category "${newCatName}" created successfully!`);
      setNewCatName('');
      setNewCatDesc('');
      await loadCategories();
    } catch (err) {
      toast.error('Failed to create category.');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${name}"?`)) {
      return;
    }
    try {
      await supportService.deleteCategory(id);
      toast.success(`Category "${name}" deleted successfully!`);
      await loadCategories();
    } catch (err) {
      toast.error('Failed to delete category. Tickets might be assigned to this category.');
    }
  };

  // Reply and details updates
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB attachment limit.');
      return;
    }

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      toast.error('Only images and PDF files are allowed.');
      return;
    }

    try {
      setUploadingAttachment(true);
      const res = await supportService.uploadAttachment(file);
      const newAttachment = {
        fileName: file.name,
        fileUrl: res.url,
        fileType: file.type || extension,
        fileSize: file.size
      };
      setAttachmentsData((prev) => [...prev, newAttachment]);
      toast.success(`${file.name} uploaded successfully.`);
    } catch (err) {
      toast.error('Failed to upload attachment.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyContent.trim()) return;

    try {
      setSubmittingReply(true);
      await supportService.postComment(selectedTicketId, {
        content: replyContent,
        isInternal: isInternal && isStaffOrAdmin,
        attachments: attachmentsData
      });

      toast.success(isInternal ? 'Internal staff note added.' : 'Public reply posted.');
      setReplyContent('');
      setAttachmentsData([]);
      setIsInternal(false);

      const data = await supportService.getTicketDetail(selectedTicketId!);
      setSelectedTicket(data);
      loadTickets(); // Refresh lists / counts
    } catch (err: any) {
      toast.error('Failed to post reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAssign = async (staffId: string) => {
    if (!selectedTicketId) return;
    try {
      await supportService.assignTicket(selectedTicketId, staffId || null);
      toast.success('Ticket assignee updated successfully.');
      const data = await supportService.getTicketDetail(selectedTicketId!);
      setSelectedTicket(data);
      loadTickets();
    } catch (e) {
      toast.error('Failed to assign ticket.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicketId) return;
    try {
      await supportService.updateStatus(selectedTicketId, newStatus);
      toast.success(`Ticket status updated to: ${newStatus}`);
      const data = await supportService.getTicketDetail(selectedTicketId!);
      setSelectedTicket(data);
      loadTickets();
    } catch (e) {
      toast.error('Failed to update ticket status.');
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize);
  const isTicketClosed = selectedTicket?.status === 'Closed';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Top Banner Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-805 dark:text-white tracking-tight">Support Hub</h1>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            {isStaffOrAdmin
              ? 'Manage school-wide customer support queries and system bugs.'
              : 'Submit issues and monitor the resolution progress of your queries.'}
          </p>
        </div>

        <div className="flex gap-2">
          {isStaffOrAdmin && (
            <>
              <button
                onClick={() => setShowManageCategoriesModal(true)}
                className="py-2 px-3 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#e2e8f0] hover:bg-slate-50 dark:hover:bg-[#283548] font-bold text-[10px] uppercase tracking-wider rounded-md transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Tag className="w-3.5 h-3.5 text-indigo-500" /> Categories
              </button>
              <button
                onClick={() => navigate('/support/analytics')}
                className="py-2 px-3 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#e2e8f0] hover:bg-slate-50 dark:hover:bg-[#283548] font-bold text-[10px] uppercase tracking-wider rounded-md transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
              </button>
            </>
          )}
          {!isStaffOrAdmin && (
            <button
              onClick={() => navigate('/support/raise-ticket')}
              className="py-2 px-4 bg-primary text-white font-bold text-[10px] uppercase tracking-wider rounded-md transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Raise Ticket
            </button>
          )}
        </div>
      </div>

      {/* Counters / Stats Row */}
      {(() => {
        const ticketStats = [
          { title: 'Total Tickets', value: tickets.length, icon: <Tag className="w-6 h-6" />, color: 'indigo' as const, subtitle: 'All submitted tickets' },
          { title: 'Open Issues', value: tickets.filter(t => t.status === 'Open').length, icon: <ShieldAlert className="w-6 h-6" />, color: 'rose' as const, subtitle: 'Awaiting action' },
          { title: 'In Progress', value: tickets.filter(t => t.status === 'InProgress').length, icon: <Sliders className="w-6 h-6" />, color: 'amber' as const, subtitle: 'Being worked on' },
          { title: 'Resolved / Closed', value: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length, icon: <CheckSquare className="w-6 h-6" />, color: 'emerald' as const, subtitle: 'Completed tickets' },
        ];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatGrid stats={ticketStats} loading={loading} />
          </div>
        );
      })()}

      {/* Split Panel Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL: Ticket list */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#334155] rounded-[10px] flex flex-col overflow-hidden shadow-sm max-h-[750px]">

          {/* Filters Area */}
          <div className="p-4 border-b border-slate-100 dark:border-[#334155] space-y-3 flex-shrink-0">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] rounded-[4px] pl-9 pr-4 py-2 text-slate-800 dark:text-white text-xs outline-none focus:border-primary transition-all font-semibold"
              />
            </form>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] rounded-[4px] px-2 py-1.5 text-slate-700 dark:text-[#e2e8f0] text-[10px] font-black cursor-pointer outline-none transition-all"
              >
                <option value="">Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] rounded-[4px] px-2 py-1.5 text-slate-700 dark:text-[#e2e8f0] text-[10px] font-black cursor-pointer outline-none transition-all"
              >
                <option value="">Statuses</option>
                <option value="Open">Open</option>
                <option value="InProgress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
              </select>

              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(1); }}
                className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] rounded-[4px] px-2 py-1.5 text-slate-700 dark:text-[#e2e8f0] text-[10px] font-black cursor-pointer outline-none transition-all"
              >
                <option value="">Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {(status || priority || categoryId || search) && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest block w-full text-center"
              >
                Clear Active Filters
              </button>
            )}
          </div>

          {/* List Scroll Area */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#334155] flex-1 min-h-[350px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Syncing database...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-[#475569] mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-[#cbd5e1]">No Tickets Found</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 cursor-pointer relative flex flex-col justify-between hover:bg-slate-50/80 dark:hover:bg-[#283548]/30 transition-all duration-200 border-l-4 group ${isSelected
                      ? 'bg-gradient-to-r from-primary/10 to-indigo-500/5 dark:from-primary/20 dark:to-indigo-500/10 border-l-4 border-primary shadow-xs'
                      : 'border-transparent'
                      }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider font-mono">
                          {t.ticketNumber}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-[4px] ${t.priority === 'High'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                          : t.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-slate-50 text-slate-500 dark:bg-[#1e293b]'
                          }`}>
                          {t.priority}
                        </span>
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-805 dark:text-white uppercase tracking-tight line-clamp-1 leading-snug">
                        {t.subject}
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-[#94a3b8] font-medium line-clamp-1">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-50 dark:border-[#283548]">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                          {t.category.name}
                        </span>
                        {isSelected && (
                          <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300" />
                        )}
                      </div>
                      <TicketStatusBadge status={t.status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>

        {/* RIGHT PANEL: Details View */}
        <div className="lg:col-span-7 space-y-6">
          {!selectedTicketId ? (
            <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#334155] rounded-[10px] p-12 text-center shadow-sm">
              <Sliders className="w-10 h-10 text-slate-300 dark:text-[#3d4b5f] mx-auto mb-3" />
              <p className="text-slate-500 dark:text-[#94a3b8] text-xs font-semibold">Please select a ticket from the list to view active conversation timeline.</p>
            </div>
          ) : loadingDetail ? (
            <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#334155] rounded-[10px] p-12 text-center shadow-sm">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-[10px] text-slate-505 dark:text-[#94a3b8] font-bold uppercase tracking-widest">Opening support channel details...</p>
            </div>
          ) : !selectedTicket ? (
            <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#334155] rounded-[10px] p-12 text-center shadow-sm">
              <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <p className="text-rose-500 text-xs font-semibold">Failed to load support ticket details.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Header Info */}
              <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#334155] rounded-[10px] p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      {selectedTicket.ticketNumber} · {selectedTicket.category.name}
                    </span>
                    <h1 className="text-md md:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-snug">
                      {selectedTicket.subject}
                    </h1>
                  </div>
                  <TicketStatusBadge status={selectedTicket.status} />
                </div>

                <div className="text-xs font-medium text-slate-700 dark:text-[#cbd5e1] leading-relaxed bg-slate-50 dark:bg-[#162032] p-4 border-slate-100 dark:border-[#283548] rounded-lg whitespace-pre-line">
                  {selectedTicket.description}
                </div>

                {/* Attachments */}
                {selectedTicket.attachments && selectedTicket.attachments.filter(a => !a.ticketCommentId).length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[9px] font-black text-slate-405 dark:text-[#7c8ca2] uppercase tracking-widest block">Reference Attachments</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket.attachments.filter(a => !a.ticketCommentId).map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border-slate-100 dark:border-[#334155] rounded-md bg-slate-50 dark:bg-[#0f172a] hover:bg-slate-100/50 dark:hover:bg-[#283548] text-[10px] font-bold text-slate-700 dark:text-[#b0bccc] transition-colors"
                        >
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{att.fileName}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-[#283548] text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Requester</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">{selectedTicket.requester.firstName} {selectedTicket.requester.lastName}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Raised Date</span>
                    <span className="font-bold text-slate-600 dark:text-[#cbd5e1]">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Priority</span>
                    <span className={`font-black uppercase tracking-wider ${selectedTicket.priority === 'High' ? 'text-rose-600' : selectedTicket.priority === 'Medium' ? 'text-amber-500' : 'text-slate-500'
                      }`}>{selectedTicket.priority}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Assigned Staff</span>
                    {isStaffOrAdmin ? (
                      <select
                        value={selectedTicket.assignedTo?.id || ''}
                        onChange={(e) => handleAssign(e.target.value)}
                        className="bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] rounded px-2 py-0.5 text-xs outline-none cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {staffList.map((st) => (
                          <option key={st.id} value={st.id}>{st.fullName}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-slate-600 dark:text-[#cbd5e1]">{selectedTicket.assignedTo ? `${selectedTicket.assignedTo.firstName} ${selectedTicket.assignedTo.lastName}` : 'Not assigned'}</span>
                    )}
                  </div>
                </div>

                {/* Status Transitions */}
                {isStaffOrAdmin && (
                  <div className="pt-4 border-t border-slate-100 dark:border-[#283548] flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStatusChange('InProgress')}
                      disabled={selectedTicket.status === 'InProgress'}
                      className="py-1 px-3 border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#0f172a] font-bold text-[9px] uppercase tracking-wider rounded transition-all disabled:opacity-40 text-slate-600 dark:text-[#cbd5e1]"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange('Pending')}
                      disabled={selectedTicket.status === 'Pending'}
                      className="py-1 px-3 border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#0f172a] font-bold text-[9px] uppercase tracking-wider rounded transition-all disabled:opacity-40 text-slate-600 dark:text-[#cbd5e1]"
                    >
                      Mark Pending
                    </button>
                    <button
                      onClick={() => handleStatusChange('Resolved')}
                      disabled={selectedTicket.status === 'Resolved'}
                      className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase tracking-wider rounded transition-all disabled:opacity-40"
                    >
                      Resolve Issue
                    </button>
                    <button
                      onClick={() => handleStatusChange('Closed')}
                      disabled={selectedTicket.status === 'Closed'}
                      className="py-1 px-3 bg-slate-900 dark:bg-[#283548] hover:bg-slate-800 text-white font-bold text-[9px] uppercase tracking-wider rounded transition-all disabled:opacity-40"
                    >
                      Close Ticket
                    </button>
                  </div>
                )}

                {!isStaffOrAdmin && (selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed') && (
                  <button
                    onClick={() => handleStatusChange('Reopened')}
                    className="w-full py-2 bg-rose-50 border-rose-100 hover:bg-rose-100/50 text-rose-700 font-bold text-[10px] uppercase tracking-wider rounded transition-all"
                  >
                    Reopen Support Ticket
                  </button>
                )}
              </div>

              {/* Discussion Timeline */}
              <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#334155] rounded-[10px] p-6 shadow-sm space-y-4">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Conversation Feed</span>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {selectedTicket.comments && selectedTicket.comments.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-xs font-semibold">No messages or replies yet.</p>
                  ) : (
                    selectedTicket.comments?.map((comment) => {
                      const isStaffComment = comment.user.role.toLowerCase() === 'staff' || comment.user.role.toLowerCase() === 'admin' || comment.user.role.toLowerCase() === 'principal';
                      return (
                        <div
                          key={comment.id}
                          className={`flex gap-3 max-w-[90%] ${isStaffComment ? 'mr-auto' : 'ml-auto flex-row-reverse'
                            }`}
                        >
                          <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-white flex-shrink-0 shadow-sm ${isStaffComment ? 'bg-indigo-500' : 'bg-slate-700 dark:bg-[#334155]'
                            }`}>
                            {comment.user.firstName[0]}
                          </div>

                          <div className="space-y-1">
                            <div className={`flex items-center gap-1.5 text-[8px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider ${isStaffComment ? '' : 'justify-end'
                              }`}>
                              <span>{comment.user.firstName} {comment.user.lastName}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-[#475569]"></span>
                              <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {comment.isInternal && (
                                <span className="text-[7px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-1 rounded uppercase">Staff Note</span>
                              )}
                            </div>

                            <div className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line ${comment.isInternal
                              ? 'bg-amber-50/50 dark:bg-amber-500/15 border-amber-100 dark:border-amber-400/25 text-slate-700 dark:text-[#e2e8f0]'
                              : isStaffComment
                                ? 'bg-slate-50 dark:bg-[#0f172a] border-slate-100 dark:border-[#283548] text-slate-800 dark:text-[#f1f5f9]'
                                : 'bg-primary text-white border-primary/20'
                              }`}>
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Reply Form */}
              {!isTicketClosed ? (
                <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#334155] rounded-[10px] p-6 shadow-sm">
                  <form onSubmit={handlePostReply} className="space-y-4">
                    <textarea
                      rows={3}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Enter Reply Message"
                      className="w-full bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] rounded-md px-3 py-2 text-slate-800 dark:text-white text-xs outline-none focus:border-primary transition-all resize-none shadow-sm"
                    />

                    {attachmentsData.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachmentsData.map((att, idx) => (
                          <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 border-slate-100 dark:border-[#334155] rounded-md bg-slate-50 dark:bg-[#283548] text-[9px] font-bold text-slate-600 dark:text-[#cbd5e1]">
                            <Paperclip className="w-3 h-3 text-slate-400 dark:text-[#64748b]" />
                            <span className="truncate max-w-[100px]">{att.fileName}</span>
                            <button
                              type="button"
                              onClick={() => setAttachmentsData((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploadingAttachment}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white uppercase tracking-widest cursor-pointer"
                          >
                            {uploadingAttachment ? (
                              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            Attach File
                          </button>
                        </div>

                        {isStaffOrAdmin && (
                          <label className="inline-flex items-center gap-1.5 text-[9px] font-black text-amber-700 uppercase tracking-widest cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isInternal}
                              onChange={(e) => setIsInternal(e.target.checked)}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-3 h-3 cursor-pointer"
                            />
                            Internal Note
                          </label>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingReply || uploadingAttachment || !replyContent.trim()}
                        className="py-2 px-4 bg-primary text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {submittingReply ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" /> Post Reply
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-[#0f172a] border-slate-100 dark:border-[#334155] rounded-[10px] p-4 text-slate-500 dark:text-[#94a3b8] text-xs font-semibold">
                  <p className="font-bold text-slate-705 dark:text-[#b0bccc] uppercase tracking-wider text-[9px]">This support ticket is closed</p>
                  <p className="leading-relaxed mt-1">This ticket has been resolved and closed. If your problem is not yet fully fixed, you can trigger a reopened transition using the Reopen button above.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showManageCategoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#162032] flex justify-between items-center bg-slate-50 dark:bg-[#020617]">
              <h2 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-white">
                Manage Support Categories
              </h2>
              <button
                type="button"
                onClick={() => setShowManageCategoriesModal(false)}
                className="text-slate-400 dark:text-[#64748b] hover:text-rose-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* List of existing categories */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 dark:text-[#64748b] uppercase font-bold tracking-wider">Existing Categories</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#020617] border-slate-100 dark:border-[#162032] rounded-xl text-xs">
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-[#e2e8f0]">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#64748b] block">{cat.description || 'No description'}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1 hover:text-rose-500 text-slate-400 dark:text-[#64748b] transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Category Form */}
              <form onSubmit={handleCreateCategory} className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#162032]">
                <span className="text-[10px] text-slate-400 dark:text-[#64748b] uppercase font-bold tracking-wider">Create New Category</span>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-[#94a3b8] block font-bold uppercase">Category Name</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full p-2 bg-slate-55 dark:bg-[#020617] border-slate-200 dark:border-[#1e293b] rounded font-semibold text-xs text-slate-800 dark:text-[#f1f5f9] focus:outline-none focus:border-primary"
                    placeholder="Enter Category Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-[#94a3b8] block font-bold uppercase">Description</label>
                  <textarea
                    rows={2}
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full p-2 bg-slate-55 dark:bg-[#020617] border-slate-200 dark:border-[#1e293b] rounded font-semibold text-xs text-slate-800 dark:text-[#f1f5f9] focus:outline-none focus:border-primary resize-none"
                    placeholder="Enter Category Description"
                  />
                </div>
                <button
                  type="submit"
                  disabled={categorySaving}
                  className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm"
                >
                  {categorySaving ? 'Creating...' : 'Create Category'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketList;
