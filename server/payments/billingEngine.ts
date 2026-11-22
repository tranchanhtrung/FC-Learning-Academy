import express from 'express';
import crypto from 'crypto';
import path from 'path';
import type { User } from '../../src/types/index.ts';
import { readJsonSafe, writeJsonAtomic } from '../persistence.ts';
import { loadPgSnapshot, queuePgSnapshotSave } from '../db/postgresStore.ts';
import {
  BillingCoupon,
  BillingOrder,
  BillingProduct,
  InvoiceInfo,
  PaymentProviderId,
  UserEntitlement,
  WebhookEventRecord,
} from './types.ts';
import {
  createProviderPaymentSession,
  getPaymentProvidersStatus,
  verifyAndNormalizeWebhook,
} from './providers.ts';

interface BillingStoreFile {
  products: BillingProduct[];
  coupons: BillingCoupon[];
  orders: BillingOrder[];
  entitlements: UserEntitlement[];
  webhookEvents: WebhookEventRecord[];
}

const DEFAULT_PRODUCTS: BillingProduct[] = [
  {
    id: 'prod_pro_fc_yearly',
    code: 'PRO-FC-12M',
    productType: 'subscription',
    nameVi: 'Gói Hội Viên Pro Financial Controller (12 Tháng)',
    nameEn: 'Pro Financial Controller Membership (12 Months)',
    descriptionVi:
      'Mở khóa toàn bộ 18 khóa học chuẩn USALI 11th/12th, 7 dự án thực chiến OJT, AI Coach không giới hạn cơ bản và Phòng Họp Mô Phỏng cùng GM.',
    descriptionEn:
      'Unlock all 18 USALI 11th/12th courses, 7 hotel OJT capstones, AI Coach, and GM Business Partner Simulator.',
    priceVnd: 4990000,
    priceUsdCents: 19900,
    billingCycle: 'yearly',
    durationDays: 365,
    scope: 'all_access',
    resourceId: '*',
    aiMonthlyQuota: 300,
    simulatorAccess: true,
    minSeats: 1,
    featured: true,
    featuresVi: [
      'Trọn bộ 18 khóa học & 75 học phần USALI 11th/12th',
      'Tải toàn bộ mẫu Excel tài chính khách sạn 5 sao (R2 tốc độ cao)',
      'Chấm bài thực hành OJT & cấp Chứng chỉ Chuyên môn 5 Cấp',
      'Không giới hạn luyện tập GM Business Partner Simulator',
      '300 lượt hỏi đáp chuyên sâu với Trợ lý AI Gemini mỗi tháng',
    ],
    featuresEn: [
      'All 18 courses & 75 USALI 11th/12th modules',
      'Full 5-star hotel Excel templates & workbooks',
      'OJT project grading & 5-Level Verified Certificates',
      'Full GM Business Partner Simulator access',
      '300 monthly AI Financial Controller Coach sessions',
    ],
    isActive: true,
  },
  {
    id: 'prod_pro_fc_monthly',
    code: 'PRO-FC-1M',
    productType: 'subscription',
    nameVi: 'Gói Hội Viên Pro Linh Hoạt (Theo Tháng)',
    nameEn: 'Pro Flexible Monthly Membership',
    descriptionVi:
      'Trải nghiệm trọn bộ học liệu, đánh giá năng lực và mô phỏng GM theo từng tháng, không ràng buộc dài hạn.',
    descriptionEn:
      'Full access to courses, competency assessments, and GM Simulator billed monthly.',
    priceVnd: 590000,
    priceUsdCents: 2500,
    billingCycle: 'monthly',
    durationDays: 30,
    scope: 'all_access',
    resourceId: '*',
    aiMonthlyQuota: 120,
    simulatorAccess: true,
    minSeats: 1,
    featuresVi: [
      'Mở khóa 18 khóa học USALI & học liệu đính kèm',
      'Đánh giá năng lực 6 miền & lập Kế hoạch IDP tự động',
      'Luyện tập GM Business Partner Simulator',
      '120 lượt hỏi đáp AI mỗi tháng',
    ],
    featuresEn: [
      'Access all 18 USALI courses & materials',
      '6-domain competency assessments & IDP engine',
      'GM Business Partner Simulator access',
      '120 monthly AI Coach sessions',
    ],
    isActive: true,
  },
  {
    id: 'prod_b2b_hotel_cluster',
    code: 'B2B-HOTEL-SEAT',
    productType: 'b2b_seats',
    nameVi: 'Gói Doanh Nghiệp / Cụm Khách Sạn (Theo Tài Khoản / Năm)',
    nameEn: 'Enterprise Hotel Cluster License (Per Seat / Year)',
    descriptionVi:
      'Dành cho chuỗi khách sạn 4–5 sao đào tạo đồng bộ đội ngũ Kế toán – AFC – FC. Hỗ trợ xuất hóa đơn đỏ VAT điện tử và Dashboard quản trị L&D.',
    descriptionEn:
      'Built for 4–5 star hotel clusters training Finance teams at scale. Includes VAT e-invoice & L&D Governance Dashboard.',
    priceVnd: 3500000,
    priceUsdCents: 14500,
    billingCycle: 'yearly',
    durationDays: 365,
    scope: 'all_access',
    resourceId: '*',
    aiMonthlyQuota: 500,
    simulatorAccess: true,
    minSeats: 5,
    featuresVi: [
      'Tối thiểu 5 tài khoản/đơn · Chiết khấu sâu cho cụm khách sạn',
      'Xuất hóa đơn VAT điện tử đầy đủ theo MST doanh nghiệp',
      'Bảng điều khiển riêng cho FC, GM & Quản lý L&D theo dõi lộ trình kế thừa',
      'Tải lên học liệu nội bộ riêng của tập đoàn (Cloudflare R2 bảo mật)',
      'Hỗ trợ Onboarding & tích hợp SSO / Firestore doanh nghiệp',
    ],
    featuresEn: [
      'Minimum 5 seats · Volume pricing for hotel clusters',
      'Official VAT corporate e-invoicing included',
      'Dedicated FC, GM & L&D succession dashboards',
      'Private corporate materials upload on Cloudflare R2',
      'Dedicated onboarding & enterprise RBAC governance',
    ],
    isActive: true,
  },
  {
    id: 'prod_single_course',
    code: 'COURSE-SINGLE',
    productType: 'course',
    nameVi: 'Mua Lẻ 01 Khóa Học Chuyên Sâu (Sở Hữu Trọn Đời)',
    nameEn: 'Single Specialized Course (Lifetime Access)',
    descriptionVi:
      'Mở khóa vĩnh viễn 01 chuyên đề bất kỳ bạn chọn cùng toàn bộ bài giảng, file Excel mẫu và bài kiểm tra chứng nhận.',
    descriptionEn:
      'Lifetime access to any single specialized course including workbooks, case studies, and completion quiz.',
    priceVnd: 990000,
    priceUsdCents: 4200,
    billingCycle: 'one_time',
    durationDays: null,
    scope: 'course',
    resourceId: 'course_01',
    aiMonthlyQuota: 40,
    simulatorAccess: false,
    minSeats: 1,
    featuresVi: [
      'Sở hữu trọn đời khóa học đã chọn',
      'Toàn bộ bài giảng, mô hình Excel & Case Study của khóa',
      'Thi trắc nghiệm đạt chuẩn nhận chứng nhận hoàn thành khóa',
    ],
    featuresEn: [
      'Lifetime access to the selected course',
      'All lessons, Excel models, and case studies',
      'End-of-course certification quiz included',
    ],
    isActive: true,
  },
];

const DEFAULT_COUPONS: BillingCoupon[] = [
  {
    code: 'LAUNCH2026',
    discountType: 'percent',
    discountValue: 15,
    maxDiscountVnd: 1500000,
    minOrderVnd: 500000,
    maxUses: 500,
    usedCount: 0,
    expiresAt: '2027-12-31T23:59:59.000Z',
    isActive: true,
  },
  {
    code: 'FCVIP500K',
    discountType: 'fixed_vnd',
    discountValue: 500000,
    minOrderVnd: 2000000,
    maxUses: 200,
    usedCount: 0,
    expiresAt: '2027-12-31T23:59:59.000Z',
    isActive: true,
  },
];

export interface BillingEngineDeps {
  dataDir: string;
  getRequestActor: (req: express.Request) => User | undefined;
  isAdminActor: (req: express.Request) => boolean;
  recordAudit: (action: string, actor: string, target: string, details: string) => void;
  persistMainDB: () => void;
}

export function createBillingEngine(deps: BillingEngineDeps) {
  const storePath = path.join(deps.dataDir, 'billing-store.json');

  let store: BillingStoreFile = readJsonSafe<BillingStoreFile>(storePath) || {
    products: DEFAULT_PRODUCTS,
    coupons: DEFAULT_COUPONS,
    orders: [],
    entitlements: [],
    webhookEvents: [],
  };
  if (!Array.isArray(store.products) || store.products.length === 0) store.products = DEFAULT_PRODUCTS;
  if (!Array.isArray(store.coupons)) store.coupons = DEFAULT_COUPONS;
  if (!Array.isArray(store.orders)) store.orders = [];
  if (!Array.isArray(store.entitlements)) store.entitlements = [];
  if (!Array.isArray(store.webhookEvents)) store.webhookEvents = [];

  const persistStore = () => {
    writeJsonAtomic(storePath, store);
    void queuePgSnapshotSave('billing_store', store);
  };

  const hydrateFromPostgres = async () => {
    const remote = await loadPgSnapshot<BillingStoreFile>('billing_store');
    if (remote && typeof remote === 'object') {
      store = {
        products: Array.isArray(remote.products) && remote.products.length > 0 ? remote.products : DEFAULT_PRODUCTS,
        coupons: Array.isArray(remote.coupons) ? remote.coupons : DEFAULT_COUPONS,
        orders: Array.isArray(remote.orders) ? remote.orders : [],
        entitlements: Array.isArray(remote.entitlements) ? remote.entitlements : [],
        webhookEvents: Array.isArray(remote.webhookEvents) ? remote.webhookEvents : [],
      };
      writeJsonAtomic(storePath, store);
    }
  };

  // Server-side deterministic integer VND pricing calculation (ZERO float glitches!)
  const computeOrderTotals = (params: {
    product: BillingProduct;
    quantity: number;
    couponCode?: string;
    includeVatInvoice?: boolean;
  }) => {
    const qty = Math.max(params.product.minSeats, Math.min(500, Math.floor(params.quantity || 1)));
    const subtotalAmount = params.product.priceVnd * qty;
    let discountAmount = 0;
    let appliedCoupon: BillingCoupon | null = null;
    let couponError: string | undefined;

    if (params.couponCode && params.couponCode.trim()) {
      const code = params.couponCode.trim().toUpperCase();
      const found = store.coupons.find((c) => c.code === code && c.isActive);
      const now = Date.now();
      if (!found) {
        couponError = 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.';
      } else if (found.expiresAt && new Date(found.expiresAt).getTime() < now) {
        couponError = 'Mã giảm giá đã hết hạn.';
      } else if (found.maxUses !== null && found.usedCount >= found.maxUses) {
        couponError = 'Mã giảm giá đã hết lượt sử dụng.';
      } else if (subtotalAmount < found.minOrderVnd) {
        couponError = `Mã áp dụng cho đơn từ ${found.minOrderVnd.toLocaleString('vi-VN')}đ.`;
      } else {
        appliedCoupon = found;
        if (found.discountType === 'percent') {
          const pctDiscount = Math.round((subtotalAmount * found.discountValue) / 100);
          discountAmount = found.maxDiscountVnd
            ? Math.min(pctDiscount, found.maxDiscountVnd)
            : pctDiscount;
        } else {
          discountAmount = Math.min(subtotalAmount, found.discountValue);
        }
      }
    }

    const netAfterDiscount = Math.max(0, subtotalAmount - discountAmount);
    // Optional 8% VAT when B2B corporate VAT e-invoice is requested
    const vatAmount = params.includeVatInvoice ? Math.round(netAfterDiscount * 0.08) : 0;
    const totalAmount = netAfterDiscount + vatAmount;

    return {
      quantity: qty,
      subtotalAmount,
      discountAmount,
      vatAmount,
      totalAmount,
      appliedCoupon,
      couponError,
    };
  };

  /**
   * Server-side entitlement checker (never trust frontend flags).
   */
  const hasEntitlement = (userId: string, scope: 'course' | 'simulator' | 'all_access', resourceId = '*'): boolean => {
    const now = Date.now();
    return store.entitlements.some((ent) => {
      if (ent.userId !== userId || ent.status !== 'active') return false;
      if (ent.validUntil && new Date(ent.validUntil).getTime() < now) return false;
      if (ent.scope === 'all_access') return true;
      if (ent.scope === scope && (ent.resourceId === '*' || ent.resourceId === resourceId)) return true;
      return false;
    });
  };

  /**
   * Atomic idempotent grant of entitlements upon verified payment confirmation.
   */
  const activateOrderAndGrantEntitlement = (order: BillingOrder, providerTxId: string) => {
    const product = store.products.find((p) => p.id === order.productId);
    const now = new Date();
    const nowIso = now.toISOString();

    order.status = 'paid';
    order.providerTxId = providerTxId;
    order.paidAt = nowIso;
    order.updatedAt = nowIso;

    // Idempotency guard: never insert duplicate entitlement for same sourceOrderId
    const existingEnt = store.entitlements.find(
      (e) => e.sourceOrderId === order.id && e.userId === order.userId
    );
    if (!existingEnt && product) {
      const validUntil = product.durationDays
        ? new Date(now.getTime() + product.durationDays * 86400000).toISOString()
        : null;

      store.entitlements.unshift({
        id: `ent_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        userId: order.userId,
        scope: product.scope,
        resourceId:
          product.scope === 'course' && order.productNameEn.includes('[')
            ? order.productNameEn.match(/\[([^\]]+)\]/)?.[1] || product.resourceId
            : product.resourceId,
        status: 'active',
        validFrom: nowIso,
        validUntil,
        sourceOrderId: order.id,
        productId: product.id,
        seatsTotal: order.quantity,
        createdAt: nowIso,
      });
    }

    deps.recordAudit(
      'BILLING_ORDER_PAID',
      order.userName,
      order.orderCode,
      `Paid ${order.totalAmount.toLocaleString('vi-VN')} ${order.currency} via ${order.provider} (tx: ${providerTxId})`
    );
    deps.persistMainDB();
    persistStore();
  };

  const router = express.Router();

  // Public catalog & provider availability
  router.get('/catalog', (_req, res) => {
    const sandboxAllowed = process.env.NODE_ENV !== 'production' || process.env.PAYMENT_SANDBOX === 'true';
    return res.json({
      products: store.products.filter((p) => p.isActive),
      providers: getPaymentProvidersStatus(),
      sandboxAllowed,
    });
  });

  // Coupon validation preview
  router.post('/validate-coupon', (req, res) => {
    const { productId, quantity = 1, couponCode, includeVatInvoice = false } = req.body || {};
    const product = store.products.find((p) => p.id === productId && p.isActive);
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy gói dịch vụ.' });
    }
    const calc = computeOrderTotals({
      product,
      quantity: Number(quantity) || 1,
      couponCode: String(couponCode || ''),
      includeVatInvoice: Boolean(includeVatInvoice),
    });
    if (calc.couponError) {
      return res.status(400).json({ error: calc.couponError });
    }
    return res.json({
      valid: true,
      couponCode: calc.appliedCoupon?.code,
      subtotalAmount: calc.subtotalAmount,
      discountAmount: calc.discountAmount,
      vatAmount: calc.vatAmount,
      totalAmount: calc.totalAmount,
    });
  });

  // Current user's active entitlements
  router.get('/entitlements', (req, res) => {
    const actor = deps.getRequestActor(req);
    if (!actor) {
      return res.json({ entitlements: [], hasAllAccess: false, hasSimulatorAccess: false });
    }
    const now = Date.now();
    const mine = store.entitlements.filter(
      (e) => e.userId === actor.id && e.status === 'active' && (!e.validUntil || new Date(e.validUntil).getTime() > now)
    );
    return res.json({
      entitlements: mine,
      hasAllAccess: hasEntitlement(actor.id, 'all_access'),
      hasSimulatorAccess: hasEntitlement(actor.id, 'simulator'),
    });
  });

  // List authenticated user's orders (or all orders for admin)
  router.get('/orders', (req, res) => {
    const actor = deps.getRequestActor(req);
    if (!actor) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để xem lịch sử đơn hàng.' });
    }
    const isAdmin = deps.isAdminActor(req);
    const list = isAdmin
      ? store.orders
      : store.orders.filter((o) => o.userId === actor.id);
    return res.json({ orders: list });
  });

  // Poll single order status (safe — never modifies order state from GET!)
  router.get('/orders/:id', (req, res) => {
    const actor = deps.getRequestActor(req);
    if (!actor) return res.status(401).json({ error: 'Unauthorized' });

    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    if (order.userId !== actor.id && !deps.isAdminActor(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Lazily mark stale pending orders as expired
    if (order.status === 'pending' && Date.now() > new Date(order.expiresAt).getTime()) {
      order.status = 'expired';
      order.updatedAt = new Date().toISOString();
      persistStore();
    }

    return res.json({
      order,
      entitlements: store.entitlements.filter((e) => e.sourceOrderId === order.id),
    });
  });

  // Idempotent Checkout Creation (100% server-side pricing, zero client price trust!)
  router.post('/checkout', async (req, res) => {
    const actor = deps.getRequestActor(req);
    if (!actor) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập trước khi thanh toán.' });
    }

    const {
      productId,
      courseId,
      quantity = 1,
      provider = 'payos_vietqr',
      couponCode,
      invoiceInfo,
    } = req.body || {};

    const validProviders: PaymentProviderId[] = ['payos_vietqr', 'momo', 'vnpay', 'stripe', 'sandbox'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ.' });
    }

    const idempotencyKey =
      String(req.headers['idempotency-key'] || req.body?.idempotencyKey || '').trim() ||
      `idem_${actor.id}_${productId}_${Date.now()}`;

    // Glitch Guard #1: Idempotency — return existing order if same checkout is submitted twice
    const existingOrder = store.orders.find(
      (o) => o.userId === actor.id && o.idempotencyKey === idempotencyKey
    );
    if (existingOrder) {
      return res.json({ order: existingOrder, idempotentReplay: true });
    }

    const product = store.products.find((p) => p.id === productId && p.isActive);
    if (!product) {
      return res.status(404).json({ error: 'Gói học hoặc khóa học không tồn tại.' });
    }

    const hasVatInvoice = Boolean(
      invoiceInfo && invoiceInfo.companyName && invoiceInfo.taxCode
    );
    const calc = computeOrderTotals({
      product,
      quantity: Number(quantity) || 1,
      couponCode: couponCode ? String(couponCode) : undefined,
      includeVatInvoice: hasVatInvoice,
    });

    if (calc.couponError) {
      return res.status(400).json({ error: calc.couponError });
    }

    // Reserve coupon usage atomically
    if (calc.appliedCoupon) {
      calc.appliedCoupon.usedCount += 1;
    }

    const now = new Date();
    const orderCode = `FC${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;
    const ttlMinutes = provider === 'payos_vietqr' ? 30 : 15;
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000).toISOString();

    const safeInvoice: InvoiceInfo | undefined = hasVatInvoice
      ? {
          companyName: String(invoiceInfo.companyName).trim().slice(0, 180),
          taxCode: String(invoiceInfo.taxCode).trim().slice(0, 40),
          address: String(invoiceInfo.address || '').trim().slice(0, 240),
          email: String(invoiceInfo.email || actor.email).trim().slice(0, 180),
        }
      : undefined;

    const order: BillingOrder = {
      id: `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      orderCode,
      idempotencyKey,
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      orgName: actor.property,
      productId: product.id,
      productNameVi: courseId ? `${product.nameVi} [${courseId}]` : product.nameVi,
      productNameEn: courseId ? `${product.nameEn} [${courseId}]` : product.nameEn,
      quantity: calc.quantity,
      currency: 'VND',
      subtotalAmount: calc.subtotalAmount,
      discountAmount: calc.discountAmount,
      vatAmount: calc.vatAmount,
      totalAmount: calc.totalAmount,
      couponCode: calc.appliedCoupon?.code,
      provider,
      status: 'pending',
      invoiceInfo: safeInvoice,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    try {
      const paymentSession = await createProviderPaymentSession(order);
      order.providerRequestId = paymentSession.providerRequestId;
      order.paymentUrl = paymentSession.paymentUrl;
      order.qrCodeUrl = paymentSession.qrCodeUrl;
      order.bankTransferNote = paymentSession.bankTransferNote;
    } catch (err: any) {
      // Roll back reserved coupon if payment gateway creation fails
      if (calc.appliedCoupon) {
        calc.appliedCoupon.usedCount = Math.max(0, calc.appliedCoupon.usedCount - 1);
      }
      return res.status(502).json({
        error: err?.message || 'Không thể khởi tạo phiên thanh toán từ cổng thanh toán.',
      });
    }

    store.orders.unshift(order);
    deps.recordAudit(
      'BILLING_ORDER_CREATED',
      actor.name,
      order.orderCode,
      `Created order ${order.orderCode} (${order.totalAmount.toLocaleString('vi-VN')} VND, ${provider})`
    );
    deps.persistMainDB();
    persistStore();

    return res.status(201).json({ order });
  });

  // Signed & Idempotent Server-to-Server Webhook Handler (/api/billing/webhooks/:provider)
  router.post('/webhooks/:provider', (req, res) => {
    const provider = req.params.provider as PaymentProviderId;
    const allowedProviders: PaymentProviderId[] = ['payos_vietqr', 'momo', 'vnpay', 'stripe', 'sandbox'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Unsupported payment provider.' });
    }

    const normalized = verifyAndNormalizeWebhook(provider, req);

    // Glitch Guard #2: Deduplicate repeated webhook callbacks
    const dup = store.webhookEvents.find(
      (ev) => ev.provider === provider && ev.providerEventId === normalized.providerEventId
    );
    if (dup) {
      return res.status(200).json({ received: true, status: 'ignored_duplicate' });
    }

    // Glitch Guard #4: Reject unsigned or forged webhook payloads
    if (!normalized.signatureValid) {
      store.webhookEvents.unshift({
        id: `wh_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        provider,
        providerEventId: normalized.providerEventId,
        signatureValid: false,
        processingStatus: 'rejected_signature',
        receivedAt: new Date().toISOString(),
      });
      persistStore();
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    const order = store.orders.find(
      (o) =>
        (normalized.orderId && o.id === normalized.orderId) ||
        (normalized.orderCode && o.orderCode === normalized.orderCode)
    );
    if (!order) {
      return res.status(404).json({ error: 'Order not found for webhook.' });
    }

    // Glitch Guard #4b: Verify paid amount & currency strictly match order total!
    if (
      normalized.outcome === 'paid' &&
      (normalized.amount !== order.totalAmount || normalized.currency !== order.currency)
    ) {
      order.status = 'flagged_mismatch';
      order.updatedAt = new Date().toISOString();
      store.webhookEvents.unshift({
        id: `wh_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        provider,
        providerEventId: normalized.providerEventId,
        orderId: order.id,
        signatureValid: true,
        processingStatus: 'flagged_mismatch',
        receivedAt: new Date().toISOString(),
      });
      deps.recordAudit(
        'BILLING_AMOUNT_MISMATCH',
        provider,
        order.orderCode,
        `Expected ${order.totalAmount} ${order.currency}, received ${normalized.amount} ${normalized.currency}`
      );
      persistStore();
      return res.status(200).json({ received: true, status: 'flagged_mismatch' });
    }

    // Strict State Machine transition
    if (normalized.outcome === 'paid') {
      if (order.status === 'pending' || order.status === 'processing') {
        activateOrderAndGrantEntitlement(order, normalized.providerTxId);
      } else if (order.status === 'expired') {
        // Glitch Guard #7: Never silently drop late customer payment — flag for auto/manual reconciliation
        order.status = 'paid_late_review';
        order.providerTxId = normalized.providerTxId;
        order.paidAt = new Date().toISOString();
        order.updatedAt = order.paidAt;
        persistStore();
      }
    } else if (normalized.outcome === 'failed' && order.status === 'pending') {
      order.status = 'failed';
      order.updatedAt = new Date().toISOString();
      persistStore();
    } else if (normalized.outcome === 'refunded' && order.status === 'paid') {
      order.status = 'refunded';
      order.refundedAt = new Date().toISOString();
      order.updatedAt = order.refundedAt;
      store.entitlements
        .filter((e) => e.sourceOrderId === order.id && e.status === 'active')
        .forEach((e) => {
          e.status = 'revoked';
          e.revokedAt = order.refundedAt;
        });
      persistStore();
    }

    store.webhookEvents.unshift({
      id: `wh_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      provider,
      providerEventId: normalized.providerEventId,
      orderId: order.id,
      signatureValid: true,
      processingStatus: 'processed',
      receivedAt: new Date().toISOString(),
    });
    persistStore();

    // MoMo IPN prefers 204 No Content or 200 OK
    if (provider === 'momo') {
      return res.status(204).send();
    }
    return res.status(200).json({ received: true, orderStatus: order.status });
  });

  // Sandbox confirmation helper (ONLY active when NODE_ENV !== 'production' || PAYMENT_SANDBOX === 'true')
  router.post('/orders/:id/sandbox-confirm', (req, res) => {
    const sandboxAllowed = process.env.NODE_ENV !== 'production' || process.env.PAYMENT_SANDBOX === 'true';
    if (!sandboxAllowed) {
      return res.status(403).json({ error: 'Sandbox payment confirmation is disabled in production.' });
    }
    const actor = deps.getRequestActor(req);
    if (!actor) return res.status(401).json({ error: 'Unauthorized' });

    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.userId !== actor.id && !deps.isAdminActor(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (order.status !== 'pending') {
      return res.json({ order, alreadyProcessed: true });
    }

    activateOrderAndGrantEntitlement(order, `SBX_${Date.now()}`);
    return res.json({
      success: true,
      order,
      entitlements: store.entitlements.filter((e) => e.sourceOrderId === order.id),
    });
  });

  // Admin Refund Endpoint (atomically revokes entitlements!)
  router.post('/orders/:id/refund', (req, res) => {
    if (!deps.isAdminActor(req)) {
      return res.status(403).json({ error: 'Admin permission required to issue refunds.' });
    }
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'paid' && order.status !== 'paid_late_review') {
      return res.status(400).json({ error: `Cannot refund order in status "${order.status}".` });
    }

    const nowIso = new Date().toISOString();
    order.status = 'refunded';
    order.refundedAt = nowIso;
    order.updatedAt = nowIso;
    store.entitlements
      .filter((e) => e.sourceOrderId === order.id && e.status === 'active')
      .forEach((e) => {
        e.status = 'revoked';
        e.revokedAt = nowIso;
      });
    deps.recordAudit('BILLING_REFUND', 'Admin', order.orderCode, 'Refund issued & entitlements revoked');
    deps.persistMainDB();
    persistStore();
    return res.json({ success: true, order });
  });

  return {
    router,
    hasEntitlement,
    hydrateFromPostgres,
  };
}
