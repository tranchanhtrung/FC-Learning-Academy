import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatVnd } from '../../lib/coursePricing';
import { getCourseSyllabus } from '../../data/courseSyllabi';
import type { Course } from '../../types';
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
  ArrowLeft,
  Copy,
  Check,
  BookOpen,
  PlayCircle,
  Loader2,
  User as UserIcon,
  Package,
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

interface BankTransferInfo {
  bankName: string;
  bankBin: string;
  accountNo: string;
  accountName: string;
}

interface BillingOrder {
  id: string;
  orderCode: string;
  productId: string;
  courseId?: string;
  courseCode?: string;
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
  bankInfo?: BankTransferInfo;
  orderToken?: string;
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

function formatCountdown(expiresAtIso: string, nowMs: number): string {
  const diff = Math.max(0, Math.floor((new Date(expiresAtIso).getTime() - nowMs) / 1000));
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PricingBillingView: React.FC = () => {
  const {
    currentUser,
    courses,
    language,
    showToast,
    hasPermission,
    getAuthHeaders,
    pendingCheckoutCourse,
    pendingCheckoutLessonId,
    pendingCheckoutCombo,
    startComboCheckout,
    clearCourseCheckout,
    completeCourseUnlock,
    completeComboUnlock,
    hasCourseAccess,
    siteAdminConfig,
    getEffectiveCoursePricing,
    refreshEntitlements,
    setActiveTab,
    enrollCourse,
    setSelectedCourseForPlayer,
  } = useApp();
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

  // Direct Course Checkout State (triggered when clicking "Ghi danh khóa học")
  const [courseProvider, setCourseProvider] = useState<ProviderInfo['id']>('payos_vietqr');
  const [courseCouponInput, setCourseCouponInput] = useState('');
  const [courseCouponPreview, setCourseCouponPreview] = useState<{
    valid: boolean;
    discountAmount: number;
    vatAmount: number;
    totalAmount: number;
  } | null>(null);
  const [courseCouponErr, setCourseCouponErr] = useState<string | null>(null);
  const [courseNeedVat, setCourseNeedVat] = useState(false);
  const [courseVatCompany, setCourseVatCompany] = useState(currentUser.property || '');
  const [courseVatTaxCode, setCourseVatTaxCode] = useState('');
  const [courseVatAddress, setCourseVatAddress] = useState('');
  const [courseVatEmail, setCourseVatEmail] = useState(currentUser.email || '');
  const [courseOrder, setCourseOrder] = useState<BillingOrder | null>(null);
  const [courseIdempotencyKey, setCourseIdempotencyKey] = useState('');
  const [courseSubmitting, setCourseSubmitting] = useState(false);
  const [courseCheckingNow, setCourseCheckingNow] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [clockNowMs, setClockNowMs] = useState<number>(() => Date.now());
  const unlockedOrderIdRef = useRef<string | null>(null);

  // Plan Modal Checkout State
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

  // Active Pending Order (Plan Modal QR / Polling Screen)
  const [activeOrder, setActiveOrder] = useState<BillingOrder | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = useCallback(() => getAuthHeaders(), [getAuthHeaders]);

  // Reset direct course / combo checkout state whenever target changes
  useEffect(() => {
    const targetKey = pendingCheckoutCombo
      ? `combo_${pendingCheckoutCombo.id}`
      : pendingCheckoutCourse
      ? pendingCheckoutCourse.id
      : null;
    if (!targetKey) {
      setCourseOrder(null);
      unlockedOrderIdRef.current = null;
      return;
    }
    setCourseOrder(null);
    setCourseCouponInput('');
    setCourseCouponPreview(null);
    setCourseCouponErr(null);
    setCourseNeedVat(false);
    setCourseProvider('payos_vietqr');
    setCourseVatCompany(currentUser.property || '');
    setCourseVatEmail(currentUser.email || '');
    unlockedOrderIdRef.current = null;
    setCourseIdempotencyKey(
      `idem_${currentUser.id}_${targetKey}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );
  }, [pendingCheckoutCourse, pendingCheckoutCombo, currentUser.id, currentUser.property, currentUser.email]);

  // Live 1-second clock for QR expiration countdown
  useEffect(() => {
    const hasPendingQr =
      (courseOrder && courseOrder.status === 'pending') ||
      (activeOrder && activeOrder.status === 'pending');
    if (!hasPendingQr) return;
    const t = window.setInterval(() => setClockNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [courseOrder, activeOrder]);

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

  const handleCopyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      window.setTimeout(() => setCopiedField((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      showToast(isVi ? 'Không thể sao chép tự động.' : 'Could not copy to clipboard.', 'error');
    }
  };

  // Trigger automatic unlock + open CoursePlayerModal once direct course OR combo QR order becomes 'paid'
  const triggerAutoOpenUnlockedCourse = useCallback(
    (paidOrder: BillingOrder) => {
      if (!pendingCheckoutCourse && !pendingCheckoutCombo) return;
      if (unlockedOrderIdRef.current === paidOrder.id) return;
      unlockedOrderIdRef.current = paidOrder.id;
      if (pendingCheckoutCombo) {
        showToast(
          isVi
            ? `Thanh toán Combo ${paidOrder.orderCode} thành công! Đang tự động mở khóa toàn bộ ${pendingCheckoutCombo.courseIds.length} khóa học...`
            : `Combo payment ${paidOrder.orderCode} confirmed! Unlocking all ${pendingCheckoutCombo.courseIds.length} courses...`,
          'success'
        );
        window.setTimeout(() => {
          void completeComboUnlock(pendingCheckoutCombo);
        }, 1100);
        return;
      }
      if (pendingCheckoutCourse) {
        showToast(
          isVi
            ? `Thanh toán ${paidOrder.orderCode} thành công! Đang tự động mở khóa học ${pendingCheckoutCourse.code}...`
            : `Payment ${paidOrder.orderCode} confirmed! Unlocking ${pendingCheckoutCourse.code}...`,
          'success'
        );
        window.setTimeout(() => {
          void completeCourseUnlock(pendingCheckoutCourse, pendingCheckoutLessonId);
        }, 1100);
      }
    },
    [
      completeComboUnlock,
      completeCourseUnlock,
      isVi,
      pendingCheckoutCombo,
      pendingCheckoutCourse,
      pendingCheckoutLessonId,
      showToast,
    ]
  );

  // Poll direct course QR order every 3s for automatic webhook confirmation
  const pollCourseOrderStatus = useCallback(
    async (manual = false) => {
      if (!courseOrder || courseOrder.status !== 'pending') return;
      if (manual) setCourseCheckingNow(true);
      try {
        const headers: Record<string, string> = { ...authHeaders() };
        if (courseOrder.orderToken) {
          headers['x-order-token'] = courseOrder.orderToken;
        }
        const res = await fetch(`/api/billing/orders/${encodeURIComponent(courseOrder.id)}`, {
          credentials: 'same-origin',
          headers,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.order) {
          if (data.order.status !== courseOrder.status) {
            setCourseOrder(data.order);
            if (data.order.status === 'paid') {
              await Promise.all([loadBillingData(), refreshEntitlements()]);
              triggerAutoOpenUnlockedCourse(data.order);
            }
          } else if (manual) {
            showToast(
              isVi
                ? 'Chưa ghi nhận giao dịch ngân hàng mới. Hệ thống vẫn đang tự động theo dõi.'
                : 'No bank transfer received yet. Auto-checking continues.',
              'info'
            );
          }
        }
      } catch {
        // ignore transient poll error
      } finally {
        if (manual) setCourseCheckingNow(false);
      }
    },
    [authHeaders, courseOrder, isVi, loadBillingData, refreshEntitlements, showToast, triggerAutoOpenUnlockedCourse]
  );

  useEffect(() => {
    if (!courseOrder || courseOrder.status !== 'pending') return;
    const timer = window.setInterval(() => {
      void pollCourseOrderStatus(false);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [courseOrder, pollCourseOrderStatus]);

  // Poll standard plan modal order every 3.5s
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'pending') return;
    const timer = window.setInterval(async () => {
      try {
        const headers: Record<string, string> = { ...authHeaders() };
        if (activeOrder.orderToken) {
          headers['x-order-token'] = activeOrder.orderToken;
        }
        const res = await fetch(`/api/billing/orders/${encodeURIComponent(activeOrder.id)}`, {
          credentials: 'same-origin',
          headers,
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
            if (data.order.courseId) {
              await enrollCourse(data.order.courseId);
            }
            await Promise.all([loadBillingData(), refreshEntitlements()]);
          }
        }
      } catch {
        // ignore transient poll error
      }
    }, 3500);
    return () => window.clearInterval(timer);
  }, [activeOrder, authHeaders, enrollCourse, isVi, loadBillingData, refreshEntitlements, showToast]);

  // =========================================================================
  // DIRECT COURSE OR COMBO CHECKOUT HANDLERS
  // =========================================================================
  const handleApplyCourseCoupon = async () => {
    if ((!pendingCheckoutCourse && !pendingCheckoutCombo) || !courseCouponInput.trim()) return;
    setCourseCouponErr(null);
    try {
      const res = await fetch('/api/billing/validate-coupon', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
        body: JSON.stringify(
          pendingCheckoutCombo
            ? {
                productId: 'prod_course_combo',
                comboId: pendingCheckoutCombo.id,
                quantity: 1,
                couponCode: courseCouponInput.trim(),
                includeVatInvoice: courseNeedVat,
              }
            : {
                productId: 'prod_single_course',
                courseId: pendingCheckoutCourse!.id,
                quantity: 1,
                couponCode: courseCouponInput.trim(),
                includeVatInvoice: courseNeedVat,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setCourseCouponPreview(null);
        setCourseCouponErr(data.error || 'Mã giảm giá không hợp lệ.');
        return;
      }
      setCourseCouponPreview({
        valid: true,
        discountAmount: data.discountAmount,
        vatAmount: data.vatAmount,
        totalAmount: data.totalAmount,
      });
    } catch {
      setCourseCouponErr('Không thể kiểm tra mã giảm giá.');
    }
  };

  const handleCreateCourseQrOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!pendingCheckoutCourse && !pendingCheckoutCombo) || courseSubmitting) return;
    if (courseNeedVat && (!courseVatCompany.trim() || !courseVatTaxCode.trim())) {
      showToast(
        isVi
          ? 'Vui lòng nhập Tên công ty và Mã số thuế để xuất hóa đơn VAT.'
          : 'Enter Company Name & Tax Code for VAT invoice.',
        'error'
      );
      return;
    }

    setCourseSubmitting(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          ...authHeaders(),
          'Idempotency-Key': courseIdempotencyKey,
        },
        body: JSON.stringify({
          ...(pendingCheckoutCombo
            ? {
                productId: 'prod_course_combo',
                comboId: pendingCheckoutCombo.id,
              }
            : {
                productId: 'prod_single_course',
                courseId: pendingCheckoutCourse!.id,
              }),
          quantity: 1,
          provider: courseProvider,
          couponCode: courseCouponPreview?.valid ? courseCouponInput.trim() : undefined,
          invoiceInfo: courseNeedVat
            ? {
                companyName: courseVatCompany.trim(),
                taxCode: courseVatTaxCode.trim(),
                address: courseVatAddress.trim(),
                email: courseVatEmail.trim(),
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Khởi tạo mã QR thanh toán thất bại.', 'error');
        return;
      }
      setCourseOrder(data.order);
      setClockNowMs(Date.now());
      await loadBillingData();
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleConfirmCourseQrPayment = async () => {
    if (!courseOrder || (!pendingCheckoutCourse && !pendingCheckoutCombo) || courseSubmitting) return;
    setCourseSubmitting(true);
    try {
      const headers: Record<string, string> = { ...authHeaders() };
      if (courseOrder.orderToken) {
        headers['x-order-token'] = courseOrder.orderToken;
      }
      const res = await fetch(
        `/api/billing/orders/${encodeURIComponent(courseOrder.id)}/sandbox-confirm`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify({ orderToken: courseOrder.orderToken }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Xác nhận thanh toán thất bại.', 'error');
        return;
      }
      setCourseOrder(data.order);
      await Promise.all([loadBillingData(), refreshEntitlements()]);
      triggerAutoOpenUnlockedCourse(data.order);
    } finally {
      setCourseSubmitting(false);
    }
  };

  // =========================================================================
  // STANDARD PLANS CHECKOUT HANDLERS
  // =========================================================================
  const openCheckout = (prod: BillingProduct) => {
    setSelectedProduct(prod);
    setSeatQuantity(prod.minSeats || 1);
    setNeedVatInvoice(prod.productType === 'b2b_seats');
    setCouponInput('');
    setCouponPreview(null);
    setCouponErr(null);
    setActiveOrder(null);
    setIdempotencyKey(
      `idem_${currentUser.id}_${prod.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    );
  };

  const handleApplyCoupon = async () => {
    if (!selectedProduct || !couponInput.trim()) return;
    setCouponErr(null);
    try {
      const res = await fetch('/api/billing/validate-coupon', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
        body: JSON.stringify({
          productId: selectedProduct.id,
          courseId: selectedProduct.productType === 'course' ? selectedCourseId : undefined,
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
        isVi
          ? 'Vui lòng nhập Tên công ty và Mã số thuế để xuất hóa đơn VAT.'
          : 'Enter Company Name & Tax Code for VAT invoice.',
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
      const headers: Record<string, string> = { ...authHeaders() };
      if (activeOrder.orderToken) {
        headers['x-order-token'] = activeOrder.orderToken;
      }
      const res = await fetch(
        `/api/billing/orders/${encodeURIComponent(activeOrder.id)}/sandbox-confirm`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify({ orderToken: activeOrder.orderToken }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Xác nhận sandbox thất bại.', 'error');
        return;
      }
      setActiveOrder(data.order);
      if (data.order?.courseId) {
        await enrollCourse(data.order.courseId);
      }
      showToast(
        isVi
          ? `Đã kích hoạt quyền học cho đơn ${data.order.orderCode}!`
          : `Entitlements activated for order ${data.order.orderCode}!`,
        'success'
      );
      await Promise.all([loadBillingData(), refreshEntitlements()]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminManualConfirm = async (orderId: string) => {
    const res = await fetch(
      `/api/billing/orders/${encodeURIComponent(orderId)}/confirm-manual`,
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: authHeaders(),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Xác nhận đơn hàng thất bại.', 'error');
      return;
    }
    showToast(
      isVi ? `Đã xác nhận chuyển khoản & mở khóa đơn ${data.order.orderCode}!` : `Order ${data.order.orderCode} manually confirmed!`,
      'success'
    );
    await Promise.all([loadBillingData(), refreshEntitlements()]);
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
    await Promise.all([loadBillingData(), refreshEntitlements()]);
  };

  // Active Combos configured by Admin
  const activeCombos = useMemo(
    () => (siteAdminConfig.combos || []).filter((cb) => cb.isActive && cb.courseIds.length >= 2),
    [siteAdminConfig.combos]
  );

  // Preview calculation for Direct Course OR Combo Checkout
  const pendingComboCourses = useMemo<Course[]>(() => {
    if (!pendingCheckoutCombo) return [];
    return pendingCheckoutCombo.courseIds
      .map((cid) => courses.find((c) => c.id === cid || c.code === cid))
      .filter(Boolean) as Course[];
  }, [courses, pendingCheckoutCombo]);

  const pendingComboRetailSum = useMemo(
    () =>
      pendingComboCourses.reduce((sum, c) => sum + getEffectiveCoursePricing(c).priceVnd, 0),
    [pendingComboCourses, getEffectiveCoursePricing]
  );

  const courseUnitPrice = pendingCheckoutCombo
    ? pendingCheckoutCombo.priceVnd
    : pendingCheckoutCourse
    ? getEffectiveCoursePricing(pendingCheckoutCourse).priceVnd
    : 990000;
  const courseDiscount = courseCouponPreview?.valid ? courseCouponPreview.discountAmount : 0;
  const courseNet = Math.max(0, courseUnitPrice - courseDiscount);
  const courseVat = courseNeedVat ? Math.round(courseNet * 0.08) : 0;
  const courseTotal = courseNet + courseVat;
  const pendingSyllabus = pendingCheckoutCourse ? getCourseSyllabus(pendingCheckoutCourse) : undefined;

  // Preview calculation for Plan Modal
  const modalSelectedCourse = courses.find((c) => c.id === selectedCourseId);
  const modalUnitPrice =
    selectedProduct?.productType === 'course' && modalSelectedCourse
      ? getEffectiveCoursePricing(modalSelectedCourse).priceVnd
      : selectedProduct?.priceVnd || 0;
  const previewSubtotal = selectedProduct ? modalUnitPrice * seatQuantity : 0;
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

  // =========================================================================
  // DEDICATED COURSE OR MULTI-COURSE COMBO CHECKOUT & QR AUTO-UNLOCK WORKSPACE
  // =========================================================================
  if (pendingCheckoutCourse || pendingCheckoutCombo) {
    const isComboCheckout = Boolean(pendingCheckoutCombo);
    const compareComboPrice = pendingCheckoutCombo ? pendingComboRetailSum : 0;
    const comboSavings = Math.max(0, compareComboPrice - courseUnitPrice);
    const pendingComboBadge = pendingCheckoutCombo
      ? isVi
        ? pendingCheckoutCombo.badgeVi
        : pendingCheckoutCombo.badgeEn || pendingCheckoutCombo.badgeVi
      : undefined;
    const checkoutTargetId = pendingCheckoutCombo
      ? `combo_${pendingCheckoutCombo.id}`
      : pendingCheckoutCourse!.id;

    return (
      <div className="space-y-6">
        {/* Top Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              clearCourseCheckout();
              setActiveTab('courses');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isVi ? 'Quay lại Kho Khóa Học' : 'Back to Course Catalog'}</span>
          </button>

          <button
            type="button"
            onClick={() => clearCourseCheckout()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>
              {isVi ? 'Xem Gói Pro All-Access (18 Khóa)' : 'View Pro All-Access Plans (18 Courses)'}
            </span>
          </button>
        </div>

        {/* Checkout Header Banner */}
        <div className="bg-gradient-to-r from-[#0A192F] via-[#122645] to-[#1E3A8A] text-white p-5 sm:p-7 rounded-2xl border border-slate-700/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
              {isComboCheckout ? (
                <Package className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <QrCode className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {isComboCheckout
                  ? isVi
                    ? `Thanh Toán Combo ${pendingComboCourses.length} Khóa Học · Mở Khóa Tự Động Toàn Bộ`
                    : `${pendingComboCourses.length}-Course Combo Checkout · Instant Full Unlock`
                  : isVi
                  ? 'Thanh Toán Ghi Danh Khóa Học · Mở Khóa Tự Động'
                  : 'Course Enrollment Checkout · Instant QR Unlock'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              <span className="font-mono text-amber-400 mr-2">
                {pendingCheckoutCombo ? pendingCheckoutCombo.code : pendingCheckoutCourse!.code}
              </span>
              {pendingCheckoutCombo
                ? isVi
                  ? pendingCheckoutCombo.nameVi
                  : pendingCheckoutCombo.nameEn || pendingCheckoutCombo.nameVi
                : isVi
                ? pendingCheckoutCourse!.titleVi
                : pendingCheckoutCourse!.titleEn}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {isComboCheckout
                ? isVi
                  ? `Quét mã QR một lần duy nhất để tự động ghi danh và mở khóa trọn đời toàn bộ ${pendingComboCourses.length} khóa học trong Combo kèm học liệu Excel USALI.`
                  : `Scan QR once to automatically enroll and unlock lifetime access to all ${pendingComboCourses.length} courses in this bundle.`
                : isVi
                ? 'Sau khi hoàn tất quét mã QR thanh toán, hệ thống tự động kích hoạt ghi danh và mở ngay toàn bộ nội dung bài giảng, file Excel USALI & bài kiểm tra.'
                : 'Once QR payment is confirmed, the course is automatically enrolled and opened immediately with full lessons, USALI workbooks, and certification exam.'}
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-700 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              {isComboCheckout
                ? isVi
                  ? 'Giá ưu đãi trọn bộ Combo'
                  : 'Bundle Offer Price'
                : isVi
                ? 'Học phí sở hữu trọn đời'
                : 'Lifetime Course Tuition'}
            </span>
            {isComboCheckout && compareComboPrice > courseUnitPrice && (
              <span className="text-xs text-slate-400 line-through font-mono block">
                {formatVnd(compareComboPrice)}
              </span>
            )}
            <span className="text-2xl font-black font-mono tabular-nums text-amber-400">
              {formatVnd(courseUnitPrice)}
            </span>
            {isComboCheckout && comboSavings > 0 && (
              <span className="block text-[11px] font-bold text-emerald-400">
                {isVi ? `Tiết kiệm ${formatVnd(comboSavings)}` : `Save ${formatVnd(comboSavings)}`}
              </span>
            )}
          </div>
        </div>

        {/* 2-Column Checkout + QR Payment Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Course or Combo Details & Checkout Options */}
          <div className="lg:col-span-7 space-y-5">
            {/* Summary Card */}
            {pendingCheckoutCombo ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-600" />
                      <span>
                        {isVi
                          ? `Danh sách ${pendingComboCourses.length} khóa học được mở khóa tự động`
                          : `All ${pendingComboCourses.length} Included Courses (Auto-Unlocked)`}
                      </span>
                    </h3>
                    {pendingComboBadge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold">
                        {pendingComboBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {isVi
                      ? pendingCheckoutCombo.descriptionVi
                      : pendingCheckoutCombo.descriptionEn || pendingCheckoutCombo.descriptionVi}
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {pendingComboCourses.map((c) => (
                    <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 leading-snug">
                            <span className="font-mono text-blue-700 mr-1.5">{c.code}</span>
                            {isVi ? c.titleVi : c.titleEn}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {c.difficulty} · {c.durationHours}h · {c.instructorName}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 line-through shrink-0">
                        {formatVnd(getEffectiveCoursePricing(c).priceVnd)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : pendingCheckoutCourse ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row gap-4 border-b border-slate-100">
                  <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-[#0A192F] shrink-0 relative">
                    {pendingCheckoutCourse.thumbnail ? (
                      <img
                        src={pendingCheckoutCourse.thumbnail}
                        alt={pendingCheckoutCourse.titleVi}
                        className="w-full h-full object-cover opacity-90"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono font-black text-amber-400 text-lg">
                        {pendingCheckoutCourse.code}
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#0A192F]/90 text-amber-300 text-[10px] font-mono font-bold">
                      {pendingCheckoutCourse.code}
                    </span>
                  </div>
                  <div className="space-y-1.5 min-w-0 flex-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-semibold">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                        {pendingCheckoutCourse.difficulty}
                      </span>
                      <span>·</span>
                      <span className="font-mono">{pendingCheckoutCourse.durationHours}h</span>
                      <span>·</span>
                      <span>
                        {pendingSyllabus
                          ? `${pendingSyllabus.sessions.length} ${isVi ? 'Học phần' : 'Sessions'}`
                          : `${pendingCheckoutCourse.modules.length} Modules`}
                      </span>
                      <span>·</span>
                      <span className="font-mono">Pass {pendingCheckoutCourse.passingScore}%</span>
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                      {isVi ? pendingCheckoutCourse.titleVi : pendingCheckoutCourse.titleEn}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {pendingCheckoutCourse.instructorName} · {pendingCheckoutCourse.instructorTitle}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    isVi ? 'Sở hữu trọn đời khóa học đã chọn' : 'Lifetime access to this course',
                    isVi ? 'Toàn bộ học liệu, file mẫu Excel USALI & Case Study' : 'All lessons, USALI Excel templates & Case Study',
                    isVi ? 'Làm bài thi trắc nghiệm & cấp chứng nhận hoàn thành' : 'End-of-course exam & completion certificate',
                    isVi ? 'Mở khóa truy cập tự động ngay sau khi thanh toán QR' : 'Automatic instant unlock right after QR payment',
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Payment Method, Coupon & VAT (locked once QR order created unless user clicks "Tạo đơn mới") */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isVi ? '1. Chọn Phương Thức Thanh Toán' : '1. Select Payment Method'}
                </h3>
                {courseOrder && courseOrder.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCourseOrder(null);
                      setCourseIdempotencyKey(
                        `idem_${currentUser.id}_${checkoutTargetId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
                      );
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    {isVi ? 'Thay đổi phương thức / mã giảm giá' : 'Change method / coupon'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {providers.map((pv) => (
                  <button
                    key={pv.id}
                    type="button"
                    disabled={Boolean(courseOrder)}
                    onClick={() => setCourseProvider(pv.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      courseProvider === pv.id
                        ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{isVi ? pv.nameVi : pv.nameEn}</span>
                      {pv.id === 'payos_vietqr' && (
                        <QrCode className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{isVi ? pv.badgeVi : pv.badgeEn}</div>
                  </button>
                ))}
              </div>

              {/* Coupon */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700">
                  {isVi ? '2. Mã giảm giá (Thử: LAUNCH2026):' : '2. Promo / Coupon Code:'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      disabled={Boolean(courseOrder)}
                      value={courseCouponInput}
                      onChange={(e) => {
                        setCourseCouponInput(e.target.value.toUpperCase());
                        setCourseCouponPreview(null);
                        setCourseCouponErr(null);
                      }}
                      placeholder="LAUNCH2026"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono uppercase disabled:bg-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(courseOrder) || !courseCouponInput.trim()}
                    onClick={handleApplyCourseCoupon}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isVi ? 'Áp dụng' : 'Apply'}
                  </button>
                </div>
                {courseCouponErr && <p className="text-[11px] text-rose-600 font-semibold">{courseCouponErr}</p>}
                {courseCouponPreview?.valid && (
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    {isVi
                      ? `Đã áp dụng giảm ${formatVnd(courseCouponPreview.discountAmount)}!`
                      : `Discount applied: ${formatVnd(courseCouponPreview.discountAmount)}!`}
                  </p>
                )}
              </div>

              {/* VAT Invoice */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={Boolean(courseOrder)}
                    checked={courseNeedVat}
                    onChange={(e) => setCourseNeedVat(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>
                    {isVi
                      ? 'Xuất hóa đơn đỏ VAT doanh nghiệp / khách sạn (+8%)'
                      : 'Request Corporate VAT Invoice (+8%)'}
                  </span>
                </label>
                {courseNeedVat && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <input
                      type="text"
                      disabled={Boolean(courseOrder)}
                      value={courseVatCompany}
                      onChange={(e) => setCourseVatCompany(e.target.value)}
                      placeholder={isVi ? 'Tên công ty / Khách sạn *' : 'Company Name *'}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      disabled={Boolean(courseOrder)}
                      value={courseVatTaxCode}
                      onChange={(e) => setCourseVatTaxCode(e.target.value)}
                      placeholder={isVi ? 'Mã số thuế (MST) *' : 'Tax Code *'}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                    <input
                      type="text"
                      disabled={Boolean(courseOrder)}
                      value={courseVatAddress}
                      onChange={(e) => setCourseVatAddress(e.target.value)}
                      placeholder={isVi ? 'Địa chỉ xuất hóa đơn' : 'Billing Address'}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="email"
                      disabled={Boolean(courseOrder)}
                      value={courseVatEmail}
                      onChange={(e) => setCourseVatEmail(e.target.value)}
                      placeholder={isVi ? 'Email nhận hóa đơn điện tử' : 'Invoice Email'}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Live QR Payment Box */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              <div className="bg-[#0A192F] text-white px-5 py-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>
                    {courseOrder
                      ? isVi
                        ? `Mã QR Thanh Toán · ${courseOrder.orderCode}`
                        : `QR Payment · ${courseOrder.orderCode}`
                      : isVi
                      ? 'Tóm Tắt Đơn Hàng'
                      : 'Order Summary'}
                  </span>
                </div>
                {courseOrder && courseOrder.status === 'pending' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-bold text-[11px] tabular-nums">
                    {formatCountdown(courseOrder.expiresAt, clockNowMs)}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* STATE 1: BEFORE ORDER CREATION */}
                {!courseOrder && (
                  <form onSubmit={handleCreateCourseQrOrder} className="space-y-4">
                    <div className="space-y-2 pb-3 border-b border-slate-100">
                      <div className="flex justify-between text-slate-600">
                        <span>{isVi ? 'Học phí khóa học:' : 'Course tuition:'}</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {formatVnd(courseUnitPrice)}
                        </span>
                      </div>
                      {courseDiscount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>{isVi ? 'Giảm giá ưu đãi:' : 'Promo discount:'}</span>
                          <span className="font-mono tabular-nums">-{formatVnd(courseDiscount)}</span>
                        </div>
                      )}
                      {courseVat > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>VAT (8%):</span>
                          <span className="font-mono tabular-nums">+{formatVnd(courseVat)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="font-extrabold text-sm text-slate-900">
                        {isVi ? 'Tổng thanh toán:' : 'Total Due:'}
                      </span>
                      <span className="text-2xl font-black font-mono tabular-nums text-[#0A192F]">
                        {formatVnd(courseTotal)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={courseSubmitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60 transition-all"
                    >
                      {courseSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isVi ? 'Đang khởi tạo mã QR...' : 'Generating QR code...'}</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>
                            {isVi ? 'Tạo Mã QR Thanh Toán Ngay' : 'Generate QR Payment Code'}
                          </span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {isVi
                          ? 'Mở khóa tự động 24/7 ngay sau khi thanh toán QR thành công'
                          : '24/7 automatic unlock right after QR payment confirmation'}
                      </span>
                    </div>
                  </form>
                )}

                {/* STATE 2: PENDING QR SCANNING & AUTO-POLLING */}
                {courseOrder && courseOrder.status === 'pending' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                      <span>
                        {isVi
                          ? 'Mở App Ngân hàng / MoMo quét mã QR · Tự động kiểm tra mỗi 3 giây...'
                          : 'Scan QR with Banking App / MoMo · Auto-checking every 3s...'}
                      </span>
                    </div>

                    {/* Scannable VietQR Frame */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      {courseOrder.qrCodeUrl ? (
                        <img
                          src={courseOrder.qrCodeUrl}
                          alt={`VietQR ${courseOrder.orderCode}`}
                          className="w-60 h-60 object-contain rounded-xl bg-white p-2 border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-52 h-52 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400">
                          <QrCode className="w-20 h-20" />
                        </div>
                      )}
                      {courseOrder.paymentUrl && (
                        <a
                          href={courseOrder.paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
                        >
                          {isVi ? 'Mở Ứng Dụng Thanh Toán →' : 'Open Payment App →'}
                        </a>
                      )}
                      <div className="text-xl font-black font-mono tabular-nums text-slate-900">
                        {formatVnd(courseOrder.totalAmount)}
                      </div>
                    </div>

                    {/* Bank Transfer Details with Copy Buttons */}
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white text-[11px]">
                      {courseOrder.bankInfo && (
                        <>
                          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                            <span className="text-slate-500">{isVi ? 'Ngân hàng' : 'Bank'}</span>
                            <span className="font-bold text-slate-900">{courseOrder.bankInfo.bankName}</span>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                            <span className="text-slate-500">{isVi ? 'Số tài khoản' : 'Account No.'}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">
                                {courseOrder.bankInfo.accountNo}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyValue('acc', courseOrder.bankInfo!.accountNo)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                                title={isVi ? 'Sao chép' : 'Copy'}
                              >
                                {copiedField === 'acc' ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                            <span className="text-slate-500">{isVi ? 'Chủ tài khoản' : 'Account Name'}</span>
                            <span className="font-bold text-slate-900">{courseOrder.bankInfo.accountName}</span>
                          </div>
                        </>
                      )}
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-slate-500">{isVi ? 'Số tiền chính xác' : 'Exact Amount'}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-slate-900">
                            {formatVnd(courseOrder.totalAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyValue('amt', String(courseOrder.totalAmount))}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                            title={isVi ? 'Sao chép' : 'Copy'}
                          >
                            {copiedField === 'amt' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-amber-50/70">
                        <span className="text-amber-900 font-semibold">
                          {isVi ? 'Nội dung CK' : 'Transfer Ref'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <code className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-mono font-extrabold">
                            {courseOrder.bankTransferNote}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyValue('note', courseOrder.bankTransferNote || '')}
                            className="p-1 rounded hover:bg-amber-100 text-amber-700 cursor-pointer"
                            title={isVi ? 'Sao chép' : 'Copy'}
                          >
                            {copiedField === 'note' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Manual Check Button */}
                    <button
                      type="button"
                      disabled={courseCheckingNow}
                      onClick={() => void pollCourseOrderStatus(true)}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${courseCheckingNow ? 'animate-spin' : ''}`} />
                      <span>
                        {courseCheckingNow
                          ? isVi
                            ? 'Đang kiểm tra giao dịch...'
                            : 'Checking payment status...'
                          : isVi
                          ? 'Kiểm Tra Trạng Thái Giao Dịch Ngay'
                          : 'Check Payment Status Now'}
                      </span>
                    </button>

                    {/* Sandbox / QR Preview Confirmation (Active until Live Bank Webhook keys are configured) */}
                    {sandboxAllowed && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                        <div className="flex items-start gap-2 text-emerald-900 text-[11px] leading-relaxed">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            {isVi
                              ? 'Chế độ xác thực QR kiểm thử đang bật (chưa cấu hình Webhook ngân hàng tự động). Nhấn nút bên dưới sau khi quét mã QR để kích hoạt mở khóa học ngay.'
                              : 'QR Preview/Sandbox mode is active (live bank webhook not yet connected). Click below after scanning the QR to simulate instant webhook confirmation & auto-unlock.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={courseSubmitting}
                          onClick={() => void handleConfirmCourseQrPayment()}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          {courseSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>
                            {isVi
                              ? 'Xác Nhận Đã Thanh Toán Mã QR (Tự Động Mở Khóa Học)'
                              : 'Confirm QR Payment (Auto-Unlock Course)'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STATE 3: PAID — AUTO UNLOCKING COURSE CONTENT */}
                {courseOrder && courseOrder.status === 'paid' && (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h4 className="text-base font-extrabold text-emerald-950">
                      {isVi ? 'Thanh Toán QR Thành Công!' : 'QR Payment Confirmed!'}
                    </h4>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {pendingCheckoutCombo
                        ? isVi
                          ? `Đơn hàng ${courseOrder.orderCode} đã được xác thực. Toàn bộ ${pendingComboCourses.length} khóa học trong Combo ${pendingCheckoutCombo.code} đang được tự động mở khóa...`
                          : `Order ${courseOrder.orderCode} verified. Unlocking all ${pendingComboCourses.length} courses in Combo ${pendingCheckoutCombo.code}...`
                        : isVi
                        ? `Đơn hàng ${courseOrder.orderCode} đã được xác thực. Hệ thống đang tự động mở quyền truy cập nội dung khóa học ${pendingCheckoutCourse?.code}...`
                        : `Order ${courseOrder.orderCode} verified. Automatically opening course ${pendingCheckoutCourse?.code}...`}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingCheckoutCombo) {
                          void completeComboUnlock(pendingCheckoutCombo);
                        } else if (pendingCheckoutCourse) {
                          void completeCourseUnlock(pendingCheckoutCourse, pendingCheckoutLessonId);
                        }
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>
                        {pendingCheckoutCombo
                          ? isVi
                            ? 'Vào Học Combo Ngay'
                            : 'Start Combo Courses Now'
                          : isVi
                          ? 'Mở Nội Dung Khóa Học Ngay'
                          : 'Open Course Content Now'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STANDARD PRICING PLANS & ORDERS VIEW
  // =========================================================================
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

          {/* Multi-Course Combos configured in Admin */}
          {activeCombos.length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>
                      {isVi
                        ? 'Gói Combo Nhiều Khóa Học (Tiết Kiệm Chi Phí)'
                        : 'Multi-Course Combo Bundles (Best Value)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isVi
                      ? 'Thanh toán 1 lần qua VietQR — hệ thống tự động mở khóa đồng loạt tất cả khóa học trong Combo.'
                      : 'Single VietQR checkout — automatically unlocks every course in the combo.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCombos.map((combo) => {
                  const comboCourseObjs = combo.courseIds
                    .map((cid) => courses.find((c) => c.id === cid || c.code === cid))
                    .filter(Boolean) as Course[];
                  const retailSum = comboCourseObjs.reduce(
                    (sum, c) => sum + getEffectiveCoursePricing(c).priceVnd,
                    0
                  );
                  const compareVal = retailSum;
                  const saveVnd = Math.max(0, compareVal - combo.priceVnd);
                  const ownedAll =
                    comboCourseObjs.length > 0 && comboCourseObjs.every((c) => hasCourseAccess(c));
                  const comboBadgeLabel = isVi ? combo.badgeVi : combo.badgeEn || combo.badgeVi;

                  return (
                    <div
                      key={combo.id}
                      className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 ${
                        combo.featured
                          ? 'bg-amber-50/40 border-amber-400 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#0A192F] text-amber-300 font-mono text-[10px] font-bold">
                            {combo.code}
                          </span>
                          {comboBadgeLabel && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                              {comboBadgeLabel}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {isVi ? combo.nameVi : combo.nameEn || combo.nameVi}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {isVi ? combo.descriptionVi : combo.descriptionEn || combo.descriptionVi}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {comboCourseObjs.map((cc) => (
                            <span
                              key={cc.id}
                              className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[10px] font-bold"
                            >
                              {cc.code}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex items-end justify-between gap-3">
                        <div>
                          {compareVal > combo.priceVnd && (
                            <span className="text-[11px] text-slate-400 line-through font-mono block">
                              {formatVnd(compareVal)}
                            </span>
                          )}
                          <span className="text-lg font-black font-mono text-[#0A192F] tabular-nums">
                            {formatVnd(combo.priceVnd)}
                          </span>
                          {saveVnd > 0 && (
                            <span className="block text-[10px] font-bold text-emerald-700">
                              {isVi ? `Tiết kiệm ${formatVnd(saveVnd)}` : `Save ${formatVnd(saveVnd)}`}
                            </span>
                          )}
                        </div>
                        {ownedAll ? (
                          <span className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                            {isVi ? 'Đã sở hữu' : 'Owned'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startComboCheckout(combo)}
                            className="px-3.5 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{isVi ? 'Mua Combo' : 'Buy Combo'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  ? 'Bạn đang dùng gói Miễn phí (Học thử). Chọn một gói ở tab Bảng Giá hoặc ghi danh khóa học bất kỳ để mở khóa.'
                  : 'You are currently on the Free preview tier.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entitlements.map((ent) => {
                  const matchedCourse =
                    ent.scope === 'course'
                      ? courses.find((c) => c.id === ent.resourceId || c.code === ent.resourceId)
                      : undefined;
                  return (
                    <div
                      key={ent.id}
                      className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <span className="font-bold text-emerald-900 uppercase font-mono block truncate">
                          {ent.scope === 'all_access'
                            ? 'ALL-ACCESS PRO'
                            : matchedCourse
                            ? `${matchedCourse.code} — ${isVi ? matchedCourse.titleVi : matchedCourse.titleEn}`
                            : `${ent.scope}: ${ent.resourceId}`}
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
                      <div className="flex items-center gap-2 shrink-0">
                        {matchedCourse && (
                          <button
                            type="button"
                            onClick={async () => {
                              await enrollCourse(matchedCourse.id);
                              setSelectedCourseForPlayer(matchedCourse);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold text-[11px] cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{isVi ? 'Vào học' : 'Open'}</span>
                          </button>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                      <th className="py-2.5 px-3">{isVi ? 'Gói dịch vụ / Khóa học' : 'Product / Course'}</th>
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
                          <div className="inline-flex items-center justify-end gap-1.5">
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
                            {isAdmin && ord.status === 'pending' && (
                              <button
                                onClick={() => handleAdminManualConfirm(ord.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isVi ? 'Duyệt CK' : 'Confirm'}</span>
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
                          </div>
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

      {/* STANDARD PLAN CHECKOUT & QR PAYMENT MODAL */}
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
                        onChange={(e) => {
                          setSelectedCourseId(e.target.value);
                          setCouponPreview(null);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {isVi ? c.titleVi : c.titleEn} ({formatVnd(getEffectiveCoursePricing(c).priceVnd)})
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
                        ? 'Tạo Mã QR Thanh Toán An Toàn'
                        : 'Create Secure QR Payment Order'}
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
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {activeOrder.courseId && (
                          <button
                            onClick={async () => {
                              const target = courses.find((c) => c.id === activeOrder.courseId);
                              setSelectedProduct(null);
                              setActiveOrder(null);
                              if (target) {
                                await enrollCourse(target.id);
                                setActiveTab('courses');
                                setSelectedCourseForPlayer(target);
                              }
                            }}
                            className="px-5 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-bold cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>{isVi ? 'Vào Học Khóa Này Ngay' : 'Open Course Now'}</span>
                          </button>
                        )}
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
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {isVi
                              ? `Đang chờ thanh toán QR (${formatCountdown(activeOrder.expiresAt, clockNowMs)})...`
                              : `Awaiting QR payment (${formatCountdown(activeOrder.expiresAt, clockNowMs)})...`}
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
                                ? 'Chế độ kiểm thử QR: Nhấn bên dưới để xác nhận thanh toán và mở khóa quyền học ngay lập tức.'
                                : 'QR Test Mode: Confirm payment below to trigger instant entitlement activation.'}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSandboxConfirm}
                            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold cursor-pointer disabled:opacity-60"
                          >
                            {isVi ? 'Xác Nhận Đã Thanh Toán QR (Tự Động Mở Khóa)' : 'Confirm QR Payment (Auto-Unlock)'}
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
