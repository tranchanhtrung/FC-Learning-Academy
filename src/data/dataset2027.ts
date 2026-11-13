import * as XLSX from 'xlsx';

/**
 * Generates the official FC_Learning_Academy_Training_Dataset_2027.xlsx workbook
 * containing the README sheet + all 9 curriculum sheets with exact target counts:
 * - Competency_Domains: 6
 * - Proficiency_Levels: 4
 * - Competencies: 30
 * - Competency_Rubric: 120 (30 x 4)
 * - Course_Catalog: 18
 * - Question_Bank: 60
 * - Practical_Assignments: 6
 * - Training_Matrix_2027: 12
 * - Career_Paths: 3
 */
export function build2027DatasetRows() {
  const readmeRows = [
    {
      Section: 'WORKBOOK PURPOSE',
      Instruction_EN: 'Official FC Learning Academy 2027 Curriculum & Competency Dataset for Firebase Firestore Import.',
      Instruction_VI: 'Bộ dữ liệu chuẩn Khung Năng Lực & Chương Trình Đào Tạo 2027 của FC Learning Academy.',
    },
    {
      Section: 'IMPORT ORDER',
      Instruction_EN: '1.Competency_Domains -> 2.Proficiency_Levels -> 3.Competencies -> 4.Competency_Rubric -> 5.Course_Catalog -> 6.Question_Bank -> 7.Practical_Assignments -> 8.Training_Matrix_2027 -> 9.Career_Paths',
      Instruction_VI: 'Nhập tuần tự 9 sheet theo đúng thứ tự phụ thuộc khóa ngoại.',
    },
    {
      Section: 'VALIDATION RULES',
      Instruction_EN: 'Unique IDs required; Proficiency levels 1..4; Positive course durations; Weights must total 100%; MC answers A/B/C/D; Numeric answers must be valid numbers.',
      Instruction_VI: 'Không trùng ID; Cấp độ 1..4; Thời lượng dương; Tổng trọng số = 100%; Đáp án trắc nghiệm A/B/C/D.',
    },
    {
      Section: 'README EXCLUSION',
      Instruction_EN: 'This README sheet is informational only and is automatically excluded from Firestore imports.',
      Instruction_VI: 'Sheet README chỉ dùng để hướng dẫn và không được import vào Firestore.',
    },
  ];

  const competencyDomains = [
    { id: 'DOM-FAR', code: 'FAR', name_en: 'Financial Accounting & Reporting', name_vi: 'Kế Toán Tài Chính & Báo Cáo USALI', description_en: 'USALI 11th/12th revenue recognition, month-end Day 3 closing, balance sheet reconciliations.', description_vi: 'Chuẩn mực USALI, khóa sổ tháng Day 3 và đối chiếu bảng cân đối.', weight_percent: 20, sort_order: 1 },
    { id: 'DOM-FCA', code: 'FCA', name_en: 'Financial Control, Audit & Compliance', name_vi: 'Kiểm Soát Nội Bộ, Kiểm Toán & Tuân Thủ', description_en: 'Internal controls, cashier float audits, F&B cost control, SOP governance.', description_vi: 'Kiểm soát nội bộ, kiểm kê quỹ, kiểm soát giá vốn F&B và tuân thủ.', weight_percent: 20, sort_order: 2 },
    { id: 'DOM-FPM', code: 'FPM', name_en: 'Financial Planning & Management', name_vi: 'Hoạch Định Ngân Sách & Dòng Tiền', description_en: 'Zero-based budgeting, 13-week cash flow forecasting, CAPEX DCF modeling.', description_vi: 'Lập ngân sách, dự báo dòng tiền 13 tuần và thẩm định CAPEX.', weight_percent: 20, sort_order: 3 },
    { id: 'DOM-BPA', code: 'BPA', name_en: 'Business Performance & Analytics', name_vi: 'Phân Tích Hiệu Suất & Flow-Through', description_en: 'GOP Flow-Through, RevPAR index, ADR vs Occupancy optimization, departmental flexing.', description_vi: 'Phân tích GOP Flow-Through, RevPAR và hiệu suất vận hành.', weight_percent: 15, sort_order: 4 },
    { id: 'DOM-LPM', code: 'LPM', name_en: 'Leadership & People Management', name_vi: 'Lãnh Đạo & Phát Triển Đội Ngũ Tài Chính', description_en: 'Finance team coaching, cross-departmental stakeholder leadership.', description_vi: 'Huấn luyện đội ngũ kế toán và phối hợp liên phòng ban.', weight_percent: 15, sort_order: 5 },
    { id: 'DOM-SBP', code: 'SBP', name_en: 'Strategic Business Partnership', name_vi: 'Đối Tác Kinh Doanh Chiến Lược Của GM', description_en: 'GM decision advisory, owner asset management, HMA governance and EBITDA growth.', description_vi: 'Tham mưu chiến lược cho GM, quản trị tài sản và tối ưu EBITDA.', weight_percent: 10, sort_order: 6 },
  ];

  const proficiencyLevels = [
    { id: 'LVL-1', level: 1, code: 'L1', name_en: 'Foundation', name_vi: 'Nền Tảng', description_en: 'Executes standard accounting entries and daily controls under supervision.', description_vi: 'Thực hiện nghiệp vụ kế toán chuẩn dưới sự hướng dẫn.', target_role: 'Junior Accountant' },
    { id: 'LVL-2', level: 2, code: 'L2', name_en: 'Operational', name_vi: 'Vận Hành Độc Lập', description_en: 'Independently owns month-end closing schedules, audits, and departmental reconciliations.', description_vi: 'Độc lập thực hiện khóa sổ tháng và đối chiếu số liệu.', target_role: 'Senior Accountant' },
    { id: 'LVL-3', level: 3, code: 'L3', name_en: 'Advanced', name_vi: 'Chuyên Sâu & Phân Tích', description_en: 'Leads budgeting, cash flow forecasting, variance diagnostics, and team supervision.', description_vi: 'Chủ trì lập ngân sách, dự báo dòng tiền và phân tích biến động.', target_role: 'Assistant Financial Controller' },
    { id: 'LVL-4', level: 4, code: 'L4', name_en: 'Strategic FC Partner', name_vi: 'Đối Tác Chiến Lược FC', description_en: 'Acts as co-pilot to the General Manager and trusted steward for hotel owners.', description_vi: 'Cánh tay phải chiến lược của Tổng Giám Đốc và đại diện Chủ đầu tư.', target_role: 'Financial Controller' },
  ];

  // 30 competencies (5 per domain)
  const compSeeds: Array<[string, string, string, string, string, number]> = [
    ['COMP-01', 'FAR-01', 'DOM-FAR', 'USALI 11th/12th Chart of Accounts & P&L Structure', 'Hệ Thống Tài Khoản & Báo Cáo P&L Chuẩn USALI', 4],
    ['COMP-02', 'FAR-02', 'DOM-FAR', 'Day 3 Accelerated Month-End Closing', 'Khóa Sổ Nhanh Cuối Tháng Day 3', 4],
    ['COMP-03', 'FAR-03', 'DOM-FAR', 'Audit-Ready Balance Sheet Reconciliations', 'Đối Chiếu Bảng Cân Đối Kế Toán Chuẩn Kiểm Toán', 3],
    ['COMP-04', 'FAR-04', 'DOM-FAR', 'Accrual, Deferral & Prepayment Accounting', 'Kế Toán Trích Trước, Doanh Thu Hoãn Lại & Trả Trước', 3],
    ['COMP-05', 'FAR-05', 'DOM-FAR', 'Multi-Outlet Revenue & City Ledger Reconciliation', 'Đối Chiếu Doanh Thu PMS & Công Nợ City Ledger', 3],
    ['COMP-06', 'FCA-01', 'DOM-FCA', 'Hotel Internal Control Matrix & Segregation of Duties', 'Ma Trận Kiểm Soát Nội Bộ & Phân Tách Nhiệm Vụ', 4],
    ['COMP-07', 'FCA-02', 'DOM-FCA', 'F&B Cost Control, Yield & Inventory Audits', 'Kiểm Soát Giá Vốn F&B, Hao Hụt & Kiểm Kê Kho', 4],
    ['COMP-08', 'FCA-03', 'DOM-FCA', 'Night Audit & Daily Income Audit Exception Control', 'Kiểm Toán Doanh Thu Ngày & Kiểm Tra Night Audit', 3],
    ['COMP-09', 'FCA-04', 'DOM-FCA', 'Credit Policy, AR Aging & Bad Debt Governance', 'Quản Trị Tín Dụng, Tuổi Nợ AR & Dự Phòng Nợ Xấu', 3],
    ['COMP-10', 'FCA-05', 'DOM-FCA', 'Procurement, Purchasing Bids & Receiving Controls', 'Kiểm Soát Mua Hàng, Báo Giá & Nhận Hàng Khách Sạn', 3],
    ['COMP-11', 'FPM-01', 'DOM-FPM', 'Zero-Based Annual Hotel Master Budgeting', 'Lập Ngân Sách Năm Từ Gốc (Zero-Based Budgeting)', 4],
    ['COMP-12', 'FPM-02', 'DOM-FPM', '13-Week Rolling Cash Flow & Working Capital Forecasting', 'Dự Báo Dòng Tiền 13 Tuần & Vốn Lưu Động', 4],
    ['COMP-13', 'FPM-03', 'DOM-FPM', 'CAPEX Business Case, NPV & IRR Appraisal', 'Thẩm Định Dự Án Đầu Tư CAPEX, NPV & IRR', 4],
    ['COMP-14', 'FPM-04', 'DOM-FPM', 'Monthly Rolling Forecast (3+9, 6+6, 9+3)', 'Dự Báo Cuốn Hàng Tháng (Rolling Forecast)', 3],
    ['COMP-15', 'FPM-05', 'DOM-FPM', 'FF&E Reserve Planning & Owner Funding Requests', 'Hoạch Định Quỹ Bảo Trì FF&E & Đề Xuất Chủ Đầu Tư', 4],
    ['COMP-16', 'BPA-01', 'DOM-BPA', 'GOP Flow-Through & Departmental Cost Flexing', 'Phân Tích GOP Flow-Through & Co Giãn Chi Phí', 4],
    ['COMP-17', 'BPA-02', 'DOM-BPA', 'RevPAR, ADR, Occupancy & STR Market Benchmarking', 'Phân Tích RevPAR, ADR & Đối Chiếu Thị Trường STR', 4],
    ['COMP-18', 'BPA-03', 'DOM-BPA', 'F&B Menu Engineering & Banquet Contribution Analysis', 'Tối Ưu Thực Đơn F&B & Lợi Nhuận Tiệc Hội Nghị', 3],
    ['COMP-19', 'BPA-04', 'DOM-BPA', 'Labor Productivity Metrics (Hours/Occupied Room)', 'Đo Lường Năng Suất Lao Động & Tối Ưu Overtime', 3],
    ['COMP-20', 'BPA-05', 'DOM-BPA', 'Distribution Channel Cost & Net RevPAR Analytics', 'Chi Phí Kênh Bán OTA & Phân Tích Net RevPAR', 4],
    ['COMP-21', 'LPM-01', 'DOM-LPM', 'Finance Department Coaching & Cross-Training', 'Huấn Luyện & Luân Chuyển Nhân Sự Kế Toán', 4],
    ['COMP-22', 'LPM-02', 'DOM-LPM', 'Cross-Departmental Finance Influence (Non-Finance HODs)', 'Gây Ảnh Hưởng Tài Chính Với Các Trưởng Bộ Phận', 4],
    ['COMP-23', 'LPM-03', 'DOM-LPM', 'Ethical Compliance & Anti-Fraud Culture Building', 'Xây Dựng Văn Hóa Đạo Đức & Phòng Chống Gian Lận', 4],
    ['COMP-24', 'LPM-04', 'DOM-LPM', 'Executive Storytelling & Boardroom Presentation', 'Kể Chuyện Dữ Liệu Tài Chính & Thuyết Trình Cấp Cao', 4],
    ['COMP-25', 'LPM-05', 'DOM-LPM', 'Conflict Resolution During Budget & Audit Reviews', 'Giải Quyết Xung Đột Khi Thẩm Định Ngân Sách & Kiểm Toán', 3],
    ['COMP-26', 'SBP-01', 'DOM-SBP', 'GM-FC Strategic Business Partnering & Co-Piloting', 'Đồng Hành Chiến Lược Cùng Tổng Giám Đốc (GM)', 4],
    ['COMP-27', 'SBP-02', 'DOM-SBP', 'Hotel Management Agreement (HMA) & Fee Compliance', 'Quản Trị Hợp Đồng Quản Lý Khách Sạn (HMA) & Phí Quản Lý', 4],
    ['COMP-28', 'SBP-03', 'DOM-SBP', 'Owner Asset Management & Value Creation Strategy', 'Quản Trị Tài Sản Khách Sạn & Gia Tăng Giá Trị Chủ Sở Hữu', 4],
    ['COMP-29', 'SBP-04', 'DOM-SBP', 'Crisis Financial Turnaround & GOP Recovery Planning', 'Kế Hoạch Ứng Phó Khủng Hoảng & Phục Hồi Lợi Nhuận GOP', 4],
    ['COMP-30', 'SBP-05', 'DOM-SBP', 'ESG Energy ROI & Sustainable Hospitality Investments', 'Đầu Tư Tiết Kiệm Năng Lượng ESG & Hiệu Quả Bền Vững', 4],
  ];

  const competencies = compSeeds.map(([id, code, domain_id, name_en, name_vi, target_level], idx) => ({
    id,
    code,
    domain_id,
    name_en,
    name_vi,
    definition_en: `Demonstrates international hospitality mastery in ${name_en} aligned with USALI standards.`,
    definition_vi: `Làm chủ năng lực ${name_vi} theo chuẩn mực khách sạn quốc tế USALI.`,
    target_level,
    weight_percent: idx < 20 ? 3 : 4,
  }));

  // 120 competency rubrics (30 competencies x 4 proficiency levels)
  const levelNames = [
    ['Foundation', 'Nền tảng', 'Assists with routine templates under senior review.', 'Hỗ trợ lập biểu mẫu định kỳ dưới sự kiểm soát.', 'Daily checklists', 25],
    ['Operational', 'Vận hành độc lập', 'Completes cycle independently without material audit adjustments.', 'Độc lập hoàn thành quy trình không có sai sót trọng yếu.', 'Reconciliation sign-offs', 25],
    ['Advanced', 'Chuyên sâu', 'Analyzes root causes, coaches juniors, and optimizes controls.', 'Phân tích nguyên nhân gốc rễ, hướng dẫn nhân viên.', 'Variance memo & review notes', 25],
    ['Strategic FC', 'Chiến lược FC', 'Advises GM and Ownership on margin expansion and capital impact.', 'Tham mưu GM và Chủ đầu tư tối ưu lợi nhuận & dòng tiền.', 'GM executive briefing deck', 25],
  ] as const;

  const competencyRubrics: Record<string, any>[] = [];
  let rubIdx = 1;
  for (const comp of competencies) {
    for (let lvl = 1; lvl <= 4; lvl++) {
      const meta = levelNames[lvl - 1];
      competencyRubrics.push({
        id: `RUB-${String(rubIdx).padStart(3, '0')}`,
        competency_id: comp.id,
        proficiency_level: lvl,
        proficiency_level_id: `LVL-${lvl}`,
        criteria_en: `[${meta[0]}] ${comp.name_en}: ${meta[2]}`,
        criteria_vi: `[${meta[1]}] ${comp.name_vi}: ${meta[3]}`,
        observable_behavior: `Consistently applies ${comp.code} at Level ${lvl} during monthly closing and reviews.`,
        evidence_required: meta[4],
        assessment_weight: meta[5],
      });
      rubIdx++;
    }
  }

  // 18 courses
  const courses = Array.from({ length: 18 }, (_, i) => {
    const comp = competencies[i];
    const num = i + 1;
    const series = Math.floor(i / 3) + 1;
    return {
      id: `CRS-${String(num).padStart(2, '0')}`,
      code: `HFC-${series}0${(i % 3) + 1}`,
      domain_id: comp.domain_id,
      competency_id: comp.id,
      title_en: `${comp.name_en} Masterclass`,
      title_vi: `Chuyên Đề: ${comp.name_vi}`,
      description_en: `Applied luxury hotel finance workshop covering ${comp.name_en} and practical case scenarios.`,
      description_vi: `Khóa học chuyên sâu về ${comp.name_vi} kết hợp tình huống khách sạn 5 sao.`,
      target_level: comp.target_level,
      duration_hours: 4 + (i % 4) * 2,
      passing_score: 80,
      assessment_weight_quiz: 40,
      assessment_weight_practical: 60,
      delivery_mode: i % 2 === 0 ? 'Blended + Case Study' : 'Instructor-Led + Excel Lab',
    };
  });

  // 60 questions (mix of multiple_choice A/B/C/D and numeric)
  const questionBank = Array.from({ length: 60 }, (_, i) => {
    const course = courses[i % courses.length];
    const isNumeric = i % 5 === 4;
    if (isNumeric) {
      const baseNum = 45 + (i % 10) * 5;
      return {
        id: `Q-${String(i + 1).padStart(3, '0')}`,
        course_id: course.id,
        competency_id: course.competency_id,
        question_type: 'numeric',
        question_text_en: `[${course.code}] If Room Revenue rises by $100,000 and GOP increases by $${baseNum},000, what is the exact GOP Flow-Through percentage (%)?`,
        question_text_vi: `[${course.code}] Nếu Doanh thu Phòng tăng $100,000 và GOP tăng $${baseNum},000, tỷ lệ GOP Flow-Through (%) là bao nhiêu?`,
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: String(baseNum),
        explanation_en: `GOP Flow-Through = Change in GOP / Change in Revenue = ${baseNum},000 / 100,000 = ${baseNum}%.`,
        explanation_vi: `GOP Flow-Through = Biến động GOP / Biến động Doanh thu = ${baseNum}%.`,
        proficiency_level: course.target_level,
        points: 10,
      };
    }

    const answerChoices = ['A', 'B', 'C', 'D'] as const;
    const ans = answerChoices[i % 4];
    return {
      id: `Q-${String(i + 1).padStart(3, '0')}`,
      course_id: course.id,
      competency_id: course.competency_id,
      question_type: 'multiple_choice',
      question_text_en: `[${course.code}] Under USALI standards for ${course.title_en}, which control practice best protects hotel GOP integrity?`,
      question_text_vi: `[${course.code}] Theo chuẩn USALI trong ${course.title_vi}, biện pháp kiểm soát nào bảo vệ tốt nhất biên lợi nhuận GOP?`,
      option_a: 'Documented monthly reconciliation signed off independently before Day 3 close',
      option_b: 'Delaying supplier accruals until cash is paid next quarter',
      option_c: 'Recording complimentary owner meals inside Rooms Revenue',
      option_d: 'Eliminating night audit exception reports to save labor hours',
      correct_answer: ans,
      explanation_en: `Aligned with ${course.code}: timely accruals, proper USALI departmental classification, and independent review ensure reliable P&L governance.`,
      explanation_vi: `Theo ${course.code}: trích trước đúng kỳ, phân bổ đúng chuẩn USALI và kiểm soát độc lập đảm bảo tính trung thực của báo cáo P&L.`,
      proficiency_level: course.target_level,
      points: 10,
    };
  });

  // 6 practical assignments (1 per domain)
  const practicalAssignments = competencyDomains.map((dom, i) => {
    const crs = courses[i * 3];
    return {
      id: `OJT-2027-0${i + 1}`,
      code: `PA-${dom.code}-01`,
      course_id: crs.id,
      competency_id: crs.competency_id,
      title_en: `${dom.name_en} Capstone Deliverable`,
      title_vi: `Dự Án Thực Tế: ${dom.name_vi}`,
      scenario_en: `Prepare an executive workpaper and GM briefing for a 380-key luxury hotel addressing ${dom.description_en}`,
      scenario_vi: `Xây dựng hồ sơ làm việc thực tế và báo cáo trình GM cho khách sạn 380 phòng về ${dom.description_vi}`,
      deliverables: 'Excel Model + Executive Commentary + Control Checklist',
      max_score: 100,
      passing_score: 80,
      weight_percent: i === 5 ? 15 : i === 4 ? 15 : i === 3 ? 10 : 20, // sums to 100? 20+20+20+10+15+15 = 100!
      due_date_days: 30 + i * 15,
    };
  });

  // 12 training matrix records (Jan - Dec 2027)
  const roles2027 = ['Senior Accountant', 'Assistant Financial Controller', 'Financial Controller'];
  const annualTrainingMatrix = Array.from({ length: 12 }, (_, mIdx) => {
    const monthNum = mIdx + 1;
    const crs = courses[mIdx % courses.length];
    return {
      id: `MTX-2027-${String(monthNum).padStart(2, '0')}`,
      month: monthNum,
      target_date: `2027-${String(monthNum).padStart(2, '0')}-15`,
      target_role: roles2027[mIdx % roles2027.length],
      domain_id: crs.domain_id,
      course_id: crs.id,
      competency_id: crs.competency_id,
      delivery_format: mIdx % 2 === 0 ? 'Workshop + Simulation' : 'OJT Coaching',
      mandatory: mIdx < 9,
      cohort_size: 20,
      assessment_weight: 100,
    };
  });

  // 3 career paths
  const careerPaths = [
    {
      id: 'CP-ACC-TO-SENIOR',
      code: 'PATH-L1-L2',
      name_en: 'Staff Accountant to Senior Accountant',
      name_vi: 'Kế Toán Viên lên Kế Toán Tổng Hợp',
      from_role: 'Accountant',
      to_role: 'Senior Accountant',
      target_level: 2,
      duration_months: 12,
      required_course_ids: 'CRS-01, CRS-02, CRS-04, CRS-05',
      required_competency_ids: 'COMP-01, COMP-02, COMP-06, COMP-07',
      required_practical_ids: 'OJT-2027-01, OJT-2027-02',
      min_assessment_score: 80,
    },
    {
      id: 'CP-SENIOR-TO-AFC',
      code: 'PATH-L2-L3',
      name_en: 'Senior Accountant to Assistant Financial Controller',
      name_vi: 'Kế Toán Tổng Hợp lên Trợ Lý FC (AFC)',
      from_role: 'Senior Accountant',
      to_role: 'Assistant Financial Controller',
      target_level: 3,
      duration_months: 18,
      required_course_ids: 'CRS-07, CRS-08, CRS-10, CRS-11',
      required_competency_ids: 'COMP-11, COMP-12, COMP-16, COMP-17',
      required_practical_ids: 'OJT-2027-03, OJT-2027-04',
      min_assessment_score: 85,
    },
    {
      id: 'CP-AFC-TO-FC',
      code: 'PATH-L3-L4',
      name_en: 'Assistant FC to Strategic Financial Controller',
      name_vi: 'Trợ Lý FC lên Giám Đốc Tài Chính Chiến Lược (FC)',
      from_role: 'Assistant Financial Controller',
      to_role: 'Financial Controller',
      target_level: 4,
      duration_months: 24,
      required_course_ids: 'CRS-13, CRS-15, CRS-16, CRS-18',
      required_competency_ids: 'COMP-21, COMP-24, COMP-26, COMP-28',
      required_practical_ids: 'OJT-2027-05, OJT-2027-06',
      min_assessment_score: 90,
    },
  ];

  return {
    README: readmeRows,
    Competency_Domains: competencyDomains,
    Proficiency_Levels: proficiencyLevels,
    Competencies: competencies,
    Competency_Rubric: competencyRubrics,
    Course_Catalog: courses,
    Question_Bank: questionBank,
    Practical_Assignments: practicalAssignments,
    Training_Matrix_2027: annualTrainingMatrix,
    Career_Paths: careerPaths,
  };
}

export function build2027DatasetWorkbook(): XLSX.WorkBook {
  const sheets = build2027DatasetRows();
  const wb = XLSX.utils.book_new();
  (Object.keys(sheets) as Array<keyof typeof sheets>).forEach((sheetName) => {
    const ws = XLSX.utils.json_to_sheet(sheets[sheetName]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  return wb;
}

export function create2027TemplateBuffer(): Buffer {
  const wb = build2027DatasetWorkbook();
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
