import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { CourseComboPackage, CoursePriceOverride } from '../../types';
import { formatVnd } from '../../lib/coursePricing';
import {
  Tag,
  Layers,
  Ticket,
  Receipt,
  Save,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Search,
  Sparkles,
  Check,
} from 'lucide-react';

interface AdminCoupon {
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

interface AdminOrderRow {
  id: string;
  orderCode: string;
  userName: string;
  userEmail: string;
  productNameVi: string;
  productNameEn: string;
  provider: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export const AdminCommerceTab: React.FC = () => {
  const {
    courses,
    domains,
    siteAdminConfig,
    saveSiteAdminConfig,
    getEffectiveCoursePricing,
    getAuthHeaders,
    language,
    showToast,
  } = useApp();
  const isVi = language === 'vi';

  const [subTab, setSubTab] = useState<'prices' | 'combos' | 'coupons' | 'orders'>('prices');
  const [saving, setSaving] = useState(false);

  // =========================================================================
  // 1. PER-COURSE PRICING EDITOR STATE
  // =========================================================================
  const [priceSearch, setPriceSearch] = useState('');
  const [priceDomain, setPriceDomain] = useState('all');
  const [priceDrafts, setPriceDrafts] = useState<
    Record<string, { priceVnd: string; originalPriceVnd: string; isFree: boolean; published: boolean }>
  >({});

  useEffect(() => {
    const next: typeof priceDrafts = {};
    courses.forEach((c) => {
      const eff = getEffectiveCoursePricing(c);
      next[c.id] = {
        priceVnd: String(eff.priceVnd),
        originalPriceVnd: eff.originalPriceVnd ? String(eff.originalPriceVnd) : '',
        isFree: eff.isFree,
        published: eff.published,
      };
    });
    setPriceDrafts(next);
  }, [courses, getEffectiveCoursePricing, siteAdminConfig.coursePrices]);

  const filteredCourses = useMemo(() => {
    const q = priceSearch.trim().toLowerCase();
    return courses
      .filter((c) => {
        if (priceDomain !== 'all' && c.domainId !== priceDomain) return false;
        if (!q) return true;
        return (
          c.code.toLowerCase().includes(q) ||
          c.titleVi.toLowerCase().includes(q) ||
          c.titleEn.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [courses, priceDomain, priceSearch]);

  const handleSaveAllCoursePrices = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const nextOverrides: Record<string, CoursePriceOverride> = { ...siteAdminConfig.coursePrices };
      for (const c of courses) {
        const d = priceDrafts[c.id];
        if (!d) continue;
        const parsedPrice = Math.max(0, Math.round(Number(d.priceVnd) || 0));
        const parsedOrig = d.originalPriceVnd.trim()
          ? Math.max(0, Math.round(Number(d.originalPriceVnd) || 0))
          : undefined;
        nextOverrides[c.id] = {
          courseId: c.id,
          priceVnd: d.isFree ? 0 : parsedPrice,
          originalPriceVnd: parsedOrig && parsedOrig > parsedPrice ? parsedOrig : undefined,
          isFree: d.isFree || parsedPrice <= 0,
          published: d.published,
          updatedAt: now,
        };
      }
      await saveSiteAdminConfig(
        (prev) => ({ ...prev, coursePrices: nextOverrides }),
        isVi
          ? 'Đã lưu bảng giá toàn bộ khóa học! Giá mới đã áp dụng ngay trên Kho khóa học & Thanh toán QR.'
          : 'Saved all course prices! Live catalog and QR checkout updated immediately.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // 2. MULTI-COURSE COMBOS EDITOR STATE
  // =========================================================================
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [comboForm, setComboForm] = useState<{
    code: string;
    nameVi: string;
    nameEn: string;
    descriptionVi: string;
    descriptionEn: string;
    badgeVi: string;
    badgeEn: string;
    courseIds: string[];
    priceVnd: string;
    durationDays: string;
    isActive: boolean;
    featured: boolean;
  }>({
    code: '',
    nameVi: '',
    nameEn: '',
    descriptionVi: '',
    descriptionEn: '',
    badgeVi: 'Tiết kiệm đặc biệt',
    badgeEn: 'Special Savings',
    courseIds: [],
    priceVnd: '1990000',
    durationDays: '',
    isActive: true,
    featured: false,
  });

  const openCreateCombo = () => {
    setEditingComboId(null);
    setComboForm({
      code: `COMBO-${(siteAdminConfig.combos.length + 1).toString().padStart(2, '0')}`,
      nameVi: '',
      nameEn: '',
      descriptionVi: '',
      descriptionEn: '',
      badgeVi: 'Tiết kiệm 30%',
      badgeEn: 'Save 30%',
      courseIds: courses.slice(0, 3).map((c) => c.id),
      priceVnd: '1990000',
      durationDays: '',
      isActive: true,
      featured: true,
    });
    setComboModalOpen(true);
  };

  const openEditCombo = (cb: CourseComboPackage) => {
    setEditingComboId(cb.id);
    setComboForm({
      code: cb.code,
      nameVi: cb.nameVi,
      nameEn: cb.nameEn,
      descriptionVi: cb.descriptionVi,
      descriptionEn: cb.descriptionEn,
      badgeVi: cb.badgeVi || '',
      badgeEn: cb.badgeEn || '',
      courseIds: [...cb.courseIds],
      priceVnd: String(cb.priceVnd),
      durationDays: cb.durationDays ? String(cb.durationDays) : '',
      isActive: cb.isActive,
      featured: Boolean(cb.featured),
    });
    setComboModalOpen(true);
  };

  const toggleComboCourse = (courseId: string) => {
    setComboForm((prev) => ({
      ...prev,
      courseIds: prev.courseIds.includes(courseId)
        ? prev.courseIds.filter((id) => id !== courseId)
        : [...prev.courseIds, courseId],
    }));
  };

  const comboRetailTotal = useMemo(() => {
    return comboForm.courseIds.reduce((sum, cid) => {
      const c = courses.find((item) => item.id === cid || item.code === cid);
      return sum + (c ? getEffectiveCoursePricing(c).priceVnd : 0);
    }, 0);
  }, [comboForm.courseIds, courses, getEffectiveCoursePricing]);

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboForm.nameVi.trim() || !comboForm.code.trim()) {
      showToast(isVi ? 'Vui lòng nhập Mã và Tên gói Combo.' : 'Enter combo code and title.', 'error');
      return;
    }
    if (comboForm.courseIds.length < 2) {
      showToast(isVi ? 'Gói Combo cần chọn tối thiểu 2 khóa học.' : 'Select at least 2 courses for a combo.', 'error');
      return;
    }
    const priceVnd = Math.max(0, Math.round(Number(comboForm.priceVnd) || 0));
    const durationDays = comboForm.durationDays.trim()
      ? Math.max(1, Math.round(Number(comboForm.durationDays)))
      : null;
    const now = new Date().toISOString();

    const record: CourseComboPackage = {
      id: editingComboId || `combo_${Date.now()}`,
      code: comboForm.code.trim().toUpperCase(),
      nameVi: comboForm.nameVi.trim(),
      nameEn: comboForm.nameEn.trim() || comboForm.nameVi.trim(),
      descriptionVi: comboForm.descriptionVi.trim(),
      descriptionEn: comboForm.descriptionEn.trim() || comboForm.descriptionVi.trim(),
      badgeVi: comboForm.badgeVi.trim() || undefined,
      badgeEn: comboForm.badgeEn.trim() || comboForm.badgeVi.trim() || undefined,
      courseIds: comboForm.courseIds,
      priceVnd,
      durationDays,
      isActive: comboForm.isActive,
      featured: comboForm.featured,
      createdAt: editingComboId
        ? siteAdminConfig.combos.find((c) => c.id === editingComboId)?.createdAt || now
        : now,
      updatedAt: now,
    };

    const ok = await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        combos: editingComboId
          ? prev.combos.map((c) => (c.id === editingComboId ? record : c))
          : [record, ...prev.combos],
      }),
      isVi ? `Đã lưu gói Combo "${record.nameVi}"!` : `Saved combo "${record.nameEn}"!`
    );
    if (ok) setComboModalOpen(false);
  };

  const handleToggleComboActive = async (comboId: string) => {
    await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        combos: prev.combos.map((c) =>
          c.id === comboId ? { ...c, isActive: !c.isActive, updatedAt: new Date().toISOString() } : c
        ),
      }),
      isVi ? 'Đã cập nhật trạng thái hiển thị gói Combo.' : 'Updated combo status.'
    );
  };

  const handleDeleteCombo = async (comboId: string) => {
    await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        combos: prev.combos.filter((c) => c.id !== comboId),
      }),
      isVi ? 'Đã xoá gói Combo.' : 'Deleted combo package.'
    );
  };

  // =========================================================================
  // 3. COUPONS & ORDERS (LIVE BACKEND BILLING API)
  // =========================================================================
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed_vnd',
    discountValue: '15',
    maxDiscountVnd: '1000000',
    minOrderVnd: '500000',
    maxUses: '100',
    expiresAt: '2027-12-31',
  });

  const loadBillingAdminData = useCallback(async () => {
    setLoadingBilling(true);
    try {
      const headers = getAuthHeaders();
      const [cRes, oRes] = await Promise.all([
        fetch('/api/billing/admin/coupons', { credentials: 'same-origin', headers }),
        fetch('/api/billing/orders', { credentials: 'same-origin', headers }),
      ]);
      if (cRes.ok) {
        const cd = await cRes.json();
        setCoupons(Array.isArray(cd.coupons) ? cd.coupons : []);
      }
      if (oRes.ok) {
        const od = await oRes.json();
        setOrders(Array.isArray(od.orders) ? od.orders : []);
      }
    } finally {
      setLoadingBilling(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (subTab === 'coupons' || subTab === 'orders') {
      void loadBillingAdminData();
    }
  }, [subTab, loadBillingAdminData]);

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/billing/admin/coupons', {
      method: 'POST',
      credentials: 'same-origin',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        code: couponForm.code.trim().toUpperCase(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        maxDiscountVnd: couponForm.maxDiscountVnd ? Number(couponForm.maxDiscountVnd) : undefined,
        minOrderVnd: Number(couponForm.minOrderVnd) || 0,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : null,
        expiresAt: couponForm.expiresAt ? `${couponForm.expiresAt}T23:59:59.000Z` : undefined,
        isActive: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || 'Không thể lưu mã giảm giá.', 'error');
      return;
    }
    setCoupons(data.coupons || []);
    setCouponForm({ ...couponForm, code: '' });
    showToast(isVi ? `Đã lưu mã giảm giá ${data.coupon?.code}!` : `Saved coupon ${data.coupon?.code}!`, 'success');
  };

  const handleToggleCoupon = async (c: AdminCoupon) => {
    const res = await fetch('/api/billing/admin/coupons', {
      method: 'POST',
      credentials: 'same-origin',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...c, isActive: !c.isActive }),
    });
    if (res.ok) {
      const data = await res.json();
      setCoupons(data.coupons || []);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    const res = await fetch(`/api/billing/admin/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      setCoupons(data.coupons || []);
      showToast(isVi ? `Đã xoá mã ${code}.` : `Deleted coupon ${code}.`, 'info');
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    const res = await fetch(`/api/billing/orders/${encodeURIComponent(orderId)}/confirm-manual`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || 'Không thể xác nhận đơn hàng.', 'error');
      return;
    }
    showToast(isVi ? `Đã xác nhận & mở khóa đơn ${data.order?.orderCode}!` : 'Order confirmed!', 'success');
    await loadBillingAdminData();
  };

  const handleRefundOrder = async (orderId: string) => {
    const res = await fetch(`/api/billing/orders/${encodeURIComponent(orderId)}/refund`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      showToast(isVi ? 'Đã hoàn tiền và thu hồi quyền học.' : 'Refunded and revoked access.', 'info');
      await loadBillingAdminData();
    }
  };

  const filteredOrders = useMemo(
    () => (orderStatusFilter === 'all' ? orders : orders.filter((o) => o.status === orderStatusFilter)),
    [orders, orderStatusFilter]
  );

  const totalPaidRevenue = useMemo(
    () => orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
    [orders]
  );

  return (
    <div className="space-y-5">
      {/* Sub-tab Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSubTab('prices')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
            subTab === 'prices' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>{isVi ? `Giá Từng Khóa Học (${courses.length})` : `Course Prices (${courses.length})`}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('combos')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
            subTab === 'combos' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>
            {isVi ? `Gói Combo Nhiều Khóa (${siteAdminConfig.combos.length})` : `Course Combos (${siteAdminConfig.combos.length})`}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('coupons')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
            subTab === 'coupons' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>{isVi ? 'Mã Giảm Giá (Voucher)' : 'Promo Coupons'}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('orders')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
            subTab === 'orders' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{isVi ? 'Đơn Hàng & Đối Soát QR' : 'Orders & QR Reconciliation'}</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* SUB-TAB 1: PER-COURSE PRICING TABLE                               */}
      {/* ================================================================= */}
      {subTab === 'prices' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isVi ? 'Khai Báo Học Phí Riêng Cho Từng Khóa Học' : 'Per-Course Pricing Configuration'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isVi
                  ? 'Giá khai báo tại đây sẽ cập nhật ngay trên thẻ khóa học, màn hình Ghi danh và mã thanh toán VietQR.'
                  : 'Prices configured here immediately govern the course catalog and server-side VietQR checkout.'}
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAllCoursePrices}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? isVi
                    ? 'Đang lưu...'
                    : 'Saving...'
                  : isVi
                  ? 'Lưu Toàn Bộ Bảng Giá'
                  : 'Save All Course Prices'}
              </span>
            </button>
          </div>

          {/* Search & Domain Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                placeholder={isVi ? 'Tìm theo mã hoặc tên khóa học...' : 'Search course code or title...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <select
              value={priceDomain}
              onChange={(e) => setPriceDomain(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            >
              <option value="all">{isVi ? 'Tất cả 6 miền năng lực' : 'All 6 Domains'}</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {isVi ? d.nameVi : d.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{isVi ? 'Khóa học' : 'Course'}</th>
                  <th className="py-2.5 px-3">{isVi ? 'Cấp độ' : 'Level'}</th>
                  <th className="py-2.5 px-3">{isVi ? 'Giá bán (VND)' : 'Sale Price (VND)'}</th>
                  <th className="py-2.5 px-3">{isVi ? 'Giá niêm yết gốc (tuỳ chọn)' : 'List Price (optional)'}</th>
                  <th className="py-2.5 px-3 text-center">{isVi ? 'Miễn phí' : 'Free'}</th>
                  <th className="py-2.5 px-3 text-right">{isVi ? 'Hiển thị' : 'Preview'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c) => {
                  const d = priceDrafts[c.id] || {
                    priceVnd: '990000',
                    originalPriceVnd: '',
                    isFree: false,
                    published: true,
                  };
                  const numPrice = d.isFree ? 0 : Math.max(0, Math.round(Number(d.priceVnd) || 0));
                  const numOrig = Math.max(0, Math.round(Number(d.originalPriceVnd) || 0));
                  const discountPct =
                    !d.isFree && numOrig > numPrice && numOrig > 0
                      ? Math.round(((numOrig - numPrice) / numOrig) * 100)
                      : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 max-w-[280px]">
                        <span className="font-mono font-extrabold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 mr-1.5">
                          {c.code}
                        </span>
                        <span className="font-bold text-slate-900">{isVi ? c.titleVi : c.titleEn}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {c.difficulty} · {c.durationHours}h
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          disabled={d.isFree}
                          value={d.isFree ? '0' : d.priceVnd}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...d, priceVnd: e.target.value },
                            }))
                          }
                          className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          disabled={d.isFree}
                          value={d.originalPriceVnd}
                          placeholder="—"
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...d, originalPriceVnd: e.target.value },
                            }))
                          }
                          className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-600 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={d.isFree}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...d, isFree: e.target.checked },
                            }))
                          }
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        {d.isFree || numPrice <= 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            {isVi ? 'MIỄN PHÍ' : 'FREE'}
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {discountPct > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold text-[10px]">
                                -{discountPct}%
                              </span>
                            )}
                            <span className="font-extrabold text-slate-900">{formatVnd(numPrice)}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: MULTI-COURSE COMBOS MANAGER                            */}
      {/* ================================================================= */}
      {subTab === 'combos' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isVi ? 'Quản Lý Gói Học Combo Nhiều Khóa' : 'Multi-Course Combo Packages'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isVi
                  ? 'Tạo các gói kết hợp nhiều khóa học giá ưu đãi. Khi học viên thanh toán QR gói Combo, toàn bộ các khóa trong gói sẽ tự động mở khóa cùng lúc.'
                  : 'Create discounted multi-course bundles. Purchasing a combo via QR automatically unlocks all included courses.'}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateCombo}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Tạo Gói Combo Mới' : 'Create New Combo'}</span>
            </button>
          </div>

          {siteAdminConfig.combos.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
              {isVi ? 'Chưa có gói Combo nào. Nhấn "Tạo Gói Combo Mới" để bắt đầu.' : 'No combo packages yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {siteAdminConfig.combos.map((cb) => {
                const retailSum = cb.courseIds.reduce((sum, cid) => {
                  const found = courses.find((c) => c.id === cid || c.code === cid);
                  return sum + (found ? getEffectiveCoursePricing(found).priceVnd : 0);
                }, 0);
                const savePct =
                  retailSum > cb.priceVnd && retailSum > 0
                    ? Math.round(((retailSum - cb.priceVnd) / retailSum) * 100)
                    : 0;
                return (
                  <div
                    key={cb.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      cb.isActive
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50 border-slate-200/70 opacity-75'
                    }`}
                  >
                    <div className="space-y-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#0A192F] text-amber-400 font-mono font-bold text-[10px]">
                            {cb.code}
                          </span>
                          {cb.badgeVi && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                              {isVi ? cb.badgeVi : cb.badgeEn || cb.badgeVi}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cb.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {cb.isActive ? (isVi ? 'Đang mở bán' : 'Active') : isVi ? 'Đang ẩn' : 'Hidden'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900">
                        {isVi ? cb.nameVi : cb.nameEn}
                      </h4>
                      <p className="text-slate-600 leading-relaxed">
                        {isVi ? cb.descriptionVi : cb.descriptionEn}
                      </p>

                      {/* Included Course Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cb.courseIds.map((cid) => {
                          const c = courses.find((x) => x.id === cid || x.code === cid);
                          return (
                            <span
                              key={cid}
                              className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/70 text-blue-800 font-mono text-[10px] font-bold"
                            >
                              {c ? `${c.code}` : cid}
                            </span>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-black font-mono text-slate-900">
                            {formatVnd(cb.priceVnd)}
                          </span>
                          {retailSum > cb.priceVnd && (
                            <span className="text-xs font-mono text-slate-400 line-through">
                              {formatVnd(retailSum)}
                            </span>
                          )}
                        </div>
                        {savePct > 0 && (
                          <span className="text-[11px] font-extrabold text-emerald-700">
                            {isVi ? `Tiết kiệm ${savePct}%` : `Save ${savePct}%`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleComboActive(cb.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                      >
                        {cb.isActive ? (isVi ? 'Tạm ẩn' : 'Disable') : isVi ? 'Kích hoạt bán' : 'Activate'}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditCombo(cb)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Sửa' : 'Edit'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCombo(cb.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Xoá' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: COUPONS / VOUCHERS                                     */}
      {/* ================================================================= */}
      {subTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSaveCoupon}
            className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs"
          >
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{isVi ? 'Tạo / Cập Nhật Mã Giảm Giá' : 'Create / Update Coupon'}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Mã Voucher *' : 'Code *'}</label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="TET2027"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Loại giảm' : 'Type'}</label>
                <select
                  value={couponForm.discountType}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, discountType: e.target.value as 'percent' | 'fixed_vnd' })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="percent">{isVi ? 'Theo phần trăm (%)' : 'Percent (%)'}</option>
                  <option value="fixed_vnd">{isVi ? 'Số tiền cố định (VND)' : 'Fixed VND'}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {couponForm.discountType === 'percent' ? (isVi ? 'Mức giảm (%)' : 'Percent') : isVi ? 'Giảm (VND)' : 'VND Off'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Đơn tối thiểu (VND)' : 'Min Order'}</label>
                <input
                  type="number"
                  min={0}
                  value={couponForm.minOrderVnd}
                  onChange={(e) => setCouponForm({ ...couponForm, minOrderVnd: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Giới hạn lượt dùng' : 'Max Uses'}</label>
                <input
                  type="number"
                  min={1}
                  value={couponForm.maxUses}
                  onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Ngày hết hạn' : 'Expiry Date'}</label>
                <input
                  type="date"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer"
            >
              {isVi ? 'Lưu Mã Giảm Giá' : 'Save Coupon'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">
                {isVi ? `Danh Sách Mã Giảm Giá (${coupons.length})` : `Active & Archived Coupons (${coupons.length})`}
              </h3>
              <button
                type="button"
                onClick={loadBillingAdminData}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBilling ? 'animate-spin' : ''}`} />
                <span>{isVi ? 'Tải lại' : 'Refresh'}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {coupons.map((cp) => (
                <div key={cp.code} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono font-extrabold">
                        {cp.code}
                      </code>
                      <span className="font-bold text-slate-900">
                        {cp.discountType === 'percent' ? `-${cp.discountValue}%` : `-${formatVnd(cp.discountValue)}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cp.isActive ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isVi ? 'Đơn tối thiểu:' : 'Min:'} {formatVnd(cp.minOrderVnd)} · {isVi ? 'Đã dùng:' : 'Used:'}{' '}
                      {cp.usedCount}
                      {cp.maxUses ? `/${cp.maxUses}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleCoupon(cp)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 font-bold cursor-pointer"
                    >
                      {cp.isActive ? (isVi ? 'Tắt' : 'Disable') : isVi ? 'Bật' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCoupon(cp.code)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 4: ORDERS & QR BANK RECONCILIATION                        */}
      {/* ================================================================= */}
      {subTab === 'orders' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isVi ? 'Đơn Hàng & Đối Soát Chuyển Khoản VietQR' : 'Orders & Bank Transfer Reconciliation'}
              </h3>
              <p className="text-slate-500 mt-0.5">
                {isVi ? 'Tổng doanh thu đã xác thực:' : 'Verified Paid Revenue:'}{' '}
                <strong className="font-mono text-emerald-700 text-sm">{formatVnd(totalPaidRevenue)}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="all">{isVi ? 'Tất cả trạng thái' : 'All Statuses'}</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
              <button
                type="button"
                onClick={loadBillingAdminData}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBilling ? 'animate-spin' : ''}`} />
                <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="py-8 text-center text-slate-400 italic">
              {isVi ? 'Chưa có đơn hàng nào khớp bộ lọc.' : 'No matching orders.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{isVi ? 'Mã đơn' : 'Order'}</th>
                    <th className="py-2.5 px-3">{isVi ? 'Học viên' : 'Customer'}</th>
                    <th className="py-2.5 px-3">{isVi ? 'Khóa học / Gói' : 'Item'}</th>
                    <th className="py-2.5 px-3 text-right">{isVi ? 'Tổng tiền' : 'Amount'}</th>
                    <th className="py-2.5 px-3 text-center">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="py-2.5 px-3 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ord.orderCode}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{ord.userName}</p>
                        <p className="text-[10px] text-slate-500">{ord.userEmail}</p>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {isVi ? ord.productNameVi : ord.productNameEn}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                        {formatVnd(ord.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ord.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {ord.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmOrder(ord.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isVi ? 'Duyệt CK' : 'Confirm'}</span>
                          </button>
                        )}
                        {ord.status === 'paid' && (
                          <button
                            type="button"
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
      )}

      {/* COMBO CREATE / EDIT MODAL */}
      {comboModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setComboModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveCombo}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingComboId
                  ? isVi
                    ? 'Chỉnh Sửa Gói Combo Khóa Học'
                    : 'Edit Course Combo Package'
                  : isVi
                  ? 'Tạo Gói Combo Nhiều Khóa Học Mới'
                  : 'Create Multi-Course Combo Package'}
              </h3>
              <button
                type="button"
                onClick={() => setComboModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Mã Combo *' : 'Combo Code *'}</label>
                <input
                  type="text"
                  required
                  value={comboForm.code}
                  onChange={(e) => setComboForm({ ...comboForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Tên Combo (Tiếng Việt) *' : 'Title (VI) *'}</label>
                <input
                  type="text"
                  required
                  value={comboForm.nameVi}
                  onChange={(e) => setComboForm({ ...comboForm, nameVi: e.target.value })}
                  placeholder="Ví dụ: Combo Làm Chủ Kế Toán Khách Sạn (3 Khóa)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Tên tiếng Anh (tuỳ chọn)' : 'Title (EN)'}</label>
                <input
                  type="text"
                  value={comboForm.nameEn}
                  onChange={(e) => setComboForm({ ...comboForm, nameEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Nhãn nổi bật (Badge)' : 'Promo Badge'}</label>
                <input
                  type="text"
                  value={comboForm.badgeVi}
                  onChange={(e) => setComboForm({ ...comboForm, badgeVi: e.target.value })}
                  placeholder="Tiết kiệm 35%"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Mô tả lợi ích gói Combo' : 'Description'}</label>
              <textarea
                rows={2}
                value={comboForm.descriptionVi}
                onChange={(e) => setComboForm({ ...comboForm, descriptionVi: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            {/* Course Multi-Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  {isVi
                    ? `Chọn các khóa học trong Combo (Đã chọn: ${comboForm.courseIds.length})`
                    : `Select Included Courses (${comboForm.courseIds.length} selected)`}
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {isVi ? 'Tổng giá mua lẻ:' : 'Retail sum:'}{' '}
                  <strong className="text-slate-900">{formatVnd(comboRetailTotal)}</strong>
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {courses.map((c) => {
                  const checked = comboForm.courseIds.includes(c.id);
                  const eff = getEffectiveCoursePricing(c);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleComboCourse(c.id)}
                      className={`p-2 rounded-lg border text-left flex items-start gap-2 cursor-pointer transition-all ${
                        checked
                          ? 'bg-amber-50 border-amber-400 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                          checked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-[10px] text-blue-700 flex items-center justify-between">
                          <span>{c.code}</span>
                          <span>{formatVnd(eff.priceVnd)}</span>
                        </div>
                        <p className="text-[11px] font-semibold truncate">{isVi ? c.titleVi : c.titleEn}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Giá bán Combo (VND) *' : 'Combo Price (VND) *'}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={10000}
                  value={comboForm.priceVnd}
                  onChange={(e) => setComboForm({ ...comboForm, priceVnd: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-extrabold text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Thời hạn (Ngày — để trống = Trọn đời)' : 'Duration Days (empty = Lifetime)'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={comboForm.durationDays}
                  onChange={(e) => setComboForm({ ...comboForm, durationDays: e.target.value })}
                  placeholder={isVi ? 'Trọn đời' : 'Lifetime'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comboForm.isActive}
                  onChange={(e) => setComboForm({ ...comboForm, isActive: e.target.checked })}
                  className="accent-emerald-600"
                />
                <span>{isVi ? 'Mở bán ngay trên trang web' : 'Publish immediately'}</span>
              </label>
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comboForm.featured}
                  onChange={(e) => setComboForm({ ...comboForm, featured: e.target.checked })}
                  className="accent-amber-500"
                />
                <span>{isVi ? 'Đánh dấu gói nổi bật (Featured)' : 'Highlight as Featured'}</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setComboModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 cursor-pointer"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer"
              >
                {isVi ? 'Lưu Gói Combo' : 'Save Combo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
