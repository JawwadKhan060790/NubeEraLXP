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

export const ecommerceService = {
  // --- Category ---
  getCategories: () => api.get<ProductCategory[]>('/ecommerce/categories').then(r => r.data),
  getCategoriesAdmin: () => api.get<ProductCategory[]>('/ecommerce/categories/admin').then(r => r.data),
  getCategory: (id: string) => api.get<ProductCategory>(`/ecommerce/categories/${id}`).then(r => r.data),
  createCategory: (data: ProductCategory) => api.post<ProductCategory>('/ecommerce/categories', data).then(r => r.data),
  updateCategory: (id: string, data: ProductCategory) => api.put<ProductCategory>(`/ecommerce/categories/${id}`, data).then(r => r.data),
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
  }) => api.get<Product[]>('/ecommerce/products', { params }).then(r => r.data),
  getProductsAdmin: () => api.get<Product[]>('/ecommerce/products/admin').then(r => r.data),
  getProduct: (id: string) => api.get<Product>(`/ecommerce/products/${id}`).then(r => r.data),
  getRelatedProducts: (id: string) => api.get<Product[]>(`/ecommerce/products/${id}/related`).then(r => r.data),
  createProduct: (data: any) => api.post<Product>('/ecommerce/products', data).then(r => r.data),
  updateProduct: (id: string, data: any) => api.put<Product>(`/ecommerce/products/${id}`, data).then(r => r.data),
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
  getMyOrders: () => api.get<any[]>('/ecommerce/orders/my-orders').then(r => r.data),
  getOrder: (id: string) => api.get<Order>(`/ecommerce/orders/${id}`).then(r => r.data),
  getOrderTracking: (id: string) => api.get<any>(`/ecommerce/orders/${id}/tracking`).then(r => r.data),
  reorder: (id: string) => api.post<{ message: string }>(`/ecommerce/orders/${id}/reorder`).then(r => r.data),
  getAdminOrders: (params?: { search?: string; schoolId?: string; status?: string; date?: string }) => 
    api.get<any[]>('/ecommerce/orders/admin', { params }).then(r => r.data),
  updateOrderStatus: (id: string, data: { status: string; deliveryNotes?: string; estimatedDeliveryDate?: string }) => 
    api.put<{ message: string; status: string }>(`/ecommerce/orders/${id}/status`, {
      status: data.status,
      delivery_notes: data.deliveryNotes,
      estimated_delivery_date: data.estimatedDeliveryDate
    }).then(r => r.data),
  getInvoice: (id: string) => api.get<any>(`/ecommerce/orders/${id}/invoice`).then(r => r.data),

  // --- Dashboard ---
  getDashboardStats: () => api.get<any>('/ecommerce/dashboard/stats').then(r => r.data)
};
