import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Home } from 'lucide-react';

const OrderSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawOrderNumber = searchParams.get('orderNumber');
  const rawOrderId = searchParams.get('orderId');

  const orderNumber = rawOrderNumber && rawOrderNumber !== 'undefined' ? rawOrderNumber : 'ORD-20260226-0001';
  const orderId = rawOrderId && rawOrderId !== 'undefined' ? rawOrderId : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-6 space-y-8 text-center animate-in fade-in zoom-in duration-300">
      
      {/* Animated checkmark circle */}
      <div className="relative">
        <div className="w-24 h-24 bg-emerald-50  rounded-full flex items-center justify-center border-4 border-emerald-100  relative z-10">
          <CheckCircle className="w-12 h-12 text-emerald-500 fill-white " />
        </div>
        {/* Pulsing effects */}
        <div className="absolute inset-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl animate-ping opacity-60"></div>
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="text-3xl font-black text-slate-900 ">Order Confirmed!</h1>
        <p className="text-slate-500  text-sm font-semibold">
          Your robotics gear order has been registered successfully. A coordinator will dispatch the components to your laboratory.
        </p>
      </div>

      {/* Order Info Badge */}
      <div className="bg-slate-50  border border-slate-200  rounded-xl p-5 w-full max-w-sm shadow-sm space-y-2 text-xs font-semibold">
        <div className="flex justify-between border-b pb-2">
          <span className="text-slate-400">Order Reference</span>
          <span className="text-slate-850  font-extrabold">{orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Payment Status</span>
          <span className="text-emerald-600 font-extrabold uppercase">Offline / Pending COD</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm pt-4">
        {orderId ? (
          <button 
            onClick={() => navigate(`/shop/orders/tracking/${orderId}`)}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-extrabold rounded-lg text-xs shadow flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Package className="w-4.5 h-4.5" /> Track Delivery
          </button>
        ) : (
          <button 
            onClick={() => navigate('/shop/orders')}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-extrabold rounded-lg text-xs shadow flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Package className="w-4.5 h-4.5" /> My Orders
          </button>
        )}
        <button 
          onClick={() => navigate('/shop')}
          className="px-5 py-3 border border-slate-250  text-slate-700  hover:bg-slate-100  font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <Home className="w-4 h-4" /> Go Shop
        </button>
      </div>

    </div>
  );
};

export default OrderSuccessPage;
