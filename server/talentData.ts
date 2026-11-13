import * as XLSX from 'xlsx';
import type {
  User,
  Competency,
  CompetencyDomain,
  Course,
  OJTAssignment,
  CourseEnrollment,
  QuizAttempt,
  AssignmentSubmission,
  CompetencyAssessmentDoc,
  IndividualDevelopmentPlanDoc,
  DevelopmentActivityDoc,
  CompetencyReassessmentDoc,
  CareerReadinessReviewDoc,
  IdpReviewLogDoc,
  TalentConfigDoc,
  LmsNotificationItem,
  ProficiencyLevel,
  CompetencyResultEntry,
} from '../src/types/index.ts';
import {
  DEFAULT_TALENT_CONFIG,
  calculateGapAnalysis,
  evaluateIdpProgress,
  evaluateCareerReadiness,
  resolvePositionTargetMatrix,
} from '../src/lib/talentEngine.ts';

function buildResultsMap(
  competencies: Competency[],
  targetPosition: string,
  levelOverrides: Record<string, ProficiencyLevel | null>,
  defaultCurrent: ProficiencyLevel
): Record<string, CompetencyResultEntry> {
  const { targetsByCode } = resolvePositionTargetMatrix(competencies, targetPosition, DEFAULT_TALENT_CONFIG);
  const results: Record<string, CompetencyResultEntry> = {};

  for (const comp of competencies) {
    const targetLevel = targetsByCode[comp.code];
    if (!targetLevel) continue;
    const rawLevel = comp.code in levelOverrides ? levelOverrides[comp.code] : defaultCurrent;
    const currentLevel = rawLevel === null ? null : (Math.max(1, Math.min(4, rawLevel)) as ProficiencyLevel);
    results[comp.code] = {
      competencyId: comp.id,
      competencyCode: comp.code,
      domainId: comp.domainId,
      currentLevel,
      targetLevel,
      gap: currentLevel === null ? targetLevel : Math.max(0, targetLevel - currentLevel),
      selfLevel: currentLevel,
      supervisorLevel: currentLevel,
      assessorNotes:
        currentLevel === null
          ? 'Pending field validation.'
          : currentLevel >= targetLevel
          ? 'Meets target operational standard.'
          : `Requires structured development to reach Level ${targetLevel}.`,
    };
  }
  return results;
}

export function createSeedTalentState(
  users: User[],
  competencies: Competency[]
): {
  talentConfig: TalentConfigDoc;
  competencyAssessments: CompetencyAssessmentDoc[];
  talentIdps: IndividualDevelopmentPlanDoc[];
  developmentActivities: DevelopmentActivityDoc[];
  competencyReassessments: CompetencyReassessmentDoc[];
  careerReadinessReviews: CareerReadinessReviewDoc[];
  idpReviewLogs: IdpReviewLogDoc[];
  talentNotifications: LmsNotificationItem[];
} {
  // Scenario 1: Accountant -> Senior Accountant (user_learner8: Bui Quang Huy)
  const asmtHuy: CompetencyAssessmentDoc = {
    id: 'casmt_seed_huy_1',
    version: 1,
    employeeId: 'user_learner8',
    employeeName: 'Bùi Quang Huy',
    property: 'Emerald Bay Luxury Suites Nha Trang',
    department: 'Finance & Accounting',
    currentPosition: 'Accountant',
    targetPosition: 'Senior Accountant',
    assessmentPeriod: '2026-Q1',
    assessorId: 'user_fc2',
    assessorName: 'Sarah Jenkins',
    assessorType: 'supervisor',
    status: 'approved',
    submittedAt: '2026-02-15T09:00:00.000Z',
    approvedById: 'user_fc2',
    approvedByName: 'Sarah Jenkins',
    approvedAt: '2026-02-18T14:00:00.000Z',
    overallComments: 'Solid daily AP/Night Audit habits; needs month-end close ownership and USALI package breakdown.',
    results: buildResultsMap(
      competencies,
      'Senior Accountant',
      {
        'FAR-01': 2,
        'FAR-02': 1,
        'FAR-03': 1,
        'FCA-01': 2,
        'FCA-02': 1,
        'FPM-01': 1,
        'BPA-01': 1,
      },
      1
    ),
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-02-18T14:00:00.000Z',
  };

  // Scenario 2: Senior Accountant -> Assistant Financial Controller (user_learner1: Nguyen Minh Thu)
  const asmtThuQ1: CompetencyAssessmentDoc = {
    id: 'casmt_seed_thu_1',
    version: 1,
    employeeId: 'user_learner1',
    employeeName: 'Nguyễn Minh Thư',
    property: 'Grand Horizon Saigon Hotel & Residences',
    department: 'Finance & Accounting',
    currentPosition: 'Senior Accountant',
    targetPosition: 'Assistant Financial Controller',
    assessmentPeriod: '2026-Q1',
    assessorId: 'user_fc1',
    assessorName: 'David Tran',
    assessorType: 'financial_controller',
    status: 'approved',
    submittedAt: '2026-03-10T09:00:00.000Z',
    approvedById: 'user_fc1',
    approvedByName: 'David Tran',
    approvedAt: '2026-03-18T14:30:00.000Z',
    overallComments: 'Strong USALI foundation; priority gaps in Day 3 Fast-Close, Flow-Through diagnostics, and Zero-Based Budgeting.',
    results: buildResultsMap(
      competencies,
      'Assistant Financial Controller',
      {
        'FAR-01': 3,
        'FAR-02': 2,
        'FAR-03': 2,
        'FAR-04': 3,
        'FAR-05': 2,
        'FCA-01': 2,
        'FCA-02': 3,
        'FCA-03': 2,
        'FCA-04': 2,
        'FCA-05': 3,
        'FPM-01': 2,
        'FPM-02': 2,
        'FPM-03': 2,
        'FPM-04': 1,
        'FPM-05': 2,
        'BPA-01': 2,
        'BPA-02': 3,
        'BPA-03': 2,
        'BPA-04': 2,
        'BPA-05': 2,
        'LPM-01': 2,
        'LPM-02': 2,
        'LPM-03': 2,
        'LPM-04': 2,
        'SBP-01': 2,
        'SBP-02': 2,
        'SBP-04': 2,
      },
      2
    ),
    createdAt: '2026-03-08T08:00:00.000Z',
    updatedAt: '2026-03-18T14:30:00.000Z',
  };

  // Scenario 3: Assistant FC -> Financial Controller (user_learner2: Le Hoang Nam)
  // Notice: strong overall score, but SBP-02 / FPM-04 at L3 instead of L4 -> tests critical competency blocker!
  const asmtNam: CompetencyAssessmentDoc = {
    id: 'casmt_seed_nam_1',
    version: 1,
    employeeId: 'user_learner2',
    employeeName: 'Lê Hoàng Nam',
    property: 'Grand Horizon Saigon Hotel & Residences',
    department: 'Finance & Accounting',
    currentPosition: 'Assistant Financial Controller',
    targetPosition: 'Financial Controller',
    assessmentPeriod: '2026-Q1',
    assessorId: 'user_fc1',
    assessorName: 'David Tran',
    assessorType: 'final_validated',
    status: 'approved',
    submittedAt: '2026-03-19T10:00:00.000Z',
    approvedById: 'user_lnd',
    approvedByName: 'Marcus Sterling',
    approvedAt: '2026-03-22T11:00:00.000Z',
    overallComments: 'High-potential AFC; passes internal controls at L4, needs final step-up on GM decision support (SBP-02) & CAPEX DCF ownership.',
    results: buildResultsMap(
      competencies,
      'Financial Controller',
      {
        'FAR-01': 4,
        'FAR-02': 4,
        'FAR-03': 4,
        'FAR-04': 4,
        'FAR-05': 4,
        'FCA-01': 4,
        'FCA-02': 4,
        'FCA-03': 4,
        'FCA-04': 4,
        'FCA-05': 4,
        'FPM-01': 4,
        'FPM-02': 4,
        'FPM-03': 4,
        'FPM-04': 3,
        'FPM-05': 4,
        'BPA-01': 4,
        'BPA-02': 4,
        'BPA-03': 4,
        'BPA-04': 4,
        'BPA-05': 3,
        'LPM-01': 4,
        'LPM-02': 4,
        'LPM-03': 4,
        'LPM-04': 3,
        'SBP-01': 4,
        'SBP-02': 3, // Critical competency below target L4!
        'SBP-03': 4,
        'SBP-04': 4,
        'SBP-05': 3,
      },
      4
    ),
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-22T11:00:00.000Z',
  };

  // Scenario 4: Financial Controller -> Strategic Finance Business Partner (user_fc2: Sarah Jenkins)
  const asmtSarah: CompetencyAssessmentDoc = {
    id: 'casmt_seed_sarah_1',
    version: 1,
    employeeId: 'user_fc2',
    employeeName: 'Sarah Jenkins',
    property: 'Royal Palm Resort & Spa Danang (450 Keys)',
    department: 'Finance & Accounting',
    currentPosition: 'Financial Controller',
    targetPosition: 'Strategic Finance Business Partner',
    assessmentPeriod: '2026-Q1',
    assessorId: 'user_admin',
    assessorName: 'Elena Rostova',
    assessorType: 'hr_lnd',
    status: 'approved',
    submittedAt: '2026-03-01T10:00:00.000Z',
    approvedById: 'user_admin',
    approvedByName: 'Elena Rostova',
    approvedAt: '2026-03-05T16:00:00.000Z',
    overallComments: 'Ready for Regional Cluster Finance & Strategic Business Partnering endorsement.',
    results: buildResultsMap(
      competencies,
      'Strategic Finance Business Partner',
      {
        'SBP-05': 4,
      },
      4
    ),
    createdAt: '2026-02-26T09:00:00.000Z',
    updatedAt: '2026-03-05T16:00:00.000Z',
  };

  // Additional property heatmap records (user_learner3 Mai, user_learner4 Duc Anh)
  const asmtMai: CompetencyAssessmentDoc = {
    id: 'casmt_seed_mai_1',
    version: 1,
    employeeId: 'user_learner3',
    employeeName: 'Phạm Thị Mai',
    property: 'Royal Palm Resort & Spa Danang',
    department: 'Finance & Accounting',
    currentPosition: 'Senior Accountant',
    targetPosition: 'Assistant Financial Controller',
    assessmentPeriod: '2026-Q1',
    assessorId: 'user_fc2',
    assessorName: 'Sarah Jenkins',
    assessorType: 'financial_controller',
    status: 'approved',
    approvedById: 'user_fc2',
    approvedByName: 'Sarah Jenkins',
    approvedAt: '2026-03-14T10:00:00.000Z',
    results: buildResultsMap(
      competencies,
      'Assistant Financial Controller',
      {
        'FCA-02': 3,
        'FCA-01': 3,
        'FPM-01': 2,
        'FPM-02': 1,
        'BPA-01': 2,
        'SBP-02': 1,
      },
      2
    ),
    createdAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-03-14T10:00:00.000Z',
  };

  const idpThu: IndividualDevelopmentPlanDoc = {
    id: 'tidp_seed_thu_1',
    version: 1,
    employeeId: 'user_learner1',
    employeeName: 'Nguyễn Minh Thư',
    property: 'Grand Horizon Saigon Hotel & Residences',
    department: 'Finance & Accounting',
    currentPosition: 'Senior Accountant',
    targetPosition: 'Assistant Financial Controller',
    sourceAssessmentId: asmtThuQ1.id,
    sourceAssessmentPeriod: '2026-Q1',
    managerId: 'user_fc1',
    managerName: 'David Tran',
    status: 'in_progress',
    periodStart: '2026-03-20',
    periodEnd: '2026-09-30',
    overallGoalEn: 'Close 5 priority competency gaps across Month-End Fast Close, Internal Control, Zero-Based Budgeting, and GOP Flow-Through to attain AFC readiness.',
    overallGoalVi: 'Thu hẹp 5 khoảng trống năng lực trọng tâm về Khóa sổ nhanh Day 3, Kiểm soát nội bộ, Ngân sách & GOP Flow-Through để sẵn sàng bổ nhiệm AFC.',
    ratioTarget: { experiential70: 70, social20: 20, formal10: 10 },
    submittedAt: '2026-03-20T09:00:00.000Z',
    managerReviewedBy: 'David Tran',
    managerReviewedAt: '2026-03-21T11:00:00.000Z',
    lndApprovedBy: 'Marcus Sterling',
    lndApprovedAt: '2026-03-22T15:00:00.000Z',
    activatedAt: '2026-03-22T15:05:00.000Z',
    createdBy: 'user_learner1',
    createdAt: '2026-03-20T08:30:00.000Z',
    updatedAt: '2026-04-05T10:00:00.000Z',
    objectives: [
      {
        id: 'tobj_thu_1',
        competencyId: 'comp_far_01',
        competencyCode: 'FAR-01',
        domainId: 'dom_1',
        baselineLevel: 3,
        targetLevel: 3,
        gap: 0,
        isCritical: true,
        priority: 'High',
        titleEn: 'Complete Course HFC-101: Mastering USALI 11th & 12th Editions',
        titleVi: 'Hoàn thành khóa học HFC-101: Làm chủ chuẩn mực USALI 11th & 12th',
        category: 'A_Formal_Learning',
        ratioCategory: '10_formal',
        linkedCourseId: 'course_01',
        linkedCourseCode: 'HFC-101',
        activityIds: ['tact_seed_thu_1'],
        targetDate: '2026-04-30',
        successMeasure: 'Score >= 80% on USALI Mastery Exam and complete all 4 modules.',
        status: 'completed',
        progressPercent: 100,
        evidenceNotes: 'Completed HFC-101 with 92% final quiz score.',
        supervisorValidationStatus: 'approved',
        supervisorValidatedBy: 'David Tran',
        supervisorValidatedAt: '2026-03-25T10:00:00.000Z',
        completedAt: '2026-03-25T10:00:00.000Z',
      },
      {
        id: 'tobj_thu_2',
        competencyId: 'comp_far_02',
        competencyCode: 'FAR-02',
        domainId: 'dom_1',
        baselineLevel: 2,
        targetLevel: 3,
        gap: 1,
        isCritical: false,
        priority: 'High',
        titleEn: 'OJT-FAR-01: Lead Day 3 Accelerated Month-End Closing & P&L Critique',
        titleVi: 'OJT-FAR-01: Chủ trì khóa sổ tháng Day 3 & Báo cáo biến động P&L',
        category: 'C_Practical_Assignment',
        ratioCategory: '70_experiential',
        linkedPracticalId: 'ojt_01',
        linkedPracticalCode: 'OJT-FAR-01',
        activityIds: ['tact_seed_thu_2'],
        targetDate: '2026-05-30',
        successMeasure: 'Deliver Day 3 flash P&L & Balance Sheet Recs with zero suspense > 30 days.',
        status: 'completed',
        progressPercent: 100,
        evidenceNotes: 'Submitted MinhThu_OJT_MonthEnd_Closing_Pack.xlsx; scored 90/100 by Cluster FC.',
        evidenceFileName: 'MinhThu_OJT_MonthEnd_Closing_Pack.xlsx',
        supervisorValidationStatus: 'approved',
        supervisorValidatedBy: 'David Tran',
        supervisorValidatedAt: '2026-03-28T16:00:00.000Z',
        completedAt: '2026-03-28T16:00:00.000Z',
      },
      {
        id: 'tobj_thu_3',
        competencyId: 'comp_fca_01',
        competencyCode: 'FCA-01',
        domainId: 'dom_2',
        baselineLevel: 2,
        targetLevel: 3,
        gap: 1,
        isCritical: true,
        priority: 'Critical',
        titleEn: 'Lead Front Office & F&B Internal Control CSA Audit',
        titleVi: 'Chủ trì kiểm toán tự đánh giá Kiểm soát nội bộ (CSA) Quầy lễ tân & F&B',
        category: 'B_On_The_Job',
        ratioCategory: '70_experiential',
        linkedPracticalId: 'ojt_05',
        linkedPracticalCode: 'OJT-FCA-01',
        activityIds: ['tact_seed_thu_3'],
        targetDate: '2026-06-30',
        successMeasure: 'Achieve >= 90% internal control audit compliance with signed SOP revisions.',
        status: 'in_progress',
        progressPercent: 50,
        evidenceNotes: '',
        supervisorValidationStatus: 'pending_validation',
      },
      {
        id: 'tobj_thu_4',
        competencyId: 'comp_bpa_01',
        competencyCode: 'BPA-01',
        domainId: 'dom_4',
        baselineLevel: 2,
        targetLevel: 3,
        gap: 1,
        isCritical: true,
        priority: 'Critical',
        titleEn: 'Bi-Weekly Coaching & GOP Flow-Through Diagnostic Briefings',
        titleVi: 'Kèm cặp 1-1 cùng FC & Phân tích dòng chuyển hóa lợi nhuận GOP Flow-Through',
        category: 'D_Coaching_Mentoring',
        ratioCategory: '20_social',
        linkedCourseId: 'course_06',
        linkedCourseCode: 'HFC-302',
        activityIds: ['tact_seed_thu_4'],
        targetDate: '2026-07-31',
        successMeasure: 'Present departmental Flow-Through & Flex deck to Cluster FC and GM.',
        status: 'not_started',
        progressPercent: 0,
        supervisorValidationStatus: 'pending_validation',
      },
    ],
  };

  const idpNam: IndividualDevelopmentPlanDoc = {
    id: 'tidp_seed_nam_1',
    version: 1,
    employeeId: 'user_learner2',
    employeeName: 'Lê Hoàng Nam',
    property: 'Grand Horizon Saigon Hotel & Residences',
    department: 'Finance & Accounting',
    currentPosition: 'Assistant Financial Controller',
    targetPosition: 'Financial Controller',
    sourceAssessmentId: asmtNam.id,
    sourceAssessmentPeriod: '2026-Q1',
    managerId: 'user_fc1',
    managerName: 'David Tran',
    status: 'in_progress',
    periodStart: '2026-03-25',
    periodEnd: '2026-08-30',
    overallGoalEn: 'Bridge final Level 4 Strategic Business Partnering and CAPEX DCF modeling gaps prior to standalone FC appointment.',
    overallGoalVi: 'Hoàn thiện năng lực Cấp 4 về Đối tác chiến lược GM và thẩm định CAPEX trước khi bổ nhiệm FC độc lập.',
    ratioTarget: { experiential70: 70, social20: 20, formal10: 10 },
    submittedAt: '2026-03-25T08:00:00.000Z',
    managerReviewedBy: 'David Tran',
    managerReviewedAt: '2026-03-26T09:00:00.000Z',
    lndApprovedBy: 'Marcus Sterling',
    lndApprovedAt: '2026-03-26T16:00:00.000Z',
    activatedAt: '2026-03-26T16:05:00.000Z',
    createdBy: 'user_learner2',
    createdAt: '2026-03-25T08:00:00.000Z',
    updatedAt: '2026-04-02T10:00:00.000Z',
    objectives: [
      {
        id: 'tobj_nam_1',
        competencyId: 'comp_fpm_04',
        competencyCode: 'FPM-04',
        domainId: 'dom_3',
        baselineLevel: 3,
        targetLevel: 4,
        gap: 1,
        isCritical: false,
        priority: 'High',
        titleEn: 'Complete Course HFC-202 & $850k Smart Energy CAPEX CAR',
        titleVi: 'Hoàn thành HFC-202 & Tờ trình thẩm định CAPEX $850k Smart Energy',
        category: 'A_Formal_Learning',
        ratioCategory: '10_formal',
        linkedCourseId: 'course_04',
        linkedCourseCode: 'HFC-202',
        linkedPracticalId: 'ojt_04',
        linkedPracticalCode: 'OJT-FPM-02',
        activityIds: ['tact_seed_nam_1'],
        targetDate: '2026-06-15',
        successMeasure: 'Complete HFC-202 with >= 85% and present DCF Board paper.',
        status: 'completed',
        progressPercent: 100,
        evidenceNotes: 'Course HFC-202 completed (88% quiz); CAR workbook submitted.',
        supervisorValidationStatus: 'approved',
        supervisorValidatedBy: 'David Tran',
        supervisorValidatedAt: '2026-04-01T14:00:00.000Z',
        completedAt: '2026-04-01T14:00:00.000Z',
      },
      {
        id: 'tobj_nam_2',
        competencyId: 'comp_sbp_02',
        competencyCode: 'SBP-02',
        domainId: 'dom_6',
        baselineLevel: 3,
        targetLevel: 4,
        gap: 1,
        isCritical: true,
        priority: 'Critical',
        titleEn: 'Executive GM Co-Piloting & Ownership Scenario Defense',
        titleVi: 'Đồng hành chiến lược GM & Thuyết trình kịch bản trước Chủ đầu tư',
        category: 'D_Coaching_Mentoring',
        ratioCategory: '20_social',
        linkedCourseId: 'course_09',
        linkedCourseCode: 'HFC-501',
        activityIds: ['tact_seed_nam_2'],
        targetDate: '2026-07-30',
        successMeasure: 'Lead 3 monthly GM commercial steering reviews and Ownership Q&A.',
        status: 'in_progress',
        progressPercent: 60,
        evidenceNotes: 'Drafted Q2 scenario trade-off analysis for GM briefing.',
        supervisorValidationStatus: 'pending_validation',
      },
    ],
  };

  const activities: DevelopmentActivityDoc[] = [
    {
      id: 'tact_seed_thu_1',
      idpId: idpThu.id,
      objectiveId: 'tobj_thu_1',
      employeeId: 'user_learner1',
      competencyId: 'comp_far_01',
      competencyCode: 'FAR-01',
      domainId: 'dom_1',
      category: 'A_Formal_Learning',
      ratioCategory: '10_formal',
      titleEn: 'Complete Course HFC-101: Mastering USALI 11th & 12th Editions',
      titleVi: 'Hoàn thành khóa học HFC-101: Làm chủ chuẩn mực USALI 11th & 12th',
      descriptionEn: 'Finish all 4 modules and pass USALI Mastery Comprehensive Quiz >= 80%.',
      descriptionVi: 'Hoàn tất 4 học phần và đạt điểm thi USALI >= 80%.',
      sourceType: 'course',
      sourceRecordId: 'course_01',
      sourceCode: 'HFC-101',
      targetLevel: 3,
      estimatedHours: 16,
      dueDate: '2026-04-30',
      status: 'completed',
      validationStatus: 'approved',
      evidenceRequired: false,
      evidenceNotes: 'Verified via LMS completion (100%, Quiz 92%).',
      validatedById: 'user_fc1',
      validatedByName: 'David Tran',
      validatedAt: '2026-03-25T10:00:00.000Z',
      assignedById: 'user_fc1',
      assignedByName: 'David Tran',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-25T10:00:00.000Z',
    },
    {
      id: 'tact_seed_thu_2',
      idpId: idpThu.id,
      objectiveId: 'tobj_thu_2',
      employeeId: 'user_learner1',
      competencyId: 'comp_far_02',
      competencyCode: 'FAR-02',
      domainId: 'dom_1',
      category: 'C_Practical_Assignment',
      ratioCategory: '70_experiential',
      titleEn: 'OJT-FAR-01: Lead Day 3 Accelerated Month-End Closing',
      titleVi: 'OJT-FAR-01: Chủ trì khóa sổ tháng Day 3 & P&L Critique',
      descriptionEn: 'Own closing checklist, accruals, and executive variance critique.',
      descriptionVi: 'Trực tiếp điều phối checklist khóa sổ và báo cáo biến động P&L.',
      sourceType: 'practical_assignment',
      sourceRecordId: 'ojt_01',
      sourceCode: 'OJT-FAR-01',
      targetLevel: 3,
      estimatedHours: 24,
      dueDate: '2026-05-30',
      status: 'completed',
      validationStatus: 'approved',
      evidenceRequired: true,
      evidenceNotes: 'Day 3 Flash P&L published on schedule; 90/100 rubric score.',
      evidenceFileName: 'MinhThu_OJT_MonthEnd_Closing_Pack.xlsx',
      validatedById: 'user_fc1',
      validatedByName: 'David Tran',
      validatedAt: '2026-03-28T16:00:00.000Z',
      validatorFeedback: 'Excellent variance breakdown; monitor OTA commission accrual cut-off.',
      assignedById: 'user_fc1',
      assignedByName: 'David Tran',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-28T16:00:00.000Z',
    },
    {
      id: 'tact_seed_thu_3',
      idpId: idpThu.id,
      objectiveId: 'tobj_thu_3',
      employeeId: 'user_learner1',
      competencyId: 'comp_fca_01',
      competencyCode: 'FCA-01',
      domainId: 'dom_2',
      category: 'B_On_The_Job',
      ratioCategory: '70_experiential',
      titleEn: 'Lead Front Office & F&B Internal Control CSA Audit',
      titleVi: 'Chủ trì kiểm toán tự đánh giá Kiểm soát nội bộ (CSA)',
      descriptionEn: 'Execute surprise cashier float count and void/rebate exception testing.',
      descriptionVi: 'Thực hiện kiểm kê quỹ đột xuất và rà soát chứng từ hủy/giảm trừ POS.',
      sourceType: 'ojt',
      sourceRecordId: 'ojt_05',
      sourceCode: 'OJT-FCA-01',
      targetLevel: 3,
      estimatedHours: 20,
      dueDate: '2026-06-30',
      status: 'in_progress',
      validationStatus: 'pending_validation',
      evidenceRequired: true,
      assignedById: 'user_fc1',
      assignedByName: 'David Tran',
      createdAt: '2026-03-22T15:00:00.000Z',
      updatedAt: '2026-04-02T09:00:00.000Z',
    },
    {
      id: 'tact_seed_thu_4',
      idpId: idpThu.id,
      objectiveId: 'tobj_thu_4',
      employeeId: 'user_learner1',
      competencyId: 'comp_bpa_01',
      competencyCode: 'BPA-01',
      domainId: 'dom_4',
      category: 'D_Coaching_Mentoring',
      ratioCategory: '20_social',
      titleEn: 'FC 1-on-1 Coaching: Flow-Through & Flex Analysis',
      titleVi: 'Kèm cặp 1-1 cùng FC: Phân tích Flow-Through & Co giãn chi phí',
      descriptionEn: 'Bi-weekly review of F&B and Rooms flow-through variances.',
      descriptionVi: 'Review định kỳ biên độ chuyển hóa lợi nhuận các bộ phận.',
      sourceType: 'coaching',
      sourceCode: 'COACH-BPA-01',
      targetLevel: 3,
      estimatedHours: 8,
      dueDate: '2026-07-31',
      status: 'planned',
      validationStatus: 'pending_validation',
      evidenceRequired: true,
      assignedById: 'user_fc1',
      assignedByName: 'David Tran',
      createdAt: '2026-03-22T15:00:00.000Z',
      updatedAt: '2026-03-22T15:00:00.000Z',
    },
    {
      id: 'tact_seed_nam_1',
      idpId: idpNam.id,
      objectiveId: 'tobj_nam_1',
      employeeId: 'user_learner2',
      competencyId: 'comp_fpm_04',
      competencyCode: 'FPM-04',
      domainId: 'dom_3',
      category: 'A_Formal_Learning',
      ratioCategory: '10_formal',
      titleEn: 'Complete HFC-202 & $850k Smart Energy CAPEX CAR',
      titleVi: 'Hoàn thành HFC-202 & Tờ trình CAPEX $850k Smart Energy',
      descriptionEn: 'DCF, NPV, IRR modeling and Ownership CAR memo.',
      descriptionVi: 'Mô hình hóa DCF, NPV, IRR và tờ trình đầu tư trình Chủ đầu tư.',
      sourceType: 'course',
      sourceRecordId: 'course_04',
      sourceCode: 'HFC-202',
      targetLevel: 4,
      estimatedHours: 16,
      dueDate: '2026-06-15',
      status: 'completed',
      validationStatus: 'approved',
      evidenceRequired: false,
      evidenceNotes: 'HFC-202 Completed (88% quiz).',
      validatedById: 'user_fc1',
      validatedByName: 'David Tran',
      validatedAt: '2026-04-01T14:00:00.000Z',
      assignedById: 'user_fc1',
      assignedByName: 'David Tran',
      createdAt: '2026-03-25T09:00:00.000Z',
      updatedAt: '2026-04-01T14:00:00.000Z',
    },
    {
      id: 'tact_seed_nam_2',
      idpId: idpNam.id,
      objectiveId: 'tobj_nam_2',
      employeeId: 'user_learner2',
      competencyId: 'comp_sbp_02',
      competencyCode: 'SBP-02',
      domainId: 'dom_6',
      category: 'D_Coaching_Mentoring',
      ratioCategory: '20_social',
      titleEn: 'Executive GM Co-Piloting & Ownership Scenario Defense',
      titleVi: 'Đồng hành chiến lược GM & Thuyết trình kịch bản Chủ đầu tư',
      descriptionEn: 'Run commercial trade-off sessions with GM Richard Vance.',
      descriptionVi: 'Chủ trì phiên phân tích kịch bản đánh đổi doanh thu/GOP cùng GM.',
      sourceType: 'coaching',
      sourceRecordId: 'course_09',
      sourceCode: 'COACH-SBP-02',
      targetLevel: 4,
      estimatedHours: 14,
      dueDate: '2026-07-30',
      status: 'in_progress',
      validationStatus: 'pending_validation',
      evidenceRequired: true,
      evidenceNotes: 'Completed 2 of 3 GM scenario briefings.',
      assignedById: 'user_fc1',
      assignedByName: 'David Tran',
      createdAt: '2026-03-25T09:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    },
  ];

  const idpReviewLogs: IdpReviewLogDoc[] = [
    {
      id: 'rlog_seed_1',
      idpId: idpThu.id,
      employeeId: 'user_learner1',
      action: 'SUBMITTED',
      fromStatus: 'draft',
      toStatus: 'submitted',
      actorId: 'user_learner1',
      actorName: 'Nguyễn Minh Thư',
      actorRole: 'learner',
      comment: 'Submitted Q2-Q3 AFC Development Plan with 4 priority competency objectives.',
      timestamp: '2026-03-20T09:00:00.000Z',
    },
    {
      id: 'rlog_seed_2',
      idpId: idpThu.id,
      employeeId: 'user_learner1',
      action: 'MANAGER_APPROVED',
      fromStatus: 'submitted',
      toStatus: 'manager_review',
      actorId: 'user_fc1',
      actorName: 'David Tran',
      actorRole: 'financial_controller',
      comment: 'Aligned on Day 3 closing and CSA internal audit milestones.',
      timestamp: '2026-03-21T11:00:00.000Z',
    },
    {
      id: 'rlog_seed_3',
      idpId: idpThu.id,
      employeeId: 'user_learner1',
      action: 'LND_APPROVED',
      fromStatus: 'manager_review',
      toStatus: 'lnd_approved',
      actorId: 'user_lnd',
      actorName: 'Marcus Sterling',
      actorRole: 'lnd_manager',
      comment: '70-20-10 learning mix verified and approved for Q2 execution.',
      timestamp: '2026-03-22T15:00:00.000Z',
    },
    {
      id: 'rlog_seed_4',
      idpId: idpThu.id,
      employeeId: 'user_learner1',
      action: 'EVIDENCE_VALIDATED',
      fromStatus: 'in_progress',
      toStatus: 'in_progress',
      actorId: 'user_fc1',
      actorName: 'David Tran',
      actorRole: 'financial_controller',
      comment: 'Validated OJT-FAR-01 closing workbook (90/100).',
      timestamp: '2026-03-28T16:00:00.000Z',
    },
  ];

  const reassessments: CompetencyReassessmentDoc[] = [
    {
      id: 'reasmt_seed_sarah_1',
      employeeId: 'user_fc2',
      employeeName: 'Sarah Jenkins',
      idpId: 'tidp_seed_sarah_prev',
      baselineAssessmentId: asmtSarah.id,
      newApprovedAssessmentId: asmtSarah.id,
      targetPosition: 'Strategic Finance Business Partner',
      reassessmentDate: '2026-03-05',
      assessorId: 'user_admin',
      assessorName: 'Elena Rostova',
      assessorRole: 'super_admin',
      beforeAchievementPct: 92,
      afterAchievementPct: 100,
      netImprovementPct: 8,
      gapsClosedCount: 2,
      remainingGapsCount: 0,
      items: [
        {
          competencyCode: 'SBP-03',
          competencyNameEn: 'Owner Financial Presentations & Asset Management Alignment',
          competencyNameVi: 'Thuyết Trình Tài Chính & Báo Cáo Chủ Đầu Tư (Owner Relations)',
          domainId: 'dom_6',
          beforeLevel: 3,
          afterLevel: 4,
          targetLevel: 4,
          delta: 1,
          remainingGap: 0,
          evidenceRef: 'Q4 Ownership Board Asset Review',
        },
        {
          competencyCode: 'SBP-05',
          competencyNameEn: 'Strategic Value Creation & Hotel Asset Management',
          competencyNameVi: 'Tầm Nhìn Chiến Lược & Quản Trị Giá Trị Tài Sản Khách Sạn',
          domainId: 'dom_6',
          beforeLevel: 3,
          afterLevel: 4,
          targetLevel: 4,
          delta: 1,
          remainingGap: 0,
          evidenceRef: 'Royal Palm 3-Year Cap Rate & EBITDA Valuation Plan',
        },
      ],
      summaryFeedback: 'All Strategic Business Partnership Level 4 criteria demonstrated before Ownership committee.',
      createdAt: '2026-03-05T16:30:00.000Z',
    },
  ];

  const readinessReviews: CareerReadinessReviewDoc[] = [
    {
      id: 'crr_seed_nam_1',
      employeeId: 'user_learner2',
      employeeName: 'Lê Hoàng Nam',
      property: 'Grand Horizon Saigon Hotel & Residences',
      department: 'Finance & Accounting',
      currentPosition: 'Assistant Financial Controller',
      targetPosition: 'Financial Controller',
      sourceAssessmentId: asmtNam.id,
      sourceIdpId: idpNam.id,
      computedStatus: 'Nearly Ready',
      finalStatus: 'Nearly Ready',
      achievementPct: 97,
      weightedAchievementPct: 97,
      idpCompletionPct: 50,
      criticalAchievementPct: 98,
      criticalBlockers: ['SBP-02: L3/L4'],
      recommendedNextSteps: [
        'Complete SBP-02 GM Co-Piloting & Ownership Scenario Defense before Ready for Review gate unlocks.',
      ],
      reviewerId: 'user_fc1',
      reviewerName: 'David Tran',
      reviewerRole: 'financial_controller',
      reviewNotes: 'High achievement (97%), blocked from Ready for Review strictly due to critical competency SBP-02 currently at L3 vs L4.',
      reviewedAt: '2026-04-02T11:00:00.000Z',
    },
  ];

  const notifications: LmsNotificationItem[] = [
    {
      id: 'tnotif_1',
      recipientId: 'user_learner1',
      type: 'idp_approved',
      title: 'IDP Approved by Manager & L&D',
      message: 'Your AFC Individual Development Plan has been approved by David Tran and Marcus Sterling.',
      relatedId: idpThu.id,
      time: '2026-03-22',
      read: false,
    },
    {
      id: 'tnotif_2',
      recipientId: 'user_fc1',
      type: 'due_soon',
      title: 'Objective Validation Pending',
      message: 'Lê Hoàng Nam updated evidence on SBP-02 GM Co-Piloting (60% progress).',
      relatedId: idpNam.id,
      time: '2026-04-02',
      read: false,
    },
    {
      id: 'tnotif_3',
      recipientId: 'user_learner2',
      type: 'readiness',
      title: 'Career Readiness Gate Notice',
      message: 'SBP-02 (L3 vs Target L4) is blocking promotion to Ready for Review.',
      relatedId: readinessReviews[0].id,
      time: '2026-04-02',
      read: false,
    },
  ];

  return {
    talentConfig: DEFAULT_TALENT_CONFIG,
    competencyAssessments: [asmtThuQ1, asmtNam, asmtHuy, asmtSarah, asmtMai],
    talentIdps: [idpThu, idpNam],
    developmentActivities: activities,
    competencyReassessments: reassessments,
    careerReadinessReviews: readinessReviews,
    idpReviewLogs,
    talentNotifications: notifications,
  };
}

export type TalentReportType =
  | 'competency_gap_summary'
  | 'department_heatmap'
  | 'individual_idp'
  | 'idp_completion_progress'
  | 'activity_tracking'
  | 'reassessment_improvement'
  | 'career_readiness_pipeline'
  | 'training_needs_analysis';

export function buildTalentReportWorkbook(params: {
  reportType: TalentReportType;
  users: User[];
  competencies: Competency[];
  domains: CompetencyDomain[];
  courses: Course[];
  ojtAssignments: OJTAssignment[];
  enrollments: CourseEnrollment[];
  quizAttempts: QuizAttempt[];
  submissions: AssignmentSubmission[];
  competencyAssessments: CompetencyAssessmentDoc[];
  talentIdps: IndividualDevelopmentPlanDoc[];
  developmentActivities: DevelopmentActivityDoc[];
  competencyReassessments: CompetencyReassessmentDoc[];
  talentConfig: TalentConfigDoc;
  filters?: {
    property?: string;
    department?: string;
    employeeId?: string;
    period?: string;
    targetPosition?: string;
  };
}): { buffer: Buffer; filename: string } {
  const {
    reportType,
    users,
    competencies,
    domains,
    courses,
    enrollments,
    quizAttempts,
    submissions,
    competencyAssessments,
    talentIdps,
    developmentActivities,
    competencyReassessments,
    talentConfig,
    filters = {},
  } = params;

  const filteredUsers = users.filter((u) => {
    if (filters.employeeId && filters.employeeId !== 'all' && u.id !== filters.employeeId) return false;
    if (filters.property && filters.property !== 'all' && u.property !== filters.property) return false;
    if (filters.department && filters.department !== 'all' && u.department !== filters.department) return false;
    return true;
  });

  const wb = XLSX.utils.book_new();
  let rows: Record<string, any>[] = [];
  let sheetName = 'Report';
  let filename = `FC_Academy_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const inferTargetPos = (u: User) => {
    if (filters.targetPosition && filters.targetPosition !== 'all') return filters.targetPosition;
    const activeIdp = talentIdps.find((i) => i.employeeId === u.id);
    if (activeIdp) return activeIdp.targetPosition;
    const latestAsmt = competencyAssessments.find((a) => a.employeeId === u.id && a.status === 'approved');
    if (latestAsmt) return latestAsmt.targetPosition;
    if (u.position.includes('Junior')) return 'Senior Accountant';
    if (u.position.includes('Senior')) return 'Assistant Financial Controller';
    if (u.position.includes('Assistant')) return 'Financial Controller';
    return 'Financial Controller';
  };

  if (reportType === 'competency_gap_summary') {
    sheetName = 'Competency_Gap_Summary';
    for (const u of filteredUsers) {
      const targetPos = inferTargetPos(u);
      const gap = calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId: u.id,
        targetPosition: targetPos,
        competencies,
        domains,
        config: talentConfig,
        periodFilter: filters.period,
      });
      if (!gap.hasApprovedAssessment) continue;
      for (const r of gap.rows) {
        rows.push({
          Employee: u.name,
          Property: u.property,
          Department: u.department,
          Target_Position: targetPos,
          Period: gap.assessmentPeriod || 'N/A',
          Domain: r.domainCode,
          Competency_Code: r.competencyCode,
          Competency_Name: r.nameEn,
          Critical: r.isCritical ? 'YES' : 'No',
          Current_Level: r.currentLevel ?? 'Unassessed',
          Target_Level: r.targetLevel,
          Gap: r.gap,
          Gap_Classification: r.gapLabel,
          Priority_Rank: r.priorityRank || '-',
          Overall_Achievement_Pct: `${gap.achievementPct}%`,
        });
      }
    }
  } else if (reportType === 'department_heatmap') {
    sheetName = 'Department_Heatmap';
    const propSet = Array.from(new Set(filteredUsers.map((u) => `${u.property} | ${u.department}`)));
    for (const key of propSet) {
      const [prop, dept] = key.split(' | ');
      const cohort = filteredUsers.filter((u) => u.property === prop && u.department === dept);
      for (const dom of domains) {
        let sumAch = 0;
        let count = 0;
        let critGaps = 0;
        for (const u of cohort) {
          const gap = calculateGapAnalysis({
            assessments: competencyAssessments,
            employeeId: u.id,
            targetPosition: inferTargetPos(u),
            competencies,
            domains,
            config: talentConfig,
          });
          if (!gap.hasApprovedAssessment) continue;
          const ds = gap.domainSummaries.find((d) => d.domainId === dom.id);
          if (ds && ds.assessedCount > 0) {
            sumAch += ds.achievementPct;
            critGaps += ds.criticalGapsCount;
            count++;
          }
        }
        rows.push({
          Property: prop,
          Department: dept,
          Domain_Code: dom.code,
          Domain_Name: dom.nameEn,
          Assessed_Staff_Count: count,
          Avg_Achievement_Pct: count > 0 ? `${Math.round(sumAch / count)}%` : 'No Data',
          Critical_Gaps_Total: critGaps,
        });
      }
    }
  } else if (reportType === 'individual_idp') {
    sheetName = 'Individual_Development_Plan';
    for (const idp of talentIdps) {
      if (filters.employeeId && filters.employeeId !== 'all' && idp.employeeId !== filters.employeeId) continue;
      for (const obj of idp.objectives) {
        rows.push({
          IDP_ID: idp.id,
          Employee: idp.employeeName,
          Property: idp.property,
          Target_Position: idp.targetPosition,
          IDP_Status: idp.status,
          Competency: obj.competencyCode,
          Priority: obj.priority,
          Category_70_20_10: obj.ratioCategory,
          Objective_Title: obj.titleEn,
          Baseline_Level: obj.baselineLevel,
          Target_Level: obj.targetLevel,
          Target_Date: obj.targetDate,
          Objective_Status: obj.status,
          Progress_Pct: `${obj.progressPercent}%`,
          Validation_Status: obj.supervisorValidationStatus,
          Evidence: obj.evidenceNotes || '-',
        });
      }
    }
  } else if (reportType === 'idp_completion_progress') {
    sheetName = 'IDP_Completion_Progress';
    for (const idp of talentIdps) {
      if (filters.employeeId && filters.employeeId !== 'all' && idp.employeeId !== filters.employeeId) continue;
      const metrics = evaluateIdpProgress({
        idp,
        enrollments,
        quizAttempts,
        submissions,
        courses,
        activities: developmentActivities,
      });
      rows.push({
        IDP_ID: idp.id,
        Employee: idp.employeeName,
        Property: idp.property,
        Target_Position: idp.targetPosition,
        Workflow_Status: idp.status,
        Total_Objectives: metrics.totalObjectives,
        Completed_Strict: metrics.completedObjectives,
        Pending_Validation: metrics.pendingValidationObjectives,
        In_Progress: metrics.inProgressObjectives,
        Strict_Completion_Pct: `${metrics.completionPct}%`,
        Mix_70_Experiential: `${metrics.ratioBreakdown.experientialPct}%`,
        Mix_20_Social: `${metrics.ratioBreakdown.socialPct}%`,
        Mix_10_Formal: `${metrics.ratioBreakdown.formalPct}%`,
        Period_End: idp.periodEnd,
      });
    }
  } else if (reportType === 'activity_tracking') {
    sheetName = 'Development_Activities';
    for (const act of developmentActivities) {
      if (filters.employeeId && filters.employeeId !== 'all' && act.employeeId !== filters.employeeId) continue;
      const emp = users.find((u) => u.id === act.employeeId);
      rows.push({
        Activity_ID: act.id,
        Employee: emp?.name || act.employeeId,
        Competency: act.competencyCode,
        Category: act.category,
        Model_70_20_10: act.ratioCategory,
        Title: act.titleEn,
        Source_Code: act.sourceCode || '-',
        Est_Hours: act.estimatedHours,
        Due_Date: act.dueDate,
        Status: act.status,
        Validation_Status: act.validationStatus,
        Evidence_Required: act.evidenceRequired ? 'Yes' : 'No',
        Evidence_Notes: act.evidenceNotes || '-',
        Validated_By: act.validatedByName || '-',
      });
    }
  } else if (reportType === 'reassessment_improvement') {
    sheetName = 'Pre_vs_Post_Reassessment';
    for (const re of competencyReassessments) {
      if (filters.employeeId && filters.employeeId !== 'all' && re.employeeId !== filters.employeeId) continue;
      for (const item of re.items) {
        rows.push({
          Reassessment_ID: re.id,
          Employee: re.employeeName,
          Target_Position: re.targetPosition,
          Reassessment_Date: re.reassessmentDate,
          Assessor: re.assessorName,
          Competency: item.competencyCode,
          Before_Level: item.beforeLevel,
          After_Level: item.afterLevel,
          Target_Level: item.targetLevel,
          Level_Delta: item.delta,
          Remaining_Gap: item.remainingGap,
          Before_Overall_Pct: `${re.beforeAchievementPct}%`,
          After_Overall_Pct: `${re.afterAchievementPct}%`,
          Net_Improvement_Pct: `+${re.netImprovementPct}%`,
        });
      }
    }
  } else if (reportType === 'career_readiness_pipeline') {
    sheetName = 'Career_Readiness_Pipeline';
    for (const u of filteredUsers.filter((usr) => usr.role === 'learner' || usr.role === 'financial_controller')) {
      const targetPos = inferTargetPos(u);
      const gap = calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId: u.id,
        targetPosition: targetPos,
        competencies,
        domains,
        config: talentConfig,
      });
      if (!gap.hasApprovedAssessment) continue;
      const activeIdp = talentIdps.find((i) => i.employeeId === u.id) || null;
      const idpMetrics = activeIdp
        ? evaluateIdpProgress({
            idp: activeIdp,
            enrollments,
            quizAttempts,
            submissions,
            courses,
            activities: developmentActivities,
          })
        : null;
      const readiness = evaluateCareerReadiness({ gapSummary: gap, idpMetrics, config: talentConfig });
      rows.push({
        Employee: u.name,
        Current_Position: u.position,
        Target_Position: targetPos,
        Property: u.property,
        Readiness_Status: readiness.status,
        Blocked_By_Critical: readiness.blockedFromReadyForReview ? 'YES' : 'No',
        Achievement_Pct: `${readiness.achievementPct}%`,
        Critical_Score_Pct: `${readiness.criticalAchievementPct}%`,
        IDP_Completion_Pct: `${readiness.idpCompletionPct}%`,
        Blocking_Reasons: readiness.blockingReasons.join(' | ') || 'None',
      });
    }
  } else if (reportType === 'training_needs_analysis') {
    sheetName = 'Training_Needs_Analysis';
    const gapCounts = new Map<string, { comp: Competency; affectedEmployees: number; totalGap: number }>();
    for (const u of filteredUsers) {
      const gap = calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId: u.id,
        targetPosition: inferTargetPos(u),
        competencies,
        domains,
        config: talentConfig,
      });
      if (!gap.hasApprovedAssessment) continue;
      for (const r of gap.rows) {
        if (r.gap > 0) {
          const compObj = competencies.find((c) => c.code === r.competencyCode);
          if (!compObj) continue;
          const prev = gapCounts.get(r.competencyCode) || { comp: compObj, affectedEmployees: 0, totalGap: 0 };
          prev.affectedEmployees += 1;
          prev.totalGap += r.gap;
          gapCounts.set(r.competencyCode, prev);
        }
      }
    }
    rows = Array.from(gapCounts.values())
      .sort((a, b) => b.totalGap - a.totalGap)
      .map((entry) => {
        const linkedCourses = courses
          .filter((c) => entry.comp.associatedCourseIds.includes(c.id))
          .map((c) => `${c.code}: ${c.titleEn}`);
        return {
          Competency_Code: entry.comp.code,
          Competency_Name: entry.comp.nameEn,
          Domain: entry.comp.domainId,
          Affected_Employees: entry.affectedEmployees,
          Cumulative_Gap_Levels: entry.totalGap,
          Avg_Gap: Number((entry.totalGap / entry.affectedEmployees).toFixed(2)),
          Recommended_Courses: linkedCourses.length > 0 ? linkedCourses.join(' | ') : 'No mapped learning activity available',
        };
      });
  }

  if (rows.length === 0) {
    rows = [{ Notice: 'No matching records found for selected filters.' }];
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return { buffer, filename };
}
