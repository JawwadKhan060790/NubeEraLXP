import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Paperclip,
  Send,
  Activity,
  Lock,
  FileCheck,
  RefreshCw,
  FolderOpen,
  Calendar,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supportService } from '@/services/supportService';
import type {
  Ticket,
  Attachment
} from '@/services/supportService';
import TicketStatusBadge from '@/components/support/TicketStatusBadge';
import api from '@/services/api';

export const TicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [staffList, setStaffList] = useState<{ id: string; fullName: string }[]>([]);

  // Comment Creation States
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<Omit<Attachment, 'id' | 'createdAt'>[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const navigate = useNavigate();

  const loadTicket = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await supportService.getTicketDetail(id);

      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          const role = u.utype?.toLowerCase() || 'student';
          const isStaffOrAdmin = role === 'admin' || role === 'superadmin' || role === 'staff' || role === 'principal';

          if (!isStaffOrAdmin) {
            const isOwnTicket = data.requester?.id === u.id || data.requester?.email?.toLowerCase() === u.email?.toLowerCase();
            if (!isOwnTicket) {
              toast.error('You are not authorized to view this support ticket.');
              navigate('/support/tickets');
              return;
            }
          }
        } catch (_) { }
      }

      setTicket(data);
    } catch (e) {
      toast.error('Failed to load support ticket details.');
      navigate('/support/tickets');
    } finally {
      setLoading(false);
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
        setUserRole(u.utype?.toLowerCase() || 'student');
      } catch (e) {
        setUserRole('student');
      }
    }

    loadTicket();
  }, [id]);

  useEffect(() => {
    const isStaffOrAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || userRole === 'principal';
    if (isStaffOrAdmin) {
      loadStaff();
    }
  }, [userRole]);

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
      setUploading(true);
      const res = await supportService.uploadAttachment(file);

      const newAttachment = {
        fileName: file.name,
        fileUrl: res.url,
        fileType: file.type || extension,
        fileSize: file.size
      };

      setAttachments((prev) => [...prev, newAttachment]);
      toast.success(`${file.name} uploaded successfully.`);
    } catch (err) {
      toast.error('Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !replyContent.trim()) return;

    try {
      setSubmitting(true);
      await supportService.postComment(id, {
        content: replyContent,
        isInternal: isInternal && isStaffOrAdmin,
        attachments
      });

      toast.success(isInternal ? 'Internal staff note added.' : 'Public reply posted.');
      setReplyContent('');
      setAttachments([]);
      setIsInternal(false);

      // Reload ticket detail timeline
      const data = await supportService.getTicketDetail(id);
      setTicket(data);
    } catch (err: any) {
      toast.error('Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (staffId: string) => {
    if (!id || !staffId) return;
    try {
      await supportService.assignTicket(id, staffId);
      toast.success('Ticket assignee updated successfully.');
      const data = await supportService.getTicketDetail(id);
      setTicket(data);
    } catch (e) {
      toast.error('Failed to assign ticket.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await supportService.updateStatus(id, newStatus);
      toast.success(`Ticket status updated to: ${newStatus}`);
      const data = await supportService.getTicketDetail(id);
      setTicket(data);
    } catch (e) {
      toast.error('Failed to update ticket status.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-600 dark:text-[#cbd5e1]">Syncing issue status...</p>
      </div>
    );
  }

  if (!ticket) return null;

  const isStaffOrAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || userRole === 'principal';
  const isTicketClosed = ticket.status === 'Closed';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <button
          onClick={() => navigate('/support/tickets')}
          className="inline-flex items-center gap-2 text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Support Tickets
        </button>
        <div className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest bg-slate-50 dark:bg-[#283548] border-slate-100 dark:border-[#334155] rounded-full px-3 py-1 shadow-sm">
          Ticket ID: {ticket.ticketNumber}
        </div>
      </div>

      {/* Main Split Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Column: Conversation and replies */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Ticket Banner Body */}
          <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#283548] rounded-3xl p-8 shadow-[0_8px_30px_rgb(15,23,42,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded uppercase tracking-wider">
                  {ticket.category.name}
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-snug tracking-tight">
                  {ticket.subject}
                </h1>
              </div>
              <TicketStatusBadge status={ticket.status} />
            </div>

            <div className="text-sm font-medium text-slate-700 dark:text-[#cbd5e1] leading-relaxed bg-slate-50/50 dark:bg-[#283548]/50 p-5 border-slate-100 dark:border-[#283548] rounded-2xl whitespace-pre-line">
              {ticket.description}
            </div>

            {/* Reference attachments if any */}
            {ticket.attachments && ticket.attachments.filter(a => !a.ticketCommentId).length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block">Reference Attachments</span>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.filter(a => !a.ticketCommentId).map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 border-slate-100 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#283548] hover:bg-slate-100/50 dark:hover:bg-[#334155]/50 text-xs font-bold text-slate-700 dark:text-[#cbd5e1] transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b]" />
                      <span className="truncate max-w-[150px]">{att.fileName}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversation Feed */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-widest block px-1">Replies & Discussion</span>

            {ticket.comments && ticket.comments.length === 0 ? (
              <div className="bg-slate-50/50 dark:bg-[#1e293b]/50 border-slate-100 dark:border-[#283548] rounded-2xl p-8 text-center text-slate-400 dark:text-[#64748b]">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-[#475569] stroke-1" />
                <p className="text-xs font-bold">No replies yet</p>
                <p className="text-[10px] text-slate-400 dark:text-[#64748b]">Ask a question or reply below to start the support session.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ticket.comments?.map((comment) => {
                  const isStaffComment = comment.user.role.toLowerCase() === 'staff' || comment.user.role.toLowerCase() === 'admin' || comment.user.role.toLowerCase() === 'principal';

                  return (
                    <div
                      key={comment.id}
                      className={`flex gap-3 max-w-[85%] ${isStaffComment ? 'mr-auto' : 'ml-auto flex-row-reverse'
                        }`}
                    >
                      {/* Avatar initial */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-white flex-shrink-0 shadow-sm ${isStaffComment ? 'bg-indigo-500' : 'bg-slate-700 dark:bg-[#334155]'
                        }`}>
                        {comment.user.firstName[0]}
                      </div>

                      {/* Msg bubble container */}
                      <div className="space-y-1">

                        {/* Header details */}
                        <div className={`flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider ${isStaffComment ? '' : 'justify-end'
                          }`}>
                          <span>{comment.user.firstName} {comment.user.lastName}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-[#475569]"></span>
                          <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                          {comment.isInternal && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-1 py-0.2 rounded uppercase tracking-wider">
                              <Lock className="w-2.5 h-2.5" /> Staff Note
                            </span>
                          )}
                        </div>

                        {/* Bubble box */}
                        <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-line shadow-[0_2px_10px_rgba(0,0,0,0.01)] ${comment.isInternal
                            ? 'bg-amber-50/50 dark:bg-amber-500/15 border-amber-100 dark:border-amber-400/25 text-slate-700 dark:text-[#e2e8f0]'
                            : isStaffComment
                              ? 'bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#283548] text-slate-800 dark:text-white'
                              : 'bg-blue-600 border-blue-500 text-white'
                          }`}>
                          {comment.content}

                          {/* Attached files */}
                          {ticket.attachments && ticket.attachments.filter(a => a.ticketCommentId === comment.id).length > 0 && (
                            <div className="space-y-1 pt-3 mt-3 border-t border-slate-100/50 dark:border-[#283548]/50">
                              <div className="flex flex-col gap-1.5">
                                {ticket.attachments.filter(a => a.ticketCommentId === comment.id).map((att) => (
                                  <a
                                    key={att.id}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold w-fit truncate max-w-[200px] transition-colors ${isStaffComment
                                        ? 'bg-slate-50 dark:bg-[#283548] border-slate-100 dark:border-[#334155] hover:bg-slate-100/50 dark:hover:bg-[#334155]/50 text-slate-700 dark:text-[#cbd5e1]'
                                        : 'bg-blue-700 border-blue-600 hover:bg-blue-800 text-white'
                                      }`}
                                  >
                                    <Paperclip className="w-3 h-3 flex-shrink-0 opacity-70" />
                                    <span className="truncate">{att.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Reply Text Form Area */}
          {!isTicketClosed ? (
            <div className="bg-white border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(15,23,42,0.01)]">
              <form onSubmit={handlePostReply} className="space-y-4">
                <textarea
                  rows={4}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Enter Reply Message"
                  className="w-full bg-white border-slate-200 rounded-2xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed shadow-sm"
                />
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 border-slate-100 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#283548] text-[10px] font-bold text-slate-600 dark:text-[#cbd5e1]">
                        <Paperclip className="w-3 h-3 text-slate-400 dark:text-[#64748b]" />
                        <span className="truncate max-w-[100px]">{att.fileName}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom line controls */}
                <div className="flex justify-between items-center pt-2">

                  <div className="flex items-center gap-4">
                    {/* Secure upload clip */}
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        {uploading ? (
                          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        ) : (
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b]" />
                        )}
                        Attach File
                      </button>
                    </div>

                    {/* Confid staff checkbox */}
                    {isStaffOrAdmin && (
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-700 hover:text-amber-800 uppercase tracking-widest cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                        />
                        Internal Note
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || uploading || !replyContent.trim()}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Post Reply
                      </>
                    )}
                  </button>

                </div>

              </form>

            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#283548] border-slate-100 dark:border-[#334155] rounded-2xl p-5 flex gap-3 text-slate-500 dark:text-[#94a3b8] text-xs font-semibold">
              <AlertCircle className="w-5 h-5 text-slate-400 dark:text-[#64748b] mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-bold text-slate-700 dark:text-[#e2e8f0] uppercase tracking-wider text-[10px]">This support ticket is closed</p>
                <p className="leading-relaxed">This ticket has been resolved and closed. If your problem is not yet fully fixed, you can trigger a reopened transition using the Reopen sidebar command.</p>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Metadata details, assignees, transitions */}
        <div className="space-y-6">

          {/* Metadata Grid Card */}
          <div className="bg-white border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(15,23,42,0.01)] space-y-5">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2">Ticket Metadata</span>

            {/* Requester Profile Info */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Requester</label>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border-slate-100 flex items-center justify-center text-slate-650 text-xs font-bold uppercase shadow-sm">
                  {ticket.requester.firstName[0]}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 leading-none">
                    {ticket.requester.firstName} {ticket.requester.lastName}
                  </div>
                  <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                    {ticket.requester.role || 'User'}
                  </div>
                </div>
              </div>
            </div>

            {/* Created date & resolved date details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Raised On</label>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
              </div>

              {ticket.resolvedAt && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block">Resolved On</label>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                    {new Date(ticket.resolvedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>

            {/* Priority Indicator selection */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Priority Urgency</label>
              <span className={`text-xs font-black uppercase tracking-wider ${ticket.priority === 'High' ? 'text-rose-600' : ticket.priority === 'Medium' ? 'text-amber-600' : 'text-slate-600'
                }`}>
                {ticket.priority}
              </span>
            </div>

            {/* Assignee trigger drop-down */}
            <div className="space-y-2 pt-2 border-t border-slate-50">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assigned Staff</label>

              {isStaffOrAdmin ? (
                <div className="relative">
                  <select
                    value={ticket.assignedTo?.id || ''}
                    onChange={(e) => handleAssign(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-xs font-bold cursor-pointer transition-all outline-none"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>{st.fullName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Not assigned yet'}
                </div>
              )}
            </div>

          </div>

          {/* Quick Transition workflow status buttons */}
          <div className="bg-white border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(15,23,42,0.01)] space-y-4">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2">Status Actions</span>

            {/* Reopen Action button for standard users if closed/resolved */}
            {!isStaffOrAdmin && (ticket.status === 'Resolved' || ticket.status === 'Closed') && (
              <button
                onClick={() => handleStatusChange('Reopened')}
                className="w-full py-2.5 bg-rose-50 border-rose-100 hover:bg-rose-100/50 text-rose-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Reopen Ticket
              </button>
            )}

            {/* Admin transitions list */}
            {isStaffOrAdmin ? (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Update Ticket State</label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusChange('InProgress')}
                    disabled={ticket.status === 'InProgress'}
                    className="py-2 border-slate-200 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer text-slate-650"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleStatusChange('Pending')}
                    disabled={ticket.status === 'Pending'}
                    className="py-2 border-slate-200 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer text-slate-650"
                  >
                    Pending
                  </button>
                </div>

                <button
                  onClick={() => handleStatusChange('Resolved')}
                  disabled={ticket.status === 'Resolved'}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-500/20 disabled:opacity-50 mt-1"
                >
                  <FileCheck className="w-4 h-4" /> Resolve Issue
                </button>

                <button
                  onClick={() => handleStatusChange('Closed')}
                  disabled={ticket.status === 'Closed'}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <Lock className="w-4 h-4" /> Close Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Current Status</label>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ticket status is actively: <span className="font-extrabold text-blue-600">{ticket.status}</span>
                </div>
              </div>
            )}

          </div>

          {/* Audit trail / History logs */}
          {ticket.history && ticket.history.length > 0 && (
            <div className="bg-white border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(15,23,42,0.01)] space-y-4">

              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2">Audit Trail Logs</span>

              <div className="space-y-4 max-h-[250px] overflow-y-auto no-scrollbar pr-1">
                {ticket.history.map((hist) => (
                  <div key={hist.id} className="flex gap-2.5 items-start text-[11px]">
                    <Activity className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-750 leading-relaxed">
                        <span className="font-extrabold text-slate-900">{hist.user.firstName}</span> {hist.action}
                      </p>
                      {hist.newValue && (
                        <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider leading-none">
                          {hist.newValue}
                        </p>
                      )}
                      <span className="text-[9px] text-slate-400 font-bold block pt-0.5">
                        {new Date(hist.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default TicketDetails;
