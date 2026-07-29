import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Trash2, 
  Heart, 
  ArrowLeft, 
  ShoppingCart, 
  ShoppingBag,
  Info
} from 'lucide-react';
import { ecommerceService } from '@/services/ecommerceService';
import type { CartItem, CartSummary } from '@/services/ecommerceService';
import { toast } from 'sonner';
import { resolveMediaUrl } from '@/utils/urlHelper';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCartData = async () => {
    try {
      const data = await ecommerceService.getCart();
      setCartItems(data.items);
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load cart', err);
      toast.error('Could not load cart details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartData();
  }, []);

  const handleQuantityChange = async (itemId: string, qty: number, stockQty: number) => {
    if (qty > stockQty) {
      toast.error(`Only ${stockQty} items available in inventory.`);
      return;
    }
    try {
      await ecommerceService.updateCartQuantity(itemId, qty);
      fetchCartData();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update quantity.');
    }
  };

  const handleToggleSaveForLater = async (itemId: string, currentSaveStatus: boolean) => {
    try {
      await ecommerceService.toggleCartSaveForLater(itemId, !currentSaveStatus);
      toast.success(currentSaveStatus ? 'Item moved back to cart.' : 'Item saved for later.');
      fetchCartData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle save for later.');
    }
  };

  const handleMoveToWishlist = async (itemId: string, title: string) => {
    try {
      await ecommerceService.moveCartToWishlist(itemId);
      toast.success(`"${title}" moved to Wishlist!`);
      fetchCartData();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to move to wishlist.');
    }
  };

  const handleRemove = async (itemId: string, title: string) => {
    try {
      await ecommerceService.removeFromCart(itemId);
      toast.success(`"${title}" removed from cart.`);
      fetchCartData();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not remove item.');
    }
  };

  const handleClear = async () => {
    try {
      await ecommerceService.clearCart();
      toast.success('Your shopping cart is cleared.');
      fetchCartData();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear cart.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold">Inspecting shopping cart...</p>
      </div>
    );
  }

  const activeItems = cartItems.filter(i => !i.saved_for_later);
  const savedItems = cartItems.filter(i => i.saved_for_later);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="vt-page-header">
        <div>
          <h1 className="vt-page-title">My Cart</h1>
          <p className="vt-page-subtitle">Manage items, save products for later, and check out</p>
        </div>
        {activeItems.length > 0 && (
          <button onClick={handleClear} className="btn btn-secondary text-xs text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600">
            Clear Active Cart
          </button>
        )}
      </div>

      {activeItems.length === 0 ? (
        // Active Cart Empty State
        <div className="text-center py-20 bg-white  border border-slate-200  rounded-2xl p-6 shadow-sm space-y-6">
          <div className="w-16 h-16 bg-slate-100  rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 ">Your Cart is Empty</h2>
            <p className="text-slate-500  text-sm max-w-sm mx-auto">
              Before you can proceed to check out, you must add robotics components or drone kits to your shopping cart.
            </p>
          </div>
          <Link to="/shop/products" className="btn btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Start Shopping
          </Link>
        </div>
      ) : (
        // Active Cart Grid
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Active Items Table */}
          <div className="flex-1 space-y-4">
            {activeItems.map((item) => {
              const prod = item.product;
              const price = prod.discount_price ?? prod.price;
              
              return (
                <div 
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-4 bg-white  border border-slate-200  rounded-xl p-4 shadow-sm relative overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-slate-50  border border-slate-100  rounded-lg flex items-center justify-center p-2 flex-shrink-0 mx-auto sm:mx-0">
                    <img src={prod.thumbnail_url ? resolveMediaUrl(prod.thumbnail_url) : 'https://via.placeholder.com/150?text=STEM'} alt="" className="max-h-full max-w-full object-contain" />
                  </div>

                  {/* Body Info */}
                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{prod.brand_name || 'STEM'}</span>
                    <h3 className="font-bold text-sm text-slate-800  hover:text-primary">
                      <Link to={`/shop/products/${prod.id}`}>{prod.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-400">SKU: {prod.sku_code}</p>

                    {/* Actions row */}
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-3 text-xs font-semibold text-slate-500">
                      <button 
                        onClick={() => handleRemove(item.id, prod.title)}
                        className="flex items-center gap-1 text-rose-500 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                      <button 
                        onClick={() => handleMoveToWishlist(item.id, prod.title)}
                        className="flex items-center gap-1 hover:text-slate-850 "
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-455" /> Save to Wishlist
                      </button>
                      <button 
                        onClick={() => handleToggleSaveForLater(item.id, false)}
                        className="hover:text-slate-850 "
                      >
                        Save for Later
                      </button>
                    </div>
                  </div>

                  {/* Quantity Spinner & Price */}
                  <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center sm:items-end gap-3 sm:border-l border-slate-100  sm:pl-6 min-w-[120px]">
                    <div className="flex items-center border border-slate-200  rounded-lg overflow-hidden bg-slate-50 ">
                      <button 
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1, prod.stock_quantity)}
                        className="px-2.5 py-1 text-slate-550 border-r border-slate-200  hover:bg-slate-200 font-bold"
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-extrabold text-slate-800 ">{item.quantity}</span>
                      <button 
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1, prod.stock_quantity)}
                        className="px-2.5 py-1 text-slate-550 border-l border-slate-200  hover:bg-slate-200 font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-sm block">₹{price * item.quantity}</span>
                      <span className="text-[10px] text-slate-400 font-semibold block">₹{price} each</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Summary Invoices Card */}
          <aside className="w-full lg:w-80 flex-shrink-0 bg-white  border border-slate-200  rounded-xl p-5 shadow-sm h-fit space-y-6">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-800  border-b pb-3">Order Summary</h2>

            <div className="space-y-3 text-xs font-semibold text-slate-600 ">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-slate-850 ">₹{summary?.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>School Delivery</span>
                {summary?.delivery_charges === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  <span className="text-slate-850 ">₹{summary?.delivery_charges}</span>
                )}
              </div>
              {summary?.delivery_charges !== 0 && (
                <div className="flex items-center gap-1 bg-slate-55 py-2 px-2.5 rounded text-[10px] text-slate-450 font-normal">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" /> Free school delivery above ₹500
                </div>
              )}
              
              <div className="flex justify-between border-t border-dashed pt-3 text-sm font-extrabold text-slate-850 ">
                <span>Total Payable</span>
                <span className="text-primary text-base">₹{summary?.total_amount}</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/shop/checkout')}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-extrabold rounded-lg text-xs tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Proceed to Checkout
            </button>
            <Link to="/shop/products" className="block text-center text-xs font-bold text-slate-500 hover:text-primary transition-colors">
              Continue Shopping
            </Link>
          </aside>
        </div>
      )}

      {/* 3. SAVED FOR LATER SECTION */}
      {savedItems.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200 ">
          <h2 className="text-lg font-bold text-slate-900  flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-500" /> Saved for Later ({savedItems.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedItems.map((item) => {
              const prod = item.product;
              return (
                <div 
                  key={item.id}
                  className="flex gap-4 bg-white  border border-slate-200  rounded-xl p-4 shadow-sm"
                >
                  <div className="w-16 h-16 bg-slate-50  border border-slate-100  rounded-lg flex items-center justify-center p-2 flex-shrink-0">
                    <img src={prod.thumbnail_url ? resolveMediaUrl(prod.thumbnail_url) : 'https://via.placeholder.com/150?text=STEM'} alt="" className="max-h-full max-w-full object-contain" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-xs text-slate-800 ">{prod.title}</h3>
                    <span className="font-extrabold text-xs block">₹{prod.discount_price ?? prod.price}</span>

                    <div className="flex gap-4 pt-2 text-[11px] font-bold text-slate-500">
                      <button 
                        onClick={() => handleToggleSaveForLater(item.id, true)}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        Move to Active Cart
                      </button>
                      <button 
                        onClick={() => handleRemove(item.id, prod.title)}
                        className="text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
