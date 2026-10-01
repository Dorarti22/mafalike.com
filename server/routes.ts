import express, { Request, Response, NextFunction } from 'express';
import { db, logActivity } from './db.ts';
import {
  CRYPTO_NETWORKS,
  VIP_CONFIG,
  generateOrderId,
  generateReferralCode,
  generateSessionToken,
  getBotReply,
  hashPassword,
  todayKey,
  verifyPassword,
} from './constants.ts';

export const apiRouter = express.Router();

interface UserRow {
  [key: string]: any;
  id: number;
  email: string;
  name: string;
  password_hash: string;
  referral_code: string;
  referred_by: number | null;
  balance: number;
  vip_level: number;
  vip_expiry: string | null;
  tasks_done: number;
  tasks_done_date: string;
  total_earnings: number;
  daily_earnings: number;
  daily_earnings_date: string;
  weekly_profit: number;
  monthly_profit: number;
  status: string;
  joined_at: string;
  last_login: string;
}

interface AdminRow {
  [key: string]: any;
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
  last_login: string | null;
}

function sanitizeUser(u: UserRow) {
  const today = todayKey();
  const tasksDone = u.tasks_done_date === today ? u.tasks_done : 0;
  const dailyEarnings = u.daily_earnings_date === today ? u.daily_earnings : 0;
  return {
    id: u.id,
    email: u.email,
    name: u.name || u.email.split('@')[0],
    referralCode: u.referral_code,
    referredBy: u.referred_by,
    balance: Number(u.balance || 0),
    vipLevel: Number(u.vip_level || 0),
    vipExpiry: u.vip_expiry,
    tasksDone: Number(tasksDone || 0),
    tasksDoneDate: today,
    totalEarnings: Number(u.total_earnings || 0),
    dailyEarnings: Number(dailyEarnings || 0),
    dailyEarningsDate: today,
    weeklyProfit: Number(u.weekly_profit || 0),
    monthlyProfit: Number(u.monthly_profit || 0),
    status: u.status || 'active',
    joinedAt: u.joined_at,
    lastLogin: u.last_login,
  };
}

function getTokenFromHeader(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromHeader(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const session = db
    .prepare(`SELECT * FROM sessions WHERE token = ? AND subject_type = 'user'`)
    .get(token) as { subject_id: number; expires_at: string } | undefined;

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    res.status(401).json({ error: 'Session expired or invalid' });
    return;
  }

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(session.subject_id) as
    | UserRow
    | undefined;
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  if (user.status === 'banned') {
    res.status(403).json({ error: 'Your account has been banned.' });
    return;
  }

  const today = todayKey();
  if (user.tasks_done_date !== today || user.daily_earnings_date !== today) {
    db.prepare(
      `UPDATE users SET tasks_done = 0, tasks_done_date = ?, daily_earnings = 0, daily_earnings_date = ? WHERE id = ?`
    ).run(today, today, user.id);
    user.tasks_done = 0;
    user.tasks_done_date = today;
    user.daily_earnings = 0;
    user.daily_earnings_date = today;
  }

  (req as any).user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromHeader(req);
  if (!token) {
    res.status(401).json({ error: 'Admin authentication required' });
    return;
  }
  const session = db
    .prepare(`SELECT * FROM sessions WHERE token = ? AND subject_type = 'admin'`)
    .get(token) as { subject_id: number; expires_at: string } | undefined;

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    res.status(403).json({ error: 'Forbidden: Valid admin session required' });
    return;
  }

  const admin = db.prepare(`SELECT * FROM admins WHERE id = ?`).get(session.subject_id) as
    | AdminRow
    | undefined;
  if (!admin) {
    res.status(403).json({ error: 'Admin account not found' });
    return;
  }

  (req as any).admin = admin;
  next();
}

function getWalletsFromDb(): Record<string, string> {
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key LIKE 'wallet_%'`).all() as {
    key: string;
    value: string;
  }[];
  const map: Record<string, string> = {};
  for (const [k, net] of Object.entries(CRYPTO_NETWORKS)) {
    map[k] = net.address;
  }
  for (const r of rows) {
    const netKey = r.key.replace('wallet_', '');
    if (r.value) map[netKey] = r.value;
  }
  return map;
}

// ============================================
// PUBLIC SETTINGS & CONFIG
// ============================================
apiRouter.get('/settings/public', (_req, res) => {
  const wallets = getWalletsFromDb();
  const announcementRow = db
    .prepare(`SELECT value FROM settings WHERE key = 'platform_announcement'`)
    .get() as { value: string } | undefined;
  const commRow = db
    .prepare(`SELECT value FROM settings WHERE key = 'referral_commission_percent'`)
    .get() as { value: string } | undefined;
  const minWdRow = db
    .prepare(`SELECT value FROM settings WHERE key = 'min_withdrawal_eur'`)
    .get() as { value: string } | undefined;

  res.json({
    vipConfig: VIP_CONFIG,
    cryptoNetworks: CRYPTO_NETWORKS,
    wallets,
    announcement:
      announcementRow?.value ||
      'Complete daily social media tasks & earn instant EUR rewards!',
    referralCommissionPercent: Number(commRow?.value || 15),
    minWithdrawalEur: Number(minWdRow?.value || 10),
  });
});

// ============================================
// USER AUTHENTICATION
// ============================================
apiRouter.post('/auth/register', (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim() || email.split('@')[0];
    const referralCode = String(req.body.referralCode || '').trim().toUpperCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    let referredBy: number | null = null;
    if (referralCode) {
      const refUser = db
        .prepare(`SELECT id FROM users WHERE referral_code = ?`)
        .get(referralCode) as { id: number } | undefined;
      if (refUser) referredBy = refUser.id;
    }

    let myCode = generateReferralCode();
    while (db.prepare(`SELECT id FROM users WHERE referral_code = ?`).get(myCode)) {
      myCode = generateReferralCode();
    }

    const now = new Date().toISOString();
    const today = todayKey();
    const pwdHash = hashPassword(password);

    const result = db
      .prepare(
        `INSERT INTO users (
          email, name, password_hash, referral_code, referred_by,
          balance, vip_level, vip_expiry, tasks_done, tasks_done_date,
          total_earnings, daily_earnings, daily_earnings_date,
          weekly_profit, monthly_profit, status, joined_at, last_login
        ) VALUES (?, ?, ?, ?, ?, 0, 0, NULL, 0, ?, 0, 0, ?, 0, 0, 'active', ?, ?)`
      )
      .run(email, name, pwdHash, myCode, referredBy, today, today, now, now);

    const userId = Number(result.lastInsertRowid);

    // Welcome notification
    db.prepare(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
    ).run(
      userId,
      'Welcome to MAFALIKE! 🎉',
      'Your account is active. Complete your daily social media tasks to start earning EUR!',
      now
    );

    // Initialize support chat with welcome message
    const chatRes = db
      .prepare(`INSERT INTO chats (user_id, status, created_at, updated_at) VALUES (?, 'open', ?, ?)`)
      .run(userId, now, now);
    const chatId = Number(chatRes.lastInsertRowid);
    db.prepare(
      `INSERT INTO messages (chat_id, user_id, sender, text, is_read, created_at) VALUES (?, ?, 'bot', ?, 0, ?)`
    ).run(
      chatId,
      userId,
      "👋 Welcome to MAFALIKE Support!\n\nI'm your AI assistant. How can I help you today?\n\nAsk me about: earning, VIP, deposits, withdrawals, or referrals.",
      now
    );

    if (referredBy) {
      db.prepare(
        `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
      ).run(
        referredBy,
        'New Referral Joined! 👥',
        `User ${email} registered using your referral code (${referralCode}). You will earn 15% commission on their tasks!`,
        now
      );
    }

    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    db.prepare(
      `INSERT INTO sessions (token, subject_id, subject_type, created_at, expires_at) VALUES (?, ?, 'user', ?, ?)`
    ).run(token, userId, now, expires);

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow;
    logActivity('user', userId, email, 'USER_REGISTER', `New user registered${referredBy ? ` (referred by #${referredBy})` : ''}`);

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

apiRouter.post('/auth/login', (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Please fill all fields' });
      return;
    }

    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as
      | UserRow
      | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (user.status === 'banned') {
      res.status(403).json({ error: 'Your account has been banned.' });
      return;
    }

    const now = new Date().toISOString();
    const today = todayKey();
    const tasksDone = user.tasks_done_date === today ? user.tasks_done : 0;
    const dailyEarnings = user.daily_earnings_date === today ? user.daily_earnings : 0;

    db.prepare(
      `UPDATE users SET last_login = ?, tasks_done = ?, tasks_done_date = ?, daily_earnings = ?, daily_earnings_date = ? WHERE id = ?`
    ).run(now, tasksDone, today, dailyEarnings, today, user.id);

    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    db.prepare(
      `INSERT INTO sessions (token, subject_id, subject_type, created_at, expires_at) VALUES (?, ?, 'user', ?, ?)`
    ).run(token, user.id, now, expires);

    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as UserRow;
    logActivity('user', user.id, user.email, 'USER_LOGIN', 'User signed in');

    res.json({ token, user: sanitizeUser(updated) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

apiRouter.post('/auth/logout', (req, res) => {
  const token = getTokenFromHeader(req);
  if (token) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  }
  res.json({ success: true });
});

apiRouter.get('/auth/me', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  res.json({ user: sanitizeUser(user) });
});

// ============================================
// ADMIN AUTHENTICATION
// ============================================
apiRouter.post('/auth/admin/login', (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Fill all fields' });
      return;
    }

    const admin = db.prepare(`SELECT * FROM admins WHERE email = ?`).get(email) as
      | AdminRow
      | undefined;
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      res.status(401).json({ error: 'Invalid admin email or password' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE admins SET last_login = ? WHERE id = ?`).run(now, admin.id);

    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    db.prepare(
      `INSERT INTO sessions (token, subject_id, subject_type, created_at, expires_at) VALUES (?, ?, 'admin', ?, ?)`
    ).run(token, admin.id, now, expires);

    logActivity('admin', admin.id, admin.email, 'ADMIN_LOGIN', `Administrator ${admin.name} signed in`);

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Admin login failed' });
  }
});

apiRouter.post('/auth/admin/logout', (req, res) => {
  const token = getTokenFromHeader(req);
  if (token) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  }
  res.json({ success: true });
});

apiRouter.get('/auth/admin/me', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  res.json({
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
});

// ============================================
// USER PROFILE, WALLET & TRANSACTIONS
// ============================================
apiRouter.put('/users/profile', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const name = String(req.body.name || '').trim();
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, user.id);
  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as UserRow;
  logActivity('user', user.id, user.email, 'UPDATE_PROFILE', `Updated profile name to ${name}`);
  res.json({ user: sanitizeUser(updated) });
});

apiRouter.put('/users/password', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  if (!verifyPassword(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
    hashPassword(newPassword),
    user.id
  );
  logActivity('user', user.id, user.email, 'CHANGE_PASSWORD', 'User changed account password');
  res.json({ success: true });
});

apiRouter.get('/users/transactions', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const rows = db
    .prepare(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`)
    .all(user.id) as any[];
  res.json({
    transactions: rows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      userId: r.user_id,
      type: r.type,
      amount: Number(r.amount),
      status: r.status,
      note: r.note,
      cryptoNetwork: r.crypto_network,
      cryptoName: r.crypto_name,
      walletAddress: r.wallet_address,
      createdAt: r.created_at,
      processedAt: r.processed_at,
    })),
  });
});

apiRouter.post('/users/deposit', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const amount = Number(req.body.amount);
  const networkId = String(req.body.cryptoNetwork || '');
  const net = CRYPTO_NETWORKS[networkId];

  if (!net) {
    res.status(400).json({ error: 'Invalid crypto network selected' });
    return;
  }
  if (!amount || isNaN(amount) || amount < net.minDeposit) {
    res.status(400).json({ error: `Minimum deposit for ${net.label} is €${net.minDeposit}` });
    return;
  }

  const wallets = getWalletsFromDb();
  const walletAddress = wallets[networkId] || net.address;
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO transactions (
      order_id, user_id, type, amount, status, note,
      crypto_network, crypto_name, wallet_address, created_at
    ) VALUES (?, ?, 'deposit', ?, 'pending', ?, ?, ?, ?, ?)`
  ).run(
    orderId,
    user.id,
    amount,
    `Crypto deposit via ${net.name} ${net.network}`,
    networkId,
    net.name,
    walletAddress,
    now
  );

  db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  ).run(
    user.id,
    'Deposit Pending',
    `Your ${net.name} (${net.network}) deposit of €${amount.toFixed(2)} (Order ${orderId}) is awaiting admin approval.`,
    now
  );

  logActivity(
    'user',
    user.id,
    user.email,
    'DEPOSIT_REQUEST',
    `Requested €${amount.toFixed(2)} deposit via ${net.label} (${orderId})`
  );

  res.status(201).json({ orderId, status: 'pending' });
});

apiRouter.post('/users/withdraw', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const amount = Number(req.body.amount);
  const wallet = String(req.body.wallet || '').trim();

  if (!amount || isNaN(amount) || amount < 10) {
    res.status(400).json({ error: 'Minimum withdrawal is €10.00' });
    return;
  }
  if (amount > user.balance) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }
  if (!wallet || wallet.length < 8) {
    res.status(400).json({ error: 'Please enter a valid crypto wallet address' });
    return;
  }

  const newBalance = Number((user.balance - amount).toFixed(2));
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  db.prepare(`UPDATE users SET balance = ? WHERE id = ?`).run(newBalance, user.id);
  db.prepare(
    `INSERT INTO transactions (
      order_id, user_id, type, amount, status, note, wallet_address, created_at
    ) VALUES (?, ?, 'withdraw', ?, 'pending', ?, ?, ?)`
  ).run(orderId, user.id, amount, `Withdraw to: ${wallet}`, wallet, now);

  db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  ).run(
    user.id,
    'Withdrawal Pending',
    `Your withdrawal request of €${amount.toFixed(2)} to ${wallet} is being processed.`,
    now
  );

  logActivity(
    'user',
    user.id,
    user.email,
    'WITHDRAW_REQUEST',
    `Requested €${amount.toFixed(2)} withdrawal to ${wallet} (${orderId})`
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as UserRow;
  res.json({ orderId, user: sanitizeUser(updated) });
});

apiRouter.post('/users/transfer', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const recipientEmail = String(req.body.email || '').trim().toLowerCase();
  const amount = Number(req.body.amount);

  if (!recipientEmail || !amount || isNaN(amount) || amount < 1) {
    res.status(400).json({ error: 'Minimum transfer amount is €1.00' });
    return;
  }
  if (recipientEmail === user.email) {
    res.status(400).json({ error: 'Cannot transfer funds to yourself' });
    return;
  }
  if (amount > user.balance) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }

  const recipient = db.prepare(`SELECT * FROM users WHERE email = ?`).get(recipientEmail) as
    | UserRow
    | undefined;
  if (!recipient) {
    res.status(404).json({ error: 'Recipient user not found' });
    return;
  }

  const now = new Date().toISOString();
  const senderNewBal = Number((user.balance - amount).toFixed(2));
  const recNewBal = Number((recipient.balance + amount).toFixed(2));

  db.prepare(`UPDATE users SET balance = ? WHERE id = ?`).run(senderNewBal, user.id);
  db.prepare(`UPDATE users SET balance = ? WHERE id = ?`).run(recNewBal, recipient.id);

  db.prepare(
    `INSERT INTO transactions (order_id, user_id, type, amount, status, note, created_at, processed_at)
     VALUES (?, ?, 'transfer', ?, 'completed', ?, ?, ?)`
  ).run(generateOrderId(), user.id, -amount, `Transfer to ${recipient.email}`, now, now);

  db.prepare(
    `INSERT INTO transactions (order_id, user_id, type, amount, status, note, created_at, processed_at)
     VALUES (?, ?, 'transfer', ?, 'completed', ?, ?, ?)`
  ).run(generateOrderId(), recipient.id, amount, `Transfer from ${user.email}`, now, now);

  db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  ).run(
    recipient.id,
    'Money Received 💸',
    `You received €${amount.toFixed(2)} from ${user.email}.`,
    now
  );

  logActivity(
    'user',
    user.id,
    user.email,
    'TRANSFER_FUNDS',
    `Transferred €${amount.toFixed(2)} to ${recipient.email}`
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as UserRow;
  res.json({ user: sanitizeUser(updated) });
});

// ============================================
// TASKS & REWARDS
// ============================================
apiRouter.get('/tasks', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const today = todayKey();
  const cfg = VIP_CONFIG[user.vip_level] || VIP_CONFIG[0];

  const allActiveTasks = db
    .prepare(`SELECT * FROM tasks WHERE status = 'active' ORDER BY reward DESC, id ASC`)
    .all() as any[];

  const completedToday = db
    .prepare(`SELECT * FROM task_submissions WHERE user_id = ? AND date_key = ? ORDER BY completed_at DESC`)
    .all(user.id, today) as any[];

  const completedTaskIds = new Set(completedToday.map((s) => Number(s.task_id)));

  const available = allActiveTasks
    .filter((t) => !completedTaskIds.has(Number(t.id)))
    .map((t) => ({
      id: t.id,
      platform: t.platform,
      action: t.action,
      description: t.description,
      icon: t.icon,
      reward: Number(t.reward),
      duration: Number(t.duration),
      url: t.url,
      verify: t.verify_instruction,
    }));

  res.json({
    available,
    completedToday: completedToday.map((c) => ({
      id: c.id,
      taskId: c.task_id,
      platform: c.platform,
      action: c.action,
      reward: Number(c.reward),
      completedAt: c.completed_at,
    })),
    todayEarnings: Number(user.daily_earnings || 0),
    maxDailyEarnings: cfg.maxDailyEarnings,
    tasksDone: Number(user.tasks_done || 0),
    tasksPerDay: cfg.tasksPerDay,
    vipConfig: cfg,
  });
});

apiRouter.post('/tasks/:id/complete', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const taskId = Number(req.params.id);
  const today = todayKey();
  const cfg = VIP_CONFIG[user.vip_level] || VIP_CONFIG[0];

  const task = db
    .prepare(`SELECT * FROM tasks WHERE id = ? AND status = 'active'`)
    .get(taskId) as any;
  if (!task) {
    res.status(404).json({ error: 'Task not found or inactive' });
    return;
  }

  if (user.daily_earnings >= cfg.maxDailyEarnings) {
    res.status(400).json({
      error: `Daily limit of €${cfg.maxDailyEarnings} reached. Upgrade VIP to earn more!`,
    });
    return;
  }

  if (user.tasks_done >= cfg.tasksPerDay) {
    res.status(400).json({
      error: `Daily task limit (${cfg.tasksPerDay} tasks) reached. Upgrade VIP for more daily tasks!`,
    });
    return;
  }

  const already = db
    .prepare(`SELECT id FROM task_submissions WHERE user_id = ? AND task_id = ? AND date_key = ?`)
    .get(user.id, taskId, today);
  if (already) {
    res.status(400).json({ error: 'You already completed this task today' });
    return;
  }

  let reward = Number(task.reward);
  const remaining = Number((cfg.maxDailyEarnings - user.daily_earnings).toFixed(2));
  if (reward > remaining) reward = remaining;

  const now = new Date().toISOString();

  // Credit user
  const newBalance = Number((user.balance + reward).toFixed(2));
  const newDaily = Number((user.daily_earnings + reward).toFixed(2));
  const newTotal = Number((user.total_earnings + reward).toFixed(2));
  const newWeekly = Number((user.weekly_profit + reward).toFixed(2));
  const newMonthly = Number((user.monthly_profit + reward).toFixed(2));
  const newTasksDone = user.tasks_done + 1;

  db.prepare(
    `UPDATE users SET
      balance = ?, tasks_done = ?, tasks_done_date = ?,
      daily_earnings = ?, daily_earnings_date = ?,
      total_earnings = ?, weekly_profit = ?, monthly_profit = ?
     WHERE id = ?`
  ).run(
    newBalance,
    newTasksDone,
    today,
    newDaily,
    today,
    newTotal,
    newWeekly,
    newMonthly,
    user.id
  );

  db.prepare(
    `INSERT INTO task_submissions (user_id, task_id, platform, action, reward, date_key, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(user.id, taskId, task.platform, task.action, reward, today, now);

  db.prepare(
    `INSERT INTO transactions (order_id, user_id, type, amount, status, note, created_at, processed_at)
     VALUES (?, ?, 'task', ?, 'completed', ?, ?, ?)`
  ).run(
    generateOrderId(),
    user.id,
    reward,
    `${task.action} on ${task.platform}`,
    now,
    now
  );

  // Referral 15% commission payout
  let commissionEarned = 0;
  if (user.referred_by) {
    const referrer = db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .get(user.referred_by) as UserRow | undefined;
    if (referrer && referrer.status === 'active') {
      const commission = Number((reward * 0.15).toFixed(2));
      if (commission > 0) {
        const refNewBal = Number((referrer.balance + commission).toFixed(2));
        const refNewTotal = Number((referrer.total_earnings + commission).toFixed(2));
        db.prepare(`UPDATE users SET balance = ?, total_earnings = ? WHERE id = ?`).run(
          refNewBal,
          refNewTotal,
          referrer.id
        );
        db.prepare(
          `INSERT INTO transactions (order_id, user_id, type, amount, status, note, created_at, processed_at)
           VALUES (?, ?, 'referral', ?, 'completed', ?, ?, ?)`
        ).run(
          generateOrderId(),
          referrer.id,
          commission,
          `15% Commission from ${user.email}`,
          now,
          now
        );
        commissionEarned = commission;
      }
    }
  }

  logActivity(
    'user',
    user.id,
    user.email,
    'COMPLETE_TASK',
    `Completed task "${task.action}" (${task.platform}) for +€${reward.toFixed(2)}`
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as UserRow;
  res.json({
    reward,
    commissionEarned,
    user: sanitizeUser(updated),
  });
});

// ============================================
// VIP SYSTEM
// ============================================
apiRouter.post('/vip/upgrade', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const targetLevel = Number(req.body.level);
  const targetCfg = VIP_CONFIG.find((v) => v.level === targetLevel);

  if (!targetCfg || targetLevel <= 0) {
    res.status(400).json({ error: 'Invalid VIP level' });
    return;
  }
  if (user.vip_level >= targetLevel) {
    res.status(400).json({ error: `You already own ${targetCfg.name} or higher` });
    return;
  }

  const currentCfg = VIP_CONFIG[user.vip_level] || VIP_CONFIG[0];
  const cost = Number((targetCfg.price - currentCfg.price).toFixed(2));

  if (user.balance < cost) {
    res.status(400).json({
      error: `Insufficient balance. You need €${(cost - user.balance).toFixed(2)} more to upgrade to ${targetCfg.name}.`,
    });
    return;
  }

  const newBalance = Number((user.balance - cost).toFixed(2));
  const expiry = new Date(Date.now() + 365 * 86400000).toISOString();
  const now = new Date().toISOString();

  db.prepare(`UPDATE users SET balance = ?, vip_level = ?, vip_expiry = ? WHERE id = ?`).run(
    newBalance,
    targetLevel,
    expiry,
    user.id
  );

  db.prepare(
    `INSERT INTO transactions (order_id, user_id, type, amount, status, note, created_at, processed_at)
     VALUES (?, ?, 'upgrade', ?, 'completed', ?, ?, ?)`
  ).run(generateOrderId(), user.id, -cost, `Upgrade to ${targetCfg.name}`, now, now);

  db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  ).run(
    user.id,
    `VIP Upgrade: ${targetCfg.name} 👑`,
    `Welcome to ${targetCfg.name}! Your daily earning limit is now €${targetCfg.maxDailyEarnings} (${targetCfg.tasksPerDay} tasks/day).`,
    now
  );

  logActivity(
    'user',
    user.id,
    user.email,
    'VIP_UPGRADE',
    `Upgraded to ${targetCfg.name} for €${cost.toFixed(2)}`
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as UserRow;
  res.json({ user: sanitizeUser(updated), vipConfig: targetCfg });
});

// ============================================
// REFERRALS
// ============================================
apiRouter.get('/referrals', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const referredUsers = db
    .prepare(
      `SELECT id, email, name, vip_level, tasks_done, total_earnings, joined_at FROM users WHERE referred_by = ? ORDER BY joined_at DESC`
    )
    .all(user.id) as any[];

  const commRows = db
    .prepare(
      `SELECT * FROM transactions WHERE user_id = ? AND type = 'referral' ORDER BY created_at DESC`
    )
    .all(user.id) as any[];

  const totalCommission = commRows.reduce((s, r) => s + Number(r.amount || 0), 0);

  res.json({
    referralCode: user.referral_code,
    commissionRate: 15,
    totalReferred: referredUsers.length,
    totalCommission: Number(totalCommission.toFixed(2)),
    referredUsers: referredUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      vipLevel: u.vip_level,
      tasksDone: u.tasks_done,
      totalEarnings: Number(u.total_earnings || 0),
      joinedAt: u.joined_at,
    })),
    commissions: commRows.slice(0, 30).map((c) => ({
      id: c.id,
      orderId: c.order_id,
      amount: Number(c.amount),
      note: c.note,
      createdAt: c.created_at,
    })),
  });
});

// ============================================
// NOTIFICATIONS
// ============================================
apiRouter.get('/notifications', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const rows = db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
    .all(user.id) as any[];

  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      read: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
  });
});

apiRouter.post('/notifications/read-all', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(user.id);
  res.json({ success: true });
});

// ============================================
// SUPPORT CHAT / MESSAGES
// ============================================
apiRouter.get('/messages', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  let chat = db.prepare(`SELECT * FROM chats WHERE user_id = ?`).get(user.id) as any;
  const now = new Date().toISOString();

  if (!chat) {
    const r = db
      .prepare(`INSERT INTO chats (user_id, status, created_at, updated_at) VALUES (?, 'open', ?, ?)`)
      .run(user.id, now, now);
    const chatId = Number(r.lastInsertRowid);
    db.prepare(
      `INSERT INTO messages (chat_id, user_id, sender, text, is_read, created_at) VALUES (?, ?, 'bot', ?, 0, ?)`
    ).run(
      chatId,
      user.id,
      "👋 Welcome to MAFALIKE Support!\n\nI'm your AI assistant. How can I help you today?\n\nAsk me about: earning, VIP, deposits, withdrawals, or referrals.",
      now
    );
    chat = db.prepare(`SELECT * FROM chats WHERE id = ?`).get(chatId);
  }

  // Mark admin/bot messages as read by user
  db.prepare(
    `UPDATE messages SET is_read = 1 WHERE chat_id = ? AND sender IN ('admin', 'bot')`
  ).run(chat.id);

  const messages = db
    .prepare(`SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC`)
    .all(chat.id) as any[];

  res.json({
    chatId: chat.id,
    messages: messages.map((m) => ({
      id: m.id,
      chatId: m.chat_id,
      userId: m.user_id,
      sender: m.sender,
      text: m.text,
      isRead: Boolean(m.is_read),
      createdAt: m.created_at,
    })),
  });
});

apiRouter.post('/messages', requireUser, (req, res) => {
  const user = (req as any).user as UserRow;
  const text = String(req.body.text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Message cannot be empty' });
    return;
  }

  let chat = db.prepare(`SELECT * FROM chats WHERE user_id = ?`).get(user.id) as any;
  const now = new Date().toISOString();
  if (!chat) {
    const r = db
      .prepare(`INSERT INTO chats (user_id, status, created_at, updated_at) VALUES (?, 'open', ?, ?)`)
      .run(user.id, now, now);
    chat = { id: Number(r.lastInsertRowid) };
  }

  db.prepare(
    `INSERT INTO messages (chat_id, user_id, sender, text, is_read, created_at) VALUES (?, ?, 'user', ?, 0, ?)`
  ).run(chat.id, user.id, text, now);

  db.prepare(`UPDATE chats SET updated_at = ?, status = 'open' WHERE id = ?`).run(now, chat.id);

  const lower = text.toLowerCase();
  const wantsAdmin =
    lower.includes('admin') || lower.includes('human') || lower.includes('agent') || lower.includes('support');

  const replyTime = new Date(Date.now() + 500).toISOString();
  if (wantsAdmin) {
    db.prepare(
      `INSERT INTO messages (chat_id, user_id, sender, text, is_read, created_at) VALUES (?, ?, 'bot', ?, 1, ?)`
    ).run(
      chat.id,
      user.id,
      '👤 An administrator has been notified of your message and will reply here shortly.',
      replyTime
    );
  } else {
    const reply = getBotReply(text);
    db.prepare(
      `INSERT INTO messages (chat_id, user_id, sender, text, is_read, created_at) VALUES (?, ?, 'bot', ?, 1, ?)`
    ).run(chat.id, user.id, reply, replyTime);
  }

  const messages = db
    .prepare(`SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC`)
    .all(chat.id) as any[];

  res.json({
    messages: messages.map((m) => ({
      id: m.id,
      chatId: m.chat_id,
      userId: m.user_id,
      sender: m.sender,
      text: m.text,
      isRead: Boolean(m.is_read),
      createdAt: m.created_at,
    })),
  });
});

// ============================================
// PROTECTED ADMIN ENDPOINTS (/api/admin/*)
// ============================================
apiRouter.get('/admin/stats', requireAdmin, (_req, res) => {
  const users = db.prepare(`SELECT * FROM users ORDER BY id DESC`).all() as UserRow[];
  const txs = db.prepare(`SELECT * FROM transactions ORDER BY created_at DESC`).all() as any[];
  const tasksCount = (db.prepare(`SELECT COUNT(*) as c FROM tasks`).get() as { c: number }).c;
  const unreadChatsCount = (
    db
      .prepare(`SELECT COUNT(DISTINCT chat_id) as c FROM messages WHERE sender = 'user' AND is_read = 0`)
      .get() as { c: number }
  ).c;

  const totalUsers = users.length;
  const vipMembers = users.filter((u) => u.vip_level > 0).length;
  const pendingDeposits = txs.filter((t) => t.type === 'deposit' && t.status === 'pending').length;
  const pendingWithdrawals = txs.filter(
    (t) => t.type === 'withdraw' && t.status === 'pending'
  ).length;
  const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0);
  const approvedDeposits = txs
    .filter((t) => t.type === 'deposit' && t.status === 'approved')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const approvedWithdrawals = txs
    .filter((t) => t.type === 'withdraw' && t.status === 'approved')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const completedTasks = txs.filter((t) => t.type === 'task').length;

  const userMap = new Map(users.map((u) => [u.id, u.email]));

  res.json({
    stats: {
      totalUsers,
      vipMembers,
      pendingDeposits,
      pendingWithdrawals,
      totalBalance: Number(totalBalance.toFixed(2)),
      approvedDeposits: Number(approvedDeposits.toFixed(2)),
      approvedWithdrawals: Number(approvedWithdrawals.toFixed(2)),
      completedTasks,
      totalActiveTasks: tasksCount,
      unreadSupportChats: unreadChatsCount,
    },
    recentTransactions: txs.slice(0, 12).map((t) => ({
      id: t.id,
      orderId: t.order_id,
      userId: t.user_id,
      userEmail: userMap.get(t.user_id) || 'Unknown',
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      note: t.note,
      createdAt: t.created_at,
    })),
  });
});

apiRouter.get('/admin/users', requireAdmin, (_req, res) => {
  const users = db.prepare(`SELECT * FROM users ORDER BY id DESC`).all() as UserRow[];
  res.json({
    users: users.map(sanitizeUser),
  });
});

apiRouter.get('/admin/users/:id', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const txs = db
    .prepare(`SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
    .all(userId) as any[];
  const submissions = db
    .prepare(`SELECT * FROM task_submissions WHERE user_id = ? ORDER BY completed_at DESC LIMIT 30`)
    .all(userId) as any[];
  const referrals = db
    .prepare(`SELECT id, email, vip_level, joined_at FROM users WHERE referred_by = ?`)
    .all(userId) as any[];

  res.json({
    user: sanitizeUser(user),
    transactions: txs.map((t) => ({
      id: t.id,
      orderId: t.order_id,
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      note: t.note,
      createdAt: t.created_at,
    })),
    submissions,
    referrals,
  });
});

apiRouter.post('/admin/users', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const balance = Number(req.body.balance || 0);
  const vipLevel = Number(req.body.vipLevel || 0);
  const referralCodeInput = String(req.body.referralCode || '').trim().toUpperCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  if (db.prepare(`SELECT id FROM users WHERE email = ?`).get(email)) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  let referredBy: number | null = null;
  if (referralCodeInput) {
    const refUser = db
      .prepare(`SELECT id FROM users WHERE referral_code = ?`)
      .get(referralCodeInput) as { id: number } | undefined;
    if (refUser) referredBy = refUser.id;
  }

  const now = new Date().toISOString();
  const today = todayKey();
  const myRefCode = generateReferralCode();
  const vipExpiry =
    vipLevel > 0 ? new Date(Date.now() + 365 * 86400000).toISOString() : null;

  const r = db
    .prepare(
      `INSERT INTO users (
        email, name, password_hash, referral_code, referred_by,
        balance, vip_level, vip_expiry, tasks_done, tasks_done_date,
        total_earnings, daily_earnings, daily_earnings_date,
        weekly_profit, monthly_profit, status, joined_at, last_login
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, 0, 0, 'active', ?, ?)`
    )
    .run(
      email,
      email.split('@')[0],
      hashPassword(password),
      myRefCode,
      referredBy,
      balance,
      vipLevel,
      vipExpiry,
      today,
      today,
      now,
      now
    );

  const newUserId = Number(r.lastInsertRowid);
  if (balance > 0) {
    db.prepare(
      `INSERT INTO transactions (order_id, user_id, type, amount, status, note, created_at, processed_at)
       VALUES (?, ?, 'deposit', ?, 'approved', 'Admin initial balance', ?, ?)`
    ).run(generateOrderId(), newUserId, balance, now, now);
  }

  logActivity(
    'admin',
    admin.id,
    admin.email,
    'CREATE_USER',
    `Created user ${email} (VIP${vipLevel}, Balance €${balance.toFixed(2)})`
  );

  const created = db.prepare(`SELECT * FROM users WHERE id = ?`).get(newUserId) as UserRow;
  res.status(201).json({ user: sanitizeUser(created) });
});

apiRouter.put('/admin/users/:id', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const userId = Number(req.params.id);
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const email = String(req.body.email || user.email).trim().toLowerCase();
  const balance = req.body.balance !== undefined ? Number(req.body.balance) : user.balance;
  const vipLevel = req.body.vipLevel !== undefined ? Number(req.body.vipLevel) : user.vip_level;
  const tasksDone = req.body.tasksDone !== undefined ? Number(req.body.tasksDone) : user.tasks_done;
  const newPassword = String(req.body.password || '');

  if (newPassword && newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  const pwdHash = newPassword ? hashPassword(newPassword) : user.password_hash;
  const vipExpiry =
    vipLevel > 0
      ? user.vip_expiry || new Date(Date.now() + 365 * 86400000).toISOString()
      : null;

  db.prepare(
    `UPDATE users SET email = ?, balance = ?, vip_level = ?, vip_expiry = ?, tasks_done = ?, password_hash = ? WHERE id = ?`
  ).run(email, balance, vipLevel, vipExpiry, tasksDone, pwdHash, userId);

  logActivity(
    'admin',
    admin.id,
    admin.email,
    'EDIT_USER',
    `Updated user #${userId} (${email}) - Balance: €${balance.toFixed(2)}, VIP: ${vipLevel}`
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow;
  res.json({ user: sanitizeUser(updated) });
});

apiRouter.post('/admin/users/:id/balance', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const userId = Number(req.params.id);
  const amount = Number(req.body.amount);
  const note = String(req.body.note || 'Admin balance adjustment').trim();

  if (!amount || isNaN(amount)) {
    res.status(400).json({ error: 'Enter a valid non-zero amount' });
    return;
  }

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newBalance = Number((user.balance + amount).toFixed(2));
  const now = new Date().toISOString();

  db.prepare(`UPDATE users SET balance = ? WHERE id = ?`).run(newBalance, userId);
  db.prepare(
    `INSERT INTO transactions (order_id, user_id, type, amount, status, note, created_at, processed_at)
     VALUES (?, ?, ?, ?, 'approved', ?, ?, ?)`
  ).run(
    generateOrderId(),
    userId,
    amount > 0 ? 'deposit' : 'withdraw',
    Math.abs(amount),
    `${note} (admin)`,
    now,
    now
  );

  db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  ).run(
    userId,
    'Balance Adjusted',
    `Your account balance was adjusted by ${amount > 0 ? '+' : ''}€${amount.toFixed(2)} (${note}).`,
    now
  );

  logActivity(
    'admin',
    admin.id,
    admin.email,
    'ADJUST_BALANCE',
    `Adjusted balance for ${user.email} by €${amount.toFixed(2)} (${note})`
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow;
  res.json({ user: sanitizeUser(updated) });
});

apiRouter.post('/admin/users/:id/ban', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const userId = Number(req.params.id);
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newStatus = user.status === 'banned' ? 'active' : 'banned';
  db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(newStatus, userId);
  if (newStatus === 'banned') {
    db.prepare(`DELETE FROM sessions WHERE subject_type = 'user' AND subject_id = ?`).run(userId);
  }

  logActivity(
    'admin',
    admin.id,
    admin.email,
    newStatus === 'banned' ? 'BAN_USER' : 'UNBAN_USER',
    `${newStatus === 'banned' ? 'Banned' : 'Unbanned'} user ${user.email}`
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow;
  res.json({ user: sanitizeUser(updated) });
});

// ============================================
// ADMIN TRANSACTIONS (DEPOSITS & WITHDRAWALS)
// ============================================
apiRouter.get('/admin/transactions', requireAdmin, (_req, res) => {
  const users = db.prepare(`SELECT id, email FROM users`).all() as { id: number; email: string }[];
  const userMap = new Map(users.map((u) => [u.id, u.email]));
  const rows = db.prepare(`SELECT * FROM transactions ORDER BY created_at DESC`).all() as any[];

  res.json({
    transactions: rows.map((t) => ({
      id: t.id,
      orderId: t.order_id,
      userId: t.user_id,
      userEmail: userMap.get(t.user_id) || 'Unknown',
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      note: t.note,
      cryptoNetwork: t.crypto_network,
      cryptoName: t.crypto_name,
      walletAddress: t.wallet_address,
      createdAt: t.created_at,
      processedAt: t.processed_at,
    })),
  });
});

apiRouter.post('/admin/transactions/:id/approve', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const txId = Number(req.params.id);
  const tx = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(txId) as any;

  if (!tx || tx.status !== 'pending') {
    res.status(400).json({ error: 'Transaction not found or already processed' });
    return;
  }

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(tx.user_id) as
    | UserRow
    | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const now = new Date().toISOString();
  if (tx.type === 'deposit') {
    const newBal = Number((user.balance + Number(tx.amount)).toFixed(2));
    db.prepare(`UPDATE users SET balance = ? WHERE id = ?`).run(newBal, user.id);
    db.prepare(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
    ).run(
      user.id,
      'Deposit Approved ✓',
      `Your deposit of €${Number(tx.amount).toFixed(2)} (${tx.order_id}) has been verified and credited to your balance!`,
      now
    );
  } else if (tx.type === 'withdraw') {
    db.prepare(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
    ).run(
      user.id,
      'Withdrawal Approved ✓',
      `Your withdrawal of €${Number(tx.amount).toFixed(2)} (${tx.order_id}) has been approved and sent to your wallet.`,
      now
    );
  }

  db.prepare(`UPDATE transactions SET status = 'approved', processed_at = ? WHERE id = ?`).run(
    now,
    txId
  );

  logActivity(
    'admin',
    admin.id,
    admin.email,
    `APPROVE_${String(tx.type).toUpperCase()}`,
    `Approved ${tx.type} ${tx.order_id} (€${Number(tx.amount).toFixed(2)}) for ${user.email}`
  );

  res.json({ success: true });
});

apiRouter.post('/admin/transactions/:id/reject', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const txId = Number(req.params.id);
  const tx = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(txId) as any;

  if (!tx || tx.status !== 'pending') {
    res.status(400).json({ error: 'Transaction not found or already processed' });
    return;
  }

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(tx.user_id) as
    | UserRow
    | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const now = new Date().toISOString();
  if (tx.type === 'withdraw') {
    // Refund user balance on rejected withdrawal
    const refundedBal = Number((user.balance + Number(tx.amount)).toFixed(2));
    db.prepare(`UPDATE users SET balance = ? WHERE id = ?`).run(refundedBal, user.id);
  }

  db.prepare(`UPDATE transactions SET status = 'rejected', processed_at = ? WHERE id = ?`).run(
    now,
    txId
  );

  const label = tx.type === 'withdraw' ? 'Withdrawal' : 'Deposit';
  db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  ).run(
    user.id,
    `${label} Rejected`,
    `Your ${tx.type} request of €${Number(tx.amount).toFixed(2)} (${tx.order_id}) was rejected.${tx.type === 'withdraw' ? ' Funds have been refunded to your balance.' : ''}`,
    now
  );

  logActivity(
    'admin',
    admin.id,
    admin.email,
    `REJECT_${String(tx.type).toUpperCase()}`,
    `Rejected ${tx.type} ${tx.order_id} (€${Number(tx.amount).toFixed(2)}) for ${user.email}`
  );

  res.json({ success: true });
});

// ============================================
// ADMIN TASKS CRUD
// ============================================
apiRouter.get('/admin/tasks', requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT * FROM tasks ORDER BY id DESC`).all() as any[];
  const subCounts = db
    .prepare(`SELECT task_id, COUNT(*) as c FROM task_submissions GROUP BY task_id`)
    .all() as { task_id: number; c: number }[];
  const countMap = new Map(subCounts.map((s) => [s.task_id, s.c]));

  res.json({
    tasks: rows.map((t) => ({
      id: t.id,
      platform: t.platform,
      action: t.action,
      description: t.description,
      icon: t.icon,
      reward: Number(t.reward),
      duration: Number(t.duration),
      url: t.url,
      verify: t.verify_instruction,
      status: t.status,
      completionsCount: countMap.get(t.id) || 0,
      createdAt: t.created_at,
    })),
  });
});

apiRouter.post('/admin/tasks', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const platform = String(req.body.platform || 'youtube').toLowerCase();
  const action = String(req.body.action || '').trim();
  const description = String(req.body.description || '').trim();
  const reward = Number(req.body.reward || 0.3);
  const duration = Number(req.body.duration || 15);
  const url = String(req.body.url || 'https://www.youtube.com').trim();
  const verify = String(req.body.verify || 'Complete action and confirm').trim();
  const status = req.body.status === 'inactive' ? 'inactive' : 'active';

  if (!action || !description || reward <= 0) {
    res.status(400).json({ error: 'Action title, description, and valid reward are required' });
    return;
  }

  const now = new Date().toISOString();
  const r = db
    .prepare(
      `INSERT INTO tasks (platform, action, description, icon, reward, duration, url, verify_instruction, status, created_at, updated_at)
       VALUES (?, ?, ?, 'play-circle', ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(platform, action, description, reward, duration, url, verify, status, now, now);

  logActivity(
    'admin',
    admin.id,
    admin.email,
    'CREATE_TASK',
    `Created ${platform} task "${action}" (€${reward.toFixed(2)})`
  );

  const created = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(Number(r.lastInsertRowid)) as any;
  res.status(201).json({
    task: {
      id: created.id,
      platform: created.platform,
      action: created.action,
      description: created.description,
      reward: Number(created.reward),
      duration: Number(created.duration),
      url: created.url,
      verify: created.verify_instruction,
      status: created.status,
    },
  });
});

apiRouter.put('/admin/tasks/:id', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const taskId = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as any;
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const platform = String(req.body.platform || existing.platform).toLowerCase();
  const action = String(req.body.action || existing.action).trim();
  const description = String(req.body.description || existing.description).trim();
  const reward = req.body.reward !== undefined ? Number(req.body.reward) : Number(existing.reward);
  const duration =
    req.body.duration !== undefined ? Number(req.body.duration) : Number(existing.duration);
  const url = String(req.body.url || existing.url).trim();
  const verify = String(req.body.verify || existing.verify_instruction).trim();
  const status = req.body.status || existing.status;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE tasks SET platform = ?, action = ?, description = ?, reward = ?, duration = ?, url = ?, verify_instruction = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(platform, action, description, reward, duration, url, verify, status, now, taskId);

  logActivity(
    'admin',
    admin.id,
    admin.email,
    'UPDATE_TASK',
    `Updated task #${taskId} "${action}" (${status})`
  );

  res.json({ success: true });
});

apiRouter.delete('/admin/tasks/:id', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const taskId = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as any;
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(taskId);
  logActivity('admin', admin.id, admin.email, 'DELETE_TASK', `Deleted task #${taskId} "${existing.action}"`);
  res.json({ success: true });
});

// ============================================
// ADMIN SUPPORT CHATS & NOTIFICATIONS
// ============================================
apiRouter.get('/admin/chats', requireAdmin, (_req, res) => {
  const chats = db.prepare(`SELECT * FROM chats ORDER BY updated_at DESC`).all() as any[];
  const users = db.prepare(`SELECT id, email, name, vip_level FROM users`).all() as any[];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const result = chats.map((c) => {
    const u = userMap.get(c.user_id);
    const msgs = db
      .prepare(`SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC`)
      .all(c.id) as any[];
    const unreadCount = msgs.filter((m) => m.sender === 'user' && !m.is_read).length;
    const lastMsg = msgs[msgs.length - 1] || null;
    return {
      id: c.id,
      userId: c.user_id,
      userEmail: u?.email || 'Unknown',
      userName: u?.name || 'User',
      vipLevel: u?.vip_level || 0,
      status: c.status,
      unreadCount,
      lastMessage: lastMsg
        ? { text: lastMsg.text, sender: lastMsg.sender, createdAt: lastMsg.created_at }
        : null,
      messages: msgs.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.created_at,
      })),
    };
  });

  res.json({ chats: result });
});

apiRouter.post('/admin/chats/:chatId/reply', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const chatId = Number(req.params.chatId);
  const text = String(req.body.text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Reply text is required' });
    return;
  }

  const chat = db.prepare(`SELECT * FROM chats WHERE id = ?`).get(chatId) as any;
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO messages (chat_id, user_id, sender, text, is_read, created_at) VALUES (?, ?, 'admin', ?, 0, ?)`
  ).run(chatId, chat.user_id, text, now);

  db.prepare(`UPDATE messages SET is_read = 1 WHERE chat_id = ? AND sender = 'user'`).run(chatId);
  db.prepare(`UPDATE chats SET updated_at = ? WHERE id = ?`).run(now, chatId);

  db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  ).run(chat.user_id, 'New Support Reply 💬', text, now);

  logActivity('admin', admin.id, admin.email, 'SUPPORT_REPLY', `Replied to support chat #${chatId}`);
  res.json({ success: true });
});

apiRouter.post('/admin/notifications', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const targetUserId = req.body.userId ? Number(req.body.userId) : null;
  const title = String(req.body.title || '').trim();
  const message = String(req.body.message || '').trim();

  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required' });
    return;
  }

  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES (?, ?, ?, 0, ?)`
  );

  if (targetUserId) {
    insert.run(targetUserId, title, message, now);
    logActivity('admin', admin.id, admin.email, 'SEND_NOTIFICATION', `Sent notification "${title}" to user #${targetUserId}`);
  } else {
    const allUsers = db.prepare(`SELECT id FROM users`).all() as { id: number }[];
    for (const u of allUsers) {
      insert.run(u.id, title, message, now);
    }
    logActivity('admin', admin.id, admin.email, 'BROADCAST_NOTIFICATION', `Broadcasted "${title}" to ${allUsers.length} users`);
  }

  res.json({ success: true });
});

// ============================================
// ADMIN WALLETS, SETTINGS & ACTIVITY LOGS
// ============================================
apiRouter.put('/admin/settings/wallets', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const networkId = String(req.body.networkId || '');
  const address = String(req.body.address || '').trim();

  if (!CRYPTO_NETWORKS[networkId] || !address) {
    res.status(400).json({ error: 'Valid network and wallet address required' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(`wallet_${networkId}`, address, now);

  logActivity(
    'admin',
    admin.id,
    admin.email,
    'UPDATE_WALLET',
    `Updated ${networkId} wallet address to ${address}`
  );

  res.json({ wallets: getWalletsFromDb() });
});

apiRouter.put('/admin/settings/general', requireAdmin, (req, res) => {
  const admin = (req as any).admin as AdminRow;
  const announcement = String(req.body.announcement || '').trim();
  const now = new Date().toISOString();

  if (announcement) {
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES ('platform_announcement', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(announcement, now);
  }

  logActivity('admin', admin.id, admin.email, 'UPDATE_SETTINGS', 'Updated platform announcement & settings');
  res.json({ success: true });
});

apiRouter.get('/admin/logs', requireAdmin, (_req, res) => {
  const logs = db
    .prepare(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 150`)
    .all() as any[];
  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      actorType: l.actor_type,
      actorId: l.actor_id,
      actorEmail: l.actor_email,
      action: l.action,
      details: l.details,
      createdAt: l.created_at,
    })),
  });
});
