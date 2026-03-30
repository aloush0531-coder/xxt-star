import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  deposits,
  holdings,
  invitations,
  miningRewards,
  notifications,
  transactions,
  users,
  wallets,
  withdrawals,
  type Deposit,
  type Holding,
  type InsertUser,
  type Invitation,
  type MiningReward,
  type Notification,
  type Transaction,
  type Wallet,
  type Withdrawal,
} from "../drizzle/schema";

import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });

  // Ensure wallet exists for new user, and send new member notification
  const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
  if (existing.length > 0) {
    const u = existing[0];
    const w = await db.select().from(wallets).where(eq(wallets.userId, u.id)).limit(1);
    if (w.length === 0) {
      await db.insert(wallets).values({ userId: u.id, usdtBalance: "0" });
      // Notify admin of new member
      try {
        await createNotification({
          type: "new_member",
          title: "عضو جديد انضم للمنصة",
          message: `${u.name ?? u.email ?? u.openId} انضم إلى المنصة`,
        });
      } catch { /* non-critical */ }
    }
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserStatus(userId: number, status: "active" | "banned") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ status }).where(eq(users.id, userId));
}

// ─── Wallets ─────────────────────────────────────────────────────────────────

export async function getWalletByUserId(userId: number): Promise<Wallet | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (result.length === 0) {
    await db.insert(wallets).values({ userId, usdtBalance: "0" });
    const created = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    return created[0];
  }
  return result[0];
}

export async function adjustWalletBalance(userId: number, delta: number) {
  const db = await getDb();
  if (!db) return;
  await getWalletByUserId(userId);
  await db.update(wallets)
    .set({ usdtBalance: sql`usdtBalance + ${delta}` })
    .where(eq(wallets.userId, userId));
}

export async function setWalletBalance(userId: number, balance: number) {
  const db = await getDb();
  if (!db) return;
  await getWalletByUserId(userId);
  await db.update(wallets).set({ usdtBalance: String(balance) }).where(eq(wallets.userId, userId));
}

// ─── Holdings ────────────────────────────────────────────────────────────────

export async function getHoldingsByUserId(userId: number): Promise<Holding[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(holdings).where(eq(holdings.userId, userId));
}

export async function upsertHolding(
  userId: number,
  coinSymbol: string,
  coinName: string,
  amountDelta: number,
  newAvgPrice?: number
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(holdings)
    .where(and(eq(holdings.userId, userId), eq(holdings.coinSymbol, coinSymbol)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(holdings).values({
      userId,
      coinSymbol,
      coinName,
      amount: String(amountDelta),
      avgBuyPrice: String(newAvgPrice ?? 0),
    });
  } else {
    const current = existing[0];
    const currentAmount = parseFloat(current.amount);
    const newAmount = currentAmount + amountDelta;
    if (newAmount <= 0) {
      await db.delete(holdings).where(and(eq(holdings.userId, userId), eq(holdings.coinSymbol, coinSymbol)));
    } else {
      const updates: Record<string, unknown> = { amount: String(newAmount) };
      if (newAvgPrice !== undefined && amountDelta > 0) {
        const newAvg = (currentAmount * parseFloat(current.avgBuyPrice) + amountDelta * newAvgPrice) / newAmount;
        updates.avgBuyPrice = String(newAvg);
      }
      await db.update(holdings).set(updates).where(and(eq(holdings.userId, userId), eq(holdings.coinSymbol, coinSymbol)));
    }
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: {
  userId: number;
  type: "buy" | "sell" | "deposit" | "withdraw" | "admin_credit" | "admin_debit";
  coinSymbol?: string;
  coinName?: string;
  amount: number;
  price?: number;
  total: number;
  status?: "pending" | "completed" | "failed" | "cancelled";
  note?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(transactions).values({
    userId: data.userId,
    type: data.type,
    coinSymbol: data.coinSymbol,
    coinName: data.coinName,
    amount: String(data.amount),
    price: data.price !== undefined ? String(data.price) : undefined,
    total: String(data.total),
    status: data.status ?? "completed",
    note: data.note,
  });
}

export async function getTransactionsByUserId(userId: number, limit = 50): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function getAllTransactions(limit = 100): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(limit);
}

// ─── Deposits ────────────────────────────────────────────────────────────────

export async function createDeposit(data: {
  userId: number;
  network: "TRC20" | "ERC20";
  txHash?: string;
  amount: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(deposits).values({
    userId: data.userId,
    network: data.network,
    txHash: data.txHash,
    amount: String(data.amount),
    status: "pending",
  });
}

export async function getDepositsByUserId(userId: number): Promise<Deposit[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deposits).where(eq(deposits.userId, userId)).orderBy(desc(deposits.createdAt));
}

export async function getAllDeposits(): Promise<Deposit[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deposits).orderBy(desc(deposits.createdAt));
}

export async function updateDepositStatus(
  depositId: number,
  status: "approved" | "rejected",
  adminNote?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(deposits).set({ status, adminNote }).where(eq(deposits.id, depositId));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId?: number;
  type: "new_member" | "large_trade" | "deposit_request" | "system";
  title: string;
  message: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
  });
}

export async function getAdminNotifications(limit = 50): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(eq(notifications.isRead, false));
  return Number(result[0]?.count ?? 0);
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function createInvitation(code: string, createdBy: number): Promise<Invitation | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(invitations).values({ code, createdBy });
  const inv = await db.select().from(invitations).where(eq(invitations.code, code)).limit(1);
  return inv.length > 0 ? inv[0] : null;
}

export async function validateInvitationCode(code: string): Promise<Invitation | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(invitations).where(eq(invitations.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function useInvitationCode(code: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const inv = await validateInvitationCode(code);
  if (!inv || inv.isUsed) return false;
  await db.update(invitations).set({ isUsed: true, usedBy: userId, usedAt: new Date() }).where(eq(invitations.code, code));
  return true;
}

export async function getInvitationsByAdmin(adminId: number): Promise<Invitation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invitations).where(eq(invitations.createdBy, adminId)).orderBy(desc(invitations.createdAt));
}

// ─── Withdrawals ─────────────────────────────────────────────────────────────

export async function createWithdrawal(data: {
  userId: number;
  network: "TRC20" | "ERC20";
  address: string;
  amount: string;
}): Promise<Withdrawal | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(withdrawals).values({
    userId: data.userId,
    network: data.network,
    address: data.address,
    amount: data.amount,
  });
  const w = await db.select().from(withdrawals).where(and(eq(withdrawals.userId, data.userId), eq(withdrawals.address, data.address))).orderBy(desc(withdrawals.createdAt)).limit(1);
  return w.length > 0 ? w[0] : null;
}

export async function getWithdrawalsByUserId(userId: number): Promise<Withdrawal[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
}

export async function getAllWithdrawals(limit = 100): Promise<Withdrawal[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt)).limit(limit);
}

export async function updateWithdrawalStatus(withdrawalId: number, status: "pending" | "approved" | "rejected" | "completed", txHash?: string, adminNote?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updates: any = { status };
  if (txHash) updates.txHash = txHash;
  if (adminNote) updates.adminNote = adminNote;
  await db.update(withdrawals).set(updates).where(eq(withdrawals.id, withdrawalId));
}


// ─── Mining Rewards ──────────────────────────────────────────────────────────
export async function getTodayMiningReward(userId: number): Promise<MiningReward | null> {
  const db = await getDb();
  if (!db) return null;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const result = await db.select().from(miningRewards).where(and(eq(miningRewards.userId, userId), eq(miningRewards.date, today))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTodayMiningReward(userId: number): Promise<MiningReward | null> {
  const db = await getDb();
  if (!db) return null;
  const today = new Date().toISOString().split('T')[0];
  const existing = await getTodayMiningReward(userId);
  if (existing) return existing;
  
  await db.insert(miningRewards).values({
    userId,
    date: today,
    amount: "80",
    claimed: false,
  });
  return getTodayMiningReward(userId);
}

export async function claimMiningReward(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const reward = await getTodayMiningReward(userId);
  if (!reward || reward.claimed) return false;
  
  const amount = parseFloat(reward.amount);
  await adjustWalletBalance(userId, amount);
  await db.update(miningRewards).set({ claimed: true, claimedAt: new Date() }).where(eq(miningRewards.id, reward.id));
  await createTransaction({
    userId,
    type: "admin_credit",
    amount,
    total: amount,
    note: "مكافأة التعدين اليومي",
  });
  return true;
}

export async function getMiningProgress(userId: number): Promise<{ progress: number; claimed: boolean; nextClaimTime: string }> {
  const reward = await getTodayMiningReward(userId);
  if (!reward) {
    await createTodayMiningReward(userId);
    return { progress: 0, claimed: false, nextClaimTime: getNextClaimTime() };
  }
  
  const now = new Date();
  const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const targetTime = new Date(turkeyTime);
  targetTime.setHours(22, 0, 0, 0); // 10:00 PM
  
  if (turkeyTime.getHours() >= 22) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  const startTime = new Date(turkeyTime);
  startTime.setHours(0, 0, 0, 0);
  
  const totalMs = targetTime.getTime() - startTime.getTime();
  const elapsedMs = turkeyTime.getTime() - startTime.getTime();
  const progress = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  
  return {
    progress,
    claimed: reward.claimed,
    nextClaimTime: targetTime.toISOString(),
  };
}

function getNextClaimTime(): string {
  const now = new Date();
  const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const targetTime = new Date(turkeyTime);
  targetTime.setHours(22, 0, 0, 0);
  
  if (turkeyTime.getHours() >= 22) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  return targetTime.toISOString();
}
