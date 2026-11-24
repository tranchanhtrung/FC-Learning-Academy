import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { SiteAdBanner, SiteAnnouncement } from '../../types';
import {
  Megaphone,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Info,
  X,
  ArrowRight,
  ExternalLink,
  Wrench,
  Tag,
} from 'lucide-react';

function isWithinDateWindow(startsAt?: string, expiresAt?: string): boolean {
  const now = Date.now();
  if (startsAt) {
    const startMs = Date.parse(startsAt);
    if (!Number.isNaN(startMs) && now < startMs) return false;
  }
  if (expiresAt) {
    const endMs = Date.parse(expiresAt);
    if (!Number.isNaN(endMs) && now > endMs) return false;
  }
  return true;
}

function useAdActionHandler() {
  const {
    setActiveTab,
    courses,
    siteAdminConfig,
    startCourseCheckout,
    startComboCheckout,
    hasCourseAccess,
    enrollCourse,
    setSelectedCourseForPlayer,
  } = useApp();

  return (actionType: SiteAdBanner['ctaActionType'], actionTarget: string, onDone?: () => void) => {
    const val = (actionTarget || '').trim();
    if (!val) {
      onDone?.();
      return;
    }
    if (actionType === 'external_url') {
      window.open(val, '_blank', 'noopener,noreferrer');
      onDone?.();
      return;
    }
    if (actionType === 'combo') {
      const combo = (siteAdminConfig.combos || []).find((c) => c.id === val || c.code === val);
      if (combo) {
        startComboCheckout(combo);
      } else {
        setActiveTab('courses');
      }
      onDone?.();
      return;
    }
    if (actionType === 'course') {
      const course = courses.find((c) => c.id === val || c.code === val);
      if (course) {
        if (hasCourseAccess(course)) {
          void enrollCourse(course.id);
          setSelectedCourseForPlayer(course);
        } else {
          startCourseCheckout(course);
        }
      } else {
        setActiveTab('courses');
      }
      onDone?.();
      return;
    }
    setActiveTab(val);
    onDone?.();
  };
}

export const GlobalAnnouncementBanner: React.FC = () => {
  const { siteAdminConfig, currentUser, language, setActiveTab } = useApp();
  const isVi = language === 'vi';
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const raw = window.sessionStorage.getItem('fc_dismissed_announcements');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const activeTopBars = useMemo(() => {
    return (siteAdminConfig.announcements || []).filter((a) => {
      if (!a.isActive || !a.showTopBar) return false;
      if (dismissedIds.includes(a.id)) return false;
      if (!isWithinDateWindow(a.startsAt, a.expiresAt)) return false;
      if (
        a.targetRoles &&
        a.targetRoles.length > 0 &&
        !a.targetRoles.includes('all') &&
        !a.targetRoles.includes(currentUser.role)
      ) {
        return false;
      }
      return true;
    });
  }, [siteAdminConfig.announcements, dismissedIds, currentUser.role]);

  const dismissAnnouncement = (id: string) => {
    setDismissedIds((prev) => {
      const next = Array.from(new Set([...prev, id]));
      try {
        window.sessionStorage.setItem('fc_dismissed_announcements', JSON.stringify(next));
      } catch {
        // ignore storage restrictions
      }
      return next;
    });
  };

  const handleCta = (ann: SiteAnnouncement) => {
    if (ann.ctaUrl && /^https?:\/\//i.test(ann.ctaUrl)) {
      window.open(ann.ctaUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (ann.ctaTargetTab) {
      setActiveTab(ann.ctaTargetTab);
    }
  };

  const showMaintenance = Boolean(siteAdminConfig.general?.maintenanceMode);

  if (!showMaintenance && activeTopBars.length === 0) return null;

  return (
    <div className="space-y-2.5 mb-5">
      {showMaintenance && (
        <div className="rounded-2xl bg-amber-950 text-amber-100 border border-amber-500/50 px-4 py-3 flex items-start sm:items-center gap-3 text-xs shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-amber-200 uppercase tracking-wider text-[10px]">
              {isVi ? 'Thông Báo Bảo Trì Hệ Thống' : 'Scheduled System Maintenance'}
            </p>
            <p className="font-medium text-amber-50 leading-relaxed mt-0.5">
              {siteAdminConfig.general.maintenanceMessageVi ||
                (isVi
                  ? 'Hệ thống đang được bảo trì định kỳ. Một số tính năng có thể tạm gián đoạn.'
                  : 'System maintenance is currently active. Some services may be briefly unavailable.')}
            </p>
          </div>
        </div>
      )}

      {activeTopBars.map((ann) => {
        const isUrgent = ann.severity === 'urgent';
        const tone = isUrgent
          ? 'bg-gradient-to-r from-[#0A192F] via-[#13294B] to-rose-950 text-white border-rose-400/50'
          : ann.severity === 'warning'
          ? 'bg-amber-50 text-amber-950 border-amber-300'
          : ann.severity === 'success'
          ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
          : 'bg-blue-50 text-blue-950 border-blue-200';

        const Icon = isUrgent
          ? Sparkles
          : ann.severity === 'warning'
          ? AlertTriangle
          : ann.severity === 'success'
          ? CheckCircle2
          : Info;

        const hasAction = Boolean(ann.ctaLabelVi && (ann.ctaTargetTab || ann.ctaUrl));

        return (
          <div
            key={ann.id}
            className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${tone}`}
          >
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUrgent
                    ? 'bg-amber-400/20 text-amber-300'
                    : ann.severity === 'warning'
                    ? 'bg-amber-200/70 text-amber-800'
                    : ann.severity === 'success'
                    ? 'bg-emerald-200/70 text-emerald-800'
                    : 'bg-blue-200/70 text-blue-800'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold leading-snug">
                  {isVi ? ann.titleVi : ann.titleEn || ann.titleVi}
                </p>
                <p
                  className={`text-[11px] leading-relaxed mt-0.5 ${
                    isUrgent ? 'text-slate-200' : 'opacity-85'
                  }`}
                >
                  {isVi ? ann.messageVi : ann.messageEn || ann.messageVi}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {hasAction && (
                <button
                  type="button"
                  onClick={() => handleCta(ann)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold text-[11px] cursor-pointer transition-colors ${
                    isUrgent
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{isVi ? ann.ctaLabelVi : ann.ctaLabelEn || ann.ctaLabelVi}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissAnnouncement(ann.id)}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  isUrgent
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                }`}
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface PromoAdSlotProps {
  placement: 'dashboard_banner' | 'courses_banner';
}

export const PromoAdSlot: React.FC<PromoAdSlotProps> = ({ placement }) => {
  const { siteAdminConfig, language } = useApp();
  const isVi = language === 'vi';
  const handleAction = useAdActionHandler();

  const ads = useMemo(() => {
    return (siteAdminConfig.ads || [])
      .filter((ad) => ad.isActive && ad.placement === placement)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [siteAdminConfig.ads, placement]);

  if (ads.length === 0) return null;

  return (
    <div className="space-y-3">
      {ads.map((ad) => {
        const themeClasses =
          ad.theme === 'emerald'
            ? 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white border-emerald-500/40'
            : ad.theme === 'royal_blue'
            ? 'bg-gradient-to-r from-indigo-950 via-blue-900 to-sky-900 text-white border-blue-400/40'
            : ad.theme === 'crimson'
            ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-red-900 text-white border-rose-400/40'
            : 'bg-gradient-to-r from-[#0A192F] via-[#122B4E] to-[#1E3A8A] text-white border-amber-400/40';

        const btnClasses =
          ad.theme === 'emerald'
            ? 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950'
            : ad.theme === 'royal_blue'
            ? 'bg-white hover:bg-blue-50 text-blue-950'
            : ad.theme === 'crimson'
            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950';

        return (
          <div
            key={ad.id}
            className={`rounded-2xl border p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative ${themeClasses}`}
          >
            <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
              {ad.imageUrl ? (
                <img
                  src={ad.imageUrl}
                  alt={isVi ? ad.titleVi : ad.titleEn}
                  className="w-20 h-16 sm:w-24 sm:h-18 rounded-xl object-cover border border-white/15 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Megaphone className="w-6 h-6 text-amber-300" />
                </div>
              )}

              <div className="min-w-0 space-y-1">
                {ad.badgeText && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                    <Tag className="w-3 h-3" />
                    {ad.badgeText}
                  </span>
                )}
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight leading-snug">
                  {isVi ? ad.titleVi : ad.titleEn || ad.titleVi}
                </h3>
                <p className="text-xs text-slate-200/90 leading-relaxed max-w-2xl">
                  {isVi ? ad.subtitleVi : ad.subtitleEn || ad.subtitleVi}
                </p>
              </div>
            </div>

            {ad.ctaLabelVi && (
              <button
                type="button"
                onClick={() => handleAction(ad.ctaActionType, ad.ctaTarget)}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-sm cursor-pointer shrink-0 transition-all ${btnClasses}`}
              >
                <span>{isVi ? ad.ctaLabelVi : ad.ctaLabelEn || ad.ctaLabelVi}</span>
                {ad.ctaActionType === 'external_url' ? (
                  <ExternalLink className="w-3.5 h-3.5" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const PromoPopupModal: React.FC = () => {
  const { siteAdminConfig, language } = useApp();
  const isVi = language === 'vi';
  const handleAction = useAdActionHandler();
  const [closedIds, setClosedIds] = useState<string[]>([]);

  const activePopup = useMemo(() => {
    const candidates = (siteAdminConfig.ads || [])
      .filter((ad) => ad.isActive && ad.placement === 'popup_modal')
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return (
      candidates.find((ad) => {
        if (closedIds.includes(ad.id)) return false;
        try {
          if (window.sessionStorage.getItem(`fc_dismissed_popup_${ad.id}`) === '1') {
            return false;
          }
        } catch {
          // ignore
        }
        return true;
      }) || null
    );
  }, [siteAdminConfig.ads, closedIds]);

  const dismissPopup = (id: string) => {
    setClosedIds((prev) => [...prev, id]);
    try {
      window.sessionStorage.setItem(`fc_dismissed_popup_${id}`, '1');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!activePopup) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissPopup(activePopup.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePopup]);

  if (!activePopup) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismissPopup(activePopup.id);
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-br from-[#0A192F] via-[#13294B] to-[#1E3A8A] p-6 text-white relative">
          <button
            type="button"
            onClick={() => dismissPopup(activePopup.id)}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          {activePopup.badgeText && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider mb-3">
              <Sparkles className="w-3 h-3" />
              {activePopup.badgeText}
            </span>
          )}
          <h3 className="text-xl font-extrabold tracking-tight leading-snug pr-6">
            {isVi ? activePopup.titleVi : activePopup.titleEn || activePopup.titleVi}
          </h3>
        </div>

        {activePopup.imageUrl && (
          <div className="h-44 w-full overflow-hidden bg-slate-100">
            <img
              src={activePopup.imageUrl}
              alt={isVi ? activePopup.titleVi : activePopup.titleEn}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            {isVi ? activePopup.subtitleVi : activePopup.subtitleEn || activePopup.subtitleVi}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => dismissPopup(activePopup.id)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              {isVi ? 'Để sau' : 'Maybe later'}
            </button>
            {activePopup.ctaLabelVi && (
              <button
                type="button"
                onClick={() =>
                  handleAction(activePopup.ctaActionType, activePopup.ctaTarget, () =>
                    dismissPopup(activePopup.id)
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>{isVi ? activePopup.ctaLabelVi : activePopup.ctaLabelEn || activePopup.ctaLabelVi}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
