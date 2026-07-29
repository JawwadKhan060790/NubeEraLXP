import type { Attachment, TicketCategory } from '@/services/supportService';
import { supportService } from '@/services/supportService';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  UploadCloud
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const RaiseTicket: React.FC = () => {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('Medium'); // Low, Medium, High
  const [attachments, setAttachments] = useState<Omit<Attachment, 'id' | 'createdAt'>[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await supportService.getCategories();
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id);
      } catch (e) {
        toast.error('Failed to load support categories.');
      }
    };
    loadCategories();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // File validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds the 5MB attachment size limit.');
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
      toast.success(`${file.name} attached successfully!`);
    } catch (err) {
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      toast.error('Subject/Title is required.');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a detailed description of the issue.');
      return;
    }
    if (!categoryId) {
      toast.error('Please select an issue category.');
      return;
    }

    try {
      setLoading(true);
      const res = await supportService.createTicket({
        subject,
        description,
        priority,
        categoryId,
        attachments
      });

      toast.success(`Support Ticket raised successfully: ${res.ticketNumber}`);
      navigate(`/support/tickets/${res.ticketId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit support ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">

      {/* Upper Navigation Header */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <div className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-[0.2em] bg-slate-50 dark:bg-[#283548] border-slate-100 dark:border-[#334155] rounded-full px-3 py-1 shadow-sm">
          Portal Support Center
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-[#283548] rounded-3xl shadow-[0_8px_30px_rgb(15,23,42,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">

        {/* Card Banner */}
        <div className="p-8 border-b border-slate-100 dark:border-[#283548] bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20 dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-purple-500/5 relative">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-400/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100/80 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-300 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Raise Support Ticket</h2>
              <p className="text-xs text-slate-500 dark:text-[#94a3b8] font-medium">Need help with robotics kits, grades, or LXP resources? Report it here.</p>
            </div>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {/* Grid fields for Category & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-[#e2e8f0] uppercase tracking-widest">Issue Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-xl px-4 py-3 text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:border-blue-500 transition-all cursor-pointer h-[46px] shadow-sm"
              >
                {categories.length === 0 ? (
                  <option value="">Loading categories...</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-[#e2e8f0] uppercase tracking-widest">Urgency Priority *</label>
              <div className="grid grid-cols-3 gap-2">
                {['Low', 'Medium', 'High'].map((p) => {
                  const isActive = priority === p;
                  const colors: Record<string, string> = {
                    Low: 'border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#283548] bg-white dark:bg-[#1e293b]',
                    Medium: 'border-amber-200 dark:border-amber-400/25 text-amber-700 dark:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/15 bg-white dark:bg-[#1e293b]',
                    High: 'border-rose-200 dark:border-rose-400/25 text-rose-700 dark:text-rose-300 hover:bg-rose-50/50 dark:hover:bg-rose-500/15 bg-white dark:bg-[#1e293b]'
                  };
                  const activeColors: Record<string, string> = {
                    Low: 'bg-slate-100 dark:bg-[#283548] border-slate-300 dark:border-[#334155] text-slate-800 dark:text-white font-bold',
                    Medium: 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-400/25 text-amber-800 dark:text-amber-300 font-bold',
                    High: 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-400/25 text-rose-800 dark:text-rose-300 font-bold'
                  };

                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`h-[46px] rounded-xl text-xs font-bold tracking-wider transition-all cursor-pointer shadow-sm ${isActive ? activeColors[p] : colors[p]
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Subject field */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 dark:text-[#e2e8f0] uppercase tracking-widest">Subject / Issue Title *</label>
            <input
              type="text"
              placeholder="Enter Subject / Issue Title"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-xl px-4 py-3 text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:border-blue-500 transition-all h-[46px] shadow-sm"
            />
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 dark:text-[#e2e8f0] uppercase tracking-widest">Detailed Description *</label>
            <textarea
              rows={6}
              placeholder="Enter Detailed Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-2xl px-4 py-3 text-slate-800 dark:text-white text-sm font-medium focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed shadow-sm"
            />
          </div>

          {/* File Upload / Attachments Area */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-700 dark:text-[#e2e8f0] uppercase tracking-widest">Reference Attachments (Max 5MB per file)</label>

            {/* Drag & Drop Card */}
            <div className="border-2 border-dashed border-slate-200 dark:border-[#334155] rounded-2xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/10 dark:hover:bg-blue-500/10 transition-all relative group cursor-pointer">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-xs font-bold text-blue-600">Uploading reference file...</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 dark:text-[#64748b] group-hover:text-blue-500 transition-colors" />
                    <p className="text-xs font-bold text-slate-600 dark:text-[#cbd5e1]">Drag or click to choose files to attach</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#64748b] font-semibold uppercase tracking-wider">PDF, JPG, PNG, GIF, WEBP, or SVG</p>
                  </>
                )}
              </div>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2 mt-4">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-3 border-slate-100 dark:border-[#283548] rounded-xl bg-slate-50/50 dark:bg-[#283548]/50">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-[#e2e8f0] font-semibold text-xs truncate max-w-md">
                      <Paperclip className="w-4 h-4 text-slate-400 dark:text-[#64748b]" />
                      <span className="truncate">{att.fileName}</span>
                      <span className="text-[9px] text-slate-400 dark:text-[#64748b] font-bold bg-slate-100 dark:bg-[#334155] px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {Math.round(att.fileSize / 1024)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1.5 text-slate-400 dark:text-[#64748b] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#283548]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="py-3 px-6 border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#283548] font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Submit Support Ticket
                </>
              )}
            </button>
          </div>

        </form>
      </div>


    </div>
  );
};

export default RaiseTicket;
