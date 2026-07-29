import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package, RefreshCw, Calendar, ShoppingBag, ChevronRight,
  Truck, CheckCircle2, Clock, XCircle, Star, ArrowRight,
  RotateCcw, LayoutGrid, List, Search, MapPin, ChevronLeft
} from 'lucide-react';
import { ecommerceService } from '@/services/ecommerceService';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: string; bar: string; progress: number }> = {
  'Order Placed': { label: 'Order Placed', icon: <ShoppingBag className="w-3 h-3" />, badge: 'bg-blue-100 text-blue-700 border-blue-200', bar: 'from-blue-400 to-blue-500', progress: 20 },
  'Confirmed': { label: 'Confirmed', icon: <Clock className="w-3 h-3" />, badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', bar: 'from-indigo-400 to-indigo-500', progress: 40 },
  'Packed': { label: 'Packed', icon: <Package className="w-3 h-3" />, badge: 'bg-violet-100 text-violet-700 border-violet-200', bar: 'from-violet-400 to-violet-500', progress: 60 },
  'Out for Delivery': { label: 'Out for Delivery', icon: <Truck className="w-3 h-3" />, badge: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'from-amber-400 to-amber-500', progress: 80 },
  'Delivered': { label: 'Delivered', icon: <CheckCircle2 className="w-3 h-3" />, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'from-emerald-400 to-emerald-500', progress: 100 },
  'Cancelled': { label: 'Cancelled', icon: <XCircle className="w-3 h-3" />, badge: 'bg-rose-100 text-rose-700 border-rose-200', bar: 'from-rose-400 to-rose-500', progress: 0 },
};
const getSC = (s: string) => STATUS_CONFIG[s] ?? { label: s, icon: <Clock className="w-3 h-3" />, badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'from-slate-300 to-slate-400', progress: 10 };

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const fetchOrders = async () => {
    try {
      const data = await ecommerceService.getMyOrders();
      setOrders(data.map((o: any) => ({
        id: o.id || o.Id,
        orderNumber: o.order_number || o.orderNumber || o.OrderNumber,
        studentName: o.student_name || o.studentName || o.StudentName,
        status: o.status || o.Status,
        createdAt: o.created_at || o.createdAt || o.CreatedAt,
        schoolName: o.school_name || o.schoolName || o.SchoolName,
        totalAmount: o.total_amount || o.totalAmount || o.TotalAmount,
        itemsCount: o.items_count || o.itemsCount || o.ItemsCount,
      })));
    } catch { toast.error('Could not load order history.'); }
    finally { setLoading(false); }
  };

  // Helper to format dates
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      await ecommerceService.reorder(orderId);
      toast.success('Items added to your cart!');
      window.dispatchEvent(new Event('cartUpdated'));
      navigate('/shop/cart');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reorder failed.');
    } finally { setReorderingId(null); }
  };

  // Search + filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(o =>
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q) ||
      (o.schoolName || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page on search
  useEffect(() => { setPage(1); }, [search]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm font-semibold">Loading your orders...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">

      {/* Header */}
      <div className="vt-page-header">
        <div>
          <h1 className="vt-page-title">My Orders</h1>
          <p className="vt-page-subtitle">Track, reorder, and review your STEM kit purchases</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-sm font-bold text-slate-600">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <span>{orders.length} {orders.length === 1 ? 'Order' : 'Orders'}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number, status, school..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 shadow-sm transition-all"
          />
        </div>

        {/* View toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-base font-black text-slate-900 mb-1">
            {search ? 'No orders match your search' : 'No Orders Yet'}
          </h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mb-5">
            {search ? 'Try a different keyword.' : 'Explore our STEM catalog and place your first order!'}
          </p>
          {!search && (
            <Link to="/shop/products" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black rounded-xl shadow-md hover:-translate-y-0.5 transition-all">
              Browse Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : viewMode === 'list' ? (

        /* ── LIST VIEW ─────────────────────────────────────────── */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">School</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((o, idx) => {
                const sc = getSC(o.status);
                return (
                  <tr key={o.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/20'}`}>
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-900">{o.orderNumber}</div>
                      <div className="text-slate-400 font-normal">{o.itemsCount} item{o.itemsCount !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-900">{o.studentName ?? '—'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1 text-slate-600 font-semibold">
                        <MapPin className="w-3 h-3 text-slate-400" />{o.schoolName || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-semibold">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${sc.badge}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-slate-900">₹{Number(o.totalAmount ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/shop/orders/tracking/${o.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[10px] rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all uppercase tracking-wider"
                        >
                          <Truck className="w-3 h-3" /> Track
                        </button>
                        <button
                          onClick={() => handleReorder(o.id)}
                          disabled={reorderingId === o.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-slate-200 text-slate-600 font-black text-[10px] rounded-lg hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all uppercase tracking-wider disabled:opacity-50"
                        >
                          {reorderingId === o.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Reorder
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      ) : (

        /* ── CARD / GRID VIEW ──────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginated.map(o => {
            const sc = getSC(o.status);
            const isDelivered = o.status === 'Delivered';
            const isCancelled = o.status === 'Cancelled';
            return (
              <div key={o.id} className="group bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                {/* Accent bar */}
                <div className={`h-1 bg-gradient-to-r ${sc.bar}`} />

                <div className="p-5 flex-1 flex flex-col gap-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDelivered ? 'bg-emerald-50' : isCancelled ? 'bg-rose-50' : 'bg-blue-50'}`}>
                      {isDelivered ? <Star className="w-5 h-5 text-emerald-500" /> : isCancelled ? <XCircle className="w-5 h-5 text-rose-400" /> : <Package className="w-5 h-5 text-blue-500" />}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${sc.badge}`}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>

                  {/* Order info */}
                  <div>
                    <p className="font-black text-slate-900 text-sm">{o.orderNumber}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(o.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {o.schoolName && (
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{o.schoolName}
                      </p>
                    )}
                  </div>

                  {/* Progress */}
                  {!isCancelled && (
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        <span>Progress</span><span>{sc.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${sc.bar} rounded-full transition-all duration-700`} style={{ width: `${sc.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Total + items */}
                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Total</span>
                      <span className="text-lg font-black text-slate-900">₹{Number(o.totalAmount ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{o.itemsCount} item{o.itemsCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => navigate(`/shop/orders/tracking/${o.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all uppercase tracking-wider"
                  >
                    <Truck className="w-3.5 h-3.5" /> Track <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleReorder(o.id)}
                    disabled={reorderingId === o.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 text-[10px] font-black rounded-xl hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    {reorderingId === o.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Reorder
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
};

export default OrderHistoryPage;
