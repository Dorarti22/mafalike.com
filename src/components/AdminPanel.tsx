import React, { useEffect, useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  Bitcoin,
  Wallet,
  Users,
  ListOrdered,
  UserPlus,
  Coins,
  CheckSquare,
  MessageSquare,
  Bell,
  Activity,
  LogOut,
  ArrowLeft,
  Search,
  Plus,
  Check,
  X,
  Edit3,
  Eye,
  Trash2,
  Send,
  RefreshCw,
  Crown,
  AlertCircle,
} from 'lucide-react';
import {
  api,
  formatDate,
  formatMoney,
  getAdminToken,
  setAdminToken,
} from '../api.ts';
import {
  ActivityLogItem,
  AdminChatThread,
  AdminUser,
  PublicSettings,
  TaskItem,
  TransactionItem,
  User,
} from '../types.ts';

interface AdminPanelProps {
  onSwitchToPublic: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  publicSettings: PublicSettings | null;
  onRefreshPublicSettings: () => void;
}

type AdminSection =
  | 'dashboard'
  | 'deposits'
  | 'withdraws'
  | 'users'
  | 'tasks'
  | 'transactions'
  | 'support'
  | 'create-user'
  | 'wallets'
  | 'logs';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onSwitchToPublic,
  showToast,
  publicSettings,
  onRefreshPublicSettings,
}) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('admin@mafalike.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [loadingData, setLoadingData] = useState(false);

  // Data state
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    vipMembers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalBalance: 0,
    approvedDeposits: 0,
    approvedWithdrawals: 0,
    completedTasks: 0,
    totalActiveTasks: 0,
    unreadSupportChats: 0,
  });
  const [recentTx, setRecentTx] = useState<TransactionItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTx, setAllTx] = useState<TransactionItem[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [chats, setChats] = useState<AdminChatThread[]>([]);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState('');

  // Filters
  const [searchDeposit, setSearchDeposit] = useState('');
  const [searchWithdraw, setSearchWithdraw] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchTask, setSearchTask] = useState('');
  const [filterTaskPlatform, setFilterTaskPlatform] = useState('');
  const [searchTx, setSearchTx] = useState('');
  const [filterTxType, setFilterTxType] = useState('');

  // Create User Form
  const [nuEmail, setNuEmail] = useState('');
  const [nuPassword, setNuPassword] = useState('');
  const [nuBalance, setNuBalance] = useState('0');
  const [nuVip, setNuVip] = useState('0');
  const [nuRef, setNuRef] = useState('');

  // Broadcast Notification Form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTargetUserId, setNotifTargetUserId] = useState('');

  // Support Chat Selected
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Modals
  const [viewingDeposit, setViewingDeposit] = useState<TransactionItem | null>(null);
  const [viewingUserDetails, setViewingUserDetails] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    balance: '0',
    vipLevel: '0',
    tasksDone: '0',
    password: '',
  });
  const [adjustingBalanceUser, setAdjustingBalanceUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  // Task Modal (Create / Edit)
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskForm, setTaskForm] = useState({
    platform: 'youtube',
    action: '',
    description: '',
    reward: '0.35',
    duration: '15',
    url: 'https://www.youtube.com',
    verify: 'Complete the action and confirm',
    status: 'active',
  });

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: 'primary' | 'danger' | 'success';
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    api
      .getAdminMe()
      .then((res) => {
        setAdmin(res.admin);
        loadAllAdminData();
      })
      .catch(() => {
        setAdminToken(null);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  useEffect(() => {
    if (publicSettings) {
      setWallets(publicSettings.wallets || {});
      setAnnouncement(publicSettings.announcement || '');
    }
  }, [publicSettings]);

  async function loadAllAdminData() {
    setLoadingData(true);
    try {
      const [statsRes, usersRes, txRes, tasksRes, chatsRes, logsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminTransactions(),
        api.getAdminTasks(),
        api.getAdminChats(),
        api.getAdminLogs(),
      ]);
      setStats(statsRes.stats);
      setRecentTx(statsRes.recentTransactions || []);
      setAllUsers(usersRes.users || []);
      setAllTx(txRes.transactions || []);
      setAllTasks(tasksRes.tasks || []);
      setChats(chatsRes.chats || []);
      setLogs(logsRes.logs || []);
      if (!selectedChatId && chatsRes.chats?.length > 0) {
        setSelectedChatId(chatsRes.chats[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin data', 'error');
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast('Fill all fields', 'error');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await api.adminLogin(loginEmail, loginPassword);
      setAdminToken(res.token);
      setAdmin(res.admin);
      showToast(`Welcome, ${res.admin.name}`, 'success');
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message || 'Admin login failed', 'error');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleAdminLogout() {
    try {
      await api.adminLogout();
    } catch {}
    setAdminToken(null);
    setAdmin(null);
    showToast('Logged out of Admin Panel', 'info');
  }

  // Deposit / Withdraw Actions
  function promptApproveTx(tx: TransactionItem) {
    setConfirmDialog({
      title: `Approve ${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}`,
      message:
        tx.type === 'deposit'
          ? `Approve deposit of €${formatMoney(tx.amount)} for ${tx.userEmail}? Balance will be credited automatically.`
          : `Approve withdrawal of €${formatMoney(tx.amount)} for ${tx.userEmail}?`,
      confirmLabel: 'Approve Now',
      variant: 'success',
      onConfirm: async () => {
        await api.adminApproveTx(tx.id);
        showToast(`Approved ${tx.orderId} for ${tx.userEmail}`, 'success');
        setViewingDeposit(null);
        await loadAllAdminData();
      },
    });
  }

  function promptRejectTx(tx: TransactionItem) {
    setConfirmDialog({
      title: `Reject ${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}`,
      message: `Reject ${tx.type} of €${formatMoney(tx.amount)} (${tx.orderId})?${
        tx.type === 'withdraw' ? ' The balance will be automatically refunded to the user.' : ''
      }`,
      confirmLabel: 'Reject Request',
      variant: 'danger',
      onConfirm: async () => {
        await api.adminRejectTx(tx.id);
        showToast(`Rejected ${tx.orderId}`, 'info');
        setViewingDeposit(null);
        await loadAllAdminData();
      },
    });
  }

  // User Actions
  async function openUserDetails(userId: number) {
    try {
      const res = await api.getAdminUserDetails(userId);
      setViewingUserDetails(res);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  function openEditUserModal(u: User) {
    setEditingUser(u);
    setEditUserForm({
      email: u.email,
      balance: String(u.balance),
      vipLevel: String(u.vipLevel),
      tasksDone: String(u.tasksDone),
      password: '',
    });
  }

  async function handleSaveEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.adminUpdateUser(editingUser.id, {
        email: editUserForm.email,
        balance: parseFloat(editUserForm.balance) || 0,
        vipLevel: parseInt(editUserForm.vipLevel, 10) || 0,
        tasksDone: parseInt(editUserForm.tasksDone, 10) || 0,
        password: editUserForm.password || undefined,
      });
      showToast('User updated successfully', 'success');
      setEditingUser(null);
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function handleSaveAdjustBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustingBalanceUser) return;
    const amt = parseFloat(adjustAmount);
    if (!amt || isNaN(amt)) {
      showToast('Enter a non-zero amount', 'error');
      return;
    }
    try {
      await api.adminAdjustBalance(
        adjustingBalanceUser.id,
        amt,
        adjustNote || 'Admin adjustment'
      );
      showToast('Balance adjusted', 'success');
      setAdjustingBalanceUser(null);
      setAdjustAmount('');
      setAdjustNote('');
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  function promptToggleBan(u: User) {
    const actionLabel = u.status === 'banned' ? 'Unban' : 'Ban';
    setConfirmDialog({
      title: `${actionLabel} User`,
      message: `Are you sure you want to ${actionLabel.toLowerCase()} user ${u.email}?`,
      confirmLabel: actionLabel,
      variant: u.status === 'banned' ? 'success' : 'danger',
      onConfirm: async () => {
        await api.adminToggleBan(u.id);
        showToast(`User ${u.status === 'banned' ? 'unbanned' : 'banned'}`, 'success');
        await loadAllAdminData();
      },
    });
  }

  async function handleCreateNewUser(e: React.FormEvent) {
    e.preventDefault();
    if (!nuEmail || !nuPassword) {
      showToast('Email and password are required', 'error');
      return;
    }
    try {
      await api.adminCreateUser({
        email: nuEmail,
        password: nuPassword,
        balance: parseFloat(nuBalance) || 0,
        vipLevel: parseInt(nuVip, 10) || 0,
        referralCode: nuRef || undefined,
      });
      showToast(`User ${nuEmail} created!`, 'success');
      setNuEmail('');
      setNuPassword('');
      setNuBalance('0');
      setNuVip('0');
      setNuRef('');
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Task CRUD Actions
  function openCreateTask() {
    setEditingTask(null);
    setTaskForm({
      platform: 'youtube',
      action: '',
      description: '',
      reward: '0.35',
      duration: '15',
      url: 'https://www.youtube.com',
      verify: 'Watch and complete action, then return to claim',
      status: 'active',
    });
    setTaskModalOpen(true);
  }

  function openEditTask(t: TaskItem) {
    setEditingTask(t);
    setTaskForm({
      platform: t.platform,
      action: t.action,
      description: t.description,
      reward: String(t.reward),
      duration: String(t.duration),
      url: t.url,
      verify: t.verify,
      status: t.status || 'active',
    });
    setTaskModalOpen(true);
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        platform: taskForm.platform,
        action: taskForm.action,
        description: taskForm.description,
        reward: parseFloat(taskForm.reward) || 0.3,
        duration: parseInt(taskForm.duration, 10) || 15,
        url: taskForm.url,
        verify: taskForm.verify,
        status: taskForm.status,
      };
      if (editingTask) {
        await api.adminUpdateTask(editingTask.id, payload);
        showToast('Task updated', 'success');
      } else {
        await api.adminCreateTask(payload);
        showToast('New task created and published to platform!', 'success');
      }
      setTaskModalOpen(false);
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  function promptDeleteTask(t: TaskItem) {
    setConfirmDialog({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete task "${t.action}" (${t.platform})?`,
      confirmLabel: 'Delete Task',
      variant: 'danger',
      onConfirm: async () => {
        await api.adminDeleteTask(t.id);
        showToast('Task deleted', 'info');
        await loadAllAdminData();
      },
    });
  }

  // Support Chat Reply
  async function handleSendAdminReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChatId || !adminReplyText.trim()) return;
    try {
      await api.adminReplyChat(selectedChatId, adminReplyText.trim());
      setAdminReplyText('');
      showToast('Reply sent to user', 'success');
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Send Notification
  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('Enter notification title and message', 'error');
      return;
    }
    try {
      await api.adminSendNotification({
        userId: notifTargetUserId ? Number(notifTargetUserId) : null,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
      });
      showToast(
        notifTargetUserId ? 'Notification sent to user' : 'Notification broadcasted to all users',
        'success'
      );
      setNotifTitle('');
      setNotifMessage('');
      setNotifTargetUserId('');
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Save Wallets
  async function handleSaveWallet(networkId: string) {
    const addr = wallets[networkId];
    if (!addr || !addr.trim()) {
      showToast('Wallet address cannot be empty', 'error');
      return;
    }
    try {
      await api.adminSaveWallet(networkId, addr.trim());
      onRefreshPublicSettings();
      showToast('Wallet address updated!', 'success');
      await loadAllAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function handleSaveAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.adminSaveGeneralSettings(announcement);
      onRefreshPublicSettings();
      showToast('Platform settings saved!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-300">Loading Admin Panel...</span>
        </div>
      </div>
    );
  }

  // ADMIN LOGIN SCREEN (Preserving original MAFALIKE Admin Panel aesthetic)
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 relative overflow-hidden">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
          <button
            onClick={onSwitchToPublic}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to MAFALIKE Public Platform
          </button>

          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <Shield className="w-9 h-9" />
          </div>
          <h1 className="text-center text-2xl font-extrabold text-slate-900 mb-1">Admin Panel</h1>
          <p className="text-center text-xs font-medium text-slate-500 mb-7">
            MAFALIKE Management System
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@mafalike.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all cursor-pointer disabled:opacity-60"
            >
              {loginLoading ? 'Signing in...' : 'Sign In to Admin Workspace'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-2 font-medium">Quick Fill Default Admin Accounts:</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@mafalike.com');
                  setLoginPassword('admin123');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                admin@mafalike.com
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@dorart.com');
                  setLoginPassword('admin1234');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                admin@dorart.com
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vipConfigs = publicSettings?.vipConfig || [];
  const cryptoNetworks = publicSettings?.cryptoNetworks || {};

  const filteredDeposits = allTx
    .filter((t) => t.type === 'deposit')
    .filter(
      (t) =>
        !searchDeposit ||
        t.orderId.toLowerCase().includes(searchDeposit.toLowerCase()) ||
        (t.userEmail || '').toLowerCase().includes(searchDeposit.toLowerCase())
    );

  const filteredWithdraws = allTx
    .filter((t) => t.type === 'withdraw')
    .filter(
      (t) =>
        !searchWithdraw ||
        t.orderId.toLowerCase().includes(searchWithdraw.toLowerCase()) ||
        (t.userEmail || '').toLowerCase().includes(searchWithdraw.toLowerCase())
    );

  const filteredUsers = allUsers.filter(
    (u) =>
      !searchUser ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.referralCode.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredTasks = allTasks
    .filter((t) => !filterTaskPlatform || t.platform === filterTaskPlatform)
    .filter(
      (t) =>
        !searchTask ||
        t.action.toLowerCase().includes(searchTask.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTask.toLowerCase())
    );

  const filteredAllTx = allTx
    .filter((t) => !filterTxType || t.type === filterTxType)
    .filter(
      (t) =>
        !searchTx ||
        t.orderId.toLowerCase().includes(searchTx.toLowerCase()) ||
        (t.userEmail || '').toLowerCase().includes(searchTx.toLowerCase()) ||
        (t.note || '').toLowerCase().includes(searchTx.toLowerCase())
    );

  const activeChat = chats.find((c) => c.id === selectedChatId) || null;

  const navItems: {
    id: AdminSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'deposits',
      label: 'Deposits',
      icon: <Bitcoin className="w-4 h-4" />,
      badge: stats.pendingDeposits,
    },
    {
      id: 'withdraws',
      label: 'Withdrawals',
      icon: <Wallet className="w-4 h-4" />,
      badge: stats.pendingWithdrawals,
    },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks CRUD', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <ListOrdered className="w-4 h-4" /> },
    {
      id: 'support',
      label: 'Support & Notifications',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: stats.unreadSupportChats,
    },
    { id: 'create-user', label: 'Create User', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'wallets', label: 'Wallets & Settings', icon: <Coins className="w-4 h-4" /> },
    { id: 'logs', label: 'Activity Logs', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* TOP BAR CONTRACT */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-indigo-200" />
          <span className="font-extrabold text-base sm:text-lg tracking-tight">
            MAFALIKE Admin
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={loadAllAdminData}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onSwitchToPublic}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Public App
          </button>
          <span className="hidden md:inline text-xs font-semibold text-indigo-100">
            {admin.name}
          </span>
          <button
            onClick={handleAdminLogout}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/80 border border-white/25 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* SIDEBAR */}
        <aside className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col overflow-x-auto md:overflow-visible py-2 md:py-4 shrink-0">
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-3 px-4 md:px-5 py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer border-b-2 md:border-b-0 md:border-l-4 ${
                  active
                    ? 'bg-indigo-50/80 text-indigo-600 border-indigo-600 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {/* 1. DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-slate-900">Dashboard Overview</h2>
                <span className="text-xs text-slate-500">
                  Real-time server database metrics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {stats.totalUsers}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">Total Users</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {stats.vipMembers}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">VIP Members</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Crown className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('deposits')}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  <div>
                    <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
                      {stats.pendingDeposits}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Pending Deposits
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Bitcoin className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('withdraws')}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  <div>
                    <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
                      {stats.pendingWithdrawals}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Pending Withdrawals
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                      €{formatMoney(stats.totalBalance)}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Total User Balance
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Coins className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      €{formatMoney(stats.approvedDeposits)}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Approved Deposits
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      €{formatMoney(stats.approvedWithdrawals)}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Approved Withdrawals
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {stats.completedTasks}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Tasks Completed
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
                <h3 className="text-base font-extrabold text-slate-900 mb-4">
                  Recent Platform Activity
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">User</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3 text-right">Amount</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentTx.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            No activity recorded yet
                          </td>
                        </tr>
                      ) : (
                        recentTx.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-3 font-mono text-xs text-slate-600">
                              {t.orderId}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {t.userEmail}
                            </td>
                            <td className="py-3 px-3 capitalize text-slate-600">{t.type}</td>
                            <td className="py-3 px-3 text-right font-bold tabular-nums text-slate-900">
                              €{formatMoney(Math.abs(t.amount))}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`font-bold capitalize text-xs ${
                                  t.status === 'approved' || t.status === 'completed'
                                    ? 'text-emerald-600'
                                    : t.status === 'rejected'
                                    ? 'text-rose-600'
                                    : 'text-amber-600'
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-500 tabular-nums">
                              {formatDate(t.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. DEPOSITS */}
          {activeSection === 'deposits' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-extrabold text-slate-900">Crypto Deposits</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchDeposit}
                    onChange={(e) => setSearchDeposit(e.target.value)}
                    placeholder="Search email or Order ID..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">Order ID</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Network</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDeposits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No deposits found
                        </td>
                      </tr>
                    ) : (
                      filteredDeposits.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-mono text-xs">{t.orderId}</td>
                          <td className="py-3 px-3 font-semibold">{t.userEmail}</td>
                          <td className="py-3 px-3">{t.cryptoName || t.cryptoNetwork || '—'}</td>
                          <td className="py-3 px-3 text-right font-bold tabular-nums text-emerald-600">
                            €{formatMoney(t.amount)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold capitalize text-xs ${
                                t.status === 'approved'
                                  ? 'text-emerald-600'
                                  : t.status === 'rejected'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500 tabular-nums">
                            {formatDate(t.createdAt)}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setViewingDeposit(t)}
                              className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                            >
                              View
                            </button>
                            {t.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => promptApproveTx(t)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => promptRejectTx(t)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  ✕ Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. WITHDRAWALS */}
          {activeSection === 'withdraws' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-extrabold text-slate-900">Withdrawal Requests</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchWithdraw}
                    onChange={(e) => setSearchWithdraw(e.target.value)}
                    placeholder="Search email or Order ID..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">Order ID</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3">Destination Wallet</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWithdraws.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No withdrawals found
                        </td>
                      </tr>
                    ) : (
                      filteredWithdraws.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-mono text-xs">{t.orderId}</td>
                          <td className="py-3 px-3 font-semibold">{t.userEmail}</td>
                          <td className="py-3 px-3 text-right font-bold tabular-nums text-slate-900">
                            €{formatMoney(t.amount)}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-600 max-w-[220px] truncate">
                            {t.walletAddress || t.note}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold capitalize text-xs ${
                                t.status === 'approved'
                                  ? 'text-emerald-600'
                                  : t.status === 'rejected'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500 tabular-nums">
                            {formatDate(t.createdAt)}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            {t.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => promptApproveTx(t)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => promptRejectTx(t)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  ✕ Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. USERS */}
          {activeSection === 'users' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-extrabold text-slate-900">
                  All Registered Users ({filteredUsers.length})
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      placeholder="Search email or referral..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <button
                    onClick={() => setActiveSection('create-user')}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create User
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">ID</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3 text-right">Balance</th>
                      <th className="py-3 px-3">VIP</th>
                      <th className="py-3 px-3 text-right">Tasks Today</th>
                      <th className="py-3 px-3">Referral</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const cfg = vipConfigs[u.vipLevel] || {
                        name: `VIP${u.vipLevel}`,
                        badge: '🎯',
                        color: '#64748b',
                      };
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-mono text-xs text-slate-500">#{u.id}</td>
                          <td className="py-3 px-3 font-bold text-slate-900">{u.email}</td>
                          <td className="py-3 px-3 text-right font-bold tabular-nums text-emerald-600">
                            €{formatMoney(u.balance)}
                          </td>
                          <td
                            className="py-3 px-3 font-extrabold text-xs"
                            style={{ color: cfg.color }}
                          >
                            {cfg.badge} {cfg.name}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums">{u.tasksDone}</td>
                          <td className="py-3 px-3 font-mono text-xs text-slate-600">
                            {u.referralCode}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold text-xs capitalize ${
                                u.status === 'banned' ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => openUserDetails(u.id)}
                              title="View User Details"
                              className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              onClick={() => openEditUserModal(u)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setAdjustingBalanceUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                            >
                              €
                            </button>
                            <button
                              onClick={() => promptToggleBan(u)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                            >
                              {u.status === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. TASKS MANAGEMENT (CRUD) */}
          {activeSection === 'tasks' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Platform Tasks Management ({filteredTasks.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Create, edit, or remove social media tasks shown to users in the Public Platform
                  </p>
                </div>
                <button
                  onClick={openCreateTask}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Create New Task
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTask}
                    onChange={(e) => setSearchTask(e.target.value)}
                    placeholder="Search task title or description..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <select
                  value={filterTaskPlatform}
                  onChange={(e) => setFilterTaskPlatform(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Platforms</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">ID</th>
                      <th className="py-3 px-3">Platform</th>
                      <th className="py-3 px-3">Task Action</th>
                      <th className="py-3 px-3 text-right">Reward</th>
                      <th className="py-3 px-3 text-right">Duration</th>
                      <th className="py-3 px-3 text-right">Completions</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono text-xs text-slate-500">#{t.id}</td>
                        <td className="py-3 px-3 capitalize font-bold text-slate-800">
                          {t.platform}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{t.action}</div>
                          <div className="text-xs text-slate-500">{t.description}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-emerald-600">
                          +€{t.reward.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                          {t.duration}s
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-semibold">
                          {t.completionsCount || 0}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold text-xs capitalize ${
                              t.status === 'inactive' ? 'text-slate-400' : 'text-emerald-600'
                            }`}
                          >
                            {t.status || 'active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openEditTask(t)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => promptDeleteTask(t)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. ALL TRANSACTIONS */}
          {activeSection === 'transactions' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4">All Transactions</h2>
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTx}
                    onChange={(e) => setSearchTx(e.target.value)}
                    placeholder="Search Order ID, user email, or note..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <select
                  value={filterTxType}
                  onChange={(e) => setFilterTxType(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                  <option value="transfer">Transfer</option>
                  <option value="task">Task</option>
                  <option value="upgrade">Upgrade</option>
                  <option value="referral">Referral</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">Order ID</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Note</th>
                      <th className="py-3 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAllTx.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono text-xs text-slate-600">{t.orderId}</td>
                        <td className="py-3 px-3 font-semibold">{t.userEmail}</td>
                        <td className="py-3 px-3 capitalize">{t.type}</td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums">
                          €{formatMoney(Math.abs(t.amount))}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold capitalize text-xs ${
                              t.status === 'approved' || t.status === 'completed'
                                ? 'text-emerald-600'
                                : t.status === 'rejected'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500">{t.note || '—'}</td>
                        <td className="py-3 px-3 text-xs text-slate-500 tabular-nums">
                          {formatDate(t.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. SUPPORT CHATS & BROADCAST NOTIFICATIONS */}
          {activeSection === 'support' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col h-[560px]">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Live Support Conversations
                  </h2>
                  <span className="text-xs text-slate-500">{chats.length} user threads</span>
                </div>
                <div className="flex-1 flex overflow-hidden">
                  {/* Thread List */}
                  <div className="w-1/3 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100">
                    {chats.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedChatId(c.id)}
                        className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                          selectedChatId === c.id ? 'bg-indigo-50/70' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {c.userEmail}
                          </span>
                          {c.unreadCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {c.lastMessage?.text || 'No messages'}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Active Chat Messages */}
                  <div className="flex-1 flex flex-col bg-slate-50/50">
                    {activeChat ? (
                      <>
                        <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">
                              {activeChat.userEmail}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              User ID #{activeChat.userId} · VIP{activeChat.vipLevel}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto space-y-3">
                          {activeChat.messages.map((m) => (
                            <div
                              key={m.id}
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                m.sender === 'admin'
                                  ? 'bg-indigo-600 text-white ml-auto'
                                  : m.sender === 'user'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="font-bold text-[10px] opacity-75 mb-0.5 uppercase">
                                {m.sender}
                              </div>
                              <div className="whitespace-pre-line">{m.text}</div>
                              <div className="text-[10px] opacity-70 mt-1 text-right">
                                {formatDate(m.createdAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <form
                          onSubmit={handleSendAdminReply}
                          className="p-3 bg-white border-t border-slate-200 flex gap-2"
                        >
                          <input
                            type="text"
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            placeholder="Reply as Administrator..."
                            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" /> Send
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                        Select a user thread to view & reply
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Send Broadcast / Direct Notification */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 h-fit">
                <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" /> Send Notification
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Push an instant notification to all users or a specific account
                </p>
                <form onSubmit={handleSendNotification} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Recipient
                    </label>
                    <select
                      value={notifTargetUserId}
                      onChange={(e) => setNotifTargetUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm"
                    >
                      <option value="">All Users (Broadcast)</option>
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          #{u.id} - {u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g., Weekend Bonus Tasks Live!"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                    <textarea
                      rows={3}
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      placeholder="Enter notification message..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    Send Notification
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 8. CREATE USER */}
          {activeSection === 'create-user' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 max-w-xl">
              <h2 className="text-lg font-extrabold text-slate-900 mb-5">Create New User</h2>
              <form onSubmit={handleCreateNewUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={nuEmail}
                    onChange={(e) => setNuEmail(e.target.value)}
                    placeholder="user@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={nuPassword}
                    onChange={(e) => setNuPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Balance (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={nuBalance}
                      onChange={(e) => setNuBalance(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">VIP Level</label>
                    <select
                      value={nuVip}
                      onChange={(e) => setNuVip(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                    >
                      <option value="0">FREE</option>
                      <option value="1">VIP1</option>
                      <option value="2">VIP2</option>
                      <option value="3">VIP3</option>
                      <option value="4">VIP4</option>
                      <option value="5">VIP5</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Referrer Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={nuRef}
                    onChange={(e) => setNuRef(e.target.value)}
                    placeholder="e.g., MAF7X9K2L"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer"
                >
                  Create User Account
                </button>
              </form>
            </div>
          )}

          {/* 9. WALLETS & SETTINGS */}
          {activeSection === 'wallets' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">
                  Crypto Wallet Addresses
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  Update receiving wallet addresses displayed to users when they make a deposit.
                </p>

                <div className="space-y-4">
                  {Object.values(cryptoNetworks).map((net) => (
                    <div
                      key={net.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div className="flex items-center gap-3 mb-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-sm"
                          style={{ background: net.color }}
                        >
                          {net.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900">{net.name}</span>{' '}
                          <span className="text-xs text-slate-500">({net.network})</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={wallets[net.id] || ''}
                          onChange={(e) =>
                            setWallets((prev) => ({ ...prev, [net.id]: e.target.value }))
                          }
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveWallet(net.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Platform Announcement Banner
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Displayed on the MAFALIKE Public Platform Home Dashboard
                </p>
                <form onSubmit={handleSaveAnnouncement} className="space-y-3">
                  <textarea
                    rows={2}
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Save Platform Announcement
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 10. ACTIVITY LOGS */}
          {activeSection === 'logs' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                System & Security Activity Logs
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">ID</th>
                      <th className="py-3 px-3">Actor</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Details</th>
                      <th className="py-3 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-400">#{l.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {l.actorEmail}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-xs font-bold text-indigo-600">
                          {l.actorType}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-700">
                          {l.action}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-600">{l.details}</td>
                        <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">
                          {formatDate(l.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DEPOSIT DETAILS MODAL */}
      {viewingDeposit && (
        <div
          onClick={() => setViewingDeposit(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900">Deposit Details</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Order ID</span>
                <code className="font-mono font-bold">{viewingDeposit.orderId}</code>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">User</span>
                <span className="font-bold">{viewingDeposit.userEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Amount</span>
                <span className="font-extrabold text-emerald-600">
                  €{formatMoney(viewingDeposit.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Network</span>
                <span className="font-bold">{viewingDeposit.cryptoName || 'USDT'}</span>
              </div>
              <div className="py-1 border-b border-slate-200/70">
                <div className="text-slate-500 mb-1">Receiving Wallet Address</div>
                <div className="font-mono text-xs bg-white p-2 rounded border border-slate-200 break-all">
                  {viewingDeposit.walletAddress || '—'}
                </div>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold">{formatDate(viewingDeposit.createdAt)}</span>
              </div>
            </div>

            {viewingDeposit.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => promptApproveTx(viewingDeposit)}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
                >
                  ✓ Approve Deposit
                </button>
                <button
                  onClick={() => promptRejectTx(viewingDeposit)}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer"
                >
                  ✕ Reject
                </button>
              </div>
            )}
            <button
              onClick={() => setViewingDeposit(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* VIEW USER DETAILS MODAL */}
      {viewingUserDetails && (
        <div
          onClick={() => setViewingUserDetails(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                User Profile #{viewingUserDetails.user.id}
              </h3>
              <button
                onClick={() => setViewingUserDetails(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-bold">{viewingUserDetails.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Balance</span>
                <span className="font-extrabold text-emerald-600">
                  €{formatMoney(viewingUserDetails.user.balance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Earnings</span>
                <span className="font-bold">
                  €{formatMoney(viewingUserDetails.user.totalEarnings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referral Code</span>
                <code className="font-mono font-bold">{viewingUserDetails.user.referralCode}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referred Members</span>
                <span className="font-bold">{viewingUserDetails.referrals?.length || 0}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase text-slate-500 mb-2">
                Recent Transactions ({viewingUserDetails.transactions?.length || 0})
              </h4>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 text-xs">
                {(viewingUserDetails.transactions || []).map((t: any) => (
                  <div key={t.id} className="py-2 px-2 flex justify-between items-center">
                    <div>
                      <span className="font-bold capitalize">{t.type}</span> ·{' '}
                      <span className="text-slate-500">{t.note}</span>
                    </div>
                    <span className="font-bold tabular-nums">€{formatMoney(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setViewingUserDetails(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div
          onClick={() => setEditingUser(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEditUser}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900">Edit User #{editingUser.id}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={editUserForm.email}
                onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Balance (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editUserForm.balance}
                  onChange={(e) => setEditUserForm({ ...editUserForm, balance: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">VIP Level</label>
                <select
                  value={editUserForm.vipLevel}
                  onChange={(e) => setEditUserForm({ ...editUserForm, vipLevel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                >
                  {vipConfigs.map((v) => (
                    <option key={v.level} value={v.level}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tasks Done Today</label>
              <input
                type="number"
                value={editUserForm.tasksDone}
                onChange={(e) => setEditUserForm({ ...editUserForm, tasksDone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password (leave empty to keep current)
              </label>
              <input
                type="text"
                value={editUserForm.password}
                onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADJUST BALANCE MODAL */}
      {adjustingBalanceUser && (
        <div
          onClick={() => setAdjustingBalanceUser(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveAdjustBalance}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900">Adjust User Balance</h3>
            <p className="text-xs text-slate-500">
              User: <strong>{adjustingBalanceUser.email}</strong> · Current:{' '}
              <strong>€{formatMoney(adjustingBalanceUser.balance)}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount (€) — use minus (-) to subtract
              </label>
              <input
                type="number"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 50 or -20"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Note</label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
              >
                Apply Adjustment
              </button>
              <button
                type="button"
                onClick={() => setAdjustingBalanceUser(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      {taskModalOpen && (
        <div
          onClick={() => setTaskModalOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveTask}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-3.5"
          >
            <h3 className="text-lg font-extrabold text-slate-900">
              {editingTask ? `Edit Task #${editingTask.id}` : 'Create New Task'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Platform</label>
                <select
                  value={taskForm.platform}
                  onChange={(e) => setTaskForm({ ...taskForm, platform: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                >
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Action Title</label>
              <input
                type="text"
                value={taskForm.action}
                onChange={(e) => setTaskForm({ ...taskForm, action: e.target.value })}
                placeholder="e.g., Subscribe & Watch Video"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="e.g., Watch 20s then subscribe to channel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reward (€)</label>
                <input
                  type="number"
                  step="0.05"
                  value={taskForm.reward}
                  onChange={(e) => setTaskForm({ ...taskForm, reward: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={taskForm.duration}
                  onChange={(e) => setTaskForm({ ...taskForm, duration: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target URL</label>
              <input
                type="url"
                value={taskForm.url}
                onChange={(e) => setTaskForm({ ...taskForm, url: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Verification Instruction
              </label>
              <input
                type="text"
                value={taskForm.verify}
                onChange={(e) => setTaskForm({ ...taskForm, verify: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div
          onClick={() => setConfirmDialog(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900">{confirmDialog.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  try {
                    await fn();
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
                className={`flex-1 py-3 rounded-xl text-white font-bold text-sm cursor-pointer ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.variant === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
