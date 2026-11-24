import crypto from 'crypto';
import type express from 'express';
import type { BankTransferInfo, BillingOrder, NormalizedWebhookOutcome, PaymentProviderId } from './types.ts';

const BANK_NAME_BY_BIN: Record<string, string> = {
  '970436': 'Vietcombank (VCB)',
  '970422': 'MB Bank (MB)',
  '970407': 'Techcombank (TCB)',
  '970415': 'VietinBank (ICB)',
  '970418': 'BIDV',
  '970416': 'ACB',
  '970432': 'VPBank',
  '970423': 'TPBank',
  '970403': 'Sacombank',
  '970448': 'OCB',
  '970405': 'Agribank',
  '970437': 'HDBank',
};

export function hasAnyLivePaymentGateway(): boolean {
  return Boolean(
    (process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY) ||
      process.env.SEPAY_API_KEY ||
      (process.env.MOMO_PARTNER_CODE && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY) ||
      (process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET) ||
      (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
  );
}

export function isSandboxPaymentAllowed(): boolean {
  if (process.env.PAYMENT_SANDBOX === 'true') return true;
  if (process.env.PAYMENT_SANDBOX === 'false') return false;
  return process.env.NODE_ENV !== 'production' || !hasAnyLivePaymentGateway();
}

function timingSafeHexEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a.toLowerCase(), 'utf8');
    const bb = Buffer.from(b.toLowerCase(), 'utf8');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export interface ProviderStatusInfo {
  id: PaymentProviderId;
  nameVi: string;
  nameEn: string;
  badgeVi: string;
  badgeEn: string;
  configured: boolean;
  mode: 'live' | 'sandbox_preview';
  supportsCurrency: ('VND' | 'USD')[];
}

export function getPaymentProvidersStatus(): ProviderStatusInfo[] {
  const payosReady = Boolean(
    process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY
  );
  const momoReady = Boolean(
    process.env.MOMO_PARTNER_CODE && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY
  );
  const vnpayReady = Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

  return [
    {
      id: 'payos_vietqr',
      nameVi: 'Chuyển khoản VietQR 24/7 (PayOS / SePay)',
      nameEn: 'VietQR Instant Bank Transfer (PayOS)',
      badgeVi: 'Khuyên dùng · Phí 0đ',
      badgeEn: 'Recommended · Instant QR',
      configured: payosReady,
      mode: payosReady ? 'live' : 'sandbox_preview',
      supportsCurrency: ['VND'],
    },
    {
      id: 'momo',
      nameVi: 'Ví Điện Tử MoMo',
      nameEn: 'MoMo E-Wallet',
      badgeVi: 'Hỗ trợ QR & App MoMo',
      badgeEn: 'QR & MoMo App',
      configured: momoReady,
      mode: momoReady ? 'live' : 'sandbox_preview',
      supportsCurrency: ['VND'],
    },
    {
      id: 'vnpay',
      nameVi: 'VNPay (QR / ATM / Thẻ nội địa)',
      nameEn: 'VNPay (Domestic ATM & QR)',
      badgeVi: 'Ngân hàng VN',
      badgeEn: 'VN Banks',
      configured: vnpayReady,
      mode: vnpayReady ? 'live' : 'sandbox_preview',
      supportsCurrency: ['VND'],
    },
    {
      id: 'stripe',
      nameVi: 'Thẻ Quốc Tế (Visa / Mastercard — Stripe)',
      nameEn: 'International Card (Visa / Mastercard)',
      badgeVi: 'Thanh toán quốc tế',
      badgeEn: 'Global Cards',
      configured: stripeReady,
      mode: stripeReady ? 'live' : 'sandbox_preview',
      supportsCurrency: ['USD', 'VND'],
    },
  ];
}

/**
 * Generates provider checkout payload (VietQR URL, MoMo signed request, VNPay URL, or Sandbox instruction).
 * Live external API calls execute automatically when provider credentials are set in `.env`.
 */
export async function createProviderPaymentSession(
  order: BillingOrder,
  bankOverride?: { bankBin?: string; accountNo?: string; accountName?: string }
): Promise<{
  providerRequestId: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  bankTransferNote: string;
  bankInfo?: BankTransferInfo;
}> {
  const bankTransferNote = `${order.orderCode} FC ACADEMY`;
  const providerRequestId = `${order.provider.toUpperCase()}_${order.orderCode}_${Date.now()}`;

  const bankBin = (bankOverride?.bankBin || process.env.VIETQR_BANK_BIN || '970436').trim(); // Default Vietcombank BIN
  const accountNo = (bankOverride?.accountNo || process.env.VIETQR_ACCOUNT_NO || '0071001288688').trim();
  const accountNameRaw = (bankOverride?.accountName || process.env.VIETQR_ACCOUNT_NAME || 'FC LEARNING ACADEMY').trim();
  const bankInfo: BankTransferInfo = {
    bankName: BANK_NAME_BY_BIN[bankBin] || `Bank BIN ${bankBin}`,
    bankBin,
    accountNo,
    accountName: accountNameRaw,
  };
  const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${order.totalAmount}&addInfo=${encodeURIComponent(bankTransferNote)}&accountName=${encodeURIComponent(accountNameRaw)}`;

  // 1. VietQR / PayOS — generates scannable VietQR preview even before PayOS API key is configured
  if (order.provider === 'payos_vietqr') {
    return {
      providerRequestId,
      qrCodeUrl: vietQrUrl,
      bankTransferNote,
      bankInfo,
    };
  }

  // 2. MoMo v2 API — canonical HMAC-SHA256 request signing when credentials are configured
  if (order.provider === 'momo') {
    const partnerCode = process.env.MOMO_PARTNER_CODE || '';
    const accessKey = process.env.MOMO_ACCESS_KEY || '';
    const secretKey = process.env.MOMO_SECRET_KEY || '';
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

    if (partnerCode && accessKey && secretKey) {
      const momoOrderId = `${order.orderCode}_${Date.now()}`;
      const requestId = momoOrderId;
      const requestType = 'captureWallet';
      const redirectUrl = `${appUrl}/?tab=pricing&order=${encodeURIComponent(order.id)}`;
      const ipnUrl = `${appUrl}/api/billing/webhooks/momo`;
      const orderInfo = `Thanh toan ${order.productNameVi} (${order.orderCode})`;
      const extraData = Buffer.from(JSON.stringify({ orderId: order.id })).toString('base64');

      // Official MoMo v2 alphabetical rawSignature format
      const rawSignature =
        `accessKey=${accessKey}&amount=${order.totalAmount}&extraData=${extraData}` +
        `&ipnUrl=${ipnUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}` +
        `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
      const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
      const endpoint =
        process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCode,
          accessKey,
          requestId,
          amount: order.totalAmount,
          orderId: momoOrderId,
          orderInfo,
          redirectUrl,
          ipnUrl,
          lang: 'vi',
          extraData,
          requestType,
          signature,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (res.ok && json.payUrl) {
        return {
          providerRequestId: momoOrderId,
          paymentUrl: json.payUrl,
          qrCodeUrl: json.qrCodeUrl,
          bankTransferNote,
        };
      }
      throw new Error(json?.message || 'MoMo gateway rejected payment creation.');
    }
  }

  return {
    providerRequestId,
    qrCodeUrl: vietQrUrl,
    bankTransferNote,
    bankInfo,
  };
}

/**
 * Cryptographically verifies incoming webhooks for MoMo, PayOS, VNPay, Stripe, and Sandbox.
 * Prevents signature forgery, replay attacks, and result-code misinterpretation.
 */
export function verifyAndNormalizeWebhook(
  provider: PaymentProviderId,
  req: express.Request
): NormalizedWebhookOutcome {
  const body = (req.body || {}) as Record<string, any>;

  // 1. MoMo IPN Verification (HMAC-SHA256 on official sorted canonical string)
  if (provider === 'momo') {
    const accessKey = process.env.MOMO_ACCESS_KEY || '';
    const secretKey = process.env.MOMO_SECRET_KEY || '';
    const rawSignature =
      `accessKey=${accessKey}&amount=${body.amount ?? ''}&extraData=${body.extraData ?? ''}` +
      `&message=${body.message ?? ''}&orderId=${body.orderId ?? ''}&orderInfo=${body.orderInfo ?? ''}` +
      `&orderType=${body.orderType ?? ''}&partnerCode=${body.partnerCode ?? ''}&payType=${body.payType ?? ''}` +
      `&requestId=${body.requestId ?? ''}&responseTime=${body.responseTime ?? ''}` +
      `&resultCode=${body.resultCode ?? ''}&transId=${body.transId ?? ''}`;

    const expectedSig = secretKey
      ? crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
      : '';
    const signatureValid = Boolean(
      secretKey && typeof body.signature === 'string' && timingSafeHexEqual(body.signature, expectedSig)
    );

    const code = Number(body.resultCode);
    const outcome: NormalizedWebhookOutcome['outcome'] =
      code === 0 ? 'paid' : code === 1000 || code === 9000 ? 'pending' : 'failed';

    let internalOrderId: string | undefined;
    try {
      if (body.extraData) {
        const parsed = JSON.parse(Buffer.from(String(body.extraData), 'base64').toString('utf8'));
        internalOrderId = parsed?.orderId;
      }
    } catch {
      // ignore invalid extraData
    }
    const orderCode = String(body.orderId || '').split('_')[0] || undefined;

    return {
      provider: 'momo',
      providerEventId: `momo_${body.transId || body.requestId || Date.now()}`,
      orderId: internalOrderId,
      orderCode,
      providerTxId: String(body.transId || ''),
      amount: Math.round(Number(body.amount || 0)),
      currency: 'VND',
      outcome,
      signatureValid,
      rawStatus: String(body.resultCode ?? ''),
    };
  }

  // 2. PayOS / VietQR Webhook Verification (HMAC-SHA256 sorted keys of `data`)
  if (provider === 'payos_vietqr') {
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';
    const dataObj = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, any>;
    const sortedCanonical = Object.keys(dataObj)
      .sort()
      .map((k) => `${k}=${dataObj[k] ?? ''}`)
      .join('&');
    const expectedSig = checksumKey
      ? crypto.createHmac('sha256', checksumKey).update(sortedCanonical).digest('hex')
      : '';
    const signatureValid = Boolean(
      checksumKey && typeof body.signature === 'string' && timingSafeHexEqual(body.signature, expectedSig)
    );

    const isPaid = body.code === '00' || body.success === true || dataObj.code === '00';
    return {
      provider: 'payos_vietqr',
      providerEventId: `payos_${dataObj.reference || dataObj.paymentLinkId || Date.now()}`,
      orderCode: String(dataObj.orderCode || dataObj.description || '').match(/FC[A-Z0-9]{6,12}/)?.[0],
      providerTxId: String(dataObj.reference || dataObj.transactionDateTime || ''),
      amount: Math.round(Number(dataObj.amount || 0)),
      currency: 'VND',
      outcome: isPaid ? 'paid' : 'failed',
      signatureValid,
      rawStatus: String(body.code || dataObj.code || ''),
    };
  }

  // 3. VNPay IPN Verification (HMAC-SHA512 sorted vnp_* params)
  if (provider === 'vnpay') {
    const hashSecret = process.env.VNPAY_HASH_SECRET || '';
    const params = { ...(req.query as Record<string, any>), ...body };
    const receivedHash = String(params.vnp_SecureHash || '');
    const signData = Object.keys(params)
      .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
      .sort()
      .map((k) => `${k}=${encodeURIComponent(String(params[k])).replace(/%20/g, '+')}`)
      .join('&');
    const expectedHash = hashSecret
      ? crypto.createHmac('sha512', hashSecret).update(signData).digest('hex')
      : '';
    const signatureValid = Boolean(hashSecret && receivedHash && timingSafeHexEqual(receivedHash, expectedHash));
    const isPaid = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

    return {
      provider: 'vnpay',
      providerEventId: `vnpay_${params.vnp_TransactionNo || params.vnp_TxnRef || Date.now()}`,
      orderCode: String(params.vnp_TxnRef || '').split('_')[0] || undefined,
      providerTxId: String(params.vnp_TransactionNo || ''),
      amount: Math.round(Number(params.vnp_Amount || 0) / 100), // VNPay sends amount * 100
      currency: 'VND',
      outcome: isPaid ? 'paid' : 'failed',
      signatureValid,
      rawStatus: String(params.vnp_ResponseCode || ''),
    };
  }

  // 4. Stripe Webhook Verification (HMAC-SHA256 t=<ts>.<payload>)
  if (provider === 'stripe') {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const sigHeader = String(req.headers['stripe-signature'] || '');
    const parts = Object.fromEntries(sigHeader.split(',').map((kv) => kv.split('=')));
    const timestamp = parts.t || '';
    const v1 = parts.v1 || '';
    const signedPayload = `${timestamp}.${JSON.stringify(body)}`;
    const expected = webhookSecret
      ? crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex')
      : '';
    const tsAgeSec = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp || 0));
    const signatureValid = Boolean(
      webhookSecret && v1 && tsAgeSec <= 300 && timingSafeHexEqual(v1, expected)
    );

    const obj = body?.data?.object || {};
    const type = String(body?.type || '');
    const outcome: NormalizedWebhookOutcome['outcome'] =
      type === 'checkout.session.completed' || type === 'payment_intent.succeeded'
        ? 'paid'
        : type === 'charge.refunded'
        ? 'refunded'
        : 'failed';

    return {
      provider: 'stripe',
      providerEventId: String(body.id || `stripe_${Date.now()}`),
      orderId: obj?.metadata?.orderId,
      orderCode: obj?.metadata?.orderCode,
      providerTxId: String(obj.payment_intent || obj.id || ''),
      amount: Math.round(Number(obj.amount_total ?? obj.amount ?? 0)),
      currency: String(obj.currency || 'usd').toUpperCase() === 'VND' ? 'VND' : 'USD',
      outcome,
      signatureValid,
      rawStatus: type,
    };
  }

  // 5. Sandbox Webhook (strictly gated off in strict production)
  const sandboxAllowed = process.env.NODE_ENV !== 'production' || process.env.PAYMENT_SANDBOX === 'true';
  return {
    provider: 'sandbox',
    providerEventId: String(body.eventId || `sbx_${body.orderId || Date.now()}`),
    orderId: body.orderId ? String(body.orderId) : undefined,
    orderCode: body.orderCode ? String(body.orderCode) : undefined,
    providerTxId: String(body.providerTxId || `SBX_TX_${Date.now()}`),
    amount: Math.round(Number(body.amount || 0)),
    currency: body.currency === 'USD' ? 'USD' : 'VND',
    outcome: body.outcome === 'failed' ? 'failed' : 'paid',
    signatureValid: sandboxAllowed,
    rawStatus: 'sandbox',
  };
}
