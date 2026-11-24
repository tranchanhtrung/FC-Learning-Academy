import type {
  Course,
  CourseComboPackage,
  CoursePriceOverride,
  LessonMaterialDoc,
  MaterialApprovalStatus,
  SiteAdminConfigDoc,
} from '../types/index.ts';
import { getCoursePriceVnd } from './coursePricing.ts';

export const SITE_ADMIN_CONFIG_DOC_ID = 'site_settings_global';

export const DEFAULT_COURSE_COMBOS: CourseComboPackage[] = [
  {
    id: 'combo_far_foundation',
    code: 'COMBO-FAR-3',
    nameVi: 'Combo Nền Tảng Kế Toán Khách Sạn Chuẩn USALI 12th (3 Khóa)',
    nameEn: 'Hospitality Accounting USALI 12th Core Bundle (3 Courses)',
    descriptionVi:
      'Trọn bộ 3 chuyên đề cốt lõi Miền FAR: USALI 12th, Khóa sổ nhanh Day 3 và Ghi nhận doanh thu IFRS 15 / Thuế khách sạn.',
    descriptionEn:
      'Complete 3-course FAR foundation track: USALI 12th, Fast-Close Day 3, and IFRS 15 Revenue & Hospitality Tax.',
    badgeVi: 'Tiết kiệm 32%',
    badgeEn: 'Save 32%',
    courseIds: ['course_01', 'course_02', 'course_103'],
    priceVnd: 2_090_000,
    durationDays: null,
    isActive: true,
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'combo_afc_fasttrack',
    code: 'COMBO-AFC-5',
    nameVi: 'Combo Tăng Tốc Lên Trợ Lý Giám Đốc Tài Chính — AFC (5 Khóa)',
    nameEn: 'Assistant Financial Controller (AFC) Fast-Track Combo (5 Courses)',
    descriptionVi:
      'Lộ trình 5 khóa học trọng tâm giúp Senior Accountant làm chủ Báo cáo P&L, Kiểm soát nội bộ, Ngân sách 12 tháng, Dự báo dòng tiền & Lãnh đạo nhóm.',
    descriptionEn:
      '5 high-impact courses preparing Senior Accountants for AFC promotion across USALI, Internal Control, Budgeting, Cash Flow, and Leadership.',
    badgeVi: 'Phổ biến nhất · Tiết kiệm 38%',
    badgeEn: 'Most Popular · Save 38%',
    courseIds: ['course_01', 'course_02', 'course_03', 'course_05', 'course_07'],
    priceVnd: 3_490_000,
    durationDays: null,
    isActive: true,
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_SITE_ADMIN_CONFIG: SiteAdminConfigDoc = {
  id: SITE_ADMIN_CONFIG_DOC_ID,
  coursePrices: {},
  combos: DEFAULT_COURSE_COMBOS,
  announcements: [],
  ads: [],
  materialApprovals: {},
  general: {
    siteName: 'FC LEARNING ACADEMY',
    taglineVi: 'Từ Kế Toán Viên Đến Đối Tác Kinh Doanh Chiến Lược',
    taglineEn: 'From Hotel Accountant to Strategic Business Partner',
    supportEmail: 'support@fclearning.academy',
    supportHotline: '1900 6868',
    maintenanceMode: false,
    maintenanceMessageVi: 'Hệ thống đang bảo trì nâng cấp định kỳ. Dữ liệu học tập của bạn được bảo toàn an toàn.',
    requireMaterialApproval: false,
    allowSelfRegistration: true,
    vietQrBankBin: '970436',
    vietQrAccountNo: '0071001288688',
    vietQrAccountName: 'FC LEARNING ACADEMY',
  },
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function normalizeSiteAdminConfig(raw?: Partial<SiteAdminConfigDoc> | null): SiteAdminConfigDoc {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_SITE_ADMIN_CONFIG));
  }
  return {
    id: SITE_ADMIN_CONFIG_DOC_ID,
    coursePrices:
      raw.coursePrices && typeof raw.coursePrices === 'object' ? { ...raw.coursePrices } : {},
    combos: Array.isArray(raw.combos) ? raw.combos : [...DEFAULT_COURSE_COMBOS],
    announcements: Array.isArray(raw.announcements) ? raw.announcements : [],
    ads: Array.isArray(raw.ads) ? raw.ads : [],
    materialApprovals:
      raw.materialApprovals && typeof raw.materialApprovals === 'object'
        ? { ...raw.materialApprovals }
        : {},
    general: {
      ...DEFAULT_SITE_ADMIN_CONFIG.general,
      ...(raw.general && typeof raw.general === 'object' ? raw.general : {}),
    },
    updatedBy: raw.updatedBy,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function resolveEffectiveCoursePricing(
  course: Pick<Course, 'id' | 'code' | 'difficulty'> & { priceVnd?: number },
  coursePrices?: Record<string, CoursePriceOverride>
): {
  priceVnd: number;
  originalPriceVnd?: number;
  isFree: boolean;
  published: boolean;
} {
  const override =
    coursePrices?.[course.id] ||
    (course.code ? coursePrices?.[course.code] : undefined);
  if (override) {
    const isFree = Boolean(override.isFree) || override.priceVnd <= 0;
    return {
      priceVnd: isFree ? 0 : Math.max(0, Math.round(override.priceVnd)),
      originalPriceVnd:
        override.originalPriceVnd && override.originalPriceVnd > override.priceVnd
          ? Math.round(override.originalPriceVnd)
          : undefined,
      isFree,
      published: override.published !== false,
    };
  }
  const basePrice = getCoursePriceVnd(course);
  return {
    priceVnd: basePrice,
    originalPriceVnd: undefined,
    isFree: basePrice <= 0,
    published: true,
  };
}

export function resolveMaterialApprovalStatus(
  material: Pick<LessonMaterialDoc, 'id'>,
  materialApprovals?: Record<string, { status: MaterialApprovalStatus }>
): MaterialApprovalStatus {
  const record = materialApprovals?.[material.id];
  if (record && (record.status === 'approved' || record.status === 'pending' || record.status === 'rejected')) {
    return record.status;
  }
  // Legacy / unreviewed materials default to approved so existing published content never breaks
  return 'approved';
}
