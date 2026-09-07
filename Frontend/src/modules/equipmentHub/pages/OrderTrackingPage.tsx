import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Package,
  ShoppingBag,
  Star,
  Truck
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import { useConfirm } from '@/hooks/useConfirm';
import type { Order } from '@/services/ecommerceService';
import { ecommerceService } from '@/services/ecommerceService';

// Ordered pipeline of statuses
const STATUS_PIPELINE = ['Order Placed', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered'];

const STEP_META: Record<string, { icon: React.ReactNode; label: string; description: string; color: string; lightBg: string }> = {
  'Order Placed':      { icon: <ShoppingBag className="w-4 h-4" />, label: 'Order Placed',      description: 'We received your order and are processing it.',         color: 'text-blue-600',    lightBg: 'bg-blue-50 border-blue-200' },
  'Confirmed':         { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Confirmed',          description: 'Lab coordinator verified inventory and approved.',      color: 'text-indigo-600',  lightBg: 'bg-indigo-50 border-indigo-200' },
  'Packed':            { icon: <Package className="w-4 h-4" />,      label: 'Packed & Ready',     description: 'Robotics components checked, sealed and packaged.',    color: 'text-violet-600',  lightBg: 'bg-violet-50 border-violet-200' },
  'Out for Delivery':  { icon: <Truck className="w-4 h-4" />,        label: 'Out for Delivery',   description: 'Package is on its way — driver en route to school.',  color: 'text-amber-600',   lightBg: 'bg-amber-50 border-amber-200' },
  'Delivered':         { icon: <Star className="w-4 h-4" />,         label: 'Delivered',           description: 'Order received at the designated school laboratory.', color: 'text-emerald-600', lightBg: 'bg-emerald-50 border-emerald-200' },
};

const OrderTrackingPage: React.FC = () => {
  const { confirmState, requestConfirm } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isStaffOrAdmin = currentUser.utype === 'admin' || currentUser.utype === 'staff' || currentUser.Role === 'admin' || currentUser.Role === 'staff';

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || !order) return;
    const ok = await requestConfirm({
      title: 'Update Order Status',
      message: `Change order status to "${newStatus}"?`,
      confirmLabel: 'Yes, Update'
    });
    if (!ok) return;
    setUpdating(true);
    try {
      await ecommerceService.updateOrderStatus(id, { status: newStatus });
      toast.success(`Order marked as ${newStatus}.`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const loadData = async () => {
    if (!id) return;
    try {
      const [orderData, trackingData] = await Promise.all([
        ecommerceService.getOrder(id),
        ecommerceService.getOrderTracking(id)
      ]);
      setOrder(orderData);
      setTracking(trackingData);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Could not load order tracking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleDownloadInvoice = async () => {
    if (!id || !order) return;
    try {
      const invoice = await ecommerceService.getInvoice(id);

        console.log("invoice",invoice);
      // Safe date formatter — avoids "Invalid Date" when value is null/undefined/bad
      const fmtDate = (val: any) => {
        if (!val) return 'N/A';
        const d = new Date(val);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      };

      // Safe currency — avoids "undefined" when numeric value is missing
      const fmtRs = (val: any) => (val != null && !isNaN(Number(val)) ? `&#8377;${Number(val).toFixed(2)}` : '&#8377;0.00');

      const invoiceWindow = window.open('', '_blank');
      if (invoiceWindow) {
        invoiceWindow.document.write(`
          <html>
            <head>
              <title>Invoice - ${invoice.invoice_number ?? 'N/A'}</title>
              <meta charset="UTF-8">
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; font-size: 13px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6d28d9; padding-bottom: 20px; margin-bottom: 24px; }
                .company-name { font-size: 22px; font-weight: 800; color: #6d28d9; margin-bottom: 4px; }
                .company-sub { color: #666; line-height: 1.5; font-size: 12px; }
                .invoice-meta { text-align: right; line-height: 1.7; }
                .invoice-meta .label { font-size: 28px; font-weight: 800; color: #6d28d9; letter-spacing: 2px; margin-bottom: 6px; }
                .details { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
                .detail-box { background: #f9f7ff; border: 1px solid #e8e0ff; border-radius: 8px; padding: 14px 16px; }
                .title-block { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6d28d9; margin-bottom: 8px; border-bottom: 1px solid #e8e0ff; padding-bottom: 6px; }
                .detail-row { display: flex; gap: 8px; margin-top: 5px; }
                .detail-row .key { color: #888; min-width: 100px; flex-shrink: 0; }
                .detail-row .val { font-weight: 600; color: #222; word-break: break-word; }
                .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
                .status-paid { background: #d1fae5; color: #065f46; }
                .status-pending { background: #fef3c7; color: #92400e; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                thead tr { background: #6d28d9; color: white; }
                th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; }
                td { padding: 10px 12px; border-bottom: 1px solid #f0eeff; font-size: 13px; }
                tbody tr:nth-child(even) { background: #faf8ff; }
                .totals-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
                .totals { width: 260px; border: 1px solid #e8e0ff; border-radius: 8px; overflow: hidden; }
                .totals-row { display: flex; justify-content: space-between; padding: 9px 16px; font-size: 13px; border-bottom: 1px solid #f0eeff; }
                .grand-total { display: flex; justify-content: space-between; padding: 12px 16px; font-weight: 800; font-size: 15px; background: #6d28d9; color: white; }
                .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
                @media print { .no-print { display: none; } body { margin: 20px; } }
              </style>
            </head>
            <body>
              <div class="no-print" style="margin-bottom: 24px;">
                <button onclick="window.print()" style="padding:9px 20px;background:#6d28d9;color:white;border:none;font-weight:700;border-radius:6px;cursor:pointer;font-size:13px;">&#128438; Print / Save as PDF</button>
              </div>

              <div class="header">
                <div>
                  <div class="company-name">${invoice.company_name ?? 'NubeEra Tech'}</div>
                  <div class="company-sub">
                    ${invoice.company_address ?? ''}<br>
                    ${invoice.company_contact ?? ''}
                  </div>
                </div>
                <div class="invoice-meta">
                  <div class="label">INVOICE</div>
                  <div><b>Invoice #:</b> ${invoice.invoice_number ?? 'N/A'}</div>
                  <div><b>Order Ref:</b> ${invoice.order_number ?? 'N/A'}</div>
                  <div><b>Date:</b> ${fmtDate(invoice.order_date)}</div>
                  <div style="margin-top:6px;">
                    <span class="status-badge ${invoice.payment_status === 'Paid' ? 'status-paid' : 'status-pending'}">
                      ${invoice.payment_status ?? 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div class="details">
                <div class="detail-box">
                  <div class="title-block">Billed To</div>
                  <div class="detail-row"><span class="key">Student</span><span class="val">${invoice.student_name ?? 'N/A'}</span></div>
                  ${invoice.grade_name ? `<div class="detail-row"><span class="key">Grade</span><span class="val">${invoice.grade_name}</span></div>` : ''}
                  ${invoice.student_email ? `<div class="detail-row"><span class="key">Email</span><span class="val">${invoice.student_email}</span></div>` : ''}
                  ${invoice.student_phone ? `<div class="detail-row"><span class="key">Phone</span><span class="val">${invoice.student_phone}</span></div>` : ''}
                  <div class="detail-row" style="margin-top:8px;"><span class="key">Parent</span><span class="val">${invoice.parent_name ?? 'N/A'}</span></div>
                  ${invoice.parent_email ? `<div class="detail-row"><span class="key">Email</span><span class="val">${invoice.parent_email}</span></div>` : ''}
                  ${invoice.parent_phone ? `<div class="detail-row"><span class="key">Phone</span><span class="val">${invoice.parent_phone}</span></div>` : ''}
                  <div class="detail-row" style="margin-top:8px;"><span class="key">School</span><span class="val">${invoice.school_name ?? 'N/A'}</span></div>
                </div>
                <div class="detail-box">
                  <div class="title-block">Shipping &amp; Payment</div>
                  <div class="detail-row"><span class="key">Address</span><span class="val">${invoice.shipping_address ?? 'N/A'}</span></div>
                  <div class="detail-row"><span class="key">Contact</span><span class="val">${invoice.contact_number ?? 'N/A'}</span></div>
                  ${invoice.alternate_contact ? `<div class="detail-row"><span class="key">Alt. Contact</span><span class="val">${invoice.alternate_contact}</span></div>` : ''}
                  <div class="detail-row" style="margin-top:8px;"><span class="key">Method</span><span class="val">${invoice.payment_method ?? 'N/A'}</span></div>
                  <div class="detail-row"><span class="key">Payment</span><span class="val">${invoice.payment_status ?? 'N/A'}</span></div>
                  <div class="detail-row"><span class="key">Order Status</span><span class="val">${invoice.order_status ?? 'N/A'}</span></div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Unit Price</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(invoice.items ?? []).map((item: any, idx: number) => `
                    <tr>
                      <td style="color:#999;">${idx + 1}</td>
                      <td><b>${item.title ?? 'N/A'}</b></td>
                      <td style="color:#888;font-size:12px;">${item.sku ?? 'N/A'}</td>
                      <td>${fmtRs(item.price)}</td>
                      <td style="text-align:center;">${item.qty ?? 0}</td>
                      <td style="text-align:right;font-weight:700;">${fmtRs(item.total)}</td>
                    </tr>
                  `).join('')}
                  ${(invoice.items ?? []).length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px;">No items found</td></tr>' : ''}
                </tbody>
              </table>

              <div class="totals-wrap">
                <div class="totals">
                  <div class="totals-row"><span>Subtotal</span><span>${fmtRs(invoice.subtotal)}</span></div>
                  <div class="totals-row"><span>Shipping</span><span>${Number(invoice.shipping) === 0 ? '<span style="color:#10b981;font-weight:700;">FREE</span>' : fmtRs(invoice.shipping)}</span></div>
                  <div class="grand-total"><span>Grand Total</span><span>${fmtRs(invoice.total)}</span></div>
                </div>
              </div>

              <div class="footer">
                Thank you for your order! For support, contact ${invoice.company_contact ?? 'support@nubeera.tech'}<br>
                This is a computer-generated invoice and does not require a signature.
              </div>
            </body>
          </html>
        `);
        invoiceWindow.document.close();
      }
    } catch (err: any) {
      toast.error('Failed to download invoice details.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold">Loading order tracking...</p>
      </div>
    );
  }

  if (!order || !tracking) return null;

  // ── Smart status logic ──────────────────────────────────────────────────────
  // Find the index of the CURRENT (most advanced completed) status in the pipeline
  const currentStatusIndex = STATUS_PIPELINE.indexOf(order.status);

  // Build an enriched timeline: every step BEFORE or AT currentStatusIndex is "done"
  const enrichedTimeline = STATUS_PIPELINE.map((statusKey, idx) => {
    // Find the raw tracking step (for date / notes)
    const rawStep = tracking.timeline?.find((s: any) => s.status === statusKey);
    const isDone = idx <= currentStatusIndex;
    const isCurrent = idx === currentStatusIndex;
    return {
      statusKey,
      meta: STEP_META[statusKey],
      isDone,
      isCurrent,
      date: rawStep?.date || null,
      notes: rawStep?.notes || null,
    };
  });

  const overallProgress = currentStatusIndex >= 0
    ? Math.round(((currentStatusIndex + 1) / STATUS_PIPELINE.length) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* Back nav */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link to="/shop/orders" className="hover:text-primary transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>
      </nav>

      {/* Page Header */}
      <div className="vt-page-header">
        <div>
          <h1 className="vt-page-title">Order Tracking</h1>
          <p className="vt-page-subtitle">Live delivery milestones for order <span className="font-black text-primary">{order.order_number}</span></p>
        </div>
        <button 
          onClick={handleDownloadInvoice}
          className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
        >
          <FileText className="w-4.5 h-4.5 text-primary" /> Download Invoice
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* ── LEFT: TIMELINE ───────────────────────────────────────────── */}
        <div className="flex-1 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
          
          {/* Header bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-800">Delivery Milestones</h2>
            </div>
            {order.status === 'Cancelled' ? (
              <span className="px-3 py-1 bg-rose-100 text-rose-700 font-black text-[10px] rounded-full uppercase tracking-wider border border-rose-200">
                Cancelled
              </span>
            ) : order.status === 'Delivered' ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-black text-[10px] rounded-full uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" /> Delivered
              </span>
            ) : (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 font-black text-[10px] rounded-full uppercase tracking-wider border border-blue-200">
                {order.status}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {!tracking.isCancelled && (
            <div className="px-6 pt-5 pb-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Cancelled State */}
            {tracking.isCancelled ? (
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="font-black text-base text-rose-900">Order Cancelled</h3>
                <p className="text-xs text-rose-600 font-medium leading-relaxed">
                  This order was cancelled. Reserved inventory has been restored to stock.
                </p>
                {order.delivery_notes && (
                  <div className="bg-white p-3 rounded-xl border border-rose-100 text-xs text-rose-700 font-semibold text-left">
                    <span className="font-black">Reason: </span>{order.delivery_notes}
                  </div>
                )}
              </div>
            ) : (
              /* ── Enriched Timeline Steps ── */
              <div className="relative space-y-0">
                {enrichedTimeline.map((step, idx) => {
                  const isLast = idx === enrichedTimeline.length - 1;
                  const meta = step.meta;

                  return (
                    <div key={step.statusKey} className="relative flex gap-5">
                      
                      {/* Connector line */}
                      {!isLast && (
                        <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${step.isDone && !step.isCurrent ? 'bg-gradient-to-b from-emerald-400 to-emerald-200' : 'bg-slate-100'}`} />
                      )}

                      {/* Step circle */}
                      <div className="relative z-10 shrink-0 mt-1">
                        {step.isDone ? (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border-2 transition-all duration-500 ${
                            step.isCurrent
                              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse'
                              : 'bg-emerald-500 border-emerald-400 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                          }`}>
                            {step.isCurrent ? meta.icon : <Check className="w-4.5 h-4.5" />}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-200 bg-white text-slate-300">
                            <span className="text-[11px] font-black">{idx + 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Step content */}
                      <div className={`flex-1 pb-8 ${isLast ? 'pb-2' : ''}`}>
                        <div className={`rounded-2xl border p-4 transition-all duration-300 ${
                          step.isCurrent
                            ? 'bg-blue-50 border-blue-200 shadow-[0_4px_20px_rgba(59,130,246,0.1)]'
                            : step.isDone
                            ? 'bg-emerald-50/60 border-emerald-100'
                            : 'bg-slate-50/40 border-slate-100'
                        }`}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-black text-sm ${
                                  step.isCurrent ? 'text-blue-700'
                                  : step.isDone ? 'text-emerald-700'
                                  : 'text-slate-400'
                                }`}>
                                  {meta.label}
                                </h3>
                                {step.isCurrent && (
                                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded-full tracking-wider animate-pulse">
                                    Current
                                  </span>
                                )}
                                {step.isDone && !step.isCurrent && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded-full tracking-wider border border-emerald-200">
                                    ✓ Done
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs font-medium leading-relaxed ${
                                step.isDone ? 'text-slate-600' : 'text-slate-400'
                              }`}>
                                {meta.description}
                              </p>
                              {step.notes && (
                                <div className="mt-2 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700">
                                  📢 {step.notes}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {step.date ? (
                                <div className="text-right">
                                  <span className="text-[10px] font-black text-slate-500 block">
                                    {new Date(step.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    {new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ) : step.isDone ? (
                                <span className="text-[10px] text-emerald-600 font-bold">Completed</span>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Upcoming</span>
                              )}
                              
                              {/* Admin/Staff status control */}
                              {isStaffOrAdmin && !step.isDone && (
                                <button
                                  onClick={() => handleUpdateStatus(step.statusKey)}
                                  disabled={updating}
                                  className="mt-1 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-black rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  Mark as {step.statusKey}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT: Order Summary ───────────────────────────────────────── */}
        <div className="lg:w-80 space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Order Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Order #</span>
                <span className="font-bold text-slate-800">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-slate-800">{order.status}</span>
              </div>
              {order.delivery_notes && (
                <div className="flex gap-2 pt-1">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600 text-xs">{order.delivery_notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title ?? 'Confirm'}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.resolve ? () => confirmState.resolve!(true) : () => {}}
        onCancel={confirmState.resolve ? () => confirmState.resolve!(false) : () => {}}
      />
    </div>
  );
};

export default OrderTrackingPage;
