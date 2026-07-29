import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Trash2, 
  ShoppingCart, 
  ArrowLeft, 
  Eye
} from 'lucide-react';
import { ecommerceService } from '@/services/ecommerceService';
import type { WishlistItem } from '@/services/ecommerceService';
import { toast } from 'sonner';
import { resolveMediaUrl } from '@/utils/urlHelper';

const WishlistPage: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const data = await ecommerceService.getWishlist();
      setWishlist(data);
    } catch (err) {
      console.error('Failed to load wishlist', err);
      toast.error('Could not load wishlist bookmarked items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleMoveToCart = async (itemId: string, title: string) => {
    try {
      await ecommerceService.moveWishlistToCart(itemId);
      toast.success(`"${title}" successfully moved to Cart!`);
      fetchWishlist();
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to move item to cart.');
    }
  };

  const handleRemove = async (itemId: string, title: string) => {
    try {
      await ecommerceService.removeFromWishlist(itemId);
      toast.success(`"${title}" removed from wishlist.`);
      fetchWishlist();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not remove item.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold">Opening product bucket list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="vt-page-header">
        <div>
          <h1 className="vt-page-title">My Wishlist Bucket</h1>
          <p className="vt-page-subtitle">Products and STEM kits saved for your future innovations</p>
        </div>
      </div>

      {wishlist.length === 0 ? (
        // Empty State
        <div className="text-center py-20 bg-white  border border-slate-200  rounded-2xl p-6 shadow-sm space-y-6">
          <div className="w-16 h-16 bg-slate-100  rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 ">Your Wishlist is Empty</h2>
            <p className="text-slate-500  text-sm max-w-sm mx-auto">
              Save robotics components, sensors, or complete drone kits while browsing, and they will appear here.
            </p>
          </div>
          <Link to="/shop/products" className="btn btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Discover Products
          </Link>
        </div>
      ) : (
        // Bookmarks Grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlist.map((item) => {
            const prod = item.product;
            return (
              <div 
                key={item.id}
                className="group relative flex flex-col bg-white  border border-slate-200  rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-square bg-slate-50  flex items-center justify-center p-4">
                  <img src={prod.thumbnail_url ? resolveMediaUrl(prod.thumbnail_url) : 'https://via.placeholder.com/200?text=STEM'} alt="" className="max-h-full max-w-full object-contain" />
                  <div className="absolute top-3 right-3">
                    <button 
                      onClick={() => handleRemove(item.id, prod.title)}
                      className="p-1.5 bg-white  border  text-rose-500 rounded-full hover:scale-110 shadow hover:bg-rose-50 transition-all cursor-pointer"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 flex-1 flex flex-col space-y-1.5 text-center sm:text-left">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{prod.brand_name || 'STEM'}</span>
                  <h3 className="font-bold text-xs text-slate-800  line-clamp-1 hover:text-primary">
                    <Link to={`/shop/products/${prod.id}`}>{prod.title}</Link>
                  </h3>
                  <p className="text-[10px] text-slate-400">SKU: {prod.sku_code}</p>
                  
                  <div className="pt-2">
                    <span className="font-extrabold text-sm block">₹{prod.discount_price ?? prod.price}</span>
                  </div>

                  {/* Actions Column */}
                  <div className="flex gap-2 pt-4 mt-auto">
                    <button 
                      disabled={prod.stock_quantity <= 0}
                      onClick={() => handleMoveToCart(item.id, prod.title)}
                      className="flex-1 py-2 bg-primary hover:bg-primary-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Move to Cart
                    </button>
                    <Link 
                      to={`/shop/products/${prod.id}`}
                      className="px-2.5 py-2 bg-slate-100  hover:bg-slate-250 text-slate-700  font-bold rounded-lg flex items-center justify-center"
                      title="Quick View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
