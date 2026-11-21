import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { useApp } from '../../context/AppContext';
import confetti from 'canvas-confetti';
import {
  X,
  Send,
  Compass,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  MapPin,
  HelpCircle,
} from 'lucide-react';

interface ChatAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface BotMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  actions?: ChatAction[];
  time: string;
}

interface TourStep {
  id: string;
  /** Primary element highlighted with pulsing amber spotlight ring */
  targetSelector?: string;
  /** Optional mobile fallback selector when desktop target is hidden */
  mobileSelector?: string;
  /** Keep live workspace clearly visible alongside the glowing sidebar button */
  keepWorkspaceClear?: boolean;
  tabToOpen?: string;
  badgeVi: string;
  badgeEn: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  tipVi: string;
  tipEn: string;
  requiredTab?: string;
}

interface BoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const TEASER_DISMISSED_KEY = 'fc_finny_teaser_dismissed_v1';
const TOUR_DONE_KEY = 'fc_finny_tour_completed_v1';

/** Expressive custom Finny concierge mascot SVG (Navy + Warm Gold) with blink, antenna glow & waving hand */
const FinnyAvatar: React.FC<{
  size?: number;
  animated?: boolean;
  mood?: 'idle' | 'happy' | 'waving' | 'thinking';
  className?: string;
}> = ({ size = 44, animated = false, mood = 'idle', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    {/* Glowing Antenna */}
    <line x1="32" y1="15" x2="32" y2="8.5" stroke="#F59E0B" strokeWidth="2.8" strokeLinecap="round" />
    <g className={animated ? 'finny-antenna-pulse' : ''}>
      <circle cx="32" cy="7" r="4.2" fill="#FCD34D" />
      <circle cx="30.8" cy="5.8" r="1.4" fill="#FFFBEB" />
    </g>

    {/* Concierge Mini Cap */}
    <path d="M20 17C20 13.5 25.4 11 32 11C38.6 11 44 13.5 44 17H20Z" fill="#D97706" />
    <rect x="18" y="16" width="28" height="3.2" rx="1.6" fill="#FBBF24" />

    {/* Cute Ear Pods */}
    <rect x="6" y="29" width="6" height="12" rx="3" fill="#F59E0B" />
    <rect x="52" y="29" width="6" height="12" rx="3" fill="#F59E0B" />

    {/* Waving Mini Arm when mood is waving or happy */}
    {(mood === 'waving' || mood === 'happy') && (
      <g className={animated ? 'finny-hand-wave' : ''}>
        <path
          d="M52 46C55.5 43.5 58 40 58.5 36.5"
          stroke="#F59E0B"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="58.8" cy="35.2" r="2.6" fill="#FDE68A" stroke="#D97706" strokeWidth="1" />
      </g>
    )}

    {/* Rounded Head Shell */}
    <rect x="11" y="18" width="42" height="35" rx="16" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.2" />

    {/* Inner Face Visor Screen */}
    <rect x="16" y="24" width="32" height="23" rx="10" fill="#1E293B" />

    {/* Expressive Eyes */}
    {mood === 'happy' ? (
      <g>
        <path d="M22.2 35C23.4 32 27.6 32 28.8 35" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M35.2 35C36.4 32 40.6 32 41.8 35" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    ) : (
      <g className={animated ? 'finny-eyes-blink' : ''}>
        <circle cx="25.5" cy="34" r="3.6" fill="#38BDF8" />
        <circle cx="24.4" cy="32.7" r="1.25" fill="#FFFFFF" />
        <circle cx="38.5" cy="34" r="3.6" fill="#38BDF8" />
        <circle cx="37.4" cy="32.7" r="1.25" fill="#FFFFFF" />
      </g>
    )}

    {/* Rosy Cheeks */}
    <ellipse cx="20.5" cy="39.2" rx="2.7" ry="1.5" fill="#FB7185" fillOpacity="0.7" />
    <ellipse cx="43.5" cy="39.2" rx="2.7" ry="1.5" fill="#FB7185" fillOpacity="0.7" />

    {/* Mouth */}
    {mood === 'thinking' ? (
      <circle cx="32" cy="40.5" r="2" fill="#FCD34D" />
    ) : (
      <path
        d="M27.2 39.6C29 42.4 35 42.4 36.8 39.6"
        stroke="#FCD34D"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    )}

    {/* Tiny Gold Bowtie */}
    <path d="M26 54.5L32 57.5L26 60.5V54.5Z" fill="#F59E0B" />
    <path d="M38 54.5L32 57.5L38 60.5V54.5Z" fill="#F59E0B" />
    <circle cx="32" cy="57.5" r="2.1" fill="#FDE68A" />
  </svg>
);

export const OnboardingBotWidget: React.FC = () => {
  const {
    language,
    currentUser,
    activeTab,
    setActiveTab,
    canAccessRoute,
    openAuthModal,
    t,
  } = useApp();

  const isVi = language === 'vi';
  const maskId = `finny-spotlight-mask-${useId().replace(/:/g, '')}`;

  const [panelOpen, setPanelOpen] = useState(false);
  const [widgetTab, setWidgetTab] = useState<'guide' | 'chat'>('guide');
  const [launcherHover, setLauncherHover] = useState(false);
  const [showTeaser, setShowTeaser] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TEASER_DISMISSED_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [tourCompleted, setTourCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TOUR_DONE_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Guided Spotlight Tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIdx, setTourStepIdx] = useState(0);
  const [primaryRect, setPrimaryRect] = useState<BoxRect | null>(null);
  const [workspaceRect, setWorkspaceRect] = useState<BoxRect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Role-aware guided tour steps highlighting exact Sidebar/Navbar controls while showing live workspace preview
  const tourSteps: TourStep[] = useMemo(() => {
    const simTab = canAccessRoute('aiAssistant') ? 'aiAssistant' : 'simDashboard';
    const raw: TourStep[] = [
      {
        id: 'welcome',
        badgeVi: 'Chào mừng',
        badgeEn: 'Welcome',
        titleVi: 'Chào mừng đến với FC Learning Academy!',
        titleEn: 'Welcome to FC Learning Academy!',
        descVi:
          'Mình là Finny — trợ lý dẫn đường của bạn. Trong chưa đầy 1 phút, mình sẽ chiếu sáng đúng từng nút menu bên trái và mở trực tiếp khu vực tương ứng bên phải để bạn làm chủ toàn bộ hệ thống ngay lập tức!',
        descEn:
          "I'm Finny — your onboarding guide. In under 1 minute, I'll spotlight each navigation button on the left while previewing its live workspace on the right!",
        tipVi: 'Mẹo: Dùng phím mũi tên ← / → để chuyển bước nhanh, hoặc nhấn Esc để đóng bất cứ lúc nào.',
        tipEn: 'Tip: Use ← / → arrow keys to step through, or press Esc anytime to close.',
      },
      {
        id: 'navbar',
        targetSelector: '[data-tour="navbar-auth"]',
        badgeVi: 'Bước 1 · Thanh điều khiển',
        badgeEn: 'Step 1 · Top Controls',
        titleVi: 'Đăng Nhập, Ngôn Ngữ & Đổi 5 Vai Trò',
        titleEn: 'Sign In, Language & 5-Role Switcher',
        descVi:
          'Thanh trên cùng giúp bạn Đăng nhập / Đăng ký tài khoản bảo mật, đổi Tiếng Việt ↔ English, xem thông báo học tập và bấm vào ảnh đại diện để trải nghiệm 5 vai trò (Học viên, FC, GM, L&D, Admin).',
        descEn:
          'Sign in or register an account, switch Vietnamese ↔ English, inspect notifications, or click your avatar to preview all 5 RBAC roles.',
        tipVi: 'Mẹo: Hệ thống hỗ trợ đăng nhập ngay bằng Tài Khoản Học Viện (mật khẩu mẫu: FCAcademy@2026).',
        tipEn: 'Tip: Use Academy Account to sign in or register locally right away (demo password: FCAcademy@2026).',
      },
      {
        id: 'dashboard',
        targetSelector: '[data-tour="nav-dashboard"]',
        mobileSelector: '[data-tour="mobile-menu-btn"]',
        keepWorkspaceClear: true,
        tabToOpen: 'dashboard',
        requiredTab: 'dashboard',
        badgeVi: 'Khu vực 1 · Tổng quan',
        badgeEn: 'Zone 1 · Overview',
        titleVi: 'Bảng Điều Khiển & Biểu Đồ Radar',
        titleEn: 'Dashboard & Competency Radar',
        descVi:
          'Nút menu đang phát sáng bên trái mở Bảng Điều Khiển — nơi bạn theo dõi 4 chỉ số KPI, biểu đồ Radar 6 miền năng lực USALI, khóa học đang học và danh sách nhiệm vụ IDP ưu tiên.',
        descEn:
          'This glowing menu button opens your Dashboard — showing KPI metrics, the 6-domain USALI Radar chart, active courses, and top IDP priorities.',
        tipVi: 'Mẹo: Bạn có thể bấm thẳng "Học tiếp" ngay từ các thẻ khóa học trên Dashboard.',
        tipEn: 'Tip: Click "Continue" on any course card right from the Dashboard to jump into lessons.',
      },
      {
        id: 'courses',
        targetSelector: '[data-tour="nav-courses"]',
        mobileSelector: '[data-tour="mobile-menu-btn"]',
        keepWorkspaceClear: true,
        tabToOpen: 'courses',
        requiredTab: 'courses',
        badgeVi: 'Khu vực 2 · Đào tạo',
        badgeEn: 'Zone 2 · Curriculum',
        titleVi: 'Thư Viện 18 Khóa Học & Học Liệu USALI',
        titleEn: '18 USALI Courses & Learning Materials',
        descVi:
          'Nơi tập trung 18 chuyên đề chuẩn Marriott/IHG/Accor chia theo 6 miền năng lực. Mỗi khóa có đề cương chi tiết, tài liệu Word/Excel/PDF xem trực tiếp và bài kiểm tra trắc nghiệm cuối khóa.',
        descEn:
          'Explore 18 structured hospitality finance courses across 6 domains with syllabi, inline Word/Excel/PDF previews, and end-of-course quizzes.',
        tipVi: 'Mẹo: Dùng thanh lọc theo Miền năng lực (D1–D6) để chọn đúng khóa bạn đang cần.',
        tipEn: 'Tip: Filter by competency domain (D1–D6) or difficulty to find your starting course.',
      },
      {
        id: 'assessments',
        targetSelector: '[data-tour="nav-assessments"]',
        mobileSelector: '[data-tour="mobile-menu-btn"]',
        keepWorkspaceClear: true,
        tabToOpen: 'assessments',
        requiredTab: 'assessments',
        badgeVi: 'Khu vực 3 · Năng lực & IDP',
        badgeEn: 'Zone 3 · Assessments & IDP',
        titleVi: 'Đánh Giá Khoảng Trống & Kế Hoạch IDP',
        titleEn: 'Competency Gap Matrix & IDP',
        descVi:
          'Tự đánh giá năng lực từ Cấp 1 đến Cấp 4 và đối chiếu với thẩm định của Giám đốc Tài chính (FC). Hệ thống tự tính khoảng trống kỹ năng và đề xuất Kế hoạch Phát triển Cá nhân (IDP).',
        descEn:
          'Self-assess Level 1–4 proficiency, compare with your Financial Controller ratings, and auto-generate an Individual Development Plan (IDP).',
        tipVi: 'Mẹo: Chuyển 3 chế độ Radar (Chuẩn vs FC, Chuẩn vs Tự ĐG, Độ Lệch Nhận Thức) để nhìn rõ điểm yếu.',
        tipEn: 'Tip: Toggle the 3 Radar modes (Target vs FC, Target vs Self, Perception Gap) to spot blind spots.',
      },
      {
        id: 'ojt',
        targetSelector: '[data-tour="nav-ojtProjects"]',
        mobileSelector: '[data-tour="mobile-menu-btn"]',
        keepWorkspaceClear: true,
        tabToOpen: 'ojtProjects',
        requiredTab: 'ojtProjects',
        badgeVi: 'Khu vực 4 · Thực chiến',
        badgeEn: 'Zone 4 · Real-World OJT',
        titleVi: 'Dự Án Thực Tập OJT Khách Sạn 5 Sao',
        titleEn: '5-Star Hotel OJT Projects',
        descVi:
          'Áp dụng ngay kiến thức vào 7 dự án thực tế (Khóa sổ Day 3, Kiểm soát F&B Cost, Ngân sách ZBB, CAPEX...). Bạn có thể chọn tệp Excel/PDF trực tiếp từ máy tính để nộp bài và nhận chấm điểm.',
        descEn:
          'Apply USALI mastery to 7 real 5-star hotel deliverables (Day-3 Close, F&B Cost Control, ZBB, CAPEX) with real file uploads and rubric grading.',
        tipVi: 'Mẹo: Đọc kỹ mục Deliverables yêu cầu trước khi tải lên file báo cáo của bạn.',
        tipEn: 'Tip: Check the Deliverables checklist carefully before uploading your workbook.',
      },
      {
        id: 'simulator',
        targetSelector: `[data-tour="nav-${simTab === 'aiAssistant' ? 'aiAssistant' : 'dashboard'}"]`,
        mobileSelector: '[data-tour="mobile-menu-btn"]',
        keepWorkspaceClear: true,
        tabToOpen: simTab,
        requiredTab: simTab,
        badgeVi: 'Khu vực 5 · Trợ lý & Mô phỏng',
        badgeEn: 'Zone 5 · AI & GM Simulator',
        titleVi: 'Trợ Lý AI & Mô Phỏng Họp Với GM',
        titleEn: 'AI Advisor & GM Executive Simulator',
        descVi:
          'Luyện tập đóng vai Financial Controller họp điều hành trực tiếp với Tổng Giám Đốc (GM) qua các tình huống biến động GOP, RevPAR và chi phí vận hành để nâng tầm đối tác chiến lược!',
        descEn:
          'Roleplay executive strategy meetings with the General Manager across GOP, RevPAR, and cost scenarios to build strategic business-partner skills!',
        tipVi: 'Hoàn tất rồi! Bất cứ lúc nào cần hỏi đường hoặc xem lại hướng dẫn, cứ bấm vào Finny ở góc phải dưới nhé.',
        tipEn: 'All done! Click Finny in the bottom-right corner anytime you need directions or a replay.',
      },
    ];

    return raw.filter((s) => !s.requiredTab || canAccessRoute(s.requiredTab));
  }, [canAccessRoute]);

  const currentStep = tourSteps[tourStepIdx] || tourSteps[0];
  const isFinalStep = tourStepIdx === tourSteps.length - 1;

  const dismissTeaser = useCallback(() => {
    setShowTeaser(false);
    try {
      localStorage.setItem(TEASER_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  const startGuidedTour = useCallback(
    (startIndex = 0) => {
      dismissTeaser();
      setPanelOpen(false);
      const safeIdx = Math.max(0, Math.min(startIndex, tourSteps.length - 1));
      const step = tourSteps[safeIdx];
      if (step?.tabToOpen && canAccessRoute(step.tabToOpen)) {
        setActiveTab(step.tabToOpen);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTourStepIdx(safeIdx);
      setTourActive(true);
    },
    [canAccessRoute, dismissTeaser, setActiveTab, tourSteps]
  );

  const finishGuidedTour = useCallback(() => {
    setTourActive(false);
    setPrimaryRect(null);
    setWorkspaceRect(null);
    setTourCompleted(true);
    try {
      localStorage.setItem(TOUR_DONE_KEY, '1');
    } catch {
      // ignore
    }
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { x: 0.5, y: 0.65 },
        colors: ['#F59E0B', '#FCD34D', '#38BDF8', '#10B981'],
      });
    } catch {
      // ignore if confetti fails
    }
  }, []);

  const goToTourStep = useCallback(
    (nextIdx: number) => {
      if (nextIdx < 0) return;
      if (nextIdx >= tourSteps.length) {
        finishGuidedTour();
        return;
      }
      const step = tourSteps[nextIdx];
      if (step?.tabToOpen && canAccessRoute(step.tabToOpen)) {
        setActiveTab(step.tabToOpen);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTourStepIdx(nextIdx);
    },
    [canAccessRoute, finishGuidedTour, setActiveTab, tourSteps]
  );

  // Measure target element + optional workspace preview rect accurately across resize/scroll/tab switch
  useEffect(() => {
    if (!tourActive || !currentStep) {
      setPrimaryRect(null);
      setWorkspaceRect(null);
      return;
    }

    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });

      // 1. Primary spotlight target (scroll sidebar button into view cleanly first!)
      let foundPrimary: BoxRect | null = null;
      const selectorToUse =
        window.innerWidth < 1024 && currentStep.mobileSelector
          ? currentStep.mobileSelector
          : currentStep.targetSelector;

      if (selectorToUse) {
        const el = document.querySelector(selectorToUse) as HTMLElement | null;
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            foundPrimary = {
              left: Math.max(4, r.left),
              top: Math.max(4, r.top),
              width: Math.min(r.width, window.innerWidth - 8),
              height: Math.min(r.height, window.innerHeight - 8),
            };
          }
        }
      }
      setPrimaryRect(foundPrimary);

      // 2. Secondary workspace preview cutout so user can admire the live page crystal-clearly!
      if (currentStep.keepWorkspaceClear) {
        const ws = document.querySelector('[data-tour="main-workspace"]') as HTMLElement | null;
        if (ws) {
          const wr = ws.getBoundingClientRect();
          if (wr.width > 0 && wr.height > 0) {
            const topEdge = Math.max(72, wr.top - 4);
            const bottomAvail = Math.max(180, window.innerHeight - topEdge - 16);
            setWorkspaceRect({
              left: Math.max(8, wr.left - 4),
              top: topEdge,
              width: Math.min(wr.width + 8, window.innerWidth - Math.max(8, wr.left - 4) - 8),
              height: Math.min(wr.height + 8, bottomAvail),
            });
          } else {
            setWorkspaceRect(null);
          }
        } else {
          setWorkspaceRect(null);
        }
      } else {
        setWorkspaceRect(null);
      }
    };

    // Scroll targeted sidebar item smoothly into view BEFORE measuring so it's never clipped at sidebar top/bottom
    if (window.innerWidth >= 1024 && currentStep.targetSelector) {
      const targetEl = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (targetEl && currentStep.targetSelector.includes('nav-')) {
        targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    const t1 = window.setTimeout(measure, 90);
    const t2 = window.setTimeout(measure, 340);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [tourActive, currentStep, activeTab]);

  // Keyboard shortcuts during tour
  useEffect(() => {
    if (!tourActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTourActive(false);
        setPrimaryRect(null);
        setWorkspaceRect(null);
      } else if (e.key === 'ArrowRight') {
        goToTourStep(tourStepIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        goToTourStep(tourStepIdx - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tourActive, tourStepIdx, goToTourStep]);

  // Initial welcome message in chat
  useEffect(() => {
    if (messages.length > 0) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 'welcome_msg',
        sender: 'bot',
        time: nowTime,
        text: isVi
          ? `Xin chào ${currentUser.name}! Mình là Finny ✨ Trợ lý dẫn đường của FC Learning Academy. Bạn muốn mình dẫn đi tham quan từng khu vực hay giải đáp thắc mắc nào?`
          : `Hi ${currentUser.name}! I'm Finny ✨ Your FC Learning Academy guide. Would you like a 1-minute interactive tour or help finding a feature?`,
        actions: [
          {
            label: isVi ? 'Bắt đầu tham quan từng khu vực' : 'Start Guided Tour',
            primary: true,
            onClick: () => startGuidedTour(0),
          },
          {
            label: isVi ? 'Người mới nên bắt đầu từ đâu?' : 'Where should I start?',
            onClick: () =>
              handleQuickQuestion(
                isVi ? 'Tôi là người mới, nên bắt đầu từ đâu?' : 'Where should a new user start?'
              ),
          },
        ],
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatBusy, widgetTab, panelOpen]);

  const navigateFromChat = useCallback(
    (tabId: string) => {
      if (canAccessRoute(tabId)) {
        setActiveTab(tabId);
        setPanelOpen(false);
      }
    },
    [canAccessRoute, setActiveTab]
  );

  // Instant bilingual intent matcher
  const resolveLocalBotReply = useCallback(
    (rawQuery: string): { text: string; actions?: ChatAction[] } | null => {
      const q = rawQuery.toLowerCase();

      if (/(tour|tham quan|hướng dẫn từng|dẫn đường|giới thiệu hệ thống|walkthrough|guide me)/.test(q)) {
        return {
          text: isVi
            ? 'Tuyệt vời! Mình sẽ chiếu sáng từng nút menu bên trái và mở trực tiếp khu vực tương ứng bên phải để bạn quan sát rõ ràng nhất.'
            : 'Awesome! I will spotlight each navigation item on the left while previewing its live workspace on the right.',
          actions: [
            {
              label: isVi ? 'Bắt đầu tham quan ngay ✨' : 'Launch Guided Tour ✨',
              primary: true,
              onClick: () => startGuidedTour(0),
            },
          ],
        };
      }

      if (/(người mới|bắt đầu|start|new user|rối|làm gì trước|lộ trình học)/.test(q)) {
        return {
          text: isVi
            ? 'Để làm quen nhanh nhất mà không bị rối, bạn đi theo đúng 4 bước chuẩn:\n1. Xem Bảng Điều Khiển để biết điểm năng lực 6 miền USALI.\n2. Vào Đánh Giá Năng Lực để xác định khoảng trống & tạo IDP.\n3. Mở Thư Viện Khóa Học để học bài giảng & làm Quiz.\n4. Thực hành qua Dự án OJT và Mô phỏng họp với GM!'
            : 'Follow this simple 4-step path:\n1. Check your Dashboard for your 6-domain USALI Radar.\n2. Open Assessments to identify competency gaps & IDP.\n3. Take USALI Courses & quizzes.\n4. Practice real cases in OJT Projects & GM Simulator!',
          actions: [
            {
              label: isVi ? 'Dẫn đi xem từng khu vực ✨' : 'Take Guided Tour ✨',
              primary: true,
              onClick: () => startGuidedTour(0),
            },
            ...(canAccessRoute('learningPaths')
              ? [
                  {
                    label: isVi ? 'Xem Lộ Trình Nghề Nghiệp' : 'Open Learning Paths',
                    onClick: () => navigateFromChat('learningPaths'),
                  },
                ]
              : []),
          ],
        };
      }

      if (/(đăng nhập|đăng ký|tài khoản|mật khẩu|login|register|sign in|sign up|password)/.test(q)) {
        return {
          text: isVi
            ? 'Bạn có thể Đăng nhập hoặc Đăng ký tài khoản mới ngay tại tab "Tài Khoản Học Viện" (hoạt động ngay trên localhost, không bị lỗi tên miền). Mật khẩu 5 tài khoản mẫu: FCAcademy@2026.'
            : 'Sign in or register right away in the "Academy Account" tab (works locally with zero domain errors). Demo password for all 5 roles: FCAcademy@2026.',
          actions: [
            {
              label: isVi ? 'Mở Đăng Nhập' : 'Open Sign In',
              primary: true,
              onClick: () => {
                setPanelOpen(false);
                openAuthModal('login');
              },
            },
            {
              label: isVi ? 'Đăng Ký Tài Khoản Mới' : 'Create Account',
              onClick: () => {
                setPanelOpen(false);
                openAuthModal('register');
              },
            },
          ],
        };
      }

      if (/(khóa học|course|usali|học liệu|bài giảng|quiz|trắc nghiệm)/.test(q)) {
        return {
          text: isVi
            ? 'Thư viện gồm 18 khóa học Tài chính Khách sạn chuẩn USALI 11th & 12th chia theo 6 miền năng lực, hỗ trợ xem trực tiếp tài liệu Word/Excel/PDF và làm Quiz.'
            : 'The catalog includes 18 Hospitality Finance courses aligned to USALI 11th & 12th across 6 domains with inline Word/Excel/PDF previews and quizzes.',
          actions: canAccessRoute('courses')
            ? [
                {
                  label: isVi ? 'Mở Thư Viện Khóa Học →' : 'Open Course Catalog →',
                  primary: true,
                  onClick: () => navigateFromChat('courses'),
                },
              ]
            : undefined,
        };
      }

      if (/(năng lực|đánh giá|radar|idp|gap|khoảng trống|assessment|competency)/.test(q)) {
        return {
          text: isVi
            ? 'Hệ thống đánh giá 6 miền năng lực (FAR, FCA, FPM, BPA, LPM, SBP) thang điểm Cấp 1–4 và sinh Kế hoạch Phát triển Cá nhân (IDP 70-20-10) tự động.'
            : 'Evaluate 6 domains (FAR, FCA, FPM, BPA, LPM, SBP) from Level 1–4 and generate a 70-20-10 Individual Development Plan (IDP).',
          actions: [
            ...(canAccessRoute('assessments')
              ? [
                  {
                    label: isVi ? 'Mở Đánh Giá & Ma Trận Gap' : 'Open Assessments',
                    primary: true,
                    onClick: () => navigateFromChat('assessments'),
                  },
                ]
              : []),
            ...(canAccessRoute('competencyFramework')
              ? [
                  {
                    label: isVi ? 'Xem Khung Năng Lực FC' : 'View Competency Framework',
                    onClick: () => navigateFromChat('competencyFramework'),
                  },
                ]
              : []),
          ],
        };
      }

      if (/(ojt|dự án|thực tập|nộp bài|deliverable|project)/.test(q)) {
        return {
          text: isVi
            ? 'Phân hệ Thực Tập OJT gồm 7 dự án thực chiến khách sạn 5 sao. Bạn có thể chọn file Excel/PDF từ máy tính để nộp bài và nhận điểm thẩm định.'
            : 'OJT Projects feature 7 real 5-star hotel deliverables. Upload Excel/PDF files directly from your computer for grading.',
          actions: canAccessRoute('ojtProjects')
            ? [
                {
                  label: isVi ? 'Mở Dự Án OJT →' : 'Open OJT Projects →',
                  primary: true,
                  onClick: () => navigateFromChat('ojtProjects'),
                },
              ]
            : undefined,
        };
      }

      if (/(simulator|mô phỏng|họp|gm|ai|trợ lý|business partner)/.test(q)) {
        return {
          text: isVi
            ? 'GM Simulator cho phép bạn nhập vai Giám đốc Tài chính họp xử lý tình huống thực tế với Tổng Giám Đốc (GOP, ADR, Occupancy, F&B Cost) và nhận chấm điểm năng lực.'
            : 'GM Simulator lets you roleplay executive meetings with the GM across real GOP, ADR, Occupancy, and cost scenarios.',
          actions: [
            ...(canAccessRoute('aiAssistant')
              ? [
                  {
                    label: isVi ? 'Mở Trợ Lý AI & GM Simulator' : 'Open AI & GM Simulator',
                    primary: true,
                    onClick: () => navigateFromChat('aiAssistant'),
                  },
                ]
              : []),
            ...(canAccessRoute('simDashboard')
              ? [
                  {
                    label: isVi ? 'Mở Bảng Điều Khiển Simulator' : 'Open Simulator Dashboard',
                    onClick: () => navigateFromChat('simDashboard'),
                  },
                ]
              : []),
          ],
        };
      }

      if (/(chứng chỉ|certificate|bằng cấp|verify|xác thực)/.test(q)) {
        return {
          text: isVi
            ? 'Lộ trình Chứng chỉ Chuyên môn 5 Cấp Độ hỗ trợ xem, in PDF chứng chỉ tiếng Việt sắc nét và tra cứu xác thực trực tuyến.'
            : 'Earn 5-Level Professional Certifications with printable PDF credentials and online Verification Code lookup.',
          actions: canAccessRoute('certifications')
            ? [
                {
                  label: isVi ? 'Mở Khu Vực Chứng Chỉ →' : 'Open Certifications →',
                  primary: true,
                  onClick: () => navigateFromChat('certifications'),
                },
              ]
            : undefined,
        };
      }

      if (/(vai trò|role|đổi quyền|admin|quyền|giám đốc|học viên)/.test(q)) {
        return {
          text: isVi
            ? `Hiện bạn đang ở vai trò "${t.roles[currentUser.role]}". Bấm vào ảnh đại diện ở góc trên bên phải để chuyển đổi nhanh giữa 5 vai trò hệ thống!`
            : `You are currently viewing as "${t.roles[currentUser.role]}". Click your avatar in the top-right corner to switch between all 5 roles!`,
          actions: [
            {
              label: isVi ? 'Chiếu sáng khu vực đổi vai trò' : 'Highlight Top Bar',
              primary: true,
              onClick: () => startGuidedTour(1),
            },
          ],
        };
      }

      return null;
    },
    [canAccessRoute, currentUser.role, isVi, navigateFromChat, openAuthModal, startGuidedTour, t.roles]
  );

  const handleQuickQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatBusy) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, sender: 'user', text: trimmed, time: nowTime },
    ]);
    setChatInput('');

    const localReply = resolveLocalBotReply(trimmed);
    if (localReply) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `b_${Date.now()}`,
            sender: 'bot',
            text: localReply.text,
            actions: localReply.actions,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }, 220);
      return;
    }

    setChatBusy(true);
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          language,
          history: messages.slice(-6).map((m) => ({
            role: m.sender === 'bot' ? 'model' : 'user',
            content: m.text,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const replyText = data?.reply || data?.text || data?.response;
        if (replyText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b_${Date.now()}`,
              sender: 'bot',
              text: String(replyText),
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          return;
        }
      }
      throw new Error('fallback');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: isVi
            ? 'Mình có thể dẫn bạn đi tham quan từng khu vực chỉ trong 1 phút, hoặc giải đáp nhanh về: Khóa học, Đánh giá năng lực/IDP, Dự án OJT, GM Simulator, Chứng chỉ hay Đăng nhập nhé!'
            : 'I can give you a 1-minute Spotlight Tour or guide you to Courses, Assessments/IDP, OJT Projects, GM Simulator, Certifications, or Sign In!',
          actions: [
            {
              label: isVi ? 'Đi tham quan từng khu vực ✨' : 'Start Guided Tour ✨',
              primary: true,
              onClick: () => startGuidedTour(0),
            },
            ...(canAccessRoute('courses')
              ? [
                  {
                    label: isVi ? 'Xem Khóa Học' : 'Browse Courses',
                    onClick: () => navigateFromChat('courses'),
                  },
                ]
              : []),
          ],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  // Compute smooth gliding Tour Card coordinates + directional arrow placement
  const tourPlacement = useMemo((): {
    style: React.CSSProperties;
    arrowSide: 'none' | 'left' | 'top';
    arrowOffsetPx?: number;
  } => {
    const vw = viewport.w;
    const vh = viewport.h;
    const cardW = Math.min(370, vw - 24);
    const estCardH = 290;

    // Centered modal for Welcome step
    if (!primaryRect || currentStep.id === 'welcome') {
      return {
        arrowSide: 'none',
        style: {
          position: 'fixed',
          left: Math.max(12, Math.round((vw - cardW) / 2)),
          top: Math.max(20, Math.round((vh - estCardH) / 2)),
          width: cardW,
        },
      };
    }

    // Mobile (< 1024px): clean bottom sheet card
    if (vw < 1024) {
      return {
        arrowSide: 'none',
        style: {
          position: 'fixed',
          left: Math.max(12, Math.round((vw - cardW) / 2)),
          top: Math.max(76, vh - estCardH - 18),
          width: cardW,
        },
      };
    }

    // Top Navbar step: anchor directly underneath with upward arrow pointing to controls
    if (currentStep.id === 'navbar') {
      const left = Math.max(16, Math.min(vw - cardW - 16, primaryRect.left + primaryRect.width / 2 - cardW / 2));
      const top = Math.min(vh - estCardH - 16, primaryRect.top + primaryRect.height + 16);
      const arrowX = Math.max(28, Math.min(cardW - 28, primaryRect.left + primaryRect.width / 2 - left));
      return {
        arrowSide: 'top',
        arrowOffsetPx: arrowX,
        style: {
          position: 'fixed',
          left,
          top,
          width: cardW,
        },
      };
    }

    // Sidebar step: glide smoothly right next to the glowing sidebar button with left arrow!
    const left = Math.min(vw - cardW - 16, primaryRect.left + primaryRect.width + 18);
    const targetCenterY = primaryRect.top + primaryRect.height / 2;
    const clampedTop = Math.max(78, Math.min(vh - estCardH - 18, Math.round(targetCenterY - 56)));
    const arrowY = Math.max(28, Math.min(estCardH - 28, Math.round(targetCenterY - clampedTop)));

    return {
      arrowSide: 'left',
      arrowOffsetPx: arrowY,
      style: {
        position: 'fixed',
        left,
        top: clampedTop,
        width: cardW,
      },
    };
  }, [primaryRect, currentStep.id, viewport.w, viewport.h]);

  const quickSuggestions = isVi
    ? [
        'Tôi là người mới, nên bắt đầu từ đâu?',
        'Dẫn tôi đi tham quan từng khu vực',
        'Cách đăng nhập / đăng ký tài khoản?',
        'GM Simulator là gì?',
      ]
    : [
        'Where should a new user start?',
        'Start the guided tour',
        'How do I sign in or register?',
        'What is GM Simulator?',
      ];

  return (
    <>
      {/* =================================================================== */}
      {/* 1. DUAL-CUTOUT SVG SPOTLIGHT GUIDED TOUR OVERLAY                    */}
      {/* =================================================================== */}
      {tourActive && currentStep && (
        <div className="fixed inset-0 z-[75] print:hidden" role="dialog" aria-modal="true">
          {/* Smooth SVG Spotlight Mask: darkens distractions, illuminates primary target 100% + keeps workspace preview crisp */}
          <svg
            className="fixed inset-0 w-full h-full cursor-pointer"
            width={viewport.w}
            height={viewport.h}
            onClick={() => setTourActive(false)}
            aria-hidden="true"
          >
            <defs>
              <mask id={maskId}>
                {/* White = dimmed backdrop */}
                <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="white" />
                {/* Secondary workspace cutout: keeps live page ~82% bright so user can admire the section unobstructed */}
                {workspaceRect && (
                  <rect
                    x={workspaceRect.left}
                    y={workspaceRect.top}
                    width={workspaceRect.width}
                    height={workspaceRect.height}
                    rx="18"
                    fill="#2b2b2b"
                    style={{ transition: 'all 360ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                )}
                {/* Primary target cutout: 100% crystal-clear spotlight */}
                {primaryRect && (
                  <rect
                    x={primaryRect.left - 5}
                    y={primaryRect.top - 5}
                    width={primaryRect.width + 10}
                    height={primaryRect.height + 10}
                    rx="14"
                    fill="black"
                    style={{ transition: 'all 360ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width={viewport.w}
              height={viewport.h}
              fill="rgba(7, 17, 34, 0.68)"
              mask={`url(#${maskId})`}
            />
          </svg>

          {/* Animated Pulsing Gold Spotlight Ring + Beacon Dot around the exact highlighted control */}
          {primaryRect && (
            <div
              className="fixed rounded-2xl pointer-events-none finny-spotlight-ring"
              style={{
                left: primaryRect.left - 5,
                top: primaryRect.top - 5,
                width: primaryRect.width + 10,
                height: primaryRect.height + 10,
                transition: 'all 360ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-85" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 border-2 border-white shadow" />
              </span>
            </div>
          )}

          {/* Smooth-Gliding Tour Guide Popover Card with Directional Pointer Arrow */}
          <div
            style={{
              ...tourPlacement.style,
              transition: 'left 380ms cubic-bezier(0.22, 1, 0.36, 1), top 380ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="z-[76] bg-white rounded-2xl shadow-2xl border-2 border-amber-400/80 overflow-visible"
          >
            {/* Left Pointer Arrow (points directly to the glowing Sidebar button) */}
            {tourPlacement.arrowSide === 'left' && (
              <div
                style={{ top: (tourPlacement.arrowOffsetPx ?? 42) - 8 }}
                className="absolute -left-2.5 w-4 h-4 bg-white border-l-2 border-b-2 border-amber-400/80 rotate-45 pointer-events-none transition-all duration-300"
              />
            )}

            {/* Top Pointer Arrow (points directly up to Navbar Auth/Lang controls) */}
            {tourPlacement.arrowSide === 'top' && (
              <div
                style={{ left: (tourPlacement.arrowOffsetPx ?? 160) - 8 }}
                className="absolute -top-2.5 w-4 h-4 bg-[#0A192F] border-l-2 border-t-2 border-amber-400/80 rotate-45 pointer-events-none transition-all duration-300"
              />
            )}

            <div className="rounded-[14px] overflow-hidden bg-white">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#0A192F] via-[#102849] to-[#173663] text-white px-4 py-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-900/90 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-inner">
                    <FinnyAvatar
                      size={38}
                      animated
                      mood={currentStep.id === 'welcome' ? 'waving' : isFinalStep ? 'happy' : 'idle'}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider truncate">
                        {isVi ? currentStep.badgeVi : currentStep.badgeEn}
                      </span>
                      <span className="text-[11px] font-mono text-slate-300 shrink-0 tabular-nums">
                        {tourStepIdx + 1}/{tourSteps.length}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white truncate mt-0.5">
                      {isVi ? currentStep.titleVi : currentStep.titleEn}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTourActive(false)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg cursor-pointer shrink-0"
                  aria-label={isVi ? 'Đóng hướng dẫn' : 'Close tour'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-1.5 bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300 ease-out"
                  style={{ width: `${((tourStepIdx + 1) / tourSteps.length) * 100}%` }}
                />
              </div>

              {/* Step Content — keyed by step id so every step transition slides & fades smoothly! */}
              <div key={currentStep.id} className="p-4 space-y-3 animate-finny-step-in">
                <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                  {isVi ? currentStep.descVi : currentStep.descEn}
                </p>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2 leading-relaxed">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{isVi ? currentStep.tipVi : currentStep.tipEn}</span>
                </div>

                {/* Clickable Step Dots */}
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {tourSteps.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goToTourStep(idx)}
                      aria-label={`Step ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === tourStepIdx
                          ? 'w-6 bg-amber-500'
                          : idx < tourStepIdx
                          ? 'w-2 bg-amber-300 hover:bg-amber-400'
                          : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Footer Controls */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setTourActive(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {isVi ? 'Bỏ qua' : 'Skip'}
                </button>

                <div className="flex items-center gap-2">
                  {tourStepIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => goToTourStep(tourStepIdx - 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Trước' : 'Back'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => goToTourStep(tourStepIdx + 1)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-xs cursor-pointer transition-colors"
                  >
                    <span>
                      {isFinalStep
                        ? isVi
                          ? 'Hoàn tất!'
                          : 'Finish!'
                        : isVi
                        ? 'Tiếp theo'
                        : 'Next'}
                    </span>
                    {isFinalStep ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. BOTTOM-RIGHT CUTE FLOATING CHATBOT & ONBOARDING WIDGET           */}
      {/* =================================================================== */}
      {!tourActive && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-[45] flex flex-col items-end gap-2.5 print:hidden">
          {/* Expanded Concierge Popup Window */}
          {panelOpen && (
            <div className="w-[min(23.5rem,calc(100vw-1.5rem))] h-[min(33rem,calc(100vh-6.5rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-finny-pop">
              {/* Top Header */}
              <div className="bg-gradient-to-r from-[#0A192F] via-[#102849] to-[#173663] text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/90 border border-amber-400/50 flex items-center justify-center shrink-0">
                    <FinnyAvatar size={36} animated mood={chatBusy ? 'thinking' : 'waving'} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-white truncate">Finny</h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-amber-300/90 truncate">
                      {isVi ? 'Trợ lý dẫn đường FC Academy' : 'FC Academy Onboarding Guide'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg cursor-pointer shrink-0"
                  aria-label={isVi ? 'Thu gọn Finny' : 'Minimize Finny'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Switcher: Guided Tour vs Chat */}
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWidgetTab('guide')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      widgetTab === 'guide'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isVi ? 'Tham Quan' : 'Guided Tour'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidgetTab('chat')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      widgetTab === 'chat'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isVi ? 'Chat Với Finny' : 'Chat with Finny'}</span>
                  </button>
                </div>
              </div>

              {/* TAB A: INTERACTIVE TOUR LAUNCHER & ZONE DIRECTORY */}
              {widgetTab === 'guide' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white space-y-3 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                          <Sparkles className="w-3 h-3" />
                          <span>{isVi ? 'Dành cho người mới' : 'Newcomer Walkthrough'}</span>
                        </span>
                        <h4 className="font-extrabold text-sm leading-snug">
                          {isVi
                            ? 'Khám phá từng khu vực trong 1 phút'
                            : 'Explore every zone in 1 minute'}
                        </h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {isVi
                            ? `Finny sẽ chiếu sáng đúng từng nút menu (${tourSteps.length} bước) và mở trực tiếp khu vực tương ứng bên cạnh.`
                            : `Finny spotlights each navigation button (${tourSteps.length} steps) while showing the live screen beside it.`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startGuidedTour(0)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      {tourCompleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Compass className="w-4 h-4" />}
                      <span>
                        {tourCompleted
                          ? isVi
                            ? 'Xem Lại Tour Hướng Dẫn'
                            : 'Replay Guided Tour'
                          : isVi
                          ? 'Bắt Đầu Tham Quan Từng Khu Vực'
                          : 'Start Interactive Guided Tour'}
                      </span>
                    </button>
                  </div>

                  {/* Direct Jump to Any Tour Zone */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isVi ? 'Hoặc chọn khu vực muốn xem ngay:' : 'Or jump straight to any zone:'}</span>
                    </p>
                    <div className="space-y-1.5">
                      {tourSteps.slice(1).map((step, i) => {
                        const actualIdx = i + 1;
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => startGuidedTour(actualIdx)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all flex items-center justify-between gap-2.5 text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 transition-colors">
                                {actualIdx}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {isVi ? step.titleVi : step.titleEn}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {isVi ? step.badgeVi : step.badgeEn}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB B: SMART CONCIERGE CHAT */}
              {widgetTab === 'chat' && (
                <>
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60"
                  >
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 animate-finny-step-in ${
                          msg.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.sender === 'bot' && (
                          <div className="w-7 h-7 rounded-full bg-[#0A192F] border border-amber-400/50 flex items-center justify-center shrink-0 mb-0.5">
                            <FinnyAvatar size={23} />
                          </div>
                        )}
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                            msg.sender === 'user'
                              ? 'bg-[#0A192F] text-white rounded-br-sm'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.text}</p>
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {msg.actions.map((act, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={act.onClick}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                    act.primary
                                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                                  }`}
                                >
                                  {act.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <span className="block text-[10px] mt-1 text-slate-400 text-right">
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    ))}

                    {chatBusy && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0A192F] border border-amber-400/50 flex items-center justify-center shrink-0">
                          <FinnyAvatar size={23} mood="thinking" />
                        </div>
                        <div className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Suggestions Strip */}
                  <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    {quickSuggestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickQuestion(q)}
                        className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleQuickQuestion(chatInput);
                    }}
                    className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={isVi ? 'Hỏi Finny bất cứ điều gì...' : 'Ask Finny anything...'}
                      className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || chatBusy}
                      className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-45 cursor-pointer shrink-0 transition-colors"
                      aria-label={isVi ? 'Gửi tin nhắn' : 'Send message'}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* First-Time Welcome Speech Bubble */}
          {!panelOpen && showTeaser && (
            <div className="max-w-[270px] bg-white rounded-2xl rounded-br-sm shadow-xl border border-amber-300/80 p-3.5 text-xs space-y-2.5 animate-finny-pop">
              <div className="flex items-start justify-between gap-2">
                <p className="text-slate-800 font-semibold leading-snug">
                  {isVi
                    ? 'Chào bạn mới! 👋 Hệ thống hơi nhiều mục, để Finny dẫn bạn đi 1 vòng nhé?'
                    : 'New here? 👋 Let Finny give you a quick 1-minute guided tour!'}
                </p>
                <button
                  type="button"
                  onClick={dismissTeaser}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                  aria-label={isVi ? 'Ẩn gợi ý' : 'Dismiss tip'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => startGuidedTour(0)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  {isVi ? 'Đi tham quan ✨' : 'Take Tour ✨'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissTeaser();
                    setWidgetTab('chat');
                    setPanelOpen(true);
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  {isVi ? 'Chat ngay' : 'Chat'}
                </button>
              </div>
            </div>
          )}

          {/* Cute Floating Mascot Trigger Button with Hover Pill */}
          <div className="flex items-center gap-2.5">
            {!panelOpen && !showTeaser && launcherHover && (
              <span className="px-3 py-1.5 rounded-full bg-[#0A192F] text-amber-300 border border-amber-400/50 text-xs font-bold shadow-lg whitespace-nowrap animate-finny-step-in">
                {isVi ? 'Hỏi Finny & Hướng dẫn ✨' : 'Ask Finny & Tour ✨'}
              </span>
            )}
            <button
              type="button"
              onMouseEnter={() => setLauncherHover(true)}
              onMouseLeave={() => setLauncherHover(false)}
              onClick={() => {
                dismissTeaser();
                setPanelOpen((prev) => !prev);
              }}
              aria-label={isVi ? 'Mở trợ lý hướng dẫn Finny' : 'Open Finny onboarding assistant'}
              aria-expanded={panelOpen}
              className="group relative w-14 h-14 sm:w-[62px] sm:h-[62px] rounded-full bg-gradient-to-br from-[#0A192F] via-[#13294B] to-[#1E3A8A] border-2 border-amber-400 shadow-xl hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer animate-finny-float"
            >
              <FinnyAvatar size={46} animated mood={launcherHover ? 'waving' : 'idle'} />
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 border-2 border-white" />
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
