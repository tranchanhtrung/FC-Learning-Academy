import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SiteAdBanner, SiteAnnouncement, UserRole } from '../../types';
import {
  Bell,
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';

const ROLE_OPTIONS: Array<{ value: 'all' | UserRole; labelVi: string; labelEn: string }> = [
  { value: 'all', labelVi: 'Tất cả người dùng', labelEn: 'All Users' },
  { value: 'learner', labelVi: 'Học viên / Kế toán', labelEn: 'Learners' },
  { value: 'financial_controller', labelVi: 'Giám đốc Tài chính (FC)', labelEn: 'FC' },
  { value: 'general_manager', labelVi: 'Tổng Giám đốc (GM)', labelEn: 'GM' },
  { value: 'lnd_manager', labelVi: 'Quản lý L&D', labelEn: 'L&D Manager' },
];

const AD_THEMES: Record<SiteAdBanner['theme'], string> = {
  navy_gold: 'from-[#0A192F] via-[#13294B] to-[#1E3A8A] text-white border-amber-400/50',
  emerald: 'from-emerald-900 via-emerald-800 to-teal-900 text-white border-emerald-400/50',
  royal_blue: 'from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-400/50',
  crimson: 'from-rose-950 via-rose-900 to-slate-900 text-white border-rose-400/50',
};

export const AdminMarketingTab: React.FC = () => {
  const { siteAdminConfig, saveSiteAdminConfig, courses, currentUser, language, showToast } = useApp();
  const isVi = language === 'vi';

  const [subTab, setSubTab] = useState<'announcements' | 'ads'>('announcements');

  // =========================================================================
  // 1. ANNOUNCEMENTS / NOTIFICATIONS MODAL STATE
  // =========================================================================
  const [annModalOpen, setAnnModalOpen] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annForm, setAnnForm] = useState<{
    titleVi: string;
    titleEn: string;
    messageVi: string;
    messageEn: string;
    severity: SiteAnnouncement['severity'];
    targetRole: 'all' | UserRole;
    showTopBar: boolean;
    showInBell: boolean;
    ctaLabelVi: string;
    ctaTargetTab: string;
    isActive: boolean;
    expiresAt: string;
  }>({
    titleVi: '',
    titleEn: '',
    messageVi: '',
    messageEn: '',
    severity: 'info',
    targetRole: 'all',
    showTopBar: true,
    showInBell: true,
    ctaLabelVi: '',
    ctaTargetTab: '',
    isActive: true,
    expiresAt: '',
  });

  const openCreateAnn = () => {
    setEditingAnnId(null);
    setAnnForm({
      titleVi: '',
      titleEn: '',
      messageVi: '',
      messageEn: '',
      severity: 'info',
      targetRole: 'all',
      showTopBar: true,
      showInBell: true,
      ctaLabelVi: isVi ? 'Xem ngay' : 'View now',
      ctaTargetTab: 'courses',
      isActive: true,
      expiresAt: '',
    });
    setAnnModalOpen(true);
  };

  const openEditAnn = (a: SiteAnnouncement) => {
    setEditingAnnId(a.id);
    setAnnForm({
      titleVi: a.titleVi,
      titleEn: a.titleEn,
      messageVi: a.messageVi,
      messageEn: a.messageEn,
      severity: a.severity,
      targetRole: a.targetRoles[0] || 'all',
      showTopBar: a.showTopBar,
      showInBell: a.showInBell,
      ctaLabelVi: a.ctaLabelVi || '',
      ctaTargetTab: a.ctaTargetTab || '',
      isActive: a.isActive,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : '',
    });
    setAnnModalOpen(true);
  };

  const handleSaveAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.titleVi.trim() || !annForm.messageVi.trim()) {
      showToast(isVi ? 'Vui lòng nhập tiêu đề và nội dung thông báo.' : 'Enter announcement title & message.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const record: SiteAnnouncement = {
      id: editingAnnId || `ann_${Date.now()}`,
      titleVi: annForm.titleVi.trim(),
      titleEn: annForm.titleEn.trim() || annForm.titleVi.trim(),
      messageVi: annForm.messageVi.trim(),
      messageEn: annForm.messageEn.trim() || annForm.messageVi.trim(),
      severity: annForm.severity,
      targetRoles: [annForm.targetRole],
      showTopBar: annForm.showTopBar,
      showInBell: annForm.showInBell,
      ctaLabelVi: annForm.ctaLabelVi.trim() || undefined,
      ctaLabelEn: annForm.ctaLabelVi.trim() || undefined,
      ctaTargetTab: annForm.ctaTargetTab || undefined,
      isActive: annForm.isActive,
      expiresAt: annForm.expiresAt ? `${annForm.expiresAt}T23:59:59.000Z` : undefined,
      createdBy: currentUser.name,
      createdAt: editingAnnId
        ? siteAdminConfig.announcements.find((x) => x.id === editingAnnId)?.createdAt || now
        : now,
      updatedAt: now,
    };

    const ok = await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        announcements: editingAnnId
          ? prev.announcements.map((x) => (x.id === editingAnnId ? record : x))
          : [record, ...prev.announcements],
      }),
      isVi ? 'Đã đăng & đồng bộ thông báo toàn hệ thống!' : 'Published system announcement!'
    );
    if (ok) setAnnModalOpen(false);
  };

  const handleToggleAnn = async (id: string) => {
    await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        announcements: prev.announcements.map((a) =>
          a.id === id ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() } : a
        ),
      }),
      isVi ? 'Đã cập nhật trạng thái thông báo.' : 'Updated announcement visibility.'
    );
  };

  const handleDeleteAnn = async (id: string) => {
    await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        announcements: prev.announcements.filter((a) => a.id !== id),
      }),
      isVi ? 'Đã xoá thông báo.' : 'Deleted announcement.'
    );
  };

  // =========================================================================
  // 2. ADS / PROMOTIONAL BANNERS MODAL STATE
  // =========================================================================
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adForm, setAdForm] = useState<{
    titleVi: string;
    titleEn: string;
    subtitleVi: string;
    subtitleEn: string;
    badgeText: string;
    imageUrl: string;
    theme: SiteAdBanner['theme'];
    placement: SiteAdBanner['placement'];
    ctaLabelVi: string;
    ctaActionType: SiteAdBanner['ctaActionType'];
    ctaTarget: string;
    isActive: boolean;
    priority: string;
  }>({
    titleVi: '',
    titleEn: '',
    subtitleVi: '',
    subtitleEn: '',
    badgeText: 'ƯU ĐÃI ĐẶC BIỆT',
    imageUrl: '',
    theme: 'navy_gold',
    placement: 'courses_banner',
    ctaLabelVi: 'Khám Phá Ngay',
    ctaActionType: 'tab',
    ctaTarget: 'pricing',
    isActive: true,
    priority: '1',
  });

  const openCreateAd = () => {
    setEditingAdId(null);
    setAdForm({
      titleVi: '',
      titleEn: '',
      subtitleVi: '',
      subtitleEn: '',
      badgeText: 'FLASH SALE · USALI 12TH',
      imageUrl: '',
      theme: 'navy_gold',
      placement: 'courses_banner',
      ctaLabelVi: 'Nhận Ưu Đãi Ngay',
      ctaActionType: 'tab',
      ctaTarget: 'pricing',
      isActive: true,
      priority: '1',
    });
    setAdModalOpen(true);
  };

  const openEditAd = (ad: SiteAdBanner) => {
    setEditingAdId(ad.id);
    setAdForm({
      titleVi: ad.titleVi,
      titleEn: ad.titleEn,
      subtitleVi: ad.subtitleVi,
      subtitleEn: ad.subtitleEn,
      badgeText: ad.badgeText || '',
      imageUrl: ad.imageUrl || '',
      theme: ad.theme,
      placement: ad.placement,
      ctaLabelVi: ad.ctaLabelVi,
      ctaActionType: ad.ctaActionType,
      ctaTarget: ad.ctaTarget,
      isActive: ad.isActive,
      priority: String(ad.priority || 1),
    });
    setAdModalOpen(true);
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adForm.titleVi.trim()) {
      showToast(isVi ? 'Vui lòng nhập tiêu đề chiến dịch quảng cáo.' : 'Enter ad campaign title.', 'error');
      return;
    }
    const now = new Date().toISOString();
    const record: SiteAdBanner = {
      id: editingAdId || `ad_${Date.now()}`,
      titleVi: adForm.titleVi.trim(),
      titleEn: adForm.titleEn.trim() || adForm.titleVi.trim(),
      subtitleVi: adForm.subtitleVi.trim(),
      subtitleEn: adForm.subtitleEn.trim() || adForm.subtitleVi.trim(),
      badgeText: adForm.badgeText.trim() || undefined,
      imageUrl: adForm.imageUrl.trim() || undefined,
      theme: adForm.theme,
      placement: adForm.placement,
      ctaLabelVi: adForm.ctaLabelVi.trim() || (isVi ? 'Xem ngay' : 'View now'),
      ctaLabelEn: adForm.ctaLabelVi.trim() || 'View now',
      ctaActionType: adForm.ctaActionType,
      ctaTarget: adForm.ctaTarget.trim() || 'pricing',
      isActive: adForm.isActive,
      priority: Math.max(1, Math.round(Number(adForm.priority) || 1)),
      createdAt: editingAdId
        ? siteAdminConfig.ads.find((x) => x.id === editingAdId)?.createdAt || now
        : now,
      updatedAt: now,
    };

    const ok = await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        ads: editingAdId
          ? prev.ads.map((x) => (x.id === editingAdId ? record : x))
          : [record, ...prev.ads],
      }),
      isVi ? 'Đã lưu chiến dịch quảng cáo / Banner!' : 'Saved ad banner campaign!'
    );
    if (ok) setAdModalOpen(false);
  };

  const handleToggleAd = async (id: string) => {
    await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        ads: prev.ads.map((a) =>
          a.id === id ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() } : a
        ),
      }),
      isVi ? 'Đã cập nhật trạng thái quảng cáo.' : 'Updated ad status.'
    );
  };

  const handleDeleteAd = async (id: string) => {
    await saveSiteAdminConfig(
      (prev) => ({
        ...prev,
        ads: prev.ads.filter((a) => a.id !== id),
      }),
      isVi ? 'Đã xoá chiến dịch quảng cáo.' : 'Deleted ad banner.'
    );
  };

  const placementLabel = (p: SiteAdBanner['placement']) => {
    if (p === 'dashboard_banner') return isVi ? 'Banner Trang Chủ (Dashboard)' : 'Dashboard Banner';
    if (p === 'courses_banner') return isVi ? 'Banner Kho Khóa Học' : 'Course Catalog Banner';
    return isVi ? 'Popup Nổi Khuyến Mãi' : 'Promo Popup Modal';
  };

  return (
    <div className="space-y-5">
      {/* Sub-tab Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSubTab('announcements')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
            subTab === 'announcements' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>
            {isVi
              ? `Thông Báo Hệ Thống (${siteAdminConfig.announcements.length})`
              : `System Announcements (${siteAdminConfig.announcements.length})`}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ads')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
            subTab === 'ads' ? 'bg-[#0A192F] text-amber-400' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>
            {isVi
              ? `Quảng Cáo, Banner & Popup (${siteAdminConfig.ads.length})`
              : `Ads, Banners & Popups (${siteAdminConfig.ads.length})`}
          </span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* SUB-TAB 1: ANNOUNCEMENTS & BROADCAST NOTIFICATIONS                */}
      {/* ================================================================= */}
      {subTab === 'announcements' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isVi ? 'Quản Lý Thông Báo Toàn Trang & Chuông Thông Báo' : 'Global Announcements & Notification Bell'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isVi
                  ? 'Thông báo đang bật sẽ tự động ghim trên đầu màn hình làm việc và/hoặc gửi trực tiếp vào chuông thông báo theo đúng vai trò mục tiêu.'
                  : 'Active announcements render on the top announcement bar and/or push to targeted users’ notification bells.'}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateAnn}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Đăng Thông Báo Mới' : 'New Announcement'}</span>
            </button>
          </div>

          {siteAdminConfig.announcements.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
              {isVi
                ? 'Chưa có thông báo hệ thống nào. Nhấn "Đăng Thông Báo Mới" để gửi tin tới học viên.'
                : 'No system announcements yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {siteAdminConfig.announcements.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    a.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200/70 opacity-70'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.severity === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : a.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : a.severity === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {a.severity}
                      </span>
                      {a.showTopBar && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          Top Bar
                        </span>
                      )}
                      {a.showInBell && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          Bell
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {a.isActive ? (isVi ? 'Đang bật' : 'Live') : isVi ? 'Đang ẩn' : 'Hidden'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">{isVi ? a.titleVi : a.titleEn}</h4>
                    <p className="text-slate-600 leading-relaxed">{isVi ? a.messageVi : a.messageEn}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAnn(a.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                    >
                      {a.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{a.isActive ? (isVi ? 'Ẩn' : 'Hide') : isVi ? 'Bật' : 'Show'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditAnn(a)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAnn(a.id)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: ADS, PROMO BANNERS & POPUPS                            */}
      {/* ================================================================= */}
      {subTab === 'ads' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isVi ? 'Quản Lý Quảng Cáo, Banner Khuyến Mãi & Popup' : 'Promotional Ads, Banners & Popups'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isVi
                  ? 'Thiết kế Banner chạy trực tiếp trên Trang chủ (Dashboard), Kho khóa học hoặc Popup nổi dẫn thẳng học viên tới Gói Combo / Khóa học.'
                  : 'Publish promotional banners on Dashboard, Course Catalog, or dismissible Popups linked directly to Combos, Courses, or URLs.'}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateAd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Tạo Quảng Cáo / Banner' : 'Create Ad / Banner'}</span>
            </button>
          </div>

          {siteAdminConfig.ads.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
              {isVi
                ? 'Chưa có chiến dịch quảng cáo nào. Nhấn "Tạo Quảng Cáo / Banner" để tạo banner hiển thị ngay trên web.'
                : 'No active ad campaigns yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {siteAdminConfig.ads.map((ad) => (
                <div key={ad.id} className="space-y-2">
                  {/* Live Visual Preview of the Ad */}
                  <div
                    className={`p-5 rounded-2xl border bg-gradient-to-r shadow-sm ${AD_THEMES[ad.theme]} ${
                      !ad.isActive ? 'opacity-60 grayscale' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ad.badgeText && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase">
                              {ad.badgeText}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-white/15 text-white font-bold text-[10px]">
                            {placementLabel(ad.placement)}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm sm:text-base leading-snug">
                          {isVi ? ad.titleVi : ad.titleEn}
                        </h4>
                        {ad.subtitleVi && (
                          <p className="text-xs text-white/80 leading-relaxed">
                            {isVi ? ad.subtitleVi : ad.subtitleEn}
                          </p>
                        )}
                      </div>
                      {ad.imageUrl && (
                        <img
                          src={ad.imageUrl}
                          alt={ad.titleVi}
                          className="w-16 h-16 rounded-xl object-cover ring-1 ring-white/30 shrink-0"
                        />
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>CTA: {ad.ctaLabelVi}</span>
                      </span>
                      <span className="text-[10px] font-mono text-white/70">
                        {ad.ctaActionType}: {ad.ctaTarget}
                      </span>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span
                      className={`font-bold ${ad.isActive ? 'text-emerald-700' : 'text-slate-400'}`}
                    >
                      {ad.isActive ? (isVi ? '● Đang chạy live' : '● Live') : isVi ? '○ Đã tắt' : '○ Paused'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAd(ad.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                      >
                        {ad.isActive ? (isVi ? 'Tạm dừng' : 'Pause') : isVi ? 'Bật chạy' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditAd(ad)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                      >
                        {isVi ? 'Sửa' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAd(ad.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {annModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAnnModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveAnn}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingAnnId
                  ? isVi
                    ? 'Chỉnh Sửa Thông Báo'
                    : 'Edit Announcement'
                  : isVi
                  ? 'Đăng Thông Báo Toàn Hệ Thống'
                  : 'Create System Announcement'}
              </h3>
              <button type="button" onClick={() => setAnnModalOpen(false)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Tiêu đề thông báo *' : 'Title *'}</label>
              <input
                type="text"
                required
                value={annForm.titleVi}
                onChange={(e) => setAnnForm({ ...annForm, titleVi: e.target.value })}
                placeholder="Ví dụ: Khai giảng khóa USALI 12th tháng 12 — Ưu đãi giảm 15%"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Nội dung chi tiết *' : 'Message *'}</label>
              <textarea
                rows={3}
                required
                value={annForm.messageVi}
                onChange={(e) => setAnnForm({ ...annForm, messageVi: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Mức độ hiển thị' : 'Severity'}</label>
                <select
                  value={annForm.severity}
                  onChange={(e) => setAnnForm({ ...annForm, severity: e.target.value as SiteAnnouncement['severity'] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="info">{isVi ? 'Thông tin (Xanh dương)' : 'Info (Blue)'}</option>
                  <option value="success">{isVi ? 'Tin vui / Ra mắt (Xanh lá)' : 'Success (Green)'}</option>
                  <option value="warning">{isVi ? 'Lưu ý / Nhắc nhở (Vàng)' : 'Warning (Amber)'}</option>
                  <option value="urgent">{isVi ? 'Khẩn cấp / Quan trọng (Đỏ)' : 'Urgent (Red)'}</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Đối tượng nhận' : 'Target Audience'}</label>
                <select
                  value={annForm.targetRole}
                  onChange={(e) => setAnnForm({ ...annForm, targetRole: e.target.value as 'all' | UserRole })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {isVi ? r.labelVi : r.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Nút chuyển trang (tuỳ chọn)' : 'CTA Label'}</label>
                <input
                  type="text"
                  value={annForm.ctaLabelVi}
                  onChange={(e) => setAnnForm({ ...annForm, ctaLabelVi: e.target.value })}
                  placeholder="Xem khóa học"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Đích đến khi nhấn nút' : 'CTA Target'}</label>
                <select
                  value={annForm.ctaTargetTab}
                  onChange={(e) => setAnnForm({ ...annForm, ctaTargetTab: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">{isVi ? 'Không có' : 'None'}</option>
                  <option value="courses">{isVi ? 'Kho Khóa Học' : 'Course Catalog'}</option>
                  <option value="pricing">{isVi ? 'Gói Học & Thanh Toán' : 'Pricing & Billing'}</option>
                  <option value="ojtProjects">{isVi ? 'Dự Án OJT' : 'OJT Projects'}</option>
                  <option value="simDashboard">{isVi ? 'GM Simulator' : 'GM Simulator'}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annForm.showTopBar}
                  onChange={(e) => setAnnForm({ ...annForm, showTopBar: e.target.checked })}
                  className="accent-amber-500"
                />
                <span>{isVi ? 'Ghim thanh thông báo đầu trang' : 'Pin to Top Bar'}</span>
              </label>
              <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annForm.showInBell}
                  onChange={(e) => setAnnForm({ ...annForm, showInBell: e.target.checked })}
                  className="accent-amber-500"
                />
                <span>{isVi ? 'Gửi vào Chuông thông báo' : 'Push to Notification Bell'}</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAnnModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold cursor-pointer"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer"
              >
                {isVi ? 'Lưu & Phát Sóng' : 'Save & Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AD / BANNER MODAL */}
      {adModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveAd}
            className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingAdId
                  ? isVi
                    ? 'Chỉnh Sửa Banner Quảng Cáo'
                    : 'Edit Promo Banner'
                  : isVi
                  ? 'Tạo Banner Quảng Cáo / Popup Khuyến Mãi'
                  : 'Create Promo Banner / Popup'}
              </h3>
              <button type="button" onClick={() => setAdModalOpen(false)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Vị trí hiển thị' : 'Placement'}</label>
                <select
                  value={adForm.placement}
                  onChange={(e) => setAdForm({ ...adForm, placement: e.target.value as SiteAdBanner['placement'] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="courses_banner">{isVi ? 'Banner Kho Khóa Học' : 'Course Catalog Banner'}</option>
                  <option value="dashboard_banner">{isVi ? 'Banner Trang Chủ (Dashboard)' : 'Dashboard Banner'}</option>
                  <option value="popup_modal">{isVi ? 'Popup Nổi Khi Vào Trang' : 'Promo Popup Modal'}</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Tông màu thiết kế' : 'Theme'}</label>
                <select
                  value={adForm.theme}
                  onChange={(e) => setAdForm({ ...adForm, theme: e.target.value as SiteAdBanner['theme'] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="navy_gold">Navy &amp; Gold (Luxury)</option>
                  <option value="emerald">Emerald Pro</option>
                  <option value="royal_blue">Royal Blue</option>
                  <option value="crimson">Crimson Flash Sale</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Nhãn Badge' : 'Badge'}</label>
                <input
                  type="text"
                  value={adForm.badgeText}
                  onChange={(e) => setAdForm({ ...adForm, badgeText: e.target.value })}
                  placeholder="FLASH SALE"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Tiêu đề chiến dịch *' : 'Headline *'}</label>
                <input
                  type="text"
                  required
                  value={adForm.titleVi}
                  onChange={(e) => setAdForm({ ...adForm, titleVi: e.target.value })}
                  placeholder="Ưu đãi Combo 5 Khóa AFC giảm 38% trong tuần này!"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Mô tả ngắn' : 'Subtitle'}</label>
              <textarea
                rows={2}
                value={adForm.subtitleVi}
                onChange={(e) => setAdForm({ ...adForm, subtitleVi: e.target.value })}
                placeholder="Nhập mã LAUNCH2026 giảm thêm 15% khi quét mã VietQR mở khóa ngay."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {isVi ? 'URL Hình ảnh minh họa (tuỳ chọn)' : 'Image URL (optional)'}
              </label>
              <input
                type="url"
                value={adForm.imageUrl}
                onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Chữ trên nút CTA' : 'CTA Button Label'}</label>
                <input
                  type="text"
                  value={adForm.ctaLabelVi}
                  onChange={(e) => setAdForm({ ...adForm, ctaLabelVi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Hành động khi bấm' : 'CTA Action'}</label>
                <select
                  value={adForm.ctaActionType}
                  onChange={(e) => {
                    const nextType = e.target.value as SiteAdBanner['ctaActionType'];
                    setAdForm({
                      ...adForm,
                      ctaActionType: nextType,
                      ctaTarget:
                        nextType === 'combo'
                          ? siteAdminConfig.combos[0]?.id || ''
                          : nextType === 'course'
                          ? courses[0]?.id || ''
                          : nextType === 'tab'
                          ? 'pricing'
                          : '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="tab">{isVi ? 'Mở Phân hệ trên web' : 'Open App Tab'}</option>
                  <option value="combo">{isVi ? 'Mua ngay 1 Gói Combo' : 'Buy Specific Combo'}</option>
                  <option value="course">{isVi ? 'Ghi danh 1 Khóa học' : 'Buy Specific Course'}</option>
                  <option value="external_url">{isVi ? 'Mở Liên kết ngoài' : 'External URL'}</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isVi ? 'Đích đến' : 'Target'}</label>
                {adForm.ctaActionType === 'combo' ? (
                  <select
                    value={adForm.ctaTarget}
                    onChange={(e) => setAdForm({ ...adForm, ctaTarget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {siteAdminConfig.combos.map((cb) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.code} — {cb.nameVi}
                      </option>
                    ))}
                  </select>
                ) : adForm.ctaActionType === 'course' ? (
                  <select
                    value={adForm.ctaTarget}
                    onChange={(e) => setAdForm({ ...adForm, ctaTarget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.titleVi}
                      </option>
                    ))}
                  </select>
                ) : adForm.ctaActionType === 'tab' ? (
                  <select
                    value={adForm.ctaTarget}
                    onChange={(e) => setAdForm({ ...adForm, ctaTarget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="pricing">{isVi ? 'Gói Học & Thanh Toán' : 'Pricing & Billing'}</option>
                    <option value="courses">{isVi ? 'Kho Khóa Học' : 'Course Catalog'}</option>
                    <option value="simDashboard">{isVi ? 'GM Simulator' : 'GM Simulator'}</option>
                    <option value="aiAssistant">{isVi ? 'Trợ Lý AI' : 'AI Assistant'}</option>
                  </select>
                ) : (
                  <input
                    type="url"
                    value={adForm.ctaTarget}
                    onChange={(e) => setAdForm({ ...adForm, ctaTarget: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAdModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold cursor-pointer"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isVi ? 'Lưu & Chạy Quảng Cáo' : 'Save & Launch Ad'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
