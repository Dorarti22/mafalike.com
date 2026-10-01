import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  CRYPTO_NETWORKS,
  INITIAL_TASKS,
  generateOrderId,
  generateReferralCode,
  hashPassword,
  todayKey,
} from './constants.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'mafalike.db');
export const db = new DatabaseSync(DB_PATH);

export function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      referral_code TEXT NOT NULL UNIQUE,
      referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      balance REAL NOT NULL DEFAULT 0,
      vip_level INTEGER NOT NULL DEFAULT 0,
      vip_expiry TEXT,
      tasks_done INTEGER NOT NULL DEFAULT 0,
      tasks_done_date TEXT NOT NULL,
      total_earnings REAL NOT NULL DEFAULT 0,
      daily_earnings REAL NOT NULL DEFAULT 0,
      daily_earnings_date TEXT NOT NULL,
      weekly_profit REAL NOT NULL DEFAULT 0,
      monthly_profit REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      joined_at TEXT NOT NULL,
      last_login TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super_admin',
      created_at TEXT NOT NULL,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      subject_id INTEGER NOT NULL,
      subject_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_subject ON sessions(subject_type, subject_id);

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'play-circle',
      reward REAL NOT NULL,
      duration INTEGER NOT NULL DEFAULT 15,
      url TEXT NOT NULL,
      verify_instruction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_platform ON tasks(platform);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

    CREATE TABLE IF NOT EXISTS task_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      action TEXT NOT NULL,
      reward REAL NOT NULL,
      date_key TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user_date ON task_submissions(user_id, date_key);
    CREATE INDEX IF NOT EXISTS idx_submissions_user_task_date ON task_submissions(user_id, task_id, date_key);

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT NOT NULL DEFAULT '',
      crypto_network TEXT,
      crypto_name TEXT,
      wallet_address TEXT,
      created_at TEXT NOT NULL,
      processed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tx_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_type TEXT NOT NULL,
      actor_id INTEGER,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at DESC);
  `);

  seedInitialData();
}

export function logActivity(
  actorType: 'user' | 'admin' | 'system',
  actorId: number | null,
  actorEmail: string,
  action: string,
  details: string
) {
  try {
    db.prepare(
      `INSERT INTO activity_logs (actor_type, actor_id, actor_email, action, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(actorType, actorId, actorEmail, action, details, new Date().toISOString());
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

function seedInitialData() {
  const now = new Date().toISOString();
  const today = todayKey();

  // 1. Seed default Admins (both from app.js and admin.html so both work seamlessly)
  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }).c;
  if (adminCount === 0) {
    const insertAdmin = db.prepare(
      `INSERT INTO admins (email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?)`
    );
    insertAdmin.run('admin@mafalike.com', hashPassword('admin123'), 'Super Admin', 'super_admin', now);
    insertAdmin.run('admin@dorart.com', hashPassword('admin1234'), 'Dorart Admin', 'super_admin', now);
    logActivity('system', null, 'system@mafalike.com', 'SEED_ADMINS', 'Initialized default administrator accounts');
  }

  // 2. Seed Tasks from TASK_TEMPLATES
  const taskCount = (db.prepare('SELECT COUNT(*) as c FROM tasks').get() as { c: number }).c;
  if (taskCount === 0) {
    const insertTask = db.prepare(
      `INSERT INTO tasks (platform, action, description, icon, reward, duration, url, verify_instruction, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    );
    for (const t of INITIAL_TASKS) {
      insertTask.run(
        t.platform,
        t.action,
        t.description,
        t.icon,
        t.reward,
        t.duration,
        t.url,
        t.verify,
        now,
        now
      );
    }
    logActivity('system', null, 'system@mafalike.com', 'SEED_TASKS', `Seeded ${INITIAL_TASKS.length} official social media tasks`);
  }

  // 3. Seed Default Settings & Crypto Wallets
  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`
  );
  for (const [key, net] of Object.entries(CRYPTO_NETWORKS)) {
    insertSetting.run(`wallet_${key}`, net.address, now);
  }
  insertSetting.run('referral_commission_percent', '15', now);
  insertSetting.run('min_withdrawal_eur', '10', now);
  insertSetting.run(
    'platform_announcement',
    'Complete daily social media tasks and earn instant EUR rewards! Invite friends for a 15% lifetime task commission.',
    now
  );
  insertSetting.run('support_email', 'support@mafalike.com', now);

  // 4. Seed Initial Realistic Users & Transactions if empty
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (
        email, name, password_hash, referral_code, referred_by,
        balance, vip_level, vip_expiry, tasks_done, tasks_done_date,
        total_earnings, daily_earnings, daily_earnings_date,
        weekly_profit, monthly_profit, status, joined_at, last_login
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `);

    const vipExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const u1 = insertUser.run(
      'alex@mafalike.com',
      'Alex Mercer',
      hashPassword('user123'),
      'MAF7X9K2L',
      null,
      148.65,
      2, // VIP2
      vipExpiry,
      3,
      today,
      348.65,
      1.05,
      today,
      42.50,
      198.40,
      new Date(Date.now() - 14 * 86400000).toISOString(),
      now
    );
    const alexId = Number(u1.lastInsertRowid);

    const u2 = insertUser.run(
      'elena@mafalike.com',
      'Elena Rostova',
      hashPassword('user123'),
      'MAF3P8M4Q',
      alexId,
      64.30,
      1, // VIP1
      vipExpiry,
      2,
      today,
      114.30,
      0.70,
      today,
      21.10,
      84.30,
      new Date(Date.now() - 7 * 86400000).toISOString(),
      now
    );
    const elenaId = Number(u2.lastInsertRowid);

    const u3 = insertUser.run(
      'marco@mafalike.com',
      'Marco Rossi',
      hashPassword('user123'),
      generateReferralCode(),
      alexId,
      24.50,
      0, // FREE
      null,
      1,
      today,
      24.50,
      0.35,
      today,
      9.80,
      24.50,
      new Date(Date.now() - 3 * 86400000).toISOString(),
      now
    );
    const marcoId = Number(u3.lastInsertRowid);

    // Seed transactions
    const insertTx = db.prepare(`
      INSERT INTO transactions (
        order_id, user_id, type, amount, status, note,
        crypto_network, crypto_name, wallet_address, created_at, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTx.run(
      generateOrderId(),
      alexId,
      'deposit',
      500.0,
      'approved',
      'Crypto deposit via USDT TRC20',
      'USDT_TRC20',
      'USDT',
      CRYPTO_NETWORKS.USDT_TRC20.address,
      new Date(Date.now() - 10 * 86400000).toISOString(),
      new Date(Date.now() - 10 * 86400000 + 300000).toISOString()
    );

    insertTx.run(
      generateOrderId(),
      alexId,
      'upgrade',
      -500.0,
      'completed',
      'Upgrade to VIP2',
      null,
      null,
      null,
      new Date(Date.now() - 10 * 86400000 + 600000).toISOString(),
      new Date(Date.now() - 10 * 86400000 + 600000).toISOString()
    );

    insertTx.run(
      generateOrderId(),
      alexId,
      'task',
      0.40,
      'completed',
      'Watch Full Video on youtube',
      null,
      null,
      null,
      new Date(Date.now() - 3600000).toISOString(),
      new Date(Date.now() - 3600000).toISOString()
    );

    insertTx.run(
      generateOrderId(),
      alexId,
      'referral',
      0.11,
      'completed',
      'Commission from elena@mafalike.com',
      null,
      null,
      null,
      new Date(Date.now() - 1800000).toISOString(),
      new Date(Date.now() - 1800000).toISOString()
    );

    // Pending deposit & pending withdrawal for Admin to review
    insertTx.run(
      generateOrderId(),
      elenaId,
      'deposit',
      150.0,
      'pending',
      'Crypto deposit via USDT TRC20',
      'USDT_TRC20',
      'USDT',
      CRYPTO_NETWORKS.USDT_TRC20.address,
      new Date(Date.now() - 900000).toISOString(),
      null
    );

    insertTx.run(
      generateOrderId(),
      marcoId,
      'withdraw',
      15.0,
      'pending',
      'Withdraw to: TX8kLm92PqW3vN7xR1cZ5bY4hG8fD2sA99',
      'USDT_TRC20',
      'USDT',
      'TX8kLm92PqW3vN7xR1cZ5bY4hG8fD2sA99',
      new Date(Date.now() - 600000).toISOString(),
      null
    );

    // Seed Notifications
    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_id, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertNotif.run(
      alexId,
      'VIP2 Membership Active',
      'Welcome to VIP2! You can now complete up to 25 tasks per day and earn up to €25.00 daily.',
      0,
      new Date(Date.now() - 86400000).toISOString()
    );
    insertNotif.run(
      alexId,
      'Referral Commission Earned',
      'You earned €0.11 commission from elena@mafalike.com completing daily tasks.',
      0,
      new Date(Date.now() - 1800000).toISOString()
    );
    insertNotif.run(
      elenaId,
      'Deposit Pending',
      'Your USDT deposit of €150.00 is awaiting administrator verification.',
      0,
      new Date(Date.now() - 900000).toISOString()
    );

    // Seed Support Chat
    const chatRes = db
      .prepare(`INSERT INTO chats (user_id, status, created_at, updated_at) VALUES (?, 'open', ?, ?)`)
      .run(alexId, now, now);
    const chatId = Number(chatRes.lastInsertRowid);
    const insertMsg = db.prepare(`
      INSERT INTO messages (chat_id, user_id, sender, text, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertMsg.run(
      chatId,
      alexId,
      'bot',
      "👋 Welcome to MAFALIKE Support!\n\nI'm your AI assistant. How can I help you today?\n\nAsk me about: earning, VIP, deposits, withdrawals, or referrals.",
      1,
      new Date(Date.now() - 7200000).toISOString()
    );
    insertMsg.run(
      chatId,
      alexId,
      'user',
      'Hi! How fast are VIP3 upgrades processed?',
      1,
      new Date(Date.now() - 3600000).toISOString()
    );
    insertMsg.run(
      chatId,
      alexId,
      'admin',
      'Hello Alex! VIP upgrades are instant as soon as your account balance covers the tier difference. Let us know if you need help with a deposit!',
      0,
      new Date(Date.now() - 3500000).toISOString()
    );

    logActivity('system', null, 'system@mafalike.com', 'SEED_USERS', 'Seeded initial MAFALIKE user accounts and transactions');
  }
}
