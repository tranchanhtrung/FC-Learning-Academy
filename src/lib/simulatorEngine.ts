import type {
  CalculationAuditItem,
  CapexAssumptions,
  Competency,
  Course,
  HotelSimulationDatasetSnapshot,
  HotelSimulationProfileDoc,
  HotelStatementColumns,
  LearnerAnalysisWorkspace,
  LearnerDecisionWorkspace,
  LearnerExecutiveReport,
  OJTAssignment,
  ProficiencyLevel,
  RollingForecastMonthInput,
  SimulationBusinessChallengeDoc,
  SimulationCompetencyMappingDoc,
  SimulationDecisionOptionDoc,
  SimulationEvaluationCriterionScore,
  SimulationEvaluationDoc,
  SimulationEvaluationRubricDoc,
  SimulationFinancialRecordDoc,
  SimulationOperationalRecordDoc,
  SimulationReferenceAnalysisDoc,
  SimulationRoleplayPromptDoc,
  SimulationScenarioDoc,
  SimulationTaskDoc,
} from '../types/index.ts';

export const STANDARD_EVALUATION_RUBRIC_BLUEPRINT: Array<{
  criterionCode: string;
  criterionNameEn: string;
  criterionNameVi: string;
  weightPercent: number;
  maxScore: number;
  passingScore: number;
  anchors: Record<ProficiencyLevel, { en: string; vi: string }>;
}> = [
  {
    criterionCode: 'FIN_ANALYSIS',
    criterionNameEn: 'Financial Analysis Accuracy',
    criterionNameVi: 'Độ Chính Xác Phân Tích Tài Chính',
    weightPercent: 20,
    maxScore: 100,
    passingScore: 70,
    anchors: {
      1: {
        en: 'Level 1 (Foundational): Recites surface revenue totals with formula or denominator errors.',
        vi: 'Cấp 1 (Nền tảng): Chỉ đọc số liệu tổng doanh thu, còn sai công thức hoặc mẫu số.',
      },
      2: {
        en: 'Level 2 (Developing): Computes Occ %, ADR, RevPAR, GOP % accurately with minor variance gaps.',
        vi: 'Cấp 2 (Đang phát triển): Tính đúng Occ %, ADR, RevPAR, GOP %, còn thiếu tách biến động sâu.',
      },
      3: {
        en: 'Level 3 (Proficient): Reconciles full USALI statement, isolates exact favorable/unfavorable variances cleanly.',
        vi: 'Cấp 3 (Thành thạo): Đối chiếu trọn vẹn báo cáo USALI, phân loại chính xác biến động Tích cực/Bất lợi.',
      },
      4: {
        en: 'Level 4 (Mastery): Synthesizes multi-period USALI flow-through, mix effect, and cost drivers with zero math errors.',
        vi: 'Cấp 4 (Chuyên gia): Tổng hợp flow-through đa kỳ, hiệu ứng cơ cấu và động lực chi phí không sai sót.',
      },
    },
  },
  {
    criterionCode: 'BIZ_INSIGHT',
    criterionNameEn: 'Business Insight & Root Cause Analysis',
    criterionNameVi: 'Nhận Định Kinh Doanh & Phân Tích Nguyên Nhân Gốc',
    weightPercent: 20,
    maxScore: 100,
    passingScore: 70,
    anchors: {
      1: {
        en: 'Level 1 (Foundational): Lists symptoms (e.g. "GOP dropped") without identifying operational drivers.',
        vi: 'Cấp 1 (Nền tảng): Chỉ nêu hiện tượng ("GOP giảm") mà chưa chỉ ra nguyên nhân vận hành.',
      },
      2: {
        en: 'Level 2 (Developing): Identifies obvious cost overruns but misses cross-department trade-offs.',
        vi: 'Cấp 2 (Đang phát triển): Nhận diện được vượt chi rõ rệt nhưng chưa nối kết liên phòng ban.',
      },
      3: {
        en: 'Level 3 (Proficient): Clearly separates symptoms from commercial/operational root causes and quantifies VND/USD impact.',
        vi: 'Cấp 3 (Thành thạo): Tách bạch triệu chứng và nguyên nhân gốc, lượng hóa tác động tài chính.',
      },
      4: {
        en: 'Level 4 (Mastery): Connects OTA commission, banquet mix, staffing rigidity, and yield dilution into an actionable commercial thesis.',
        vi: 'Cấp 4 (Chuyên gia): Kết nối hoa hồng OTA, cơ cấu tiệc, định biên nhân sự và giá bình quân thành luận điểm sắc bén.',
      },
    },
  },
  {
    criterionCode: 'FORECAST_PLAN',
    criterionNameEn: 'Forecasting & Scenario Planning',
    criterionNameVi: 'Dự Báo & Lập Kịch Bản Tài Chính',
    weightPercent: 15,
    maxScore: 100,
    passingScore: 70,
    anchors: {
      1: {
        en: 'Level 1 (Foundational): Copies budget blindly or uses static percentage assumptions.',
        vi: 'Cấp 1 (Nền tảng): Sao chép ngân sách cứng nhắc hoặc giả định tỷ lệ phẳng.',
      },
      2: {
        en: 'Level 2 (Developing): Builds a single base case using booking pace or historical ratios.',
        vi: 'Cấp 2 (Đang phát triển): Lập được kịch bản cơ sở theo pace nhưng thiếu kịch bản biên.',
      },
      3: {
        en: 'Level 3 (Proficient): Models Base/Upside/Downside sensitivities or NPV/IRR/Payback with explicit assumptions.',
        vi: 'Cấp 3 (Thành thạo): Mô hình hóa Base/Upside/Downside hoặc NPV/IRR/Payback với giả định rõ ràng.',
      },
      4: {
        en: 'Level 4 (Mastery): Stress-tests cash conversion, flex/flow-through thresholds, and early warning triggers.',
        vi: 'Cấp 4 (Chuyên gia): Kiểm định độ nhạy dòng tiền, ngưỡng flex/flow-through và chỉ báo cảnh báo sớm.',
      },
    },
  },
  {
    criterionCode: 'DECISION_REC',
    criterionNameEn: 'Decision Making & Recommendations',
    criterionNameVi: 'Ra Quyết Định & Khuyến Nghị Hành Động',
    weightPercent: 20,
    maxScore: 100,
    passingScore: 70,
    anchors: {
      1: {
        en: 'Level 1 (Foundational): Generic advice without quantified GOP recovery or timeline.',
        vi: 'Cấp 1 (Nền tảng): Khuyến nghị chung chung, không có tác động GOP hay tiến độ.',
      },
      2: {
        en: 'Level 2 (Developing): Selects plausible options but misses trade-offs on guest satisfaction or service standards.',
        vi: 'Cấp 2 (Đang phát triển): Chọn được phương án hợp lý nhưng chưa cân nhắc rủi ro trải nghiệm khách.',
      },
      3: {
        en: 'Level 3 (Proficient): Prioritizes high-ROI decisions with owner department, timeline, and measurable KPIs.',
        vi: 'Cấp 3 (Thành thạo): Ưu tiên quyết định hiệu quả cao kèm phòng ban chủ trì, thời hạn và KPI đo lường.',
      },
      4: {
        en: 'Level 4 (Mastery): Balances short-term GOP defense, luxury brand positioning, CAPEX discipline, and execution governance.',
        vi: 'Cấp 4 (Chuyên gia): Cân bằng bảo vệ GOP ngắn hạn, chuẩn thương hiệu, kỷ luật CAPEX và quản trị thực thi.',
      },
    },
  },
  {
    criterionCode: 'EXEC_COMM',
    criterionNameEn: 'Communication & GM Advisory',
    criterionNameVi: 'Giao Tiếp Điều Hành & Cố Vấn Cho GM',
    weightPercent: 15,
    maxScore: 100,
    passingScore: 70,
    anchors: {
      1: {
        en: 'Level 1 (Foundational): Disorganized narrative overloaded with raw accounting jargon.',
        vi: 'Cấp 1 (Nền tảng): Trình bày rời rạc, lạm dụng thuật ngữ hạch toán thuần túy.',
      },
      2: {
        en: 'Level 2 (Developing): Summarizes key figures clearly but struggles under GM executive pushback.',
        vi: 'Cấp 2 (Đang phát triển): Tóm tắt được số liệu chính nhưng lúng túng khi GM chất vấn.',
      },
      3: {
        en: 'Level 3 (Proficient): Delivers crisp executive memo and defends trade-offs calmly in GM meeting.',
        vi: 'Cấp 3 (Thành thạo): Viết báo cáo súc tích và bảo vệ luận điểm vững vàng khi họp GM.',
      },
      4: {
        en: 'Level 4 (Mastery): Commands boardroom confidence, aligns commercial and operational leaders around clear GM sign-offs.',
        vi: 'Cấp 4 (Chuyên gia): Bản lĩnh điều hành cao, kết nối Sales & Ops chốt quyết định chiến lược cùng GM.',
      },
    },
  },
  {
    criterionCode: 'RISK_CTRL',
    criterionNameEn: 'Risk Awareness & Internal Control',
    criterionNameVi: 'Nhận Thức Rủi Ro & Kiểm Soát Nội Bộ',
    weightPercent: 10,
    maxScore: 100,
    passingScore: 70,
    anchors: {
      1: {
        en: 'Level 1 (Foundational): Overlooks leakage, overtime abuse, or procurement control gaps.',
        vi: 'Cấp 1 (Nền tảng): Bỏ sót rủi ro thất thoát, lạm dụng tăng ca hoặc lỗ hổng thu mua.',
      },
      2: {
        en: 'Level 2 (Developing): Notes generic cost risks without concrete audit or control checkpoints.',
        vi: 'Cấp 2 (Đang phát triển): Nêu rủi ro chung chung nhưng thiếu chốt kiểm soát cụ thể.',
      },
      3: {
        en: 'Level 3 (Proficient): Embeds practical control checkpoints (PO approval, OT cap, credit & par-stock controls).',
        vi: 'Cấp 3 (Thành thạo): Thiết kế được chốt kiểm soát thực tế (duyệt PO, trần OT, định mức tồn kho).',
      },
      4: {
        en: 'Level 4 (Mastery): Proactively safeguards hotel compliance, guest experience, working capital, and owner covenants.',
        vi: 'Cấp 4 (Chuyên gia): Bảo vệ toàn diện tuân thủ, trải nghiệm khách, vốn lưu động và cam kết với chủ đầu tư.',
      },
    },
  },
];

export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

export function roundTo(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function classifyVariance(
  actual: number | null,
  budget: number | null,
  nature: CalculationAuditItem['accountNature']
): 'Favorable' | 'Unfavorable' | 'Neutral' | 'N/A' {
  if (actual === null || budget === null) return 'N/A';
  const diff = actual - budget;
  if (Math.abs(diff) < 1e-6) return 'Neutral';
  if (nature === 'revenue' || nature === 'profit' || nature === 'kpi_higher_better') {
    return diff > 0 ? 'Favorable' : 'Unfavorable';
  }
  return diff < 0 ? 'Favorable' : 'Unfavorable';
}

export interface StatementSeedInput {
  availableRooms: number;
  occupancyPct: number;
  adr: number;
  complimentaryRooms: number;
  houseUseRooms: number;
  cancelledRooms: number;
  otaSharePct: number;
  directSharePct: number;
  corporateSharePct: number;
  distributionCommissionPct: number;
  roomsPayroll: number;
  roomsOtherExpenses: number;
  restaurantRevenue: number;
  barRevenue: number;
  banquetRevenue: number;
  foodRevenueRatio?: number;
  foodCostPctTarget: number;
  beverageCostPctTarget: number;
  fbPayroll: number;
  fbOtherOpEx: number;
  spaRevenue: number;
  recreationRevenue: number;
  otherDeptRevenue: number;
  otherDeptDirectExpenses: number;
  adminAndGeneral: number;
  salesAndMarketing: number;
  propertyOperationsMaintenance: number;
  utilities: number;
  managementFeePct?: number;
  nonOperatingItems: number;
}

export function buildConsistentStatementColumns(input: StatementSeedInput): HotelStatementColumns {
  const occupiedRooms = Math.round((input.availableRooms * input.occupancyPct) / 100);
  const occupancyPct = roundTo((occupiedRooms / Math.max(1, input.availableRooms)) * 100, 2);
  const adr = roundTo(input.adr, 2);
  const roomsRevenue = Math.round(occupiedRooms * adr);
  const revpar = roundTo(roomsRevenue / Math.max(1, input.availableRooms), 2);
  const distributionCost = Math.round(roomsRevenue * (input.otaSharePct / 100) * (input.distributionCommissionPct / 100));
  const roomsExpenses = Math.round(distributionCost + input.roomsPayroll + input.roomsOtherExpenses);
  const roomsProfit = Math.round(roomsRevenue - roomsExpenses);

  const fbRevenue = Math.round(input.restaurantRevenue + input.barRevenue + input.banquetRevenue);
  const foodRatio = input.foodRevenueRatio ?? 0.72;
  const foodRevenue = Math.round(fbRevenue * foodRatio);
  const beverageRevenue = Math.max(0, fbRevenue - foodRevenue);
  const foodCost = Math.round((foodRevenue * input.foodCostPctTarget) / 100);
  const beverageCost = Math.round((beverageRevenue * input.beverageCostPctTarget) / 100);
  const foodCostPct = foodRevenue > 0 ? roundTo((foodCost / foodRevenue) * 100, 2) : 0;
  const beverageCostPct = beverageRevenue > 0 ? roundTo((beverageCost / beverageRevenue) * 100, 2) : 0;
  const fbExpenses = Math.round(foodCost + beverageCost + input.fbPayroll + input.fbOtherOpEx);
  const fbProfit = Math.round(fbRevenue - fbExpenses);

  const otherOperatingRevenue = Math.round(input.spaRevenue + input.recreationRevenue + input.otherDeptRevenue);
  const otherDeptProfit = Math.round(otherOperatingRevenue - input.otherDeptDirectExpenses);

  const totalOperatingRevenue = Math.round(roomsRevenue + fbRevenue + otherOperatingRevenue);
  const totalDepartmentalExpenses = Math.round(roomsExpenses + fbExpenses + input.otherDeptDirectExpenses);
  const totalDepartmentalProfit = Math.round(roomsProfit + fbProfit + otherDeptProfit);

  const totalUndistributedExpenses = Math.round(
    input.adminAndGeneral +
      input.salesAndMarketing +
      input.propertyOperationsMaintenance +
      input.utilities
  );

  const gop = Math.round(totalDepartmentalProfit - totalUndistributedExpenses);
  const gopMarginPct = totalOperatingRevenue > 0 ? roundTo((gop / totalOperatingRevenue) * 100, 2) : 0;
  const managementFees = Math.round(
    totalOperatingRevenue * ((input.managementFeePct ?? 3.0) / 100) + Math.max(0, gop) * 0.06
  );
  const ebitda = Math.round(gop - managementFees - input.nonOperatingItems);
  const totalLaborCost = Math.round(
    input.roomsPayroll +
      input.fbPayroll +
      input.adminAndGeneral * 0.48 +
      input.salesAndMarketing * 0.42 +
      input.propertyOperationsMaintenance * 0.44
  );
  const laborCostPct = totalOperatingRevenue > 0 ? roundTo((totalLaborCost / totalOperatingRevenue) * 100, 2) : 0;

  return {
    availableRooms: input.availableRooms,
    occupiedRooms,
    occupancyPct,
    adr,
    revpar,
    roomsRevenue,
    complimentaryRooms: input.complimentaryRooms,
    houseUseRooms: input.houseUseRooms,
    cancelledRooms: input.cancelledRooms,
    otaSharePct: input.otaSharePct,
    directSharePct: input.directSharePct,
    corporateSharePct: input.corporateSharePct,
    distributionCost,
    roomsPayroll: input.roomsPayroll,
    roomsOtherExpenses: input.roomsOtherExpenses,
    roomsExpenses,
    roomsProfit,
    restaurantRevenue: input.restaurantRevenue,
    barRevenue: input.barRevenue,
    banquetRevenue: input.banquetRevenue,
    fbRevenue,
    foodRevenue,
    beverageRevenue,
    foodCost,
    beverageCost,
    foodCostPct,
    beverageCostPct,
    fbPayroll: input.fbPayroll,
    fbOtherOpEx: input.fbOtherOpEx,
    fbExpenses,
    fbProfit,
    spaRevenue: input.spaRevenue,
    recreationRevenue: input.recreationRevenue,
    otherDeptRevenue: input.otherDeptRevenue,
    otherOperatingRevenue,
    otherDeptDirectExpenses: input.otherDeptDirectExpenses,
    otherDeptProfit,
    adminAndGeneral: input.adminAndGeneral,
    salesAndMarketing: input.salesAndMarketing,
    propertyOperationsMaintenance: input.propertyOperationsMaintenance,
    utilities: input.utilities,
    totalUndistributedExpenses,
    totalOperatingRevenue,
    totalDepartmentalExpenses,
    totalDepartmentalProfit,
    gop,
    gopMarginPct,
    managementFees,
    nonOperatingItems: input.nonOperatingItems,
    ebitda,
    totalLaborCost,
    laborCostPct,
  };
}

export function computeFinancialAudit(
  actual: HotelStatementColumns,
  budget: HotelStatementColumns
): CalculationAuditItem[] {
  const buildRow = (
    metricKey: string,
    labelEn: string,
    labelVi: string,
    formula: string,
    denominatorDefinition: string,
    actualValue: number | null,
    budgetValue: number | null,
    unit: CalculationAuditItem['unit'],
    accountNature: CalculationAuditItem['accountNature'],
    explanationEn: string,
    explanationVi: string
  ): CalculationAuditItem => {
    const variance = actualValue !== null && budgetValue !== null ? roundTo(actualValue - budgetValue, 2) : null;
    const rawPct = variance !== null && budgetValue !== null ? safeDivide(variance, Math.abs(budgetValue)) : null;
    const variancePct = rawPct !== null ? roundTo(rawPct * 100, 2) : null;
    return {
      metricKey,
      labelEn,
      labelVi,
      formula,
      denominatorDefinition,
      actualValue: actualValue !== null ? roundTo(actualValue, 2) : null,
      budgetValue: budgetValue !== null ? roundTo(budgetValue, 2) : null,
      variance,
      variancePct,
      unit,
      accountNature,
      classification: classifyVariance(actualValue, budgetValue, accountNature),
      explanationEn,
      explanationVi,
    };
  };

  const actOcc = safeDivide(actual.occupiedRooms, actual.availableRooms);
  const budOcc = safeDivide(budget.occupiedRooms, budget.availableRooms);
  const actAdr = safeDivide(actual.roomsRevenue, actual.occupiedRooms);
  const budAdr = safeDivide(budget.roomsRevenue, budget.occupiedRooms);
  const actRevpar = safeDivide(actual.roomsRevenue, actual.availableRooms);
  const budRevpar = safeDivide(budget.roomsRevenue, budget.availableRooms);
  const actGopMargin = safeDivide(actual.gop, actual.totalOperatingRevenue);
  const budGopMargin = safeDivide(budget.gop, budget.totalOperatingRevenue);
  const actFoodCostPct = safeDivide(actual.foodCost, actual.foodRevenue);
  const budFoodCostPct = safeDivide(budget.foodCost, budget.foodRevenue);
  const actBevCostPct = safeDivide(actual.beverageCost, actual.beverageRevenue);
  const budBevCostPct = safeDivide(budget.beverageCost, budget.beverageRevenue);
  const actLaborPct = safeDivide(actual.totalLaborCost, actual.totalOperatingRevenue);
  const budLaborPct = safeDivide(budget.totalLaborCost, budget.totalOperatingRevenue);

  return [
    buildRow(
      'occupancyPct',
      'Occupancy %',
      'Công suất phòng (Occupancy %)',
      '(Occupied Rooms / Available Rooms) × 100',
      'Available Rooms (paid capacity excluding OOO)',
      actOcc !== null ? actOcc * 100 : null,
      budOcc !== null ? budOcc * 100 : null,
      'percent',
      'kpi_higher_better',
      'Measures physical utilization of room inventory.',
      'Đo lường tỷ lệ lấp đầy quỹ phòng khả dụng.'
    ),
    buildRow(
      'adr',
      'Average Daily Rate (ADR)',
      'Giá phòng bình quân (ADR)',
      'Rooms Revenue / Occupied Rooms',
      'Occupied Paid Rooms',
      actAdr,
      budAdr,
      'currency',
      'kpi_higher_better',
      'Measures net realized rate per sold room night.',
      'Đo lường đơn giá phòng bình quân thực thu trên mỗi đêm phòng bán được.'
    ),
    buildRow(
      'revpar',
      'RevPAR',
      'Doanh thu trên mỗi phòng khả dụng (RevPAR)',
      'Rooms Revenue / Available Rooms (= Occupancy × ADR)',
      'Total Available Rooms',
      actRevpar,
      budRevpar,
      'currency',
      'kpi_higher_better',
      'Combines occupancy volume and ADR yield per available room.',
      'Kết hợp hiệu quả công suất và giá bán trên toàn bộ quỹ phòng khả dụng.'
    ),
    buildRow(
      'roomsRevenue',
      'Rooms Revenue',
      'Doanh thu Bộ phận Buồng phòng',
      'Occupied Rooms × ADR',
      'N/A (Absolute Monetary Line)',
      actual.roomsRevenue,
      budget.roomsRevenue,
      'currency',
      'revenue',
      'Primary high-margin top-line revenue driver under USALI Schedule 1.',
      'Nguồn doanh thu biên lợi nhuận cao nhất theo Biểu 1 chuẩn USALI.'
    ),
    buildRow(
      'fbRevenue',
      'Food & Beverage Revenue',
      'Doanh thu Ẩm thực (F&B Revenue)',
      'Restaurant + Bar + Banquet Revenue',
      'N/A (Absolute Monetary Line)',
      actual.fbRevenue,
      budget.fbRevenue,
      'currency',
      'revenue',
      'Combined outlet & MICE banquet revenue under USALI Schedule 2.',
      'Tổng doanh thu nhà hàng, bar và tiệc hội nghị theo Biểu 2 chuẩn USALI.'
    ),
    buildRow(
      'totalOperatingRevenue',
      'Total Operating Revenue',
      'Tổng Doanh thu Hoạt động',
      'Rooms + F&B + Other Operating Departments',
      'N/A (Absolute Monetary Line)',
      actual.totalOperatingRevenue,
      budget.totalOperatingRevenue,
      'currency',
      'revenue',
      'Consolidated hotel top-line revenue.',
      'Tổng doanh thu hợp nhất toàn khách sạn.'
    ),
    buildRow(
      'totalDepartmentalExpenses',
      'Total Departmental Expenses',
      'Tổng Chi phí Bộ phận Kinh doanh',
      'Rooms Expenses + F&B Expenses + Other Dept Expenses',
      'N/A (Absolute Expense Line)',
      actual.totalDepartmentalExpenses,
      budget.totalDepartmentalExpenses,
      'currency',
      'expense',
      'Direct cost of sales, payroll, and operating expenses inside revenue departments.',
      'Chi phí giá vốn, nhân sự và vận hành trực tiếp tại các bộ phận tạo doanh thu.'
    ),
    buildRow(
      'totalDepartmentalProfit',
      'Total Departmental Profit',
      'Tổng Lợi nhuận Bộ phận Kinh doanh',
      'Total Operating Revenue − Total Departmental Expenses',
      'N/A (Absolute Profit Line)',
      actual.totalDepartmentalProfit,
      budget.totalDepartmentalProfit,
      'currency',
      'profit',
      'Profit contribution before undistributed overhead.',
      'Lợi nhuận gộp các bộ phận trước chi phí gián tiếp.'
    ),
    buildRow(
      'totalUndistributedExpenses',
      'Total Undistributed Operating Expenses',
      'Tổng Chi phí Hoạt động Không Phân Bổ',
      'A&G + Sales & Marketing + POM + Utilities',
      'N/A (Absolute Expense Line)',
      actual.totalUndistributedExpenses,
      budget.totalUndistributedExpenses,
      'currency',
      'expense',
      'Overhead support expenses (A&G, S&M, Engineering, Energy).',
      'Chi phí khối hỗ trợ (Hành chính, Kinh doanh Tiếp thị, Kỹ thuật, Năng lượng).'
    ),
    buildRow(
      'gop',
      'Gross Operating Profit (GOP)',
      'Lợi nhuận Vận hành Gộp (GOP)',
      'Total Departmental Profit − Total Undistributed Expenses',
      'N/A (Primary Hotel Operating Profit)',
      actual.gop,
      budget.gop,
      'currency',
      'profit',
      'Primary accountability metric for the General Manager and Financial Controller.',
      'Thước đo hiệu quả điều hành cốt lõi của GM và Kiểm soát viên Tài chính.'
    ),
    buildRow(
      'gopMarginPct',
      'GOP Margin %',
      'Biên lợi nhuận GOP (%)',
      '(GOP / Total Operating Revenue) × 100',
      'Total Operating Revenue',
      actGopMargin !== null ? actGopMargin * 100 : null,
      budGopMargin !== null ? budGopMargin * 100 : null,
      'percent',
      'kpi_higher_better',
      'Shows operational flow-through efficiency from revenue to GOP.',
      'Phản ánh hiệu suất chuyển hóa doanh thu thành lợi nhuận vận hành.'
    ),
    buildRow(
      'foodCostPct',
      'Food Cost %',
      'Tỷ lệ Giá vốn Đồ ăn (Food Cost %)',
      '(Food Cost / Food Revenue) × 100',
      'Food Revenue (USALI Schedule 2)',
      actFoodCostPct !== null ? actFoodCostPct * 100 : null,
      budFoodCostPct !== null ? budFoodCostPct * 100 : null,
      'percent',
      'kpi_lower_better',
      'Evaluated strictly against Food Revenue (not total F&B revenue).',
      'Tính trên Doanh thu Đồ ăn (tách riêng đồ uống theo chuẩn USALI).'
    ),
    buildRow(
      'beverageCostPct',
      'Beverage Cost %',
      'Tỷ lệ Giá vốn Đồ uống (Beverage Cost %)',
      '(Beverage Cost / Beverage Revenue) × 100',
      'Beverage Revenue (USALI Schedule 2)',
      actBevCostPct !== null ? actBevCostPct * 100 : null,
      budBevCostPct !== null ? budBevCostPct * 100 : null,
      'percent',
      'kpi_lower_better',
      'Evaluated strictly against Beverage Revenue.',
      'Tính trên Doanh thu Đồ uống để kiểm soát thất thoát quầy bar/tiệc.'
    ),
    buildRow(
      'laborCostPct',
      'Total Labor Cost %',
      'Tỷ lệ Chi phí Nhân sự / Doanh thu (%)',
      '(Total Payroll & Related / Total Operating Revenue) × 100',
      'Total Operating Revenue',
      actLaborPct !== null ? actLaborPct * 100 : null,
      budLaborPct !== null ? budLaborPct * 100 : null,
      'percent',
      'kpi_lower_better',
      'Monitors staffing productivity relative to total hotel revenue.',
      'Kiểm soát năng suất định biên lao động và tăng ca so với tổng doanh thu.'
    ),
    buildRow(
      'ebitda',
      'EBITDA (After Management Fees)',
      'EBITDA Sau Phí Quản Lý',
      'GOP − Management Fees − Non-Operating Items',
      'N/A (Owner Bottom-Line Proxy)',
      actual.ebitda,
      budget.ebitda,
      'currency',
      'profit',
      'Net operating return available for ownership debt service and reserves.',
      'Lợi nhuận trước lãi vay, thuế và khấu hao dành cho chủ đầu tư.'
    ),
  ];
}

export interface RollingForecastComputedRow {
  monthLabel: string;
  scenario: 'Budget' | 'Base' | 'Upside' | 'Downside';
  availableRooms: number;
  occupancyPct: number;
  occupiedRooms: number;
  adr: number;
  revpar: number;
  roomsRevenue: number;
  fbRevenue: number;
  totalRevenue: number;
  variableCosts: number;
  fixedOpEx: number;
  gop: number;
  gopMarginPct: number;
}

export function computeRollingForecastScenario(
  inputs: RollingForecastMonthInput[],
  userMonths?: Array<{
    monthLabel: string;
    baseOccPct: number;
    baseAdr: number;
    upsideOccPct: number;
    upsideAdr: number;
    downsideOccPct: number;
    downsideAdr: number;
  }>
): {
  rows: RollingForecastComputedRow[];
  totals: Record<'Budget' | 'Base' | 'Upside' | 'Downside', { totalRevenue: number; gop: number; gopMarginPct: number; avgOccPct: number; avgAdr: number }>;
} {
  const rows: RollingForecastComputedRow[] = [];
  const totals: Record<
    'Budget' | 'Base' | 'Upside' | 'Downside',
    { totalRevenue: number; gop: number; gopMarginPct: number; avgOccPct: number; avgAdr: number; _roomsSold: number; _avail: number; _roomsRev: number }
  > = {
    Budget: { totalRevenue: 0, gop: 0, gopMarginPct: 0, avgOccPct: 0, avgAdr: 0, _roomsSold: 0, _avail: 0, _roomsRev: 0 },
    Base: { totalRevenue: 0, gop: 0, gopMarginPct: 0, avgOccPct: 0, avgAdr: 0, _roomsSold: 0, _avail: 0, _roomsRev: 0 },
    Upside: { totalRevenue: 0, gop: 0, gopMarginPct: 0, avgOccPct: 0, avgAdr: 0, _roomsSold: 0, _avail: 0, _roomsRev: 0 },
    Downside: { totalRevenue: 0, gop: 0, gopMarginPct: 0, avgOccPct: 0, avgAdr: 0, _roomsSold: 0, _avail: 0, _roomsRev: 0 },
  };

  inputs.forEach((m) => {
    const custom = userMonths?.find((u) => u.monthLabel === m.monthLabel);
    const definitions: Array<{ name: 'Budget' | 'Base' | 'Upside' | 'Downside'; occPct: number; adr: number }> = [
      { name: 'Budget', occPct: m.budgetOccupancyPct, adr: m.budgetAdr },
      { name: 'Base', occPct: custom?.baseOccPct ?? m.suggestedBaseOccPct, adr: custom?.baseAdr ?? m.suggestedBaseAdr },
      { name: 'Upside', occPct: custom?.upsideOccPct ?? m.suggestedUpsideOccPct, adr: custom?.upsideAdr ?? m.suggestedUpsideAdr },
      { name: 'Downside', occPct: custom?.downsideOccPct ?? m.suggestedDownsideOccPct, adr: custom?.downsideAdr ?? m.suggestedDownsideAdr },
    ];

    definitions.forEach((def) => {
      const clampedOcc = Math.max(0, Math.min(100, def.occPct));
      const occupiedRooms = Math.round((m.availableRooms * clampedOcc) / 100);
      const roomsRevenue = Math.round(occupiedRooms * def.adr);
      const revpar = roundTo(roomsRevenue / Math.max(1, m.availableRooms), 2);
      const fbRevenue = Math.round(occupiedRooms * m.fbCapturePerOccupiedRoom);
      const totalRevenue = roomsRevenue + fbRevenue;
      const variableCosts = Math.round(totalRevenue * m.variableCostRatio);
      const gop = Math.round(totalRevenue - variableCosts - m.fixedOperatingExpenses);
      const gopMarginPct = totalRevenue > 0 ? roundTo((gop / totalRevenue) * 100, 2) : 0;

      rows.push({
        monthLabel: m.monthLabel,
        scenario: def.name,
        availableRooms: m.availableRooms,
        occupancyPct: roundTo((occupiedRooms / Math.max(1, m.availableRooms)) * 100, 2),
        occupiedRooms,
        adr: roundTo(def.adr, 2),
        revpar,
        roomsRevenue,
        fbRevenue,
        totalRevenue,
        variableCosts,
        fixedOpEx: m.fixedOperatingExpenses,
        gop,
        gopMarginPct,
      });

      const t = totals[def.name];
      t.totalRevenue += totalRevenue;
      t.gop += gop;
      t._roomsSold += occupiedRooms;
      t._avail += m.availableRooms;
      t._roomsRev += roomsRevenue;
    });
  });

  (['Budget', 'Base', 'Upside', 'Downside'] as const).forEach((k) => {
    const t = totals[k];
    t.gopMarginPct = t.totalRevenue > 0 ? roundTo((t.gop / t.totalRevenue) * 100, 2) : 0;
    t.avgOccPct = t._avail > 0 ? roundTo((t._roomsSold / t._avail) * 100, 2) : 0;
    t.avgAdr = t._roomsSold > 0 ? roundTo(t._roomsRev / t._roomsSold, 2) : 0;
  });

  return { rows, totals };
}

export interface CapexEvaluationResult {
  annualGrossBenefits: number;
  annualNetCashFlow: number;
  paybackYears: number | null;
  totalLifetimeNetProfit: number;
  roiPct: number | null;
  simpleAnnualRoiPct: number | null;
  npv: number;
  irrPct: number | null;
  isFinanciallyViable: boolean;
  schedule: Array<{
    year: number;
    cashFlow: number;
    cumulativeCashFlow: number;
    discountedCashFlow: number;
    cumulativeDiscountedCashFlow: number;
  }>;
}

export function computeCapexMetrics(assumptions: CapexAssumptions): CapexEvaluationResult {
  const inv = Math.max(0, assumptions.initialInvestment);
  const life = Math.max(1, Math.round(assumptions.usefulLifeYears));
  const rate = Math.max(0, assumptions.discountRatePct) / 100;

  const annualGrossBenefits =
    assumptions.annualEnergySavings +
    assumptions.annualLaborSavings +
    assumptions.annualIncrementalRevenue;
  const annualNetCashFlow = annualGrossBenefits - assumptions.annualMaintenanceCost;

  const paybackYears = annualNetCashFlow > 0 ? roundTo(inv / annualNetCashFlow, 2) : null;
  const totalLifetimeNetProfit = roundTo(annualNetCashFlow * life - inv, 0);
  const roiPct = inv > 0 ? roundTo((totalLifetimeNetProfit / inv) * 100, 2) : null;
  const simpleAnnualRoiPct = inv > 0 ? roundTo((annualNetCashFlow / inv) * 100, 2) : null;

  const npvAtRate = (r: number) => {
    let val = -inv;
    for (let t = 1; t <= life; t++) {
      val += annualNetCashFlow / Math.pow(1 + r, t);
    }
    return val;
  };

  const npv = Math.round(npvAtRate(rate));

  let irrPct: number | null = null;
  if (inv > 0 && annualNetCashFlow > 0 && annualNetCashFlow * life > inv) {
    let low = -0.5;
    let high = 3.0;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (low + high) / 2;
      const val = npvAtRate(mid);
      if (Math.abs(val) < 0.01) {
        low = mid;
        high = mid;
        break;
      }
      if (val > 0) low = mid;
      else high = mid;
    }
    irrPct = roundTo(((low + high) / 2) * 100, 2);
  }

  const schedule: CapexEvaluationResult['schedule'] = [
    {
      year: 0,
      cashFlow: -inv,
      cumulativeCashFlow: -inv,
      discountedCashFlow: -inv,
      cumulativeDiscountedCashFlow: -inv,
    },
  ];

  let cumCf = -inv;
  let cumDcf = -inv;
  for (let y = 1; y <= life; y++) {
    cumCf += annualNetCashFlow;
    const dcf = annualNetCashFlow / Math.pow(1 + rate, y);
    cumDcf += dcf;
    schedule.push({
      year: y,
      cashFlow: Math.round(annualNetCashFlow),
      cumulativeCashFlow: Math.round(cumCf),
      discountedCashFlow: Math.round(dcf),
      cumulativeDiscountedCashFlow: Math.round(cumDcf),
    });
  }

  return {
    annualGrossBenefits: Math.round(annualGrossBenefits),
    annualNetCashFlow: Math.round(annualNetCashFlow),
    paybackYears,
    totalLifetimeNetProfit,
    roiPct,
    simpleAnnualRoiPct,
    npv,
    irrPct,
    isFinanciallyViable: npv > 0 && (irrPct === null || irrPct > assumptions.discountRatePct),
    schedule,
  };
}

export const DEFAULT_HOTEL_PROFILES: HotelSimulationProfileDoc[] = [
  {
    id: 'hotel_upscale_250',
    hotelCode: 'HTL-UP-250',
    hotelName: 'Grand Horizon Upscale Hotel & Convention',
    brandTier: 'Upscale Full-Service (250 Keys)',
    city: 'Ho Chi Minh City',
    roomsAvailable: 7500,
    totalKeys: 250,
    fcPositionLevel: 'Assistant FC (Level 3)',
    currency: 'USD',
    importedAt: '2026-01-01T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'hotel_luxury_400',
    hotelCode: 'HTL-LX-400',
    hotelName: 'Emerald Crown Luxury Hotel & Residences',
    brandTier: 'Luxury Flagship (400 Keys)',
    city: 'Da Nang',
    roomsAvailable: 12000,
    totalKeys: 400,
    fcPositionLevel: 'Financial Controller (Level 4)',
    currency: 'USD',
    importedAt: '2026-01-01T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'hotel_business_150',
    hotelCode: 'HTL-BZ-150',
    hotelName: 'Marina Bay Select Business Hotel',
    brandTier: 'Upper Midscale Business (150 Keys)',
    city: 'Hanoi',
    roomsAvailable: 4500,
    totalKeys: 150,
    fcPositionLevel: 'Senior Accountant (Level 2)',
    currency: 'USD',
    importedAt: '2026-01-01T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'hotel_resort_320',
    hotelCode: 'HTL-RS-320',
    hotelName: 'Azure Coast Wellness Resort & Villas',
    brandTier: 'Luxury Coastal Resort (320 Keys)',
    city: 'Nha Trang',
    roomsAvailable: 9600,
    totalKeys: 320,
    fcPositionLevel: 'Financial Controller (Level 4)',
    currency: 'USD',
    importedAt: '2026-01-01T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
];

export const DEFAULT_SIMULATOR_SCENARIOS: SimulationScenarioDoc[] = [
  {
    id: 'sim_scn_01',
    scenarioCode: 'SIM-GOP-01',
    hotelId: 'hotel_upscale_250',
    titleEn: 'Revenue Growth but GOP Decline',
    titleVi: 'Doanh Thu Tăng Nhưng Lợi Nhuận GOP Sụt Giảm',
    summaryEn:
      'Total hotel revenue beat budget by +7.5%, yet Gross Operating Profit fell -9.6% below budget and GOP Margin compressed by 580 bps. Diagnose OTA mix leakage, food cost slippage, and overtime expansion.',
    summaryVi:
      'Tổng doanh thu khách sạn vượt ngân sách +7.5% nhưng GOP giảm -9.6% so với kế hoạch và biên GOP thu hẹp 5.8 điểm %. Chẩn đoán rò rỉ hoa hồng OTA, vượt định mức giá vốn đồ ăn và chi phí tăng ca.',
    category: 'GOP & Hotel Financial Performance',
    difficultyLabel: 'Intermediate',
    difficultyLevel: 2,
    targetRole: 'Assistant Financial Controller',
    recommendedPositionIds: ['Senior Accountant', 'Assistant Financial Controller'],
    competencyIds: ['BPA-01', 'BPA-02', 'FPM-04', 'SBP-01'],
    periodLabel: 'March 2026 (Monthly USALI Review)',
    estimatedDurationMinutes: 35,
    learningObjectivesEn: [
      'Reconcile USALI Departmental vs Undistributed variances between Actual and Budget.',
      'Separate top-line volume gains from OTA commission dilution and kitchen cost overruns.',
      'Present a focused 30-day GOP margin recovery plan to the General Manager.',
    ],
    learningObjectivesVi: [
      'Đối chiếu biến động Bộ phận kinh doanh và Chi phí gián tiếp chuẩn USALI giữa Thực tế và Ngân sách.',
      'Tách bạch tăng trưởng công suất khỏi pha loãng hoa hồng OTA và trượt giá vốn bếp.',
      'Trình bày kế hoạch phục hồi biên GOP 30 ngày thuyết phục trước Tổng Giám đốc.',
    ],
    requiredKnowledgeEn: ['USALI 12th P&L Structure', 'Occupancy / ADR / RevPAR Decomposition', 'Food Cost % vs Revenue Mix'],
    requiredKnowledgeVi: ['Cấu trúc P&L chuẩn USALI 12th', 'Phân rã Occupancy / ADR / RevPAR', 'Giá vốn đồ ăn & cơ cấu doanh thu'],
    expectedOutputsEn: ['Quantified Variance Root-Cause Memo', 'Priority Action Plan', 'GM Executive Briefing'],
    expectedOutputsVi: ['Báo cáo Phân tích Nguyên nhân Gốc định lượng', 'Kế hoạch Hành động ưu tiên', 'Thuyết trình điều hành cho GM'],
    usaliReferenceLabel: 'USALI 12th Ed. Operating Statement & Schedules 1–4',
    scenarioKind: 'standard',
    defaultPersona: 'General Manager',
    languageOptions: ['vi', 'en'],
    datasetVersion: '2026.03.v1',
    status: 'Published',
    publishedBy: 'Academic Committee',
    publishedAt: '2026-01-15T00:00:00.000Z',
    importedAt: '2026-01-15T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'sim_scn_02',
    scenarioCode: 'SIM-RFC-02',
    hotelId: 'hotel_upscale_250',
    titleEn: 'Three-Month Rolling Forecast (Base / Upside / Downside)',
    titleVi: 'Dự Báo Cuốn 3 Tháng (Cơ Sở / Tích Cực / Thận Trọng)',
    summaryEn:
      'Construct an interactive Q2 (Apr–Jun) rolling forecast using PMS booking pace, historical cancellations, group MICE pickup, and F&B capture per occupied room to advise revenue and payroll flexing.',
    summaryVi:
      'Xây dựng dự báo cuốn Quý 2 (Tháng 4–6) từ dữ liệu booking pace PMS, tỷ lệ hủy lịch sử, đoàn MICE đã xác nhận và chi tiêu F&B mỗi đêm phòng để tham mưu điều chỉnh nhân sự.',
    category: 'Revenue Forecasting & Budgeting',
    difficultyLabel: 'Advanced',
    difficultyLevel: 3,
    targetRole: 'Assistant Financial Controller',
    recommendedPositionIds: ['Assistant Financial Controller', 'Financial Controller'],
    competencyIds: ['FPM-02', 'BPA-03', 'SBP-02', 'FPM-01'],
    periodLabel: 'Q2 2026 (April – June Rolling Forecast)',
    estimatedDurationMinutes: 40,
    learningObjectivesEn: [
      'Translate forward booking pace and cancellation rates into realistic Base/Upside/Downside room-night assumptions.',
      'Model variable vs fixed departmental cost flexing across revenue scenarios.',
      'Advise GM on variable staffing triggers and GOP sensitivity before summer shoulder season.',
    ],
    learningObjectivesVi: [
      'Chuyển hóa booking pace và tỷ lệ hủy phòng thành giả định Base/Upside/Downside sát thực tế.',
      'Mô hình hóa độ co giãn biến phí và định phí qua các kịch bản doanh thu.',
      'Tham mưu GM ngưỡng kích hoạt điều chỉnh nhân sự thời vụ và độ nhạy GOP.',
    ],
    requiredKnowledgeEn: ['Rolling Forecast vs Static Budget', 'Booking Pace & Wash Analysis', 'Flex & Flow-Through'],
    requiredKnowledgeVi: ['Dự báo cuốn vs Ngân sách tĩnh', 'Phân tích Booking Pace & tỷ lệ hủy', 'Flex & Flow-Through'],
    expectedOutputsEn: ['3-Scenario Q2 Forecast Grid', 'Downside Contingency Trigger Plan', 'GM Forecast Briefing'],
    expectedOutputsVi: ['Bảng Dự báo Q2 ba kịch bản', 'Kế hoạch ứng phó kịch bản Thận trọng', 'Báo cáo Dự báo cho GM'],
    usaliReferenceLabel: 'USALI 12th Ed. Budgeting, Forecasting & Flow-Through Guide',
    scenarioKind: 'rolling_forecast',
    defaultPersona: 'Director of Sales & Marketing',
    languageOptions: ['vi', 'en'],
    datasetVersion: '2026.Q2.v1',
    status: 'Published',
    publishedBy: 'Academic Committee',
    publishedAt: '2026-01-15T00:00:00.000Z',
    importedAt: '2026-01-15T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'sim_scn_03',
    scenarioCode: 'SIM-LAB-03',
    hotelId: 'hotel_luxury_400',
    titleEn: 'Labor Productivity & Food Cost Recovery',
    titleVi: 'Kiểm Soát Năng Suất Lao Động & Phục Hồi Giá Vốn Ẩm Thực',
    summaryEn:
      'A 400-key luxury flagship faces escalating kitchen overtime (+28% vs budget) and F&B food cost jumping from 29% to 35.4% due to banquet waste and unapproved spot purchasing without compromising Forbes 5-star standards.',
    summaryVi:
      'Khách sạn hạng sang 400 phòng đối mặt tăng ca bếp vọt +28% kế hoạch và tỷ lệ giá vốn đồ ăn tăng từ 29% lên 35.4% do hao hụt tiệc và mua hàng ngoài hợp đồng — cần phục hồi biên lợi nhuận mà không giảm chuẩn 5 sao.',
    category: 'Cost Control & Profitability',
    difficultyLabel: 'Advanced',
    difficultyLevel: 3,
    targetRole: 'Financial Controller',
    recommendedPositionIds: ['Assistant Financial Controller', 'Financial Controller'],
    competencyIds: ['FCA-03', 'BPA-04', 'FPM-04', 'LPM-02'],
    periodLabel: 'May 2026 (Luxury F&B & Labor Audit)',
    estimatedDurationMinutes: 40,
    learningObjectivesEn: [
      'Separate menu mix impact from portion control waste, yield loss, and vendor price variance.',
      'Re-engineer banquet casual labor vs core roster scheduling around cover peaks.',
      'Preserve luxury guest satisfaction scores while restoring Food Cost % within 30.5%.',
    ],
    learningObjectivesVi: [
      'Tách tác động cơ cấu thực đơn khỏi hao hụt định lượng, sơ chế và chênh lệch giá nhập.',
      'Tái cấu trúc lịch ca nhân sự thời vụ tiệc theo khung giờ cao điểm.',
      'Giữ vững điểm hài lòng khách hàng hạng sang khi đưa Food Cost % về ngưỡng 30.5%.',
    ],
    requiredKnowledgeEn: ['Schedule 2 Food Cost % Control', 'Labor Hours per Cover / Occupied Room', 'Internal Procurement Controls'],
    requiredKnowledgeVi: ['Kiểm soát Food Cost Biểu 2 USALI', 'Giờ công trên mỗi lượt khách / phòng', 'Kiểm soát thu mua & định mức kho'],
    expectedOutputsEn: ['Kitchen Cost & Overtime Diagnostic', 'Cross-Department Control Matrix', 'F&B Director Negotiation Plan'],
    expectedOutputsVi: ['Chẩn đoán Giá vốn Bếp & Tăng ca', 'Ma trận Kiểm soát nội bộ liên phòng ban', 'Phương án làm việc với Bếp trưởng / F&B'],
    usaliReferenceLabel: 'USALI 12th Ed. Schedule 2 & Payroll Burden Analysis',
    scenarioKind: 'standard',
    defaultPersona: 'Executive Chef / F&B Director',
    languageOptions: ['vi', 'en'],
    datasetVersion: '2026.05.v1',
    status: 'Published',
    publishedBy: 'Academic Committee',
    publishedAt: '2026-01-15T00:00:00.000Z',
    importedAt: '2026-01-15T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'sim_scn_04',
    scenarioCode: 'SIM-CPX-04',
    hotelId: 'hotel_luxury_400',
    titleEn: 'Investment Decision for Kitchen Equipment (CAPEX)',
    titleVi: 'Thẩm Định Đầu Tư Thiết Bị Bếp Trung Tâm (CAPEX)',
    summaryEn:
      'Evaluate a $180,000 high-efficiency combi-oven & blast-chiller CAPEX proposal ($12,000 annual maintenance, $34,000 energy savings, $26,000 labor savings, $18,000 incremental banquet revenue over 6 years at 10% WACC) using Payback, ROI, NPV, and IRR.',
    summaryVi:
      'Thẩm định dự án đầu tư lò hấp nướng đa năng & máy cấp đông nhanh trị giá $180,000 (chi phí bảo trì $12,000/năm, tiết kiệm năng lượng $34,000, tiết kiệm nhân công $26,000, tăng doanh thu tiệc $18,000/năm trong 6 năm, WACC 10%) qua Payback, ROI, NPV và IRR.',
    category: 'GM Business Advisory',
    difficultyLabel: 'Expert',
    difficultyLevel: 4,
    targetRole: 'Financial Controller',
    recommendedPositionIds: ['Financial Controller', 'Strategic Finance Business Partner'],
    competencyIds: ['FPM-03', 'SBP-02', 'SBP-03', 'FCA-02'],
    periodLabel: '2026 Mid-Year Capital Committee Review',
    estimatedDurationMinutes: 45,
    learningObjectivesEn: [
      'Compute exact Annual Net Cash Flow, Simple Payback, Total Lifetime ROI %, NPV @ 10%, and IRR %.',
      'Stress-test cash flow assumptions against maintenance escalation and conservative energy utilization.',
      'Prepare an Owner & GM Capital Authorization recommendation with post-investment audit gates.',
    ],
    learningObjectivesVi: [
      'Tính chính xác Dòng tiền ròng hàng năm, Thời gian hoàn vốn (Payback), ROI %, NPV tại 10% và IRR %.',
      'Kiểm định độ nhạy dòng tiền nếu chi phí bảo trì tăng hoặc hiệu suất tiết kiệm điện thấp hơn dự kiến.',
      'Lập tờ trình phê duyệt CAPEX trình GM & Chủ đầu tư kèm cơ chế hậu kiểm.',
    ],
    requiredKnowledgeEn: ['Capital Budgeting (Payback, NPV, IRR, ROI)', 'WACC & Hurdle Rate', 'Post-Investment Verification'],
    requiredKnowledgeVi: ['Thẩm định vốn đầu tư (Payback, NPV, IRR, ROI)', 'Chi phí vốn WACC', 'Hậu kiểm hiệu quả đầu tư'],
    expectedOutputsEn: ['CAPEX Model Verification', 'Sensitivity & Cash Impact Risk Matrix', 'Owner Capital Recommendation Memo'],
    expectedOutputsVi: ['Bảng tính thẩm định CAPEX chính xác', 'Ma trận rủi ro độ nhạy dòng tiền', 'Tờ trình phê duyệt đầu tư cho GM'],
    usaliReferenceLabel: 'Hospitality Capital Expenditure & FF&E Reserve Standards',
    scenarioKind: 'capex',
    defaultPersona: 'Corporate Finance Reviewer',
    languageOptions: ['vi', 'en'],
    datasetVersion: '2026.CAPEX.v1',
    status: 'Published',
    publishedBy: 'Academic Committee',
    publishedAt: '2026-01-15T00:00:00.000Z',
    importedAt: '2026-01-15T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'sim_scn_05',
    scenarioCode: 'SIM-DEP-05',
    hotelId: 'hotel_business_150',
    titleEn: 'Rooms & F&B Departmental Profitability Review',
    titleVi: 'Đánh Giá Lợi Nhuận Bộ Phận Buồng Phòng & F&B',
    summaryEn:
      'A 150-key business hotel relies heavily on corporate accounts at stagnating ADR while lobby restaurant covers decline during lunch service. Re-balance channel mix and F&B daypart contribution.',
    summaryVi:
      'Khách sạn thương gia 150 phòng phụ thuộc giá hợp đồng doanh nghiệp cố định trong khi lượng khách ăn trưa nhà hàng sụt giảm. Tái cân bằng cơ cấu kênh bán và lợi nhuận theo ca F&B.',
    category: 'Departmental Performance',
    difficultyLabel: 'Beginner',
    difficultyLevel: 1,
    targetRole: 'Senior Accountant',
    recommendedPositionIds: ['Accountant', 'Senior Accountant', 'Assistant Financial Controller'],
    competencyIds: ['FAR-01', 'BPA-02', 'BPA-01'],
    periodLabel: 'February 2026 (Departmental P&L)',
    estimatedDurationMinutes: 30,
    learningObjectivesEn: [
      'Compare Rooms Departmental Profit % (~74%) vs F&B Departmental Profit % (~19%).',
      'Spot unallocated laundry/breakfast package cross-subsidization distorting outlet performance.',
      'Recommend practical F&B daypart rationalization and corporate rate tiering.',
    ],
    learningObjectivesVi: [
      'So sánh biên lợi nhuận Bộ phận Buồng (~74%) với Bộ phận F&B (~19%).',
      'Phát hiện phân bổ gói ăn sáng chưa hợp lý làm méo mó lợi nhuận nhà hàng.',
      'Đề xuất điều chỉnh ca phục vụ và phân hạng giá khách doanh nghiệp.',
    ],
    requiredKnowledgeEn: ['USALI Schedule 1 & Schedule 2', 'Package Revenue Allocation', 'Departmental Profit Margin'],
    requiredKnowledgeVi: ['USALI Biểu 1 & Biểu 2', 'Phân bổ doanh thu gói ăn sáng', 'Biên lợi nhuận bộ phận'],
    expectedOutputsEn: ['Departmental Contribution Summary', 'F&B Daypart Rationalization Plan', 'GM Weekly Ops Review Notes'],
    expectedOutputsVi: ['Tóm tắt đóng góp lợi nhuận bộ phận', 'Phương án tối ưu ca F&B', 'Ghi chú họp giao ban cùng GM'],
    usaliReferenceLabel: 'USALI 12th Ed. Departmental Schedules & Package Breakdown',
    scenarioKind: 'standard',
    defaultPersona: 'Director of Operations',
    languageOptions: ['vi', 'en'],
    datasetVersion: '2026.02.v1',
    status: 'Published',
    publishedBy: 'Academic Committee',
    publishedAt: '2026-01-15T00:00:00.000Z',
    importedAt: '2026-01-15T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
  {
    id: 'sim_scn_06',
    scenarioCode: 'SIM-REC-06',
    hotelId: 'hotel_resort_320',
    titleEn: 'Presenting a 90-Day Financial Recovery Plan to the GM',
    titleVi: 'Trình Bày Kế Hoạch Phục Hồi Tài Chính 90 Ngày Với GM',
    summaryEn:
      'Following a slow coastal monsoon quarter, EBITDA slipped 18% behind covenant targets. Synthesize top-line wellness package upselling, energy/POM conservation, and zero-based A&G savings into a 90-day recovery charter.',
    summaryVi:
      'Sau quý thấp điểm gió mùa ven biển, EBITDA thấp hơn 18% so với cam kết chủ đầu tư. Tổng hợp giải pháp bán gói nghỉ dưỡng, tiết kiệm năng lượng POM và rà soát định mức A&G thành lộ trình phục hồi 90 ngày.',
    category: 'Executive Meeting & Strategic Finance',
    difficultyLabel: 'Expert',
    difficultyLevel: 4,
    targetRole: 'Strategic Finance Business Partner',
    recommendedPositionIds: ['Financial Controller', 'Strategic Finance Business Partner'],
    competencyIds: ['SBP-01', 'SBP-02', 'SBP-03', 'BPA-03', 'LPM-01'],
    periodLabel: 'Q3 2026 (90-Day Owner & GM Recovery Plan)',
    estimatedDurationMinutes: 45,
    learningObjectivesEn: [
      'Align Rooms, Spa, F&B, and Engineering around concrete weekly cash & GOP milestones.',
      'Quantify energy, payroll, and direct-booking uplift across Day 30 / Day 60 / Day 90 gates.',
      'Lead an executive boardroom defense handling challenging GM and Owner questions.',
    ],
    learningObjectivesVi: [
      'Liên kết Buồng phòng, Spa, F&B và Kỹ thuật vào các mốc phục hồi tiền mặt và GOP hàng tuần.',
      'Lượng hóa đóng góp từ tiết kiệm năng lượng, nhân sự và kênh trực tiếp theo mốc 30/60/90 ngày.',
      'Điều phối thuyết trình cấp điều hành trước chất vấn khắt khe của GM và Chủ đầu tư.',
    ],
    requiredKnowledgeEn: ['GOP & EBITDA Covenant Recovery', 'Zero-Based Undistributed Cost Review', 'Executive Storytelling'],
    requiredKnowledgeVi: ['Phục hồi GOP & cam kết EBITDA', 'Rà soát chi phí ZBB khối gián tiếp', 'Kỹ năng thuyết trình điều hành'],
    expectedOutputsEn: ['90-Day Financial Recovery Bridge', 'Executive Decision Charter', 'GM Roleplay Defense'],
    expectedOutputsVi: ['Cầu nối phục hồi tài chính 90 ngày', 'Bản đề xuất GM phê duyệt', 'Bảo vệ phương án trong họp điều hành'],
    usaliReferenceLabel: 'USALI 12th Ed. Executive Profitability & Undistributed Schedules',
    scenarioKind: 'standard',
    defaultPersona: 'General Manager',
    languageOptions: ['vi', 'en'],
    datasetVersion: '2026.Q3.v1',
    status: 'Published',
    publishedBy: 'Academic Committee',
    publishedAt: '2026-01-15T00:00:00.000Z',
    importedAt: '2026-01-15T00:00:00.000Z',
    importBatchId: 'builtin_simulator_core',
  },
];

function buildColumnsFromImportedVersion(
  finRows: SimulationFinancialRecordDoc[],
  opRow: SimulationOperationalRecordDoc | undefined,
  fallbackAvailRooms: number
): HotelStatementColumns | null {
  if (!finRows || finRows.length === 0) return null;
  const pickDept = (codePart: string) =>
    finRows.find(
      (r) =>
        String(r.departmentCode || '').toUpperCase().includes(codePart) ||
        String(r.departmentName || '').toUpperCase().includes(codePart)
    );
  const roomsRow = pickDept('ROOM');
  const fbRow = pickDept('FB') || pickDept('FOOD');
  const otherRow = pickDept('OTHER');
  const first = roomsRow || fbRow || otherRow || finRows[0];

  const availableRooms = Number(opRow?.roomsAvailable) || fallbackAvailRooms || 7500;
  const occupiedRooms = Number(opRow?.roomsSold) || Math.round(availableRooms * 0.72);
  const occupancyPct =
    Number(opRow?.occupancyPct) ||
    roundTo((occupiedRooms / Math.max(1, availableRooms)) * 100, 2);
  const roomsRevenue =
    Number(roomsRow?.departmentalRevenue) ||
    Number(opRow?.roomsRevenue) ||
    Number(first.roomsRevenue) ||
    0;
  const adr =
    Number(opRow?.adr) ||
    roundTo(roomsRevenue / Math.max(1, occupiedRooms), 2);
  const revpar =
    Number(opRow?.revpar) ||
    roundTo(roomsRevenue / Math.max(1, availableRooms), 2);

  const roomsExpenses = Number(roomsRow?.departmentalExpenses) || Math.round(roomsRevenue * 0.25);
  const roomsProfit =
    roomsRow?.departmentalProfit !== undefined
      ? Number(roomsRow.departmentalProfit)
      : roundTo(roomsRevenue - roomsExpenses, 2);

  const fbRevenue = Number(fbRow?.departmentalRevenue) || 0;
  const fbExpenses = Number(fbRow?.departmentalExpenses) || Math.round(fbRevenue * 0.72);
  const fbProfit =
    fbRow?.departmentalProfit !== undefined
      ? Number(fbRow.departmentalProfit)
      : roundTo(fbRevenue - fbExpenses, 2);

  const otherOperatingRevenue = Number(otherRow?.departmentalRevenue) || 0;
  const otherDeptDirectExpenses = Number(otherRow?.departmentalExpenses) || Math.round(otherOperatingRevenue * 0.5);
  const otherDeptProfit =
    otherRow?.departmentalProfit !== undefined
      ? Number(otherRow.departmentalProfit)
      : roundTo(otherOperatingRevenue - otherDeptDirectExpenses, 2);

  const sumRev = roundTo(roomsRevenue + fbRevenue + otherOperatingRevenue, 2);
  const totalOperatingRevenue =
    Number(first.totalOperatingRevenue) || sumRev;
  const sumExp = roundTo(roomsExpenses + fbExpenses + otherDeptDirectExpenses, 2);
  const totalDepartmentalExpenses =
    Number(first.totalDepartmentalExpenses) || sumExp;
  const totalDepartmentalProfit = roundTo(
    totalOperatingRevenue - totalDepartmentalExpenses,
    2
  );
  const totalUndistributedExpenses = Number(first.totalUndistributedExpenses) || 0;
  const gop =
    first.gop !== undefined
      ? Number(first.gop)
      : roundTo(totalDepartmentalProfit - totalUndistributedExpenses, 2);
  const gopMarginPct =
    first.gopMarginPct !== undefined
      ? Number(first.gopMarginPct)
      : totalOperatingRevenue > 0
      ? roundTo((gop / totalOperatingRevenue) * 100, 2)
      : 0;

  const foodRevenue = Math.round(fbRevenue * 0.72);
  const beverageRevenue = Math.max(0, fbRevenue - foodRevenue);
  const foodCost = Math.round(foodRevenue * 0.31);
  const beverageCost = Math.round(beverageRevenue * 0.22);
  const roomsPayroll = Math.round(roomsExpenses * 0.56);
  const fbPayroll = Math.round(fbExpenses * 0.42);
  const distributionCost = Math.round(roomsExpenses * 0.2);
  const roomsOtherExpenses = Math.max(0, roomsExpenses - roomsPayroll - distributionCost);
  const fbOtherOpEx = Math.max(0, fbExpenses - foodCost - beverageCost - fbPayroll);

  const adminAndGeneral = Math.round(totalUndistributedExpenses * 0.34);
  const salesAndMarketing = Math.round(totalUndistributedExpenses * 0.24);
  const propertyOperationsMaintenance = Math.round(totalUndistributedExpenses * 0.22);
  const utilities = Math.max(
    0,
    Math.round(totalUndistributedExpenses - adminAndGeneral - salesAndMarketing - propertyOperationsMaintenance)
  );
  const managementFees = Math.round(totalOperatingRevenue * 0.03 + Math.max(0, gop) * 0.06);
  const nonOperatingItems = Math.round(totalOperatingRevenue * 0.025);
  const ebitda = Math.round(gop - managementFees - nonOperatingItems);
  const totalLaborCost = Math.round(
    roomsPayroll +
      fbPayroll +
      adminAndGeneral * 0.48 +
      salesAndMarketing * 0.42 +
      propertyOperationsMaintenance * 0.44
  );
  const laborCostPct =
    totalOperatingRevenue > 0 ? roundTo((totalLaborCost / totalOperatingRevenue) * 100, 2) : 0;

  return {
    availableRooms,
    occupiedRooms,
    occupancyPct,
    adr,
    revpar,
    roomsRevenue,
    complimentaryRooms: Math.round(availableRooms * 0.008),
    houseUseRooms: Math.round(availableRooms * 0.004),
    cancelledRooms: Math.round(availableRooms * 0.028),
    otaSharePct: 32,
    directSharePct: 38,
    corporateSharePct: 30,
    distributionCost,
    roomsPayroll,
    roomsOtherExpenses,
    roomsExpenses,
    roomsProfit,
    restaurantRevenue: Math.round(fbRevenue * 0.48),
    barRevenue: Math.round(fbRevenue * 0.18),
    banquetRevenue: Math.max(0, Math.round(fbRevenue * 0.34)),
    fbRevenue,
    foodRevenue,
    beverageRevenue,
    foodCost,
    beverageCost,
    foodCostPct: foodRevenue > 0 ? roundTo((foodCost / foodRevenue) * 100, 2) : 0,
    beverageCostPct: beverageRevenue > 0 ? roundTo((beverageCost / beverageRevenue) * 100, 2) : 0,
    fbPayroll,
    fbOtherOpEx,
    fbExpenses,
    fbProfit,
    spaRevenue: Math.round(otherOperatingRevenue * 0.55),
    recreationRevenue: Math.round(otherOperatingRevenue * 0.2),
    otherDeptRevenue: Math.max(0, Math.round(otherOperatingRevenue * 0.25)),
    otherOperatingRevenue,
    otherDeptDirectExpenses,
    otherDeptProfit,
    adminAndGeneral,
    salesAndMarketing,
    propertyOperationsMaintenance,
    utilities,
    totalUndistributedExpenses,
    totalOperatingRevenue,
    totalDepartmentalExpenses,
    totalDepartmentalProfit,
    gop,
    gopMarginPct,
    managementFees,
    nonOperatingItems,
    ebitda,
    totalLaborCost,
    laborCostPct,
  };
}

export function generateDatasetSnapshotForScenario(
  scenario: SimulationScenarioDoc,
  profile?: HotelSimulationProfileDoc,
  customDatasetOverride?: Partial<HotelSimulationDatasetSnapshot>,
  importedFinancialRows?: SimulationFinancialRecordDoc[],
  importedOperationalRows?: SimulationOperationalRecordDoc[]
): HotelSimulationDatasetSnapshot {
  const hotel =
    profile ||
    DEFAULT_HOTEL_PROFILES.find((h) => h.id === scenario.hotelId) ||
    DEFAULT_HOTEL_PROFILES[0];

  const baseAvail = hotel.roomsAvailable || hotel.totalKeys * 30;

  if (importedFinancialRows && importedFinancialRows.length > 0) {
    const byVer = (v: string) =>
      importedFinancialRows.filter((r) =>
        String(r.version || r.periodLabel || 'Actual').toLowerCase().includes(v)
      );
    const opByVer = (v: string) =>
      (importedOperationalRows || []).find((r) =>
        String(r.version || r.periodLabel || 'Actual').toLowerCase().includes(v)
      );
    const actualCols = buildColumnsFromImportedVersion(
      byVer('actual').length > 0 ? byVer('actual') : importedFinancialRows,
      opByVer('actual') || importedOperationalRows?.[0],
      baseAvail
    );
    const budgetCols = buildColumnsFromImportedVersion(
      byVer('budget').length > 0 ? byVer('budget') : byVer('actual').length > 0 ? byVer('actual') : importedFinancialRows,
      opByVer('budget') || opByVer('actual') || importedOperationalRows?.[0],
      baseAvail
    );
    if (actualCols && budgetCols) {
      const forecastCols =
        buildColumnsFromImportedVersion(byVer('forecast'), opByVer('forecast'), baseAvail) || {
          ...actualCols,
          gop: Math.round((actualCols.gop + budgetCols.gop) / 2),
          gopMarginPct: roundTo((actualCols.gopMarginPct + budgetCols.gopMarginPct) / 2, 2),
        };
      const lastYearCols =
        buildColumnsFromImportedVersion(byVer('last'), opByVer('last'), baseAvail) || {
          ...budgetCols,
          totalOperatingRevenue: Math.round(budgetCols.totalOperatingRevenue * 0.94),
          gop: Math.round(budgetCols.gop * 0.92),
          gopMarginPct: roundTo(budgetCols.gopMarginPct - 0.8, 2),
        };
      return {
        datasetId: `ds_${scenario.id}_${scenario.datasetVersion || 'v1'}`,
        scenarioId: scenario.id,
        hotelSimulationId: hotel.id,
        hotelName: hotel.hotelName,
        hotelType: hotel.brandTier,
        numberOfRooms: hotel.totalKeys,
        numberOfOutlets: hotel.totalKeys >= 350 ? 6 : hotel.totalKeys >= 220 ? 4 : 2,
        marketSegment: hotel.brandTier,
        currency: hotel.currency || 'USD',
        reportingPeriod: scenario.periodLabel,
        reportingBasis: 'USALI 12th Edition Accrual Basis',
        usaliLicenseReference: scenario.usaliReferenceLabel || 'USALI 12th Edition Compliance',
        budgetAssumptions: 'Hydrated directly from imported Scenario Financial_Dataset & Operational_Dataset.',
        operationalAssumptions: 'All Rooms Sold exclude Complimentary & House Use per USALI Schedule 1.',
        datasetVersion: scenario.datasetVersion || '2026.v1',
        generatedAt: new Date().toISOString(),
        periods: {
          actual: actualCols,
          budget: budgetCols,
          forecast: forecastCols,
          lastYear: lastYearCols,
        },
        monthlySeries: [
          {
            monthLabel: 'M-2',
            actualRev: Math.round(lastYearCols.totalOperatingRevenue * 0.96),
            budgetRev: Math.round(budgetCols.totalOperatingRevenue * 0.95),
            actualGop: Math.round(lastYearCols.gop * 0.94),
            budgetGop: Math.round(budgetCols.gop * 0.95),
            gopMarginPct: roundTo(lastYearCols.gopMarginPct - 0.6, 1),
          },
          {
            monthLabel: 'M-1',
            actualRev: Math.round(forecastCols.totalOperatingRevenue * 0.98),
            budgetRev: Math.round(budgetCols.totalOperatingRevenue * 0.99),
            actualGop: Math.round(forecastCols.gop * 0.95),
            budgetGop: Math.round(budgetCols.gop * 0.99),
            gopMarginPct: roundTo(forecastCols.gopMarginPct - 0.8, 1),
          },
          {
            monthLabel: 'Current',
            actualRev: actualCols.totalOperatingRevenue,
            budgetRev: budgetCols.totalOperatingRevenue,
            actualGop: actualCols.gop,
            budgetGop: budgetCols.gop,
            gopMarginPct: actualCols.gopMarginPct,
          },
        ],
        ...customDatasetOverride,
      };
    }
  }

  let actualInput: StatementSeedInput;
  let budgetInput: StatementSeedInput;
  let forecastInput: StatementSeedInput;
  let lastYearInput: StatementSeedInput;
  let capexAssumptions: CapexAssumptions | undefined;
  let rollingForecastInputs: RollingForecastMonthInput[] | undefined;

  if (scenario.id === 'sim_scn_01' || scenario.scenarioCode === 'SIM-GOP-01') {
    // Scenario 1: Revenue Growth (+7.5% vs Budget) but GOP Decline (-9.6% vs Budget)
    budgetInput = {
      availableRooms: baseAvail, // 7,500 rooms
      occupancyPct: 72, // 5,400 rooms sold
      adr: 145,
      complimentaryRooms: 60,
      houseUseRooms: 35,
      cancelledRooms: 210,
      otaSharePct: 28,
      directSharePct: 38,
      corporateSharePct: 34,
      distributionCommissionPct: 16,
      roomsPayroll: 92000,
      roomsOtherExpenses: 56000,
      restaurantRevenue: 118000,
      barRevenue: 44000,
      banquetRevenue: 98000,
      foodRevenueRatio: 0.72,
      foodCostPctTarget: 30.0,
      beverageCostPctTarget: 22.0,
      fbPayroll: 78000,
      fbOtherOpEx: 28000,
      spaRevenue: 34000,
      recreationRevenue: 14000,
      otherDeptRevenue: 20000,
      otherDeptDirectExpenses: 32000,
      adminAndGeneral: 74000,
      salesAndMarketing: 56000,
      propertyOperationsMaintenance: 44000,
      utilities: 41000,
      nonOperatingItems: 22000,
    };
    actualInput = {
      availableRooms: baseAvail, // 7,500
      occupancyPct: 81.6, // 6,120 sold (+9.6 pts)
      adr: 138, // -4.8% ADR dilution from OTA promo
      complimentaryRooms: 115,
      houseUseRooms: 48,
      cancelledRooms: 365,
      otaSharePct: 48, // OTA mix jumped from 28% -> 48%
      directSharePct: 24,
      corporateSharePct: 28,
      distributionCommissionPct: 19.5,
      roomsPayroll: 118500, // Casual housekeeping & reception overtime
      roomsOtherExpenses: 71000,
      restaurantRevenue: 136000,
      barRevenue: 48000,
      banquetRevenue: 112000,
      foodRevenueRatio: 0.74,
      foodCostPctTarget: 36.2, // Up 6.2 pts from waste & promo buffet
      beverageCostPctTarget: 25.0,
      fbPayroll: 109000,
      fbOtherOpEx: 39000,
      spaRevenue: 32000,
      recreationRevenue: 12000,
      otherDeptRevenue: 18000,
      otherDeptDirectExpenses: 36000,
      adminAndGeneral: 82000,
      salesAndMarketing: 68000,
      propertyOperationsMaintenance: 49500,
      utilities: 51500,
      nonOperatingItems: 22000,
    };
    forecastInput = {
      ...actualInput,
      occupancyPct: 78,
      adr: 143,
      otaSharePct: 36,
      distributionCommissionPct: 17.5,
      foodCostPctTarget: 31.8,
      fbPayroll: 89000,
      roomsPayroll: 102000,
    };
    lastYearInput = {
      ...budgetInput,
      occupancyPct: 68,
      adr: 139,
      roomsPayroll: 86000,
      fbPayroll: 73000,
      utilities: 38000,
    };
  } else if (scenario.id === 'sim_scn_02' || scenario.scenarioCode === 'SIM-RFC-02') {
    budgetInput = {
      availableRooms: baseAvail,
      occupancyPct: 74,
      adr: 148,
      complimentaryRooms: 55,
      houseUseRooms: 30,
      cancelledRooms: 190,
      otaSharePct: 30,
      directSharePct: 36,
      corporateSharePct: 34,
      distributionCommissionPct: 16.5,
      roomsPayroll: 94000,
      roomsOtherExpenses: 57000,
      restaurantRevenue: 124000,
      barRevenue: 46000,
      banquetRevenue: 108000,
      foodRevenueRatio: 0.72,
      foodCostPctTarget: 30.5,
      beverageCostPctTarget: 22.5,
      fbPayroll: 81000,
      fbOtherOpEx: 29000,
      spaRevenue: 35000,
      recreationRevenue: 15000,
      otherDeptRevenue: 19000,
      otherDeptDirectExpenses: 33000,
      adminAndGeneral: 75000,
      salesAndMarketing: 58000,
      propertyOperationsMaintenance: 44000,
      utilities: 42000,
      nonOperatingItems: 22000,
    };
    actualInput = {
      ...budgetInput,
      occupancyPct: 69.5,
      adr: 144,
      otaSharePct: 35,
      distributionCommissionPct: 17.5,
      banquetRevenue: 88000,
      foodCostPctTarget: 32.0,
      utilities: 45500,
    };
    forecastInput = {
      ...budgetInput,
      occupancyPct: 72.5,
      adr: 146,
    };
    lastYearInput = {
      ...budgetInput,
      occupancyPct: 67,
      adr: 140,
    };
    rollingForecastInputs = [
      {
        monthLabel: 'April 2026',
        availableRooms: 7500,
        budgetOccupancyPct: 74,
        budgetAdr: 148,
        bookingPacePct: 58,
        cancellationRatePct: 8.5,
        groupRoomsBooked: 1120,
        suggestedBaseOccPct: 72,
        suggestedBaseAdr: 146,
        suggestedUpsideOccPct: 78,
        suggestedUpsideAdr: 152,
        suggestedDownsideOccPct: 64,
        suggestedDownsideAdr: 138,
        fbCapturePerOccupiedRoom: 46,
        variableCostRatio: 0.34,
        fixedOperatingExpenses: 448000,
      },
      {
        monthLabel: 'May 2026',
        availableRooms: 7750,
        budgetOccupancyPct: 71,
        budgetAdr: 144,
        bookingPacePct: 49,
        cancellationRatePct: 9.2,
        groupRoomsBooked: 840,
        suggestedBaseOccPct: 69,
        suggestedBaseAdr: 142,
        suggestedUpsideOccPct: 76,
        suggestedUpsideAdr: 149,
        suggestedDownsideOccPct: 60,
        suggestedDownsideAdr: 134,
        fbCapturePerOccupiedRoom: 44,
        variableCostRatio: 0.35,
        fixedOperatingExpenses: 452000,
      },
      {
        monthLabel: 'June 2026',
        availableRooms: 7500,
        budgetOccupancyPct: 77,
        budgetAdr: 152,
        bookingPacePct: 44,
        cancellationRatePct: 7.8,
        groupRoomsBooked: 1350,
        suggestedBaseOccPct: 75,
        suggestedBaseAdr: 150,
        suggestedUpsideOccPct: 83,
        suggestedUpsideAdr: 158,
        suggestedDownsideOccPct: 65,
        suggestedDownsideAdr: 140,
        fbCapturePerOccupiedRoom: 48,
        variableCostRatio: 0.33,
        fixedOperatingExpenses: 455000,
      },
    ];
  } else if (scenario.id === 'sim_scn_03' || scenario.scenarioCode === 'SIM-LAB-03') {
    // 400-room Luxury Hotel: Labor Productivity & Food Cost Recovery
    budgetInput = {
      availableRooms: baseAvail, // 12,000
      occupancyPct: 76,
      adr: 245,
      complimentaryRooms: 120,
      houseUseRooms: 65,
      cancelledRooms: 290,
      otaSharePct: 22,
      directSharePct: 44,
      corporateSharePct: 34,
      distributionCommissionPct: 15,
      roomsPayroll: 215000,
      roomsOtherExpenses: 132000,
      restaurantRevenue: 380000,
      barRevenue: 145000,
      banquetRevenue: 410000,
      foodRevenueRatio: 0.71,
      foodCostPctTarget: 29.0,
      beverageCostPctTarget: 20.5,
      fbPayroll: 268000,
      fbOtherOpEx: 88000,
      spaRevenue: 112000,
      recreationRevenue: 34000,
      otherDeptRevenue: 48000,
      otherDeptDirectExpenses: 92000,
      adminAndGeneral: 185000,
      salesAndMarketing: 142000,
      propertyOperationsMaintenance: 124000,
      utilities: 115000,
      nonOperatingItems: 65000,
    };
    actualInput = {
      ...budgetInput,
      occupancyPct: 77.5,
      adr: 241,
      roomsPayroll: 238000,
      foodCostPctTarget: 35.4,
      beverageCostPctTarget: 23.8,
      fbPayroll: 343000, // +28% kitchen & banquet overtime
      fbOtherOpEx: 109000,
      utilities: 129000,
    };
    forecastInput = {
      ...actualInput,
      foodCostPctTarget: 30.2,
      fbPayroll: 279000,
      roomsPayroll: 219000,
    };
    lastYearInput = {
      ...budgetInput,
      occupancyPct: 73,
      adr: 232,
      foodCostPctTarget: 29.5,
    };
  } else if (scenario.id === 'sim_scn_04' || scenario.scenarioCode === 'SIM-CPX-04') {
    // CAPEX Investment Decision for Kitchen Equipment
    budgetInput = {
      availableRooms: baseAvail,
      occupancyPct: 78,
      adr: 250,
      complimentaryRooms: 100,
      houseUseRooms: 60,
      cancelledRooms: 260,
      otaSharePct: 24,
      directSharePct: 43,
      corporateSharePct: 33,
      distributionCommissionPct: 15,
      roomsPayroll: 218000,
      roomsOtherExpenses: 130000,
      restaurantRevenue: 390000,
      barRevenue: 150000,
      banquetRevenue: 430000,
      foodRevenueRatio: 0.72,
      foodCostPctTarget: 29.5,
      beverageCostPctTarget: 20.5,
      fbPayroll: 272000,
      fbOtherOpEx: 90000,
      spaRevenue: 118000,
      recreationRevenue: 36000,
      otherDeptRevenue: 50000,
      otherDeptDirectExpenses: 94000,
      adminAndGeneral: 186000,
      salesAndMarketing: 145000,
      propertyOperationsMaintenance: 128000,
      utilities: 122000,
      nonOperatingItems: 65000,
    };
    actualInput = {
      ...budgetInput,
      occupancyPct: 79,
      adr: 248,
      fbPayroll: 298000,
      utilities: 146000,
      banquetRevenue: 398000,
    };
    forecastInput = {
      ...budgetInput,
      occupancyPct: 80,
      adr: 252,
      fbPayroll: 274000,
      utilities: 112000,
      banquetRevenue: 448000,
    };
    lastYearInput = {
      ...budgetInput,
      occupancyPct: 74,
      adr: 238,
    };
    capexAssumptions = {
      equipmentNameEn: 'High-Efficiency Combi-Oven & Blast Chiller Central Kitchen Suite',
      equipmentNameVi: 'Hệ thống Lò Hấp Nướng Đa Năng & Máy Cấp Đông Nhanh Bếp Trung Tâm',
      initialInvestment: 180000,
      usefulLifeYears: 6,
      annualMaintenanceCost: 12000,
      annualEnergySavings: 34000,
      annualLaborSavings: 26000,
      annualIncrementalRevenue: 18000,
      discountRatePct: 10,
      financingNoteEn: 'Funded 100% from FF&E Reserve; Hotel WACC Hurdle Rate = 10.0%. Annual Net Cash Flow = ($34k + $26k + $18k) − $12k = $66,000.',
      financingNoteVi: 'Sử dụng quỹ FF&E Reserve; Chi phí vốn bình quân WACC = 10.0%. Dòng tiền ròng hàng năm = ($34k + $26k + $18k) − $12k = $66,000.',
    };
  } else if (scenario.id === 'sim_scn_05' || scenario.scenarioCode === 'SIM-DEP-05') {
    // 150-room Business Hotel: Rooms & F&B Departmental Profitability
    budgetInput = {
      availableRooms: baseAvail, // 4,500
      occupancyPct: 78,
      adr: 102,
      complimentaryRooms: 25,
      houseUseRooms: 18,
      cancelledRooms: 95,
      otaSharePct: 26,
      directSharePct: 30,
      corporateSharePct: 44,
      distributionCommissionPct: 16,
      roomsPayroll: 52000,
      roomsOtherExpenses: 31000,
      restaurantRevenue: 68000,
      barRevenue: 22000,
      banquetRevenue: 32000,
      foodRevenueRatio: 0.76,
      foodCostPctTarget: 31.0,
      beverageCostPctTarget: 23.0,
      fbPayroll: 42000,
      fbOtherOpEx: 15000,
      spaRevenue: 8000,
      recreationRevenue: 4000,
      otherDeptRevenue: 11000,
      otherDeptDirectExpenses: 10500,
      adminAndGeneral: 46000,
      salesAndMarketing: 32000,
      propertyOperationsMaintenance: 25000,
      utilities: 24000,
      nonOperatingItems: 12000,
    };
    actualInput = {
      ...budgetInput,
      occupancyPct: 75,
      adr: 96, // Corporate renegotiation discount
      restaurantRevenue: 52000, // Lunch covers dropped
      foodCostPctTarget: 34.5,
      fbPayroll: 45500,
    };
    forecastInput = {
      ...budgetInput,
      occupancyPct: 77,
      adr: 100,
      restaurantRevenue: 64000,
    };
    lastYearInput = {
      ...budgetInput,
      occupancyPct: 74,
      adr: 98,
    };
  } else {
    // Scenario 6 (320-key Resort): Presenting a 90-Day Financial Recovery Plan to the GM
    budgetInput = {
      availableRooms: baseAvail, // 9,600
      occupancyPct: 72,
      adr: 225,
      complimentaryRooms: 90,
      houseUseRooms: 45,
      cancelledRooms: 240,
      otaSharePct: 30,
      directSharePct: 45,
      corporateSharePct: 25,
      distributionCommissionPct: 17,
      roomsPayroll: 162000,
      roomsOtherExpenses: 96000,
      restaurantRevenue: 240000,
      barRevenue: 110000,
      banquetRevenue: 135000,
      foodRevenueRatio: 0.68,
      foodCostPctTarget: 29.5,
      beverageCostPctTarget: 21.0,
      fbPayroll: 165000,
      fbOtherOpEx: 58000,
      spaRevenue: 132000,
      recreationRevenue: 48000,
      otherDeptRevenue: 42000,
      otherDeptDirectExpenses: 98000,
      adminAndGeneral: 142000,
      salesAndMarketing: 118000,
      propertyOperationsMaintenance: 96000,
      utilities: 92000,
      nonOperatingItems: 48000,
    };
    actualInput = {
      ...budgetInput,
      occupancyPct: 60.5, // Slow monsoon quarter
      adr: 204,
      otaSharePct: 44,
      distributionCommissionPct: 19,
      spaRevenue: 98000,
      foodCostPctTarget: 33.2,
      adminAndGeneral: 154000,
      salesAndMarketing: 132000,
      utilities: 109000,
    };
    forecastInput = {
      ...budgetInput,
      occupancyPct: 69,
      adr: 218,
      otaSharePct: 33,
      spaRevenue: 126000,
      utilities: 89000,
      adminAndGeneral: 135000,
    };
    lastYearInput = {
      ...budgetInput,
      occupancyPct: 66,
      adr: 210,
    };
  }

  const periods = {
    actual: buildConsistentStatementColumns(actualInput),
    budget: buildConsistentStatementColumns(budgetInput),
    forecast: buildConsistentStatementColumns(forecastInput),
    lastYear: buildConsistentStatementColumns(lastYearInput),
  };

  const monthlySeries = [
    {
      monthLabel: 'M-2',
      actualRev: Math.round(periods.lastYear.totalOperatingRevenue * 0.96),
      budgetRev: Math.round(periods.budget.totalOperatingRevenue * 0.95),
      actualGop: Math.round(periods.lastYear.gop * 0.94),
      budgetGop: Math.round(periods.budget.gop * 0.95),
      gopMarginPct: roundTo(periods.lastYear.gopMarginPct - 0.6, 1),
    },
    {
      monthLabel: 'M-1',
      actualRev: Math.round(periods.forecast.totalOperatingRevenue * 0.98),
      budgetRev: Math.round(periods.budget.totalOperatingRevenue * 0.99),
      actualGop: Math.round(periods.forecast.gop * 0.95),
      budgetGop: Math.round(periods.budget.gop * 0.99),
      gopMarginPct: roundTo(periods.forecast.gopMarginPct - 0.8, 1),
    },
    {
      monthLabel: 'Current',
      actualRev: periods.actual.totalOperatingRevenue,
      budgetRev: periods.budget.totalOperatingRevenue,
      actualGop: periods.actual.gop,
      budgetGop: periods.budget.gop,
      gopMarginPct: periods.actual.gopMarginPct,
    },
  ];

  return {
    datasetId: `ds_${scenario.id}_${scenario.datasetVersion || 'v1'}`,
    scenarioId: scenario.id,
    hotelSimulationId: hotel.id,
    hotelName: hotel.hotelName,
    hotelType: hotel.brandTier,
    numberOfRooms: hotel.totalKeys,
    numberOfOutlets: hotel.totalKeys >= 350 ? 6 : hotel.totalKeys >= 220 ? 4 : 2,
    marketSegment:
      hotel.id === 'hotel_business_150'
        ? 'Corporate & Transient Business'
        : hotel.id === 'hotel_resort_320'
        ? 'Leisure Wellness & Destination Weddings'
        : 'Upper Upscale / Luxury MICE & Corporate',
    currency: hotel.currency || 'USD',
    reportingPeriod: scenario.periodLabel,
    reportingBasis: 'USALI 12th Edition Accrual Basis',
    usaliLicenseReference: scenario.usaliReferenceLabel || 'USALI 12th Edition Compliance',
    budgetAssumptions:
      hotel.id === 'hotel_upscale_250'
        ? 'Budget assumes 28% OTA mix @ 16% commission, Food Cost 30.0%, and core roster 142 FTEs.'
        : 'Budget assumes standard corporate/MICE mix, 29–31% Food Cost, and zero unapproved overtime.',
    operationalAssumptions:
      'All Rooms Sold exclude Complimentary & House Use rooms per USALI Schedule 1. Food & Beverage Costs are separated strictly against Food vs Beverage Revenues.',
    datasetVersion: scenario.datasetVersion || '2026.v1',
    generatedAt: new Date().toISOString(),
    periods,
    monthlySeries,
    capexAssumptions,
    rollingForecastInputs,
    ...customDatasetOverride,
  };
}

export interface BuiltinScenarioChildSeed {
  challenges: SimulationBusinessChallengeDoc[];
  tasks: SimulationTaskDoc[];
  decisionOptions: SimulationDecisionOptionDoc[];
  roleplayPrompts: SimulationRoleplayPromptDoc[];
  rubrics: SimulationEvaluationRubricDoc[];
  competencyMappings: SimulationCompetencyMappingDoc[];
  referenceAnalysis: SimulationReferenceAnalysisDoc[];
  financialData: SimulationFinancialRecordDoc[];
  operationalData: SimulationOperationalRecordDoc[];
}

export function buildChildSeedsForScenario(scenario: SimulationScenarioDoc): BuiltinScenarioChildSeed {
  const sid = scenario.id;
  const ds = generateDatasetSnapshotForScenario(scenario);
  const act = ds.periods.actual;
  const bud = ds.periods.budget;
  const baseStamp = '2026-01-15T00:00:00.000Z';

  const makeRubrics = (): SimulationEvaluationRubricDoc[] =>
    STANDARD_EVALUATION_RUBRIC_BLUEPRINT.map((r, idx) => ({
      id: `rub_${sid}_${idx + 1}`,
      scenarioId: sid,
      criterionCode: r.criterionCode,
      criterionNameEn: r.criterionNameEn,
      criterionNameVi: r.criterionNameVi,
      weightPercent: r.weightPercent,
      maxScore: r.maxScore,
      passingScore: r.passingScore,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    }));

  const makeCompMappings = (): SimulationCompetencyMappingDoc[] =>
    (scenario.competencyIds || ['BPA-01', 'SBP-01']).map((code, idx) => ({
      id: `cmp_${sid}_${idx + 1}`,
      scenarioId: sid,
      competencyId: code,
      targetProficiencyLevel: scenario.difficultyLevel,
      weightPercent: Math.round(100 / Math.max(1, (scenario.competencyIds || []).length)),
      isPrimary: idx === 0,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    }));

  const financialData: SimulationFinancialRecordDoc[] = [
    {
      id: `fin_${sid}_rooms`,
      scenarioId: sid,
      periodLabel: 'Actual vs Budget',
      departmentCode: 'DEPT-01',
      departmentName: 'Rooms Division',
      departmentalRevenue: act.roomsRevenue,
      departmentalExpenses: act.roomsExpenses,
      departmentalProfit: act.roomsProfit,
      totalOperatingRevenue: act.totalOperatingRevenue,
      totalDepartmentalExpenses: act.totalDepartmentalExpenses,
      totalUndistributedExpenses: act.totalUndistributedExpenses,
      gop: act.gop,
      gopMarginPct: act.gopMarginPct,
      roomsRevenue: act.roomsRevenue,
      budgetGop: bud.gop,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
    {
      id: `fin_${sid}_fb`,
      scenarioId: sid,
      periodLabel: 'Actual vs Budget',
      departmentCode: 'DEPT-02',
      departmentName: 'Food & Beverage',
      departmentalRevenue: act.fbRevenue,
      departmentalExpenses: act.fbExpenses,
      departmentalProfit: act.fbProfit,
      totalOperatingRevenue: act.totalOperatingRevenue,
      totalDepartmentalExpenses: act.totalDepartmentalExpenses,
      totalUndistributedExpenses: act.totalUndistributedExpenses,
      gop: act.gop,
      gopMarginPct: act.gopMarginPct,
      roomsRevenue: act.roomsRevenue,
      budgetGop: bud.gop,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
  ];

  const operationalData: SimulationOperationalRecordDoc[] = [
    {
      id: `ops_${sid}_actual`,
      scenarioId: sid,
      periodLabel: 'Actual',
      roomsAvailable: act.availableRooms,
      roomsSold: act.occupiedRooms,
      roomsRevenue: act.roomsRevenue,
      occupancyPct: act.occupancyPct,
      adr: act.adr,
      revpar: act.revpar,
      fbCovers: Math.round(act.fbRevenue / 34),
      laborHours: Math.round(act.totalLaborCost / 8.5),
      overtimeHours: Math.round(act.totalLaborCost / 110),
      gssScore: 86.4,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
  ];

  const challenges: SimulationBusinessChallengeDoc[] = [
    {
      id: `chg_${sid}_1`,
      scenarioId: sid,
      challengeCode: 'CH-01',
      titleEn:
        sid === 'sim_scn_04'
          ? 'Capital Allocation & Payback Threshold Debate'
          : sid === 'sim_scn_02'
          ? 'Booking Pace Lag & Group Cancellation Risk'
          : 'Margin Compression Beneath Surface Growth',
      titleVi:
        sid === 'sim_scn_04'
          ? 'Tranh Luận Hiệu Quả Vốn CAPEX & Ngưỡng Hoàn Vốn'
          : sid === 'sim_scn_02'
          ? 'Chênh Lệch Booking Pace & Rủi Ro Hủy Đoàn MICE'
          : 'Biên Lợi Nhuận Thu Hẹp Dưới Lớp Vỏ Tăng Doanh Thu',
      descriptionEn:
        sid === 'sim_scn_04'
          ? 'Owner representative questions whether $180k FF&E kitchen equipment delivers true cash savings after maintenance and 10% hurdle rate.'
          : sid === 'sim_scn_02'
          ? 'Q2 booking pace trails last year by 5 pts in May; DOSM wants aggressive OTA discounting while Chef insists on full core staffing.'
          : `Actual GOP ($${act.gop.toLocaleString()}) trails Budget ($${bud.gop.toLocaleString()}) by $${Math.abs(act.gop - bud.gop).toLocaleString()} despite headline volume.`,
      descriptionVi:
        sid === 'sim_scn_04'
          ? 'Đại diện Chủ đầu tư chất vấn liệu khoản đầu tư $180k có thực sự tạo dòng tiền tiết kiệm sau bảo trì và rào cản WACC 10%.'
          : sid === 'sim_scn_02'
          ? 'Tốc độ đặt phòng tháng 5 chậm hơn năm ngoái 5%; DOSM muốn giảm giá sâu trên OTA trong khi Bếp giữ nguyên định biên.'
          : `GOP Thực tế ($${act.gop.toLocaleString()}) thấp hơn Ngân sách ($${bud.gop.toLocaleString()}) tới $${Math.abs(act.gop - bud.gop).toLocaleString()} bất chấp sản lượng bán cao.`,
      severity: 'Critical',
      impactArea: 'GOP & Cash Conversion',
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
    {
      id: `chg_${sid}_2`,
      scenarioId: sid,
      challengeCode: 'CH-02',
      titleEn: 'Cross-Department Control & Overtime Creep',
      titleVi: 'Kiểm Soát Nội Bộ Liên Phòng Ban & Tăng Ca Vượt Định Mức',
      descriptionEn:
        'Unapproved spot purchasing and reactive overtime scheduling diluted flow-through across Rooms and Kitchen.',
      descriptionVi:
        'Mua hàng đột xuất ngoài hợp đồng và sắp ca tăng ca bị động đã bào mòn flow-through tại Buồng phòng và Bếp.',
      severity: 'High',
      impactArea: 'Departmental Payroll & Cost of Sales',
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
  ];

  const tasks: SimulationTaskDoc[] = [
    {
      id: `tsk_${sid}_1`,
      scenarioId: sid,
      taskOrder: 1,
      titleEn: 'Verify Key USALI KPIs & Margin Variance',
      titleVi: 'Kiểm Tra Chỉ Số USALI Cốt Lõi & Chênh Lệch Biên Lợi Nhuận',
      instructionsEn:
        scenario.scenarioKind === 'capex'
          ? 'Calculate Annual Net Cash Flow, Simple Payback Years, Lifetime ROI %, NPV @ 10%, and IRR % in the Data Room & Analysis Workspace.'
          : scenario.scenarioKind === 'rolling_forecast'
          ? 'Input Base, Upside, and Downside Occupancy % and ADR across April–June and review consolidated Q2 GOP flexing.'
          : 'Enter your calculated Actual Occupancy %, ADR, GOP Margin %, and Food Cost % and classify favorable vs unfavorable drivers.',
      instructionsVi:
        scenario.scenarioKind === 'capex'
          ? 'Tính toán Dòng tiền ròng hàng năm, Thời gian hoàn vốn (năm), ROI %, NPV @ 10% và IRR % trong Không gian Phân tích.'
          : scenario.scenarioKind === 'rolling_forecast'
          ? 'Nhập Occupancy % và ADR cho kịch bản Cơ sở, Tích cực, Thận trọng giai đoạn Tháng 4–6 để kiểm tra co giãn GOP Quý 2.'
          : 'Nhập Occupancy %, ADR, GOP Margin % và Food Cost % Thực tế bạn tính được và phân loại yếu tố Tích cực/Bất lợi.',
      deliverableType: 'Quantitative Audit',
      maxPoints: 25,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
    {
      id: `tsk_${sid}_2`,
      scenarioId: sid,
      taskOrder: 2,
      titleEn: 'Separate Symptoms from Root Causes & Recommend Decisions',
      titleVi: 'Tách Bạch Triệu Chứng - Nguyên Nhân Gốc & Chọn Quyết Định',
      instructionsEn:
        'Identify responsible departments, quantify financial upside, choose optimal management actions, and define internal control checkpoints.',
      instructionsVi:
        'Xác định phòng ban chịu trách nhiệm, lượng hóa tác động tài chính, chọn phương án hành động tối ưu và chốt kiểm soát nội bộ.',
      deliverableType: 'Decision Matrix',
      maxPoints: 45,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
    {
      id: `tsk_${sid}_3`,
      scenarioId: sid,
      taskOrder: 3,
      titleEn: 'Brief & Defend Before the General Manager',
      titleVi: 'Trình Bày & Bảo Vệ Phương Án Trước Tổng Giám Đốc',
      instructionsEn:
        'Submit an executive memo (VI/EN) and defend your numbers during the interactive GM Executive Meeting.',
      instructionsVi:
        'Hoàn thiện báo cáo điều hành (VI/EN) và đối thoại trực tiếp bảo vệ số liệu trong Cuộc họp với GM.',
      deliverableType: 'Executive Advisory',
      maxPoints: 30,
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
  ];

  const decisionOptions: SimulationDecisionOptionDoc[] =
    sid === 'sim_scn_04'
      ? [
          {
            id: `opt_${sid}_1`,
            scenarioId: sid,
            optionCode: 'OPT-A',
            titleEn: 'Approve $180k CAPEX with Energy/Labor SLA Tracking & Phased Chef Training',
            titleVi: 'Phê duyệt CAPEX $180k kèm Cam kết KPI Tiết kiệm Điện/Nhân công & Đào tạo Bếp',
            financialImpactEstimate: 66000,
            gopImpactPct: 3.1,
            riskLevel: 'Low',
            isOptimal: true,
            rationaleEn:
              'Positive NPV (+$107,448 @ 10%), 28.4% IRR, 2.73-year payback far exceed 10% hurdle rate while embedding post-audit controls.',
            rationaleVi:
              'NPV dương (+$107,448 @ 10%), IRR 28.4%, hoàn vốn 2.73 năm vượt xa rào cản 10% và đảm bảo hậu kiểm KPI.',
            importedAt: baseStamp,
            importBatchId: 'builtin_simulator_core',
          },
          {
            id: `opt_${sid}_2`,
            scenarioId: sid,
            optionCode: 'OPT-B',
            titleEn: 'Defer CAPEX Indefinitely and Rent Older Backup Ovens During Peak Banquets',
            titleVi: 'Hoãn vô thời hạn CAPEX và thuê lò cũ dự phòng vào mùa tiệc cao điểm',
            financialImpactEstimate: -24000,
            gopImpactPct: -1.1,
            riskLevel: 'Medium',
            isOptimal: false,
            rationaleEn: 'Forgoes $66,000/yr recurring net cash flow and perpetuates overtime and utility waste.',
            rationaleVi: 'Bỏ lỡ dòng tiền ròng $66,000/năm và tiếp tục đội chi phí điện năng, tăng ca.',
            importedAt: baseStamp,
            importBatchId: 'builtin_simulator_core',
          },
          {
            id: `opt_${sid}_3`,
            scenarioId: sid,
            optionCode: 'OPT-C',
            titleEn: 'Approve CAPEX Unconditionally Without Post-Implementation Savings Verification',
            titleVi: 'Phê duyệt chi ngay không cần điều khoản hậu kiểm và khóa chỉ tiêu tiết kiệm',
            financialImpactEstimate: 35000,
            gopImpactPct: 1.5,
            riskLevel: 'High',
            isOptimal: false,
            rationaleEn: 'Without roster reduction and energy sub-metering, projected labor savings rarely materialize on P&L.',
            rationaleVi: 'Nếu không cắt giảm định biên và đo điện riêng, khoản tiết kiệm dự kiến dễ bị trôi mất.',
            importedAt: baseStamp,
            importBatchId: 'builtin_simulator_core',
          },
        ]
      : [
          {
            id: `opt_${sid}_1`,
            scenarioId: sid,
            optionCode: 'OPT-A',
            titleEn: 'Rebalance OTA vs Direct Mix + Enforce Daily Par-Stock & Dynamic Roster Controls',
            titleVi: 'Tái cân bằng Kênh Bán Trực tiếp/OTA + Siết Định mức Thu mua & Lịch ca Linh hoạt',
            financialImpactEstimate: Math.round(Math.abs(bud.gop - act.gop) * 0.85) + 18000,
            gopImpactPct: 4.4,
            riskLevel: 'Low',
            isOptimal: true,
            rationaleEn:
              'Protects ADR yield, slashes excess OTA commission & spoilage waste, and aligns casual payroll strictly to confirmed covers/arrivals.',
            rationaleVi:
              'Bảo vệ ADR thực thu, cắt giảm hoa hồng OTA & hao hụt bếp, gắn nhân công thời vụ sát công suất xác nhận.',
            importedAt: baseStamp,
            importBatchId: 'builtin_simulator_core',
          },
          {
            id: `opt_${sid}_2`,
            scenarioId: sid,
            optionCode: 'OPT-B',
            titleEn: 'Cut Guest Amenities & Freeze All Maintenance to Force Short-Term GOP',
            titleVi: 'Cắt giảm Tiện nghi Phòng Khách & Đóng băng Bảo trì Kỹ thuật Ngắn hạn',
            financialImpactEstimate: 14000,
            gopImpactPct: 1.2,
            riskLevel: 'High',
            isOptimal: false,
            rationaleEn: 'Harms Guest Satisfaction Score (GSS), degrades brand equity, and creates deferred CapEx liability.',
            rationaleVi: 'Làm sụt giảm điểm hài lòng khách hàng GSS, tổn hại thương hiệu và dồn nợ bảo trì.',
            importedAt: baseStamp,
            importBatchId: 'builtin_simulator_core',
          },
          {
            id: `opt_${sid}_3`,
            scenarioId: sid,
            optionCode: 'OPT-C',
            titleEn: 'Launch Deep 25% Flash OTA Discount to Chase 90% Occupancy',
            titleVi: 'Tung khuyến mãi giảm giá sâu 25% trên OTA để kéo Occupancy lên 90%',
            financialImpactEstimate: -22000,
            gopImpactPct: -2.4,
            riskLevel: 'High',
            isOptimal: false,
            rationaleEn: 'Additional high-commission low-ADR rooms drive housekeeping overtime faster than incremental GOP.',
            rationaleVi: 'Phòng giá rẻ qua hoa hồng cao làm chi phí dọn phòng và tăng ca phình to hơn lợi nhuận thu thêm.',
            importedAt: baseStamp,
            importBatchId: 'builtin_simulator_core',
          },
        ];

  const roleplayPrompts: SimulationRoleplayPromptDoc[] = [
    {
      id: `rp_${sid}_1`,
      scenarioId: sid,
      turnOrder: 1,
      speakerRole: scenario.defaultPersona || 'General Manager',
      promptEn:
        sid === 'sim_scn_04'
          ? 'Look, Owners are cautious on cash this year. Walk me through the exact Payback, NPV at 10%, and IRR—and tell me honestly where your cash savings could slip.'
          : 'Our top-line beat expectations in key outlets, so why am I defending a GOP shortfall to the Owners? Give me the three numbers that matter most first.',
      promptVi:
        sid === 'sim_scn_04'
          ? 'Chủ đầu tư năm nay rất chặt về dòng tiền. Anh/chị giải thích rõ Payback, NPV ở mức 10% và IRR — và nói thẳng rủi ro nào có thể làm hụt dòng tiền tiết kiệm?'
          : 'Doanh thu nhìn bên ngoài rất tốt, vậy tại sao tôi vẫn phải giải trình với Chủ đầu tư vì hụt GOP? Hãy cho tôi xem 3 con số mấu chốt trước.',
      expectedFocusPoints: 'Quantified GOP variance, root-cause decomposition, controllable levers, risk mitigation',
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
    {
      id: `rp_${sid}_2`,
      scenarioId: sid,
      turnOrder: 2,
      speakerRole: 'General Manager',
      promptEn: 'Operations insists cutting overtime will hurt guest service. How will Finance track control checkpoints without triggering guest complaints?',
      promptVi: 'Khối Vận hành lo ngại siết tăng ca sẽ ảnh hưởng trải nghiệm khách. Tài chính sẽ thiết lập chốt kiểm soát nào để không làm giảm điểm dịch vụ?',
      expectedFocusPoints: 'Flexible staffing triggers, par-stock controls, weekly flash KPIs, alignment with Ops',
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
  ];

  const referenceAnalysis: SimulationReferenceAnalysisDoc[] = [
    {
      id: `ref_${sid}_1`,
      scenarioId: sid,
      topic: scenario.titleEn,
      rootCauseEn:
        sid === 'sim_scn_04'
          ? 'Annual Net Cash Flow = $66,000 ($34k energy + $26k labor + $18k banquet - $12k maintenance). Payback = 2.73 yrs, ROI = 120.0% lifetime, NPV @ 10% = +$107,448, IRR = 28.43%.'
          : `GOP missed budget by $${Math.abs(act.gop - bud.gop).toLocaleString()} (Actual GOP Margin ${act.gopMarginPct}% vs Budget ${bud.gopMarginPct}%). Primary drags: OTA distribution dilution, Food Cost % (${act.foodCostPct}% vs ${bud.foodCostPct}%), and Payroll (${act.laborCostPct}% vs ${bud.laborCostPct}%).`,
      rootCauseVi:
        sid === 'sim_scn_04'
          ? 'Dòng tiền ròng/năm = $66,000 ($34k điện + $26k nhân công + $18k tiệc - $12k bảo trì). Hoàn vốn = 2.73 năm, ROI trọn đời = 120.0%, NPV @ 10% = +$107,448, IRR = 28.43%.'
          : `GOP hụt ngân sách $${Math.abs(act.gop - bud.gop).toLocaleString()} (Biên GOP Thực tế ${act.gopMarginPct}% vs Kế hoạch ${bud.gopMarginPct}%). Nguyên nhân chính: hoa hồng OTA tăng mạnh, Food Cost (${act.foodCostPct}% vs ${bud.foodCostPct}%) và Nhân sự (${act.laborCostPct}% vs ${bud.laborCostPct}%).`,
      benchmarkFormula:
        'GOP Margin % = (GOP / Total Operating Revenue) × 100 | Food Cost % = (Food Cost / Food Revenue) × 100 | RevPAR = Occ % × ADR',
      recommendedActionEn: decisionOptions.find((o) => o.isOptimal)?.titleEn || 'Execute OPT-A',
      recommendedActionVi: decisionOptions.find((o) => o.isOptimal)?.titleVi || 'Thực thi OPT-A',
      importedAt: baseStamp,
      importBatchId: 'builtin_simulator_core',
    },
  ];

  return {
    challenges,
    tasks,
    decisionOptions,
    roleplayPrompts,
    rubrics: makeRubrics(),
    competencyMappings: makeCompMappings(),
    referenceAnalysis,
    financialData,
    operationalData,
  };
}

export function evaluateDeterministicSimulation(params: {
  scenario: SimulationScenarioDoc;
  datasetSnapshot: HotelSimulationDatasetSnapshot;
  analysisWorkspace?: LearnerAnalysisWorkspace;
  decisionWorkspace?: LearnerDecisionWorkspace;
  executiveReport?: LearnerExecutiveReport;
  decisionOptions: SimulationDecisionOptionDoc[];
  rubrics: SimulationEvaluationRubricDoc[];
  conversation: Array<{ role: string; text: string }>;
  courses: Course[];
  ojtAssignments: OJTAssignment[];
  competencies: Competency[];
  language: 'vi' | 'en';
}): {
  scoringCriteria: SimulationEvaluationCriterionScore[];
  totalScore: number;
  strengths: string[];
  improvementAreas: string[];
  missedOpportunities: string[];
  calculationErrors: string[];
  recommendations: string[];
  recommendedCompetencies: SimulationEvaluationDoc['recommendedCompetencies'];
  recommendedCourseIds: string[];
  recommendedPracticalIds: string[];
  suggestedIdpObjectives: SimulationEvaluationDoc['suggestedIdpObjectives'];
} {
  const {
    scenario,
    datasetSnapshot,
    analysisWorkspace,
    decisionWorkspace,
    executiveReport,
    decisionOptions,
    rubrics,
    conversation,
    courses,
    ojtAssignments,
    language,
  } = params;

  const actual = datasetSnapshot.periods.actual;
  const calculationErrors: string[] = [];
  const strengths: string[] = [];
  const improvementAreas: string[] = [];
  const missedOpportunities: string[] = [];
  const recommendations: string[] = [];

  // 1. Check Financial Analysis Accuracy deterministically
  let finScore = 62;
  let checkedInputs = 0;
  let accurateInputs = 0;

  const checkNumericInput = (
    raw: string | undefined,
    expected: number | null,
    label: string,
    tolerance = 1.5
  ) => {
    if (!raw || !raw.trim() || expected === null) return;
    const cleaned = Number(raw.replace(/[^0-9.\-]/g, ''));
    checkedInputs++;
    if (!Number.isFinite(cleaned)) {
      calculationErrors.push(`${label}: Invalid numeric value "${raw}".`);
      return;
    }
    const diff = Math.abs(cleaned - expected);
    const relTol = Math.max(tolerance, Math.abs(expected) * 0.03);
    if (diff <= relTol) {
      accurateInputs++;
    } else {
      calculationErrors.push(
        language === 'vi'
          ? `${label}: Học viên nhập ${cleaned}, kết quả USALI chính xác là ${roundTo(expected, 2)}.`
          : `${label}: Submitted ${cleaned}, verified USALI figure is ${roundTo(expected, 2)}.`
      );
    }
  };

  if (scenario.scenarioKind === 'capex' && datasetSnapshot.capexAssumptions) {
    const capex = computeCapexMetrics(datasetSnapshot.capexAssumptions);
    checkNumericInput(analysisWorkspace?.capexUserInputs?.paybackYears, capex.paybackYears, 'Payback (Years)', 0.15);
    checkNumericInput(analysisWorkspace?.capexUserInputs?.roiPct, capex.roiPct, 'Lifetime ROI (%)', 2.5);
    checkNumericInput(analysisWorkspace?.capexUserInputs?.npv, capex.npv, 'NPV @ 10%', 1500);
    checkNumericInput(analysisWorkspace?.capexUserInputs?.irrPct, capex.irrPct, 'IRR (%)', 1.2);
  } else {
    checkNumericInput(analysisWorkspace?.submittedOccPct, actual.occupancyPct, 'Occupancy (%)', 0.8);
    checkNumericInput(analysisWorkspace?.submittedAdr, actual.adr, 'ADR', 2.0);
    checkNumericInput(analysisWorkspace?.submittedGopMarginPct, actual.gopMarginPct, 'GOP Margin (%)', 0.8);
    checkNumericInput(analysisWorkspace?.submittedFoodCostPct, actual.foodCostPct, 'Food Cost (%)', 0.8);
  }

  if (checkedInputs > 0) {
    finScore = Math.round(45 + (accurateInputs / checkedInputs) * 48);
    if (accurateInputs === checkedInputs) {
      finScore = 94;
      strengths.push(
        language === 'vi'
          ? `Tính toán chính xác tuyệt đối toàn bộ ${checkedInputs}/${checkedInputs} chỉ tiêu tài chính USALI.`
          : `Verified 100% calculation accuracy across all ${checkedInputs}/${checkedInputs} key USALI financial metrics.`
      );
    }
  } else if ((analysisWorkspace?.significantVariances || '').trim().length >= 40) {
    finScore = 72;
    missedOpportunities.push(
      language === 'vi'
        ? 'Chưa điền các ô kiểm chứng số liệu định lượng (Occ %, ADR, GOP Margin %, hoặc CAPEX).'
        : 'Quantitative KPI verification inputs were left blank in Step 3.'
    );
  } else {
    finScore = 50;
  }

  // 2. Business Insight & Root Cause Analysis
  const insightLen =
    (analysisWorkspace?.significantVariances?.trim().length || 0) +
    (analysisWorkspace?.symptomsVsRootCauses?.trim().length || 0) +
    (analysisWorkspace?.quantifiedFinancialImpact?.trim().length || 0);
  const deptCount = analysisWorkspace?.rootCauseDepartments?.length || 0;
  let insightScore = 48;
  if (insightLen >= 180 && deptCount >= 2) insightScore = 88;
  else if (insightLen >= 80 && deptCount >= 1) insightScore = 75;
  else if (insightLen >= 30) insightScore = 62;

  if (deptCount >= 2) {
    strengths.push(
      language === 'vi'
        ? `Xác định đa phòng ban liên quan nguyên nhân gốc (${analysisWorkspace?.rootCauseDepartments?.join(', ')}).`
        : `Mapped multi-departmental root causes (${analysisWorkspace?.rootCauseDepartments?.join(', ')}).`
    );
  } else {
    improvementAreas.push(
      language === 'vi'
        ? 'Cần phân tách rõ phòng ban gây rò rỉ lợi nhuận và lượng hóa tác động tiền tệ.'
        : 'Expand cross-departmental root cause attribution with dollar/VND quantification.'
    );
  }

  // 3. Forecasting & Scenario Planning
  let forecastScore = 64;
  if (scenario.scenarioKind === 'rolling_forecast') {
    const userScenarios = analysisWorkspace?.rollingForecastUserScenarios || [];
    if (userScenarios.length >= 3) {
      const validSpread = userScenarios.every(
        (m) => m.upsideOccPct >= m.baseOccPct && m.baseOccPct >= m.downsideOccPct
      );
      forecastScore = validSpread ? 92 : 72;
      if (!validSpread) {
        calculationErrors.push(
          language === 'vi'
            ? 'Thứ tự kịch bản dự báo chưa hợp lý (Upside Occupancy phải >= Base >= Downside).'
            : 'Rolling forecast scenario spread is inverted (Upside Occupancy should exceed Base and Downside).'
        );
      } else {
        strengths.push(
          language === 'vi'
            ? 'Xây dựng đủ 3 kịch bản Dự báo cuốn 3 tháng có độ co giãn hợp lý giữa Upside / Base / Downside.'
            : 'Structured disciplined 3-month Base, Upside, and Downside rolling forecast assumptions.'
        );
      }
    } else {
      forecastScore = 54;
    }
  } else {
    const hasRiskOpps = (analysisWorkspace?.risksAndOpportunities?.trim().length || 0) >= 35;
    const hasImpact = (decisionWorkspace?.estimatedFinancialImpact?.trim().length || 0) >= 15;
    forecastScore = hasRiskOpps && hasImpact ? 84 : hasRiskOpps || hasImpact ? 72 : 56;
  }

  // 4. Decision Making & Recommendations
  const selectedIds = decisionWorkspace?.selectedOptionIds || [];
  const optimalOptionIds = new Set(decisionOptions.filter((o) => o.isOptimal).map((o) => o.id));
  const hitOptimal = selectedIds.some((id) => optimalOptionIds.has(id));
  const pickedSuboptimal = selectedIds.some((id) => !optimalOptionIds.has(id));
  const decTextLen =
    (decisionWorkspace?.recommendedAction?.trim().length || 0) +
    (decisionWorkspace?.rationale?.trim().length || 0);

  let decisionScore = 52;
  if (hitOptimal && !pickedSuboptimal && decTextLen >= 60) {
    decisionScore = 91;
    strengths.push(
      language === 'vi'
        ? 'Lựa chọn phương án tối ưu cân bằng phục hồi GOP và bảo vệ trải nghiệm khách hàng.'
        : 'Selected the optimal management trade-off balancing GOP recovery with brand standards.'
    );
  } else if (hitOptimal && decTextLen >= 25) {
    decisionScore = 80;
  } else if (selectedIds.length > 0 && pickedSuboptimal) {
    decisionScore = 58;
    missedOpportunities.push(
      language === 'vi'
        ? 'Phương án được chọn có rủi ro ngắn hạn cao (giảm giá OTA quá mức hoặc cắt bảo trì). Nên ưu tiên phương án kiểm soát kênh và định biên.'
        : 'Chosen strategic option carries high risk (excess discounting or deferred maintenance); rebalance toward channel mix and cost discipline.'
    );
  } else if (decTextLen >= 50) {
    decisionScore = 70;
  }

  // 5. Communication & GM Advisory
  const execTextLen =
    (executiveReport?.executiveSummary?.trim().length || 0) +
    (executiveReport?.keyFinancialFindings?.trim().length || 0) +
    (executiveReport?.recommendedActions?.trim().length || 0) +
    (executiveReport?.requiredManagementDecision?.trim().length || 0);
  const learnerTurns = conversation.filter((c) => c.role === 'user').length;
  let commScore = 54;
  if (execTextLen >= 160 && learnerTurns >= 2) commScore = 90;
  else if (execTextLen >= 90 || learnerTurns >= 1) commScore = 77;
  else if (execTextLen >= 30) commScore = 66;

  if (learnerTurns === 0) {
    missedOpportunities.push(
      language === 'vi'
        ? 'Chưa thực hành phản biện trực tiếp trong Cuộc họp điều hành với GM (GM Executive Meeting).'
        : 'No interactive GM Executive Meeting dialogue turns recorded yet.'
    );
  }

  // 6. Risk Awareness & Internal Control
  const riskLen =
    (decisionWorkspace?.risksAndMitigation?.trim().length || 0) +
    (decisionWorkspace?.followupKpis?.trim().length || 0) +
    (executiveReport?.riskAssessment?.trim().length || 0);
  let riskScore = 55;
  if (riskLen >= 120) riskScore = 86;
  else if (riskLen >= 50) riskScore = 74;
  else {
    improvementAreas.push(
      language === 'vi'
        ? 'Bổ sung chốt kiểm soát nội bộ (phê duyệt PO, trần OT, hậu kiểm CAPEX) và KPI theo dõi hàng tuần.'
        : 'Specify concrete internal controls (PO limits, OT caps, CAPEX post-audit) and weekly KPIs.'
    );
  }

  const rawScoreMap: Record<string, number> = {
    FIN_ANALYSIS: finScore,
    BIZ_INSIGHT: insightScore,
    FORECAST_PLAN: forecastScore,
    DECISION_REC: decisionScore,
    EXEC_COMM: commScore,
    RISK_CTRL: riskScore,
  };

  const activeRubrics =
    rubrics.length >= 4
      ? rubrics
      : STANDARD_EVALUATION_RUBRIC_BLUEPRINT.map((bp, i) => ({
          id: `rub_fallback_${i}`,
          scenarioId: scenario.id,
          criterionCode: bp.criterionCode,
          criterionNameEn: bp.criterionNameEn,
          criterionNameVi: bp.criterionNameVi,
          weightPercent: bp.weightPercent,
          maxScore: bp.maxScore,
          passingScore: bp.passingScore,
        }));

  const scoringCriteria: SimulationEvaluationCriterionScore[] = activeRubrics.map((r) => {
    const score = Math.max(0, Math.min(100, rawScoreMap[r.criterionCode] ?? Math.round((finScore + insightScore + decisionScore) / 3)));
    const level: ProficiencyLevel = score >= 88 ? 4 : score >= 75 ? 3 : score >= 60 ? 2 : 1;
    const blueprint = STANDARD_EVALUATION_RUBRIC_BLUEPRINT.find((b) => b.criterionCode === r.criterionCode);
    const anchor = blueprint ? blueprint.anchors[level][language] : `Level ${level}`;
    return {
      criterionCode: r.criterionCode,
      criterionNameEn: r.criterionNameEn,
      criterionNameVi: r.criterionNameVi,
      weightPercent: r.weightPercent,
      score,
      behavioralLevel: level,
      behavioralAnchor: anchor,
      evidence:
        r.criterionCode === 'FIN_ANALYSIS'
          ? `${accurateInputs}/${Math.max(1, checkedInputs)} KPI inputs verified deterministically.`
          : r.criterionCode === 'DECISION_REC'
          ? `${selectedIds.length} decision option(s) evaluated.`
          : r.criterionCode === 'EXEC_COMM'
          ? `Executive report length: ${execTextLen} chars; GM dialogue turns: ${learnerTurns}.`
          : `Workspace evidence reviewed.`,
      feedback: anchor,
    };
  });

  const weightSum = scoringCriteria.reduce((acc, c) => acc + c.weightPercent, 0) || 100;
  const totalScore = roundTo(
    scoringCriteria.reduce((acc, c) => acc + (c.score * c.weightPercent) / weightSum, 0),
    1
  );

  // Recommend Courses & OJT from lowest criteria & competency domains
  const targetCodes = scenario.competencyIds || ['BPA-01', 'SBP-01'];
  const matchedCourseObjs = courses.filter((c) =>
    c.syllabus?.competencyCodes?.some((code) => targetCodes.includes(code))
  );
  const recommendedCourseIds =
    matchedCourseObjs.length > 0
      ? matchedCourseObjs.slice(0, 3).map((c) => c.id)
      : courses.slice(0, 2).map((c) => c.id);

  const relatedDomainIds = new Set(matchedCourseObjs.map((c) => c.domainId));
  const matchedOjt = ojtAssignments
    .filter((o) => relatedDomainIds.has(o.domainId))
    .slice(0, 2)
    .map((o) => o.id);
  const recommendedPracticalIds =
    matchedOjt.length > 0 ? matchedOjt : ojtAssignments.slice(0, 1).map((o) => o.id);

  const recommendedCompetencies: SimulationEvaluationDoc['recommendedCompetencies'] = targetCodes
    .slice(0, 3)
    .map((code) => {
      const suggestedLevel: ProficiencyLevel = totalScore >= 85 ? Math.min(4, scenario.difficultyLevel) as ProficiencyLevel : Math.max(1, scenario.difficultyLevel - 1) as ProficiencyLevel;
      return {
        competencyId: `comp_${code.toLowerCase().replace('-', '_')}`,
        competencyCode: code,
        suggestedLevel,
        rationale:
          language === 'vi'
            ? `Đề xuất tham khảo từ phiên mô phỏng ${scenario.scenarioCode} (Điểm tổng: ${totalScore}/100). Cần người đánh giá xác nhận.`
            : `Advisory evidence from ${scenario.scenarioCode} (Total: ${totalScore}/100). Requires human assessor validation.`,
        requiresHumanApproval: true,
      };
    });

  const weakest = [...scoringCriteria].sort((a, b) => a.score - b.score).slice(0, 2);
  const suggestedIdpObjectives: SimulationEvaluationDoc['suggestedIdpObjectives'] = weakest.map((w, idx) => ({
    competencyCode: targetCodes[idx] || targetCodes[0] || 'BPA-01',
    titleEn: `Strengthen ${w.criterionNameEn} via applied hotel financial case practice`,
    titleVi: `Nâng cao năng lực ${w.criterionNameVi} qua thực hành nghiệp vụ khách sạn`,
    linkedCourseId: recommendedCourseIds[idx] || recommendedCourseIds[0],
    linkedPracticalId: recommendedPracticalIds[0],
  }));

  if (recommendations.length === 0) {
    recommendations.push(
      language === 'vi'
        ? `Hoàn thành khóa học gợi ý (${recommendedCourseIds.join(', ')}) và thực hành phản biện bổ sung với GM nếu cần nâng cấp độ.`
        : `Complete recommended academy course(s) (${recommendedCourseIds.join(', ')}) and practice an executive GM challenge round.`
    );
  }

  return {
    scoringCriteria,
    totalScore,
    strengths,
    improvementAreas,
    missedOpportunities,
    calculationErrors,
    recommendations,
    recommendedCompetencies,
    recommendedCourseIds,
    recommendedPracticalIds,
    suggestedIdpObjectives,
  };
}
