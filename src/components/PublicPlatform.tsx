import React, { useEffect, useState } from 'react';
import {
  Bell,
  Crown,
  Home,
  CheckSquare,
  Gem,
  FileText,
  User as UserIcon,
  PlusCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Share2,
  Shield,
  MessageCircle,
  HelpCircle,
  LogOut,
  Copy,
  ExternalLink,
  CheckCircle2,
  X,
  Send,
  Search,
  Sparkles,
  Lock,
  Mail,
  Users,
  ChevronRight,
  PlayCircle,
  ThumbsUp,
  Heart,
  UserPlus,
  Smartphone,
  Settings,
} from 'lucide-react';
import {
  api,
  formatDate,
  formatDateShort,
  formatMoney,
  getUserToken,
  setUserToken,
  timeAgo,
} from '../api.ts';
import {
  ChatMessage,
  CompletedTaskItem,
  NotificationItem,
  PublicSettings,
  TaskItem,
  TransactionItem,
  User,
} from '../types.ts';

interface PublicPlatformProps {
  onSwitchToAdmin: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  publicSettings: PublicSettings | null;
}

type PublicPage = 'home' | 'tasks' | 'vip' | 'records' | 'profile';

const LOGO_PATH = '/src/assets/images/mafalike_logo_1790854725874.jpg';

export const PublicPlatform: React.FC<PublicPlatformProps> = ({
  onSwitchToAdmin,
  showToast,
  publicSettings,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Auth form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [regReferral, setRegReferral] = useState('');
  const [regAgree, setRegAgree] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Navigation & Page state
  const [activePage, setActivePage] = useState<PublicPage>('home');
  const [bannerSlide, setBannerSlide] = useState(0);

  // Data state
  const [availableTasks, setAvailableTasks] = useState<TaskItem[]>([]);
  const [completedToday, setCompletedToday] = useState<CompletedTaskItem[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [maxDailyEarnings, setMaxDailyEarnings] = useState(5);
  const [tasksDone, setTasksDone] = useState(0);
  const [tasksPerDay, setTasksPerDay] = useState(8);
  const [taskPlatformFilter, setTaskPlatformFilter] = useState<string>('all');
  const [taskSearch, setTaskSearch] = useState('');

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [recordFilter, setRecordFilter] = useState<string>('all');
  const [recordSearch, setRecordSearch] = useState('');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [referralData, setReferralData] = useState<any>(null);

  // Active Task Execution Modal
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [taskCountdown, setTaskCountdown] = useState(0);
  const [claimingTask, setClaimingTask] = useState(false);

  // Modals
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<'select' | 'address'>('select');
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [personalInfoModalOpen, setPersonalInfoModalOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [curPwdInput, setCurPwdInput] = useState('');
  const [newPwdInput, setNewPwdInput] = useState('');

  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [vipConfirmLevel, setVipConfirmLevel] = useState<{
    level: number;
    name: string;
    cost: number;
    maxDaily: number;
  } | null>(null);
  const [celebrationReward, setCelebrationReward] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);

  // Live Support Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [logoError, setLogoError] = useState(false);

  // Check URL ?ref= on mount & restore session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setRegReferral(ref.toUpperCase());
      setAuthMode('register');
    }

    const token = getUserToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }

    api
      .getMe()
      .then((res) => {
        setUser(res.user);
        setProfileNameInput(res.user.name || '');
        refreshAllUserData();
      })
      .catch(() => {
        setUserToken(null);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  // Auto-rotate banner carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerSlide((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Task Countdown Timer
  useEffect(() => {
    if (!activeTask || taskCountdown <= 0) return;
    const t = setInterval(() => {
      setTaskCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [activeTask, taskCountdown]);

  async function refreshAllUserData() {
    try {
      const [meRes, tasksRes, txRes, notifRes, refRes, msgRes] = await Promise.all([
        api.getMe(),
        api.getTasks(),
        api.getTransactions(),
        api.getNotifications(),
        api.getReferrals(),
        api.getMessages(),
      ]);
      setUser(meRes.user);
      setProfileNameInput(meRes.user.name || '');
      setAvailableTasks(tasksRes.available || []);
      setCompletedToday(tasksRes.completedToday || []);
      setTodayEarnings(tasksRes.todayEarnings || 0);
      setMaxDailyEarnings(tasksRes.maxDailyEarnings || 5);
      setTasksDone(tasksRes.tasksDone || 0);
      setTasksPerDay(tasksRes.tasksPerDay || 8);
      setTransactions(txRes.transactions || []);
      setNotifications(notifRes.notifications || []);
      setReferralData(refRes);
      setChatMessages(msgRes.messages || []);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  }

  // Auth Handlers
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      showToast('Please fill all fields', 'error');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      setUserToken(res.token);
      setUser(res.user);
      showToast(`Welcome back, ${res.user.email.split('@')[0]}!`, 'success');
      await refreshAllUserData();
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regEmail.trim() || !regPassword || !regPassword2) {
      showToast('Fill all required fields', 'error');
      return;
    }
    if (regPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (regPassword !== regPassword2) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (!regAgree) {
      showToast('Please accept the Terms & Conditions', 'error');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await api.register(regEmail.trim(), regPassword, regReferral.trim() || undefined);
      setUserToken(res.token);
      setUser(res.user);
      showToast('Account created! Welcome to MAFALIKE 🎉', 'success');
      await refreshAllUserData();
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function confirmLogout() {
    try {
      await api.logout();
    } catch {}
    setUserToken(null);
    setUser(null);
    setLogoutConfirmOpen(false);
    showToast('Signed out successfully', 'info');
  }

  // Task Execution
  function startTaskExecution(task: TaskItem) {
    if (todayEarnings >= maxDailyEarnings) {
      showToast(
        `Daily limit of €${maxDailyEarnings} reached! Upgrade your VIP level to earn more.`,
        'warning'
      );
      return;
    }
    if (tasksDone >= tasksPerDay) {
      showToast(
        `You completed all ${tasksPerDay} tasks today! Upgrade VIP for more daily tasks.`,
        'warning'
      );
      return;
    }
    setActiveTask(task);
    setTaskCountdown(task.duration || 15);
  }

  async function handleClaimTask() {
    if (!activeTask || taskCountdown > 0 || claimingTask) return;
    setClaimingTask(true);
    try {
      const res = await api.completeTask(activeTask.id);
      const earnedText = `+€${res.reward.toFixed(2)}`;
      setActiveTask(null);
      setCelebrationReward({
        title: 'Task Completed! 🎉',
        subtitle: `You earned ${earnedText}${
          res.commissionEarned > 0
            ? ` (+€${res.commissionEarned.toFixed(2)} referral bonus paid to your inviter)`
            : ''
        }`,
      });
      await refreshAllUserData();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete task', 'error');
    } finally {
      setClaimingTask(false);
    }
  }

  // VIP Upgrade
  function promptVipUpgrade(level: number, price: number, name: string, maxDaily: number) {
    if (!user) return;
    const vipConfigs = publicSettings?.vipConfig || [];
    const curCfg = vipConfigs[user.vipLevel] || { price: 0 };
    const diff = price - curCfg.price;

    if (user.balance < diff) {
      showToast(
        `Insufficient balance! You need €${formatMoney(diff - user.balance)} more (Cost: €${formatMoney(diff)}).`,
        'error'
      );
      return;
    }
    setVipConfirmLevel({ level, name, cost: diff, maxDaily });
  }

  async function handleConfirmVipUpgrade() {
    if (!vipConfirmLevel) return;
    try {
      await api.upgradeVip(vipConfirmLevel.level);
      const name = vipConfirmLevel.name;
      setVipConfirmLevel(null);
      setCelebrationReward({
        title: `Upgraded to ${name}! 👑`,
        subtitle: `Your new daily earning limit is €${vipConfirmLevel.maxDaily}.00!`,
      });
      await refreshAllUserData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  // Deposit / Withdraw / Transfer
  function openDepositModal() {
    setSelectedCrypto(null);
    setDepositStep('select');
    setDepositAmount('');
    setDepositModalOpen(true);
  }

  async function handleConfirmDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCrypto) return;
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      showToast('Enter a valid amount in EUR', 'error');
      return;
    }
    setSubmittingDeposit(true);
    try {
      const res = await api.submitDeposit(selectedCrypto, amt);
      setDepositModalOpen(false);
      setCelebrationReward({
        title: 'Deposit Submitted! ✓',
        subtitle: `Order ${res.orderId} (€${formatMoney(amt)}) has been sent for Admin verification.`,
      });
      await refreshAllUserData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingDeposit(false);
    }
  }

  async function handleConfirmWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 10) {
      showToast('Minimum withdrawal is €10.00', 'error');
      return;
    }
    if (!withdrawWallet.trim()) {
      showToast('Enter your destination crypto wallet address', 'error');
      return;
    }
    setSubmittingWithdraw(true);
    try {
      const res = await api.submitWithdraw(amt, withdrawWallet.trim());
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawWallet('');
      setCelebrationReward({
        title: 'Withdrawal Requested! 💸',
        subtitle: `Order ${res.orderId} for €${formatMoney(amt)} is being processed by Admin.`,
      });
      await refreshAllUserData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingWithdraw(false);
    }
  }

  async function handleConfirmTransfer(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!transferEmail.trim() || !amt || amt < 1) {
      showToast('Enter recipient email and at least €1.00', 'error');
      return;
    }
    setSubmittingTransfer(true);
    try {
      await api.submitTransfer(transferEmail.trim(), amt);
      setTransferModalOpen(false);
      setTransferEmail('');
      setTransferAmount('');
      showToast(`Transferred €${formatMoney(amt)} to ${transferEmail}!`, 'success');
      await refreshAllUserData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingTransfer(false);
    }
  }

  async function handleOpenNotifications() {
    setNotifModalOpen(true);
    const hasUnread = notifications.some((n) => !n.read);
    if (hasUnread) {
      try {
        await api.markNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {}
    }
  }

  async function handleUpdateProfileName(e: React.FormEvent) {
    e.preventDefault();
    if (!profileNameInput.trim()) return;
    try {
      const res = await api.updateProfile(profileNameInput.trim());
      setUser(res.user);
      showToast('Profile name updated!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!curPwdInput || !newPwdInput) {
      showToast('Fill both password fields', 'error');
      return;
    }
    try {
      await api.changePassword(curPwdInput, newPwdInput);
      setCurPwdInput('');
      setNewPwdInput('');
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  async function handleSendChatMessage(customText?: string) {
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend || sendingChat) return;
    if (!customText) setChatInput('');
    setSendingChat(true);
    try {
      const res = await api.sendMessage(textToSend);
      setChatMessages(res.messages || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSendingChat(false);
    }
  }

  function copyToClipboard(text: string, label = 'Copied to clipboard!') {
    navigator.clipboard
      ?.writeText(text)
      .then(() => showToast(label, 'success'))
      .catch(() => showToast('Copy failed', 'error'));
  }

  function shareReferralLink() {
    if (!user) return;
    const link = `${window.location.origin}${window.location.pathname}?ref=${user.referralCode}`;
    copyToClipboard(link, 'Referral link copied!');
  }

  function renderBrandLogo(sizeClass = 'w-11 h-11', textClass = 'text-xl') {
    return (
      <div
        className={`${sizeClass} rounded-full bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/20 flex items-center justify-center overflow-hidden shrink-0`}
      >
        {!logoError ? (
          <img
            src={LOGO_PATH}
            alt="MAFALIKE"
            referrerPolicy="no-referrer"
            onError={() => setLogoError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-black lowercase ${textClass}`}
          >
            m
          </div>
        )}
      </div>
    );
  }

  function getTaskIcon(iconName: string) {
    switch (iconName) {
      case 'thumbs-up':
        return <ThumbsUp className="w-5 h-5" />;
      case 'heart':
        return <Heart className="w-5 h-5" />;
      case 'user-plus':
        return <UserPlus className="w-5 h-5" />;
      case 'share-2':
        return <Share2 className="w-5 h-5" />;
      case 'message-circle':
        return <MessageCircle className="w-5 h-5" />;
      case 'smartphone':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <PlayCircle className="w-5 h-5" />;
    }
  }

  function getPlatformBadgeClass(platform: string) {
    switch (platform) {
      case 'youtube':
        return 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25';
      case 'tiktok':
        return 'bg-gradient-to-br from-slate-800 to-slate-950 shadow-slate-900/25';
      case 'facebook':
        return 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25';
      case 'instagram':
        return 'bg-gradient-to-br from-orange-500 to-pink-500 shadow-pink-500/25';
      default:
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600';
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-slate-600">Loading MAFALIKE...</span>
        </div>
      </div>
    );
  }

  // ==========================================================
  // AUTH SCREEN (Preserving MAFALIKE Emerald-Orange Brand UI)
  // ==========================================================
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-emerald-500 via-emerald-600 to-orange-500 relative overflow-y-auto">
        {/* Top-right Admin Access button */}
        <div className="fixed top-4 right-4 z-20">
          <button
            onClick={onSwitchToAdmin}
            className="px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" /> Admin Panel
          </button>
        </div>

        <div className="w-full max-w-[440px] bg-white/98 backdrop-blur-xl rounded-[28px] p-7 sm:p-9 shadow-2xl relative overflow-hidden my-8">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-orange-500 to-emerald-500" />

          <div className="flex justify-center mb-4">
            {renderBrandLogo('w-24 h-24', 'text-5xl')}
          </div>

          <div className="text-center text-3xl font-black bg-gradient-to-r from-emerald-600 to-orange-500 bg-clip-text text-transparent tracking-tight">
            MAFALIKE
          </div>
          <div className="text-center text-[11px] font-extrabold text-slate-400 tracking-[0.28em] uppercase mt-1 mb-5">
            Earn · Grow · Succeed
          </div>

          <h1 className="text-center text-xl font-extrabold text-slate-900 mb-1">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-center text-xs text-slate-500 mb-6">
            {authMode === 'login'
              ? 'Sign in to continue earning daily rewards'
              : 'Join MAFALIKE and start earning online'}
          </p>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/35 transition-all cursor-pointer disabled:opacity-60"
              >
                {authSubmitting ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center text-xs text-slate-500 pt-1">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-emerald-600 font-extrabold hover:underline cursor-pointer"
                >
                  Register Now
                </button>
              </div>

              {/* Demo Quick Login Helper */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 text-center mb-2">
                  Instant Demo Accounts (Click to Fill):
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('alex@mafalike.com');
                      setLoginPassword('user123');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Alex (VIP2 · €148.65)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('elena@mafalike.com');
                      setLoginPassword('user123');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Elena (VIP1 · €64.30)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Confirm
                  </label>
                  <input
                    type="password"
                    value={regPassword2}
                    onChange={(e) => setRegPassword2(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-4 pr-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regReferral}
                    onChange={(e) => setRegReferral(e.target.value)}
                    placeholder="e.g. MAF7X9K2L"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={regAgree}
                  onChange={(e) => setRegAgree(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600 rounded"
                />
                <span>
                  I agree to the <strong>Terms & Conditions</strong> and{' '}
                  <strong>Privacy Policy</strong>
                </span>
              </label>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/35 transition-all cursor-pointer disabled:opacity-60"
              >
                {authSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="text-center text-xs text-slate-500 pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-emerald-600 font-extrabold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================
  // AUTHENTICATED PUBLIC PLATFORM
  // ==========================================================
  const vipConfigs = publicSettings?.vipConfig || [];
  const currentVip = vipConfigs[user.vipLevel] || {
    level: 0,
    name: 'FREE',
    price: 0,
    maxDailyEarnings: 5,
    tasksPerDay: 8,
    color: '#64748b',
    badge: '🎯',
  };
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const progressPct =
    maxDailyEarnings > 0 ? Math.min(100, (todayEarnings / maxDailyEarnings) * 100) : 0;

  const filteredTasks = availableTasks
    .filter((t) => taskPlatformFilter === 'all' || t.platform === taskPlatformFilter)
    .filter(
      (t) =>
        !taskSearch ||
        t.action.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.platform.toLowerCase().includes(taskSearch.toLowerCase())
    );

  const filteredRecords = transactions
    .filter((r) => recordFilter === 'all' || r.type === recordFilter)
    .filter(
      (r) =>
        !recordSearch ||
        r.orderId.toLowerCase().includes(recordSearch.toLowerCase()) ||
        (r.note || '').toLowerCase().includes(recordSearch.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* STICKY TOP NAVBAR (3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand + User Balance */}
          <div className="flex items-center gap-3">
            {renderBrandLogo('w-10 h-10', 'text-lg')}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">
                  Hi, {user.name || user.email.split('@')[0]}
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  · {currentVip.badge} {currentVip.name}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-semibold tabular-nums">
                Balance: <strong className="text-emerald-600">€{formatMoney(user.balance)}</strong>
              </div>
            </div>
          </div>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'tasks', label: 'Tasks' },
                { id: 'vip', label: 'VIP Plans' },
                { id: 'records', label: 'Records' },
                { id: 'profile', label: 'Profile' },
              ] as { id: PublicPage; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`py-1 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activePage === item.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Actions (Notifications + Admin Switch) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Admin Panel</span>
            </button>
            <button
              onClick={handleOpenNotifications}
              aria-label="Notifications"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 flex items-center justify-center relative transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        {/* ========================================== */}
        {/* PAGE 1: HOME DASHBOARD */}
        {/* ========================================== */}
        {activePage === 'home' && (
          <div className="space-y-6">
            {/* Announcement Bar */}
            {publicSettings?.announcement && (
              <div className="bg-emerald-50 border border-emerald-200/70 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{publicSettings.announcement}</span>
              </div>
            )}

            {/* Promotional Banner Carousel (3 slides from original index.html) */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl h-48 sm:h-56">
              {bannerSlide === 0 && (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 sm:p-8 flex flex-col justify-center relative">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-100 mb-1">
                    Daily Rewards
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1.5">
                    Earn Money Daily!
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-50 max-w-xs mb-4">
                    Complete simple social media tasks & get paid instantly in EUR
                  </p>
                  <button
                    onClick={() => setActivePage('tasks')}
                    className="w-fit px-4 py-2 rounded-xl bg-white text-emerald-700 font-extrabold text-xs shadow-md hover:scale-105 transition-transform cursor-pointer"
                  >
                    Start Earning →
                  </button>
                </div>
              )}

              {bannerSlide === 1 && (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 p-6 sm:p-8 flex flex-col justify-center relative">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-orange-100 mb-1">
                    VIP Membership
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1.5">
                    Upgrade to VIP Status
                  </h2>
                  <p className="text-xs sm:text-sm text-orange-50 max-w-xs mb-4">
                    Unlock up to 80 daily tasks and earn up to €250 per day with VIP5!
                  </p>
                  <button
                    onClick={() => setActivePage('vip')}
                    className="w-fit px-4 py-2 rounded-xl bg-white text-orange-600 font-extrabold text-xs shadow-md hover:scale-105 transition-transform cursor-pointer"
                  >
                    View VIP Plans →
                  </button>
                </div>
              )}

              {bannerSlide === 2 && (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 sm:p-8 flex flex-col justify-center relative">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-100 mb-1">
                    Referral Bonus
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1.5">
                    Invite Friends & Earn 15%
                  </h2>
                  <p className="text-xs sm:text-sm text-indigo-50 max-w-xs mb-4">
                    Get automatic 15% commission from every task your referrals complete
                  </p>
                  <button
                    onClick={() => setReferralModalOpen(true)}
                    className="w-fit px-4 py-2 rounded-xl bg-white text-indigo-600 font-extrabold text-xs shadow-md hover:scale-105 transition-transform cursor-pointer"
                  >
                    Share Referral Link →
                  </button>
                </div>
              )}

              {/* Carousel Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setBannerSlide(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      bannerSlide === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={openDepositModal}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Deposit</span>
              </button>

              <button
                onClick={() => setActivePage('vip')}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">VIP</span>
              </button>

              <button
                onClick={() => setActivePage('tasks')}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Earn</span>
              </button>

              <button
                onClick={() => setReferralModalOpen(true)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Share2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Invite</span>
              </button>
            </div>

            {/* Daily Progress Card */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-extrabold text-slate-900">Daily Progress</h3>
                <button
                  onClick={() => setActivePage('tasks')}
                  className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  View Tasks →
                </button>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">
                    Today's Earnings
                  </span>
                  <span className="text-lg font-extrabold text-emerald-600 tabular-nums">
                    €{formatMoney(todayEarnings)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">
                    Daily Limit ({currentVip.name})
                  </span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    €{formatMoney(maxDailyEarnings)}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-xs text-slate-500 font-medium">
                  <span>Tasks Completed Today</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {tasksDone} / {tasksPerDay}
                  </span>
                </div>
              </div>
            </section>

            {/* Available Tasks Preview */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-extrabold text-slate-900">Available Tasks</h3>
                <button
                  onClick={() => setActivePage('tasks')}
                  className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  See All ({availableTasks.length}) →
                </button>
              </div>
              <div className="space-y-2.5">
                {availableTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => startTaskExecution(task)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-500 flex items-center gap-3.5 cursor-pointer transition-all"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${getPlatformBadgeClass(
                        task.platform
                      )}`}
                    >
                      {getTaskIcon(task.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{task.action}</h4>
                      <p className="text-xs text-slate-500 capitalize">
                        {task.platform} · {task.duration}s
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-600 tabular-nums">
                        +€{task.reward.toFixed(2)}
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700">Start →</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 2: TASK CENTER */}
        {/* ========================================== */}
        {activePage === 'tasks' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-slate-500">
                  Today's Earnings
                </span>
                <span className="text-lg font-extrabold text-emerald-600 tabular-nums">
                  €{formatMoney(todayEarnings)} / €{formatMoney(maxDailyEarnings)}
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Daily Task Quota</span>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {tasksDone} / {tasksPerDay} completed
                </span>
              </div>
            </div>

            {/* Platform Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: `All (${availableTasks.length})` },
                  { id: 'youtube', label: 'YouTube' },
                  { id: 'tiktok', label: 'TikTok' },
                  { id: 'facebook', label: 'Facebook' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'completed', label: `Done Today (${completedToday.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTaskPlatformFilter(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      taskPlatformFilter === tab.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {taskPlatformFilter === 'completed' ? (
              <div className="space-y-2.5">
                {completedToday.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80">
                    <p className="text-sm font-bold text-slate-700">No tasks completed today yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Select an available task to earn instant EUR rewards!
                    </p>
                  </div>
                ) : (
                  completedToday.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">{c.action}</div>
                        <div className="text-xs text-slate-500 capitalize">
                          {c.platform} · Completed {formatDate(c.completedAt)}
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
                        +€{c.reward.toFixed(2)} ✓
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTasks.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <div className="text-base font-extrabold text-slate-900">
                      All matching tasks completed!
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Check another platform filter or come back tomorrow for fresh tasks.
                    </div>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => startTaskExecution(task)}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-500 flex items-center gap-3.5 cursor-pointer transition-all"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${getPlatformBadgeClass(
                          task.platform
                        )}`}
                      >
                        {getTaskIcon(task.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{task.action}</h4>
                        <p className="text-xs text-slate-500 truncate">
                          <span className="capitalize font-semibold">{task.platform}</span> ·{' '}
                          {task.duration}s · {task.description}
                        </p>
                      </div>
                      <div className="text-sm font-extrabold text-emerald-600 tabular-nums shrink-0">
                        +€{task.reward.toFixed(2)}
                      </div>
                      <button className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-extrabold shrink-0 cursor-pointer">
                        GO
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 3: VIP MEMBERSHIP */}
        {/* ========================================== */}
        {activePage === 'vip' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Upgrade Your VIP Level</h2>
              <p className="text-xs text-slate-500">
                Unlock higher daily earning limits and more daily tasks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vipConfigs.slice(1).map((v) => {
                const isOwned = user.vipLevel >= v.level;
                const isCurrent = user.vipLevel === v.level;
                return (
                  <div
                    key={v.level}
                    style={{ background: v.gradient }}
                    className="rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xl font-black flex items-center gap-2">
                        <span>{v.badge}</span>
                        <span>{v.name}</span>
                        {isCurrent && <span className="text-xs font-extrabold">★ ACTIVE</span>}
                      </div>
                      <div className="text-xs text-white/90 font-semibold">
                        Daily Earning Limit: <strong>€{v.maxDailyEarnings}.00</strong>
                      </div>
                      <div className="text-xs text-white/90 font-semibold">
                        Daily Tasks: <strong>{v.tasksPerDay} tasks / day</strong>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black tabular-nums">
                        €{v.price.toLocaleString()}
                      </div>
                      {isOwned ? (
                        <div className="mt-2 inline-block px-4 py-2 rounded-xl bg-white/25 text-white text-xs font-extrabold">
                          {isCurrent ? 'Current Plan' : '✓ Owned'}
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            promptVipUpgrade(v.level, v.price, v.name, v.maxDailyEarnings)
                          }
                          style={{ color: v.color }}
                          className="mt-2 px-5 py-2.5 rounded-xl bg-white font-extrabold text-xs shadow-md hover:scale-105 transition-transform cursor-pointer"
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VIP Comparison Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">
                VIP Membership Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">Level</th>
                      <th className="py-3 px-3 text-center">Tasks / Day</th>
                      <th className="py-3 px-3 text-right">Daily Limit</th>
                      <th className="py-3 px-3 text-right">Membership Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vipConfigs.map((v) => {
                      const isCurrent = user.vipLevel === v.level;
                      return (
                        <tr
                          key={v.level}
                          className={isCurrent ? 'bg-emerald-50/80 font-bold' : ''}
                        >
                          <td className="py-3 px-3">
                            {v.badge} {v.name} {isCurrent ? '★' : ''}
                          </td>
                          <td className="py-3 px-3 text-center tabular-nums">{v.tasksPerDay}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 tabular-nums">
                            €{v.maxDailyEarnings}.00
                          </td>
                          <td className="py-3 px-3 text-right font-bold tabular-nums">
                            €{v.price.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 4: TRANSACTION RECORDS */}
        {/* ========================================== */}
        {activePage === 'records' && (
          <div className="space-y-5">
            <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  Available Balance
                </div>
                <div className="text-3xl font-black tabular-nums mt-1">
                  €{formatMoney(user.balance)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openDepositModal}
                  className="px-4 py-2.5 rounded-xl bg-white text-emerald-700 font-extrabold text-xs cursor-pointer"
                >
                  + Deposit
                </button>
                <button
                  onClick={() => setWithdrawModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs cursor-pointer"
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {['all', 'deposit', 'withdraw', 'task', 'referral', 'transfer', 'upgrade'].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setRecordFilter(t)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all cursor-pointer ${
                        recordFilter === t
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Search Order ID or note..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredRecords.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 text-slate-400">
                  No {recordFilter === 'all' ? '' : recordFilter} records found
                </div>
              ) : (
                filteredRecords.map((r) => {
                  const isNegative = r.amount < 0 || r.type === 'withdraw';
                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div
                          className={`text-lg font-extrabold tabular-nums ${
                            isNegative ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isNegative ? '-' : '+'}€{formatMoney(Math.abs(r.amount))}
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-0.5">
                          {r.note || r.type} ·{' '}
                          <code className="font-mono text-[11px] text-slate-400">{r.orderId}</code>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-extrabold capitalize ${
                            r.status === 'completed' || r.status === 'approved'
                              ? 'text-emerald-600'
                              : r.status === 'rejected'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {r.status}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                          {formatDate(r.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 5: PROFILE & ACCOUNT */}
        {/* ========================================== */}
        {activePage === 'profile' && (
          <div className="space-y-5">
            {/* Profile Hero */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 sm:p-8 text-white text-center relative overflow-hidden shadow-lg">
              <div className="w-20 h-20 rounded-full bg-white text-emerald-600 font-black text-3xl flex items-center justify-center mx-auto mb-3 shadow-md">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-extrabold">{user.name || user.email.split('@')[0]}</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                {user.email} · ID: #{user.id} · VIP: {currentVip.badge} {currentVip.name}
              </p>
              <div className="mt-4 pt-4 border-t border-white/20 flex justify-center gap-8">
                <div>
                  <div className="text-xs text-emerald-100">Available Balance</div>
                  <div className="text-2xl font-black tabular-nums">
                    €{formatMoney(user.balance)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-emerald-100">Total Earned</div>
                  <div className="text-2xl font-black tabular-nums">
                    €{formatMoney(user.totalEarnings)}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Quick Buttons */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={openDepositModal}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Deposit</span>
              </button>

              <button
                onClick={() => setWithdrawModalOpen(true)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ArrowUpCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Withdraw</span>
              </button>

              <button
                onClick={() => setTransferModalOpen(true)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Transfer</span>
              </button>

              <button
                onClick={() => setReferralModalOpen(true)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-emerald-400 flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Invite</span>
              </button>
            </div>

            {/* Earnings Summary */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-2.5">
              <h3 className="text-sm font-extrabold text-slate-900 mb-2">Earnings Summary</h3>
              <div className="flex justify-between text-xs sm:text-sm py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Today</span>
                <span className="font-extrabold text-emerald-600 tabular-nums">
                  €{formatMoney(user.dailyEarnings)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">This Week</span>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  €{formatMoney(user.weeklyProfit)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">This Month</span>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  €{formatMoney(user.monthlyProfit)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm pt-1">
                <span className="text-slate-500 font-semibold">Total All-Time</span>
                <span className="font-extrabold text-emerald-600 tabular-nums">
                  €{formatMoney(user.totalEarnings)}
                </span>
              </div>
            </div>

            {/* Menu List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
              <button
                onClick={() => setPersonalInfoModalOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Personal Info & Account Settings
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setReferralModalOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Referral Program (15% Commission)
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setChatOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Live Support Chat</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setHelpModalOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Help & FAQ</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={onSwitchToAdmin}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Open Admin Panel</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setLogoutConfirmOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-rose-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-rose-600">Logout</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR (Mobile-first 5-tab pattern) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 py-1.5 px-2 md:hidden">
        {(
          [
            { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
            { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
            { id: 'vip', label: 'VIP', icon: <Gem className="w-5 h-5" /> },
            { id: 'records', label: 'Records', icon: <FileText className="w-5 h-5" /> },
            { id: 'profile', label: 'Profile', icon: <UserIcon className="w-5 h-5" /> },
          ] as { id: PublicPage; label: string; icon: React.ReactNode }[]
        ).map((item) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
                active ? 'text-emerald-600 font-extrabold' : 'text-slate-400 font-semibold'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* FLOATING LIVE SUPPORT CHAT FAB */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          aria-label="Open Support Chat"
          className="fixed bottom-20 md:bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-600/40 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* LIVE SUPPORT CHAT PANEL */}
      {chatOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 w-full sm:w-[380px] h-full sm:h-[560px] bg-white sm:rounded-3xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold">MAFALIKE Support</h4>
                <span className="text-[11px] text-emerald-100">Online · Assistant & Live Admin</span>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center hover:bg-white/25 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
            {chatMessages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white ml-auto rounded-br-xs'
                    : m.sender === 'admin'
                    ? 'bg-indigo-600 text-white rounded-bl-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                }`}
              >
                {m.sender === 'admin' && (
                  <div className="text-[10px] font-extrabold uppercase text-indigo-200 mb-0.5">
                    Live Administrator
                  </div>
                )}
                <div className="whitespace-pre-line">{m.text}</div>
                <div className="text-[10px] opacity-65 mt-1 text-right">
                  {timeAgo(m.createdAt)}
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
            {[
              'How to earn money?',
              'VIP benefits?',
              'How to deposit?',
              'Withdrawal time?',
              'Talk to admin',
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleSendChatMessage(q)}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={sendingChat}
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODALS */}
      {/* ========================================================== */}

      {/* 1. TASK EXECUTION MODAL */}
      {activeTask && (
        <div
          onClick={() => setActiveTask(null)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-3 ${getPlatformBadgeClass(
                  activeTask.platform
                )}`}
              >
                {getTaskIcon(activeTask.icon)}
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">{activeTask.action}</h3>
              <p className="text-xs text-slate-500 mt-1">{activeTask.description}</p>
              <div className="text-xl font-black text-emerald-600 mt-2 tabular-nums">
                +€{activeTask.reward.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-slate-900 capitalize">
                    Open {activeTask.platform}
                  </strong>
                  <div className="text-slate-500">Click the button below to open target link</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-slate-900">{activeTask.action}</strong>
                  <div className="text-slate-500">{activeTask.verify}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-slate-900">Verify & Claim Reward</strong>
                  <div className="text-slate-500">
                    Wait for the verification timer to finish and claim your EUR
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center py-2">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex flex-col items-center justify-center bg-emerald-50/40">
                {taskCountdown > 0 ? (
                  <>
                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                      {taskCountdown}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">seconds</span>
                  </>
                ) : (
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                )}
              </div>
              {taskCountdown > 0 && (
                <button
                  type="button"
                  onClick={() => setTaskCountdown(0)}
                  className="mt-2 text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  I completed the action — Ready to verify now
                </button>
              )}
            </div>

            <div className="space-y-2">
              <a
                href={activeTask.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open{' '}
                {activeTask.platform.charAt(0).toUpperCase() + activeTask.platform.slice(1)}
              </a>

              <button
                onClick={handleClaimTask}
                disabled={taskCountdown > 0 || claimingTask}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled: opacity-50 text-white font-extrabold text-sm cursor-pointer transition-all"
              >
                {claimingTask
                  ? 'Verifying...'
                  : taskCountdown > 0
                  ? `Wait ${taskCountdown}s to Claim`
                  : '✓ Verify & Claim Reward'}
              </button>

              <button
                onClick={() => setActiveTask(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CRYPTO DEPOSIT MODAL */}
      {depositModalOpen && (
        <div
          onClick={() => setDepositModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            {depositStep === 'select' ? (
              <>
                <h3 className="text-lg font-extrabold text-slate-900 text-center">
                  Crypto Deposit
                </h3>
                <p className="text-xs text-slate-500 text-center">
                  Select your preferred cryptocurrency network
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(publicSettings?.cryptoNetworks || {}).map((net) => {
                    const selected = selectedCrypto === net.id;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => setSelectedCrypto(net.id)}
                        className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                          selected
                            ? 'border-emerald-500 bg-emerald-50/70'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-extrabold"
                          style={{ background: net.color }}
                        >
                          {net.name.charAt(0)}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900">{net.name}</div>
                        <div className="text-[11px] text-slate-500">{net.network}</div>
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={!selectedCrypto}
                  onClick={() => setDepositStep('address')}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm cursor-pointer"
                >
                  Continue
                </button>
                <button
                  onClick={() => setDepositModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              (() => {
                const net = selectedCrypto
                  ? publicSettings?.cryptoNetworks?.[selectedCrypto]
                  : null;
                const walletAddr =
                  (selectedCrypto && publicSettings?.wallets?.[selectedCrypto]) ||
                  net?.address ||
                  '';
                if (!net) return null;
                return (
                  <form onSubmit={handleConfirmDeposit} className="space-y-4">
                    <h3 className="text-lg font-extrabold text-slate-900 text-center">
                      Send {net.name} ({net.network})
                    </h3>

                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center space-y-2">
                      <div className="text-[11px] font-extrabold uppercase text-slate-500">
                        Official Receiving Wallet Address
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 break-all">
                        {walletAddr}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(walletAddr, 'Wallet address copied!')}
                        className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Wallet Address
                      </button>
                    </div>

                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                      <div>
                        • Send only <strong>{net.name} ({net.network})</strong>
                      </div>
                      <div>• Minimum deposit: €{net.minDeposit}</div>
                      <div>• Confirmation time: {net.confirmTime}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Amount Sent (EUR €)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={net.minDeposit}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder={`Min €${net.minDeposit}`}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingDeposit}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm cursor-pointer disabled:opacity-50"
                    >
                      {submittingDeposit ? 'Submitting...' : 'Submit Deposit for Approval'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositStep('select')}
                      className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Back
                    </button>
                  </form>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* 3. WITHDRAW MODAL */}
      {withdrawModalOpen && (
        <div
          onClick={() => setWithdrawModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleConfirmWithdraw}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900 text-center">Withdraw Funds</h3>
            <p className="text-xs text-slate-500 text-center">
              Available Balance: <strong className="text-emerald-600">€{formatMoney(user.balance)}</strong> · Minimum: <strong>€10.00</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (€)</label>
              <input
                type="number"
                step="0.01"
                min="10"
                max={user.balance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Min €10.00"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your USDT / Crypto Wallet Address
              </label>
              <input
                type="text"
                value={withdrawWallet}
                onChange={(e) => setWithdrawWallet(e.target.value)}
                placeholder="Enter receiving wallet address"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={submittingWithdraw}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm cursor-pointer disabled:opacity-50"
            >
              {submittingWithdraw ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* 4. TRANSFER MODAL */}
      {transferModalOpen && (
        <div
          onClick={() => setTransferModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleConfirmTransfer}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900 text-center">Transfer Funds</h3>
            <p className="text-xs text-slate-500 text-center">
              Send EUR balance instantly to another MAFALIKE user. Available:{' '}
              <strong className="text-emerald-600">€{formatMoney(user.balance)}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="friend@email.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount (€)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Min €1.00"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submittingTransfer}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm cursor-pointer disabled:opacity-50"
            >
              {submittingTransfer ? 'Transferring...' : 'Transfer Now'}
            </button>
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* 5. NOTIFICATIONS MODAL */}
      {notifModalOpen && (
        <div
          onClick={() => setNotifModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Notifications</h3>
              <button
                onClick={() => setNotifModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="py-3.5 space-y-1">
                    <div className="text-xs font-extrabold text-slate-900">{n.title}</div>
                    <div className="text-xs text-slate-600 leading-relaxed">{n.message}</div>
                    <div className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setNotifModalOpen(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 6. PERSONAL INFO & ACCOUNT SETTINGS MODAL */}
      {personalInfoModalOpen && (
        <div
          onClick={() => setPersonalInfoModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Account Settings</h3>
              <button
                onClick={() => setPersonalInfoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <strong className="text-slate-900">{user.email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">User ID</span>
                <strong className="text-slate-900">#{user.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Referral Code</span>
                <strong className="text-emerald-600 font-mono">{user.referralCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VIP Membership</span>
                <strong className="text-slate-900">
                  {currentVip.badge} {currentVip.name}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Joined</span>
                <strong className="text-slate-900">{formatDateShort(user.joinedAt)}</strong>
              </div>
            </div>

            <form onSubmit={handleUpdateProfileName} className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="space-y-2.5 pt-3 border-t border-slate-100"
            >
              <div className="text-xs font-extrabold text-slate-900">Change Password</div>
              <input
                type="password"
                value={curPwdInput}
                onChange={(e) => setCurPwdInput(e.target.value)}
                placeholder="Current password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm"
              />
              <input
                type="password"
                value={newPwdInput}
                onChange={(e) => setNewPwdInput(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. REFERRAL PROGRAM MODAL */}
      {referralModalOpen && (
        <div
          onClick={() => setReferralModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[88vh] overflow-y-auto shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Referral Program</h3>
              <button
                onClick={() => setReferralModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Share your referral code with friends and earn an automatic{' '}
              <strong className="text-emerald-600">15% commission</strong> on every task they
              complete!
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-center space-y-2 border border-slate-200/80">
              <div className="text-[11px] font-extrabold uppercase text-slate-400">
                Your Referral Code
              </div>
              <div className="font-mono text-2xl font-black text-emerald-600 tracking-wider">
                {user.referralCode}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => copyToClipboard(user.referralCode, 'Referral code copied!')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Copy Code
                </button>
                <button
                  onClick={shareReferralLink}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Copy Invite Link
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                <div className="text-lg font-black text-slate-900 tabular-nums">
                  {referralData?.totalReferred || 0}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">Referred Friends</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                <div className="text-lg font-black text-emerald-600 tabular-nums">
                  €{formatMoney(referralData?.totalCommission || 0)}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">Commission Earned</div>
              </div>
            </div>

            {referralData?.referredUsers?.length > 0 && (
              <div>
                <h4 className="text-xs font-extrabold text-slate-700 mb-2">Your Referrals</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 text-xs max-h-40 overflow-y-auto">
                  {referralData.referredUsers.map((ru: any) => (
                    <div key={ru.id} className="py-2 px-2 flex justify-between">
                      <span className="font-semibold text-slate-800">{ru.email}</span>
                      <span className="text-slate-500">VIP{ru.vipLevel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setReferralModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 8. HELP & FAQ MODAL */}
      {helpModalOpen && (
        <div
          onClick={() => setHelpModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900">Help & FAQ</h3>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div>
                <strong className="text-slate-900 block">💰 How do I earn money?</strong>
                Complete daily social media tasks on YouTube, TikTok, Facebook, and Instagram. Each
                verified task credits €0.25–€0.40 directly to your account.
              </div>
              <div>
                <strong className="text-slate-900 block">👑 What are the VIP Benefits?</strong>
                FREE: €5/day · VIP1: €15/day · VIP2: €25/day · VIP3: €55/day · VIP4: €130/day ·
                VIP5: €250/day.
              </div>
              <div>
                <strong className="text-slate-900 block">💳 How do Deposits & Withdrawals work?</strong>
                Deposits are supported via USDT (TRC20/BEP20), BTC, and ETH. Minimum withdrawal is
                €10.00.
              </div>
              <div>
                <strong className="text-slate-900 block">👥 How does Referral Commission work?</strong>
                You earn a 15% instant bonus from every task completed by users who register with
                your referral code.
              </div>
            </div>
            <button
              onClick={() => {
                setHelpModalOpen(false);
                setChatOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
            >
              Open Live Support Chat
            </button>
            <button
              onClick={() => setHelpModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 9. VIP UPGRADE CONFIRMATION MODAL */}
      {vipConfirmLevel && (
        <div
          onClick={() => setVipConfirmLevel(null)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
          >
            <Crown className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-extrabold text-slate-900">
              Upgrade to {vipConfirmLevel.name}?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Deduct <strong>€{formatMoney(vipConfirmLevel.cost)}</strong> from your balance to
              unlock <strong>€{vipConfirmLevel.maxDaily}.00/day</strong> earnings.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmVipUpgrade}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
              >
                Confirm Upgrade
              </button>
              <button
                onClick={() => setVipConfirmLevel(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. CELEBRATION / SUCCESS MODAL */}
      {celebrationReward && (
        <div
          onClick={() => setCelebrationReward(null)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">{celebrationReward.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600">{celebrationReward.subtitle}</p>
            <button
              onClick={() => setCelebrationReward(null)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* 11. LOGOUT CONFIRM MODAL */}
      {logoutConfirmOpen && (
        <div
          onClick={() => setLogoutConfirmOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900">Sign Out</h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Are you sure you want to sign out of your MAFALIKE account?
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer"
              >
                Sign Out
              </button>
              <button
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
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
