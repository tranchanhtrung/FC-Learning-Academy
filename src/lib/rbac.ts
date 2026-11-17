import type {
  PermissionCategory,
  PermissionDefinition,
  PermissionKey,
  RolePermissionPolicyDoc,
  RolePermissionsMap,
  UserRole,
} from '../types';

export const SYSTEM_ROLES: UserRole[] = [
  'super_admin',
  'lnd_manager',
  'financial_controller',
  'general_manager',
  'learner',
];

export const ROLE_META: Record<
  UserRole,
  {
    code: string;
    shortVi: string;
    shortEn: string;
    scopeSummaryVi: string;
    scopeSummaryEn: string;
  }
> = {
  super_admin: {
    code: 'SA',
    shortVi: 'Quản Trị Cao Cấp',
    shortEn: 'Super Admin',
    scopeSummaryVi: 'Toàn quyền cấu hình hệ thống, phân quyền RBAC, nhập dữ liệu & điều hành tập đoàn.',
    scopeSummaryEn: 'Full system configuration, RBAC governance, data import, and cluster oversight.',
  },
  lnd_manager: {
    code: 'LND',
    shortVi: 'Quản Lý L&D',
    shortEn: 'L&D Manager',
    scopeSummaryVi: 'Quản trị học liệu, khung năng lực, kế hoạch IDP, nhập dữ liệu 2027 & giả lập.',
    scopeSummaryEn: 'Curriculum governance, competency framework, IDP approvals, and import centers.',
  },
  financial_controller: {
    code: 'FC',
    shortVi: 'Giám Đốc Tài Chính',
    shortEn: 'FC / Dept Head',
    scopeSummaryVi: 'Đánh giá đội ngũ kế toán, duyệt IDP bộ phận, chấm OJT, cấp chứng chỉ & mô phỏng.',
    scopeSummaryEn: 'Team competency assessment, departmental IDP review, OJT grading, and certification.',
  },
  general_manager: {
    code: 'GM',
    shortVi: 'Tổng Giám Đốc',
    shortEn: 'General Manager',
    scopeSummaryVi: 'Giám sát báo cáo điều hành, đánh giá sẵn sàng kế nhiệm & quản trị kịch bản GM.',
    scopeSummaryEn: 'Executive reporting, succession readiness review, and GM simulation governance.',
  },
  learner: {
    code: 'LRN',
    shortVi: 'Học Viên',
    shortEn: 'Learner',
    scopeSummaryVi: 'Học khóa học, tự đánh giá năng lực, nộp OJT, thực hiện IDP & luyện tập giả lập.',
    scopeSummaryEn: 'Self-learning, self-assessment, OJT submissions, personal IDP, and simulations.',
  },
};

export const PERMISSION_CATEGORIES: Array<{
  id: PermissionCategory;
  labelVi: string;
  labelEn: string;
  descVi: string;
  descEn: string;
}> = [
  {
    id: 'modules',
    labelVi: 'Điều Hướng & Phân Hệ Chức Năng',
    labelEn: 'Modules & Navigation Access',
    descVi: 'Kiểm soát hiển thị menu thanh bên (Sidebar) và quyền truy cập từng phân hệ học tập/vận hành.',
    descEn: 'Controls sidebar visibility and route guards across learning and executive modules.',
  },
  {
    id: 'governance',
    labelVi: 'Quản Trị Hệ Thống & Nhập Dữ Liệu',
    labelEn: 'System Governance & Data Import',
    descVi: 'Quyền quản lý tài khoản, ma trận phân quyền RBAC, nhập Excel 2027 và cấu hình khung năng lực.',
    descEn: 'User provisioning, RBAC policy editing, Excel import centers, and master framework management.',
  },
  {
    id: 'workflows',
    labelVi: 'Nghiệp Vụ Chuyên Môn & Phê Duyệt',
    labelEn: 'Operational Workflows & Approvals',
    descVi: 'Quyền xem dữ liệu đa nhân sự, đánh giá năng lực, duyệt IDP, chấm bài OJT và cấp chứng chỉ.',
    descEn: 'Multi-learner visibility, team evaluations, IDP approvals, OJT grading, and certificate issuance.',
  },
];

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // 1. Modules & Navigation
  {
    key: 'view_dashboard',
    category: 'modules',
    nameVi: 'Truy cập Bảng Điều Khiển Tổng Quan',
    nameEn: 'Access Overview Dashboard',
    descriptionVi: 'Xem màn hình chính và các chỉ số KPI theo vai trò.',
    descriptionEn: 'Access primary landing dashboard and role-relevant KPIs.',
    riskTier: 'standard',
    lockedForSuperAdmin: true,
  },
  {
    key: 'view_my_learning',
    category: 'modules',
    nameVi: 'Truy cập Khóa Học Của Tôi',
    nameEn: 'Access My Learning Workspace',
    descriptionVi: 'Xem tiến độ học tập cá nhân và danh sách khóa học đã ghi danh.',
    descriptionEn: 'View personal course progress and active enrollments.',
    riskTier: 'standard',
  },
  {
    key: 'view_learning_paths',
    category: 'modules',
    nameVi: 'Truy cập Lộ Trình Nghề Nghiệp',
    nameEn: 'Access Career Learning Paths',
    descriptionVi: 'Xem bản đồ thăng tiến từ Kế toán viên lên Financial Controller.',
    descriptionEn: 'Browse structured hospitality finance career progression paths.',
    riskTier: 'standard',
  },
  {
    key: 'view_courses',
    category: 'modules',
    nameVi: 'Truy cập Kho Khóa Học & Bài Kiểm Tra',
    nameEn: 'Access Course Catalog & Quizzes',
    descriptionVi: 'Ghi danh, học nội dung Syllabus 18 khóa học và làm bài thi trắc nghiệm.',
    descriptionEn: 'Enroll in the 18-course curriculum catalog and complete quizzes.',
    riskTier: 'standard',
  },
  {
    key: 'view_competency_framework',
    category: 'modules',
    nameVi: 'Truy cập Khung Năng Lực FC',
    nameEn: 'View FC Competency Framework',
    descriptionVi: 'Tra cứu 6 miền năng lực, 30 năng lực cốt lõi và tiêu chí 4 cấp độ.',
    descriptionEn: 'Browse the 6 competency domains, 30 competencies, and 4-level rubrics.',
    riskTier: 'standard',
  },
  {
    key: 'view_assessments',
    category: 'modules',
    nameVi: 'Truy cập Đánh Giá & Ma Trận Khoảng Trống',
    nameEn: 'Access Competency Assessments & Gap Matrix',
    descriptionVi: 'Thực hiện đánh giá năng lực và xem biểu đồ Radar khoảng trống.',
    descriptionEn: 'Access competency assessments and Radar gap matrix views.',
    riskTier: 'standard',
  },
  {
    key: 'view_talent_suite',
    category: 'modules',
    nameVi: 'Truy cập Bộ Công Cụ Phát Triển Nhân Tài & IDP',
    nameEn: 'Access Talent Development & IDP Suite',
    descriptionVi: 'Truy cập 6 bước Talent Suite (Đánh giá, Gap, Hoạt động 70-20-10, IDP, Tái đánh giá, Sẵn sàng).',
    descriptionEn: 'Access all 6 Talent Development tabs (Assessment, Gap, Activities, IDP, Progress, Readiness).',
    riskTier: 'standard',
  },
  {
    key: 'view_ojt_projects',
    category: 'modules',
    nameVi: 'Truy cập Thực Tập OJT & Dự Án Thực Tế',
    nameEn: 'Access Practical OJT Projects',
    descriptionVi: 'Tải mẫu Excel OJT, nộp bài thực hành và thẩm định AI.',
    descriptionEn: 'Download OJT templates, submit deliverables, and view feedback.',
    riskTier: 'standard',
  },
  {
    key: 'view_ai_assistant',
    category: 'modules',
    nameVi: 'Truy cập Trợ Lý AI & Phòng Thí Nghiệm Tài Chính',
    nameEn: 'Access AI Assistant & Financial Lab',
    descriptionVi: 'Sử dụng AI Advisor, AI Gap Coach và Financial Modeling Lab.',
    descriptionEn: 'Use AI Advisor, AI Gap Coach, and Hospitality Financial Lab.',
    riskTier: 'standard',
  },
  {
    key: 'view_simulator',
    category: 'modules',
    nameVi: 'Truy cập Đối Tác Kinh Doanh Simulator',
    nameEn: 'Access FC Business Partner Simulator',
    descriptionVi: 'Truy cập Dashboard, Thư viện kịch bản, Không gian mô phỏng, Họp GM và Điểm năng lực.',
    descriptionEn: 'Use Simulation Dashboard, Library, Workspace, GM Executive Meeting, History & Score.',
    riskTier: 'standard',
  },
  {
    key: 'view_certifications',
    category: 'modules',
    nameVi: 'Truy cập Chứng Chỉ & Sẵn Sàng Thăng Tiến',
    nameEn: 'Access Certifications & Readiness',
    descriptionVi: 'Xem 5 cấp chứng chỉ, điều kiện thăng tiến và tra cứu mã xác thực chứng chỉ.',
    descriptionEn: 'View 5 certification tiers, progress criteria, and public code verification.',
    riskTier: 'standard',
  },
  {
    key: 'view_reports',
    category: 'modules',
    nameVi: 'Truy cập Báo Cáo & Phân Tích Tập Đoàn',
    nameEn: 'Access Analytics & Executive Reports',
    descriptionVi: 'Xem báo cáo kế nhiệm, tỷ lệ hoàn thành khóa học, ma trận Gap và ROI đào tạo.',
    descriptionEn: 'View succession pipeline, completion metrics, cluster gap matrix, and ROI reports.',
    riskTier: 'elevated',
  },
  {
    key: 'view_administration',
    category: 'modules',
    nameVi: 'Truy cập Phân Hệ Quản Trị Hệ Thống',
    nameEn: 'Access System Administration Console',
    descriptionVi: 'Mở khu vực Quản Trị Hệ Thống (Nhân sự, Cơ sở khách sạn, Nhật ký kiểm toán, Phân quyền).',
    descriptionEn: 'Open System Administration console (Users, Properties, Audit Logs, RBAC Matrix).',
    riskTier: 'critical',
    lockedForSuperAdmin: true,
  },

  // 2. System Governance & Data Import
  {
    key: 'manage_users_rbac',
    category: 'governance',
    nameVi: 'Tạo, Sửa Nhân Sự & Gán Vai Trò Tài Khoản',
    nameEn: 'Create/Edit Users & Assign Account Roles',
    descriptionVi: 'Tạo tài khoản nhân sự mới, thay đổi vai trò và đồng bộ hồ sơ lên Firestore.',
    descriptionEn: 'Create new staff accounts, modify assigned user roles, and sync profiles to Firestore.',
    riskTier: 'critical',
    lockedForSuperAdmin: true,
  },
  {
    key: 'configure_role_permissions',
    category: 'governance',
    nameVi: 'Cấu Hình Bảng Phân Quyền Các Vai Trò',
    nameEn: 'Configure Role Permissions Matrix',
    descriptionVi: 'Bật/tắt quyền chi tiết cho từng vai trò và lưu chính sách lên Firestore / Máy chủ.',
    descriptionEn: 'Modify granular permissions per role and persist policy updates to Firestore/Server.',
    riskTier: 'critical',
    lockedForSuperAdmin: true,
  },
  {
    key: 'access_data_import_center',
    category: 'governance',
    nameVi: 'Truy cập Trung Tâm Nhập Dữ Liệu 2027 (XLSX)',
    nameEn: 'Access Academy 2027 Data Import Center',
    descriptionVi: 'Tải lên tệp Excel giáo trình 2027, kiểm tra schema và ghi chính thức lên Firestore.',
    descriptionEn: 'Upload 2027 curriculum workbooks, validate schema, and commit records to Firestore.',
    riskTier: 'critical',
  },
  {
    key: 'access_sim_import_center',
    category: 'governance',
    nameVi: 'Truy cập Trung Tâm Nhập Kịch Bản Giả Lập',
    nameEn: 'Access Simulator Scenario Import Center',
    descriptionVi: 'Nhập bộ kịch bản 12 sheet của Business Partner Simulator và xuất báo cáo lỗi.',
    descriptionEn: 'Import 12-sheet simulator scenario datasets and manage ingestion jobs.',
    riskTier: 'critical',
  },
  {
    key: 'manage_sim_admin',
    category: 'governance',
    nameVi: 'Quản Trị Kịch Bản & Lịch Sử Phiên Bản Simulator',
    nameEn: 'Manage Simulator Scenarios & Version History',
    descriptionVi: 'Tạo mới, xuất bản/lưu trữ kịch bản, phân công học viên và xem lịch sử phiên bản.',
    descriptionEn: 'Manage Draft/Published/Archived scenario lifecycle, learner assignments, and versions.',
    riskTier: 'elevated',
  },
  {
    key: 'manage_competency_framework',
    category: 'governance',
    nameVi: 'Chỉnh Sửa Khung Năng Lực & Rubrics',
    nameEn: 'Create, Edit & Delete Competencies',
    descriptionVi: 'Thêm mới, chỉnh sửa định nghĩa, tiêu chí đánh giá và xóa năng lực khỏi khung chuẩn.',
    descriptionEn: 'Add, update, or remove competencies and rubric criteria in the master framework.',
    riskTier: 'elevated',
  },
  {
    key: 'manage_lesson_materials',
    category: 'governance',
    nameVi: 'Tải Lên & Quản Lý Học Liệu Từng Bài Học (Firestore)',
    nameEn: 'Upload & Manage Per-Lesson Materials (Firestore)',
    descriptionVi: 'Tải lên, đính kèm và xóa học liệu (PDF, Excel, Slide, Link) cho từng bài học cụ thể lên Firestore.',
    descriptionEn: 'Upload, attach, and delete per-lesson training materials (PDF, Excel, Slides, Links) to Firestore.',
    riskTier: 'elevated',
    lockedForSuperAdmin: true,
  },

  // 3. Operational Workflows & Approvals
  {
    key: 'switch_dashboard_perspective',
    category: 'workflows',
    nameVi: 'Chuyển Đổi Góc Nhìn Dashboard Nhiều Vai Trò',
    nameEn: 'Switch Multi-Role Dashboard Perspectives',
    descriptionVi: 'Xem nhanh Dashboard dưới góc nhìn Học viên / FC / GM / Quản trị.',
    descriptionEn: 'Switch dashboard perspective tabs across subordinate or leadership views.',
    riskTier: 'standard',
  },
  {
    key: 'view_all_learners_data',
    category: 'workflows',
    nameVi: 'Xem Dữ Liệu Học Tập & Năng Lực Toàn Đội Ngũ',
    nameEn: 'View Cohort & Multi-Learner Data',
    descriptionVi: 'Chọn và theo dõi hồ sơ nhân sự khác thay vì chỉ giới hạn trong hồ sơ cá nhân.',
    descriptionEn: 'Select and inspect peer/subordinate profiles instead of self-only isolation.',
    riskTier: 'elevated',
  },
  {
    key: 'assess_team_members',
    category: 'workflows',
    nameVi: 'Đánh Giá, Phê Duyệt Năng Lực & Tái Đánh Giá',
    nameEn: 'Assess, Approve Competencies & Reassessments',
    descriptionVi: 'Chấm điểm cấp quản lý, phê duyệt/từ chối hồ sơ đánh giá và thực hiện Tái đánh giá.',
    descriptionEn: 'Submit supervisor/L&D ratings, approve/reject assessments, and run reassessments.',
    riskTier: 'elevated',
  },
  {
    key: 'manage_team_idp',
    category: 'workflows',
    nameVi: 'Quản Lý, Duyệt IDP & Cấu Hình Talent Engine',
    nameEn: 'Manage/Approve IDPs & Talent Engine Config',
    descriptionVi: 'Tạo hoạt động 70-20-10 tùy chỉnh, xác nhận minh chứng, duyệt luồng IDP và sẵn sàng.',
    descriptionEn: 'Assign custom 70-20-10 activities, validate evidence, approve IDPs, and readiness reviews.',
    riskTier: 'elevated',
  },
  {
    key: 'grade_ojt_submissions',
    category: 'workflows',
    nameVi: 'Chấm Điểm & Phê Duyệt Bài Thực Hành OJT',
    nameEn: 'Grade & Approve OJT Submissions',
    descriptionVi: 'Xem toàn bộ bài nộp OJT của đội ngũ, nhập điểm số, nhận xét và phê duyệt đạt.',
    descriptionEn: 'Review all learner OJT submissions, assign scores, feedback, and approve deliverables.',
    riskTier: 'elevated',
  },
  {
    key: 'issue_certificates',
    category: 'workflows',
    nameVi: 'Cấp Chứng Chỉ Năng Lực Chính Thức',
    nameEn: 'Issue Official Academy Certificates',
    descriptionVi: 'Phát hành chứng chỉ 5 cấp độ cho nhân sự đạt chuẩn và ghi nhận mã chứng nhận.',
    descriptionEn: 'Issue official 5-tier credentials to eligible learners and generate serial codes.',
    riskTier: 'critical',
  },
  {
    key: 'preview_draft_scenarios',
    category: 'workflows',
    nameVi: 'Xem Trước Kịch Bản Nháp & Đáp Án Tham Chiếu',
    nameEn: 'Preview Draft Scenarios & Reference Answer Keys',
    descriptionVi: 'Truy cập các kịch bản Simulator chưa xuất bản (Draft/Archived) và tài liệu phân tích chuẩn.',
    descriptionEn: 'View unpublished simulator scenarios (Draft/Archived) and official reference analyses.',
    riskTier: 'elevated',
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  super_admin: [...ALL_PERMISSION_KEYS],
  lnd_manager: [
    'view_dashboard',
    'view_my_learning',
    'view_learning_paths',
    'view_courses',
    'view_competency_framework',
    'view_assessments',
    'view_talent_suite',
    'view_ojt_projects',
    'view_ai_assistant',
    'view_simulator',
    'view_certifications',
    'view_reports',
    'view_administration',
    'access_data_import_center',
    'access_sim_import_center',
    'manage_sim_admin',
    'manage_competency_framework',
    'manage_lesson_materials',
    'switch_dashboard_perspective',
    'view_all_learners_data',
    'assess_team_members',
    'manage_team_idp',
    'grade_ojt_submissions',
    'issue_certificates',
    'preview_draft_scenarios',
  ],
  financial_controller: [
    'view_dashboard',
    'view_my_learning',
    'view_learning_paths',
    'view_courses',
    'view_competency_framework',
    'view_assessments',
    'view_talent_suite',
    'view_ojt_projects',
    'view_ai_assistant',
    'view_simulator',
    'view_certifications',
    'view_reports',
    'manage_sim_admin',
    'switch_dashboard_perspective',
    'view_all_learners_data',
    'assess_team_members',
    'manage_team_idp',
    'grade_ojt_submissions',
    'issue_certificates',
  ],
  general_manager: [
    'view_dashboard',
    'view_learning_paths',
    'view_courses',
    'view_competency_framework',
    'view_assessments',
    'view_talent_suite',
    'view_ojt_projects',
    'view_ai_assistant',
    'view_simulator',
    'view_certifications',
    'view_reports',
    'manage_sim_admin',
    'switch_dashboard_perspective',
    'view_all_learners_data',
    'assess_team_members',
    'manage_team_idp',
  ],
  learner: [
    'view_dashboard',
    'view_my_learning',
    'view_learning_paths',
    'view_courses',
    'view_competency_framework',
    'view_assessments',
    'view_talent_suite',
    'view_ojt_projects',
    'view_ai_assistant',
    'view_simulator',
    'view_certifications',
  ],
};

const VALID_PERMISSION_SET = new Set<string>(ALL_PERMISSION_KEYS);
const LOCKED_SUPER_ADMIN_KEYS: PermissionKey[] = PERMISSION_CATALOG.filter(
  (p) => p.lockedForSuperAdmin
).map((p) => p.key);

export function sanitizeRolePermissionsList(
  role: UserRole,
  rawList: unknown
): PermissionKey[] {
  const base = Array.isArray(rawList)
    ? rawList.filter((item): item is PermissionKey => typeof item === 'string' && VALID_PERMISSION_SET.has(item))
    : [...DEFAULT_ROLE_PERMISSIONS[role]];

  const deduped = new Set<PermissionKey>(base);
  if (role === 'super_admin') {
    LOCKED_SUPER_ADMIN_KEYS.forEach((k) => deduped.add(k));
  }
  // Keep deterministic catalog order
  return ALL_PERMISSION_KEYS.filter((k) => deduped.has(k));
}

export function normalizeRolePermissionsMap(
  rawMap?: Partial<Record<UserRole, unknown>> | RolePermissionPolicyDoc[] | null
): RolePermissionsMap {
  const result: RolePermissionsMap = {
    super_admin: [...DEFAULT_ROLE_PERMISSIONS.super_admin],
    lnd_manager: [...DEFAULT_ROLE_PERMISSIONS.lnd_manager],
    financial_controller: [...DEFAULT_ROLE_PERMISSIONS.financial_controller],
    general_manager: [...DEFAULT_ROLE_PERMISSIONS.general_manager],
    learner: [...DEFAULT_ROLE_PERMISSIONS.learner],
  };

  if (!rawMap) return result;

  if (Array.isArray(rawMap)) {
    for (const docItem of rawMap) {
      const r = (docItem?.role || docItem?.id) as UserRole | undefined;
      if (r && SYSTEM_ROLES.includes(r)) {
        result[r] = sanitizeRolePermissionsList(r, docItem.permissions);
      }
    }
    return result;
  }

  for (const r of SYSTEM_ROLES) {
    if (r in rawMap && rawMap[r] !== undefined) {
      result[r] = sanitizeRolePermissionsList(r, rawMap[r]);
    }
  }
  return result;
}

export function roleHasPermission(
  role: UserRole | string | undefined,
  permission: PermissionKey,
  policyMap?: RolePermissionsMap
): boolean {
  const safeRole: UserRole =
    role && SYSTEM_ROLES.includes(role as UserRole) ? (role as UserRole) : 'learner';
  const source = policyMap || DEFAULT_ROLE_PERMISSIONS;
  const list = source[safeRole] || DEFAULT_ROLE_PERMISSIONS[safeRole];
  return list.includes(permission);
}

export const TAB_REQUIRED_PERMISSION: Record<string, PermissionKey> = {
  dashboard: 'view_dashboard',
  myLearning: 'view_my_learning',
  learningPaths: 'view_learning_paths',
  courses: 'view_courses',
  competencyFramework: 'view_competency_framework',
  assessments: 'view_assessments',
  talentAssessment: 'view_talent_suite',
  talentGapAnalysis: 'view_talent_suite',
  talentActivities: 'view_talent_suite',
  talentIdp: 'view_talent_suite',
  talentProgress: 'view_talent_suite',
  talentReadiness: 'view_talent_suite',
  ojtProjects: 'view_ojt_projects',
  aiAssistant: 'view_ai_assistant',
  simDashboard: 'view_simulator',
  simLibrary: 'view_simulator',
  simWorkspace: 'view_simulator',
  simMeeting: 'view_simulator',
  simHistory: 'view_simulator',
  simPerformance: 'view_simulator',
  simImportCenter: 'access_sim_import_center',
  simAdmin: 'manage_sim_admin',
  simVersionHistory: 'manage_sim_admin',
  certifications: 'view_certifications',
  reports: 'view_reports',
  administration: 'view_administration',
  dataImportCenter: 'access_data_import_center',
};

export function canAccessTab(
  role: UserRole | string | undefined,
  tabId: string,
  policyMap?: RolePermissionsMap
): boolean {
  const required = TAB_REQUIRED_PERMISSION[tabId];
  if (!required) return true;
  // Simulator sub-admin/import views also logically require simulator OR governance visibility
  if (tabId === 'dataImportCenter') {
    return (
      roleHasPermission(role, 'access_data_import_center', policyMap) ||
      (roleHasPermission(role, 'view_administration', policyMap) &&
        roleHasPermission(role, 'access_data_import_center', policyMap))
    );
  }
  return roleHasPermission(role, required, policyMap);
}

export function getPermittedDashboardPerspectives(
  role: UserRole,
  policyMap?: RolePermissionsMap
): UserRole[] {
  const canSwitch = roleHasPermission(role, 'switch_dashboard_perspective', policyMap);
  const defaultPerspectivesByRole: Record<UserRole, UserRole[]> = {
    learner: ['learner'],
    financial_controller: ['financial_controller', 'learner'],
    general_manager: ['general_manager', 'financial_controller'],
    lnd_manager: ['super_admin', 'financial_controller', 'general_manager', 'learner'],
    super_admin: ['super_admin', 'general_manager', 'financial_controller', 'learner'],
  };

  if (!canSwitch) {
    return [role === 'lnd_manager' ? 'super_admin' : role];
  }
  return defaultPerspectivesByRole[role] || ['learner'];
}
