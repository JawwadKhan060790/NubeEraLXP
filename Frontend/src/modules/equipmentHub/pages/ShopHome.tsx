import {
  Check,
  ChevronDown,
  Cpu,
  Eye,
  Heart,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Truck
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Product, ProductCategory } from '@/services/ecommerceService';
import { ecommerceService } from '@/services/ecommerceService';
import { resolveMediaUrl, getProductFallbackImage } from '@/utils/urlHelper';

const ShopHome: React.FC = () => {
  const navigate = useNavigate();

  // View-only roles cannot purchase
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isViewOnly = ['admin', 'superadmin', 'staff'].includes(
    currentUser?.utype?.toLowerCase()
  );

  // Master Catalog States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Dynamic Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [priceRange, setPriceRange] = useState<number>(30000); // Max budget cap
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('latest');
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  // Sidebar / Modal controls
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // 1. Initial Load for Categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await ecommerceService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
  }, []);

  // 2. Live Fetch Products when filters change
  const fetchProducts = async () => {
    setCatalogLoading(true);
    try {
      const params: any = {
        search: searchQuery || undefined,
        categoryId: selectedCat || undefined,
        maxPrice: priceRange || undefined,
        isAvailable: inStockOnly || undefined,
        brand: selectedBrand || undefined,
        sortBy: sortBy || undefined
      };

      const data = await ecommerceService.getProducts(params);
      setProducts(data);

      // Collect unique brands from active dataset
      const uniqueBrands = Array.from(new Set(data.map(p => p.brand_name).filter(Boolean))) as string[];
      setBrands(uniqueBrands);
    } catch (err) {
      console.error('Failed to load products catalog', err);
      toast.error('Could not load products.');
    } finally {
      setCatalogLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCat, priceRange, inStockOnly, selectedBrand, sortBy]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCat(catId);
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCat('');
    setPriceRange(30000);
    setInStockOnly(false);
    setSelectedBrand('');
    setSortBy('latest');
  };

  const handleAddToCart = async (productId: string, title: string) => {
    try {
      await ecommerceService.addToCart(productId, 1);
      toast.success(`"${title}" added to cart!`);
      // Dispatch cart update event
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not add to cart.');
    }
  };

  const handleAddToWishlist = async (productId: string, title: string) => {
    try {
      await ecommerceService.addToWishlist(productId);
      toast.success(`"${title}" added to wishlist!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not add to wishlist.');
    }
  };

  // Helper to generate consistent mock ratings/sales count for Amazon-style feel
  const getMockRating = (id: string) => {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rating = 4.0 + (sum % 11) / 10; // Rating between 4.0 and 5.0
    const reviews = 15 + (sum % 230); // 15 to 245 reviews
    return { rating: rating.toFixed(1), reviews };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-[#8B5CF6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-[#8B5CF6] rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing STEM Catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500 font-sans text-slate-800 dark:text-[#e2e8f0]">

      {/* MAIN INTERACTIVE CATALOG SECTION WITH LIVE FILTERS */}
      <div id="catalog-section" className="space-y-6">

        {/* Dynamic Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600 shrink-0" /> Explore Kits Items
            </h2>
            <p className="text-slate-500 dark:text-[#94a3b8] text-xs font-semibold">Find the perfect robotics kits, scientific gear, and active learning tools for your next big project!</p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#283548] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#e2e8f0] hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer self-start sm:self-auto"
          >
            Reset Filters
          </button>
        </div>

        {/* Live Filter Controls Strip */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-[#94a3b8] text-left w-full sm:w-auto">
            Showing <span className="text-slate-950 dark:text-white font-extrabold">{products.length}</span> verified STEM items
          </span>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#283548] text-slate-700 dark:text-[#e2e8f0] text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#334155] w-full sm:w-auto justify-center cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters Panel
            </button>

            <div className="relative flex items-center w-full sm:w-auto border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#283548] px-3 py-1.5">
              <span className="text-slate-400 dark:text-[#64748b] text-xs mr-2 whitespace-nowrap font-bold">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs font-extrabold text-slate-800 dark:text-[#e2e8f0] focus:outline-none cursor-pointer pr-5"
              >
                <option value="latest">Latest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Popular / Trending</option>
                <option value="featured">Featured Picks</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-slate-400 dark:text-[#64748b] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filters Sidebar & Products Grid */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* DESKTOP SIDEBAR FILTERS */}
          <aside className="w-full lg:w-64 flex-shrink-0 hidden lg:block space-y-6 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-sm h-fit text-left">
            <h3 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] uppercase tracking-wider text-xs border-b border-slate-100 dark:border-[#283548] pb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" /> Filter Criteria
            </h3>

            {/* Keyword Search */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider block">Keyword Search</label>
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-[#64748b] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-[#283548] border-slate-200 dark:border-[#334155] rounded-xl focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/30 text-slate-800 dark:text-[#e2e8f0] font-semibold"
                />
              </div>
            </div>

            {/* Departments */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider block">Category Department</label>
              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${!selectedCat ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#283548] hover:text-slate-900 dark:hover:text-white'}`}
                >
                  All Segments
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id!)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${selectedCat === cat.id ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#283548] hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    {selectedCat === cat.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Caps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider block">Max Budget</label>
                <span className="px-2.5 py-1 bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-black rounded-lg border border-[#8B5CF6]/20">
                  ₹{priceRange.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="0"
                  max="30000"
                  step="500"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6] focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${(priceRange / 30000) * 100}%, ${document.documentElement.classList.contains('dark') ? '#475569' : '#cbd5e1'} ${(priceRange / 30000) * 100}%, ${document.documentElement.classList.contains('dark') ? '#475569' : '#cbd5e1'} 100%)`
                  }}
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-450 dark:text-[#64748b] mt-1">
                  <span>₹0</span>
                  <span>₹15,000</span>
                  <span>₹30,000+</span>
                </div>
              </div>
              
              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[1000, 5000, 30000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPriceRange(preset)}
                    className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border text-center cursor-pointer ${
                      priceRange === preset
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-xs'
                        : 'bg-slate-50 dark:bg-[#283548] text-slate-655 dark:text-[#cbd5e1] border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-[#334155]'
                    }`}
                  >
                    {preset === 30000 ? 'Any' : `₹${preset >= 1000 ? preset/1000 + 'K' : preset}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            {brands.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-[#64748b] uppercase tracking-wider block">Brand Manufacturer</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-[#283548] border-slate-200 dark:border-[#334155] rounded-xl text-slate-800 dark:text-[#e2e8f0] focus:outline-none focus:border-[#8B5CF6] font-bold cursor-pointer"
                >
                  <option value="">All Manufacturers</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            {/* In-Stock Filter */}
            <div className="flex items-center gap-2.5 pt-2">
              <input
                type="checkbox"
                id="instock-home"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#8B5CF6] border-slate-300 dark:border-[#334155] cursor-pointer accent-[#8B5CF6]"
              />
              <label htmlFor="instock-home" className="text-xs font-bold text-slate-700 dark:text-[#e2e8f0] cursor-pointer select-none">
                Show In-Stock Only
              </label>
            </div>
          </aside>

          {/* MAIN PRODUCT CATALOG GRID */}
          <div className="flex-1">
            {catalogLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm p-4 space-y-4 animate-pulse">
                    <div className="aspect-square bg-slate-100 dark:bg-[#283548] rounded-xl"></div>
                    <div className="h-4 bg-slate-100 dark:bg-[#283548] rounded w-2/3"></div>
                    <div className="h-4 bg-slate-100 dark:bg-[#283548] rounded w-1/2"></div>
                    <div className="flex justify-between items-center pt-4">
                      <div className="h-6 bg-slate-100 dark:bg-[#283548] rounded w-20"></div>
                      <div className="h-8 bg-slate-100 dark:bg-[#283548] rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-3xl p-6 shadow-sm space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-[#283548] rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-[#64748b]">
                  <Cpu className="w-8 h-8 text-[#8B5CF6]" />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">No matching STEM products</h2>
                <p className="text-slate-500 dark:text-[#94a3b8] text-xs font-semibold max-w-sm mx-auto leading-relaxed">
                  We couldn't find any products matching your specific metrics. Try resetting or adjusting your filter constraints.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => {
                  const discountPercent = p.discount_price
                    ? Math.round(((p.price - p.discount_price) / p.price) * 100)
                    : 0;
                  const { rating, reviews } = getMockRating(p.id || 'home-prod');

                  return (
                    <div
                      key={p.id}
                      className="group relative flex flex-col bg-white dark:bg-[#1e293b] border-slate-200/80 dark:border-[#334155] rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(75,72,207,0.09)] hover:scale-[1.01] transition-all duration-300 hover:border-slate-300 dark:hover:border-[#475569]"
                    >
                      {/* Deal & Discount Badges */}
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                        {p.is_featured && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-amber-500 text-white rounded-md shadow-sm">
                            Featured
                          </span>
                        )}
                        {p.is_trending && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-rose-500 text-white rounded-md shadow-sm">
                            Trending
                          </span>
                        )}
                        {p.stock_quantity <= 0 && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-slate-800 dark:bg-[#475569] text-white rounded-md shadow-sm">
                            OUT OF STOCK
                          </span>
                        )}
                        {discountPercent > 0 && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-rose-500 text-white rounded-md shadow-sm">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      {/* Premium Full-Width Thumbnail Container */}
                      <div className="relative h-44 sm:h-48 overflow-hidden bg-slate-50 dark:bg-[#283548] border-b border-slate-100 dark:border-[#334155]">
                        <img src={p.thumbnail_url ? resolveMediaUrl(p.thumbnail_url) : getProductFallbackImage(p.category?.name, p.title)} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103" />

                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-xs">
                          <button
                            onClick={() => setSelectedProduct(p)}
                            className="p-2.5 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-lg shadow-lg hover:bg-[#8B5CF6] hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title="Quick Inspect"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAddToWishlist(p.id!, p.title)}
                            className="p-2.5 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-lg shadow-lg hover:bg-[#8B5CF6] hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title="Add to Wishlist"
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product Metadata Details */}
                      <div className="p-4 flex-1 flex flex-col space-y-2.5 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8.5px] font-extrabold text-[#8B5CF6] bg-[#8B5CF6]/8 px-2 py-0.5 rounded border-[#8B5CF6]/15 uppercase tracking-wider">
                            {p.category?.name || 'STEM Module'}
                          </span>
                        </div>

                        <h3
                          onClick={() => navigate(`/shop/products/${p.id}`)}
                          className="font-extrabold text-slate-900 dark:text-white line-clamp-1 hover:text-[#8B5CF6] cursor-pointer transition-colors text-sm"
                        >
                          {p.title}
                        </h3>

                        {/* Star Rating system */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="flex items-center text-amber-500 gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-black text-slate-800 dark:text-[#e2e8f0]">{rating}</span>
                          </div>
                          <span className="text-slate-400 dark:text-[#64748b] text-[10px] font-semibold">({reviews} reviews)</span>
                        </div>

                        <p className="text-[11.5px] text-slate-500 dark:text-[#94a3b8] line-clamp-2 leading-relaxed">
                          {p.short_description || 'Active hardware components designed for educational integration.'}
                        </p>

                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wide pt-1 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 shrink-0" /> Express Delivery to School
                        </div>

                        {/* Pricing and Buying triggers */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#334155] mt-auto">
                          <div className="flex flex-col">
                            {p.discount_price ? (
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-extrabold text-slate-900 dark:text-white text-base">₹{p.discount_price}</span>
                                <span className="text-[10px] text-slate-400 dark:text-[#64748b] line-through">₹{p.price}</span>
                              </div>
                            ) : (
                              <span className="font-extrabold text-slate-900 dark:text-white text-base">₹{p.price}</span>
                            )}
                          </div>
                          {!isViewOnly && (
                            <button
                              disabled={p.stock_quantity <= 0}
                              onClick={() => handleAddToCart(p.id!, p.title)}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#6D28D9] hover:bg-[#5b21b6] disabled:bg-slate-300 dark:disabled:bg-[#334155] disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              <ShoppingCart className="w-3 h-3" /> Buy
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS MODAL DRAWER */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden flex bg-black/60 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto h-full flex flex-col space-y-6 animate-in slide-in-from-left duration-300 text-slate-300 text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="font-black text-sm uppercase tracking-wider text-white">Filter catalog</h2>
              <button onClick={() => setShowMobileFilters(false)} className="text-slate-500 hover:text-rose-500 font-bold cursor-pointer">✕ Close</button>
            </div>

            {/* Keyword Search */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Search Keyword</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-800 border-slate-700 rounded-xl focus:outline-none text-white font-semibold"
              />
            </div>

            {/* Departments */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Category Segment</label>
              <div className="space-y-1">
                <button
                  onClick={() => { handleCategorySelect(''); setShowMobileFilters(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${!selectedCat ? 'bg-[#8B5CF6]/20 text-white border-[#8B5CF6]/40' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  All Components
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { handleCategorySelect(cat.id!); setShowMobileFilters(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedCat === cat.id ? 'bg-[#8B5CF6]/20 text-white border-[#8B5CF6]/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Cap */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Max Price</label>
                <span className="px-2 py-0.5 bg-[#8B5CF6]/20 text-[#c084fc] text-xs font-black rounded-lg border border-[#8B5CF6]/30">₹{priceRange}</span>
              </div>
              <input
                type="range"
                min="0"
                max="30000"
                step="500"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#8B5CF6] bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[1000, 5000, 30000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPriceRange(preset)}
                    className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border text-center cursor-pointer ${
                      priceRange === preset
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-slate-800 text-slate-350 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {preset === 30000 ? 'Any' : `₹${preset >= 1000 ? preset/1000 + 'K' : preset}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock checkbox */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="instock-mobile-home"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#8B5CF6] border-slate-700 bg-slate-950 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="instock-mobile-home" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                Show In-Stock Only
              </label>
            </div>

            <button
              onClick={() => { fetchProducts(); setShowMobileFilters(false); }}
              className="w-full py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#8B5CF6]/25 mt-auto cursor-pointer"
            >
              Apply Filter Set
            </button>
          </div>
        </div>
      )}

      {/* QUICK VIEW POPUP MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#283548] hover:bg-rose-100 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-300 text-slate-500 dark:text-[#94a3b8] border-slate-200 dark:border-[#334155] transition-all cursor-pointer font-bold"
            >
              ✕
            </button>

            {/* Modal Image */}
            <div className="w-full md:w-1/2 bg-slate-50 dark:bg-[#283548] flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-[#334155]">
              <img
                src={selectedProduct.thumbnail_url ? resolveMediaUrl(selectedProduct.thumbnail_url) : getProductFallbackImage(selectedProduct.category?.name, selectedProduct.title)}
                alt={selectedProduct.title}
                className="max-h-[280px] object-contain rounded-xl mix-blend-multiply dark:mix-blend-normal"
              />
            </div>

            {/* Modal Product Details */}
            <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto max-h-[50vh] md:max-h-[90vh] text-slate-650 dark:text-[#cbd5e1] text-left">
              <span className="text-[10px] font-black text-[#8B5CF6] uppercase tracking-widest mb-1.5 block">
                {selectedProduct.category?.name}
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                {selectedProduct.title}
              </h2>
              <div className="flex items-center gap-2 mb-6">
                {selectedProduct.discount_price ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">₹{selectedProduct.discount_price}</span>
                    <span className="text-xs text-slate-400 dark:text-[#64748b] line-through font-semibold">₹{selectedProduct.price}</span>
                  </div>
                ) : (
                  <span className="text-2xl font-black text-slate-900 dark:text-white">₹{selectedProduct.price}</span>
                )}
              </div>

              <div className="space-y-5 flex-1 text-xs">
                <p className="text-slate-500 dark:text-[#94a3b8] leading-relaxed font-semibold">
                  {selectedProduct.short_description || selectedProduct.full_description}
                </p>

                {/* STEM parameters */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#283548] p-4 rounded-xl border-slate-100 dark:border-[#334155] font-bold">
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">SKU Code</span>
                    <span className="text-slate-800 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.sku_code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">Brand Name</span>
                    <span className="text-slate-800 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.brand_name || 'Generic'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">Grade Compatibility</span>
                    <span className="text-slate-800 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.school_grade_compatibility || 'All Grades'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">Recommended Age</span>
                    <span className="text-slate-800 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.recommended_age_group || '8+'}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-[#334155] mt-auto">
                  {!isViewOnly && (
                    <button
                      disabled={selectedProduct.stock_quantity <= 0}
                      onClick={() => {
                        handleAddToCart(selectedProduct.id!, selectedProduct.title);
                        setSelectedProduct(null);
                      }}
                      className="flex-1 py-3.5 bg-gradient-to-r from-[#6D28D9] to-[#2563EB] hover:from-[#5b21b6] hover:to-[#1d4ed8] text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#6D28D9]/20 transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      navigate(`/shop/products/${selectedProduct.id}`);
                    }}
                    className={`py-3.5 bg-slate-100 dark:bg-[#283548] text-slate-700 dark:text-[#e2e8f0] font-extrabold rounded-xl hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors text-xs uppercase tracking-wider ${isViewOnly ? 'flex-1' : 'px-6'}`}
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopHome;
