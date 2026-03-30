# xxt Star - TODO

## Phase 1: Database & Backend Foundation
- [x] Database schema: users (extended), wallets, transactions, deposits, notifications
- [x] tRPC routers: admin, wallet, trading, market
- [x] Crypto price API integration (CoinGecko)
- [x] Admin middleware (adminProcedure)

## Phase 2: User Interface
- [x] Dark theme setup with gold/green accent colors
- [x] App layout with bottom navigation (mobile-first)
- [x] Home page: market overview with live prices
- [x] Markets page: full coin list with price changes
- [x] Trading page: buy/sell interface with order form
- [x] Wallet page: balance display, holdings, deposit info

## Phase 3: Wallet, Deposit & Transactions
- [x] Wallet system: USDT balance + coin holdings
- [x] Deposit page: TRC20 & ERC20 wallet addresses
- [x] Transaction history page
- [x] Deposit request flow (manual confirmation by admin)

## Phase 4: Admin Dashboard
- [x] Admin panel: member list with status
- [x] Admin: activate/deactivate member accounts
- [x] Admin: add/deduct virtual funds from any member
- [x] Admin: view all transactions
- [x] Admin: deposit approval/rejection
- [x] Owner notifications: new member, large trades

## Phase 5: Testing & Delivery
- [x] Vitest unit tests (10/10 passed)
- [x] Final checkpoint & delivery


## Phase 6: نظام الدعوات والأموال الحقيقية

### نظام الدعوات
- [x] إضافة جدول invitations مع كود دعوة فريد
- [x] إنشاء كود دعوة من لوحة المسؤول
- [x] التحقق من كود الدعوة عند التسجيل
- [x] tRPC routers للدعوات

### حساب المسؤول
- [x] إعدادات المسؤول: aloush0532@gmail.com
- [x] واجهة منفصلة للمسؤول (لوحة تحكم)
- [x] إشعارات النظام

### نظام الإيداع والسحب
- [x] نظام الإيداع: أموال حقيقية فقط
- [x] إضافة جدول withdrawals
- [x] صفحة سحب بصيغتي TRC20 و ERC20
- [x] باركود QR لعناوين المحفظة الثابتة
- [x] خيار نسخ عنوان المحفظة
- [x] تحديث صفحة الإيداع مع QR codes

### الإشعارات
- [x] إشعار للمسؤول عند إيداع جديد
- [x] إشعار عند طلب سحب جديد
- [x] نظام الإشعارات المتكامل


## Phase 7: تحسينات واجهة المستخدم

- [x] إزالة كلمة "الوهمي" من جميع نصوص الرصيد
- [x] تحديث Home page: عرض "رصيد USDT" فقط
- [x] تحديث رسالة المرحبا للمنصة


## Phase 8: نظام قبول/رفض طلبات السحب

- [x] تحديث جدول الإشعارات لتخزين معرّف طلب السحب
- [x] إضافة tRPC procedures لقبول/رفض السحب
- [x] إضافة أزرار القبول والرفض في صفحة الإشعارات
- [x] تحديث رصيد العضو عند قبول السحب
- [x] إرسال إشعار للعضو عند القبول/الرفض


## Phase 9: نظام التعدين اليومي

- [x] إضافة جدول mining_rewards لتتبع التعدين اليومي
- [x] إضافة tRPC query لحساب نسبة ملء الشريط
- [x] إضافة شريط التعدين في الشاشة الرئيسية
- [x] إعداد حساب الوقت للساعة 10:00 مساءً بتوقيت تركيا
- [x] إضافة $80 USDT لكل عضو عند اكتمال التعدين
- [x] إرسال إشعار للعضو عند اكتمال التعدين
