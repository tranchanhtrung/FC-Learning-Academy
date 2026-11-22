import type { CourseSyllabus } from '../../types/index.ts';

export const DOMAIN_4_TO_6_SYLLABI: Record<string, CourseSyllabus> = {
  // =========================================================================
  // DOMAIN 4: BUSINESS PERFORMANCE & ANALYTICS (D4-BPA)
  // =========================================================================
  'HFC-401': {
    courseCode: 'HFC-401',
    overviewVi:
      'Đi sâu vào trái tim phân tích hiệu quả điều hành khách sạn: Dòng chuyển hóa lợi nhuận (Flow-Through > 50% khi tăng thu) & Khả năng co giãn chi phí (Flex > 35% khi hụt thu), bóc tách Phương sai Giá bán vs Sản lượng (Rate vs Volume Variance), kiểm soát Năng suất lao động HPOR và biên lợi nhuận từng Outlet.',
    overviewEn:
      'Deep mastery of hotel profitability mechanics: Flow-Through (>50% on revenue gains) and Flex (>35% on shortfalls), Rate vs. Volume Variance decomposition, HPOR labor productivity benchmarking, and departmental P&L recovery plans.',
    targetAudienceVi: 'Financial Analyst, Assistant Financial Controller, Financial Controller, Department Heads',
    targetAudienceEn: 'Financial Analysts, Assistant FCs, Financial Controllers, Operational Division Heads',
    careerTrackStageVi: 'Giai đoạn 2 -> 3: Kế Toán Trưởng -> Trợ Lý FC -> Financial Controller',
    careerTrackStageEn: 'Stage 2 -> 3: Senior Accountant -> Assistant FC -> Financial Controller',
    competencyCodes: ['BPA-01', 'BPA-03', 'BPA-04', 'FPM-05'],
    deliveryFormatVi: 'Flow-Through Lectures (4h) · Rate/Volume & HPOR Excel Lab (9h) · Profit Crisis Case (5h)',
    deliveryFormatEn: 'Flow-Through Seminars (4h) · Variance & HPOR Excel Lab (9h) · 12% Flow-Through Case (5h)',
    totalContactHours: 11,
    totalSelfStudyHours: 7,
    assessmentBreakdown: {
      quizWeight: 25,
      caseStudyWeight: 35,
      practicalOjtWeight: 40,
      passingScore: 85,
    },
    preWorkVi: 'Thu thập P&L tháng gần nhất (Actual vs Budget) bao gồm số liệu Phòng bán, Cover nhà hàng và Giờ công lao động.',
    preWorkEn: 'Bring your most recent monthly P&L (Actual vs. Budget) with occupied rooms, F&B covers, and payroll hours.',
    referencesAndStandards: [
      'USALI Flow-Through & Flex Operational Performance Standards',
      'Hotel Labor Productivity Ratios (HPOR & Covers Per Labor Hour)',
      'Marriott / Hilton Monthly Financial Critique Methodology',
    ],
    capstoneDeliverableVi: 'Mô hình Excel Phân tích Flow-Through, Rate/Volume & Năng suất HPOR + Bản Memo Phục hồi Lợi nhuận 30 ngày cho GM.',
    capstoneDeliverableEn: 'Flow-Through, Rate/Volume & HPOR Excel Diagnostic Workbook + 30-Day GM Profit Recovery Memo.',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Nguyên lý Flow-Through & Flex Analysis theo Chuẩn Khách sạn Quốc tế',
        titleEn: 'Session 1: Flow-Through & Flex Sensitivity Mechanics',
        durationHours: 4,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Tính toán và diễn giải chính xác Flow-Through % (mục tiêu >= 50%) và Flex % (mục tiêu >= 35%)',
          'Nhận diện sự khác biệt giữa Flow-Through tại cấp Bộ phận (Departmental Income) vs toàn Khách sạn (GOP)',
        ],
        learningOutcomesEn: [
          'Calculate and interpret Revenue-to-GOP Flow-Through (>=50%) and Downside Flex (>=35%) accurately',
          'Diagnose leakage points between Departmental Income flow-through and Property GOP flow-through',
        ],
        topicsVi: [
          'Tại sao doanh thu tăng $150,000 nhưng GOP chỉ tăng $18,000 (Case 12% Flow-Through)',
          'Đường cong Chi phí Cố định (Fixed), Bán biến đổi (Semi-variable) và Biến đổi (Variable) trong khách sạn',
          'Ngưỡng chuẩn Flow-Through từng bộ phận: Rooms (70-80%), F&B (35-45%), Total Hotel (50-65%)',
        ],
        topicsEn: [
          'Why $150k extra revenue yielded only $18k GOP (12% Flow-Through diagnostic)',
          'Fixed, Semi-Variable, and Variable cost behavior across hotel departments',
          'Departmental Flow-Through Benchmarks: Rooms (70-80%), F&B (35-45%), Total GOP (50-65%)',
        ],
        keyStandardsAndFormulas: [
          'Flow-Through % (When ΔRev > 0) = ΔGOP / ΔTotal Revenue x 100 (Target >= 50%)',
          'Flex % (When ΔRev < 0) = [1 - (|ΔGOP| / |ΔTotal Revenue|)] x 100 = Cost Saved / |ΔRevenue| x 100 (Target >= 35%)',
        ],
        practicalLabVi: 'Tính toán Flow-Through và Flex cho 6 bộ phận của khách sạn trong 2 quý (Mùa cao điểm vs Mùa thấp điểm).',
        practicalLabEn: 'Compute Departmental Flow-Through & Flex across peak and shoulder quarters for 6 hotel outlets.',
        deliverablesVi: ['Bảng tính Flow-Through & Flex 6 Bộ phận'],
        deliverablesEn: ['6-Department Flow-Through & Flex Matrix'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Bóc tách Phương sai Giá bán (Rate) vs Sản lượng (Volume) & Chi phí Hiệu suất',
        titleEn: 'Session 2: Rate vs. Volume Variance & Cost Efficiency Decomposition',
        durationHours: 5,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Phân tách biến động doanh thu thành Rate/Price Variance và Volume/Occupancy Variance',
          'Phân biệt biến động chi phí do thay đổi sản lượng (Activity Flexed Budget) vs do kém hiệu quả vận hành (Efficiency Variance)',
        ],
        learningOutcomesEn: [
          'Decompose top-line variances into ADR/Rate Variance and Occupancy/Volume Variance',
          'Isolate Activity Volume effects from True Operational Efficiency using Flexed Budgets',
        ],
        topicsVi: [
          'Mô hình Flexible Budget: Tại sao không thể so sánh chi phí thực tế với Static Budget khi công suất tăng/giảm',
          'Đánh giá biến động Rooms Expense: Giặt là, đồ dùng khách (Guest Supplies), hoa hồng OTA theo phòng bán',
          'Đánh giá Undistributed Overheads: A&G, S&M, POM, Energy trên mỗi phòng sẵn có (PAR - Per Available Room)',
        ],
        topicsEn: [
          'Static vs. Flexed Budget comparisons for variable departmental costs',
          'Rooms Expense diagnostics: Laundry per occupied room, Amenities POR, OTA commission mix',
          'Undistributed Overhead benchmarking on a Per Available Room (PAR) basis',
        ],
        keyStandardsAndFormulas: [
          'Volume Variance = (Actual Room Nights - Budget Room Nights) x Budget ADR',
          'Rate Variance = (Actual ADR - Budget ADR) x Actual Room Nights',
          'Cost Per Occupied Room (CPOR) = Rooms Departmental Expense / Occupied Room Nights',
        ],
        practicalLabVi: 'Lập Biểu đồ Waterfall phân tích bóc tách chi tiết chênh lệch GOP giữa Actual và Budget tháng 7.',
        practicalLabEn: 'Build a GOP Variance Waterfall decomposing Rate, Volume, Mix, and Efficiency drivers.',
        deliverablesVi: ['Workbook Rate vs Volume & Flexed P&L Bridge'],
        deliverablesEn: ['Rate vs. Volume & Flexed P&L Bridge Workbook'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Quản trị Năng suất Lao động (HPOR, Covers/Hour) & Kiểm soát Overtime',
        titleEn: 'Session 3: Labor Cost Analytics, HPOR Productivity & Dynamic Scheduling',
        durationHours: 5,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Đo lường năng suất lao động theo giờ công thực tế: HPOR (Housekeeping Hours Per Occupied Room) và Covers per Labor Hour',
          'Thiết kế mô hình định biên nhân công linh hoạt (Dynamic Manning) giúp cắt giảm 8% chi phí làm thêm giờ & thuê ngoài',
        ],
        learningOutcomesEn: [
          'Calculate operational labor productivity KPIs: HPOR (Rooms) and Covers per Labor Hour (F&B)',
          'Deploy Dynamic Manning rosters cutting unnecessary overtime and casual agency spend by 8%',
        ],
        topicsVi: [
          'Phân tích Payroll Dashboard: Regular Hours vs Overtime Hours vs Casual/Outsourced Labor',
          'Định mức chuẩn: 0.45 - 0.60 giờ/phòng cho Buồng phòng; 16-20 phòng/ca 8 giờ cho Room Attendant',
          'Tối ưu ca gãy (Split Shifts) và nhân sự thời vụ trong tiệc Banquet/F&B',
        ],
        topicsEn: [
          'Payroll Analytics: Regular vs. Overtime vs. Contracted Labor cost per hour',
          'Industry HPOR standards (0.45-0.60 hrs/occupied room) & Room Attendant credit matrices',
          'Split-shift optimization & Banquet casual pooling',
        ],
        keyStandardsAndFormulas: [
          'HPOR = Total Housekeeping Productive Hours / Total Occupied Room Nights',
          'Covers Per Labor Hour = Total Restaurant Covers Served / Total Service & Kitchen Hours Worked',
        ],
        practicalLabVi: 'Phân tích bảng chấm công 4 tuần của bộ phận Buồng phòng & Bếp để tìm lãng phí 420 giờ Overtime.',
        practicalLabEn: 'Audit 4 weeks of biometric timecards across Housekeeping & Kitchen to eliminate 420 overtime hours.',
        deliverablesVi: ['Mô hình Phân tích Năng suất HPOR & Lịch trình Dynamic Manning'],
        deliverablesEn: ['HPOR Productivity Diagnostic & Dynamic Manning Model'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Khủng hoảng Flow-Through 12% & Bản Giải trình P&L Critique cho GM',
        titleEn: 'Session 4: Solving the 12% Flow-Through Crisis & Executive P&L Critique',
        durationHours: 4,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Tìm ra nguyên nhân gốc rễ khi công suất tăng nhưng GOP sụt giảm (ADR dilution + Overtime + OTA + Food Waste)',
          'Soạn thảo bản P&L Critique 4 trang & Kế hoạch 30 ngày lấy lại biên lợi nhuận đạt >= 85% điểm',
        ],
        learningOutcomesEn: [
          'Diagnose root causes behind occupancy surges accompanied by GOP erosion',
          'Author a crisp 4-page Executive P&L Critique & 30-day profit recovery roadmap (>=85% exam score)',
        ],
        topicsVi: [
          'Thảo luận Case Study HFC-401 & OJT-BPA-01: Công suất tăng 8% nhưng GOP giảm 5%',
          'Thiết lập Ngưỡng Giá sàn Nhóm (Group Hurdle Rate) chống phá giá mùa cao điểm',
          'Thi cuối khóa HFC-401',
        ],
        topicsEn: [
          'Resolving the HFC-401 / OJT-BPA-01 Occupancy-Up / GOP-Down Paradox',
          'Implementing Group Minimum Hurdle Rates',
          'HFC-401 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'Group Hurdle Rate = Variable Room Cost + Displacement Net Revenue Loss + Group Concession Costs',
        ],
        practicalLabVi: 'Hoàn thiện bản P&L Critique Memo chuẩn bị cho OJT-BPA-01.',
        practicalLabEn: 'Draft the Executive P&L Critique Memo aligned to OJT-BPA-01.',
        deliverablesVi: ['Bản P&L Critique & Kế hoạch Hành động 30 ngày', 'Bài thi >= 85%'],
        deliverablesEn: ['P&L Critique & 30-Day Recovery Plan', 'Final Exam (>=85%)'],
      },
    ],
  },

  'HFC-402': {
    courseCode: 'HFC-402',
    overviewVi:
      'Kết nối Tài chính với Quản trị Doanh thu (Revenue Management): Giải mã chuyên sâu Báo cáo Cạnh tranh STR (MPI, ARI, RGI), tính toán Giá phòng Ròng thực thu (Net ADR & Net RevPAR) sau hoa hồng OTA/GDS/Loyalty và xây dựng chiến lược dịch chuyển kênh bán tối đa hóa GOP.',
    overviewEn:
      'Bridges Finance and Revenue Management: decoding STR competitive benchmarks (MPI, ARI, RGI), computing True Net ADR & Net RevPAR after OTA/GDS/acquisition costs, and driving channel-shift profitability for maximum GOP.',
    targetAudienceVi: 'Financial Controller, Assistant FC, Revenue Manager, Director of Finance & Revenue',
    targetAudienceEn: 'Financial Controllers, Assistant FCs, Revenue Managers, Commercial Analysts',
    careerTrackStageVi: 'Giai đoạn 3 -> 4: Trợ Lý FC -> FC -> Đối Tác Chiến Lược',
    careerTrackStageEn: 'Stage 3 -> 4: Assistant FC -> FC -> Strategic Business Partner',
    competencyCodes: ['BPA-02', 'SBP-01'],
    deliveryFormatVi: 'STR Analytics Workshop (4h) · Net ADR & OTA Cost Lab (8h) · Channel Shift Case Study (4h)',
    deliveryFormatEn: 'STR Intelligence Workshop (4h) · Net ADR Modeling Lab (8h) · Channel Shift Case (4h)',
    totalContactHours: 10,
    totalSelfStudyHours: 6,
    assessmentBreakdown: {
      quizWeight: 30,
      caseStudyWeight: 35,
      practicalOjtWeight: 35,
      passingScore: 80,
    },
    preWorkVi: 'Chuẩn bị 01 bản Báo cáo STR Monthly/Weekly gần nhất và cơ cấu doanh thu phòng theo Source/Channel tháng qua.',
    preWorkEn: 'Bring a sample Monthly STR Benchmark Report and your property Room Revenue by Channel Mix report.',
    referencesAndStandards: [
      'STR Global Competitive Set Benchmarking Methodology (MPI, ARI, RGI)',
      'Kalibri Labs — Net Revenue & Cost of Guest Acquisition Framework',
      'HSMAI Finance & Revenue Management Synergy Playbook',
    ],
    capstoneDeliverableVi: 'Ma trận Chi phí Phân phối 7 Kênh bán (Net ADR & Net GOP Contribution) + Kế hoạch dịch chuyển kênh khi RGI 115%.',
    capstoneDeliverableEn: '7-Channel Cost of Distribution Matrix (Net ADR & GOP Contribution) + RGI 115% Channel Shift Playbook.',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Giải mã Báo cáo STR (MPI, ARI, RGI) & Phân tích Thị phần Đối thủ',
        titleEn: 'Session 1: Decoding STR Reports (MPI, ARI, RGI) & Comp Set Positioning',
        durationHours: 4,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Tính toán và diễn giải bộ ba chỉ số STR: MPI (Occupancy Index), ARI (ADR Index), RGI (RevPAR Index)',
          'Phát hiện chiến lược "Mua Công suất bằng Phá giá" (MPI > 110 nhưng ARI < 90) gây tổn hại lợi nhuận',
        ],
        learningOutcomesEn: [
          'Calculate and interpret MPI, ARI, and RGI against the property competitive set',
          'Spot destructive "buying occupancy via rate discounting" traps (High MPI, Low ARI)',
        ],
        topicsVi: [
          'Cách chọn Comp Set chuẩn xác (vị trí, hạng sao, số phòng, phân khúc tương đồng)',
          'Chỉ số mở rộng: TRevPAR (Total RevPAR), GOPPAR (GOP Per Available Room) và ARPAR',
          'Đọc biểu đồ STR Trend theo thứ trong tuần (Weekday Corporate vs Weekend Leisure)',
        ],
        topicsEn: [
          'Competitive Set validation principles and STR data integrity',
          'Beyond RevPAR: TRevPAR, NRevPAR, and GOPPAR profitability hierarchy',
          'Day-of-week STR index diagnostics (Corporate Tue-Wed vs. Leisure Fri-Sat)',
        ],
        keyStandardsAndFormulas: [
          'MPI = (Hotel Occupancy / Comp Set Occupancy) x 100',
          'ARI = (Hotel ADR / Comp Set ADR) x 100',
          'RGI = (Hotel RevPAR / Comp Set RevPAR) x 100 = (MPI x ARI) / 100',
        ],
        practicalLabVi: 'Phân tích bộ số liệu STR 12 tháng của khách sạn và viết nhận định vị thế cạnh tranh cho GM.',
        practicalLabEn: 'Analyze a 12-month STR competitive report and draft an executive positioning summary.',
        deliverablesVi: ['Báo cáo Phân tích STR Comp Set 12 tháng'],
        deliverablesEn: ['12-Month STR Competitive Intelligence Summary'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Chi phí Thu hút Khách hàng (CAC) & Tính Net ADR Thực thu theo Kênh',
        titleEn: 'Session 2: Guest Acquisition Cost (CAC) & True Net ADR by Channel',
        durationHours: 4,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Bóc tách toàn bộ chi phí ẩn của từng kênh bán: Hoa hồng OTA (15-25%), Phí GDS, Phí Loyalty, Phí thẻ tín dụng, Chi phí Paid Search',
          'Xếp hạng các kênh từ cao xuống thấp theo Net ADR Contribution thực tế vào GOP',
        ],
        learningOutcomesEn: [
          'Quantify full distribution deductions: OTA commissions (15-25%), GDS fees, loyalty points, merchant fees, digital ad spend',
          'Rank all booking channels by True Net ADR and Net GOP Contribution',
        ],
        topicsVi: [
          'Ma trận 7 kênh: Brand.com Direct, Voice/Walk-in, Corporate Negotiated, OTA Retail, OTA Wholesale/B2B, GDS, Tour Operator',
          'Tại sao $160 trên Brand.com sinh lời hơn $180 trên kênh OTA hoa hồng 22%?',
          'Chi phí biến đổi phòng (Housekeeping/Utilities/Breakfast) trong bài toán Net GOPPAR',
        ],
        topicsEn: [
          '7-Channel Economics: Direct Web, Voice, Corporate, OTA Retail, OTA Wholesale, GDS, Tour Series',
          'Proving why a $160 Direct booking nets higher GOP than a $180 22%-commission OTA booking',
          'Marginal servicing costs inside Net GOPPAR contribution',
        ],
        keyStandardsAndFormulas: [
          'Net ADR = Gross ADR - Direct Commission - Transaction/GDS Fee - Loyalty Cost - Marginal Variable Cost',
          'Channel Net Flow % = Net ADR / Gross ADR x 100 (Direct Web ~93-95% vs. High-Comm OTA ~72-76%)',
        ],
        practicalLabVi: 'Xây dựng Bảng tính So sánh Chi phí Phân phối 7 Kênh và tính lại Tỷ suất GOP thực cho từng kênh.',
        practicalLabEn: 'Build the 7-Channel Distribution Cost Matrix computing Net ADR and Channel GOP%.',
        deliverablesVi: ['File Excel Ma trận Net ADR & Chi phí Phân phối 7 Kênh'],
        deliverablesEn: ['7-Channel Net ADR & Distribution Cost Matrix'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Cộng tác Chiến lược FC - Director of Revenue & Tối ưu TRevPAR',
        titleEn: 'Session 3: FC & Revenue Director Synergy — Total Hotel Revenue Optimization',
        durationHours: 4,
        format: 'Live Workshop',
        learningOutcomesVi: [
          'Chuyển đổi cuộc họp Yield Meeting từ chỉ nhìn RevPAR sang nhìn tổng lợi nhuận TRevPAR & GOPPAR',
          'Đánh giá hiệu quả khuyến mãi "Room + Spa/F&B Credit" dựa trên tổng chi tiêu tại khách sạn (Total Guest Spend)',
        ],
        learningOutcomesEn: [
          'Shift weekly Revenue Strategy Meetings from vanity RevPAR to GOPPAR & Total Guest Profitability',
          'Model ancillary spend lift (F&B, Banquet, Spa) in customer lifetime value pricing decisions',
        ],
        topicsVi: [
          'Hợp tác giữa FC và DoR trong quản trị chính sách giá sàn (Length-of-Stay restrictions, Overbooking buffer)',
          'Phân tích đóng góp phụ trợ (Ancillary Capture) của khách Corporate vs Khách Leisure vs Khách Hội nghị',
        ],
        topicsEn: [
          'Joint FC-DoR governance on Overbooking ceilings, Minimum Length of Stay, and Group Hurdles',
          'Ancillary F&B/Spa Spend Profiles by Market Segment',
        ],
        keyStandardsAndFormulas: [
          'TRevPAR = Total Operating Revenue / Total Available Rooms',
          'GOPPAR = Gross Operating Profit / Total Available Rooms',
        ],
        practicalLabVi: 'Thiết kế Scorecard Phối hợp Hàng tuần giữa FC và Giám đốc Doanh thu (Commercial Scorecard).',
        practicalLabEn: 'Design a joint Weekly Commercial Finance-Revenue Scorecard.',
        deliverablesVi: ['Commercial Revenue-Finance Weekly Scorecard'],
        deliverablesEn: ['Joint Revenue-Finance Weekly Scorecard'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Case Study RGI 115% Hoa hồng OTA Tăng $40k & Thi Đánh giá',
        titleEn: 'Session 4: RGI 115% Commission Overhang Case Study & Final Exam',
        durationHours: 4,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Xử lý bài toán dẫn đầu thị trường (RGI 115%) nhưng lợi nhuận bị bào mòn bởi hoa hồng OTA 19.5%',
          'Đạt >= 80% bài thi cuối khóa',
        ],
        learningOutcomesEn: [
          'Engineer a direct-booking pivot when RGI is 115% but OTA commissions erode GOP at 19.5%',
          'Pass HFC-402 Assessment (>=80%)',
        ],
        topicsVi: [
          'Case Study Khách sạn 320 phòng: Triển khai Member Exclusive Rates & Direct Book Value-Adds ($15 F&B Credit)',
          'Đo lường ROI của chiến dịch giảm lệ thuộc OTA sau 90 ngày',
          'Thi cuối khóa HFC-402',
        ],
        topicsEn: [
          '320-Key Urban Case: Launching Member Exclusive Rates & $15 Direct F&B Credits without losing volume',
          '90-Day Commission Savings ROI Measurement',
          'HFC-402 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'Net Savings from 5% Channel Shift = Reclaimed Room Revenue x (OTA Comm 20% - Direct Promo Cost 6%)',
        ],
        practicalLabVi: 'Mô phỏng dịch chuyển 10% công suất từ OTA sang Direct Website và tính chính xác $ GOP tăng thêm.',
        practicalLabEn: 'Simulate a 10% room-night shift from OTA to Direct Web, quantifying net GOP accretion.',
        deliverablesVi: ['Kế hoạch Dịch chuyển Kênh Bán 90 ngày', 'Bài thi >= 80%'],
        deliverablesEn: ['90-Day Channel Mix Shift Plan', 'Final Exam (>=80%)'],
      },
    ],
  },

  'HFC-403': {
    courseCode: 'HFC-403',
    overviewVi:
      'Ứng dụng Business Intelligence (Excel Power Query & Power BI) để tự động hóa báo cáo vận hành khách sạn: Xây dựng đường ống kết nối dữ liệu từ PMS (Opera), POS (Micros/Simphony) và ERP, thiết kế Daily Executive Flash Dashboard thời gian thực và cảnh báo ngoại lệ tự động giúp cắt giảm 2 giờ làm việc thủ công mỗi sáng.',
    overviewEn:
      'Applies Hospitality Business Intelligence (Power Query & Power BI) to automate hotel reporting pipelines across PMS, POS, and ERP systems—delivering real-time Daily Executive Flash Dashboards and anomaly alerts that eliminate 2 hours of daily manual work.',
    targetAudienceVi: 'Financial Analyst, Finance Systems Manager, Assistant FC, Financial Controller',
    targetAudienceEn: 'Finance Analysts, Systems Accountants, Assistant FCs, Financial Controllers',
    careerTrackStageVi: 'Giai đoạn 3: Năng lực Công nghệ & Dữ liệu cho AFC & FC Hiện đại',
    careerTrackStageEn: 'Stage 3: Modern Digital & BI Analytics Track for AFC & FC',
    competencyCodes: ['BPA-05', 'FAR-05'],
    deliveryFormatVi: 'Hotel Data Architecture (4h) · Power Query ETL Lab (6h) · Power BI Executive Dashboard Lab (6h) · Automation Case (4h)',
    deliveryFormatEn: 'Data Architecture (4h) · Power Query ETL Lab (6h) · Power BI Dashboarding Lab (6h) · Automation Case (4h)',
    totalContactHours: 12,
    totalSelfStudyHours: 8,
    assessmentBreakdown: {
      quizWeight: 20,
      caseStudyWeight: 35,
      practicalOjtWeight: 45,
      passingScore: 85,
    },
    preWorkVi: 'Cài đặt Microsoft Excel (bản có Power Query) hoặc Power BI Desktop và chuẩn bị 03 file CSV mẫu từ hệ thống PMS/POS.',
    preWorkEn: 'Ensure Excel with Power Query and/or Power BI Desktop is installed, with 3 sample daily PMS/POS CSV exports.',
    referencesAndStandards: [
      'Hospitality Star-Schema Data Modeling (Fact Revenue/Payroll vs. Dim Date/Department/Outlet)',
      'Power Query M-Code & DAX Measures for Hotel KPIs (RevPAR, ADR, GOP%, Flow-Through)',
      'Executive Daily Flash Report Best Practices',
    ],
    capstoneDeliverableVi: 'Hệ thống Daily Executive Flash Dashboard tự động hóa bằng Power Query/BI xuất báo cáo lúc 07:30 sáng kèm bộ chỉ số DAX.',
    capstoneDeliverableEn: 'Automated Daily Executive Flash Dashboard (Power Query + DAX Measures) refreshing by 07:30 AM daily.',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Kiến trúc Dữ liệu Khách sạn (PMS - POS - ERP) & Star Schema',
        titleEn: 'Session 1: Hotel Data Architecture (PMS/POS/ERP) & Star Schema Modeling',
        durationHours: 4,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Hiểu dòng chảy dữ liệu giữa PMS (Opera/Cloudbeds), POS (Simphony), Procurement (MC/BirchStreet) và Kế toán ERP',
          'Thiết kế mô hình dữ liệu hình sao (Fact & Dimension Tables) chuẩn mực cho chuỗi nhiều khách sạn',
        ],
        learningOutcomesEn: [
          'Map data integration touchpoints across PMS, POS, Purchasing, Timekeeping, and General Ledger ERP',
          'Design scalable Star-Schema models (Fact_DailyStats, Dim_Calendar, Dim_Department, Dim_Property)',
        ],
        topicsVi: [
          'Các loại dữ liệu thô: Night Audit Trial Balance CSV, Reservation OTB XML, POS Check Detail, Biometric Timecards',
          'Chuẩn hóa mã tài khoản (Mapping Keys) và Lịch tài chính 12 tháng / Same-Store Comparison',
        ],
        topicsEn: [
          'Source extracts: Night Audit CSV, OTB Pickup dumps, POS Item Mix, Timekeeping punches',
          'Master Dimension tables & Calendar keys (MTD, YTD, Same-Day Last Year)',
        ],
        keyStandardsAndFormulas: [
          'Single Source of Truth Rule: Zero manual copy-paste cells in production BI dashboards',
        ],
        practicalLabVi: 'Vẽ sơ đồ Kiến trúc ETL và chuẩn hóa bảng Dimension cho khách sạn 450 phòng có 6 nhà hàng.',
        practicalLabEn: 'Design the Star-Schema ERD and Dimension mapping tables for a 450-key multi-outlet hotel.',
        deliverablesVi: ['Sơ đồ Kiến trúc Dữ liệu & Bảng Mapping Master Dimensions'],
        deliverablesEn: ['Hotel BI Star-Schema Diagram & Master Dimension Sheet'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Tự động hóa Làm sạch & Hợp nhất Dữ liệu với Power Query',
        titleEn: 'Session 2: Automated Data Ingestion & Cleansing via Power Query',
        durationHours: 6,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Kết nối thư mục (Folder Connector) tự động gộp hàng trăm file Night Audit hàng ngày chỉ bằng 1 nút Refresh',
          'Xử lý lỗi định dạng ngày tháng, khoảng trắng, Unpivot bảng chéo và tách cột mã tài khoản tự động',
        ],
        learningOutcomesEn: [
          'Build automated Folder-Ingestion Power Query pipelines combining daily Night Audit files in one click',
          'Clean messy ERP/PMS exports via Unpivot, dynamic date parsing, and error-proof transformations',
        ],
        topicsVi: [
          'Gộp 7 báo cáo PMS/POS khác nhau tự động mà không cần VBA phức tạp',
          'Tạo Lookup Table map tự động Outlet POS sang USALI Department',
          'Thiết lập kiểm tra Data Integrity Check tự động cảnh báo thiếu file ngày',
        ],
        topicsEn: [
          'Combining 7 disparate morning reports without fragile macros',
          'Dynamic POS Outlet to USALI Cost Center merges',
          'Automated missing-date & reconciliation checksum alerts',
        ],
        keyStandardsAndFormulas: [
          'Power Query Pipeline: Extract -> Clean Headers -> Unpivot -> Merge Mapping -> Load to Data Model',
        ],
        practicalLabVi: 'Xây dựng quy trình Power Query tự động đọc 30 file báo cáo doanh thu ngày từ 1 thư mục nguồn.',
        practicalLabEn: 'Build an end-to-end Power Query pipeline ingesting 30 daily CSV files from a single folder.',
        deliverablesVi: ['File Power Query ETL tự động hóa nhập dữ liệu PMS/POS'],
        deliverablesEn: ['Automated Power Query PMS/POS ETL Pipeline'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Viết Công thức DAX & Thiết kế Executive Daily Flash Dashboard',
        titleEn: 'Session 3: Hospitality DAX Measures & Executive Daily Flash Dashboard Design',
        durationHours: 6,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Viết bộ công thức DAX chuyên ngành: RevPAR, ADR, MTD vs Budget, YoY Pace, Rolling 7-Day Moving Average',
          'Thiết kế giao diện Dashboard tối giản, trực quan chuẩn Ban Điều hành (Executive Storytelling Layout)',
        ],
        learningOutcomesEn: [
          'Write essential Hospitality DAX measures: RevPAR, ADR, MTD/YTD vs. Budget, OTB Pace, 7-Day Rolling Avg',
          'Apply clean visual hierarchy principles for 5-second morning GM readability',
        ],
        topicsVi: [
          'Hàm Time Intelligence trong Power BI (DATESMTD, SAMEPERIODLASTYEAR, TOTALYTD)',
          'Thiết kế 4 trang Dashboard: GM Morning Flash, Rooms & OTB Pace, F&B Cost & Cover Analytics, Payroll Overtime Monitor',
          'Cảnh báo màu điều kiện (Conditional Formatting) khi Food Cost > 32% hoặc Flow-Through < 45%',
        ],
        topicsEn: [
          'DAX Time Intelligence (DATESMTD, SAMEPERIODLASTYEAR, TOTALYTD)',
          '4-Page Executive Report Suite: GM Flash, Rooms Pace, F&B Covers, Labor Overtime',
          'Dynamic Red/Amber threshold alerts on Food Cost and GOP Flow-Through',
        ],
        keyStandardsAndFormulas: [
          'DAX RevPAR = DIVIDE(SUM(Fact_Daily[Rooms_Rev]), SUM(Fact_Daily[Available_Rooms]), 0)',
          'DAX GOP% = DIVIDE([Total_GOP], [Total_Revenue], 0)',
        ],
        practicalLabVi: 'Xây dựng Daily Executive Flash Dashboard tương tác hoàn chỉnh có bộ lọc theo Tháng, Outlet và Phân khúc.',
        practicalLabEn: 'Build an interactive Daily Executive Flash Dashboard with dynamic Outlet & Segment slicers.',
        deliverablesVi: ['Dashboard Điều hành Tài chính Khách sạn (Excel BI / Power BI)'],
        deliverablesEn: ['Interactive Hotel Daily Executive Flash Dashboard'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Case Study Cắt giảm 2 Giờ Thủ công Mỗi sáng & Thi Đánh giá',
        titleEn: 'Session 4: 07:30 AM Flash Automation Case Study & Final Assessment',
        durationHours: 4,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Triển khai thành công quy trình xuất Daily Flash Report lúc 07:30 sáng thay vì 10:30 sáng cho khách sạn 450 phòng',
          'Hoàn thành bài thi >= 85%',
        ],
        learningOutcomesEn: [
          'Transition a 450-key property from 10:30 AM manual spreadsheets to an audited 07:30 AM BI Flash',
          'Pass HFC-403 Assessment (>=85%)',
        ],
        topicsVi: [
          'Case Study HFC-403: Giải phóng 2.5 giờ mỗi sáng cho nhân sự kế toán chuyển sang phân tích giá trị cao',
          'Bảo mật phân quyền xem báo cáo (Row-Level Security) cho từng Trưởng bộ phận',
          'Thi cuối khóa HFC-403',
        ],
        topicsEn: [
          'HFC-403 Case: Reclaiming 2.5 hours daily across 6 F&B outlets via Power Query automation',
          'Row-Level Security (RLS) governance for Division Heads',
          'HFC-403 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'Automation Time ROI = (2.5 hrs/day x 365 days) = 912 Finance Hours Reclaimed Annually per Property',
        ],
        practicalLabVi: 'Trình bày Dashboard hoàn thiện và thiết lập lịch Auto-Refresh kèm Checklist kiểm tra sai số trước 07:30.',
        practicalLabEn: 'Present final Dashboard with pre-07:30 AM data validation checklist.',
        deliverablesVi: ['Hồ sơ Triển khai Tự động hóa Flash Report', 'Bài thi >= 85%'],
        deliverablesEn: ['07:30 AM Flash Automation Pack', 'Final Exam (>=85%)'],
      },
    ],
  },

  // =========================================================================
  // DOMAIN 5: LEADERSHIP & PEOPLE MANAGEMENT (D5-LPM)
  // =========================================================================
  'HFC-501': {
    courseCode: 'HFC-501',
    overviewVi:
      'Chuyển hóa tư duy từ Chuyên viên Kỹ thuật Kế toán sang Nhà Lãnh đạo Tài chính Truyền cảm hứng: Xây dựng văn hóa chính trực & hiệu suất cao, thực hành Huấn luyện 1-1 theo mô hình GROW, thiết kế Kế hoạch Phát triển Cá nhân (IDP) và quy hoạch đội ngũ kế thừa AFC/FC.',
    overviewEn:
      'Transforms technical controllers into inspirational hospitality finance leaders: building high-integrity team culture, mastering 1-on-1 GROW coaching conversations, crafting actionable Individual Development Plans (IDP), and building a resilient AFC/FC succession bench.',
    targetAudienceVi: 'Senior Accountant, Assistant Financial Controller, Financial Controller',
    targetAudienceEn: 'Senior Accountants, Assistant Financial Controllers, Financial Controllers',
    careerTrackStageVi: 'Giai đoạn 3 -> 4: Trợ Lý FC -> Giám Đốc Tài Chính -> Lãnh Đạo Chuỗi',
    careerTrackStageEn: 'Stage 3 -> 4: Assistant FC -> Financial Controller -> Cluster Leader',
    competencyCodes: ['LPM-01', 'LPM-02'],
    deliveryFormatVi: 'Leadership Seminars (4h) · GROW Coaching Role-Play (6h) · Succession & IDP Workshop (6h)',
    deliveryFormatEn: 'Leadership Seminars (4h) · GROW Coaching Role-Plays (6h) · IDP Succession Lab (6h)',
    totalContactHours: 10,
    totalSelfStudyHours: 6,
    assessmentBreakdown: {
      quizWeight: 25,
      caseStudyWeight: 35,
      practicalOjtWeight: 40,
      passingScore: 80,
    },
    preWorkVi: 'Đánh giá ma trận năng lực hiện tại của 3 nhân viên cấp dưới trực tiếp và liệt kê điểm mạnh/khoảng trống của từng người.',
    preWorkEn: 'Review current performance profiles of 3 direct finance reports, listing key technical strengths and leadership gaps.',
    referencesAndStandards: [
      'John Whitmore — GROW Coaching Methodology for Finance Leaders',
      '70-20-10 Enterprise Talent Development Framework',
      'FC Learning Academy 6-Domain Competency & Succession Rubric',
    ],
    capstoneDeliverableVi: 'Kế hoạch Phát triển Kế thừa 12 Tháng (Succession IDP) cho Senior Accountant lên Assistant FC + Kịch bản Coaching GROW.',
    capstoneDeliverableEn: '12-Month Senior-to-AFC Succession IDP Roadmap + Recorded/Documented GROW Coaching Session Script.',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Chuyển hóa Tư duy Lãnh đạo & Văn hóa Chính trực Bộ phận Tài chính',
        titleEn: 'Session 1: Mindset Shift — From Technical Technician to Finance Team Leader',
        durationHours: 4,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Nhận diện 4 cạm bẫy khiến Kế toán trưởng giỏi kỹ thuật thất bại khi làm FC (ôm việc, thiếu tin tưởng, giao tiếp khô khan)',
          'Thiết lập OKRs/KPIs minh bạch và công bằng cho từng vị trí AR, AP, Cost, Income Audit, Payroll',
        ],
        learningOutcomesEn: [
          'Avoid the 4 pitfalls derailing technically strong controllers (micromanagement, hoarding tasks, transactional tone)',
          'Establish fair, measurable quarterly KPIs across AR, AP, Cost Control, Income Audit, and General Ledger teams',
        ],
        topicsVi: [
          'Lãnh đạo phục vụ (Servant Leadership) trong phòng Tài chính: Làm sao để đội ngũ coi kỳ khóa sổ là niềm tự hào thay vì ác mộng',
          'Xây dựng Bộ Quy tắc Chính trực (Finance Ethics Charter) và bảo vệ nhân viên trước áp lực sai trái',
          'Kỹ năng ủy quyền hiệu quả (Strategic Delegation) có kiểm soát rủi ro',
        ],
        topicsEn: [
          'Servant Leadership in Hospitality Finance: Elevating month-end close morale',
          'Establishing a non-negotiable Finance Ethics Charter',
          'Smart Delegation Matrix: What FC keeps vs. delegates to AFC/Chief Accountant',
        ],
        keyStandardsAndFormulas: [
          'Target Team Engagement Score >= 85% | Cross-Trained Backup Coverage = 100% of Critical Desks',
        ],
        practicalLabVi: 'Xây dựng Bảng Giao việc Ủy quyền (Delegation Matrix) và KPI quý cho phòng kế toán 12 nhân sự.',
        practicalLabEn: 'Create a Delegation Matrix and Quarterly KPI Scorecard for a 12-person hotel finance team.',
        deliverablesVi: ['Bảng Phân quyền Ủy quyền & Bộ KPI Phòng Tài chính'],
        deliverablesEn: ['Finance Delegation Matrix & Team KPI Scorecard'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Thực hành Huấn luyện 1-1 Theo Mô hình GROW & Phản hồi Xây dựng',
        titleEn: 'Session 2: Mastering 1-on-1 GROW Coaching & Constructive Feedback',
        durationHours: 4,
        format: 'Live Workshop',
        learningOutcomesVi: [
          'Thực hiện buổi Coaching 1-1 chuyên nghiệp theo 4 bước GROW (Goal - Reality - Options - Will)',
          'Cung cấp phản hồi theo mô hình SBI (Situation - Behavior - Impact) giúp nhân viên thay đổi hành vi tích cực',
        ],
        learningOutcomesEn: [
          'Lead structured 30-minute 1-on-1 GROW coaching sessions unlocking employee ownership',
          'Deliver difficult performance feedback constructively using the SBI (Situation-Behavior-Impact) framework',
        ],
        topicsVi: [
          'Sự khác biệt giữa "Cầm tay chỉ việc" (Telling/Directing) vs "Khai vấn phát triển" (Coaching)',
          'Ngân hàng 20 câu hỏi khai vấn mạnh mẽ dành cho nhân sự kế toán khách sạn',
          'Đóng vai (Role-play) xử lý tình huống nhân viên giỏi chuyên môn nhưng hay trễ deadline hoặc ngại họp với Trưởng bộ phận',
        ],
        topicsEn: [
          'Telling vs. Coaching: Building independent analytical thinking in senior accountants',
          '20 High-Impact GROW Coaching Questions for Finance Professionals',
          'Role-play: Coaching a detail-obsessed accountant struggling with executive confidence',
        ],
        keyStandardsAndFormulas: [
          'Coaching Cadence: Bi-weekly 30-min 1-on-1 for direct reports + Quarterly Formal Career Review',
        ],
        practicalLabVi: 'Thực hành cặp đôi Role-Play một phiên GROW 20 phút và điền Biên bản Coaching 1-1 chuẩn.',
        practicalLabEn: 'Execute a 20-minute paired GROW Coaching role-play and log action commitments.',
        deliverablesVi: ['Biên bản Coaching GROW 1-1 & Kế hoạch cam kết 30 ngày'],
        deliverablesEn: ['GROW 1-on-1 Coaching Log & 30-Day Commitment Sheet'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Thiết kế IDP 70-20-10 & Quy hoạch Nhân sự Kế thừa (Succession Bench)',
        titleEn: 'Session 3: Designing 70-20-10 IDPs & Building the FC Succession Bench',
        durationHours: 4,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Đánh giá nhân sự bằng Lưới 9 Ô (9-Box Performance-Potential Grid) để nhận diện High-Potential',
          'Thiết kế IDP cân bằng tỷ lệ vàng: 70% Thử thách thực tế (Stretch Assignments) - 20% Kèm cặp (Mentoring) - 10% Khóa học',
        ],
        learningOutcomesEn: [
          'Calibrate finance talent on the 9-Box Performance vs. Potential Matrix',
          'Build actionable IDPs following the 70% On-the-Job Stretch / 20% Mentoring / 10% Formal Coursework ratio',
        ],
        topicsVi: [
          'Lộ trình luân chuyển công việc (Cross-Desk Rotation): AR -> Cost Control -> Income Audit -> General Ledger -> AFC',
          'Xác định "Bench Strength": Phải đào tạo tối thiểu 1 nhân sự sẵn sàng thay thế mình trong vòng 12 tháng mới được thăng tiến',
        ],
        topicsEn: [
          'Cross-desk job rotation roadmaps feeding the AFC & FC pipeline',
          'Succession Readiness Rule: Ready Now vs. Ready in 6-12 Months vs. Emerging Talent',
        ],
        keyStandardsAndFormulas: [
          '70-20-10 Mix: 70% OJT Projects + 20% GM/FC Shadowing + 10% Academy Courses',
        ],
        practicalLabVi: 'Lập bản đồ 9-Box cho 8 nhân viên phòng tài chính giả định và thiết kế IDP cho 2 ứng viên tiềm năng nhất.',
        practicalLabEn: 'Plot an 8-person team on the 9-Box Grid and design 12-month IDPs for top 2 successors.',
        deliverablesVi: ['Lưới Đánh giá Nhân tài 9-Box & Bộ IDP Kế thừa'],
        deliverablesEn: ['9-Box Talent Calibration Matrix & Succession IDPs'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Case Study Thăng tiến Senior Accountant lên AFC & Thi Đánh giá',
        titleEn: 'Session 4: 12-Month AFC Acceleration Case Study & Final Exam',
        durationHours: 4,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Giải quyết Case Study nâng tầm bản lĩnh giao tiếp điều hành cho Senior Accountant trong 12 tháng',
          'Đạt >= 80% bài thi cuối khóa',
        ],
        learningOutcomesEn: [
          'Build a 12-month executive presence & conflict-confidence plan for a technical Senior Accountant',
          'Pass HFC-501 Assessment (>=80%)',
        ],
        topicsVi: [
          'Giao quyền chủ trì họp P&L Critique hàng tháng kèm Coaching ngay sau họp (Post-Meeting Debrief)',
          'Chuẩn hóa hồ sơ sẵn sàng thăng chức trước Regional Finance Director',
          'Thi cuối khóa HFC-501',
        ],
        topicsEn: [
          'Delegating monthly P&L Critique chairmanship paired with real-time debrief coaching',
          'Succession Readiness Review Board preparation',
          'HFC-501 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'Succession Benchmark: >= 1 Ready-Now AFC per Cluster Property',
        ],
        practicalLabVi: 'Trình bày Kế hoạch Phát triển Kế thừa 12 tháng cho ứng viên Senior Accountant.',
        practicalLabEn: 'Present the finalized 12-Month AFC Succession Acceleration Plan.',
        deliverablesVi: ['Kế hoạch Kế thừa 12 tháng Senior -> AFC', 'Bài thi >= 80%'],
        deliverablesEn: ['12-Month AFC Acceleration Plan', 'Final Exam (>=80%)'],
      },
    ],
  },

  'HFC-502': {
    courseCode: 'HFC-502',
    overviewVi:
      'Nghệ thuật giao tiếp thuyết phục và giải quyết xung đột đa phòng ban: Biến hình ảnh Kế toán từ "Cảnh sát ngân sách" thành "Đối tác tháo gỡ vấn đề", đào tạo Tài chính cho Quản lý Phi tài chính (Finance for Non-Finance) và dẫn dắt các cuộc họp P&L Critique hiệu quả.',
    overviewEn:
      'Executive influence and cross-functional conflict resolution: transforming Finance from "Budget Policeman" into "Commercial Enabler," delivering Finance for Non-Finance workshops, and chairing constructive P&L Critique sessions with Chefs, Housekeepers, and Engineers.',
    targetAudienceVi: 'Senior Accountant, Assistant Financial Controller, Financial Controller',
    targetAudienceEn: 'Senior Accountants, Assistant Financial Controllers, Financial Controllers',
    careerTrackStageVi: 'Giai đoạn 3 -> 4: Trợ Lý FC -> FC -> Đối Tác Chiến Lược',
    careerTrackStageEn: 'Stage 3 -> 4: Assistant FC -> FC -> Strategic Business Partner',
    competencyCodes: ['LPM-03'],
    deliveryFormatVi: 'Conflict Psychology Seminars (3h) · Finance for Non-Finance Lab (6h) · Chef/GM Mediation Case (5h)',
    deliveryFormatEn: 'Influence Psychology (3h) · Finance for Non-Finance Workshop (6h) · Chef Conflict Mediation Case (5h)',
    totalContactHours: 9,
    totalSelfStudyHours: 5,
    assessmentBreakdown: {
      quizWeight: 25,
      caseStudyWeight: 40,
      practicalOjtWeight: 35,
      passingScore: 80,
    },
    preWorkVi: 'Ghi nhận 01 tình huống bất đồng gần đây giữa Tài chính và Bếp/Sales/Buồng phòng và phân tích góc nhìn của cả hai bên.',
    preWorkEn: 'Document one recent budget disagreement with Culinary, Sales, or Rooms and outline both perspectives.',
    referencesAndStandards: [
      'Thomas-Kilmann Conflict Mode Instrument (Collaborating vs. Competing)',
      'Finance for Non-Finance Managers Hospitality Curriculum',
      'Crucial Conversations — Dialogue Under High Stakes',
    ],
    capstoneDeliverableVi: 'Bộ Slide Đào tạo "Tài chính cho Trưởng bộ phận Phi tài chính" + Kịch bản Hòa giải Xung đột Ngân sách Bếp trưởng.',
    capstoneDeliverableEn: 'Finance for Non-Finance Heads Workshop Deck + Executive Chef Food-Cost Mediation Playbook.',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Tâm lý học Đàm phán Nội bộ & Chuyển vai Đối tác (Business Enabler)',
        titleEn: 'Session 1: Psychology of Internal Influence — From Gatekeeper to Enabler',
        durationHours: 3,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Nhận diện ngôn ngữ gây phòng thủ ("Tại sao anh chi vượt 8%?") và thay bằng ngôn ngữ giải pháp',
          'Vận dụng 5 phong cách giải quyết xung đột Thomas-Kilmann trong môi trường khách sạn đa văn hóa',
        ],
        learningOutcomesEn: [
          'Replace accusatory variance questioning with collaborative problem-solving dialogue',
          'Apply Thomas-Kilmann conflict resolution styles across multicultural hotel leadership teams',
        ],
        topicsVi: [
          'Tại sao Bếp trưởng, Housekeeping và Sales thường né tránh bộ phận Tài chính?',
          'Phương pháp Thấu cảm Tài chính (Empathetic Inquiry): Hiểu KPI vận hành (Guest Satisfaction, Food Quality) trước khi nói về tiền',
        ],
        topicsEn: [
          'Why Chefs, Housekeepers, and Sales Directors resist traditional Finance policing',
          'Leading with operational KPIs (Guest NPS, Quality) before introducing P&L trade-offs',
        ],
        keyStandardsAndFormulas: [
          'Collaborative Ratio: Spend 60% of P&L review time on Forward Action Plans vs. 40% on Backward Variances',
        ],
        practicalLabVi: 'Viết lại 6 email nhắc nhở vượt ngân sách từ giọng điệu mệnh lệnh sang phong cách hợp tác tìm giải pháp.',
        practicalLabEn: 'Rewrite 6 confrontational budget-overrun emails into collaborative action-focused inquiries.',
        deliverablesVi: ['Bộ 6 Mẫu Thông điệp Tài chính Hợp tác'],
        deliverablesEn: ['6 Collaborative Finance Communication Templates'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Thiết kế Khóa học "Finance for Non-Finance Managers"',
        titleEn: 'Session 2: Designing & Delivering "Finance for Non-Finance Managers"',
        durationHours: 4,
        format: 'Live Workshop',
        learningOutcomesVi: [
          'Chuyển dịch khái niệm phức tạp (Accrual, Depreciation, Flow-Through, GOP, Capex vs Opex) sang ngôn ngữ đời thường cho Trưởng bộ phận',
          'Tổ chức buổi đào tạo 60 phút tương tác cao cho đội ngũ Bếp, Buồng, Spa, Kỹ thuật',
        ],
        learningOutcomesEn: [
          'Translate accounting jargon (Accruals, Flow-Through, GOP, Capex vs. Opex) into everyday operational metaphors',
          'Facilitate engaging 60-minute financial literacy workshops for non-finance managers',
        ],
        topicsVi: [
          'Ví dụ trực quan hóa: Một bát phở giá 250k đóng góp bao nhiêu vào trả lương và lợi nhuận khách sạn',
          'Hướng dẫn Trưởng bộ phận tự đọc Department Schedule tháng và kiểm soát PO pending hàng tuần',
        ],
        topicsEn: [
          'Interactive visual simulations explaining Menu Contribution Margin & Labor Ratios',
          'Empowering Division Heads to read Departmental P&Ls and Open PO tracking logs',
        ],
        keyStandardsAndFormulas: [
          'Rule of 3: Explain any financial variance using max 3 operational numbers (e.g., Cover drop, Portion weight, Overtime hrs)',
        ],
        practicalLabVi: 'Tùy biến Bộ Slide 12 trang "Tài chính cho Trưởng Bộ phận Khách sạn" và trình bày thử 10 phút.',
        practicalLabEn: 'Customize the 12-slide "Finance for Hotel Department Heads" deck and deliver a 10-min teach-back.',
        deliverablesVi: ['Bộ Slide Đào tạo Finance for Non-Finance 12 trang'],
        deliverablesEn: ['Customized 12-Slide Finance for Non-Finance Deck'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Điều hành Cuộc họp P&L Critique Hàng tháng Mang tính Xây dựng',
        titleEn: 'Session 3: Chairing Constructive Monthly Departmental P&L Critiques',
        durationHours: 4,
        format: 'Case Simulation',
        learningOutcomesVi: [
          'Điều phối cuộc họp P&L Critique tập trung vào nguyên nhân và hành động 30 ngày tiếp theo',
          'Chốt cam kết hành động (Action Tracker) có định lượng mục tiêu tiết kiệm rõ ràng',
        ],
        learningOutcomesEn: [
          'Run disciplined 45-minute P&L Critiques centered on root causes and next-30-day actions',
          'Lock measurable cost/margin recovery commitments with Division Heads',
        ],
        topicsVi: [
          'Cấu trúc Pre-Read Pack gửi trước 24 giờ để Trưởng bộ phận không bị bất ngờ (No Surprises Policy)',
          'Phân biệt trách nhiệm: Chi phí nào thuộc quyền kiểm soát của Trưởng bộ phận vs Bất khả kháng',
        ],
        topicsEn: [
          'The "No Surprises" 24-hour pre-read protocol before monthly P&L meetings',
          'Separating Controllable operational variances from uncontrollable macro/tariff shocks',
        ],
        keyStandardsAndFormulas: [
          'P&L Critique Action Closure Rate >= 85% within 30 Days',
        ],
        practicalLabVi: 'Đóng vai (Role-play) điều hành cuộc họp P&L Critique với Trưởng bộ phận Buồng phòng có chi phí giặt là & overtime tăng 18%.',
        practicalLabEn: 'Simulate a live P&L Critique session with the Executive Housekeeper over an 18% laundry & overtime spike.',
        deliverablesVi: ['Biên bản P&L Critique & Action Plan Định lượng'],
        deliverablesEn: ['P&L Critique Action Tracker & Pre-Read Brief'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Case Study Hòa giải Xung đột với Bếp trưởng & Thi Đánh giá',
        titleEn: 'Session 4: Executive Chef Food-Cost Deadlock Case & Final Exam',
        durationHours: 3,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Giải tỏa căng thẳng khi Bếp trưởng phản đối mục tiêu cắt 3% Food Cost mà vẫn bảo toàn chất lượng ẩm thực 5 sao',
          'Đạt >= 80% bài thi cuối khóa',
        ],
        learningOutcomesEn: [
          'Resolve a high-stakes Food Cost budget impasse with an Executive Chef without sacrificing 5-star culinary standards',
          'Pass HFC-502 Assessment (>=80%)',
        ],
        topicsVi: [
          'Giải pháp cùng thắng (Win-Win): Giữ nguyên chất lượng nguyên liệu cốt lõi, giảm hao hụt Butcher Yield, tái thương lượng giá thịt bò và đẩy món Stars có biên lời cao',
          'Thi cuối khóa HFC-502',
        ],
        topicsEn: [
          'Win-Win Culinary Finance: Yield recovery, master beef tender renegotiation, and Menu Stars upselling',
          'HFC-502 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'Target 3% Cost Saving Breakdown: 1.2% Vendor Contract + 1.0% Yield/Waste Control + 0.8% Menu Mix Shift',
        ],
        practicalLabVi: 'Xây dựng Phương án Cắt giảm 3% Food Cost cùng Bếp trưởng không hạ chất lượng món ăn.',
        practicalLabEn: 'Draft the joint FC-Chef 3% Food Cost Recovery Plan protecting 5-star plate quality.',
        deliverablesVi: ['Bản Kế hoạch Đồng thuận FC - Executive Chef', 'Bài thi >= 80%'],
        deliverablesEn: ['Joint FC-Chef Cost Alignment Plan', 'Final Exam (>=80%)'],
      },
    ],
  },

  'HFC-503': {
    courseCode: 'HFC-503',
    overviewVi:
      'Trang bị phương pháp luận quản trị sự thay đổi (Kotter 8 bước) và lãnh đạo dự án Chuyển đổi số trong Phòng Kế toán Khách sạn: Triển khai Hệ thống ERP/PMS mới, Hóa đơn điện tử không giấy tờ (100% Paperless AP), tự động hóa RPA/OCR và vượt qua tâm lý phản kháng của đội ngũ.',
    overviewEn:
      'Equips finance leaders with Kotter 8-Step Change Management and digital transformation execution: PMS/ERP cutovers, 100% Paperless E-Invoicing AP workflows, RPA/OCR automation, and overcoming accounting staff resistance.',
    targetAudienceVi: 'Assistant Financial Controller, Financial Controller, Finance Systems Lead',
    targetAudienceEn: 'Assistant FCs, Financial Controllers, Finance Systems Managers',
    careerTrackStageVi: 'Giai đoạn 3 -> 4: Năng lực Dẫn dắt Chuyển đổi Số cho AFC & FC',
    careerTrackStageEn: 'Stage 3 -> 4: Digital Change Leadership for AFC & FC',
    competencyCodes: ['LPM-04'],
    deliveryFormatVi: 'Kotter Change Framework (4h) · System Cutover & UAT Lab (6h) · Paperless E-Invoice Case (6h)',
    deliveryFormatEn: 'Change Management Seminars (4h) · UAT & Cutover Lab (6h) · Paperless AP Rollout Case (6h)',
    totalContactHours: 10,
    totalSelfStudyHours: 6,
    assessmentBreakdown: {
      quizWeight: 25,
      caseStudyWeight: 35,
      practicalOjtWeight: 40,
      passingScore: 80,
    },
    preWorkVi: 'Liệt kê 03 tác vụ kế toán tốn nhiều thời gian nhập liệu thủ công nhất tại khách sạn hiện nay.',
    preWorkEn: 'Identify the top 3 manual, paper-heavy accounting workflows consuming staff hours at your hotel.',
    referencesAndStandards: [
      'John Kotter — 8-Step Leading Change Methodology',
      'Hotel ERP/PMS Cutover, Parallel Run & UAT Governance Playbook',
      'Robotic Process Automation (RPA) & OCR E-Invoice Integration Standards',
    ],
    capstoneDeliverableVi: 'Lộ trình Chuyển đổi Số Phòng Tài chính 6 tháng (UAT Checklist, Cutover Sign-off, Reskilling Plan) cho dự án 100% Paperless AP.',
    capstoneDeliverableEn: '6-Month Finance Digital Transformation Roadmap (UAT Checklist, Cutover Controls, Staff Reskilling Plan).',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Mô hình Kotter 8 Bước & Bản đồ Tự động hóa Quy trình Tài chính (RPA/OCR)',
        titleEn: 'Session 1: Kotter 8-Step Change Model & Finance Automation Opportunity Map',
        durationHours: 4,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Nhận diện các quy trình có ROI cao nhất để số hóa: Hóa đơn điện tử OCR, Đối chiếu sao kê ngân hàng tự động, Duyệt chi trên Mobile (Digital Approval)',
          'Vận dụng 8 bước Kotter tạo động lực thay đổi từ cấp lãnh đạo đến nhân viên thừa hành',
        ],
        learningOutcomesEn: [
          'Prioritize high-ROI finance automations: OCR e-invoicing, automated bank matching, mobile AP approvals',
          'Apply Kotter 8-Step change phases to build coalition and urgency across finance desks',
        ],
        topicsVi: [
          'Vì sao 65% dự án phần mềm kế toán thất bại do yếu tố Con người thay vì Kỹ thuật?',
          'Chiến thắng ngắn hạn (Quick Wins): Tự động hóa đối chiếu thẻ tín dụng trước khi chuyển toàn bộ ERP',
        ],
        topicsEn: [
          'Why 65% of finance IT rollouts stall from human resistance rather than software bugs',
          'Engineering Quick Wins (e.g., automated EDC matching) before core ERP migration',
        ],
        keyStandardsAndFormulas: [
          'Automation ROI = Annual Labor Hours Reclaimed x Loaded Hourly Cost - Annual SaaS License Fee',
        ],
        practicalLabVi: 'Lập Ma trận Đánh giá Tác động vs Khả thi cho 8 sáng kiến số hóa trong phòng tài chính.',
        practicalLabEn: 'Score 8 finance digitalization candidates on an Impact vs. Feasibility Matrix.',
        deliverablesVi: ['Bản đồ Ưu tiên Chuyển đổi Số Phòng Tài chính'],
        deliverablesEn: ['Finance Digital Transformation Priority Matrix'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Quản trị Thử nghiệm UAT, Chuyển đổi Số dư (Cutover) & Không Gián đoạn',
        titleEn: 'Session 2: UAT Governance, Data Migration Reconciliation & Zero-Downtime Cutover',
        durationHours: 4,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Xây dựng kịch bản Kiểm thử Người dùng (UAT - User Acceptance Testing) cho mọi nghiệp vụ khách sạn',
          'Bảo đảm tính toàn vẹn dữ liệu 100% (Trial Balance cũ = Trial Balance mới) tại thời điểm Go-Live',
        ],
        learningOutcomesEn: [
          'Author end-to-end User Acceptance Testing (UAT) scripts covering Night Audit, AP, AR, and Inventory',
          'Guarantee 100% Trial Balance & Sub-Ledger tie-out during ERP Go-Live cutover',
        ],
        topicsVi: [
          'Quy trình Parallel Run (chạy song song 1 kỳ) vs Big Bang Cutover',
          'Kiểm soát bản đồ chuyển đổi Chart of Accounts, Open AR/AP Invoices và Tồn kho đầu kỳ',
          'Kế hoạch Dự phòng Rollback nếu phát sinh lỗi đồng bộ PMS-ERP',
        ],
        topicsEn: [
          'Parallel Run vs. Big Bang cutover risk controls',
          'Opening Trial Balance, Open AR/AP Sub-ledger, and Inventory Valuation cutover tie-out',
          'Go-Live War Room & Rollback contingency gates',
        ],
        keyStandardsAndFormulas: [
          'Cutover Gate Criteria: Legacy TB - New ERP Opening TB = $0.00 AND 100% Critical UAT Scripts Passed',
        ],
        practicalLabVi: 'Soạn thảo Bộ Kịch bản UAT 25 bước cho giao diện đồng bộ doanh thu PMS -> ERP và Checklist Go-Live.',
        practicalLabEn: 'Draft a 25-case UAT Test Script for PMS-to-ERP daily revenue posting and Go-Live Cutover.',
        deliverablesVi: ['Bộ Kịch bản UAT & Checklist Kiểm soát Go-Live'],
        deliverablesEn: ['25-Case UAT Test Pack & Go-Live Cutover Checklist'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Vượt qua Kháng cự Tâm lý & Nâng cấp Vai trò Nhân sự Kế toán',
        titleEn: 'Session 3: Overcoming Staff Inertia & Reskilling Transactional Accountants',
        durationHours: 4,
        format: 'Live Workshop',
        learningOutcomesVi: [
          'Giải tỏa nỗi sợ mất việc của nhân viên nhập liệu khi áp dụng tự động hóa',
          'Xây dựng lộ trình đào tạo chuyển đổi vai trò từ "Người nhập hóa đơn" sang "Chuyên viên Kiểm soát Chi phí & Nhà cung cấp"',
        ],
        learningOutcomesEn: [
          'De-escalate job-displacement anxiety with transparent reskilling commitments',
          'Transition AP data-entry clerks into Vendor Compliance & Spend Analytics specialists',
        ],
        topicsVi: [
          'Đường cong Thay đổi Kübler-Ross: Shock -> Phủ nhận -> Thất vọng -> Thử nghiệm -> Cam kết',
          'Tuyển chọn Change Champions ngay trong đội ngũ kế toán viên trẻ',
        ],
        topicsEn: [
          'Managing the Kübler-Ross Change Curve during software transitions',
          'Mobilizing peer Change Champions across AP, AR, and Cost desks',
        ],
        keyStandardsAndFormulas: [
          'Adoption KPI: >= 95% E-Invoice Touchless Processing within 90 Days Post-Launch',
        ],
        practicalLabVi: 'Thiết kế Kế hoạch Truyền thông 60 ngày và Chương trình Đào tạo Nâng cấp Kỹ năng cho nhân sự AP.',
        practicalLabEn: 'Create a 60-day Change Communication Calendar and AP Clerk Reskilling Plan.',
        deliverablesVi: ['Kế hoạch Truyền thông & Reskilling Nhân sự Số hóa'],
        deliverablesEn: ['Change Communication & AP Reskilling Plan'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Case Study 100% Hóa đơn Điện tử Không Giấy tờ & Thi Đánh giá',
        titleEn: 'Session 4: 100% Paperless AP E-Invoicing Transformation Case & Final Exam',
        durationHours: 4,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Giải quyết khủng hoảng trì hoãn nhập liệu khi khách sạn 400 phòng chuyển sang Hóa đơn Điện tử tự động',
          'Đạt >= 80% bài thi cuối khóa',
        ],
        learningOutcomesEn: [
          'Resolve passive resistance during a 400-key hotel paperless AP e-invoicing transformation',
          'Pass HFC-503 Assessment (>=80%)',
        ],
        topicsVi: [
          'Case Study Khách sạn 400 phòng tại Hà Nội: Cắt giảm 40% thời gian xử lý chứng từ, loại bỏ lưu trữ giấy vật lý',
          'Đo lường kết quả sau chuyển đổi (Adoption & Accuracy Metrics)',
          'Thi cuối khóa HFC-503',
        ],
        topicsEn: [
          'Hanoi 400-Key Case: Eliminating paper binders and cutting AP cycle time by 40%',
          'Post-launch KPI governance',
          'HFC-503 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'Cycle Time Reduction = (Legacy Avg. Invoice Processing Days - Digital Cycle Days) / Legacy Days x 100',
        ],
        practicalLabVi: 'Hoàn thiện Đề án Triển khai 100% Paperless AP 6 tháng sẵn sàng trình GM phê duyệt.',
        practicalLabEn: 'Finalize the 6-Month Paperless AP Implementation Proposal for GM approval.',
        deliverablesVi: ['Đề án Số hóa Paperless AP hoàn chỉnh', 'Bài thi >= 80%'],
        deliverablesEn: ['Paperless AP Transformation Roadmap', 'Final Exam (>=80%)'],
      },
    ],
  },

  // =========================================================================
  // DOMAIN 6: STRATEGIC BUSINESS PARTNERSHIP (D6-SBP)
  // =========================================================================
  'HFC-601': {
    courseCode: 'HFC-601',
    overviewVi:
      'Khóa học đỉnh cao 24 giờ định hình Financial Controller trở thành "Người hoa tiêu chiến lược" (GM Co-Pilot): Thấu hiểu tư duy cân bằng 4 trụ cột của Tổng Giám đốc, xây dựng mô hình Phân tích Đánh đổi Thương mại (Group Displacement & Scenario What-If) và làm chủ phong thái Thuyết trình Tài chính Điều hành.',
    overviewEn:
      'Flagship 24-hour executive capstone forging the Financial Controller into the GM’s Strategic Co-Pilot: balancing Guests, Colleagues, Brand, and Owner Returns; mastering MICE Displacement & What-If Scenario modeling; and commanding Executive Boardroom Presentations.',
    targetAudienceVi: 'Assistant FC chuẩn bị lên FC, Financial Controller, Cluster Director of Finance',
    targetAudienceEn: 'Senior AFCs, Financial Controllers, Cluster Directors of Finance',
    careerTrackStageVi: 'Giai đoạn 4: Financial Controller -> Đối Tác Kinh Doanh Chiến Lược Của GM',
    careerTrackStageEn: 'Stage 4: Financial Controller -> Strategic GM Business Partner',
    competencyCodes: ['SBP-01', 'SBP-02'],
    deliveryFormatVi: 'GM Fireside Dialogues (4h) · Displacement & What-If Lab (10h) · Executive Board Simulation (10h)',
    deliveryFormatEn: 'GM Fireside Dialogues (4h) · Displacement & Scenario Lab (10h) · Crisis Boardroom Simulation (10h)',
    totalContactHours: 14,
    totalSelfStudyHours: 10,
    assessmentBreakdown: {
      quizWeight: 20,
      caseStudyWeight: 35,
      practicalOjtWeight: 45,
      passingScore: 90,
    },
    preWorkVi: 'Chuẩn bị 01 Bộ Báo cáo Tài chính Tháng (Executive Deck) và liệt kê 03 quyết định thương mại sắp tới của khách sạn cần ý kiến FC.',
    preWorkEn: 'Bring your current Monthly Financial Deck and identify 3 upcoming commercial decisions requiring FC counsel.',
    referencesAndStandards: [
      'Four-Stakeholder Hotel Leadership Balance (Guests, Colleagues, Brand, Owners)',
      'Hotel MICE Group Displacement & Contribution Margin Calculus',
      'Executive Boardroom Data Storytelling Standards (Pyramid Principle)',
    ],
    capstoneDeliverableVi: 'Mô hình Displacement Analysis đoàn MICE 500 đêm phòng + Bộ Slide Executive Monthly Deck 15 trang trình GM & Chủ đầu tư.',
    capstoneDeliverableEn: '500-Room-Night MICE Group Displacement Model + 15-Slide Executive Monthly Board Deck.',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Tư duy Tổng Giám đốc & Đối thoại Trực tiếp "GM Kỳ vọng gì ở FC?"',
        titleEn: 'Session 1: The General Manager Mindset & Executive Co-Pilot Mandate',
        durationHours: 4,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Hiểu áp lực cân bằng giữa Trải nghiệm Khách hàng (Guest NPS), Gắn kết Nhân viên, Tiêu chuẩn Thương hiệu và Lợi nhuận Chủ sở hữu',
          'Phân biệt giữa FC "Người báo cáo quá khứ" (Historian) vs FC "Người định hướng tương lai" (Co-Pilot)',
        ],
        learningOutcomesEn: [
          'Navigate the GM 4-pillar balancing act: Guest Experience, Talent Morale, Brand Equity, and Owner ROI',
          'Shift focus from backward-looking "Financial Historian" to forward-steering "Commercial Co-Pilot"',
        ],
        topicsVi: [
          'Fireside Dialogue với General Manager: Những sai lầm khiến FC mất tiếng nói trong Ban Điều hành (ExCom)',
          'Vai trò của FC trong cuộc họp ExCom hàng tuần: Nói ít bảng tính, nói nhiều hàm ý kinh doanh',
        ],
        topicsEn: [
          'GM Fireside: Behaviors that elevate or sideline an FC inside the Executive Committee (ExCom)',
          'Translating accounting variances into 3-bullet commercial decisions at ExCom meetings',
        ],
        keyStandardsAndFormulas: [
          'Balanced Scorecard: Financial GOPPAR (40%) + Guest Reputation (25%) + Employee Engagement (20%) + Audit/Brand Compliance (15%)',
        ],
        practicalLabVi: 'Chuyển đổi 1 bản báo cáo số liệu 5 trang thành Executive Memo 1 trang theo Nguyên lý Kim tự tháp (Minto Pyramid).',
        practicalLabEn: 'Distill a 5-page financial variance report into a 1-page Minto Pyramid Executive Brief.',
        deliverablesVi: ['Bản Tóm tắt Điều hành 1 trang cho GM'],
        deliverablesEn: ['1-Page GM Executive Decision Brief'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Phân tích Đánh đổi Thương mại & Mô hình Chèn ép Khách lẻ (Displacement Analysis)',
        titleEn: 'Session 2: Commercial Trade-Offs & MICE Group Displacement Modeling',
        durationHours: 5,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Xây dựng Mô hình Displacement tính toán chính xác lợi nhuận ròng khi nhận đoàn MICE giá thấp vs giữ phòng cho khách lẻ BAR',
          'Đánh giá tác động phụ trợ (Banquet Catering, AV Rental, Spa, Outlet Spend) vào tổng Contribution Margin của đoàn',
        ],
        learningOutcomesEn: [
          'Model transient room displacement accurately when evaluating discounted MICE group inquiries',
          'Incorporate F&B Banquet margins, AV commissions, and ancillary spend into Total Group Contribution',
        ],
        topicsVi: [
          'Case Study Resort 450 phòng: Đoàn MICE 500 đêm phòng trả giá $90 vs Khách lẻ $150',
          'Tính toán Chi phí Cơ hội & Chi phí tăng ca phát sinh khiến khách sạn mất $42,000 GOP nếu nhận đoàn',
          'Phân tích Đóng/Mở Outlet thua lỗ theo mùa hoặc chuyển đổi mô hình thuê ngoài mặt bằng',
        ],
        topicsEn: [
          '450-Key Resort Case: Evaluating a $90 discounted 500-room-night MICE bid against $150 transient demand',
          'Quantifying the hidden -$42,000 net GOP displacement trap including overtime spikes',
          'Seasonal Outlet Closure vs. Third-Party Lease vs. Break-Even Operation modeling',
        ],
        keyStandardsAndFormulas: [
          'Net Group Benefit = (Group Room & Banquet Contribution) - (Displaced Transient Room & Ancillary Contribution) - Incremental Overtime',
        ],
        practicalLabVi: 'Xây dựng Công cụ Displacement Calculator động để phòng Sales & Revenue sử dụng trước khi ký hợp đồng đoàn lớn.',
        practicalLabEn: 'Build an interactive MICE Displacement Calculator for joint Sales-Revenue-Finance deal screening.',
        deliverablesVi: ['Mô hình Excel Group Displacement & Outlet Viability'],
        deliverablesEn: ['MICE Displacement & Outlet Viability Excel Tool'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Mô phỏng Kịch bản Rủi ro (Scenario Planning) & Chiến lược Đối phó Khủng hoảng',
        titleEn: 'Session 3: Strategic Scenario Modeling & Commercial Crisis Playbooks',
        durationHours: 5,
        format: 'Case Simulation',
        learningOutcomesVi: [
          'Xây dựng mô hình 3 kịch bản (Best / Base / Worst) cho các biến cố vĩ mô: Suy thoái nguồn khách quốc tế, Cạnh tranh giảm giá, Tăng giá điện/lương',
          'Thiết lập các "Trigger Points" kích hoạt hành động cắt giảm định phí ngay lập tức',
        ],
        learningOutcomesEn: [
          'Construct dynamic 3-case Scenario Trees (Best / Base / Worst) for demand shocks or cost inflation',
          'Define pre-agreed "Financial Trigger Points" that automatically execute contingency cost freezes',
        ],
        topicsVi: [
          'Trình mô phỏng Chiến lược: Công suất tăng nhưng GOP sụt giảm — Xử lý tình huống thời gian thực trước ExCom',
          'Cấu trúc hợp đồng thương mại & điều khoản phạt hủy đoàn bảo vệ dòng tiền',
        ],
        topicsEn: [
          'Strategic Crisis Simulation: Navigating rising occupancy with collapsing GOP margins',
          'Hardening MICE cancellation clauses and minimum revenue guarantees',
        ],
        keyStandardsAndFormulas: [
          'Break-Even Occupancy % = Total Fixed Costs / [(ADR - Variable Cost per Room) x Total Rooms x Days]',
        ],
        practicalLabVi: 'Tính toán Điểm Hòa vốn (Break-Even Occupancy) và dựng Ma trận Trigger hành động theo từng nấc công suất (60%, 50%, 40%).',
        practicalLabEn: 'Calculate Property Break-Even Occupancy and build 60%/50%/40% Trigger Action Playbooks.',
        deliverablesVi: ['Ma trận Kịch bản What-If & Ngưỡng Kích hoạt Hành động'],
        deliverablesEn: ['What-If Scenario Matrix & Trigger Action Playbook'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Nghệ thuật Thiết kế Executive Financial Deck (15 Slides) cho Ban Điều hành',
        titleEn: 'Session 4: Designing the 15-Slide Executive Monthly Financial Presentation',
        durationHours: 5,
        format: 'Live Workshop',
        learningOutcomesVi: [
          'Thiết kế bộ slide Báo cáo Tài chính Tháng đẳng cấp điều hành (Executive Summary, Scorecard, GOP Bridge, Outlook, Action Plan)',
          'Làm chủ nghệ thuật trình bày thuyết phục: Trình bày kết luận trước, dùng số liệu hỗ trợ sau',
        ],
        learningOutcomesEn: [
          'Architect a luxury 15-slide Executive Financial Deck (Headline KPIs, STR Index, GOP Waterfall, Cash & Capex, Next-30d Actions)',
          'Command Executive Presence: Lead with insight, support with crisp visuals, end with decisions needed',
        ],
        topicsVi: [
          'Tiêu chuẩn thiết kế Slide Điều hành: Bỏ bảng số dày đặc 20 cột, thay bằng Biểu đồ Waterfall, Sparkline và Callout định hướng',
          'Chuẩn bị Q&A trước các câu hỏi hóc búa từ GM và Regional Director',
        ],
        topicsEn: [
          'Decluttering finance decks: Replacing 20-column tables with Waterfall Bridges & Action Headlines',
          'Handling Executive Q&A under pressure with poise',
        ],
        keyStandardsAndFormulas: [
          'Executive Slide Rule: 1 Clear Takeaway Title + Max 2 Supporting Charts + Concrete Commercial Recommendation',
        ],
        practicalLabVi: 'Hoàn thiện Bộ Slide 15 trang báo cáo kết quả quý 3 và kế hoạch hành động quý 4.',
        practicalLabEn: 'Finalize the 15-slide Q3 Review & Q4 Steering Executive Presentation Deck.',
        deliverablesVi: ['Bộ Slide Executive Monthly Financial Deck 15 trang'],
        deliverablesEn: ['15-Slide Executive Financial Board Deck'],
      },
      {
        sessionNumber: 5,
        titleVi: 'Học phần 5: Phiên Thuyết trình Chiến lược Capstone (OJT-SBP-01) & Thi Đánh giá',
        titleEn: 'Session 5: Boardroom Capstone Defense (OJT-SBP-01) & Final Exam',
        durationHours: 5,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Bảo vệ thành công bài thuyết trình tài chính chiến lược trước Hội đồng GM & Cluster FC',
          'Đạt điểm xuất sắc >= 90% cho bài thi cuối khóa cấp độ Strategic',
        ],
        learningOutcomesEn: [
          'Deliver a commanding strategic boardroom presentation defending pricing & cash initiatives',
          'Achieve >= 90% passing threshold on the Strategic FC Assessment',
        ],
        topicsVi: [
          'Trình bày thử nghiệm OJT-SBP-01 và nhận phản hồi trực tiếp về Executive Presence',
          'Thi đánh giá cuối khóa HFC-601 (Pass >= 90%)',
        ],
        topicsEn: [
          'OJT-SBP-01 Live Boardroom Simulation & Executive Presence Coaching',
          'HFC-601 Strategic Capstone Examination (>=90% pass)',
        ],
        keyStandardsAndFormulas: [
          'Executive Readiness Threshold >= 90% Exam + Passed Boardroom Simulation',
        ],
        practicalLabVi: 'Trình bày 15 phút + 10 phút Q&A bảo vệ chiến lược tăng biên GOP từ 36% lên 41%.',
        practicalLabEn: 'Deliver 15-min presentation + 10-min Q&A defending a strategy to lift GOP margin from 36% to 41%.',
        deliverablesVi: ['Bài Thuyết trình Capstone & Q&A Script', 'Bài thi >= 90%'],
        deliverablesEn: ['Boardroom Defense Deck & Q&A Script', 'Final Exam (>=90%)'],
      },
    ],
  },

  'HFC-602': {
    courseCode: 'HFC-602',
    overviewVi:
      'Khóa học chuyên sâu về Quản trị Quan hệ Chủ sở hữu (Owner Relations & Asset Management) và giải mã Hợp đồng Quản lý Khách sạn Quốc tế (HMA): Tính toán chuẩn xác Base Fee, Incentive Fee bậc thang trên GOP/AGOP, ngưỡng Owner Priority Return, và kỹ năng xử lý tranh chấp hợp đồng minh bạch không để leo thang kiện tụng.',
    overviewEn:
      'Executive governance of Owner Relations, Institutional Asset Management, and Hotel Management Agreements (HMA): mastering Base & Tiered Incentive Fee formulas (GOP/AGOP), Owner Priority Return waterfalls, brand shared-service audits, and resolving $180k+ fee disputes constructively.',
    targetAudienceVi: 'Financial Controller, Cluster FC, Regional Finance Director, Asset Manager',
    targetAudienceEn: 'Financial Controllers, Cluster FCs, Regional Finance Directors, Hotel Asset Managers',
    careerTrackStageVi: 'Giai đoạn 4: Financial Controller -> Đối Tác Chiến Lược & Quản Trị Chủ Đầu Tư',
    careerTrackStageEn: 'Stage 4: Financial Controller -> Strategic Partner & Owner Governance',
    competencyCodes: ['SBP-03', 'SBP-04'],
    deliveryFormatVi: 'HMA Legal-Finance Seminars (5h) · Fee & AGOP Excel Lab (8h) · $180k Dispute Arbitration Case (7h)',
    deliveryFormatEn: 'HMA Clauses Seminars (5h) · Fee & Priority Return Lab (8h) · $180k Incentive Fee Dispute Case (7h)',
    totalContactHours: 12,
    totalSelfStudyHours: 8,
    assessmentBreakdown: {
      quizWeight: 25,
      caseStudyWeight: 40,
      practicalOjtWeight: 35,
      passingScore: 85,
    },
    preWorkVi: 'Đọc bảng tóm tắt các điều khoản tài chính chính trong một bản Hotel Management Agreement (HMA) tiêu chuẩn quốc tế.',
    preWorkEn: 'Review the financial definition clauses of a standard international Hotel Management Agreement (HMA).',
    referencesAndStandards: [
      'International Hotel Management Agreement (HMA) Standard Financial Clauses',
      'USALI Non-Operating Income & Expenses vs. Adjusted GOP (AGOP) Definitions',
      'Hospitality Asset Management Association (HAMA) Reporting Standards',
    ],
    capstoneDeliverableVi: 'Mô hình Excel Tính toán Phí Quản lý HMA (Base, AGOP Incentive, Owner Priority Return) + Hồ sơ Hòa giải Tranh chấp $180,000.',
    capstoneDeliverableEn: 'HMA Management Fee Waterfall Model (Base, AGOP Incentive, Owner Priority) + $180k Dispute Resolution Brief.',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Giải mã Điều khoản Tài chính trong Hợp đồng Quản lý Khách sạn (HMA)',
        titleEn: 'Session 1: Decoding Financial Covenants in Hotel Management Agreements (HMA)',
        durationHours: 5,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Hiểu rõ nghĩa vụ kép (Dual Fiduciary) của FC: Tuân thủ chuẩn mực tập đoàn vận hành đồng thời minh bạch bảo vệ tài sản Chủ đầu tư',
          'Nắm vững các điều khoản nhạy cảm: Performance Test (Kiểm tra hiệu quả), Operating Budget Approval, Working Capital Funding',
        ],
        learningOutcomesEn: [
          'Balance the FC dual stewardship role: safeguarding brand accounting integrity and owner asset returns',
          'Navigate sensitive HMA covenants: Dual Performance Tests (RevPAR & GOP), Budget Veto rights, Working Capital calls',
        ],
        topicsVi: [
          'Cơ cấu Phí tập đoàn: Base Fee (1.5-3.0% Revenue), Incentive Fee (6-10% GOP/AGOP), System/Marketing/Reservation Fees',
          'Phân biệt chi phí Chủ đầu tư (Owner Expenses: Depreciation, Debt Interest, Property Tax, Legal) vs Chi phí Vận hành',
          'Hậu quả khi không đạt Performance Test 2 năm liên tiếp',
        ],
        topicsEn: [
          'Operator Fee Stack: Base Fee (1.5-3% Rev), Incentive Fee (6-10% GOP/AGOP), Brand System Assessments',
          'Non-Operating Owner Expenses vs. Hotel Operating Expenses under USALI & HMA',
          'Performance Test cure rights & termination protections',
        ],
        keyStandardsAndFormulas: [
          'Adjusted GOP (AGOP) = GOP - Base Management Fee - (Contracted Deductions e.g. FF&E Reserve / Insurance if specified in HMA)',
        ],
        practicalLabVi: 'Rà soát danh mục 25 khoản chi phí nhạy cảm để phân định Chủ đầu tư chịu hay Khách sạn chịu theo hợp đồng HMA mẫu.',
        practicalLabEn: 'Classify 25 contested expenditures between Owner Non-Operating Account and Hotel Operating Account.',
        deliverablesVi: ['Ma trận Phân định Chi phí Operator vs Owner theo HMA'],
        deliverablesEn: ['HMA Operator vs. Owner Expense Allocation Matrix'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Mô hình Tính Phí Quản lý Bậc thang & Ngưỡng Lợi nhuận Ưu tiên (Priority Return)',
        titleEn: 'Session 2: Modeling Tiered Incentive Fees & Owner Priority Return Waterfalls',
        durationHours: 5,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Xây dựng chính xác mô hình tính Base Fee, Incentive Fee lũy tiến theo bậc thang GOP% và ngưỡng Owner Priority Return',
          'Kiểm soát các điều chỉnh cuối năm (Year-End True-Up) tránh trích thiếu hoặc thu vượt phí quản lý',
        ],
        learningOutcomesEn: [
          'Model Base Fees, sliding-scale GOP%-based Incentive Fees, and Owner Priority Return Hurdles accurately',
          'Compute quarterly accruals and Year-End Audited Fee True-Ups cleanly',
        ],
        topicsVi: [
          'Ví dụ bậc thang phổ biến: GOP < 30% -> 6% AGOP | 30-35% -> 8% AGOP | >35% -> 10% AGOP',
          'Cơ chế Owner Priority Return (8% trên Tổng vốn đầu tư): Subordinate Incentive Fee & Clawback',
          'Kiểm soát hóa đơn Chi phí Phân bổ Tập đoàn (Shared Services / Brand Reimbursements)',
        ],
        topicsEn: [
          'Tiered Incentive Scaling Mechanics (6% / 8% / 10% tied to GOP margin bands)',
          'Subordinated Incentive Fees behind Owner Priority Return hurdles',
          'Auditing Brand Reimbursements & Shared Service invoices transparently for Owners',
        ],
        keyStandardsAndFormulas: [
          'Base Fee = Total Operating Revenue x Base Rate %',
          'Incentive Fee = MAX(0, [AGOP - Owner Priority Return] x Tiered Incentive %)',
        ],
        practicalLabVi: 'Xây dựng File Excel HMA Fee Waterfall 5 năm mô phỏng biến động doanh thu và ngưỡng Owner Priority Return.',
        practicalLabEn: 'Build a 5-year HMA Fee Waterfall workbook incorporating Priority Return hurdles and year-end true-ups.',
        deliverablesVi: ['Workbook Mô hình Tính Phí Quản lý HMA 5 năm'],
        deliverablesEn: ['5-Year HMA Management Fee & Priority Return Workbook'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Họp Thẩm định Tài sản (Asset Management Review) & Hợp đồng Thuê Mặt bằng',
        titleEn: 'Session 3: Quarterly Owner/Asset Manager Reviews & Commercial Lease Audits',
        durationHours: 5,
        format: 'Live Workshop',
        learningOutcomesVi: [
          'Làm chủ cuộc họp Quarterly Owner Review với Asset Manager chuyên nghiệp từ các quỹ đầu tư bất động sản',
          'Thẩm định điều khoản tài chính cho các hợp đồng thuê mặt bằng thương mại (Base Rent + % Turnover Rent) và nhà thầu lớn',
        ],
        learningOutcomesEn: [
          'Lead high-trust Quarterly Owner & Asset Manager financial reviews with institutional poise',
          'Structure and audit retail/tenant commercial leases (Minimum Guaranteed Rent vs. % Turnover Rent)',
        ],
        topicsVi: [
          'Những câu hỏi Asset Manager luôn chất vấn: Why is Payroll PAR up 6%? Why did OTA Mix grow? Where is the FF&E ROI?',
          'Xây dựng Owner Monthly Reporting Package minh bạch, chủ động giải trình trước khi bị hỏi',
        ],
        topicsEn: [
          'Anticipating Asset Manager scrutiny: Labor PAR creep, OTA dilution, Capex payback audits',
          'Proactive Monthly Owner Reporting Packages eliminating trust friction',
        ],
        keyStandardsAndFormulas: [
          'Commercial Tenant Rent = MAX(Fixed Minimum Base Rent, Gross Tenant Sales x Turnover %)',
        ],
        practicalLabVi: 'Kiểm tra hợp đồng thuê mặt bằng Spa & Boutique trong khách sạn để phát hiện $28,000 tiền thuê theo % doanh thu bị kê thiếu.',
        practicalLabEn: 'Audit retail tenant revenue statements uncovering $28,000 in under-reported turnover rent.',
        deliverablesVi: ['Checklist Thẩm định Hợp đồng Thương mại & Báo cáo Owner Review'],
        deliverablesEn: ['Commercial Lease Audit Pack & Owner Review Brief'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Case Study Tranh chấp Phí Khuyến khích $180,000 & Thi Đánh giá',
        titleEn: 'Session 4: $180,000 Incentive Fee Dispute Arbitration Case & Final Exam',
        durationHours: 5,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Giải quyết tranh chấp $180,000 giữa Tập đoàn Quản lý và Asset Manager về việc trừ Khấu hao/Bảo hiểm khỏi AGOP trước khi tính phí',
          'Đạt >= 85% bài thi cuối khóa',
        ],
        learningOutcomesEn: [
          'Arbitrate a $180,000 AGOP definition dispute over property insurance and depreciation deductions without escalating to legal arbitration',
          'Pass HFC-602 Assessment (>=85%)',
        ],
        topicsVi: [
          'Phân tích Case Study Quỹ đầu tư BĐS: Đối chiếu từng điều khoản định nghĩa Gross Operating Profit trong HMA với chuẩn USALI 11th',
          'Kỹ năng tổ chức Technical Audit Workshop đạt đồng thuận phê duyệt thanh toán $180,000',
          'Thi cuối khóa HFC-602',
        ],
        topicsEn: [
          'PE Fund Hotel Case: Reconciling HMA AGOP definitions against USALI 11th Non-Operating lines',
          'Facilitating a Technical Audit Workshop to secure amicable $180k invoice settlement',
          'HFC-602 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'USALI Rule: Property Insurance & Depreciation sit strictly below GOP/AGOP unless explicitly carved out in HMA Schedule C',
        ],
        practicalLabVi: 'Soạn thảo Biên bản Hòa giải Kỹ thuật (Technical Audit Resolution Memo) kèm phụ lục trích dẫn USALI bảo vệ khoản $180,000.',
        practicalLabEn: 'Draft the Technical Audit Resolution Memo defending the $180,000 Incentive Fee calculation.',
        deliverablesVi: ['Hồ sơ Giải trình Hòa giải Tranh chấp $180k', 'Bài thi >= 85%'],
        deliverablesEn: ['Technical Fee Dispute Resolution Memo', 'Final Exam (>=85%)'],
      },
    ],
  },

  'HFC-603': {
    courseCode: 'HFC-603',
    overviewVi:
      'Nâng tầm Financial Controller lên tư duy Nhà Đầu tư Bất động sản Tổ chức: Định giá Tài sản Khách sạn bằng phương pháp Vốn hóa Trực tiếp (Cap Rate) & Chiết khấu Dòng tiền 10 năm (DCF), tối ưu hóa Tỷ số Khả năng Trả nợ (DSCR), và chứng minh cách tăng $600k EBITDA bền vững để tạo ra +$8 triệu USD giá trị tài sản trước khi thoái vốn.',
    overviewEn:
      'Elevates the Financial Controller to institutional hotel real estate investment mastery: property valuation via Direct Capitalization (Cap Rates) and 10-Year DCF, Debt Service Coverage Ratio (DSCR) structuring, and engineering $600k+ sustainable EBITDA growth to unlock $8M+ in exit valuation.',
    targetAudienceVi: 'Financial Controller, Cluster Director of Finance, Hospitality Asset Manager, CFO Candidate',
    targetAudienceEn: 'Financial Controllers, Cluster Directors of Finance, Asset Managers, Aspiring CFOs',
    careerTrackStageVi: 'Giai đoạn 4 -> 5: Financial Controller -> Giám Đốc Tài Chính Chuỗi / Asset Director',
    careerTrackStageEn: 'Stage 4 -> 5: Financial Controller -> Cluster Finance / Asset Director',
    competencyCodes: ['SBP-05', 'FPM-04'],
    deliveryFormatVi: 'Hotel Valuation Seminars (5h) · 10-Year DCF & Cap Rate Lab (10h) · $8M Exit Value Case (5h)',
    deliveryFormatEn: 'Real Estate Valuation Seminars (5h) · 10-Year DCF & DSCR Lab (10h) · $8M Exit Valuation Case (5h)',
    totalContactHours: 12,
    totalSelfStudyHours: 8,
    assessmentBreakdown: {
      quizWeight: 25,
      caseStudyWeight: 35,
      practicalOjtWeight: 40,
      passingScore: 85,
    },
    preWorkVi: 'Ôn tập Báo cáo Lưu chuyển Tiền tệ, Lịch trình Trả nợ vay Ngân hàng (Debt Amortization) và Khái niệm EBITDA sau FF&E Reserve.',
    preWorkEn: 'Review Property Debt Service schedules and Normalized EBITDA (Net Operating Income after FF&E Reserve).',
    referencesAndStandards: [
      'HVS / CBRE Hospitality Real Estate Valuation & Cap Rate Methodology',
      'USALI Normalized NOI (EBITDA Less FF&E Reserve) Valuation Standard',
      'Buyer Financial Due Diligence (QoE - Quality of Earnings) Standards',
    ],
    capstoneDeliverableVi: 'Mô hình Định giá Khách sạn 10 năm (DCF + Exit Cap Rate + DSCR) + Kế hoạch Tái cấu trúc Tăng $620k EBITDA bền vững (+$8.26M Giá trị Tài sản).',
    capstoneDeliverableEn: '10-Year Hotel Enterprise Valuation Model (DCF + Exit Cap Rate + DSCR) + $620k Recurring EBITDA Value-Creation Plan (+$8.26M Exit Value).',
    sessions: [
      {
        sessionNumber: 1,
        titleVi: 'Học phần 1: Khách sạn dưới Góc nhìn Bất động sản Dòng tiền & Chuẩn hóa NOI / EBITDA',
        titleEn: 'Session 1: Institutional Hotel Real Estate Lenses & Normalized NOI Calculation',
        durationHours: 5,
        format: 'Video Masterclass',
        learningOutcomesVi: [
          'Phân biệt giữa GOP, EBITDA và Normalized Net Operating Income (NOI = EBITDA - 4% FF&E Reserve)',
          'Hiểu các yếu tố ảnh hưởng đến hệ số Cap Rate khách sạn (Vị trí Gateway, Thời hạn thuê đất, Thương hiệu HMA, Tuổi tài sản)',
        ],
        learningOutcomesEn: [
          'Distinguish GOP, EBITDA, and Valuation NOI (EBITDA less normalized 4% FF&E Reserve)',
          'Analyze Cap Rate drivers: Gateway location, leasehold tenure, brand strength, and physical PIP condition',
        ],
        topicsVi: [
          'Tại sao Quỹ PE trả giá dựa trên NOI sau khi đã trừ 4% FF&E Reserve thay vì chỉ nhìn EBITDA kế toán?',
          'Các phương pháp định giá khách sạn: Direct Capitalization, 10-Year DCF và Giá trị trên mỗi phòng (Price Per Key)',
        ],
        topicsEn: [
          'Why institutional buyers underwrite NOI after 4% FF&E Reserve rather than unadjusted EBITDA',
          'Triangulating Hotel Value: Direct Cap Rate, 10-Year DCF, and Price-Per-Key comparables',
        ],
        keyStandardsAndFormulas: [
          'Property Value (Direct Cap) = Stabilized Normalized NOI / Going-In Cap Rate (e.g., 7.0% - 8.5%)',
          'Value Multiplier Effect: Every +$100,000 Recurring NOI @ 7.5% Cap Rate = +$1,333,333 Asset Value',
        ],
        practicalLabVi: 'Tính toán Normalized NOI và Định giá sơ bộ cho 3 khách sạn (City Business, Luxury Resort, Boutique) theo Cap Rate.',
        practicalLabEn: 'Compute Normalized NOI and Direct Cap Valuations across City, Resort, and Boutique hotel assets.',
        deliverablesVi: ['Bảng Định giá Nhanh 3 Tài sản Khách sạn theo Cap Rate & Price/Key'],
        deliverablesEn: ['3-Asset Hotel Direct Cap & Price-Per-Key Valuation Sheet'],
      },
      {
        sessionNumber: 2,
        titleVi: 'Học phần 2: Xây dựng Mô hình Định giá Khách sạn 10 Năm (DCF & Exit Cap Rate)',
        titleEn: 'Session 2: Building the 10-Year Hotel Valuation DCF & Terminal Value Model',
        durationHours: 5,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Dựng mô hình dự phóng 10 năm RevPAR -> Departmental Profit -> GOP -> EBITDA -> NOI -> Levered/Unlevered Cash Flow',
          'Tính toán Giá trị Thoái vốn (Terminal Value ở Năm 10 = Year 11 NOI / Exit Cap Rate - Selling Costs 2%)',
        ],
        learningOutcomesEn: [
          'Model 10-year hotel RevPAR, GOP, NOI, PIP renovation capex, and Unlevered/Levered cash flows',
          'Calculate Year 10 Terminal Exit Value (Year 11 NOI / Exit Cap Rate less 2% transaction costs)',
        ],
        topicsVi: [
          'Lựa chọn Suất chiết khấu (Discount Rate 10-12%) và Exit Cap Rate (+50 bps cao hơn Going-In Cap Rate)',
          'Tác động của Property Improvement Plan (PIP Capex) năm thứ 5 lên định giá thoái vốn',
          'Độ nhạy 2 chiều giữa Discount Rate và Exit Cap Rate',
        ],
        topicsEn: [
          'Setting Discount Rates (WACC/Unlevered IRR hurdles) vs. Terminal Exit Cap Rate expansion (+50 bps)',
          'Factoring Year 5 Brand PIP Renovations into acquisition underwriting',
          '2-Way Sensitivity Matrix: Discount Rate vs. Exit Cap Rate',
        ],
        keyStandardsAndFormulas: [
          'Terminal Exit Value (Year 10) = (Year 11 NOI / Exit Cap Rate) x (1 - Selling Transaction Fee %)',
          'Enterprise Value = PV(10-Year NOI Cash Flows) + PV(Terminal Value)',
        ],
        practicalLabVi: 'Xây dựng File Excel Mô hình Định giá Khách sạn 10 năm hoàn chỉnh kèm Ma trận Độ nhạy 2 chiều.',
        practicalLabEn: 'Construct the full 10-Year Hotel DCF Enterprise Valuation Workbook with 2-way Sensitivity Table.',
        deliverablesVi: ['File Excel Mô hình Định giá Khách sạn 10 năm (DCF & Exit Cap)'],
        deliverablesEn: ['10-Year Hotel Enterprise Valuation DCF Workbook'],
      },
      {
        sessionNumber: 3,
        titleVi: 'Học phần 3: Tối ưu Cấu trúc Vốn Vay, DSCR Covenants & Chất lượng Lợi nhuận (QoE)',
        titleEn: 'Session 3: Debt Sizing, DSCR Bank Covenants & Buyer Quality of Earnings (QoE)',
        durationHours: 5,
        format: 'Excel Lab',
        learningOutcomesVi: [
          'Kiểm soát các chỉ tiêu khế ước ngân hàng: DSCR (Debt Service Coverage Ratio >= 1.35x) và LTV (Loan-to-Value <= 60%)',
          'Chuẩn bị hồ sơ Quality of Earnings (QoE) loại bỏ các khoản thu bất thường và chứng minh tính bền vững của EBITDA',
        ],
        learningOutcomesEn: [
          'Monitor and protect bank debt covenants: DSCR (>=1.35x), Debt Yield (>=9%), and LTV (<=60%)',
          'Prepare Seller Due Diligence Quality of Earnings (QoE) schedules proving sustainable recurring EBITDA',
        ],
        topicsVi: [
          'Tính toán Tái tài trợ (Refinancing) khi tài sản tăng giá để rút vốn chủ đầu tư',
          'Những "Cờ đỏ Due Diligence" khiến người mua ép giảm giá (hoãn bảo trì POM, cắt giảm nhân sự thiếu bền vững, hạch toán sai FF&E)',
        ],
        topicsEn: [
          'Cash-out refinancing math once stabilized NOI lifts property appraised value',
          'Buyer Due Diligence Red Flags: Deferred maintenance starvation, unsustainable labor cuts, one-off accrual releases',
        ],
        keyStandardsAndFormulas: [
          'DSCR = Annual Normalized NOI / (Annual Principal Repayment + Interest Expense) (Covenant Floor >= 1.25x-1.35x)',
          'Debt Yield = Annual NOI / Total Loan Principal x 100',
        ],
        practicalLabVi: 'Xây dựng Bảng kiểm soát Debt Covenants & QoE EBITDA Adjustments cho khách sạn đang vay $25 triệu USD.',
        practicalLabEn: 'Build a Debt Covenant & QoE EBITDA Bridge model for a property carrying $25M senior debt.',
        deliverablesVi: ['Bảng tính DSCR Covenants & QoE EBITDA Bridge'],
        deliverablesEn: ['DSCR Covenant Monitor & QoE EBITDA Adjustment Sheet'],
      },
      {
        sessionNumber: 4,
        titleVi: 'Học phần 4: Case Study Gia tăng +$8.26 Triệu USD Giá trị Thoái vốn & Thi Đánh giá',
        titleEn: 'Session 4: $620k EBITDA / +$8.26M Exit Valuation Case Study & Final Exam',
        durationHours: 5,
        format: 'Capstone & Exam',
        learningOutcomesVi: [
          'Hoạch định lộ trình 18 tháng tái cấu trúc chi phí cấu trúc (Solar PPA, Outsourced Laundry, Direct Booking) tạo +$620k EBITDA bền vững',
          'Chứng minh +$8.26 triệu USD giá trị gia tăng tại Cap Rate 7.5% vượt qua thẩm định QoE và đạt >= 85% bài thi',
        ],
        learningOutcomesEn: [
          'Design an 18-month structural cost optimization roadmap (Solar PPA, Laundry renegotiation, Direct Mix) delivering +$620k recurring EBITDA',
          'Prove +$8.26M Asset Valuation expansion at a 7.5% Cap Rate surviving buyer QoE scrutiny (>=85% exam)',
        ],
        topicsVi: [
          'Case Study Thoái vốn 18 tháng: Tại sao không được "cắt xén tạm thời" làm giảm điểm Guest NPS trước kỳ Due Diligence',
          'Tổng kết Chiến lược Tài chính 3 năm & Thi cuối khóa HFC-603',
        ],
        topicsEn: [
          '18-Month Exit Value Plan: Structural savings vs. short-sighted service degradation',
          '3-Year Asset Value Creation Blueprint & HFC-603 Final Assessment',
        ],
        keyStandardsAndFormulas: [
          'Valuation Uplift Proof: +$620,000 Recurring EBITDA / 7.5% Exit Cap Rate = +$8,266,667 Exit Proceeds',
        ],
        practicalLabVi: 'Hoàn thiện Bản Đề án Gia tăng Giá trị Tài sản +$8.26M trình Quỹ Đầu tư Chủ sở hữu.',
        practicalLabEn: 'Deliver the +$8.26M Exit Value Creation Board Memo for Ownership sign-off.',
        deliverablesVi: ['Đề án Chiến lược Giá trị Tài sản 3 năm (+$8.26M)', 'Bài thi >= 85%'],
        deliverablesEn: ['3-Year +$8.26M Asset Value Creation Memo', 'Final Exam (>=85%)'],
      },
    ],
  },
};
