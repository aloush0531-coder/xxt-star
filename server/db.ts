import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  deposits,
  holdings,
  notifications,
  transactions,
  users,
  wallets,
  type Deposit,
  type Holding,
  type InsertUser,
  type Notification,
  type Transaction,
  type Wallet,
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
