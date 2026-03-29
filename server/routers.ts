import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  adjustWalletBalance,
  createDeposit,
  createNotification,
  createTransaction,
  getAllDeposits,
  getAllTransactions,
  getAllUsers,
  getAdminNotifications,
  getDepositsByUserId,
  getHoldingsByUserId,
  getTransactionsByUserId,
  getUnreadNotificationCount,
  getWalletByUserId,
  markNotificationRead,
  updateDepositStatus,
  updateUserStatus,
  upsertHolding,
  getDb,
  createInvitation,
  validateInvitationCode,
  useInvitationCode,
  getInvitationsByAdmin,
  createWithdrawal,
  getWithdrawalsByUserId,
  getAllWithdrawals,
  updateWithdrawalStatus,
} from "./db";
import { eq } from "drizzle-orm";
import { deposits, users, wallets, withdrawals } from "../drizzle/schema";

// Admin middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// ─── Market Router ────────────────────────────────────────────────────────────
const marketRouter = router({
  getPrices: publicProcedure.query(async () => {
    try {
      const ids = "bitcoin,ethereum,tether,binancecoin,ripple,solana,cardano,dogecoin,tron,polkadot,litecoin,chainlink,uniswap,avalanche-2,stellar";
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=15&page=1&sparkline=false&price_change_percentage=24h`
      );
      if (!res.ok) throw new Error("CoinGecko API error");
      const data = await res.json();
      return data as Array<{
        id: string; symbol: string; name: string; image: string;
        current_price: number; market_cap: number; price_change_percentage_24h: number;
        total_volume: number; high_24h: number; low_24h: number;
      }>;
    } catch {
      // Fallback static data if API fails
      return [
        { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", current_price: 67000, market_cap: 1300000000000, price_change_percentage_24h: 2.5, total_volume: 28000000000, high_24h: 68000, low_24h: 65000 },
        { id: "ethereum", symbol: "eth", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", current_price: 3500, market_cap: 420000000000, price_change_percentage_24h: 1.8, total_volume: 15000000000, high_24h: 3600, low_24h: 3400 },
        { id: "tether", symbol: "usdt", name: "Tether", image: "https://assets.coingecko.com/coins/images/325/large/Tether.png", current_price: 1, market_cap: 110000000000, price_change_percentage_24h: 0.01, total_volume: 50000000000, high_24h: 1.001, low_24h: 0.999 },
        { id: "binancecoin", symbol: "bnb", name: "BNB", image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", current_price: 580, market_cap: 85000000000, price_change_percentage_24h: -0.5, total_volume: 2000000000, high_24h: 590, low_24h: 570 },
        { id: "ripple", symbol: "xrp", name: "XRP", image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", current_price: 0.55, market_cap: 30000000000, price_change_percentage_24h: 3.2, total_volume: 1500000000, high_24h: 0.57, low_24h: 0.52 },
        { id: "solana", symbol: "sol", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", current_price: 180, market_cap: 78000000000, price_change_percentage_24h: -1.2, total_volume: 3000000000, high_24h: 185, low_24h: 175 },
        { id: "cardano", symbol: "ada", name: "Cardano", image: "https://assets.coingecko.com/coins/images/975/large/cardano.png", current_price: 0.45, market_cap: 16000000000, price_change_percentage_24h: 0.8, total_volume: 400000000, high_24h: 0.46, low_24h: 0.44 },
        { id: "dogecoin", symbol: "doge", name: "Dogecoin", image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", current_price: 0.12, market_cap: 17000000000, price_change_percentage_24h: 5.1, total_volume: 800000000, high_24h: 0.13, low_24h: 0.11 },
        { id: "tron", symbol: "trx", name: "TRON", image: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png", current_price: 0.12, market_cap: 10000000000, price_change_percentage_24h: 1.1, total_volume: 500000000, high_24h: 0.122, low_24h: 0.118 },
        { id: "polkadot", symbol: "dot", name: "Polkadot", image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png", current_price: 7.5, market_cap: 10000000000, price_change_percentage_24h: -2.1, total_volume: 300000000, high_24h: 7.8, low_24h: 7.2 },
      ];
    }
  }),
});

// ─── Wallet Router ────────────────────────────────────────────────────────────
const walletRouter = router({
  getMyWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await getWalletByUserId(ctx.user.id);
    const holdingsList = await getHoldingsByUserId(ctx.user.id);
    return { wallet, holdings: holdingsList };
  }),

  getMyTransactions: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getTransactionsByUserId(ctx.user.id, input.limit ?? 50);
    }),

  getMyDeposits: protectedProcedure.query(async ({ ctx }) => {
    return getDepositsByUserId(ctx.user.id);
  }),

  submitDeposit: protectedProcedure
    .input(z.object({
      network: z.enum(["TRC20", "ERC20"]),
      txHash: z.string().min(1),
      amount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createDeposit({
        userId: ctx.user.id,
        network: input.network,
        txHash: input.txHash,
        amount: input.amount,
      });
      await createNotification({
        type: "deposit_request",
        title: "طلب إيداع جديد",
        message: `المستخدم ${ctx.user.name ?? ctx.user.email} طلب إيداع ${input.amount} USDT عبر ${input.network}`,
      });
      await notifyOwner({
        title: "طلب إيداع جديد",
        content: `المستخدم ${ctx.user.name ?? ctx.user.email} طلب إيداع ${input.amount} USDT عبر ${input.network}\nHash: ${input.txHash}`,
      });
      return { success: true };
    }),
});

// ─── Trading Router ───────────────────────────────────────────────────────────
const tradingRouter = router({
  executeTrade: protectedProcedure
    .input(z.object({
      type: z.enum(["buy", "sell"]),
      coinSymbol: z.string(),
      coinName: z.string(),
      amount: z.number().positive(),
      price: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is banned
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const userRecord = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (userRecord[0]?.status === "banned") {
        throw new TRPCError({ code: "FORBIDDEN", message: "حسابك محظور. تواصل مع الدعم." });
      }

      const total = input.amount * input.price;
      const wallet = await getWalletByUserId(ctx.user.id);
      if (!wallet) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const balance = parseFloat(wallet.usdtBalance);

      if (input.type === "buy") {
        if (balance < total) throw new TRPCError({ code: "BAD_REQUEST", message: "رصيد غير كافٍ" });
        await adjustWalletBalance(ctx.user.id, -total);
        await upsertHolding(ctx.user.id, input.coinSymbol.toUpperCase(), input.coinName, input.amount, input.price);
      } else {
        const holdingsList = await getHoldingsByUserId(ctx.user.id);
        const holding = holdingsList.find(h => h.coinSymbol === input.coinSymbol.toUpperCase());
        if (!holding || parseFloat(holding.amount) < input.amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "كمية غير كافية للبيع" });
        }
        await adjustWalletBalance(ctx.user.id, total);
        await upsertHolding(ctx.user.id, input.coinSymbol.toUpperCase(), input.coinName, -input.amount);
      }

      await createTransaction({
        userId: ctx.user.id,
        type: input.type,
        coinSymbol: input.coinSymbol.toUpperCase(),
        coinName: input.coinName,
        amount: input.amount,
        price: input.price,
        total,
      });

      // Notify admin for large trades (> $10,000)
      if (total > 10000) {
        await createNotification({
          type: "large_trade",
          title: "صفقة كبيرة",
          message: `${ctx.user.name} نفّذ صفقة ${input.type === "buy" ? "شراء" : "بيع"} بقيمة $${total.toFixed(2)} على ${input.coinName}`,
        });
        await notifyOwner({
          title: "صفقة كبيرة على المنصة",
          content: `${ctx.user.name} نفّذ ${input.type === "buy" ? "شراء" : "بيع"} ${input.amount} ${input.coinSymbol} بسعر $${input.price} (إجمالي: $${total.toFixed(2)})`,
        });
      }

      return { success: true };
    }),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────
const adminRouter = router({
  getMembers: adminProcedure.query(async () => {
    const allUsers = await getAllUsers();
    const db = await getDb();
    if (!db) return allUsers.map(u => ({ ...u, balance: "0" }));
    const walletList = await db.select().from(wallets);
    return allUsers.map(u => {
      const w = walletList.find(w => w.userId === u.id);
      return { ...u, balance: w?.usdtBalance ?? "0" };
    });
  }),

  setMemberStatus: adminProcedure
    .input(z.object({ userId: z.number(), status: z.enum(["active", "banned"]) }))
    .mutation(async ({ input }) => {
      await updateUserStatus(input.userId, input.status);
      return { success: true };
    }),

  adjustBalance: adminProcedure
    .input(z.object({
      userId: z.number(),
      amount: z.number(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const type = input.amount >= 0 ? "admin_credit" : "admin_debit";
      await adjustWalletBalance(input.userId, input.amount);
      await createTransaction({
        userId: input.userId,
        type,
        amount: Math.abs(input.amount),
        total: Math.abs(input.amount),
        note: input.note ?? (input.amount >= 0 ? "إضافة رصيد من المسؤول" : "خصم رصيد من المسؤول"),
      });
      return { success: true };
    }),

  getAllTransactions: adminProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getAllTransactions(input.limit ?? 100);
    }),

  getAllDeposits: adminProcedure.query(async () => {
    const allDeposits = await getAllDeposits();
    const db = await getDb();
    if (!db) return allDeposits;
    const allUsers = await db.select().from(users);
    return allDeposits.map(d => {
      const u = allUsers.find(u => u.id === d.userId);
      return { ...d, userName: u?.name ?? u?.email ?? "مجهول" };
    });
  }),

  approveDeposit: adminProcedure
    .input(z.object({ depositId: z.number(), adminNote: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const dep = await db.select().from(deposits).where(eq(deposits.id, input.depositId)).limit(1);
      if (!dep[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (dep[0].status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "الطلب ليس في حالة انتظار" });
      await updateDepositStatus(input.depositId, "approved", input.adminNote);
      await adjustWalletBalance(dep[0].userId, parseFloat(dep[0].amount));
      await createTransaction({
        userId: dep[0].userId,
        type: "deposit",
        amount: parseFloat(dep[0].amount),
        total: parseFloat(dep[0].amount),
        note: `إيداع معتمد عبر ${dep[0].network}`,
      });
      return { success: true };
    }),

  rejectDeposit: adminProcedure
    .input(z.object({ depositId: z.number(), adminNote: z.string().optional() }))
    .mutation(async ({ input }) => {
      await updateDepositStatus(input.depositId, "rejected", input.adminNote);
      return { success: true };
    }),

  getNotifications: adminProcedure.query(async () => {
    return getAdminNotifications(50);
  }),

  markNotificationRead: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { success: true };
    }),

  getUnreadCount: adminProcedure.query(async () => {
    return getUnreadNotificationCount();
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
// ─── Invitations Router ──────────────────────────────────────────────────────
const invitationsRouter = router({
  create: adminProcedure.input(z.object({ code: z.string().min(4).max(32) })).mutation(async ({ input, ctx }) => {
    const inv = await createInvitation(input.code, ctx.user.id);
    if (!inv) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return inv;
  }),
  validate: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    const inv = await validateInvitationCode(input.code);
    return { valid: inv !== null && !inv.isUsed };
  }),
  myInvitations: adminProcedure.query(async ({ ctx }) => {
    return getInvitationsByAdmin(ctx.user.id);
  }),
});

// ─── Withdrawals Router ──────────────────────────────────────────────────────
const withdrawalsRouter = router({
  create: protectedProcedure
    .input(z.object({ network: z.enum(["TRC20", "ERC20"]), address: z.string(), amount: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const wallet = await getWalletByUserId(ctx.user.id);
      if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet not found" });
      const balance = parseFloat(wallet.usdtBalance);
      const amount = parseFloat(input.amount);
      if (amount <= 0 || amount > balance) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid withdrawal amount" });
      const w = await createWithdrawal({ userId: ctx.user.id, network: input.network, address: input.address, amount: input.amount });
      if (!w) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await createNotification({ type: "system", title: "طلب سحب جديد", message: `طلب سحب بقيمة $${amount} ${input.network}` });
      return w;
    }),
  myWithdrawals: protectedProcedure.query(async ({ ctx }) => {
    return getWithdrawalsByUserId(ctx.user.id);
  }),
  allWithdrawals: adminProcedure.query(async () => {
    return getAllWithdrawals();
  }),
  approve: adminProcedure
    .input(z.object({ withdrawalId: z.number(), txHash: z.string().optional(), adminNote: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const w = await db.select().from(withdrawals).where(eq(withdrawals.id, input.withdrawalId)).limit(1);
      if (!w[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await updateWithdrawalStatus(input.withdrawalId, "approved", input.txHash, input.adminNote);
      return { success: true };
    }),
  reject: adminProcedure
    .input(z.object({ withdrawalId: z.number(), adminNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const w = await db.select().from(withdrawals).where(eq(withdrawals.id, input.withdrawalId)).limit(1);
      if (!w[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await updateWithdrawalStatus(input.withdrawalId, "rejected", undefined, input.adminNote);
      await adjustWalletBalance(w[0].userId, parseFloat(w[0].amount));
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  market: marketRouter,
  wallet: walletRouter,
  trading: tradingRouter,
  admin: adminRouter,
  invitations: invitationsRouter,
  withdrawals: withdrawalsRouter,
});

export type AppRouter = typeof appRouter;
