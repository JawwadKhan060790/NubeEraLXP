import api from './api';

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
}

export interface Attachment {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt?: string;
  ticketCommentId?: string | null;
}

export interface TicketComment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface TicketHistory {
  id: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt?: string;
  category: {
    id: string;
    name: string;
  };
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  comments?: TicketComment[];
  attachments?: Attachment[];
  history?: TicketHistory[];
}

export interface TicketListResponse {
  totalItems: number;
  page: number;
  pageSize: number;
  items: Ticket[];
}

export interface InAppNotification {
  id: string;
  message: string;
  linkUrl: string;
  createdAt: string;
}

export interface SupportAnalytics {
  totalTickets: number;
  statusCounts: { status: string; count: number }[];
  categoryCounts: { category: string; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  avgResolutionHours: number;
  leaderboard: { name: string; resolvedCount: number }[];
}

// Response Mappers
const mapAttachment = (a: any): Attachment => {
  if (!a) return a;
  let fileUrl = a.file_url;
  if (fileUrl && fileUrl.startsWith('/')) {
    const apiBase = api.defaults.baseURL || '';
    const apiHost = apiBase.replace(/\/api$/, '');
    fileUrl = `${apiHost}${fileUrl}`;
  }
  return {
    id: a.id,
    fileName: a.file_name,
    fileUrl: fileUrl,
    fileType: a.file_type,
    fileSize: a.file_size,
    createdAt: a.created_at,
    ticketCommentId: a.ticket_comment_id
  };
};

const mapComment = (c: any): TicketComment => {
  if (!c) return c;
  return {
    id: c.id,
    content: c.content,
    isInternal: c.is_internal,
    createdAt: c.created_at,
    user: c.user ? {
      id: c.user.id,
      firstName: c.user.first_name,
      lastName: c.user.last_name,
      role: c.user.role
    } : { id: '', firstName: '', lastName: '', role: '' }
  };
};

const mapHistory = (h: any): TicketHistory => {
  if (!h) return h;
  return {
    id: h.id,
    action: h.action,
    oldValue: h.old_value,
    newValue: h.new_value,
    createdAt: h.created_at,
    user: h.user ? {
      id: h.user.id,
      firstName: h.user.first_name,
      lastName: h.user.last_name
    } : { id: '', firstName: '', lastName: '' }
  };
};

const mapTicket = (t: any): Ticket => {
  if (!t) return t;
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    createdAt: t.created_at,
    resolvedAt: t.resolved_at,
    category: t.category ? {
      id: t.category.id,
      name: t.category.name
    } : { id: '', name: '' },
    requester: t.requester ? {
      id: t.requester.id,
      firstName: t.requester.first_name,
      lastName: t.requester.last_name,
      email: t.requester.email,
      role: t.requester.role
    } : { id: '', firstName: '', lastName: '', email: '' },
    assignedTo: t.assigned_to ? {
      id: t.assigned_to.id,
      firstName: t.assigned_to.first_name,
      lastName: t.assigned_to.last_name
    } : null,
    comments: t.comments ? t.comments.map(mapComment) : undefined,
    attachments: t.attachments ? t.attachments.map(mapAttachment) : undefined,
    history: t.history ? t.history.map(mapHistory) : undefined
  };
};

export const supportService = {
  // Categories
  getCategories: async (): Promise<TicketCategory[]> => {
    const res = await api.get('/support/categories');
    return res.data;
  },

  createCategory: async (name: string, description: string): Promise<TicketCategory> => {
    const res = await api.post('/support/categories', { name, description });
    return res.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/support/categories/${id}`);
  },

  // Tickets
  getTickets: async (params: {
    status?: string;
    priority?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<TicketListResponse> => {
    const res = await api.get('/support/tickets', { params });
    return {
      totalItems: res.data.total_items,
      page: res.data.page,
      pageSize: res.data.page_size,
      items: res.data.items ? res.data.items.map(mapTicket) : []
    };
  },

  createTicket: async (data: {
    subject: string;
    description: string;
    priority: string;
    categoryId: string;
    attachments: Omit<Attachment, 'id' | 'createdAt'>[];
  }): Promise<{ message: string; ticketId: string; ticketNumber: string }> => {
    const priorityMap: Record<string, number> = {
      'Low': 0,
      'Medium': 1,
      'High': 2
    };
    const mappedData = {
      subject: data.subject,
      description: data.description,
      priority: priorityMap[data.priority] !== undefined ? priorityMap[data.priority] : 1,
      category_id: data.categoryId,
      attachments: data.attachments ? data.attachments.map(att => ({
        file_name: att.fileName,
        file_url: att.fileUrl,
        file_type: att.fileType,
        file_size: att.fileSize
      })) : []
    };
    const res = await api.post('/support/tickets', mappedData);
    return {
      message: res.data.message,
      ticketId: res.data.ticket_id,
      ticketNumber: res.data.ticket_number
    };
  },

  getTicketDetail: async (id: string): Promise<Ticket> => {
    const res = await api.get(`/support/tickets/${id}`);
    return mapTicket(res.data);
  },

  // Comments & Replies
  postComment: async (
    ticketId: string,
    data: {
      content: string;
      isInternal: boolean;
      attachments?: Omit<Attachment, 'id' | 'createdAt'>[];
    }
  ): Promise<{ message: string; commentId: string }> => {
    const mappedData = {
      content: data.content,
      is_internal: data.isInternal,
      attachments: data.attachments ? data.attachments.map(att => ({
        file_name: att.fileName,
        file_url: att.fileUrl,
        file_type: att.fileType,
        file_size: att.fileSize
      })) : []
    };
    const res = await api.post(`/support/tickets/${ticketId}/reply`, mappedData);
    return {
      message: res.data.message,
      commentId: res.data.comment_id
    };
  },

  // Assign Ticket
  assignTicket: async (ticketId: string, assignedToUserId: string | null): Promise<void> => {
    await api.put(`/support/tickets/${ticketId}/assign`, { assigned_to_user_id: assignedToUserId });
  },

  // Status Change
  updateStatus: async (ticketId: string, status: string): Promise<void> => {
    // Backend expects an integer index matching TicketStatus enum or string if bound by string mapper,
    // but the backend controller is using TicketStatus enum directly.
    // TicketStatus Enum: Open = 0, InProgress = 1, Pending = 2, Resolved = 3, Closed = 4, Reopened = 5.
    const statusMap: Record<string, number> = {
      'Open': 0,
      'InProgress': 1,
      'Pending': 2,
      'Resolved': 3,
      'Closed': 4,
      'Reopened': 5
    };
    const statusVal = statusMap[status] !== undefined ? statusMap[status] : 0;
    await api.put(`/support/tickets/${ticketId}/status`, { status: statusVal });
  },

  // Analytics
  getAnalytics: async (): Promise<SupportAnalytics> => {
    const res = await api.get('/support/analytics');
    const data = res.data;
    return {
      totalTickets: data.total_tickets,
      statusCounts: data.status_counts ? data.status_counts.map((s: any) => ({
        status: s.status,
        count: s.count
      })) : [],
      categoryCounts: data.category_counts ? data.category_counts.map((c: any) => ({
        category: c.category,
        count: c.count
      })) : [],
      priorityCounts: data.priority_counts ? data.priority_counts.map((p: any) => ({
        priority: p.priority,
        count: p.count
      })) : [],
      avgResolutionHours: data.avg_resolution_hours || 0,
      leaderboard: data.leaderboard ? data.leaderboard.map((l: any) => ({
        name: l.name,
        resolvedCount: l.resolved_count
      })) : []
    };
  },

  // Notifications
  getNotifications: async (): Promise<InAppNotification[]> => {
    const res = await api.get('/support/notifications');
    return res.data ? res.data.map((n: any) => ({
      id: n.id,
      message: n.message,
      linkUrl: n.link_url,
      createdAt: n.created_at
    })) : [];
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await api.put(`/support/notifications/${id}/read`);
  },

  // File Upload
  uploadAttachment: async (file: File): Promise<{ url: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    // Path /upload in backend matches UploadController endpoint (api/upload)
    const res = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }
};
