import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Building2,
  Receipt,
  QrCode,
  Tag,
  Clock,
  RefreshCw,
  AlertTriangle,
  X,
  Lock,
  RotateCcw,
} from 'lucide-react';

interface BillingProduct {
  id: string;
  code: string;
  productType: 'course' | 'path_bundle' | 'subscription' | 'b2b_seats';
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  priceVnd: number;
  priceUsdCents: number;
  billingCycle: 'one_time' | 'monthly' | 'yearly';
  durationDays: number | null;
  scope: string;
  minSeats: number;
  featured?: boolean;
  featuresVi: string[];
  featuresEn: string[];
}

interface ProviderInfo {
  id: 'payos_vietqr' | 'momo' | 'vnpay' | 'stripe' | 'sandbox';
  nameVi: string;
  nameEn: string;
  badgeVi: string;
  badgeEn: string;
  configured: boolean;
  mode: 'live' | 'sandbox_preview';
}

interface BillingOrder {
  id: string;
  orderCode: string;
  productId: string;
  productNameVi: string;
  productNameEn: string;
  quantity: number;
  currency: 'VND' | 'USD';
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  couponCode?: string;
  provider: string;
  status: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  bankTransferNote?: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
}

interface EntitlementDoc {
  id: string;
  scope: string;
  resourceId: string;
  status: string;
  validFrom: string;
  validUntil: string | null;
  sourceOrderId: string;
  productId: string;
  seatsTotal?: number;
}

const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

export const PricingBillingView: React.FC = () => {
  const { currentUser, courses, language, showToast, hasPermission, getAuthHeaders } = useApp();
  const isVi = language === 'vi';
  const isAdmin = hasPermission('view_administration');

  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'orders'>('plans');
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [sandboxAllowed, setSandboxAllowed] = useState(false);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementDoc[]>([]);
  const [hasAllAccess, setHasAllAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Checkout Modal State
  const [selectedProduct, setSelectedProduct] = useState<BillingProduct | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || 'course_01');
  const [seatQuantity, setSeatQuantity] = useState<number>(1);
  const [selectedProvider, setSelectedProvider] = useState<ProviderInfo['id']>('payos_vietqr');
  const [couponInput, setCouponInput] = useState('');
  const [couponPreview, setCouponPreview] = useState<{
    valid: boolean;
    discountAmount: number;
    vatAmount: number;
    totalAmount: number;
  } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [needVatInvoice, setNeedVatInvoice] = useState(false);
  const [vatCompany, setVatCompany] = useState(currentUser.property || '');
  const [vatTaxCode, setVatTaxCode] = useState('');
  const [vatAddress, setVatAddress] = useState('');
  const [vatEmail, setVatEmail] = useState(currentUser.email || '');

  // Active Pending Order (Payment QR / Polling Screen)
  const [activeOrder, setActiveOrder] = useState<BillingOrder | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = useCallback(() => getAuthHeaders(), [getAuthHeaders]);

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, entRes, ordRes] = await Promise.all([
        fetch('/api/billing/catalog', { credentials: 'same-origin' }),
        fetch('/api/billing/entitlements', { credentials: 'same-origin', headers: authHeaders() }),
        fetch('/api/billing/orders', { credentials: 'same-origin', headers: authHeaders() }),
      ]);
      if (catRes.ok) {
        const cat = await catRes.json();
        setProducts(cat.products || []);
        setProviders(cat.providers || []);
        setSandboxAllowed(Boolean(cat.sandboxAllowed));
      }
      if (entRes.ok) {
        const ent = await entRes.json();
        setEntitlements(ent.entitlements || []);
        setHasAllAccess(Boolean(ent.hasAllAccess));
      }
      if (ordRes.ok) {
        const ord = await ordRes.json();
        setOrders(ord.orders || []);
      }
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Poll pending order status safely from server every 4s (never trust return URL query params!)
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'pending') return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/orders/${encodeURIComponent(activeOrder.id)}`, {
          credentials: 'same-origin',
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.order && data.order.status !== activeOrder.status) {
          setActiveOrder(data.order);
          if (data.order.status === 'paid') {
            showToast(
              isVi
                ? `Thanh toán thành công đơn ${data.order.orderCode}! Quyền học đã được mở khóa.`
                : `Order ${data.order.orderCode} paid! Access unlocked.`,
              'success'
            );
            await loadBillingData();
          }
        }
      } catch {
        // ignore transient poll error
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [activeOrder, authHeaders, isVi, loadBillingData, showToast]);

  const openCheckout = (prod: BillingProduct) => {
    setSelectedProduct(prod);
    setSeatQuantity(prod.minSeats || 1);
    setNeedVatInvoice(prod.productType === 'b2b_seats');
    setCouponInput('');
    setCouponPreview(null);
    setCouponErr(null);
    setActiveOrder(null);
    // Generate unique per-attempt idempotency key to prevent duplicate charges on double-click/retry
    setIdempotencyKey(`idem_${currentUser.id}_${prod.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  };

  const handleApplyCoupon = async () => {
    if (!selectedProduct || !couponInput.trim()) return;
    setCouponErr(null);
    try {
      const res = await fetch('/api/billing/validate-coupon', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: seatQuantity,
          couponCode: couponInput.trim(),
          includeVatInvoice: needVatInvoice,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponPreview(null);
        setCouponErr(data.error || 'Mã giảm giá không hợp lệ.');
        return;
      }
      setCouponPreview({
        valid: true,
        discountAmount: data.discountAmount,
        vatAmount: data.vatAmount,
        totalAmount: data.totalAmount,
      });
    } catch {
      setCouponErr('Không thể kiểm tra mã giảm giá.');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || submitting) return;
    if (needVatInvoice && (!vatCompany.trim() || !vatTaxCode.trim())) {
      showToast(
        isVi ? 'Vui lòng nhập Tên công ty và Mã số thuế để xuất hóa đơn VAT.' : 'Enter Company Name & Tax Code for VAT invoice.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          ...authHeaders(),
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          courseId: selectedProduct.productType === 'course' ? selectedCourseId : undefined,
          quantity: seatQuantity,
          provider: selectedProvider,
          couponCode: couponPreview?.valid ? couponInput.trim() : undefined,
          invoiceInfo: needVatInvoice
            ? {
                companyName: vatCompany.trim(),
                taxCode: vatTaxCode.trim(),
                address: vatAddress.trim(),
                email: vatEmail.trim(),
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Khởi tạo thanh toán thất bại.', 'error');
        return;
      }
      setActiveOrder(data.order);
      await loadBillingData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxConfirm = async () => {
    if (!activeOrder || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/orders/${encodeURIComponent(activeOrder.id)}/sandbox-confirm`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Xác nhận sandbox thất bại.', 'error');
        return;
      }
      setActiveOrder(data.order);
      showToast(
        isVi
          ? `Đã kích hoạt quyền học cho đơn ${data.order.orderCode}!`
          : `Entitlements activated for order ${data.order.orderCode}!`,
        'success'
      );
      await loadBillingData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefundOrder = async (orderId: string) => {
    const res = await fetch(`/api/billing/orders/${encodeURIComponent(orderId)}/refund`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Hoàn tiền thất bại.', 'error');
      return;
    }
    showToast(
      isVi ? 'Đã hoàn tiền và tự động thu hồi quyền truy cập!' : 'Refunded and revoked entitlements!',
      'info'
    );
    await loadBillingData();
  };

  // Preview calculation on UI (final authority always stays 100% server-side)
  const previewSubtotal = selectedProduct ? selectedProduct.priceVnd * seatQuantity : 0;
  const previewDiscount = couponPreview?.valid ? couponPreview.discountAmount : 0;
  const previewNet = Math.max(0, previewSubtotal - previewDiscount);
  const previewVat = needVatInvoice ? Math.round(previewNet * 0.08) : 0;
  const previewTotal = previewNet + previewVat;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'pending':
      case 'processing':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'flagged_mismatch':
      case 'paid_late_review':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0A192F] via-[#102A4C] to-[#1E3A8A] text-white p-5 sm:p-8 rounded-2xl border border-slate-700/60 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span>{isVi ? 'Gói Đào Tạo & Hạ Tầng Thanh Toán' : 'Academy Plans & Billing'}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            {isVi ? 'Nâng Cấp Lộ Trình Financial Controller Chuẩn Quốc Tế' : 'Upgrade Your Hospitality Finance Mastery'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {isVi
              ? 'Hỗ trợ VietQR 24/7 (PayOS), Ví MoMo, VNPay, Thẻ quốc tế Stripe và xuất hóa đơn VAT điện tử cho cụm khách sạn. Kiến trúc bảo vệ chống trùng đơn (Idempotency) và xác thực Webhook chữ ký mật mã.'
              : 'Supports VietQR (PayOS), MoMo E-Wallet, VNPay, Stripe international cards, and corporate VAT e-invoices with cryptographic webhook & idempotency protection.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('plans')}
              className={`px-3.5 py-2 rounded-lg cursor-pointer transition-all ${
                activeSubTab === 'plans' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {isVi ? 'Bảng Giá & Gói Học' : 'Plans & Pricing'}
            </button>
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`px-3.5 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                activeSubTab === 'orders' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>
                {isVi ? 'Đơn Hàng & Quyền Học' : 'Orders & Access'} ({orders.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Active All-Access Status Bar */}
      {hasAllAccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              {isVi
                ? 'Tài khoản của bạn đang sở hữu quyền truy cập toàn diện (Pro All-Access)!'
                : 'Your account has active Pro All-Access entitlements!'}
            </span>
          </div>
          <button
            onClick={() => setActiveSubTab('orders')}
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            {isVi ? 'Xem chi tiết gói →' : 'View entitlement details →'}
          </button>
        </div>
      )}

      {/* TAB 1: PRICING PLANS */}
      {activeSubTab === 'plans' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {isVi ? 'Đang tải bảng giá...' : 'Loading plans...'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className={`rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 border transition-all ${
                    prod.featured
                      ? 'bg-[#0A192F] text-white border-amber-400 shadow-xl ring-1 ring-amber-400/50'
                      : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-amber-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          prod.featured
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {prod.featured
                          ? isVi
                            ? 'Phổ biến nhất'
                            : 'Most Popular'
                          : prod.code}
                      </span>
                      {prod.productType === 'b2b_seats' && (
                        <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                    </div>

                    <h3 className="font-extrabold text-base leading-snug">
                      {isVi ? prod.nameVi : prod.nameEn}
                    </h3>

                    <div className="pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums">
                          {formatVnd(prod.priceVnd)}
                        </span>
                        <span className={`text-xs ${prod.featured ? 'text-slate-400' : 'text-slate-500'}`}>
                          {prod.productType === 'b2b_seats'
                            ? isVi
                              ? '/người/năm'
                              : '/seat/yr'
                            : prod.billingCycle === 'yearly'
                            ? isVi
                              ? '/năm'
                              : '/yr'
                            : prod.billingCycle === 'monthly'
                            ? isVi
                              ? '/tháng'
                              : '/mo'
                            : isVi
                            ? '/trọn đời'
                            : '/lifetime'}
                        </span>
                      </div>
                      <p className={`text-xs mt-2 leading-relaxed ${prod.featured ? 'text-slate-300' : 'text-slate-500'}`}>
                        {isVi ? prod.descriptionVi : prod.descriptionEn}
                      </p>
                    </div>

                    <ul className="space-y-2 pt-3 border-t border-slate-200/20 text-xs">
                      {(isVi ? prod.featuresVi : prod.featuresEn).map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-snug">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              prod.featured ? 'text-amber-400' : 'text-emerald-600'
                            }`}
                          />
                          <span className={prod.featured ? 'text-slate-200' : 'text-slate-700'}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => openCheckout(prod)}
                    className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      prod.featured
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                        : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{isVi ? 'Chọn Gói & Thanh Toán' : 'Select & Checkout'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Supported Payment Gateways & Security Guarantees */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {isVi
                    ? 'Cổng Thanh Toán Tích Hợp & Cơ Chế Chống Lỗi Giao Dịch'
                    : 'Payment Gateways & Transaction Safety Guarantees'}
                </span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Idempotency · HMAC-SHA256/512 · Server-Side Pricing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {providers.map((pv) => (
                <div
                  key={pv.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">{isVi ? pv.nameVi : pv.nameEn}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        pv.configured
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {pv.configured ? 'LIVE' : 'READY'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{isVi ? pv.badgeVi : pv.badgeEn}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS & ACTIVE ENTITLEMENTS */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6">
          {/* Active Entitlements */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-base text-slate-900">
              {isVi ? 'Quyền Truy Cập Đang Hoạt Động (Entitlements)' : 'Active Entitlements'}
            </h3>
            {entitlements.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                {isVi
                  ? 'Bạn đang dùng gói Miễn phí (Học thử). Chọn một gói ở tab Bảng Giá để mở khóa toàn bộ khóa học & GM Simulator.'
                  : 'You are currently on the Free preview tier.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entitlements.map((ent) => (
                  <div
                    key={ent.id}
                    className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="font-bold text-emerald-900 uppercase font-mono">
                        {ent.scope === 'all_access' ? 'ALL-ACCESS PRO' : `${ent.scope}: ${ent.resourceId}`}
                      </span>
                      <p className="text-[11px] text-slate-600">
                        {isVi ? 'Hiệu lực đến:' : 'Valid until:'}{' '}
                        <strong>
                          {ent.validUntil
                            ? new Date(ent.validUntil).toLocaleDateString('vi-VN')
                            : isVi
                            ? 'Trọn đời'
                            : 'Lifetime'}
                        </strong>
                        {ent.seatsTotal && ent.seatsTotal > 1 ? ` · ${ent.seatsTotal} seats` : ''}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px] shrink-0">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders History Table */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-base text-slate-900">
                {isVi ? 'Lịch Sử Đơn Hàng & Thanh Toán' : 'Order & Payment History'}
              </h3>
              <button
                onClick={loadBillingData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                {isVi ? 'Chưa có đơn hàng nào.' : 'No orders yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">{isVi ? 'Mã đơn' : 'Order Code'}</th>
                      <th className="py-2.5 px-3">{isVi ? 'Gói dịch vụ' : 'Product'}</th>
                      <th className="py-2.5 px-3">{isVi ? 'Cổng TT' : 'Gateway'}</th>
                      <th className="py-2.5 px-3 text-right">{isVi ? 'Tổng tiền' : 'Total'}</th>
                      <th className="py-2.5 px-3 text-center">{isVi ? 'Trạng thái' : 'Status'}</th>
                      <th className="py-2.5 px-3 text-right">{isVi ? 'Thao tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {ord.orderCode}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {isVi ? ord.productNameVi : ord.productNameEn}
                          {ord.quantity > 1 && (
                            <span className="ml-1.5 text-[10px] font-mono text-slate-500">
                              (x{ord.quantity})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono uppercase text-[11px] text-slate-600">
                          {ord.provider}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatVnd(ord.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadge(
                              ord.status
                            )}`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {ord.status === 'pending' && (
                            <button
                              onClick={() => {
                                const prod = products.find((p) => p.id === ord.productId) || null;
                                setSelectedProduct(prod);
                                setActiveOrder(ord);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                            >
                              {isVi ? 'Mở QR / TT' : 'Pay Now'}
                            </button>
                          )}
                          {isAdmin && ord.status === 'paid' && (
                            <button
                              onClick={() => handleRefundOrder(ord.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{isVi ? 'Hoàn tiền' : 'Refund'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT & QR PAYMENT MODAL */}
      {(selectedProduct || activeOrder) && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedProduct(null);
              setActiveOrder(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 my-auto">
            <div className="bg-[#0A192F] text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base truncate">
                  {activeOrder
                    ? isVi
                      ? `Thanh Toán Đơn ${activeOrder.orderCode}`
                      : `Pay Order ${activeOrder.orderCode}`
                    : isVi
                    ? 'Xác Nhận Gói Học & Thanh Toán'
                    : 'Confirm Plan & Checkout'}
                </h3>
                <p className="text-[11px] text-amber-300 truncate">
                  {selectedProduct ? (isVi ? selectedProduct.nameVi : selectedProduct.nameEn) : activeOrder?.productNameVi}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setActiveOrder(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {!activeOrder && selectedProduct ? (
                <form onSubmit={handleCreateOrder} className="space-y-4">
                  {/* Course selector for Single Course */}
                  {selectedProduct.productType === 'course' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isVi ? 'Chọn khóa học muốn mở khóa trọn đời:' : 'Select course to unlock:'}
                      </label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {isVi ? c.titleVi : c.titleEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Seat counter for B2B */}
                  {selectedProduct.productType === 'b2b_seats' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isVi ? `Số lượng tài khoản nhân sự (Tối thiểu ${selectedProduct.minSeats}):` : 'Number of Seats:'}
                      </label>
                      <input
                        type="number"
                        min={selectedProduct.minSeats}
                        max={500}
                        value={seatQuantity}
                        onChange={(e) => {
                          setSeatQuantity(Math.max(selectedProduct.minSeats, Number(e.target.value) || selectedProduct.minSeats));
                          setCouponPreview(null);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                  )}

                  {/* Payment Method Selection */}
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700">
                      {isVi ? 'Phương thức thanh toán:' : 'Payment Method:'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {providers.map((pv) => (
                        <button
                          key={pv.id}
                          type="button"
                          onClick={() => setSelectedProvider(pv.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedProvider === pv.id
                              ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-400'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-bold text-slate-900">{isVi ? pv.nameVi : pv.nameEn}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{isVi ? pv.badgeVi : pv.badgeEn}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Coupon Code */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700">
                      {isVi ? 'Mã giảm giá (Thử: LAUNCH2026 hoặc FCVIP500K):' : 'Promo / Coupon Code:'}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponPreview(null);
                            setCouponErr(null);
                          }}
                          placeholder="LAUNCH2026"
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono uppercase"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer shrink-0"
                      >
                        {isVi ? 'Áp dụng' : 'Apply'}
                      </button>
                    </div>
                    {couponErr && <p className="text-[11px] text-rose-600 font-semibold">{couponErr}</p>}
                    {couponPreview?.valid && (
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        {isVi
                          ? `Đã áp dụng giảm ${formatVnd(couponPreview.discountAmount)}!`
                          : `Discount applied: ${formatVnd(couponPreview.discountAmount)}!`}
                      </p>
                    )}
                  </div>

                  {/* Corporate VAT Invoice Toggle */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={needVatInvoice}
                        onChange={(e) => setNeedVatInvoice(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>{isVi ? 'Xuất hóa đơn đỏ VAT doanh nghiệp (+8%)' : 'Request Corporate VAT Invoice (+8%)'}</span>
                    </label>
                    {needVatInvoice && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <input
                          type="text"
                          value={vatCompany}
                          onChange={(e) => setVatCompany(e.target.value)}
                          placeholder={isVi ? 'Tên công ty / Khách sạn *' : 'Company Name *'}
                          className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="text"
                          value={vatTaxCode}
                          onChange={(e) => setVatTaxCode(e.target.value)}
                          placeholder={isVi ? 'Mã số thuế (MST) *' : 'Tax Code *'}
                          className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                        />
                        <input
                          type="text"
                          value={vatAddress}
                          onChange={(e) => setVatAddress(e.target.value)}
                          placeholder={isVi ? 'Địa chỉ xuất hóa đơn' : 'Billing Address'}
                          className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="email"
                          value={vatEmail}
                          onChange={(e) => setVatEmail(e.target.value)}
                          placeholder={isVi ? 'Email nhận hóa đơn điện tử' : 'Invoice Email'}
                          className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Order Total Summary */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>{isVi ? 'Tạm tính:' : 'Subtotal:'}</span>
                      <span className="font-mono tabular-nums">{formatVnd(previewSubtotal)}</span>
                    </div>
                    {previewDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{isVi ? 'Giảm giá:' : 'Discount:'}</span>
                        <span className="font-mono tabular-nums">-{formatVnd(previewDiscount)}</span>
                      </div>
                    )}
                    {previewVat > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>VAT (8%):</span>
                        <span className="font-mono tabular-nums">+{formatVnd(previewVat)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-amber-400 pt-2 border-t border-slate-700">
                      <span>{isVi ? 'Tổng thanh toán:' : 'Total Due:'}</span>
                      <span className="font-mono tabular-nums">{formatVnd(previewTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {submitting
                        ? isVi
                          ? 'Đang tạo đơn bảo mật...'
                          : 'Creating secure order...'
                        : isVi
                        ? 'Tạo Mã Thanh Toán An Toàn'
                        : 'Create Secure Payment Order'}
                    </span>
                  </button>
                </form>
              ) : activeOrder ? (
                <div className="space-y-4 text-center">
                  {activeOrder.status === 'paid' ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                      <h4 className="text-base font-extrabold text-emerald-900">
                        {isVi ? 'Thanh Toán Thành Công!' : 'Payment Confirmed!'}
                      </h4>
                      <p className="text-slate-600">
                        {isVi
                          ? `Đơn hàng ${activeOrder.orderCode} đã được xác thực. Quyền truy cập khóa học & tính năng đã kích hoạt tự động.`
                          : `Order ${activeOrder.orderCode} verified. Entitlements are now active.`}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setActiveOrder(null);
                          setActiveSubTab('orders');
                        }}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        {isVi ? 'Xem Gói Đã Mở Khóa' : 'View Active Entitlements'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {isVi ? 'Đang chờ xác thực thanh toán từ cổng...' : 'Awaiting signed gateway confirmation...'}
                          </span>
                        </div>

                        {activeOrder.qrCodeUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <img
                              src={activeOrder.qrCodeUrl}
                              alt="VietQR Payment"
                              className="w-56 h-56 object-contain rounded-xl border border-slate-200 bg-white p-2"
                            />
                            <p className="text-[11px] text-slate-500">
                              {isVi ? 'Nội dung chuyển khoản chính xác:' : 'Exact Transfer Reference:'}{' '}
                              <code className="px-2 py-0.5 rounded bg-slate-200 text-slate-900 font-mono font-bold">
                                {activeOrder.bankTransferNote}
                              </code>
                            </p>
                          </div>
                        ) : (
                          <div className="py-6 flex flex-col items-center gap-2 text-slate-600">
                            <QrCode className="w-16 h-16 text-slate-400" />
                            <p className="font-bold text-slate-800 uppercase">{activeOrder.provider}</p>
                            {activeOrder.paymentUrl && (
                              <a
                                href={activeOrder.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold"
                              >
                                {isVi ? 'Mở Cổng Thanh Toán →' : 'Open Payment Gateway →'}
                              </a>
                            )}
                          </div>
                        )}

                        <div className="text-lg font-black font-mono text-slate-900">
                          {formatVnd(activeOrder.totalAmount)}
                        </div>
                      </div>

                      {sandboxAllowed && (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-left">
                          <div className="flex items-start gap-2 text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              {isVi
                                ? 'Chế độ Sandbox kiểm thử: Bạn có thể mô phỏng Webhook thành công để kiểm tra luồng mở khóa tự động ngay lập tức.'
                                : 'Sandbox Mode: Simulate a verified payment webhook to test automatic entitlement activation.'}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSandboxConfirm}
                            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold cursor-pointer disabled:opacity-60"
                          >
                            {isVi ? 'Mô Phỏng Thanh Toán Thành Công (Sandbox)' : 'Simulate Successful Payment (Sandbox)'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
