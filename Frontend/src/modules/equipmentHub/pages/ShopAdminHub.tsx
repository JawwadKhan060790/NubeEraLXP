import ConfirmModal from '@/components/ConfirmModal';
import StatGridCards, { SkeletonStatGrid } from '@/components/StatGrid';
import {
  DashboardPageShell,
  DashboardTabBar, StatGrid,
  WelcomeBanner,
} from '@/components/dashboard/DashboardKit';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import type { Product, ProductCategory } from '@/services/ecommerceService';
import { ecommerceService } from '@/services/ecommerceService';
import { resolveMediaUrl } from '@/utils/urlHelper';
import { jsPDF } from 'jspdf';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  Edit3,
  Info,
  Layers,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import { toast } from 'sonner';

const ShopAdminHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'categories' | 'orders' | 'inventory'>('analytics');
  const { confirmState, requestConfirm } = useConfirm();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedInventoryProductId, setSelectedInventoryProductId] = useState<string | null>(null);

  // Loaded lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  // Default to an empty-but-truthy shape (not null) so the Dashboard tab's KPI cards —
  // none of which actually read from `stats` — never get blanked out by a stats-fetch
  // failure. Only the two trend charts read `stats.monthlyTrends` / `stats.ordersBySchool`,
  // and they already render their own "No data available" fallback when those are empty.
  const [stats, setStats] = useState<any>({ monthlyTrends: [], ordersBySchool: [] });
  // Tracks whether the dashboard-stats aggregation call specifically failed, so we can show
  // a small inline notice on the charts instead of either a silent blank area or (previously)
  // wiping out the entire Manage Shop hub — see loadAllHubData for the root-cause writeup.
  const [statsError, setStatsError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  // Common search
  const [searchWord, setSearchWord] = useState('');

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>({
    title: '',
    short_description: '',
    full_description: '',
    category_id: '',
    sku_code: '',
    price: 0,
    discount_price: 0,
    stock_quantity: 0,
    brand_name: '',
    school_grade_compatibility: '',
    recommended_age_group: '',
    is_featured: false,
    is_trending: false,
    is_new_arrival: true,
    thumbnail_url: ''
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<any>({ name: '', description: '' });

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updateStatus, setUpdateStatus] = useState({ status: '', notes: '' });

  const loadAllHubData = async () => {
    setLoading(true);
    try {
      // Catalog, categories, and orders are fetched together — these three are what the
      // Products / Categories / Orders / Stock-Alerts tabs need, and they should succeed
      // or fail as one unit.
      //
      // Dashboard stats (below, after this try/finally) is fetched SEPARATELY on purpose.
      // It used to be bundled into this same Promise.all alongside these three calls. That
      // meant a failure or slow response in the stats aggregation endpoint alone — which
      // runs several GroupBy aggregations server-side and is the heaviest of the four calls
      // — caused Promise.all to reject, so none of setProducts/setCategories/setOrders/
      // setStats ever ran. The admin would land on Manage Shop (which defaults to the
      // Dashboard tab) and see a totally blank page with only a toast that's easy to miss.
      // This was the root cause of "E-commerce dashboard not showing for manage shop":
      // fetching stats independently means a hiccup there can no longer take down the
      // catalog/orders data, and the Dashboard tab itself no longer depends on `stats`
      // being present to render its KPI cards (see the `stats` state default above).
      const [prods, cats, ords] = await Promise.all([
        ecommerceService.getProductsAdmin(),
        ecommerceService.getCategoriesAdmin(),
        ecommerceService.getAdminOrders()
      ]);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
    } catch (err) {
      console.error('Failed to load shop administration records', err);
      toast.error('Could not fetch records.');
    } finally {
      setLoading(false);
    }

    try {
      const statsData = await ecommerceService.getDashboardStats();
      setStats(statsData || { monthlyTrends: [], ordersBySchool: [] });
      setStatsError(false);
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
      setStatsError(true);
      // Keep the previous/default stats shape rather than clearing it, so the charts'
      // existing empty-state messaging handles this gracefully instead of crashing.
    }
  };

  useEffect(() => {
    loadAllHubData();
  }, []);

  // --- Category Actions ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory.name) return;
    try {
      if (currentCategory.id) {
        await ecommerceService.updateCategory(currentCategory.id, currentCategory);
        toast.success('Category updated successfully.');
      } else {
        await ecommerceService.createCategory(currentCategory);
        toast.success('Category created successfully.');
      }
      setShowCategoryModal(false);
      loadAllHubData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const ok = await requestConfirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category?',
      variant: 'danger',
      confirmLabel: 'Yes, Delete'
    });
    if (!ok) return;
    try {
      await ecommerceService.deleteCategory(id);
      toast.success('Category deleted.');
      loadAllHubData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete.');
    }
  };

  // --- Product Actions ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct.title || !currentProduct.sku_code || !currentProduct.category_id) {
      toast.error('Please fill in Title, SKU, and Category.');
      return;
    }

    // Map pricing to correct floats. Preserve existing rich JSON fields (features/specs/tags/
    // gallery images) on edit instead of clobbering them with empty defaults — only default
    // them for brand-new products where no prior data exists.
    const isEditing = Boolean(currentProduct.id);
    const payload = {
      ...currentProduct,
      title: currentProduct.title,
      shortDescription: currentProduct.short_description || currentProduct.shortDescription || '',
      fullDescription: currentProduct.full_description || currentProduct.fullDescription || '',
      categoryId: currentProduct.category_id || currentProduct.categoryId || '',
      skuCode: currentProduct.sku_code || currentProduct.skuCode || '',
      price: Number(currentProduct.price),
      discountPrice: currentProduct.discount_price ? Number(currentProduct.discount_price) : (currentProduct.discountPrice ? Number(currentProduct.discountPrice) : null),
      stockQuantity: Number(currentProduct.stock_quantity ?? currentProduct.stockQuantity ?? 0),
      brandName: currentProduct.brand_name || currentProduct.brandName || '',
      thumbnailUrl: currentProduct.thumbnail_url || currentProduct.thumbnailUrl || '',
      schoolGradeCompatibility: currentProduct.school_grade_compatibility || currentProduct.schoolGradeCompatibility || '',
      recommendedAgeGroup: currentProduct.recommended_age_group || currentProduct.recommendedAgeGroup || '',
      isFeatured: Boolean(currentProduct.is_featured ?? currentProduct.isFeatured),
      isTrending: Boolean(currentProduct.is_trending ?? currentProduct.isTrending),
      isNewArrival: Boolean(currentProduct.is_new_arrival ?? currentProduct.isNewArrival),
      isVisible: currentProduct.is_visible !== undefined ? currentProduct.is_visible : (currentProduct.isVisible !== undefined ? currentProduct.isVisible : true),
      imagesJson: isEditing && (currentProduct.images_json || currentProduct.imagesJson)
        ? (currentProduct.images_json || currentProduct.imagesJson)
        : JSON.stringify([currentProduct.thumbnail_url || currentProduct.thumbnailUrl].filter(Boolean)),
      featuresJson: isEditing && (currentProduct.features_json || currentProduct.featuresJson)
        ? (currentProduct.features_json || currentProduct.featuresJson)
        : JSON.stringify([]),
      specificationsJson: isEditing && (currentProduct.specifications_json || currentProduct.specificationsJson)
        ? (currentProduct.specifications_json || currentProduct.specificationsJson)
        : JSON.stringify({}),
      tagsJson: isEditing && (currentProduct.tags_json || currentProduct.tagsJson)
        ? (currentProduct.tags_json || currentProduct.tagsJson)
        : JSON.stringify([]),

      short_description: currentProduct.short_description || currentProduct.shortDescription || '',
      full_description: currentProduct.full_description || currentProduct.fullDescription || '',
      category_id: currentProduct.category_id || currentProduct.categoryId || '',
      sku_code: currentProduct.sku_code || currentProduct.skuCode || '',
      discount_price: currentProduct.discount_price ? Number(currentProduct.discount_price) : (currentProduct.discountPrice ? Number(currentProduct.discountPrice) : null),
      stock_quantity: Number(currentProduct.stock_quantity ?? currentProduct.stockQuantity ?? 0),
      brand_name: currentProduct.brand_name || currentProduct.brandName || '',
      thumbnail_url: currentProduct.thumbnail_url || currentProduct.thumbnailUrl || '',
      is_featured: Boolean(currentProduct.is_featured ?? currentProduct.isFeatured),
      is_trending: Boolean(currentProduct.is_trending ?? currentProduct.isTrending),
      is_new_arrival: Boolean(currentProduct.is_new_arrival ?? currentProduct.isNewArrival),
      is_visible: currentProduct.is_visible !== undefined ? currentProduct.is_visible : (currentProduct.isVisible !== undefined ? currentProduct.isVisible : true),
      images_json: isEditing && (currentProduct.images_json || currentProduct.imagesJson)
        ? (currentProduct.images_json || currentProduct.imagesJson)
        : JSON.stringify([currentProduct.thumbnail_url || currentProduct.thumbnailUrl].filter(Boolean)),
      features_json: isEditing && (currentProduct.features_json || currentProduct.featuresJson)
        ? (currentProduct.features_json || currentProduct.featuresJson)
        : JSON.stringify([]),
      specifications_json: isEditing && (currentProduct.specifications_json || currentProduct.specificationsJson)
        ? (currentProduct.specifications_json || currentProduct.specificationsJson)
        : JSON.stringify({}),
      tags_json: isEditing && (currentProduct.tags_json || currentProduct.tagsJson)
        ? (currentProduct.tags_json || currentProduct.tagsJson)
        : JSON.stringify([])
    };

    try {
      if (currentProduct.id) {
        await ecommerceService.updateProduct(currentProduct.id, payload);
        toast.success('Product updated successfully.');
      } else {
        await ecommerceService.createProduct(payload);
        toast.success('Product added successfully.');
      }
      setShowProductModal(false);
      loadAllHubData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save product.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const ok = await requestConfirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product?',
      variant: 'danger',
      confirmLabel: 'Yes, Delete'
    });
    if (!ok) return;
    try {
      await ecommerceService.deleteProduct(id);
      toast.success('Product deleted.');
      loadAllHubData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete product.');
    }
  };

  const handleToggleProductStatus = async (prod: Product, field: string) => {
    const updated = {
      ...prod,
      is_featured: field === 'featured' ? !prod.is_featured : prod.is_featured,
      is_trending: field === 'trending' ? !prod.is_trending : prod.is_trending,
      is_visible: field === 'visible' ? !prod.is_visible : prod.is_visible
    };
    try {
      await ecommerceService.updateProduct(prod.id!, updated);
      toast.success('Updated.');
      loadAllHubData();
    } catch (err) {
      toast.error('Update failed.');
    }
  };

  const handleQuickRestock = async (qty: any) => {
    const prod = products.find(p => p.id === selectedInventoryProductId);
    if (!prod) return;
    const payload = {
      ...prod,
      stock_quantity: Number(qty)
    };
    try {
      await ecommerceService.updateProduct(prod.id!, payload);
      toast.success('Stock level updated.');
      loadAllHubData();
    } catch (err) {
      toast.error('Restock action failed.');
    }
  };

  // --- Order status update ---
  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await ecommerceService.updateOrderStatus(selectedOrder.id, {
        status: updateStatus.status,
        deliveryNotes: updateStatus.notes || undefined
      });
      toast.success('Order status updated successfully.');
      setSelectedOrder(null);
      loadAllHubData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Fulfillment update failed.');
    }
  };



  // New: Download invoice for an order
  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const invoiceData = await ecommerceService.getInvoice(orderId);
      const doc = new jsPDF();
      const lineHeight = 10;
      let y = 20;
      doc.setFontSize(16);
      doc.text('Invoice', 105, y, { align: 'center' });
      y += lineHeight * 2;
      doc.setFontSize(12);
      doc.text(`Invoice Number: ${invoiceData.invoiceNumber ?? 'N/A'}`, 20, y);
      y += lineHeight;
      doc.text(`Order Reference: ${invoiceData.orderReference ?? 'N/A'}`, 20, y);
      y += lineHeight;
      doc.text(`Date: ${invoiceData.date ? new Date(invoiceData.date).toLocaleDateString() : 'N/A'}`, 20, y);
      y += lineHeight * 2;
      doc.text('Billed To:', 20, y);
      y += lineHeight;
      doc.text(`Student: ${invoiceData.studentName ?? 'N/A'}`, 30, y);
      y += lineHeight;
      doc.text(`Parent: ${invoiceData.parentName ?? 'N/A'}`, 30, y);
      y += lineHeight;
      doc.text(`School: ${invoiceData.schoolName ?? 'N/A'}`, 30, y);
      y += lineHeight * 2;
      doc.text('Shipping & Delivery:', 20, y);
      y += lineHeight;
      doc.text(`Address: ${invoiceData.shippingAddress ?? 'N/A'}`, 30, y);
      y += lineHeight;
      doc.text(`Contact: ${invoiceData.contact ?? 'N/A'}`, 30, y);
      y += lineHeight;
      doc.text(`Method: ${invoiceData.deliveryMethod ?? 'N/A'}`, 30, y);
      y += lineHeight * 2;
      doc.text(`Total Amount: ₹${invoiceData.totalAmount ?? 0}`, 20, y);
      doc.save(`invoice_${orderId}.pdf`);
      toast.success('Invoice PDF downloaded.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to download invoice.');
    }
  };

  // Helper to format date safely
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString();
  };

  // Filters search grids
  const safeString = (val: any) => (val || '').toString().toLowerCase();

  const filteredProducts = (products || []).filter(p => {
    return safeString(p.title).includes(searchWord.toLowerCase()) ||
      safeString(p.sku_code).includes(searchWord.toLowerCase()) ||
      safeString(p.brand_name).includes(searchWord.toLowerCase()) ||
      safeString(p.category?.name).includes(searchWord.toLowerCase());
  });

  const filteredCategories = (categories || []).filter(c => {
    return safeString(c.name).includes(searchWord.toLowerCase()) ||
      safeString(c.description).includes(searchWord.toLowerCase());
  });

  const filteredOrders = (orders || []).filter(o => {
    console.log("MY object", o);
    return safeString(o.orderNumber).includes(searchWord.toLowerCase()) ||
      safeString(o.studentName).includes(searchWord.toLowerCase()) ||
      safeString(o.schoolName).includes(searchWord.toLowerCase()) ||
      safeString(o.status).includes(searchWord.toLowerCase());
  });

  const criticalInventory = products.filter(p => p.stock_quantity <= 5);

  // Derived KPI sets for the Manage Shop dashboard. Computed once here (rather than inline,
  // repeatedly, inside JSX) so every card and any future consumer agrees on the same definitions:
  //   • Active     = visible to shoppers AND currently purchasable (in stock)
  //   • Out of stock = zero remaining units
  //   • Pending approval = there is no formal approval workflow/field on Product yet, so this
  //     is mapped to the closest real signal we have — items an admin has hidden from the
  //     storefront (is_visible === false), i.e. awaiting review/publish.
  const activeProducts = products.filter(p => p.is_visible !== false && p.stock_quantity > 0);
  const outOfStockProducts = products.filter(p => p.stock_quantity <= 0);
  const pendingApprovalProducts = products.filter(p => p.is_visible === false);

  useEffect(() => {
    if (filteredProducts.length > 0) {
      if (!selectedProductId || !filteredProducts.some(p => p.id === selectedProductId)) {
        setSelectedProductId(filteredProducts[0].id || null);
      }
    } else {
      setSelectedProductId(null);
    }
  }, [filteredProducts, selectedProductId]);

  useEffect(() => {
    if (filteredCategories.length > 0) {
      if (!selectedCategoryId || !filteredCategories.some(c => c.id === selectedCategoryId)) {
        setSelectedCategoryId(filteredCategories[0].id || null);
      }
    } else {
      setSelectedCategoryId(null);
    }
  }, [filteredCategories, selectedCategoryId]);

  useEffect(() => {
    if (filteredOrders.length > 0) {
      if (!selectedOrderId || !filteredOrders.some(o => o.id === selectedOrderId)) {
        setSelectedOrderId(filteredOrders[0].id || null);
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [filteredOrders, selectedOrderId]);

  useEffect(() => {
    if (criticalInventory.length > 0) {
      if (!selectedInventoryProductId || !criticalInventory.some(p => p.id === selectedInventoryProductId)) {
        setSelectedInventoryProductId(criticalInventory[0].id || null);
      }
    } else {
      setSelectedInventoryProductId(null);
    }
  }, [criticalInventory, selectedInventoryProductId]);

  if (loading) {
    return (
      <DashboardPageShell>
        <WelcomeBanner
          badge="STEM Lab Items"
          badgeColor="indigo"
          title="STEM Lab Items"
          subtitle="Configure products catalog, inventory stocks, categories, and track student orders"
        />
        <StatGrid cols={5}>
          <SkeletonStatGrid count={5} />
        </StatGrid>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>

      {/* Page Title Header */}
      <WelcomeBanner
        badge="STEM Lab Items"
        badgeColor="indigo"
        title="STEM Lab Items"
        subtitle="Configure products catalog, inventory stocks, categories, and track student orders"
      />

      {/* Tab Selectors */}
      <DashboardTabBar
        tabs={[
          { key: 'analytics',   label: 'Dashboard' },
          { key: 'products',    label: 'Manage Products' },
          { key: 'categories',  label: 'Manage Categories' },
          { key: 'orders',      label: 'Orders' },
          { key: 'inventory',   label: 'Stock Alerts' },
        ]}
        active={activeTab}
        onChange={(k) => { setActiveTab(k as typeof activeTab); setSearchWord(''); }}
        variant="pills"
      />

      {/* --- TAB 1: SUMMARY DASHBOARD ---
          Intentionally NOT gated on `stats` being present (it used to be `activeTab ===
          'analytics' && stats && (...)`, which blanked this entire tab — including the
          KPI cards below that don't even read from `stats` — whenever the dashboard-stats
          call failed). See loadAllHubData for the full root-cause writeup. */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {statsError && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Revenue trend charts couldn&apos;t be loaded. Product, order and stock counts below are unaffected.
              </span>
              <button
                onClick={loadAllHubData}
                className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-lg font-bold uppercase tracking-wider text-[10px] shrink-0"
              >
                Retry
              </button>
            </div>
          )}
          {/* PRIMARY KPI ROW — the five headline metrics every shop admin checks first */}
          <StatGrid cols={4}>
            <StatGridCards stats={[
              {
                title: "Total Products",
                value: products.length,
                icon: <Package className="w-5 h-5" />,
                color: "emerald",
                subtitle: `Across ${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`
              },
              {
                title: "Active Products",
                value: activeProducts.length,
                icon: <PackageCheck className="w-5 h-5" />,
                color: "sky",
                subtitle: "Visible & in stock"
              },
              {
                title: "Out of Stock",
                value: outOfStockProducts.length,
                icon: <PackageX className="w-5 h-5" />,
                color: "rose",
                subtitle: outOfStockProducts.length > 0 ? '⚠ Needs restock' : 'All stocked'
              }, 
              {
                title: "Total Orders",
                value: orders.length,
                icon: <ShoppingBag className="w-5 h-5" />,
                color: "indigo",
                subtitle: `${orders.filter(o => o.status === 'Delivered').length} delivered`
              }
            ]} />
          </StatGrid>

          {/* SECONDARY OPERATIONAL ROW — fulfilment pipeline & inventory health at a glance */}
          <StatGrid cols={3}>
            <StatGridCards stats={[
              {
                title: "Categories",
                value: categories.length,
                icon: <Layers className="w-5 h-5" />,
                color: "violet"
              },
              {
                title: "Awaiting Shipment",
                value: orders.filter(o => ['Order Placed', 'Confirmed', 'Packed'].includes(o.status)).length,
                icon: <Truck className="w-5 h-5" />,
                color: "teal",
                subtitle: "Not yet dispatched"
              },
              {
                title: "Low Stock",
                value: criticalInventory.length,
                icon: <AlertTriangle className="w-5 h-5" />,
                color: "sky",
                subtitle: criticalInventory.length > 0 ? '⚠ 5 units or fewer' : 'All stocked'
              }
            ]} />
          </StatGrid>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recharts: Monthly Sales Revenue */}
            <div className="bg-white  border border-slate-200  rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-800  flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" /> Monthly Revenue Trends (₹)
              </h3>
              {!stats.monthlyTrends || stats.monthlyTrends.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">No monthly stats available.</p>
              ) : (
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                        formatter={(value: any) => [`₹${value}`, 'Revenue']}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* School Revenue classifications - Donut Chart */}
            <div className="bg-white  border border-slate-200  rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-800  flex items-center gap-1">
                <Layers className="w-4 h-4 text-primary" /> Orders Distribution by Campus
              </h3>
              {!stats.ordersBySchool || stats.ordersBySchool.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">No school distributions available.</p>
              ) : (
                <div className="h-64 w-full mt-4 flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.ordersBySchool}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="schoolName"
                      >
                        {stats.ordersBySchool.map((_entry: any, index: number) => {
                          const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        formatter={(value: any, name: any, props: any) => [`${value} Orders (₹${props.payload.revenue || 0})`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-1/2 space-y-2 pr-4">
                    {stats.ordersBySchool.slice(0, 5).map((s: any, idx: number) => {
                      const colors = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-violet-500', 'bg-pink-500'];
                      return (
                        <div key={idx} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`}></span>
                            <span className="text-slate-600  truncate">{s.schoolName}</span>
                          </div>
                          <span className="font-bold text-slate-800 ">{s.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: PRODUCTS CATALOG LIST --- */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Search & Master List */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col h-[650px] overflow-hidden">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-[#f1f5f9]">Products Catalog</h3>
                <button
                  onClick={() => {
                    setCurrentProduct({
                      title: '', short_description: '', full_description: '', category_id: categories[0]?.id || '', sku_code: '', price: 0, discount_price: 0, stock_quantity: 10, brand_name: '', school_grade_compatibility: '', recommended_age_group: '', is_featured: false, is_trending: false, is_new_arrival: true, thumbnail_url: ''
                    });
                    setShowProductModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-primary hover:bg-primary/95 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search catalog by SKU or title..."
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-[#1e293b] rounded-lg focus:outline-none focus:border-primary text-slate-800 dark:text-[#f1f5f9]"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-[#020617] border border-dashed border-slate-200 dark:border-[#1e293b] rounded-xl">
                  No products found
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  const stockBadge = p.stock_quantity <= 0
                    ? { label: 'Out of Stock', cls: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50' }
                    : p.stock_quantity <= 5
                      ? { label: `Low: ${p.stock_quantity}`, cls: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50' }
                      : { label: `In Stock: ${p.stock_quantity}`, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' };
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id || null)}
                      className={`group p-3 rounded-xl border transition-all text-left flex gap-3 cursor-pointer select-none ${isSelected
                        ? 'bg-slate-50 dark:bg-[#162032] border-primary shadow-sm'
                        : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-[#162032] hover:bg-slate-50/50 dark:hover:bg-[#162032]/50 hover:border-slate-300 dark:hover:border-[#334155] hover:shadow-md'
                        }`}
                    >
                      <div className="w-12 h-12 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-[#1e293b] rounded-lg flex items-center justify-center p-1 shrink-0">
                        <img src={p.thumbnail_url ? resolveMediaUrl(p.thumbnail_url) : 'https://via.placeholder.com/150'} alt={p.title} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">{p.title}</span>
                        <span className="text-[10px] text-slate-405 block font-normal">SKU: {p.sku_code}</span>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-[#cbd5e1]">₹{p.discount_price || p.price}</span>
                          <span className="text-slate-300 dark:text-[#334155]">•</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{p.category?.name || 'Uncategorized'}</span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded border ${stockBadge.cls}`}>{stockBadge.label}</span>
                        </div>
                      </div>
                      {/* Quick Actions (visible on hover) */}
                      <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setCurrentProduct(p); setShowProductModal(true); }}
                          title="Quick Edit"
                          className="p-1.5 bg-slate-50 hover:bg-primary text-slate-500 hover:text-white dark:bg-[#162032] rounded-lg transition-all active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id!); }}
                          title="Delete Product"
                          className="p-1.5 bg-slate-50 hover:bg-rose-600 text-slate-500 hover:text-white dark:bg-[#162032] rounded-lg transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Detail View & Interactive Controls */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-6 shadow-sm min-h-[650px] overflow-y-auto">
            {(() => {
              const activeProduct = products.find(p => p.id === selectedProductId);
              if (!activeProduct) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <ShoppingBag className="w-12 h-12 mb-3 text-slate-350 dark:text-[#334155]" />
                    <p className="text-sm font-semibold">Select a product to view specifications and controls</p>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Title and main metadata */}
                  <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-slate-100 dark:border-[#162032]">
                    <div className="w-full md:w-48 h-48 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-[#1e293b] rounded-2xl flex items-center justify-center p-3 relative shadow-inner">

                      <img src={activeProduct.thumbnail_url ? resolveMediaUrl(activeProduct.thumbnail_url) : 'https://via.placeholder.com/150'} alt={activeProduct.title} className="max-h-full max-w-full object-contain" />
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {activeProduct.is_featured && <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded shadow-sm">Featured</span>}
                        {activeProduct.is_trending && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase rounded shadow-sm">Trending</span>}
                        {activeProduct.is_new_arrival && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-black uppercase rounded shadow-sm">New</span>}
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-105 dark:bg-[#1e293b] text-slate-600 dark:text-[#94a3b8] text-[10px] font-bold rounded uppercase tracking-wider">
                            {activeProduct.category?.name || 'Uncategorized'}
                          </span>
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                            {activeProduct.brand_name || 'Generic'}
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-955 dark:text-white leading-tight">{activeProduct.title}</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">SKU: {activeProduct.sku_code}</p>
                      </div>

                      <div className="flex items-baseline gap-3">
                        {activeProduct.discount_price ? (
                          <>
                            <span className="text-2xl font-black text-slate-950 dark:text-white">₹{activeProduct.discount_price}</span>
                            <span className="text-xs text-slate-400 line-through font-normal">₹{activeProduct.price}</span>
                            <span className="text-xs text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                              Save ₹{activeProduct.price - activeProduct.discount_price}
                            </span>
                          </>
                        ) : (
                          <span className="text-2xl font-black text-slate-955 dark:text-white">₹{activeProduct.price}</span>
                        )}
                      </div>

                      {/* Stock status indicator */}
                      <div>
                        {activeProduct.stock_quantity <= 0 ? (
                          <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-black rounded-lg border border-rose-100 dark:border-rose-900/50">
                            Out of Stock
                          </span>
                        ) : activeProduct.stock_quantity <= 5 ? (
                          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-black rounded-lg border border-amber-100 dark:border-amber-900/50 animate-pulse">
                            Critical Low Stock: {activeProduct.stock_quantity} left
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                            In Stock: {activeProduct.stock_quantity} units
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Descriptions and info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 dark:text-[#b0bccc]">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-1.5">Short Summary</h4>
                        <p className="leading-relaxed bg-slate-50 dark:bg-[#020617] p-3 rounded-xl border border-slate-100 dark:border-[#162032]">
                          {activeProduct.short_description || 'No description provided.'}
                        </p>
                      </div>

                      {activeProduct.full_description && (
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-1.5">Full Details</h4>
                          <p className="leading-relaxed bg-slate-50 dark:bg-[#020617] p-3 rounded-xl border border-slate-100 dark:border-[#162032] max-h-36 overflow-y-auto">
                            {activeProduct.full_description}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 bg-slate-50 dark:bg-[#020617] p-4 rounded-xl border border-slate-100 dark:border-[#162032]">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-3 border-b border-slate-200 dark:border-[#1e293b] pb-1.5">Compatibility Details</h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Grades</span>
                          <span className="font-extrabold text-slate-800 dark:text-[#e2e8f0]">{activeProduct.school_grade_compatibility || 'All Grades'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Age Group</span>
                          <span className="font-extrabold text-slate-800 dark:text-[#e2e8f0]">{activeProduct.recommended_age_group || 'All Ages'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-[#1e293b] space-y-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Toggle Catalog Flags</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleToggleProductStatus(activeProduct, 'featured')}
                            className={`px-3 py-1 text-[10px] rounded-lg font-extrabold uppercase transition-all border ${activeProduct.is_featured
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-white dark:bg-[#0f172a] text-slate-500 dark:text-[#94a3b8] border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                              }`}
                          >
                            Featured
                          </button>
                          <button
                            onClick={() => handleToggleProductStatus(activeProduct, 'trending')}
                            className={`px-3 py-1 text-[10px] rounded-lg font-extrabold uppercase transition-all border ${activeProduct.is_trending
                              ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                              : 'bg-white dark:bg-[#0f172a] text-slate-500 dark:text-[#94a3b8] border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                              }`}
                          >
                            Trending
                          </button>
                          <button
                            onClick={() => handleToggleProductStatus(activeProduct, 'visible')}
                            className={`px-3 py-1 text-[10px] rounded-lg font-extrabold uppercase transition-all border ${activeProduct.is_visible
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                              : 'bg-white dark:bg-[#0f172a] text-slate-500 dark:text-[#94a3b8] border-slate-200 dark:border-[#1e293b] hover:bg-slate-50'
                              }`}
                          >
                            Visible
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-[#162032] justify-end">
                    <button
                      onClick={() => {
                        setCurrentProduct(activeProduct);
                        setShowProductModal(true);
                      }}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Details
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(activeProduct.id!)}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white text-xs font-bold rounded-lg border border-rose-100 dark:border-rose-900/50 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Product
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- TAB 3: CATEGORIES LIST --- */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Search & Master List */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col h-[600px] overflow-hidden">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-[#f1f5f9]">Product Categories</h3>
                <button
                  onClick={() => {
                    setCurrentCategory({ name: '', description: '' });
                    setShowCategoryModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-primary hover:bg-primary/95 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-[#1e293b] rounded-lg focus:outline-none focus:border-primary text-slate-800 dark:text-[#f1f5f9]"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-[#020617] border border-dashed border-slate-200 dark:border-[#1e293b] rounded-xl">
                  No categories found
                </div>
              ) : (
                filteredCategories.map((c) => {
                  const isSelected = c.id === selectedCategoryId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCategoryId(c.id || null)}
                      className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer select-none ${isSelected
                        ? 'bg-slate-50 dark:bg-[#162032] border-primary shadow-sm'
                        : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-[#162032] hover:bg-slate-50/50 dark:hover:bg-[#162032]/50'
                        }`}
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-450 block truncate max-w-[200px]">{c.description || 'No description'}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded shrink-0 ${c.is_active ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-slate-105 text-slate-400'
                        }`}>
                        {c.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Detail View */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-6 shadow-sm min-h-[600px] overflow-y-auto flex flex-col justify-between">
            {(() => {
              const activeCategory = categories.find(c => c.id === selectedCategoryId);
              if (!activeCategory) {
                return (
                  <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Layers className="w-12 h-12 mb-3 text-slate-350 dark:text-[#334155]" />
                    <p className="text-sm font-semibold">Select a category to view configuration details</p>
                  </div>
                );
              }

              return (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#162032] pb-4">
                      <div className="space-y-0.5">
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">{activeCategory.name}</h2>
                        <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">Category ID: {activeCategory.id}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] border font-black uppercase rounded-lg ${activeCategory.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 border-emerald-100 dark:border-emerald-900/50'
                        : 'bg-slate-50 dark:bg-[#020617] text-slate-400 border-slate-200 dark:border-[#162032]'
                        }`}>
                        {activeCategory.is_active ? 'Active Status' : 'Disabled Status'}
                      </span>
                    </div>

                    <div className="space-y-2 bg-slate-50 dark:bg-[#020617] p-4 rounded-xl border border-slate-100 dark:border-[#162032]">
                      <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Description</h4>
                      <p className="text-xs text-slate-700 dark:text-[#cbd5e1] leading-relaxed font-semibold">
                        {activeCategory.description || 'This category does not have a detailed description yet.'}
                      </p>
                    </div>

                    {/* Stats or related items counter */}
                    <div className="p-4 border border-slate-150 dark:border-[#162032] rounded-xl space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Catalog Statistics</span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-[#adbaca]">
                        Total associated products in this catalog section: <span className="font-extrabold text-slate-900 dark:text-white">
                          {products.filter(p => p.category_id === activeCategory.id).length} items
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-[#162032] justify-end mt-6">
                    <button
                      onClick={() => {
                        setCurrentCategory(activeCategory);
                        setShowCategoryModal(true);
                      }}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Category
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(activeCategory.id!)}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white text-xs font-bold rounded-lg border border-rose-100 dark:border-rose-900/50 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Category
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- TAB 4: ORDER SHIPMENT FULFILLMENT --- */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Search & Master List */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col h-[600px] overflow-hidden">
            <div className="space-y-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-[#f1f5f9]">Student Orders</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Order # or Student name..."
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-[#1e293b] rounded-lg focus:outline-none focus:border-primary text-slate-800 dark:text-[#f1f5f9]"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-[#020617] border border-dashed border-slate-200 dark:border-[#1e293b] rounded-xl">
                  No orders found
                </div>
              ) : (
                filteredOrders.map((o) => {
                  const isSelected = o.id === selectedOrderId;
                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id || null)}
                      className={`p-3 rounded-xl border transition-all text-left flex justify-between items-start cursor-pointer select-none ${isSelected
                        ? 'bg-slate-50 dark:bg-[#162032] border-primary shadow-sm'
                        : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-[#162032] hover:bg-slate-50/50 dark:hover:bg-[#162032]/50'
                        }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-extrabold text-xs text-slate-955 dark:text-white block">{o.orderNumber}</span>
                        <span className="text-[10px] text-slate-500 dark:text-[#94a3b8] block truncate">{o.studentName}</span>
                        <span className="text-[9px] text-slate-400 block">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white block">₹{o.total_amount}</span>
                        <span className={`px-1.5 py-0.5 border rounded text-[8px] font-extrabold uppercase inline-block mt-1 ${o.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/50' :
                          o.status === 'Cancelled' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100 dark:border-rose-900/50' :
                            'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-900/50'
                          }`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Detail & Fulfillment Actions */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-6 shadow-sm min-h-[600px] overflow-y-auto flex flex-col justify-between">
            {(() => {
              const activeOrder = orders.find(o => o.id === selectedOrderId);
              if (!activeOrder) {
                return (
                  <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Truck className="w-12 h-12 mb-3 text-slate-350 dark:text-[#334155]" />
                    <p className="text-sm font-semibold">Select an order to manage delivery and update fulfillment status</p>
                  </div>
                );
              }

              return (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#161f32] pb-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">Order Ref: {activeOrder.orderNumber}</h2>
                        <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">Date Placed: {formatDate(activeOrder.createdAt ?? activeOrder.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[10px] border font-black uppercase rounded-lg ${activeOrder.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 border-emerald-100 dark:border-emerald-900/50' :
                          activeOrder.status === 'Cancelled' ? 'bg-rose-50 dark:bg-rose-950/25 text-rose-600 border-rose-100 dark:border-rose-900/50' :
                            'bg-amber-50 dark:bg-amber-950/25 text-amber-600 border-amber-100 dark:border-amber-900/50'
                          }`}>
                          {activeOrder.status}
                        </span>
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl border border-slate-100 dark:border-[#162032] space-y-2">
                        <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Student Information</h4>
                        <div className="text-xs font-semibold text-slate-800 dark:text-[#e2e8f0]">
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">{activeOrder.studentName ?? activeOrder.student_name ?? 'N/A'}</p>
                          <p className="text-slate-500 dark:text-[#94a3b8] mt-1">Campus: {activeOrder.schoolName ?? activeOrder.school_name ?? 'N/A'}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl border border-slate-100 dark:border-[#161f32] space-y-2 flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Total Transaction</h4>
                          <p className="text-2xl font-black text-primary mt-1">₹{activeOrder.totalAmount ?? activeOrder.total_amount ?? '0'}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Payment Method: COD (Cash on Delivery)</span>
                      </div>
                    </div>

                    {/* Items list if available */}
                    {activeOrder.items && activeOrder.items.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Ordered Products</h4>
                        <div className="border border-slate-150 dark:border-[#162032] rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-[#020617] font-bold text-slate-500 dark:text-[#94a3b8] border-b border-slate-155 dark:border-[#162032]">
                              <tr>
                                <th className="px-4 py-2">Item</th>
                                <th className="px-4 py-2 text-center">Qty</th>
                                <th className="px-4 py-2 text-right">Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#162032] font-semibold text-slate-800 dark:text-[#e2e8f0]">
                              {activeOrder.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2.5 truncate max-w-[200px]">{item.product_title || `Product #${item.product_id}`}</td>
                                  <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                                  <td className="px-4 py-2.5 text-right">₹{item.price}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Delivery Notes */}
                    {activeOrder.deliveryNotes && (
                      <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-xl border border-slate-100 dark:border-[#162032] space-y-1">
                        <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Remarks / Tracking notes</h4>
                        <p className="text-xs text-slate-700 dark:text-[#adbaca] leading-relaxed font-semibold italic">
                          "{activeOrder.deliveryNotes}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-[#162032] flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrder(activeOrder);
                        setUpdateStatus({ status: activeOrder.status, notes: activeOrder.deliveryNotes || '' });
                      }}
                      className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm uppercase tracking-wider"
                    >
                      Update Fulfillment Status
                    </button>
                    <button
                      onClick={() => handleDownloadInvoice(activeOrder.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      Download Invoice
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- TAB 5: STOCK ALERTS & INVENTORY --- */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: List of low stocks */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col h-[600px] overflow-hidden">
            <div className="space-y-3 mb-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-[#f1f5f9] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-rose-500 animate-pulse" /> Low Stock Warnings
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-[#94a3b8]">Products with stock quantities below 5 units.</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {criticalInventory.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-[#020617] border border-dashed border-slate-200 dark:border-[#1e293b] rounded-xl">
                  🎉 No critical stock warnings!
                </div>
              ) : (
                criticalInventory.map((p) => {
                  const isSelected = p.id === selectedInventoryProductId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedInventoryProductId(p.id || null)}
                      className={`p-3 rounded-xl border transition-all text-left flex justify-between items-center cursor-pointer select-none ${isSelected
                        ? 'bg-slate-50 dark:bg-[#162032] border-primary shadow-sm'
                        : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-[#162032] hover:bg-slate-50/50 dark:hover:bg-[#162032]/50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-[#1e293b] rounded flex items-center justify-center p-1 shrink-0">
                          <img src={p.thumbnail_url ? resolveMediaUrl(p.thumbnail_url) : 'https://via.placeholder.com/100'} alt="" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white block truncate">{p.title}</span>
                          <span className="text-[9px] text-slate-405 block">SKU: {p.sku_code}</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-500 shrink-0">
                        {p.stock_quantity === 0 ? 'SOLD OUT' : `${p.stock_quantity} left`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Restock Detail */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-6 shadow-sm min-h-[600px] overflow-y-auto flex flex-col justify-between">
            {(() => {
              const activeInvProd = products.find(p => p.id === selectedInventoryProductId);
              if (!activeInvProd) {
                return (
                  <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <CheckSquare className="w-12 h-12 mb-3 text-slate-350 dark:text-[#334155]" />
                    <p className="text-sm font-semibold">Select a low stock item to restock instantly</p>
                  </div>
                );
              }

              return (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-[#162032]">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-[#1e293b] rounded-xl flex items-center justify-center p-2 shadow-inner">
                        <img src={activeInvProd.thumbnail_url ? resolveMediaUrl(activeInvProd.thumbnail_url) : 'https://via.placeholder.com/150'} alt="" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-950 dark:text-white">{activeInvProd.title}</h2>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SKU: {activeInvProd.sku_code} | Cat: {activeInvProd.category?.name}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-rose-50 dark:bg-rose-955 text-xs font-semibold text-slate-700 dark:text-[#cbd5e1] rounded-xl border border-rose-100 dark:border-rose-900/50 flex justify-between items-center">
                      <div>
                        <h4 className="font-extrabold text-[10px] text-rose-500 uppercase tracking-widest">Inventory Alert Status</h4>
                        <p className="mt-1">Stock level is critically low. Direct vendor replenishment required.</p>
                      </div>
                      <span className="text-lg font-black text-rose-500">{activeInvProd.stock_quantity} left</span>
                    </div>

                    {/* Instant restock panel */}
                    <div className="bg-slate-50 dark:bg-[#020617] p-5 rounded-xl border border-slate-100 dark:border-[#162032] space-y-4">
                      <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Instant Restock Panel</h4>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const qty = (e.target as any).elements.qty.value;
                          await handleQuickRestock(qty);
                        }}
                        className="flex items-center gap-3"
                      >
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-slate-500 dark:text-[#94a3b8] block font-bold uppercase">New Stock Level Quantity</label>
                          <input
                            name="qty"
                            type="number"
                            min="0"
                            required
                            defaultValue={activeInvProd.stock_quantity + 20}
                            className="w-full p-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] rounded font-bold text-xs text-slate-800 dark:text-[#f0f4f9] focus:outline-none focus:border-primary"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-all shadow-sm shrink-0 self-end"
                        >
                          Update Stock Level
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-[#162032]">
                    <button
                      onClick={() => {
                        setCurrentProduct(activeInvProd);
                        setShowProductModal(true);
                      }}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Full Product Details
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* A. PRODUCT CRUD MODAL DRAWER */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveProduct} className="relative w-full max-w-2xl bg-white  border border-slate-250  rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 border-b border-slate-100  flex justify-between items-center bg-slate-50 ">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-800 ">
                {currentProduct.id ? 'Edit STEM Product' : 'Add New STEM Product'}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-rose-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Title */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-600 ">Product Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={currentProduct.title}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, title: e.target.value })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* SKU Code */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">SKU Reference Code <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={currentProduct.sku_code}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, sku_code: e.target.value })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Brand Name */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">Brand Name</label>
                  <input
                    type="text"
                    value={currentProduct.brand_name || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, brand_name: e.target.value })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Category ID */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">Assigned Category <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={currentProduct.category_id}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, category_id: e.target.value })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none"
                  >
                    <option value="">Choose category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Stock Quantity */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">Stock Quantity <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={currentProduct.stock_quantity}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, stock_quantity: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Base price */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">Base Price (INR) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={currentProduct.price}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Discount price */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">Discount Price (INR - Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={currentProduct.discount_price || 0}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, discount_price: e.target.value ? Number(e.target.value) : 0 })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Thumbnail Url */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Product Thumbnail Image</label>

                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!isDraggingImage) setIsDraggingImage(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingImage(false); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingImage(false);
                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        toast.error('Please drop an image file (PNG, JPG, or SVG).');
                        return;
                      }
                      const formDataUpload = new FormData();
                      formDataUpload.append('file', file);
                      setIsUploadingImage(true);
                      try {
                        const { data } = await api.post('/upload', formDataUpload);
                        setCurrentProduct((prev: any) => ({ ...prev, thumbnail_url: data.url }));
                        toast.success('Image uploaded successfully');
                      } catch (err) {
                        toast.error('Failed to upload image');
                      } finally {
                        setIsUploadingImage(false);
                      }
                    }}
                    className={`flex flex-col sm:flex-row gap-4 items-center p-4 border-2 border-dashed rounded-lg transition-colors ${isDraggingImage ? 'bg-primary/5 border-primary' : 'bg-slate-50 border-slate-200'}`}
                  >
                    {/* Preview Area */}
                    <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {currentProduct.thumbnail_url ? (
                        <img
                          src={resolveMediaUrl(currentProduct.thumbnail_url)}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-slate-450 text-[10px] uppercase font-black text-center p-1">No Image</span>
                      )}
                    </div>

                    {/* Action Area */}
                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter Image URL or Upload from System"
                          value={currentProduct.thumbnail_url || ''}
                          onChange={(e) => setCurrentProduct({ ...currentProduct, thumbnail_url: e.target.value })}
                          className="flex-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-primary shadow-sm"
                        />

                        <label className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                          {isUploadingImage ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              const formDataUpload = new FormData();
                              formDataUpload.append('file', file);

                              setIsUploadingImage(true);
                              try {
                                const { data } = await api.post('/upload', formDataUpload);
                                setCurrentProduct((prev: any) => ({ ...prev, thumbnail_url: data.url }));
                                toast.success('Image uploaded successfully');
                              } catch (err) {
                                toast.error('Failed to upload image');
                              } finally {
                                setIsUploadingImage(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {isDraggingImage ? 'Drop the image to upload' : 'Drag & drop an image here, paste a URL, or click Upload. PNG, JPG, or SVG.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Short Description */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-600 ">Short Description</label>
                  <input
                    type="text"
                    value={currentProduct.short_description || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, short_description: e.target.value })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Grade Compatibility */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">School Grade Compatibility</label>
                  <input
                    type="text"
                    placeholder="Enter School Grade Compatibility"
                    value={currentProduct.school_grade_compatibility || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, school_grade_compatibility: e.target.value })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Recommended Age */}
                <div className="space-y-1">
                  <label className="text-slate-600 ">Recommended Age Group</label>
                  <input
                    type="text"
                    placeholder="Enter Recommended Age Group"
                    value={currentProduct.recommended_age_group || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, recommended_age_group: e.target.value })}
                    className="w-full p-2 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Checkbox status switches */}
                <div className="sm:col-span-2 grid grid-cols-3 gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="feat"
                      checked={currentProduct.is_featured}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded text-primary border-slate-300"
                    />
                    <label htmlFor="feat" className="text-slate-750  cursor-pointer">Featured</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="trend"
                      checked={currentProduct.is_trending}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, is_trending: e.target.checked })}
                      className="w-4 h-4 rounded text-primary border-slate-300"
                    />
                    <label htmlFor="trend" className="text-slate-750  cursor-pointer">Trending</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="newarr"
                      checked={currentProduct.is_new_arrival}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, is_new_arrival: e.target.checked })}
                      className="w-4 h-4 rounded text-primary border-slate-300"
                    />
                    <label htmlFor="newarr" className="text-slate-750  cursor-pointer">New Arrival</label>
                  </div>
                </div>

              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="modal-btn-cancel"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="modal-btn-save"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Product</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* B. CATEGORY CRUD MODAL DRAWER */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveCategory} className="relative w-full max-w-md bg-white  border border-slate-250  rounded-2xl overflow-hidden shadow-2xl flex flex-col">

            <div className="px-6 py-4 border-b border-slate-100  flex justify-between items-center bg-slate-50 ">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-850 ">
                {currentCategory.id ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-rose-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-655 ">Category Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={currentCategory.name}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-655 ">Category Description</label>
                <textarea
                  rows={3}
                  value={currentCategory.description || ''}
                  onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none focus:border-primary resize-none font-bold"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="modal-btn-cancel"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="modal-btn-save"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Category</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* C. ORDER SHIPMENT UPDATE STATUS DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleUpdateOrderStatus} className="relative w-full max-w-md bg-white  border border-slate-250  rounded-2xl overflow-hidden shadow-2xl flex flex-col">

            <div className="px-6 py-4 border-b border-slate-100  flex justify-between items-center bg-slate-50 ">
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-850 ">
                Fulfill Order {selectedOrder.orderNumber}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-rose-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-655 ">Current Stage Status</label>
                <select
                  value={updateStatus.status}
                  onChange={(e) => setUpdateStatus({ ...updateStatus, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none"
                >
                  <option value="Order Placed">Order Placed</option>
                  <option value="Confirmed">Confirmed / Verified</option>
                  <option value="Packed">Packed / Ready</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-655 ">Fulfillment Notes / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Enter Fulfillment Notes / Remarks"
                  value={updateStatus.notes}
                  onChange={(e) => setUpdateStatus({ ...updateStatus, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded text-slate-800  focus:outline-none resize-none font-bold"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="modal-btn-cancel"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="modal-btn-save"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Update Status</span>
              </button>
            </div>

          </form>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title ?? ''}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.resolve ? () => confirmState.resolve!(true) : () => { }}
        onCancel={confirmState.resolve ? () => confirmState.resolve!(false) : () => { }}
      />
    </DashboardPageShell>
  );
};

export default ShopAdminHub;
