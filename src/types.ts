export interface VipTierConfig {
  level: number;
  name: string;
  price: number;
  maxDailyEarnings: number;
  tasksPerDay: number;
  color: string;
  gradient: string;
  badge: string;
}

export interface CryptoNetworkConfig {
  id: string;
  name: string;
  network: string;
  label: string;
  color: string;
  address: string;
  minDeposit: number;
  confirmTime: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  referralCode: string;
  referredBy: number | null;
  balance: number;
  vipLevel: number;
  vipExpiry: string | null;
  tasksDone: number;
  tasksDoneDate: string;
  totalEarnings: number;
  dailyEarnings: number;
  dailyEarningsDate: string;
  weeklyProfit: number;
  monthlyProfit: number;
  status: 'active' | 'banned';
  joinedAt: string;
  lastLogin: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface TaskItem {
  id: number;
  platform: 'youtube' | 'tiktok' | 'facebook' | 'instagram';
  action: string;
  description: string;
  icon: string;
  reward: number;
  duration: number;
  url: string;
  verify: string;
  status?: 'active' | 'inactive';
  completionsCount?: number;
}

export interface CompletedTaskItem {
  id: number;
  taskId: number;
  platform: string;
  action: string;
  reward: number;
  completedAt: string;
}

export interface TransactionItem {
  id: number;
  orderId: string;
  userId: number;
  userEmail?: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'task' | 'upgrade' | 'referral';
  amount: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  note: string;
  cryptoNetwork?: string | null;
  cryptoName?: string | null;
  walletAddress?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  chatId?: number;
  userId?: number;
  sender: 'user' | 'bot' | 'admin';
  text: string;
  isRead?: boolean;
  createdAt: string;
}

export interface AdminChatThread {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  vipLevel: number;
  status: string;
  unreadCount: number;
  lastMessage: { text: string; sender: string; createdAt: string } | null;
  messages: ChatMessage[];
}

export interface ActivityLogItem {
  id: number;
  actorType: 'user' | 'admin' | 'system';
  actorId: number | null;
  actorEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface PublicSettings {
  vipConfig: VipTierConfig[];
  cryptoNetworks: Record<string, CryptoNetworkConfig>;
  wallets: Record<string, string>;
  announcement: string;
  referralCommissionPercent: number;
  minWithdrawalEur: number;
}
