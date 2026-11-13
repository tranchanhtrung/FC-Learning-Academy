import type {
  Competency,
  CompetencyDomain,
  Course,
  OJTAssignment,
  LearningPath,
  CourseEnrollment,
  QuizAttempt,
  AssignmentSubmission,
  ProficiencyLevel,
  CompetencyAssessmentDoc,
  IndividualDevelopmentPlanDoc,
  DevelopmentActivityDoc,
  DevelopmentObjective,
  CareerReadinessStatus,
  TalentConfigDoc,
  DevelopmentCategory,
  ActivityType702010,
} from '../types/index.ts';

export const STANDARD_CAREER_POSITIONS = [
  'Accountant',
  'Senior Accountant',
  'Assistant Financial Controller',
  'Financial Controller',
  'Strategic Finance Business Partner',
] as const;

export const DEFAULT_CRITICAL_COMPETENCY_CODES = new Set<string>([
  'FAR-01',
  'FAR-03',
  'FCA-01',
  'FCA-02',
  'FCA-04',
  'FPM-02',
  'FPM-03',
  'BPA-01',
  'SBP-02',
  'SBP-03',
]);

export const DEFAULT_TALENT_CONFIG: TalentConfigDoc = {
  id: 'default',
  weightMode: 'default_equal',
  competencyOverrides: {},
  customPositionTargets: {},
  ratio702010: {
    experiential: 70,
    social: 20,
    formal: 10,
  },
  readinessThresholds: {
    readyForReviewMinAchievement: 90,
    readyForReviewMinIdp: 80,
    readyForReviewMinCritical: 85,
    nearlyReadyMinAchievement: 75,
    nearlyReadyMinIdp: 60,
    developingMinAchievement: 50,
    requireAllCriticalAtTarget: true,
  },
  updatedBy: 'System Default',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/**
 * Resolves the authoritative target proficiency level for a competency given a target job position,
 * strictly reading from configured position targets and Competency.expectedLevelByPosition.
 */
export function resolveCompetencyTargetForPosition(
  comp: Competency,
  targetPosition: string,
  config?: TalentConfigDoc
): ProficiencyLevel | null {
  const customForPos = config?.customPositionTargets?.[targetPosition]?.[comp.code];
  if (customForPos && customForPos >= 1 && customForPos <= 4) {
    return customForPos as ProficiencyLevel;
  }

  const perCompCustom = config?.competencyOverrides?.[comp.code]?.positionTargets?.[targetPosition];
  if (perCompCustom && perCompCustom >= 1 && perCompCustom <= 4) {
    return perCompCustom as ProficiencyLevel;
  }

  const normalizedPos = String(targetPosition || '').trim();
  const map = comp.expectedLevelByPosition || {};

  if (map[normalizedPos]) {
    return map[normalizedPos];
  }

  // Exact role equivalence aliases matching existing LMS position titles
  if (normalizedPos === 'Accountant' || normalizedPos === 'Junior Staff Accountant') {
    return map['Accountant'] || map['Junior Staff Accountant'] || null;
  }
  if (normalizedPos === 'Assistant Financial Controller (AFC)') {
    return map['Assistant Financial Controller'] || null;
  }
  if (normalizedPos === 'Financial Controller (FC)') {
    return map['Financial Controller'] || null;
  }
  if (normalizedPos === 'Strategic Finance Business Partner') {
    return map['Strategic Finance Business Partner'] || map['Financial Controller'] || null;
  }

  return null;
}

export function resolvePositionTargetMatrix(
  competencies: Competency[],
  targetPosition: string,
  config?: TalentConfigDoc
): {
  hasValidTargets: boolean;
  error?: string;
  targetsByCode: Record<string, ProficiencyLevel>;
} {
  const targetsByCode: Record<string, ProficiencyLevel> = {};
  for (const comp of competencies) {
    const lvl = resolveCompetencyTargetForPosition(comp, targetPosition, config);
    if (lvl) {
      targetsByCode[comp.code] = lvl;
    }
  }
  const count = Object.keys(targetsByCode).length;
  if (count === 0) {
    return {
      hasValidTargets: false,
      error: `Target position "${targetPosition}" is missing competency target requirements in the framework.`,
      targetsByCode,
    };
  }
  return { hasValidTargets: true, targetsByCode };
}

export function isCompetencyCritical(comp: Competency, config?: TalentConfigDoc): boolean {
  const override = config?.competencyOverrides?.[comp.code];
  if (override !== undefined) {
    return Boolean(override.isCritical);
  }
  return DEFAULT_CRITICAL_COMPETENCY_CODES.has(comp.code);
}

export function getCompetencyWeight(comp: Competency, config?: TalentConfigDoc): number {
  if (!config || config.weightMode === 'default_equal') {
    return 1;
  }
  const override = config.competencyOverrides?.[comp.code];
  if (override && typeof override.weightPercent === 'number' && override.weightPercent > 0) {
    return override.weightPercent;
  }
  return 1;
}

export type GapSeverityClass = 0 | 1 | 2 | 3;

export interface CompetencyGapRow {
  competencyId: string;
  competencyCode: string;
  nameEn: string;
  nameVi: string;
  domainId: string;
  domainCode: string;
  domainNameEn: string;
  domainNameVi: string;
  currentLevel: ProficiencyLevel | null; // null = unassessed
  targetLevel: ProficiencyLevel;
  gap: number;
  gapClass: GapSeverityClass;
  gapLabel: 'Meets/Exceeds Target' | 'Minor Gap' | 'Moderate Gap' | 'Critical Gap' | 'Unassessed';
  isUnassessed: boolean;
  isCritical: boolean;
  weight: number;
  priorityScore: number;
  priorityRank: number;
  selfLevel?: ProficiencyLevel | null;
  supervisorLevel?: ProficiencyLevel | null;
  assessorNotes?: string;
}

export interface DomainGapSummary {
  domainId: string;
  domainCode: string;
  domainNameEn: string;
  domainNameVi: string;
  color: string;
  assessedCount: number;
  unassessedCount: number;
  totalRequiredCount: number;
  avgCurrentLevel: number;
  avgTargetLevel: number;
  avgGap: number;
  achievementPct: number;
  criticalGapsCount: number;
}

export interface GapAnalysisSummary {
  hasApprovedAssessment: boolean;
  hasValidTargetPosition: boolean;
  targetPositionError?: string;
  assessmentId?: string;
  assessmentPeriod?: string;
  assessorType?: string;
  targetPosition: string;
  weightMode: 'default_equal' | 'custom_weighted';
  totalRequiredCompetencies: number;
  assessedCount: number;
  unassessedCount: number;
  achievementPct: number; // Sum(MIN(Current, Target)) / Sum(Target) * 100
  weightedAchievementPct: number;
  criticalAchievementPct: number;
  averageGap: number;
  gapDistribution: {
    meetsOrExceeds: number;
    minor: number;
    moderate: number;
    critical: number;
    unassessed: number;
  };
  criticalBlockers: CompetencyGapRow[];
  rows: CompetencyGapRow[];
  priorityDevelopmentList: CompetencyGapRow[];
  domainSummaries: DomainGapSummary[];
}

export function selectLatestApprovedAssessment(
  assessments: CompetencyAssessmentDoc[],
  employeeId: string,
  periodFilter?: string
): CompetencyAssessmentDoc | null {
  const approved = assessments.filter(
    (a) =>
      a.employeeId === employeeId &&
      a.status === 'approved' &&
      (!periodFilter || periodFilter === 'all' || a.assessmentPeriod === periodFilter)
  );
  if (approved.length === 0) return null;
  approved.sort((a, b) => {
    const timeDiff = new Date(b.approvedAt || b.updatedAt).getTime() - new Date(a.approvedAt || a.updatedAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (b.version || 1) - (a.version || 1);
  });
  return approved[0];
}

export function calculateGapAnalysis(params: {
  assessments: CompetencyAssessmentDoc[];
  employeeId: string;
  targetPosition: string;
  competencies: Competency[];
  domains: CompetencyDomain[];
  config?: TalentConfigDoc;
  periodFilter?: string;
  specificAssessmentId?: string;
}): GapAnalysisSummary {
  const {
    assessments,
    employeeId,
    targetPosition,
    competencies,
    domains,
    config = DEFAULT_TALENT_CONFIG,
    periodFilter,
    specificAssessmentId,
  } = params;

  const targetMatrix = resolvePositionTargetMatrix(competencies, targetPosition, config);
  if (!targetMatrix.hasValidTargets) {
    return {
      hasApprovedAssessment: false,
      hasValidTargetPosition: false,
      targetPositionError: targetMatrix.error,
      targetPosition,
      weightMode: config.weightMode,
      totalRequiredCompetencies: 0,
      assessedCount: 0,
      unassessedCount: 0,
      achievementPct: 0,
      weightedAchievementPct: 0,
      criticalAchievementPct: 0,
      averageGap: 0,
      gapDistribution: { meetsOrExceeds: 0, minor: 0, moderate: 0, critical: 0, unassessed: 0 },
      criticalBlockers: [],
      rows: [],
      priorityDevelopmentList: [],
      domainSummaries: [],
    };
  }

  const chosenAssessment = specificAssessmentId
    ? assessments.find((a) => a.id === specificAssessmentId && a.status === 'approved') || null
    : selectLatestApprovedAssessment(assessments, employeeId, periodFilter);

  const requiredComps = competencies.filter((c) => Boolean(targetMatrix.targetsByCode[c.code]));
  const domainMap = new Map(domains.map((d) => [d.id, d]));

  const rows: CompetencyGapRow[] = [];
  let sumMinCurrentTarget = 0;
  let sumTarget = 0;
  let weightedMinSum = 0;
  let weightedTargetSum = 0;
  let critMinSum = 0;
  let critTargetSum = 0;
  let gapSum = 0;
  let assessedCount = 0;
  let unassessedCount = 0;

  const gapDistribution = {
    meetsOrExceeds: 0,
    minor: 0,
    moderate: 0,
    critical: 0,
    unassessed: 0,
  };

  for (const comp of requiredComps) {
    const targetLevel = targetMatrix.targetsByCode[comp.code];
    const dom = domainMap.get(comp.domainId);
    const resEntry = chosenAssessment?.results?.[comp.code];
    const currentLevel =
      resEntry && resEntry.currentLevel !== null && resEntry.currentLevel !== undefined
        ? (Math.max(1, Math.min(4, Number(resEntry.currentLevel))) as ProficiencyLevel)
        : null;

    const isUnassessed = !chosenAssessment || currentLevel === null;
    const isCrit = isCompetencyCritical(comp, config);
    const weight = getCompetencyWeight(comp, config);

    if (isUnassessed) {
      unassessedCount++;
      gapDistribution.unassessed++;
      const gap = targetLevel;
      const priorityScore = (isCrit ? 100 : 0) + gap * 15 + weight * 2;
      rows.push({
        competencyId: comp.id,
        competencyCode: comp.code,
        nameEn: comp.nameEn,
        nameVi: comp.nameVi,
        domainId: comp.domainId,
        domainCode: dom?.code || comp.domainId,
        domainNameEn: dom?.nameEn || '',
        domainNameVi: dom?.nameVi || '',
        currentLevel: null,
        targetLevel,
        gap,
        gapClass: Math.min(3, gap) as GapSeverityClass,
        gapLabel: 'Unassessed',
        isUnassessed: true,
        isCritical: isCrit,
        weight,
        priorityScore,
        priorityRank: 0,
        selfLevel: resEntry?.selfLevel ?? null,
        supervisorLevel: resEntry?.supervisorLevel ?? null,
        assessorNotes: resEntry?.assessorNotes,
      });
      if (isCrit) {
        critTargetSum += targetLevel;
      }
      continue;
    }

    assessedCount++;
    const gap = Math.max(0, targetLevel - currentLevel);
    const clampedGapClass = Math.min(3, gap) as GapSeverityClass;
    const minCurrTgt = Math.min(currentLevel, targetLevel);

    sumMinCurrentTarget += minCurrTgt;
    sumTarget += targetLevel;
    weightedMinSum += minCurrTgt * weight;
    weightedTargetSum += targetLevel * weight;
    gapSum += gap;

    if (isCrit) {
      critMinSum += minCurrTgt;
      critTargetSum += targetLevel;
    }

    if (clampedGapClass === 0) gapDistribution.meetsOrExceeds++;
    else if (clampedGapClass === 1) gapDistribution.minor++;
    else if (clampedGapClass === 2) gapDistribution.moderate++;
    else gapDistribution.critical++;

    const isComplianceOrControl = comp.domainId === 'dom_2' || comp.domainId === 'dom_1';
    const priorityScore =
      gap === 0
        ? 0
        : (isCrit ? 100 : 0) + (isComplianceOrControl ? 20 : 0) + gap * 25 + weight * 2;

    const gapLabel: CompetencyGapRow['gapLabel'] =
      clampedGapClass === 0
        ? 'Meets/Exceeds Target'
        : clampedGapClass === 1
        ? 'Minor Gap'
        : clampedGapClass === 2
        ? 'Moderate Gap'
        : 'Critical Gap';

    rows.push({
      competencyId: comp.id,
      competencyCode: comp.code,
      nameEn: comp.nameEn,
      nameVi: comp.nameVi,
      domainId: comp.domainId,
      domainCode: dom?.code || comp.domainId,
      domainNameEn: dom?.nameEn || '',
      domainNameVi: dom?.nameVi || '',
      currentLevel,
      targetLevel,
      gap,
      gapClass: clampedGapClass,
      gapLabel,
      isUnassessed: false,
      isCritical: isCrit,
      weight,
      priorityScore,
      priorityRank: 0,
      selfLevel: resEntry?.selfLevel ?? null,
      supervisorLevel: resEntry?.supervisorLevel ?? null,
      assessorNotes: resEntry?.assessorNotes,
    });
  }

  const ranked = [...rows]
    .filter((r) => r.gap > 0 || r.isUnassessed)
    .sort((a, b) => b.priorityScore - a.priorityScore || b.gap - a.gap);

  ranked.forEach((item, idx) => {
    item.priorityRank = idx + 1;
  });

  const criticalBlockers = rows.filter(
    (r) => r.isCritical && (r.isUnassessed || (r.currentLevel !== null && r.currentLevel < r.targetLevel))
  );

  const domainSummaries: DomainGapSummary[] = domains.map((dom) => {
    const domRows = rows.filter((r) => r.domainId === dom.id);
    const domAssessed = domRows.filter((r) => !r.isUnassessed && r.currentLevel !== null);
    const domUnassessed = domRows.filter((r) => r.isUnassessed);
    const dMinSum = domAssessed.reduce((s, r) => s + Math.min(r.currentLevel || 0, r.targetLevel), 0);
    const dTargetSum = domAssessed.reduce((s, r) => s + r.targetLevel, 0);
    const avgCurr =
      domAssessed.length > 0
        ? domAssessed.reduce((s, r) => s + (r.currentLevel || 0), 0) / domAssessed.length
        : 0;
    const avgTgt =
      domRows.length > 0
        ? domRows.reduce((s, r) => s + r.targetLevel, 0) / domRows.length
        : 0;
    const avgGap =
      domAssessed.length > 0
        ? domAssessed.reduce((s, r) => s + r.gap, 0) / domAssessed.length
        : 0;

    return {
      domainId: dom.id,
      domainCode: dom.code,
      domainNameEn: dom.nameEn,
      domainNameVi: dom.nameVi,
      color: dom.color,
      assessedCount: domAssessed.length,
      unassessedCount: domUnassessed.length,
      totalRequiredCount: domRows.length,
      avgCurrentLevel: Number(avgCurr.toFixed(2)),
      avgTargetLevel: Number(avgTgt.toFixed(2)),
      avgGap: Number(avgGap.toFixed(2)),
      achievementPct: dTargetSum > 0 ? Math.round((dMinSum / dTargetSum) * 100) : 0,
      criticalGapsCount: domRows.filter((r) => r.gapClass === 3 || (r.isCritical && r.gap > 0)).length,
    };
  });

  const achievementPct = sumTarget > 0 ? Math.round((sumMinCurrentTarget / sumTarget) * 100) : 0;
  const weightedAchievementPct =
    weightedTargetSum > 0 ? Math.round((weightedMinSum / weightedTargetSum) * 100) : 0;
  const criticalAchievementPct =
    critTargetSum > 0 ? Math.round((critMinSum / critTargetSum) * 100) : 100;
  const averageGap = assessedCount > 0 ? Number((gapSum / assessedCount).toFixed(2)) : 0;

  return {
    hasApprovedAssessment: Boolean(chosenAssessment),
    hasValidTargetPosition: true,
    assessmentId: chosenAssessment?.id,
    assessmentPeriod: chosenAssessment?.assessmentPeriod,
    assessorType: chosenAssessment?.assessorType,
    targetPosition,
    weightMode: config.weightMode,
    totalRequiredCompetencies: requiredComps.length,
    assessedCount,
    unassessedCount,
    achievementPct,
    weightedAchievementPct,
    criticalAchievementPct,
    averageGap,
    gapDistribution,
    criticalBlockers,
    rows,
    priorityDevelopmentList: ranked,
    domainSummaries,
  };
}

export interface RecommendedActivityCandidate {
  key: string;
  competencyId: string;
  competencyCode: string;
  domainId: string;
  category: DevelopmentCategory;
  ratioCategory: ActivityType702010;
  sourceType: DevelopmentActivityDoc['sourceType'];
  sourceRecordId?: string;
  sourceCode?: string;
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
  estimatedHours: number;
  evidenceRequired: boolean;
  matchReason: string;
}

/**
 * Matches real existing LMS courses, OJT/practical assignments, rubrics, and career path stages
 * to a competency gap. Never invents nonexistent course or assignment IDs.
 */
export function matchRecommendationsForCompetency(params: {
  competency: Competency;
  gap: number;
  targetLevel: ProficiencyLevel;
  courses: Course[];
  ojtAssignments: OJTAssignment[];
  learningPaths: LearningPath[];
  customActivities?: DevelopmentActivityDoc[];
}): {
  hasMappedActivity: boolean;
  recommendations: RecommendedActivityCandidate[];
  unmappedMessage?: string;
} {
  const { competency, targetLevel, courses, ojtAssignments, customActivities = [] } = params;
  const recs: RecommendedActivityCandidate[] = [];

  // Category A: Formal Learning (only real courses mapped via competency.associatedCourseIds or domain)
  const linkedCourses = courses.filter((c) => (competency.associatedCourseIds || []).includes(c.id));
  for (const crs of linkedCourses) {
    recs.push({
      key: `course_${crs.id}_${competency.code}`,
      competencyId: competency.id,
      competencyCode: competency.code,
      domainId: competency.domainId,
      category: 'A_Formal_Learning',
      ratioCategory: '10_formal',
      sourceType: 'course',
      sourceRecordId: crs.id,
      sourceCode: crs.code,
      titleEn: `Complete Course ${crs.code}: ${crs.titleEn}`,
      titleVi: `Hoàn thành khóa học ${crs.code}: ${crs.titleVi}`,
      descriptionEn: crs.learningObjectivesEn?.[0] || crs.titleEn,
      descriptionVi: crs.learningObjectivesVi?.[0] || crs.titleVi,
      estimatedHours: crs.durationHours || 8,
      evidenceRequired: false, // Course verified via LMS enrollment + passing quiz
      matchReason: `Mapped in Competency.associatedCourseIds (${crs.code})`,
    });
  }

  // Category C: Practical Assignments / OJT (real ojtAssignments matching domain or linked course practicalAssignmentId)
  const courseLinkedOjtIds = new Set(
    linkedCourses.map((c) => c.practicalAssignmentId).filter((id): id is string => Boolean(id))
  );
  const matchingOjts = ojtAssignments.filter(
    (o) => courseLinkedOjtIds.has(o.id) || o.domainId === competency.domainId
  );

  for (const ojt of matchingOjts.slice(0, 2)) {
    recs.push({
      key: `ojt_${ojt.id}_${competency.code}`,
      competencyId: competency.id,
      competencyCode: competency.code,
      domainId: competency.domainId,
      category: 'C_Practical_Assignment',
      ratioCategory: '70_experiential',
      sourceType: 'practical_assignment',
      sourceRecordId: ojt.id,
      sourceCode: ojt.code,
      titleEn: `Practical Assignment ${ojt.code}: ${ojt.titleEn}`,
      titleVi: `Bài tập thực hành ${ojt.code}: ${ojt.titleVi}`,
      descriptionEn: ojt.descriptionEn,
      descriptionVi: ojt.descriptionVi,
      estimatedHours: 16,
      evidenceRequired: true,
      matchReason: courseLinkedOjtIds.has(ojt.id)
        ? `Linked via course practicalAssignmentId (${ojt.code})`
        : `Domain match (${ojt.code} in ${competency.domainId})`,
    });
  }

  // Category B: On-the-Job Training (grounded in competency.evidenceRequirements)
  if (competency.evidenceRequirements && competency.evidenceRequirements.length > 0) {
    recs.push({
      key: `job_exp_${competency.code}`,
      competencyId: competency.id,
      competencyCode: competency.code,
      domainId: competency.domainId,
      category: 'B_On_The_Job',
      ratioCategory: '70_experiential',
      sourceType: 'ojt',
      sourceCode: `OJT-${competency.code}`,
      titleEn: `OJT Stretch Task (L${targetLevel}): ${competency.evidenceRequirements[0]}`,
      titleVi: `Nhiệm vụ OJT thực tế (L${targetLevel}): ${competency.evidenceRequirements[0]}`,
      descriptionEn: `Lead real property deliverable to achieve Level ${targetLevel}: ${
        targetLevel === 4
          ? competency.assessmentCriteria?.level4
          : targetLevel === 3
          ? competency.assessmentCriteria?.level3
          : competency.assessmentCriteria?.level2
      }`,
      descriptionVi: `Trực tiếp chủ trì nghiệp vụ thực tế tại khách sạn để đạt cấp độ ${targetLevel}: ${
        targetLevel === 4
          ? competency.assessmentCriteria?.level4
          : targetLevel === 3
          ? competency.assessmentCriteria?.level3
          : competency.assessmentCriteria?.level2
      }`,
      estimatedHours: 24,
      evidenceRequired: true,
      matchReason: 'Grounded in Competency.evidenceRequirements & rubric level criteria',
    });
  }

  // Category D: Coaching & Mentoring (only if competency has mapped learning items or criteria)
  if (recs.length > 0) {
    recs.push({
      key: `coach_${competency.code}`,
      competencyId: competency.id,
      competencyCode: competency.code,
      domainId: competency.domainId,
      category: 'D_Coaching_Mentoring',
      ratioCategory: '20_social',
      sourceType: 'coaching',
      sourceCode: `COACH-${competency.code}`,
      titleEn: `FC 1-on-1 Coaching & Workpaper Review (${competency.code})`,
      titleVi: `Kèm cặp 1-1 cùng FC & Soát xét hồ sơ (${competency.code})`,
      descriptionEn: `Bi-weekly mentoring review with Cluster Financial Controller focused on ${competency.nameEn}.`,
      descriptionVi: `Buổi kèm cặp định kỳ 2 tuần/lần cùng Giám đốc Tài chính về ${competency.nameVi}.`,
      estimatedHours: 6,
      evidenceRequired: true,
      matchReason: '20% Social Coaching aligned to active gap',
    });
  }

  // Any custom L&D created activities for this competency
  for (const act of customActivities.filter(
    (a) => a.competencyCode === competency.code && a.sourceType === 'custom_lnd'
  )) {
    recs.push({
      key: `custom_${act.id}`,
      competencyId: competency.id,
      competencyCode: competency.code,
      domainId: competency.domainId,
      category: act.category,
      ratioCategory: act.ratioCategory,
      sourceType: 'custom_lnd',
      sourceRecordId: act.id,
      sourceCode: act.sourceCode || 'LND-CUSTOM',
      titleEn: act.titleEn,
      titleVi: act.titleVi,
      descriptionEn: act.descriptionEn,
      descriptionVi: act.descriptionVi,
      estimatedHours: act.estimatedHours,
      evidenceRequired: act.evidenceRequired,
      matchReason: 'Created by L&D / Super Admin',
    });
  }

  if (recs.length === 0) {
    return {
      hasMappedActivity: false,
      recommendations: [],
      unmappedMessage: 'No mapped learning activity available',
    };
  }

  return {
    hasMappedActivity: true,
    recommendations: recs,
  };
}

export interface IdpProgressMetrics {
  totalObjectives: number;
  completedObjectives: number;
  pendingValidationObjectives: number;
  inProgressObjectives: number;
  notStartedObjectives: number;
  completionPct: number; // Completed approved objectives / Total approved objectives * 100
  ratioBreakdown: {
    experientialPct: number;
    socialPct: number;
    formalPct: number;
  };
  objectiveDetails: Array<{
    objectiveId: string;
    competencyCode: string;
    strictCompleted: boolean;
    blockingReason?: string;
  }>;
}

/**
 * Evaluates IDP completion % strictly:
 * - Course-linked objectives require completed LMS CourseEnrollment (+ passing quiz if applicable).
 * - OJT/Practical/Coaching objectives require uploaded/recorded evidence AND supervisor validation approved.
 */
export function evaluateIdpProgress(params: {
  idp: IndividualDevelopmentPlanDoc;
  enrollments: CourseEnrollment[];
  quizAttempts: QuizAttempt[];
  submissions: AssignmentSubmission[];
  courses: Course[];
  activities: DevelopmentActivityDoc[];
}): IdpProgressMetrics {
  const { idp, enrollments, quizAttempts, submissions, courses, activities } = params;
  const objectives = idp.objectives || [];

  if (objectives.length === 0) {
    return {
      totalObjectives: 0,
      completedObjectives: 0,
      pendingValidationObjectives: 0,
      inProgressObjectives: 0,
      notStartedObjectives: 0,
      completionPct: 0,
      ratioBreakdown: { experientialPct: 0, socialPct: 0, formalPct: 0 },
      objectiveDetails: [],
    };
  }

  let completedCount = 0;
  let pendingValidationCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;
  let count70 = 0;
  let count20 = 0;
  let count10 = 0;

  const objectiveDetails: IdpProgressMetrics['objectiveDetails'] = [];

  for (const obj of objectives) {
    if (obj.ratioCategory === '70_experiential') count70++;
    else if (obj.ratioCategory === '20_social') count20++;
    else count10++;

    let strictCompleted = false;
    let blockingReason: string | undefined;

    if (obj.category === 'A_Formal_Learning' && obj.linkedCourseId) {
      const enr = enrollments.find(
        (e) => e.userId === idp.employeeId && e.courseId === obj.linkedCourseId
      );
      const crs = courses.find((c) => c.id === obj.linkedCourseId);
      const passedQuiz =
        !crs ||
        crs.passingScore <= 0 ||
        (enr?.quizScore !== undefined && enr.quizScore >= crs.passingScore) ||
        quizAttempts.some((q) => q.userId === idp.employeeId && q.courseId === obj.linkedCourseId && q.passed);

      if (enr?.status === 'completed' && passedQuiz) {
        strictCompleted = true;
      } else if (obj.status === 'completed' && obj.supervisorValidationStatus === 'approved') {
        // Explicit supervisor override only if validated
        strictCompleted = true;
      } else {
        blockingReason =
          enr?.status !== 'completed'
            ? `Course ${obj.linkedCourseCode || obj.linkedCourseId} not yet completed in LMS (${enr?.progressPercent || 0}%).`
            : `Quiz score below passing threshold (${crs?.passingScore}%).`;
      }
    } else {
      // OJT / Practical / Coaching / Self-study: require evidence AND supervisor validation
      const linkedActs = activities.filter(
        (a) => a.idpId === idp.id && (a.objectiveId === obj.id || a.competencyCode === obj.competencyCode)
      );
      const hasLinkedSubApproved =
        obj.linkedPracticalId &&
        submissions.some(
          (s) =>
            s.userId === idp.employeeId &&
            s.assignmentId === obj.linkedPracticalId &&
            s.status === 'approved'
        );

      const hasEvidence =
        Boolean(obj.evidenceNotes?.trim() || obj.evidenceFileName?.trim()) ||
        linkedActs.some((a) => Boolean(a.evidenceNotes?.trim() || a.evidenceFileName?.trim())) ||
        Boolean(hasLinkedSubApproved);

      const isValidated =
        obj.supervisorValidationStatus === 'approved' ||
        linkedActs.some((a) => a.validationStatus === 'approved') ||
        Boolean(hasLinkedSubApproved);

      if (hasEvidence && isValidated) {
        strictCompleted = true;
      } else if (hasEvidence && !isValidated) {
        blockingReason = 'Evidence submitted; awaiting supervisor/FC validation.';
      } else {
        blockingReason = 'Evidence required before completion.';
      }
    }

    if (strictCompleted) {
      completedCount++;
    } else if (obj.status === 'pending_validation' || blockingReason?.includes('awaiting')) {
      pendingValidationCount++;
    } else if (obj.status === 'in_progress' || obj.progressPercent > 0) {
      inProgressCount++;
    } else {
      notStartedCount++;
    }

    objectiveDetails.push({
      objectiveId: obj.id,
      competencyCode: obj.competencyCode,
      strictCompleted,
      blockingReason,
    });
  }

  const total = objectives.length;
  const completionPct = Math.round((completedCount / total) * 100);

  return {
    totalObjectives: total,
    completedObjectives: completedCount,
    pendingValidationObjectives: pendingValidationCount,
    inProgressObjectives: inProgressCount,
    notStartedObjectives: notStartedCount,
    completionPct,
    ratioBreakdown: {
      experientialPct: Math.round((count70 / total) * 100),
      socialPct: Math.round((count20 / total) * 100),
      formalPct: Math.round((count10 / total) * 100),
    },
    objectiveDetails,
  };
}

export interface CareerReadinessEvaluation {
  status: CareerReadinessStatus;
  blockedFromReadyForReview: boolean;
  blockingReasons: string[];
  recommendedNextSteps: string[];
  achievementPct: number;
  weightedAchievementPct: number;
  criticalAchievementPct: number;
  idpCompletionPct: number;
}

/**
 * Evaluates Career Readiness using configurable thresholds and mandatory critical competency gate.
 */
export function evaluateCareerReadiness(params: {
  gapSummary: GapAnalysisSummary;
  idpMetrics: IdpProgressMetrics | null;
  config?: TalentConfigDoc;
}): CareerReadinessEvaluation {
  const { gapSummary, idpMetrics, config = DEFAULT_TALENT_CONFIG } = params;
  const thresholds = config.readinessThresholds;
  const ach =
    config.weightMode === 'custom_weighted'
      ? gapSummary.weightedAchievementPct
      : gapSummary.achievementPct;
  const idpPct = idpMetrics ? idpMetrics.completionPct : 0;
  const critPct = gapSummary.criticalAchievementPct;

  const blockingReasons: string[] = [];
  const recommendedNextSteps: string[] = [];

  if (!gapSummary.hasValidTargetPosition) {
    return {
      status: 'Not Ready',
      blockedFromReadyForReview: true,
      blockingReasons: [gapSummary.targetPositionError || 'Target position missing competency requirements.'],
      recommendedNextSteps: ['Configure competency targets for the target position in Talent Config.'],
      achievementPct: 0,
      weightedAchievementPct: 0,
      criticalAchievementPct: 0,
      idpCompletionPct: idpPct,
    };
  }

  if (!gapSummary.hasApprovedAssessment) {
    return {
      status: 'Not Ready',
      blockedFromReadyForReview: true,
      blockingReasons: ['No approved competency assessment available for this employee.'],
      recommendedNextSteps: ['Complete and approve baseline competency assessment.'],
      achievementPct: 0,
      weightedAchievementPct: 0,
      criticalAchievementPct: 0,
      idpCompletionPct: idpPct,
    };
  }

  if (gapSummary.unassessedCount > 0) {
    blockingReasons.push(`${gapSummary.unassessedCount} required competencies remain unassessed.`);
  }

  if (thresholds.requireAllCriticalAtTarget && gapSummary.criticalBlockers.length > 0) {
    blockingReasons.push(
      `Critical competencies below target (${gapSummary.criticalBlockers
        .map((b) => `${b.competencyCode}: L${b.currentLevel ?? 0}/L${b.targetLevel}`)
        .join(', ')}).`
    );
    recommendedNextSteps.push(
      `Close critical gaps first: ${gapSummary.criticalBlockers.map((b) => b.competencyCode).join(', ')}.`
    );
  }

  if (ach < thresholds.readyForReviewMinAchievement) {
    blockingReasons.push(
      `Competency Achievement ${ach}% is below Ready for Review threshold (${thresholds.readyForReviewMinAchievement}%).`
    );
  }

  if (idpPct < thresholds.readyForReviewMinIdp) {
    blockingReasons.push(
      `IDP Completion ${idpPct}% is below Ready for Review threshold (${thresholds.readyForReviewMinIdp}%).`
    );
    recommendedNextSteps.push('Complete remaining approved IDP objectives and submit supervisor validation evidence.');
  }

  if (critPct < thresholds.readyForReviewMinCritical) {
    blockingReasons.push(
      `Critical Competency Score ${critPct}% is below minimum (${thresholds.readyForReviewMinCritical}%).`
    );
  }

  const meetsAllReady =
    ach >= thresholds.readyForReviewMinAchievement &&
    idpPct >= thresholds.readyForReviewMinIdp &&
    critPct >= thresholds.readyForReviewMinCritical &&
    (!thresholds.requireAllCriticalAtTarget || gapSummary.criticalBlockers.length === 0) &&
    gapSummary.unassessedCount === 0;

  let status: CareerReadinessStatus;
  let blockedFromReadyForReview = false;

  if (meetsAllReady) {
    status = 'Ready for Review';
    recommendedNextSteps.push('Schedule executive promotion panel review with Cluster FC & General Manager.');
  } else if (
    ach >= thresholds.nearlyReadyMinAchievement &&
    idpPct >= thresholds.nearlyReadyMinIdp
  ) {
    status = 'Nearly Ready';
    if (
      ach >= thresholds.readyForReviewMinAchievement &&
      idpPct >= thresholds.readyForReviewMinIdp &&
      thresholds.requireAllCriticalAtTarget &&
      gapSummary.criticalBlockers.length > 0
    ) {
      blockedFromReadyForReview = true;
    }
  } else if (ach >= thresholds.developingMinAchievement) {
    status = 'Developing';
    if (gapSummary.priorityDevelopmentList.length > 0) {
      recommendedNextSteps.push(
        `Focus next 90 days on top priority gaps: ${gapSummary.priorityDevelopmentList
          .slice(0, 3)
          .map((p) => p.competencyCode)
          .join(', ')}.`
      );
    }
  } else {
    status = 'Not Ready';
    recommendedNextSteps.push('Establish foundational 70-20-10 IDP with Financial Controller and complete core USALI modules.');
  }

  return {
    status,
    blockedFromReadyForReview,
    blockingReasons,
    recommendedNextSteps,
    achievementPct: gapSummary.achievementPct,
    weightedAchievementPct: gapSummary.weightedAchievementPct,
    criticalAchievementPct: critPct,
    idpCompletionPct: idpPct,
  };
}
