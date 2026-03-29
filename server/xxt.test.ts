import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUserStatus: vi.fn(),
  getWalletByUserId: vi.fn().mockResolvedValue({ id: 1, userId: 1, usdtBalance: "1000.00", createdAt: new Date(), updatedAt: new Date() }),
  adjustWalletBalance: vi.fn(),
  setWalletBalance: vi.fn(),
  getHoldingsByUserId: vi.fn().mockResolvedValue([]),
  upsertHolding: vi.fn(),
  createTransaction: vi.fn(),
  getTransactionsByUserId: vi.fn().mockResolvedValue([]),
  getAllTransactions: vi.fn().mockResolvedValue([]),
  createDeposit: vi.fn(),
  getDepositsByUserId: vi.fn().mockResolvedValue([]),
  getAllDeposits: vi.fn().mockResolvedValue([]),
  updateDepositStatus: vi.fn(),
  createNotification: vi.fn(),
  getAdminNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    } as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return makeCtx({ role: "admin" });
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeCtx();
    const clearedCookies: string[] = [];
    (ctx.res as any).clearCookie = (name: string) => clearedCookies.push(name);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

describe("auth.me", () => {
  it("returns current user when authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.id).toBe(1);
    expect(user?.role).toBe("user");
  });
});

describe("market.getPrices", () => {
  it("returns an array of coin prices (fallback or live)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const prices = await caller.market.getPrices();
    expect(Array.isArray(prices)).toBe(true);
    expect(prices.length).toBeGreaterThan(0);
    const btc = prices.find(p => p.id === "bitcoin");
    expect(btc).toBeDefined();
    expect(btc?.current_price).toBeGreaterThan(0);
  });
});

describe("wallet.getMyWallet", () => {
  it("returns wallet and holdings for authenticated user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wallet.getMyWallet();
    expect(result.wallet).toBeDefined();
    expect(result.holdings).toBeDefined();
    expect(Array.isArray(result.holdings)).toBe(true);
  });
});

describe("wallet.getMyTransactions", () => {
  it("returns transactions list", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const txs = await caller.wallet.getMyTransactions({ limit: 10 });
    expect(Array.isArray(txs)).toBe(true);
  });
});

describe("admin.getMembers", () => {
  it("returns members list for admin", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const members = await caller.admin.getMembers();
    expect(Array.isArray(members)).toBe(true);
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const ctx = makeCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getMembers()).rejects.toThrow();
  });
});

describe("admin.getNotifications", () => {
  it("returns notifications for admin", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const notifs = await caller.admin.getNotifications();
    expect(Array.isArray(notifs)).toBe(true);
  });
});

describe("admin.getUnreadCount", () => {
  it("returns unread notification count", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const count = await caller.admin.getUnreadCount();
    expect(typeof count).toBe("number");
  });
});
