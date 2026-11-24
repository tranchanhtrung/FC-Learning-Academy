export type PaymentProviderId = 'payos_vietqr' | 'momo' | 'vnpay' | 'stripe' | 'sandbox';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'flagged_mismatch'
  | 'paid_late_review'
  | 'refunded';

export type EntitlementScope = 'course' | 'path' | 'all_access' | 'simulator';

export interface BillingProduct {
  id: string;
  code: string;
  productType: 'course' | 'path_bundle' | 'subscription' | 'b2b_seats';
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  /** Integer VND (never float!) */
  priceVnd: number;
  /** Integer USD cents (e.g. 4900 = $49.00) */
  priceUsdCents: number;
  billingCycle: 'one_time' | 'monthly' | 'yearly';
  durationDays: number | null; // null = lifetime
  scope: EntitlementScope;
  resourceId: string; // '*' for all_access
  aiMonthlyQuota: number;
  simulatorAccess: boolean;
  minSeats: number;
  featured?: boolean;
  featuresVi: string[];
  featuresEn: string[];
  isActive: boolean;
}

export interface BillingCoupon {
  code: string;
  discountType: 'percent' | 'fixed_vnd';
  discountValue: number;
  maxDiscountVnd?: number;
  minOrderVnd: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

export interface InvoiceInfo {
  companyName: string;
  taxCode: string;
  address: string;
  email: string;
}

export interface BankTransferInfo {
  bankName: string;
  bankBin: string;
  accountNo: string;
  accountName: string;
}

export interface BillingOrder {
  id: string;
  orderCode: string; // Short bank-transfer-safe code e.g. FC2611A9B2
  idempotencyKey: string;
  userId: string;
  userName: string;
  userEmail: string;
  orgName?: string;
  productId: string;
  courseId?: string;
  courseCode?: string;
  comboId?: string;
  comboCourseIds?: string[];
  productNameVi: string;
  productNameEn: string;
  quantity: number;
  currency: 'VND' | 'USD';
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  couponCode?: string;
  provider: PaymentProviderId;
  providerRequestId?: string;
  providerTxId?: string;
  status: OrderStatus;
  paymentUrl?: string;
  qrCodeUrl?: string;
  bankTransferNote?: string;
  bankInfo?: BankTransferInfo;
  orderToken?: string;
  invoiceInfo?: InvoiceInfo;
  expiresAt: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserEntitlement {
  id: string;
  userId: string;
  scope: EntitlementScope;
  resourceId: string; // '*' or courseId/pathId
  status: 'active' | 'expired' | 'revoked';
  validFrom: string;
  validUntil: string | null;
  sourceOrderId: string;
  productId: string;
  seatsTotal?: number;
  createdAt: string;
  revokedAt?: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: PaymentProviderId;
  providerEventId: string;
  orderId?: string;
  signatureValid: boolean;
  processingStatus:
    | 'processed'
    | 'ignored_duplicate'
    | 'rejected_signature'
    | 'flagged_mismatch'
    | 'error';
  receivedAt: string;
}

export interface NormalizedWebhookOutcome {
  provider: PaymentProviderId;
  providerEventId: string;
  orderCode?: string;
  orderId?: string;
  providerTxId: string;
  amount: number;
  currency: 'VND' | 'USD';
  outcome: 'paid' | 'failed' | 'pending' | 'refunded';
  signatureValid: boolean;
  rawStatus?: string;
}
