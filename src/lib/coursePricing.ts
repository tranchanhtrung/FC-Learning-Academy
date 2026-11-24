export const COURSE_PRICE_BY_DIFFICULTY_VND: Record<string, number> = {
  Foundation: 790_000,
  Operational: 990_000,
  Advanced: 1_290_000,
  Strategic: 1_590_000,
};

export const DEFAULT_SINGLE_COURSE_PRICE_VND = 990_000;

export function getCoursePriceVnd(course?: {
  priceVnd?: number;
  difficulty?: string;
} | null): number {
  if (!course) return DEFAULT_SINGLE_COURSE_PRICE_VND;
  if (typeof course.priceVnd === 'number' && Number.isFinite(course.priceVnd) && course.priceVnd >= 0) {
    return Math.round(course.priceVnd);
  }
  if (course.difficulty && COURSE_PRICE_BY_DIFFICULTY_VND[course.difficulty]) {
    return COURSE_PRICE_BY_DIFFICULTY_VND[course.difficulty];
  }
  return DEFAULT_SINGLE_COURSE_PRICE_VND;
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}
