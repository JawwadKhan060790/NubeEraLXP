import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  MapPin,
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { ecommerceService } from '@/services/ecommerceService';
import type { CartItem, CartSummary } from '@/services/ecommerceService';
import { toast } from 'sonner';
import { trimAndCollapseSpaces } from '@/utils/validation';
import MobileNumberInput from '@/components/MobileNumberInput';
import { resolveMediaUrl } from '@/utils/urlHelper';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();

  // Active items and totals
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country] = useState('India');
  const [contact, setContact] = useState('');
  const [altContact, setAltContact] = useState('');
  const [notes, setNotes] = useState('');
  
  // New E-Commerce fields
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');

  // Auto mapped user credentials representation
  const [userInfo, setUserInfo] = useState<{
    name: string;
    role: string;
    school: string;
  } | null>(null);

  useEffect(() => {
    // 1. Fetch Cart Data
    const loadCartData = async () => {
      try {
        const data = await ecommerceService.getCart();
        const active = data.items.filter(i => !i.saved_for_later);
        if (active.length === 0) {
          toast.error('Your cart is empty.');
          navigate('/shop/cart');
          return;
        }
        setCartItems(active);
        setSummary(data.summary);
      } catch (err) {
        console.error('Checkout failed loading cart', err);
        navigate('/shop/cart');
      } finally {
        setLoading(false);
      }
    };
    loadCartData();

    // 2. Safely parse logged in User details
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        setUserInfo({
          name: `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || parsed.full_name || parsed.username || 'Student User',
          role: parsed.role || parsed.utype || 'student',
          school: parsed.school_name || 'STEM Innovation School'
        });
        setContact(parsed.phone || '');
        setStudentId(parsed.student_id || parsed.username || parsed.id || '');
        setStudentName(`${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || parsed.full_name || '');
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName || !parentName || !address || !pinCode || !city || !state || !contact) {
      toast.error('Please complete all mandatory fields.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await ecommerceService.placeOrder({
        shippingAddress: address,
        pinCode: pinCode,
        city: city,
        state: state,
        country: country,
        contactNumber: contact,
        alternateContactNumber: altContact || undefined,
        orderNotes: notes || undefined,
        studentId: studentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId) ? studentId : undefined,
        studentName: studentName,
        parentName: parentName
      });

      toast.success(response.message || 'Order placed successfully!');
      window.dispatchEvent(new Event('cartUpdated'));
      
      // Redirect to success page with parameters
      navigate(`/shop/orders/success?orderNumber=${response.orderNumber}&orderId=${response.orderId}`);

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold">Configuring secure checkout...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-505">
        <Link to="/shop/cart" className="hover:text-primary transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>
      </nav>

      <div className="vt-page-header">
        <div>
          <h1 className="vt-page-title">Secure Checkout</h1>
          <p className="vt-page-subtitle">Verify user details, enter delivery address, and confirm offline COD payment</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: AUTO MAPPED & DELIVERY ADDRESS FORM */}
        <div className="flex-1 space-y-6">
          
          {/* A. User Mapped Details (Card) */}
          <div className="bg-white  border border-slate-200  rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-850  border-b pb-2 flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-500" /> Account Auto-Mapping
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
              <div className="bg-slate-50  p-3 rounded-lg border border-slate-100 ">
                <span className="text-slate-400 block font-normal mb-0.5">Purchaser Name</span>
                <span className="text-slate-800  font-bold">{userInfo?.name}</span>
              </div>
              <div className="bg-slate-50  p-3 rounded-lg border border-slate-100 ">
                <span className="text-slate-400 block font-normal mb-0.5">Assigned School</span>
                <span className="text-slate-800  font-bold">{userInfo?.school}</span>
              </div>
              <div className="bg-slate-50  p-3 rounded-lg border border-slate-100 ">
                <span className="text-slate-400 block font-normal mb-0.5">Assigned Role</span>
                <span className="text-slate-800  font-bold capitalize">{userInfo?.role}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              * Order will be linked to your school account. Inventory and order tracking dashboard will match this details automatically.
            </p>
          </div>

          {/* B. Form Sheet */}
          <form onSubmit={handlePlaceOrder} className="bg-white  border border-slate-200  rounded-xl p-6 shadow-sm space-y-6">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-850  border-b pb-2 flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5 text-primary" /> Delivery Address & Pupil Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Student ID (Auto/Readonly) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">Student ID</label>
                <input 
                  type="text" 
                  disabled
                  value={studentId || 'Auto-assigned'}
                  className="w-full p-2.5 bg-slate-100  border border-slate-200  rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              {/* Student Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">Student Name <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter Student Name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  onBlur={(e) => setStudentName(trimAndCollapseSpaces(e.target.value))}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-lg text-slate-800  focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* Parent Name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-bold text-slate-700 ">Parent / Guardian Name <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter Parent / Guardian Name"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  onBlur={(e) => setParentName(trimAndCollapseSpaces(e.target.value))}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-lg text-slate-800  focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* Shipping Address */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-bold text-slate-700 ">Shipping Address <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={(e) => setAddress(trimAndCollapseSpaces(e.target.value))}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-lg text-slate-800  focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* Pin code */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">Postal PIN Code <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  placeholder="Enter Postal PIN Code"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-lg text-slate-800  focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">City / District <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={(e) => setCity(trimAndCollapseSpaces(e.target.value))}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-lg text-slate-800  focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">State <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  onBlur={(e) => setState(trimAndCollapseSpaces(e.target.value))}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-lg text-slate-800  focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">Country</label>
                <input 
                  type="text" 
                  disabled
                  value={country}
                  className="w-full p-2.5 bg-slate-100  border border-slate-200  rounded-lg text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              {/* Contact number */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">Contact Mobile Number <span className="text-rose-500">*</span></label>
                <MobileNumberInput
                  required
                  label="Mobile Number"
                  value={contact}
                  onChange={(digits) => setContact(digits)}
                />
              </div>

              {/* Alt contact number */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 ">Alternate Contact (Optional)</label>
                <MobileNumberInput
                  label="Alternate Mobile Number"
                  value={altContact}
                  onChange={(digits) => setAltContact(digits)}
                />
              </div>

              {/* Order Notes */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-bold text-slate-700 ">Order / Delivery Instructions (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Enter Order / Delivery Instructions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-lg text-slate-800  focus:outline-none focus:border-primary font-semibold resize-none"
                />
              </div>

            </div>

            {/* Offline COD Payment Notification (Card) */}
            <div className="bg-indigo-50/50  p-5 rounded-xl border border-indigo-100  space-y-3">
              <h3 className="font-extrabold text-xs text-indigo-900  uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard className="w-4.5 h-4.5" /> COD & Manual School Payment Enabled
              </h3>
              <p className="text-[11px] font-semibold text-indigo-750  leading-relaxed">
                Payment for this purchase is handled entirely offline. You will pay either:
              </p>
              <ul className="list-disc pl-4 text-[10px] text-indigo-750  space-y-1 font-semibold">
                <li>Via cash/check at your School Finance Department / Robotics Lab coordinator</li>
                <li>Upon direct manual delivery of items at your school</li>
                <li>By school account deduction where authorized</li>
              </ul>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
            >
              {submitting ? 'Placing Order...' : 'Confirm Offline Purchase'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: ITEMS IN CART BUCKET PREVIEW */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
          
          {/* A. Items Preview list */}
          <div className="bg-white  border border-slate-200  rounded-xl p-5 shadow-sm space-y-4 max-h-[400px] overflow-y-auto">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-850  border-b pb-2">Items Ordered</h2>
            
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs">
                  <div className="w-12 h-12 bg-slate-50  border border-slate-100  rounded flex items-center justify-center p-1.5 flex-shrink-0">
                    <img src={item.product.thumbnail_url ? resolveMediaUrl(item.product.thumbnail_url) : 'https://via.placeholder.com/150?text=STEM'} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800  truncate">{item.product.title}</h3>
                    <p className="text-[10px] text-slate-405">Qty: {item.quantity} x ₹{item.product.discount_price ?? item.product.price}</p>
                  </div>
                  <span className="font-extrabold text-slate-800  flex-shrink-0">
                    ₹{(item.product.discount_price ?? item.product.price) * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* B. Billing summary */}
          <div className="bg-white  border border-slate-200  rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-850  border-b pb-2">Invoice Summary</h2>
            
            <div className="space-y-3 text-xs font-semibold text-slate-655 ">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{summary?.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>School Shipping</span>
                {summary?.delivery_charges === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  <span>₹{summary?.delivery_charges}</span>
                )}
              </div>
              <div className="flex justify-between border-t border-dashed pt-3 text-sm font-extrabold text-slate-850 ">
                <span>Grand Total</span>
                <span className="text-primary">₹{summary?.total_amount}</span>
              </div>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
};

export default CheckoutPage;
