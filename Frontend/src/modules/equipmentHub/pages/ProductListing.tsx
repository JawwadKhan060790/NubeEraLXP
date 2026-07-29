import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  Check, 
  ShoppingCart, 
  Heart, 
  Eye, 
  Cpu,
  ChevronDown,
  LayoutGrid,
  LayoutList
} from 'lucide-react';
import { ecommerceService } from '@/services/ecommerceService';
import type { Product, ProductCategory } from '@/services/ecommerceService';
import { toast } from 'sonner';
import { resolveMediaUrl, getProductFallbackImage } from '@/utils/urlHelper';

const ProductListing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine if the logged-in user is a view-only role (no purchasing)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const viewOnlyRoles = ['admin', 'superadmin', 'staff'];
  const isViewOnly = viewOnlyRoles.includes(currentUser?.utype?.toLowerCase());

  // List states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State from search params or defaults
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCat, setSelectedCat] = useState(searchParams.get('categoryId') || '');
  const [priceRange, setPriceRange] = useState<number>(30000); // Max cap
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('latest');

  // Debounced copies of the high-frequency inputs (free-text search & price slider).
  // Without this, every keystroke / slider tick fired an API request — a real
  // performance problem under load. The displayed input stays instantly responsive
  // (bound to the raw state); the network fetch waits for the user to pause briefly.
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState(priceRange);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPriceRange(priceRange), 400);
    return () => clearTimeout(t);
  }, [priceRange]);

  // Sidebar controls
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Derived filter helper variables
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  useEffect(() => {
    // Sync filter state from URL when component mounts or search parameters change
    setSearchQuery(searchParams.get('search') || '');
    setSelectedCat(searchParams.get('categoryId') || '');
    if (searchParams.get('isFeatured')) setSortBy('featured');
    if (searchParams.get('isTrending')) setSortBy('popular');
  }, [searchParams]);

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const cats = await ecommerceService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadFiltersData();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {
        search: debouncedSearch || undefined,
        categoryId: selectedCat || undefined,
        maxPrice: debouncedPriceRange || undefined,
        isAvailable: inStockOnly || undefined,
        brand: selectedBrand || undefined,
        sortBy: sortBy || undefined
      };

      const data = await ecommerceService.getProducts(params);
      setProducts(data);

      // Collect unique brands from full dataset
      const uniqueBrands = Array.from(new Set(data.map(p => p.brand_name).filter(Boolean))) as string[];
      setBrands(uniqueBrands);

    } catch (err) {
      console.error('Failed to fetch products', err);
      toast.error('Could not load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, selectedCat, debouncedPriceRange, inStockOnly, selectedBrand, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      if (searchQuery) prev.set('search', searchQuery);
      else prev.delete('search');
      return prev;
    });
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCat(catId);
    setSearchParams(prev => {
      if (catId) prev.set('categoryId', catId);
      else prev.delete('categoryId');
      return prev;
    });
  };

  const handleAddToCart = async (productId: string, title: string) => {
    try {
      await ecommerceService.addToCart(productId, 1);
      toast.success(`"${title}" added to cart!`);
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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCat('');
    setPriceRange(30000);
    setInStockOnly(false);
    setSelectedBrand('');
    setSortBy('latest');
    setSearchParams({});
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300">
      
      {/* Dynamic Futuristic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-blue-50/80 border border-slate-200 dark:border-[#334155] rounded-3xl relative overflow-hidden">
        {/* Decorative Light Glows */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#8B5CF6]/10 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#6D28D9]/5 rounded-full blur-[80px]"></div>

        <div className="relative z-10 space-y-1.5 text-left">
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">
            STEM & Robotics Catalog
          </h1>
          <p className="text-slate-500 dark:text-[#94a3b8] text-xs font-semibold leading-relaxed">
            Browse, inspect, and deploy authentic hardware controllers, high-fidelity drone parts, and integrated sensor nodes.
          </p>
        </div>
        <button
          onClick={handleResetFilters}
          className="relative z-10 px-4 py-2 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#283548] border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#e2e8f0] hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer self-start md:self-auto shadow-sm"
        >
          Reset Filters
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* FILTERS PANEL - DESKTOP */}
        <aside className="w-full lg:w-64 flex-shrink-0 hidden lg:block space-y-6 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-sm h-fit">
          <h2 className="font-extrabold text-slate-800 dark:text-[#e2e8f0] uppercase tracking-wider text-xs border-b border-slate-100 dark:border-[#283548] pb-3 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#8B5CF6]" /> Core Filters
          </h2>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/30 text-slate-800 dark:text-[#e2e8f0] font-semibold"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-[#64748b]" />
            </div>
          </form>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Technology Category</label>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              <button
                onClick={() => handleCategorySelect('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${!selectedCat ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#283548] hover:text-slate-950 dark:hover:text-white'}`}
              >
                All Components
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id!)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${selectedCat === cat.id ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#283548] hover:text-slate-950 dark:hover:text-white'}`}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  {selectedCat === cat.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Price range selector with elegant styles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Max Budget</label>
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

          {/* Brand select */}
          {brands.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Brand Filter</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl text-slate-800 dark:text-[#e2e8f0] focus:outline-none focus:border-[#8B5CF6] font-bold"
              >
                <option value="">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          {/* Availability checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="instock"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-[#334155] cursor-pointer accent-[#8B5CF6]"
            />
            <label htmlFor="instock" className="text-xs font-bold text-slate-700 dark:text-[#e2e8f0] cursor-pointer">
              Show In-Stock Only
            </label>
          </div>
        </aside>

        {/* MAIN PRODUCT CATALOG */}
        <div className="flex-1 space-y-6">
          
          {/* SORTING & RESULTS CONTROL ROW */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94a3b8]">
              Showing <span className="text-slate-950 dark:text-white font-extrabold">{products.length}</span> verified STEM items
            </span>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#283548] text-slate-700 dark:text-[#e2e8f0] text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#334155] w-full sm:w-auto justify-center cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>

              <div className="relative flex items-center w-full sm:w-auto border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#283548] px-3 py-1.5">
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

              {/* Grid / List view toggle */}
              <div className="hidden sm:flex items-center gap-1 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-[#283548] p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-[#1e293b] text-[#8B5CF6] shadow-sm' : 'text-slate-400 dark:text-[#64748b] hover:text-slate-600 dark:hover:text-[#cbd5e1]'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-[#1e293b] text-[#8B5CF6] shadow-sm' : 'text-slate-400 dark:text-[#64748b] hover:text-slate-600 dark:hover:text-[#cbd5e1]'}`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* PRODUCTS LISTING */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm p-4 space-y-4 animate-pulse">
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
            <div className="text-center py-20 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-[#283548] rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-[#64748b]">
                <Cpu className="w-8 h-8 text-[#8B5CF6]" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">No matching hardware</h2>
              <p className="text-slate-500 dark:text-[#94a3b8] text-xs font-semibold max-w-sm mx-auto leading-relaxed">
                We couldn't find any products matching your specific metrics. Try adjusting your category choice or price caps.
              </p>
              <button 
                onClick={handleResetFilters}
                className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
              {products.map((p) => {
                const discountPercent = p.discount_price
                  ? Math.round(((p.price - p.discount_price) / p.price) * 100)
                  : 0;
                const isList = viewMode === 'list';

                return (
                  <div
                    key={p.id}
                    className={`group relative flex bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:border-[#8B5CF6]/30 transition-all duration-300 ${isList ? 'flex-row hover:-translate-y-0.5' : 'flex-col hover:scale-[1.02] hover:-translate-y-1'}`}
                  >
                    {/* Corner gradient backdrop decoration */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#8B5CF6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-[#6D28D9] opacity-0 group-hover:opacity-10 pointer-events-none blur-xl transition-opacity"></div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                      {p.is_featured && (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-white rounded-lg shadow-md">
                          Featured
                        </span>
                      )}
                      {p.is_trending && (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-rose-500 text-white rounded-lg shadow-md">
                          Trending
                        </span>
                      )}
                      {p.stock_quantity <= 0 && (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-slate-800 text-white rounded-lg shadow-md">
                          OUT OF STOCK
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-rose-500 text-white rounded-lg shadow-md">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className={`relative overflow-hidden bg-slate-50 dark:bg-[#283548] flex items-center justify-center border-slate-100 dark:border-[#283548] shrink-0 ${isList ? 'w-36 sm:w-48 border-r p-4' : 'aspect-square p-6 border-b'}`}>
                      <img
                        src={p.thumbnail_url ? resolveMediaUrl(p.thumbnail_url) : getProductFallbackImage(p.category?.name, p.title)}
                        alt={p.title}
                        className="w-full h-full object-contain mix-blend-multiply  transition-transform duration-500 group-hover:scale-108"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-sm">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="p-3 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-xl shadow-lg hover:bg-slate-100 dark:hover:bg-[#283548] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          title="Quick Inspect"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAddToWishlist(p.id!, p.title)}
                          className="p-3 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-xl shadow-lg hover:bg-slate-100 dark:hover:bg-[#283548] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          title="Add to Wishlist"
                        >
                          <Heart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Content details */}
                    <div className={`flex-1 flex space-y-2 ${isList ? 'p-4 sm:p-5 flex-col sm:flex-row sm:items-center sm:space-y-0 sm:gap-4' : 'p-5 flex-col'}`}>
                      <div className={isList ? 'flex-1 min-w-0 space-y-1.5' : 'contents'}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded border border-[#8B5CF6]/20 uppercase tracking-widest">
                            {p.category?.name || 'STEM Module'}
                          </span>
                        </div>
                        <h3
                          onClick={() => navigate(`/shop/products/${p.id}`)}
                          className={`font-bold text-slate-800 dark:text-[#e2e8f0] hover:text-[#8B5CF6] cursor-pointer transition-colors text-sm ${isList ? 'line-clamp-1' : 'line-clamp-1'}`}
                        >
                          {p.title}
                        </h3>
                        <p className={`text-xs text-slate-500 dark:text-[#94a3b8] leading-relaxed ${isList ? 'line-clamp-2 sm:line-clamp-1' : 'line-clamp-2 flex-1'}`}>
                          {p.short_description || 'Active hardware components designed for educational integration.'}
                        </p>
                      </div>

                      {/* Pricing block */}
                      <div className={`flex items-center justify-between border-slate-100 dark:border-[#283548] ${isList ? 'pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-5 sm:flex-col sm:items-end sm:justify-center gap-2 shrink-0' : 'pt-4 border-t mt-auto'}`}>
                        <div className="flex flex-col">
                          {p.discount_price ? (
                            <>
                              <span className="text-[10px] text-slate-400 dark:text-[#64748b] line-through">₹{p.price}</span>
                              <span className="font-black text-slate-900 dark:text-white text-base">₹{p.discount_price}</span>
                            </>
                          ) : (
                            <span className="font-black text-slate-900 dark:text-white text-base">₹{p.price}</span>
                          )}
                        </div>
                        {!isViewOnly && (
                          <button
                            disabled={p.stock_quantity <= 0}
                            onClick={() => handleAddToCart(p.id!, p.title)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Buy
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

      {/* MOBILE FILTERS MODAL DRAWER */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden flex bg-black/60 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto h-full flex flex-col space-y-6 animate-in slide-in-from-left duration-300 text-slate-300">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="font-black text-sm uppercase tracking-wider text-white">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="text-slate-500 hover:text-rose-500 font-bold cursor-pointer">✕ Close</button>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Categories</label>
              <div className="space-y-1">
                <button 
                  onClick={() => { handleCategorySelect(''); setShowMobileFilters(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${!selectedCat ? 'bg-[#8B5CF6]/20 text-white border border-[#8B5CF6]/40' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  All Components
                </button>
                {categories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => { handleCategorySelect(cat.id!); setShowMobileFilters(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedCat === cat.id ? 'bg-[#8B5CF6]/20 text-white border border-[#8B5CF6]/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price slider */}
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

            {/* Availability */}
            <div className="flex items-center gap-2.5">
              <input 
                type="checkbox" 
                id="instock-mobile"
                checked={inStockOnly} 
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-[#8B5CF6] border-slate-700 bg-slate-950 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="instock-mobile" className="text-xs font-bold text-slate-300 cursor-pointer">
                Show In-Stock Only
              </label>
            </div>

            <button 
              onClick={() => { fetchProducts(); setShowMobileFilters(false); }}
              className="w-full py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#8B5CF6]/25 mt-auto cursor-pointer"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* QUICK VIEW POPUP MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 dark:hover:text-rose-300 text-slate-400 dark:text-[#64748b] border border-slate-200/50 dark:border-[#334155]/50 transition-all cursor-pointer font-bold animate-in spin-in-12 duration-300"
            >
              ✕
            </button>

            {/* Image display */}
            <div className="w-full md:w-1/2 bg-slate-50 dark:bg-[#283548] flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-[#334155]">
              <img
                src={selectedProduct.thumbnail_url ? resolveMediaUrl(selectedProduct.thumbnail_url) : getProductFallbackImage(selectedProduct.category?.name, selectedProduct.title)}
                alt={selectedProduct.title}
                className="max-h-[280px] object-contain rounded-xl mix-blend-multiply"
              />
            </div>

            {/* Product Details */}
            <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto max-h-[50vh] md:max-h-[90vh] text-slate-600 dark:text-[#cbd5e1]">
              <span className="text-[10px] font-black text-[#8B5CF6] bg-[#8B5CF6]/10 px-2.5 py-0.5 rounded border border-[#8B5CF6]/20 uppercase tracking-widest mb-3.5 w-fit block">
                {selectedProduct.category?.name}
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-[#e2e8f0] mb-2 leading-tight">
                {selectedProduct.title}
              </h2>
              <div className="flex items-center gap-2 mb-6">
                {selectedProduct.discount_price ? (
                  <>
                    <span className="text-xs text-slate-400 dark:text-[#64748b] line-through">₹{selectedProduct.price}</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">₹{selectedProduct.discount_price}</span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-slate-900 dark:text-white">₹{selectedProduct.price}</span>
                )}
              </div>

              <div className="space-y-5 flex-1 text-xs">
                <p className="text-slate-500 dark:text-[#94a3b8] leading-relaxed font-semibold">
                  {selectedProduct.short_description || selectedProduct.full_description}
                </p>

                {/* STEM parameters */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#283548] p-4 rounded-xl border border-slate-100 dark:border-[#334155] font-bold">
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">SKU Code</span>
                    <span className="text-slate-700 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.sku_code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">Brand Name</span>
                    <span className="text-slate-700 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.brand_name || 'Generic'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">Grade Compatibility</span>
                    <span className="text-slate-700 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.school_grade_compatibility || 'All Grades'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#64748b] text-[10px] uppercase block tracking-wider">Recommended Age</span>
                    <span className="text-slate-700 dark:text-[#e2e8f0] font-extrabold">{selectedProduct.recommended_age_group || '8+'}</span>
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
                      className="flex-1 py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7c3aed] hover:to-[#5b21b6] text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/20 transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      navigate(`/shop/products/${selectedProduct.id}`);
                    }}
                    className={`py-3.5 bg-slate-100 dark:bg-[#283548] hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-700 dark:text-[#e2e8f0] border border-slate-200 dark:border-[#334155] font-extrabold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer ${isViewOnly ? 'flex-1' : 'px-6'}`}
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

export default ProductListing;
