import crypto from 'node:crypto';

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

export const VIP_CONFIG: VipTierConfig[] = [
  {
    level: 0,
    name: 'FREE',
    price: 0,
    maxDailyEarnings: 5,
    tasksPerDay: 8,
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    badge: '🎯',
  },
  {
    level: 1,
    name: 'VIP1',
    price: 100,
    maxDailyEarnings: 15,
    tasksPerDay: 15,
    color: '#d4a574',
    gradient: 'linear-gradient(135deg, #d4a574 0%, #e8c4a0 100%)',
    badge: '⭐',
  },
  {
    level: 2,
    name: 'VIP2',
    price: 500,
    maxDailyEarnings: 25,
    tasksPerDay: 25,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    badge: '💎',
  },
  {
    level: 3,
    name: 'VIP3',
    price: 1000,
    maxDailyEarnings: 55,
    tasksPerDay: 40,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    badge: '👑',
  },
  {
    level: 4,
    name: 'VIP4',
    price: 2000,
    maxDailyEarnings: 130,
    tasksPerDay: 60,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    badge: '🏆',
  },
  {
    level: 5,
    name: 'VIP5',
    price: 3000,
    maxDailyEarnings: 250,
    tasksPerDay: 80,
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    badge: '💠',
  },
];

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

export const CRYPTO_NETWORKS: Record<string, CryptoNetworkConfig> = {
  USDT_TRC20: {
    id: 'USDT_TRC20',
    name: 'USDT',
    network: 'TRC20',
    label: 'USDT (TRC20)',
    color: '#26a17b',
    address: 'TX9mK8vQpL2wR5nJ7bV4cX1zY6hG3fD8sA',
    minDeposit: 10,
    confirmTime: '1-3 min',
  },
  USDT_BEP20: {
    id: 'USDT_BEP20',
    name: 'USDT',
    network: 'BEP20',
    label: 'USDT (BEP20)',
    color: '#f0b90b',
    address: '0x71C95911E9a5D330f4D621842EC243EE1343292e',
    minDeposit: 10,
    confirmTime: '2-5 min',
  },
  BTC: {
    id: 'BTC',
    name: 'BTC',
    network: 'Bitcoin',
    label: 'Bitcoin',
    color: '#f7931a',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    minDeposit: 20,
    confirmTime: '10-30 min',
  },
  ETH: {
    id: 'ETH',
    name: 'ETH',
    network: 'ERC20',
    label: 'Ethereum',
    color: '#627eea',
    address: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
    minDeposit: 20,
    confirmTime: '5-15 min',
  },
};

export interface SeedTask {
  platform: 'youtube' | 'tiktok' | 'facebook' | 'instagram';
  action: string;
  description: string;
  icon: string;
  reward: number;
  duration: number;
  url: string;
  verify: string;
}

export const INITIAL_TASKS: SeedTask[] = [
  // YouTube
  { platform: 'youtube', action: 'Subscribe to Channel', description: 'Watch 30s then subscribe to official partner channel', icon: 'youtube', reward: 0.30, duration: 15, url: 'https://www.youtube.com/@MrBeast', verify: 'Click subscribe and confirm' },
  { platform: 'youtube', action: 'Watch Full Video', description: 'Watch featured partner video for 30 seconds', icon: 'play-circle', reward: 0.40, duration: 15, url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', verify: 'Watch video until timer ends' },
  { platform: 'youtube', action: 'Like & Comment', description: 'Like video and leave a constructive comment', icon: 'thumbs-up', reward: 0.35, duration: 12, url: 'https://www.youtube.com/watch?v=9bZkp7q19f0', verify: 'Like video, leave comment' },
  { platform: 'youtube', action: 'Watch YouTube Short', description: 'Watch 15s short video completely', icon: 'smartphone', reward: 0.25, duration: 10, url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', verify: 'Watch short fully' },
  { platform: 'youtube', action: 'Share Video', description: 'Share creator video on social media', icon: 'share-2', reward: 0.30, duration: 10, url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', verify: 'Share and confirm' },
  // TikTok
  { platform: 'tiktok', action: 'Follow Account', description: 'Follow official TikTok creator account', icon: 'user-plus', reward: 0.30, duration: 10, url: 'https://www.tiktok.com/@tiktok', verify: 'Click follow button' },
  { platform: 'tiktok', action: 'Watch Full Video', description: 'Watch trending TikTok video to end', icon: 'play-circle', reward: 0.35, duration: 12, url: 'https://www.tiktok.com/@tiktok', verify: 'Watch until end' },
  { platform: 'tiktok', action: 'Like TikTok Video', description: 'Like latest viral TikTok post', icon: 'heart', reward: 0.25, duration: 10, url: 'https://www.tiktok.com/@tiktok', verify: 'Tap like button' },
  { platform: 'tiktok', action: 'Share TikTok', description: 'Share TikTok video link with friends', icon: 'share-2', reward: 0.30, duration: 10, url: 'https://www.tiktok.com/@tiktok', verify: 'Share and confirm' },
  { platform: 'tiktok', action: 'Comment on Video', description: 'Leave positive comment on creator post', icon: 'message-circle', reward: 0.35, duration: 12, url: 'https://www.tiktok.com/@tiktok', verify: 'Type and post comment' },
  // Facebook
  { platform: 'facebook', action: 'Like Facebook Page', description: 'Like official partner Facebook page', icon: 'thumbs-up', reward: 0.30, duration: 10, url: 'https://www.facebook.com/facebook', verify: 'Click like button' },
  { platform: 'facebook', action: 'Share Facebook Post', description: 'Share featured post on timeline', icon: 'share-2', reward: 0.35, duration: 12, url: 'https://www.facebook.com/facebook', verify: 'Share with friends' },
  { platform: 'facebook', action: 'Watch Facebook Video', description: 'Watch full Facebook Watch video 30s', icon: 'play-circle', reward: 0.40, duration: 15, url: 'https://www.facebook.com/watch', verify: 'Watch video fully' },
  { platform: 'facebook', action: 'Follow Profile', description: 'Follow verified Facebook creator profile', icon: 'user-plus', reward: 0.25, duration: 10, url: 'https://www.facebook.com/facebook', verify: 'Click follow' },
  { platform: 'facebook', action: 'Comment on Post', description: 'Comment on latest community post', icon: 'message-circle', reward: 0.35, duration: 12, url: 'https://www.facebook.com/facebook', verify: 'Post comment' },
  // Instagram
  { platform: 'instagram', action: 'Follow Instagram', description: 'Follow verified Instagram partner account', icon: 'user-plus', reward: 0.30, duration: 10, url: 'https://www.instagram.com/instagram', verify: 'Click follow' },
  { platform: 'instagram', action: 'Like Instagram Post', description: 'Like latest Instagram photo post', icon: 'heart', reward: 0.25, duration: 10, url: 'https://www.instagram.com/instagram', verify: 'Double tap to like' },
  { platform: 'instagram', action: 'Watch Reel', description: 'Watch full Instagram Reel 20s', icon: 'play-circle', reward: 0.35, duration: 12, url: 'https://www.instagram.com/reels', verify: 'Watch until end' },
  { platform: 'instagram', action: 'Share Instagram Post', description: 'Share featured post to story or friends', icon: 'share-2', reward: 0.30, duration: 10, url: 'https://www.instagram.com/instagram', verify: 'Share to story' },
  { platform: 'instagram', action: 'Comment on Instagram', description: 'Leave a comment on featured post', icon: 'message-circle', reward: 0.35, duration: 12, url: 'https://www.instagram.com/instagram', verify: 'Post comment' },
];

export const BOT_RESPONSES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ['earn', 'money', 'fitim', 'task', 'how to'],
    reply:
      '💰 You can earn by completing daily social media tasks!\n\n• Watch YouTube videos\n• Follow TikTok accounts\n• Like Facebook posts\n• Comment on Instagram\n\nEach task pays €0.25–€0.40 directly to your balance.',
  },
  {
    keywords: ['vip', 'upgrade', 'level', 'plan'],
    reply:
      '👑 VIP Membership Levels:\n\n🎯 FREE: €5/day (8 tasks)\n⭐ VIP1 (€100): €15/day (15 tasks)\n💎 VIP2 (€500): €25/day (25 tasks)\n👑 VIP3 (€1000): €55/day (40 tasks)\n🏆 VIP4 (€2000): €130/day (60 tasks)\n💠 VIP5 (€3000): €250/day (80 tasks)',
  },
  {
    keywords: ['deposit', 'depozit', 'crypto', 'usdt', 'btc', 'eth'],
    reply:
      '💳 How to Deposit:\n1. Click "Deposit" on your Home or Profile tab\n2. Select network (USDT TRC20, USDT BEP20, BTC, or ETH)\n3. Copy the wallet address and send funds\n4. Enter the EUR amount and click Submit\n5. Admin verifies and approves your deposit shortly (Min: €10).',
  },
  {
    keywords: ['withdraw', 'tërheq', 'payout', 'cashout'],
    reply:
      '💸 Withdrawals:\n• Minimum withdrawal: €10.00\n• Processed within 24 hours by Admin\n• Sent directly to your crypto wallet\n• 0% platform withdrawal fee!',
  },
  {
    keywords: ['referral', 'invite', 'commission', 'friend'],
    reply:
      '👥 Referral Program:\n• Share your unique MAF referral code or link\n• Earn 15% instant commission on every task your referrals complete\n• Unlimited referrals!',
  },
  {
    keywords: ['hello', 'hi', 'hey', 'pershendetje'],
    reply: '👋 Welcome to MAFALIKE Support!\n\nHow can we help you today? Ask about tasks, VIP plans, deposits, withdrawals, or type "admin" to message an administrator.',
  },
  {
    keywords: ['thank', 'faleminderit', 'thanks'],
    reply: "🙏 You're very welcome! Let us know if you need anything else.",
  },
];

export function getBotReply(message: string): string {
  const msg = message.toLowerCase();
  for (const resp of BOT_RESPONSES) {
    for (const kw of resp.keywords) {
      if (msg.includes(kw)) return resp.reply;
    }
  }
  return '🤖 Thanks for reaching out! Type "admin" to alert a live administrator, or ask about:\n• How to earn money\n• VIP membership levels\n• Crypto deposits\n• Withdrawals & referrals';
}

const LEGACY_SALT = 'MAFALIKE_SALT_2024';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, key] = parts;
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
  }
  // Support legacy SHA-256 hash from original MAFALIKE app.js
  const legacyHash = crypto
    .createHash('sha256')
    .update(password + LEGACY_SALT)
    .digest('hex');
  return storedHash === legacyHash || storedHash === password;
}

export function generateReferralCode(): string {
  return 'MAF' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

export function generateOrderId(): string {
  return (
    'ORD' +
    Date.now().toString(36).toUpperCase() +
    crypto.randomBytes(2).toString('hex').toUpperCase()
  );
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function todayKey(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}
