import api from './api';

export interface ProductCategory {
  id?: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id?: string;
  title: string;
  short_description?: string;
  full_description?: string;
  category_id: string;
  subcategory?: string;
  sku_code: string;
  barcode?: string;
  price: number;
  discount_price?: number;
  images_json: string; // Serialized string of image list
  thumbnail_url?: string;
  stock_quantity: number;
  is_available?: boolean;
  brand_name?: string;
  weight?: number;
  dimensions?: string;
  warranty_details?: string;
  safety_instructions?: string;
  features_json: string; // Serialized list of features
  specifications_json: string; // Serialized key-value pairs
  recommended_age_group?: string;
  school_grade_compatibility?: string;
  tags_json: string; // Serialized list of tags
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  min_order_quantity?: number;
  max_order_quantity?: number;
  shipping_type?: string;
  delivery_estimate?: string;
  return_policy?: string;
  is_visible?: boolean;
  created_at?: string;
  category?: ProductCategory;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  saved_for_later: boolean;
  product: {
    id: string;
    title: string;
    short_description: string;
    price: number;
    discount_price?: number;
    thumbnail_url: string;
    stock_quantity: number;
    is_available: boolean;
    brand_name: string;
    sku_code: string;
  };
}

export interface CartSummary {
  subtotal: number;
  delivery_charges: number;
  total_amount: number;
}

export interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    title: string;
    short_description: string;
    price: number;
    discount_price?: number;
    thumbnail_url: string;
    stock_quantity: number;
    is_available: boolean;
    brand_name: string;
    sku_code: string;
  };
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  product_sku: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  student_id?: string;
  student_name: string;
  parent_name: string;
  school_id?: string;
  school_name: string;
  shipping_address: string;
  pin_code: string;
  city: string;
  state: string;
  country: string;
  contact_number: string;
  alternate_contact_number?: string;
  order_notes?: string;
  subtotal: number;
  delivery_charges: number;
  total_amount: number;
  status: string;
  delivery_notes?: string;
  estimated_delivery_date?: string;
  created_at: string;
  updated_at?: string;
  order_items: OrderItem[];
}

export function normalizeProduct(p: any): Product {
  if (!p) return p;
  return {
    ...p,
    id: p.id || p.Id || '',
    title: p.title ?? p.Title ?? '',
    sku_code: p.sku_code || p.skuCode || p.SkuCode || '',
    skuCode: p.skuCode || p.sku_code || p.SkuCode || '',
    brand_name: p.brand_name || p.brandName || p.BrandName || '',
    brandName: p.brandName || p.brand_name || p.BrandName || '',
    thumbnail_url: p.thumbnail_url || p.thumbnailUrl || p.ThumbnailUrl || '',
    thumbnailUrl: p.thumbnailUrl || p.thumbnail_url || p.ThumbnailUrl || '',
    stock_quantity: p.stock_quantity ?? p.stockQuantity ?? p.StockQuantity ?? 0,
    stockQuantity: p.stockQuantity ?? p.stock_quantity ?? p.StockQuantity ?? 0,
    price: Number(p.price ?? p.Price ?? 0),
    discount_price: p.discount_price ?? p.discountPrice ?? p.DiscountPrice ?? null,
    discountPrice: p.discountPrice ?? p.discount_price ?? p.DiscountPrice ?? null,
    category_id: p.category_id || p.categoryId || p.CategoryId || '',
    categoryId: p.categoryId || p.category_id || p.CategoryId || '',
    short_description: p.short_description || p.shortDescription || p.ShortDescription || '',
    shortDescription: p.shortDescription || p.short_description || p.ShortDescription || '',
    full_description: p.full_description || p.fullDescription || p.FullDescription || '',
    fullDescription: p.fullDescription || p.full_description || p.FullDescription || '',
    is_featured: Boolean(p.is_featured ?? p.isFeatured ?? p.IsFeatured),
    isFeatured: Boolean(p.isFeatured ?? p.is_featured ?? p.IsFeatured),
    is_trending: Boolean(p.is_trending ?? p.isTrending ?? p.IsTrending),
    isTrending: Boolean(p.isTrending ?? p.is_trending ?? p.IsTrending),
    is_new_arrival: Boolean(p.is_new_arrival ?? p.isNewArrival ?? p.IsNewArrival),
    isNewArrival: Boolean(p.isNewArrival ?? p.is_new_arrival ?? p.IsNewArrival),
    is_visible: p.is_visible !== undefined ? p.is_visible : (p.isVisible !== undefined ? p.isVisible : (p.IsVisible !== undefined ? p.IsVisible : true)),
    isVisible: p.isVisible !== undefined ? p.isVisible : (p.is_visible !== undefined ? p.is_visible : (p.IsVisible !== undefined ? p.IsVisible : true)),
    school_grade_compatibility: p.school_grade_compatibility || p.schoolGradeCompatibility || p.SchoolGradeCompatibility || '',
    recommended_age_group: p.recommended_age_group || p.recommendedAgeGroup || p.RecommendedAgeGroup || '',
    images_json: p.images_json || p.imagesJson || p.ImagesJson || '[]',
    features_json: p.features_json || p.featuresJson || p.FeaturesJson || '[]',
    specifications_json: p.specifications_json || p.specificationsJson || p.SpecificationsJson || '{}',
    tags_json: p.tags_json || p.tagsJson || p.TagsJson || '[]',
    category: p.category ? {
      ...p.category,
      id: p.category.id || p.category.Id || '',
      name: p.category.name || p.category.Name || '',
      is_active: p.category.is_active ?? p.category.isActive ?? p.category.IsActive ?? true
    } : undefined
  };
}

export function normalizeOrder(o: any): Order {
  if (!o) return o;
  return {
    ...o,
    id: o.id || o.Id || '',
    order_number: o.order_number || o.orderNumber || o.OrderNumber || '',
    orderNumber: o.orderNumber || o.order_number || o.OrderNumber || '',
    student_name: o.student_name || o.studentName || o.StudentName || '',
    studentName: o.studentName || o.student_name || o.StudentName || '',
    parent_name: o.parent_name || o.parentName || o.ParentName || '',
    parentName: o.parentName || o.parent_name || o.ParentName || '',
    school_name: o.school_name || o.schoolName || o.SchoolName || '',
    schoolName: o.schoolName || o.school_name || o.SchoolName || '',
    shipping_address: o.shipping_address || o.shippingAddress || o.ShippingAddress || '',
    shippingAddress: o.shippingAddress || o.shipping_address || o.ShippingAddress || '',
    contact_number: o.contact_number || o.contactNumber || o.ContactNumber || '',
    contactNumber: o.contactNumber || o.contact_number || o.ContactNumber || '',
    status: o.status || o.Status || 'Order Placed',
    subtotal: Number(o.subtotal ?? o.Subtotal ?? 0),
    delivery_charges: Number(o.delivery_charges ?? o.deliveryCharges ?? o.DeliveryCharges ?? 0),
    deliveryCharges: Number(o.deliveryCharges ?? o.delivery_charges ?? o.DeliveryCharges ?? 0),
    total_amount: Number(o.total_amount ?? o.totalAmount ?? o.TotalAmount ?? 0),
    totalAmount: Number(o.totalAmount ?? o.total_amount ?? o.TotalAmount ?? 0),
    delivery_notes: o.delivery_notes || o.deliveryNotes || o.DeliveryNotes || '',
    deliveryNotes: o.deliveryNotes || o.delivery_notes || o.DeliveryNotes || '',
    created_at: o.created_at || o.createdAt || o.CreatedAt || '',
    createdAt: o.createdAt || o.created_at || o.CreatedAt || '',
    order_items: (o.order_items || o.orderItems || o.OrderItems || []).map((item: any) => ({
      ...item,
      product_id: item.product_id || item.productId || item.ProductId || '',
      product_title: item.product_title || item.productTitle || item.ProductTitle || '',
      product_sku: item.product_sku || item.productSku || item.ProductSku || '',
      price: Number(item.price ?? item.Price ?? 0),
      quantity: Number(item.quantity ?? item.Quantity ?? 1)
    }))
  };
}

export function normalizeCategory(c: any): ProductCategory {
  if (!c) return c;
  return {
    ...c,
    id: c.id || c.Id || '',
    name: c.name || c.Name || '',
    description: c.description || c.Description || '',
    is_active: c.is_active ?? c.isActive ?? c.IsActive ?? true
  };
}

export const ecommerceService = {
  // --- Category ---
  getCategories: () => api.get<any[]>('/ecommerce/categories').then(r => (r.data || []).map(normalizeCategory)),
  getCategoriesAdmin: () => api.get<any[]>('/ecommerce/categories/admin').then(r => (r.data || []).map(normalizeCategory)),
  getCategory: (id: string) => api.get<any>(`/ecommerce/categories/${id}`).then(r => normalizeCategory(r.data)),
  createCategory: (data: ProductCategory) => api.post<ProductCategory>('/ecommerce/categories', data).then(r => normalizeCategory(r.data)),
  updateCategory: (id: string, data: ProductCategory) => api.put<ProductCategory>(`/ecommerce/categories/${id}`, data).then(r => normalizeCategory(r.data)),
  deleteCategory: (id: string) => api.delete<{ message: string }>(`/ecommerce/categories/${id}`).then(r => r.data),

  // --- Product ---
  getProducts: (params?: {
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    isAvailable?: boolean;
    brand?: string;
    tag?: string;
    schoolGrade?: string;
    isFeatured?: boolean;
    isTrending?: boolean;
    isNewArrival?: boolean;
    sortBy?: string;
  }) => api.get<any[]>('/ecommerce/products', { params }).then(r => (r.data || []).map(normalizeProduct)),
  getProductsAdmin: () => api.get<any[]>('/ecommerce/products/admin').then(r => (r.data || []).map(normalizeProduct)),
  getProduct: (id: string) => api.get<any>(`/ecommerce/products/${id}`).then(r => normalizeProduct(r.data)),
  getRelatedProducts: (id: string) => api.get<any[]>(`/ecommerce/products/${id}/related`).then(r => (r.data || []).map(normalizeProduct)),
  createProduct: (data: any) => api.post<Product>('/ecommerce/products', data).then(r => normalizeProduct(r.data)),
  updateProduct: (id: string, data: any) => api.put<Product>(`/ecommerce/products/${id}`, data).then(r => normalizeProduct(r.data)),
  deleteProduct: (id: string) => api.delete<{ message: string }>(`/ecommerce/products/${id}`).then(r => r.data),

  // --- Cart ---
  getCart: () => api.get<{ items: CartItem[]; summary: CartSummary }>('/ecommerce/cart').then(r => r.data),
  addToCart: (productId: string, quantity = 1) => api.post<{ message: string }>('/ecommerce/cart/add', { product_id: productId, quantity }).then(r => r.data),
  updateCartQuantity: (id: string, quantity: number) => api.put<{ message: string }>(`/ecommerce/cart/${id}/quantity`, { quantity }).then(r => r.data),
  toggleCartSaveForLater: (id: string, save: boolean) => api.put<{ message: string }>(`/ecommerce/cart/${id}/save-for-later?save=${save}`).then(r => r.data),
  moveCartToWishlist: (id: string) => api.post<{ message: string }>(`/ecommerce/cart/${id}/move-to-wishlist`).then(r => r.data),
  removeFromCart: (id: string) => api.delete<{ message: string }>(`/ecommerce/cart/${id}`).then(r => r.data),
  clearCart: () => api.delete<{ message: string }>('/ecommerce/cart/clear').then(r => r.data),

  // --- Wishlist ---
  getWishlist: () => api.get<WishlistItem[]>('/ecommerce/wishlist').then(r => r.data),
  addToWishlist: (productId: string) => api.post<{ message: string }>('/ecommerce/wishlist/add', { product_id: productId }).then(r => r.data),
  moveWishlistToCart: (id: string) => api.post<{ message: string }>(`/ecommerce/wishlist/${id}/move-to-cart`).then(r => r.data),
  removeFromWishlist: (id: string) => api.delete<{ message: string }>(`/ecommerce/wishlist/${id}`).then(r => r.data),

  // --- Order ---
  placeOrder: (data: {
    shippingAddress: string;
    pinCode: string;
    city: string;
    state: string;
    country: string;
    contactNumber: string;
    alternateContactNumber?: string;
    orderNotes?: string;
    studentId?: string;
    studentName?: string;
    parentName?: string;
  }) => api.post<any>('/ecommerce/orders/place', {
    shipping_address: data.shippingAddress,
    pin_code: data.pinCode,
    city: data.city,
    state: data.state,
    country: data.country,
    contact_number: data.contactNumber,
    alternate_contact_number: data.alternateContactNumber,
    order_notes: data.orderNotes,
    student_id: data.studentId,
    student_name: data.studentName,
    parent_name: data.parentName
  }).then(r => ({
    message: r.data.message,
    orderId: r.data.order_id || r.data.orderId,
    orderNumber: r.data.order_number || r.data.orderNumber
  })),
  getMyOrders: () => api.get<any[]>('/ecommerce/orders/my-orders').then(r => (r.data || []).map(normalizeOrder)),
  getOrder: (id: string) => api.get<any>(`/ecommerce/orders/${id}`).then(r => normalizeOrder(r.data)),
  getOrderTracking: (id: string) => api.get<any>(`/ecommerce/orders/${id}/tracking`).then(r => r.data),
  reorder: (id: string) => api.post<{ message: string }>(`/ecommerce/orders/${id}/reorder`).then(r => r.data),
  getAdminOrders: (params?: { search?: string; schoolId?: string; status?: string; date?: string }) => 
    api.get<any[]>('/ecommerce/orders/admin', { params }).then(r => (r.data || []).map(normalizeOrder)),
  updateOrderStatus: (id: string, data: { status: string; deliveryNotes?: string; estimatedDeliveryDate?: string }) => 
    api.put<{ message: string; status: string }>(`/ecommerce/orders/${id}/status`, {
      status: data.status,
      delivery_notes: data.deliveryNotes,
      estimated_delivery_date: data.estimatedDeliveryDate
    }).then(r => r.data),
  getInvoice: (id: string) => api.get<any>(`/ecommerce/orders/${id}/invoice`).then(r => r.data),

  // --- Dashboard ---
  getDashboardStats: () => api.get<any>('/ecommerce/dashboard/stats').then(r => {
    const d = r.data || {};
    return {
      totalOrders: d.totalOrders ?? d.total_orders ?? 0,
      pendingOrders: d.pendingOrders ?? d.pending_orders ?? 0,
      deliveredOrders: d.deliveredOrders ?? d.delivered_orders ?? 0,
      cancelledOrders: d.cancelledOrders ?? d.cancelled_orders ?? 0,
      totalProducts: d.totalProducts ?? d.total_products ?? 0,
      lowStockProducts: d.lowStockProducts ?? d.low_stock_products ?? 0,
      topProducts: (d.topProducts || d.top_products || []).map((tp: any) => ({
        ...tp,
        productId: tp.productId || tp.product_id || '',
        title: tp.title ?? '',
        quantitySold: tp.quantitySold ?? tp.quantity_sold ?? 0,
        revenue: tp.revenue ?? 0
      })),
      ordersBySchool: (d.ordersBySchool || d.orders_by_school || []).map((os: any) => ({
        ...os,
        schoolName: os.schoolName || os.school_name || 'General / Direct',
        count: os.count ?? 0,
        revenue: os.revenue ?? 0
      })),
      monthlyTrends: (d.monthlyTrends || d.monthly_trends || []).map((mt: any) => ({
        ...mt,
        monthName: mt.monthName || mt.month_name || '',
        year: mt.year ?? 0,
        month: mt.month ?? 0,
        count: mt.count ?? 0,
        revenue: mt.revenue ?? 0
      })),
      lowStockList: (d.lowStockList || d.low_stock_list || []).map(normalizeProduct)
    };
  })
};
