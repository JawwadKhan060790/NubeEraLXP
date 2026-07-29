import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  ChevronRight,
  Sparkles,
  BookOpen,
  Cpu
} from 'lucide-react';
import { ecommerceService } from '@/services/ecommerceService';
import type { Product } from '@/services/ecommerceService';
import { toast } from 'sonner';
import { resolveMediaUrl, getProductFallbackImage } from '@/utils/urlHelper';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // View-only roles cannot purchase
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isViewOnly = ['admin', 'superadmin', 'staff'].includes(
    currentUser?.utype?.toLowerCase()
  );

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Gallery & Quantity
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'safety'>('description');

  useEffect(() => {
    if (!id) return;

    const loadProductDetails = async () => {
      setLoading(true);
      try {
        const prodData = await ecommerceService.getProduct(id);
        setProduct(prodData);
        setActiveImage(prodData.thumbnail_url ? resolveMediaUrl(prodData.thumbnail_url) : getProductFallbackImage(prodData.category?.name, prodData.title));

        // Fetch related products
        const relatedData = await ecommerceService.getRelatedProducts(id);
        setRelated(relatedData);

        // Manage Recently Viewed in LocalStorage
        saveToRecentlyViewed(prodData);

      } catch (err) {
        console.error('Could not load product details', err);
        toast.error('Product not found.');
        navigate('/shop/products');
      } finally {
        setLoading(false);
      }
    };
    loadProductDetails();
  }, [id]);

  useEffect(() => {
    // Load recently viewed lists
    const list = localStorage.getItem('recently_viewed_products');
    if (list) {
      try {
        const parsed = JSON.parse(list) as Product[];
        // Filter out current product
        setRecentlyViewed(parsed.filter(p => p.id !== id).slice(0, 4));
      } catch (e) {
        console.error(e);
      }
    }
  }, [id]);

  const saveToRecentlyViewed = (prod: Product) => {
    const listStr = localStorage.getItem('recently_viewed_products');
    let list: Product[] = [];
    if (listStr) {
      try {
        list = JSON.parse(listStr) as Product[];
      } catch (e) {
        list = [];
      }
    }
    // Filter duplicates
    list = list.filter(p => p.id !== prod.id);
    list.unshift(prod); // Insert at start
    list = list.slice(0, 10); // Cap at 10 items
    localStorage.setItem('recently_viewed_products', JSON.stringify(list));
  };

  const handleAddToCart = async () => {
    if (!product?.id) return;
    try {
      await ecommerceService.addToCart(product.id, quantity);
      toast.success(`"${product.title}" (${quantity} items) added to cart!`);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not add to cart.');
    }
  };

  const handleAddToWishlist = async () => {
    if (!product?.id) return;
    try {
      await ecommerceService.addToWishlist(product.id);
      toast.success(`"${product.title}" added to wishlist!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not add to wishlist.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold">Resolving Product Specifications...</p>
      </div>
    );
  }

  if (!product) return null;

  // JSON parsers
  const images: string[] = (() => {
    let raw: string[];
    try {
      const parsed = JSON.parse(product.images_json) as string[];
      raw = parsed.length > 0 ? parsed : [product.thumbnail_url || ''];
    } catch (e) {
      raw = [product.thumbnail_url || ''];
    }
    return raw.filter(Boolean).map(resolveMediaUrl);
  })();

  const features: string[] = (() => {
    try {
      return JSON.parse(product.features_json) as string[];
    } catch (e) {
      return [];
    }
  })();

  const specifications: Record<string, string> = (() => {
    try {
      return JSON.parse(product.specifications_json) as Record<string, string>;
    } catch (e) {
      return {};
    }
  })();


  const discountPercent = product.discount_price 
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-300">
      
      {/* 1. BREADCRUMBS NAVIGATION */}
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#94a3b8] bg-white dark:bg-[#1e293b] px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-lg shadow-sm w-fit">
        <Link to="/shop" className="hover:text-primary transition-colors">STEM Shop</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b]" />
        <Link to="/shop/products" className="hover:text-primary transition-colors">Products</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b]" />
        <span className="text-slate-800 dark:text-[#e2e8f0] truncate max-w-[200px]">{product.title}</span>
      </nav>

      {/* 2. PRODUCT HERO SUMMARY BOX */}
      <div className="flex flex-col lg:flex-row gap-10 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 md:p-8 shadow-sm">

        {/* Left Column: Image Selection & Showcase */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="aspect-square bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden flex items-center justify-center p-6 relative">
            <img
              src={activeImage || getProductFallbackImage(product.category?.name, product.title)}
              alt={product.title}
              className="max-h-[400px] object-contain transition-transform duration-300 hover:scale-105"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider rounded shadow-md">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Carousel thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 border rounded-lg bg-slate-50 dark:bg-[#283548] p-1 flex-shrink-0 transition-all ${activeImage === img ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-slate-200 dark:border-[#334155] hover:border-slate-400 dark:hover:border-[#64748b]'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Title, STEM Tags, Details & Purchasing */}
        <div className="w-full lg:w-1/2 flex flex-col space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">
                {product.category?.name}
              </span>
              {product.school_grade_compatibility && (
                <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-transparent dark:border-purple-400/25 text-xs font-bold rounded">
                  Grades: {product.school_grade_compatibility}
                </span>
              )}
              {product.recommended_age_group && (
                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-transparent dark:border-amber-400/25 text-xs font-bold rounded">
                  Ages: {product.recommended_age_group}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {product.title}
            </h1>
            <p className="text-slate-500 dark:text-[#94a3b8] text-xs">
              SKU: <span className="font-bold text-slate-800 dark:text-[#e2e8f0]">{product.sku_code}</span> |
              Brand: <span className="font-bold text-slate-800 dark:text-[#e2e8f0]">{product.brand_name || 'Generic'}</span>
            </p>
          </div>

          <p className="text-slate-600 dark:text-[#cbd5e1] text-sm leading-relaxed">
            {product.short_description || 'Step into the future of learning with this authentic STEM-oriented component. Perfect for curriculum, hackathons, and laboratory exercises.'}
          </p>

          {/* Pricing Box */}
          <div className="bg-slate-50 dark:bg-[#283548] p-4 rounded-xl border border-slate-100 dark:border-[#334155]">
            <span className="text-xs text-slate-400 dark:text-[#64748b] block font-bold mb-1">STORE PRICE</span>
            <div className="flex items-baseline gap-3">
              {product.discount_price ? (
                <>
                  <span className="text-3xl font-black text-slate-950 dark:text-white">₹{product.discount_price}</span>
                  <span className="text-sm text-slate-400 dark:text-[#64748b] line-through">₹{product.price}</span>
                  <span className="text-xs font-bold text-rose-500 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 px-2 py-0.5 rounded">
                    Save ₹{product.price - product.discount_price}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-black text-slate-950 dark:text-white">₹{product.price}</span>
              )}
            </div>
            {product.stock_quantity > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-3">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                In Stock ({product.stock_quantity} remaining)
              </span>
            ) : (
              <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 block mt-3">
                Out of Stock (Currently Unavailable)
              </span>
            )}
          </div>

          {/* Purchasing Form — hidden for admin/staff */}
          {product.stock_quantity > 0 && !isViewOnly && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</label>
                  <div className="flex items-center border border-slate-200 dark:border-[#334155] rounded-lg overflow-hidden w-32 bg-slate-50 dark:bg-[#283548]">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-3.5 py-2 font-black hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-600 dark:text-[#cbd5e1] border-r border-slate-200 dark:border-[#334155]"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-extrabold text-sm text-slate-800 dark:text-[#e2e8f0]">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                      className="px-3.5 py-2 font-black hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-600 dark:text-[#cbd5e1] border-l border-slate-200 dark:border-[#334155]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex gap-3 pt-5">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </button>
                  <button
                    onClick={handleAddToWishlist}
                    className="p-3 border border-slate-200 dark:border-[#334155] hover:border-slate-400 dark:hover:border-[#64748b] text-slate-500 dark:text-[#94a3b8] rounded-xl transition-all cursor-pointer hover:scale-105"
                    title="Add to Wishlist"
                  >
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delivery & Guarantees Bullet Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-[#334155] text-xs font-semibold text-slate-600 dark:text-[#cbd5e1]">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <span className="block font-bold text-slate-800 dark:text-[#e2e8f0]">School Delivery</span>
                <span>{product.delivery_estimate || '2-3 Working Days'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              <div>
                <span className="block font-bold text-slate-800 dark:text-[#e2e8f0]">Return Policy</span>
                <span>{product.return_policy || 'No Returns'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <span className="block font-bold text-slate-800 dark:text-[#e2e8f0]">Warranty details</span>
                <span>{product.warranty_details || '1 Year Brand Warranty'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DETAILED SPECS TABS */}
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm">

        {/* Tab Header Buttons */}
        <div className="flex border-b border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#283548]">
          <button
            onClick={() => setActiveTab('description')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'description' ? 'border-primary text-primary bg-white dark:bg-[#1e293b]' : 'border-transparent text-slate-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#e2e8f0]'}`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('specifications')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'specifications' ? 'border-primary text-primary bg-white dark:bg-[#1e293b]' : 'border-transparent text-slate-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#e2e8f0]'}`}
          >
            Technical Specifications
          </button>
          {product.safety_instructions && (
            <button
              onClick={() => setActiveTab('safety')}
              className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'safety' ? 'border-primary text-primary bg-white dark:bg-[#1e293b]' : 'border-transparent text-slate-500 dark:text-[#94a3b8] hover:text-slate-700 dark:hover:text-[#e2e8f0]'}`}
            >
              Safety Instructions
            </button>
          )}
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 md:p-8">
          {activeTab === 'description' && (
            <div className="space-y-6">
              <div className="prose  max-w-none text-sm leading-relaxed text-slate-600 dark:text-[#cbd5e1]">
                {product.full_description || <p>No detailed description provided for this product.</p>}
              </div>

              {/* Product features listed */}
              {features.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#334155]">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-[#e2e8f0] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-500" /> Key Innovation Features
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-[#cbd5e1]">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-[#283548] p-2.5 rounded-lg border border-slate-100 dark:border-[#334155]">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-[#e2e8f0] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" /> Technical Data Grid
              </h3>
              {Object.keys(specifications).length === 0 ? (
                <p className="text-xs text-slate-500">No specifications listed.</p>
              ) : (
                <div className="border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <tbody>
                      {Object.entries(specifications).map(([key, val], idx) => (
                        <tr key={key} className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-[#283548]' : 'bg-transparent'}>
                          <td className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider w-1/3 border-b border-slate-200 dark:border-[#334155]">{key}</td>
                          <td className="px-4 py-3 font-extrabold text-slate-800 dark:text-[#e2e8f0] border-b border-slate-200 dark:border-[#334155]">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="bg-rose-50 dark:bg-rose-500/15 p-6 rounded-xl border border-rose-100 dark:border-rose-400/25 space-y-3">
              <h3 className="font-extrabold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                ⚠️ Critical Safety Instructions
              </h3>
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 leading-relaxed whitespace-pre-line">
                {product.safety_instructions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. RELATED PRODUCTS GRID */}
      {related.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" /> Related STEM Gear
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/shop/products/${p.id}`)}
                className="group relative cursor-pointer bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-square bg-slate-50 dark:bg-[#283548] rounded-lg overflow-hidden flex items-center justify-center p-2 mb-3">
                  <img src={p.thumbnail_url ? resolveMediaUrl(p.thumbnail_url) : getProductFallbackImage(p.category?.name, p.title)} alt="" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                </div>
                <span className="text-[9px] font-bold text-primary uppercase block">{p.category?.name}</span>
                <h3 className="font-bold text-xs text-slate-800 dark:text-[#e2e8f0] truncate group-hover:text-primary transition-colors">{p.title}</h3>
                <span className="font-extrabold text-xs block mt-1">₹{p.discount_price ?? p.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. RECENTLY VIEWED PRODUCTS */}
      {recentlyViewed.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Recently Viewed Kits
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {recentlyViewed.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/shop/products/${p.id}`)}
                className="group relative cursor-pointer bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl overflow-hidden p-3 shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-square bg-slate-50 dark:bg-[#283548] rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2">
                  <img src={p.thumbnail_url ? resolveMediaUrl(p.thumbnail_url) : getProductFallbackImage(p.category?.name, p.title)} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <h3 className="font-bold text-[11px] text-slate-800 dark:text-[#e2e8f0] truncate group-hover:text-primary transition-colors">{p.title}</h3>
                <span className="font-extrabold text-xs block mt-0.5">₹{p.discount_price ?? p.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
