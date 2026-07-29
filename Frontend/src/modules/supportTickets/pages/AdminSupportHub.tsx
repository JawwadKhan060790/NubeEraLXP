import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  Clock,
  ListTodo,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Award,
  Loader2
} from 'lucide-react';
import { supportService } from '@/services/supportService';
import type { SupportAnalytics, TicketCategory } from '@/services/supportService';
import StatGrid from '@/components/StatGrid';

export const AdminSupportHub: React.FC = () => {
  const [analytics, setAnalytics] = useState<SupportAnalytics | null>(null);
  const [categories, setCategories] = useState<TicketCategory[]>([]);

  // Category Form Creation
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [anData, catData] = await Promise.all([
        supportService.getAnalytics(),
        supportService.getCategories()
      ]);
      setAnalytics(anData);
      setCategories(catData);
    } catch (e) {
      toast.error('Failed to load support hub data. Admin privileges required.');
      navigate('/support/tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      setCreating(true);
      await supportService.createCategory(catName, catDesc);
      toast.success(`Category '${catName}' created successfully.`);
      setCatName('');
      setCatDesc('');

      // Reload lists
      const cats = await supportService.getCategories();
      setCategories(cats);

      const anData = await supportService.getAnalytics();
      setAnalytics(anData);
    } catch (err) {
      toast.error('Failed to create category.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category? All associated tickets will require a category reassignment.')) return;

    try {
      await supportService.deleteCategory(catId);
      toast.success('Category deleted successfully.');

      // Reload lists
      const cats = await supportService.getCategories();
      setCategories(cats);
    } catch (e) {
      toast.error('Failed to delete category.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-600">Gathering SLA Metrics...</p>
      </div>
    );
  }

  if (!analytics) return null;

  // Status mapping logic
  const getCountByStatus = (statusStr: string): number => {
    return analytics.statusCounts.find((s) => s.status.toLowerCase() === statusStr.toLowerCase())?.count || 0;
  };

  const stats = [
    { title: 'Total Issues', value: analytics.totalTickets, icon: <ListTodo />, color: 'indigo' as const, subtitle: 'All submitted tickets' },
    { title: 'In Progress', value: getCountByStatus('InProgress'), icon: <Clock />, color: 'amber' as const, subtitle: 'Being worked on' },
    { title: 'Resolved Issues', value: getCountByStatus('Resolved'), icon: <CheckSquare />, color: 'emerald' as const, subtitle: 'Completed tickets' },
    { title: 'Avg Resolution Time', value: `${analytics.avgResolutionHours} hrs`, icon: <TrendingUp />, color: 'purple' as const, subtitle: 'Mean time to resolve' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Header and Go-back button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/support/tickets')}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Support Grid
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Support & SLA Admin Hub</h1>
          <p className="text-xs text-slate-500 font-medium">Analyze ticket resolution SLA KPIs, configure system categories, and track staff leaderboard performance.</p>
        </div>
      </div>

      {/* SLA Core Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatGrid stats={stats} loading={loading} />
      </div>

      {/* Main split: left category settings, right leaderboard list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Side: Category Administration Configurator */}
        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(15,23,42,0.01)] space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Category Management</h3>
              </div>
            </div>

            {/* Create Category form inline card */}
            <form onSubmit={handleCreateCategory} className="p-5 border-slate-100 bg-slate-50/50 rounded-2xl space-y-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block leading-none">Configure New Category</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Enter Category Name"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="bg-white border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Enter Category Description"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="bg-white border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating || !catName.trim()}
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {creating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Create Category
                </button>
              </div>
            </form>

            {/* Active configured categories grid */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none px-1">Active configured categories</span>

              <div className="divide-y divide-slate-50 border-slate-100 rounded-2xl overflow-hidden">
                {categories.length === 0 ? (
                  <p className="p-4 text-center text-xs font-bold text-slate-400">No categories found.</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center p-4 hover:bg-slate-50/30 transition-colors">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-900 leading-none">{cat.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{cat.description || 'No description provided.'}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Staff SLA leaderboard & charts */}
        <div className="space-y-6">

          {/* Leaderboard panel */}
          <div className="bg-white border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(15,23,42,0.01)] space-y-5">

            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <Award className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">SLA Staff Leaderboard</h3>
            </div>

            {analytics.leaderboard.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-center text-slate-400 border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-slate-400 mr-1.5 stroke-1" />
                <span className="text-xs font-bold">No issues resolved yet.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.leaderboard.map((member, idx) => {
                  const colors = [
                    'from-amber-100 to-amber-200 text-amber-800 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)] dark:text-amber-200 dark:border-amber-400/30 dark:shadow-[0_0_8px_rgba(245,158,11,0.25)]',
                    'from-slate-200 to-slate-300 text-slate-700 border-slate-300 dark:text-slate-200 dark:border-slate-400/25',
                    'from-orange-100 to-orange-200 text-orange-800 border-orange-300 dark:text-orange-200 dark:border-orange-400/30',
                  ];

                  return (
                    <div key={idx} className="flex justify-between items-center p-4 border-slate-50 rounded-2xl hover:border-slate-100 hover:bg-slate-50/20 dark:hover:bg-white/5 transition-all flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${colors[idx] || 'bg-slate-50 border-slate-100 text-slate-600'}`}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-xs font-bold text-slate-800">{member.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-full border-blue-100 dark:text-blue-300 dark:bg-blue-500/15 dark:border-blue-400/25">
                        {member.resolvedCount} Resolved
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Quick tips panel */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="space-y-1">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] block">SLA Resolution tip</span>
              <h4 className="text-xs font-bold uppercase tracking-wider">Keep resolution times low!</h4>
            </div>

            <p className="text-[11px] text-slate-300 dark:text-slate-400 leading-relaxed font-semibold">
              Always update ticket statuses to 'In Progress' immediately when working on them. Set clear internal staff notes to summarize progress so backup staff can coordinate seamlessly in case of emergencies.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminSupportHub;
