const USER_TOKEN_KEY = 'mafalike_user_token';
const ADMIN_TOKEN_KEY = 'mafalike_admin_token';

export function getUserToken(): string | null {
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserToken(token: string | null) {
  if (token) localStorage.setItem(USER_TOKEN_KEY, token);
  else localStorage.removeItem(USER_TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  useAdminAuth = false
): Promise<T> {
  const token = useAdminAuth ? getAdminToken() : getUserToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getPublicSettings: () => request<any>('/settings/public'),

  // User Auth
  register: (email: string, password: string, referralCode?: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, referralCode }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  getMe: () => request<{ user: any }>('/auth/me'),

  // User Actions
  updateProfile: (name: string) =>
    request<{ user: any }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getTransactions: () => request<{ transactions: any[] }>('/users/transactions'),
  submitDeposit: (cryptoNetwork: string, amount: number) =>
    request<{ orderId: string; status: string }>('/users/deposit', {
      method: 'POST',
      body: JSON.stringify({ cryptoNetwork, amount }),
    }),
  submitWithdraw: (amount: number, wallet: string) =>
    request<{ orderId: string; user: any }>('/users/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, wallet }),
    }),
  submitTransfer: (email: string, amount: number) =>
    request<{ user: any }>('/users/transfer', {
      method: 'POST',
      body: JSON.stringify({ email, amount }),
    }),

  // Tasks & VIP & Referrals
  getTasks: () => request<any>('/tasks'),
  completeTask: (taskId: number) =>
    request<{ reward: number; commissionEarned: number; user: any }>(
      `/tasks/${taskId}/complete`,
      { method: 'POST' }
    ),
  upgradeVip: (level: number) =>
    request<{ user: any; vipConfig: any }>('/vip/upgrade', {
      method: 'POST',
      body: JSON.stringify({ level }),
    }),
  getReferrals: () => request<any>('/referrals'),

  // Notifications & Messages
  getNotifications: () => request<{ notifications: any[] }>('/notifications'),
  markNotificationsRead: () =>
    request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),
  getMessages: () => request<{ chatId: number; messages: any[] }>('/messages'),
  sendMessage: (text: string) =>
    request<{ messages: any[] }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Admin Endpoints
  adminLogin: (email: string, password: string) =>
    request<{ token: string; admin: any }>(
      '/auth/admin/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      true
    ),
  adminLogout: () =>
    request<{ success: boolean }>('/auth/admin/logout', { method: 'POST' }, true),
  getAdminMe: () => request<{ admin: any }>('/auth/admin/me', {}, true),
  getAdminStats: () => request<any>('/admin/stats', {}, true),
  getAdminUsers: () => request<{ users: any[] }>('/admin/users', {}, true),
  getAdminUserDetails: (id: number) =>
    request<any>(`/admin/users/${id}`, {}, true),
  adminCreateUser: (payload: {
    email: string;
    password: string;
    balance: number;
    vipLevel: number;
    referralCode?: string;
  }) =>
    request<{ user: any }>(
      '/admin/users',
      { method: 'POST', body: JSON.stringify(payload) },
      true
    ),
  adminUpdateUser: (id: number, payload: any) =>
    request<{ user: any }>(
      `/admin/users/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      true
    ),
  adminAdjustBalance: (id: number, amount: number, note: string) =>
    request<{ user: any }>(
      `/admin/users/${id}/balance`,
      { method: 'POST', body: JSON.stringify({ amount, note }) },
      true
    ),
  adminToggleBan: (id: number) =>
    request<{ user: any }>(`/admin/users/${id}/ban`, { method: 'POST' }, true),
  getAdminTransactions: () =>
    request<{ transactions: any[] }>('/admin/transactions', {}, true),
  adminApproveTx: (id: number) =>
    request<{ success: boolean }>(
      `/admin/transactions/${id}/approve`,
      { method: 'POST' },
      true
    ),
  adminRejectTx: (id: number) =>
    request<{ success: boolean }>(
      `/admin/transactions/${id}/reject`,
      { method: 'POST' },
      true
    ),
  getAdminTasks: () => request<{ tasks: any[] }>('/admin/tasks', {}, true),
  adminCreateTask: (payload: any) =>
    request<{ task: any }>(
      '/admin/tasks',
      { method: 'POST', body: JSON.stringify(payload) },
      true
    ),
  adminUpdateTask: (id: number, payload: any) =>
    request<{ success: boolean }>(
      `/admin/tasks/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      true
    ),
  adminDeleteTask: (id: number) =>
    request<{ success: boolean }>(
      `/admin/tasks/${id}`,
      { method: 'DELETE' },
      true
    ),
  getAdminChats: () => request<{ chats: any[] }>('/admin/chats', {}, true),
  adminReplyChat: (chatId: number, text: string) =>
    request<{ success: boolean }>(
      `/admin/chats/${chatId}/reply`,
      { method: 'POST', body: JSON.stringify({ text }) },
      true
    ),
  adminSendNotification: (payload: {
    userId?: number | null;
    title: string;
    message: string;
  }) =>
    request<{ success: boolean }>(
      '/admin/notifications',
      { method: 'POST', body: JSON.stringify(payload) },
      true
    ),
  adminSaveWallet: (networkId: string, address: string) =>
    request<{ wallets: Record<string, string> }>(
      '/admin/settings/wallets',
      { method: 'PUT', body: JSON.stringify({ networkId, address }) },
      true
    ),
  adminSaveGeneralSettings: (announcement: string) =>
    request<{ success: boolean }>(
      '/admin/settings/general',
      { method: 'PUT', body: JSON.stringify({ announcement }) },
      true
    ),
  getAdminLogs: () => request<{ logs: any[] }>('/admin/logs', {}, true),
};

export function formatMoney(n: number): string {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB').replace(/\//g, '.') +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB').replace(/\//g, '.');
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return 'just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
