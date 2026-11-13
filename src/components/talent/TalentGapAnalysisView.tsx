import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TalentHeaderBar } from './TalentHeaderBar';
import { RadarChart } from '../common/RadarChart';
import { calculateGapAnalysis } from '../../lib/talentEngine';
import {
  AlertTriangle,
  ArrowRight,
  Search,
  Info,
  ShieldAlert,
  Filter,
} from 'lucide-react';

export const TalentGapAnalysisView: React.FC = () => {
  const {
    currentUser,
    users,
    domains,
    competencies,
    talentConfig,
    competencyAssessments,
    selectedTalentEmployeeId,
    selectedTalentTargetPosition,
    setSelectedTalentTargetPosition,
    setActiveTab,
    language,
  } = useApp();

  const isLearner = currentUser.role === 'learner';
  const employeeId = isLearner ? currentUser.id : selectedTalentEmployeeId;

  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyWithGap, setOnlyWithGap] = useState<boolean>(false);

  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    competencyAssessments
      .filter((a) => a.employeeId === employeeId && a.status === 'approved')
      .forEach((a) => periods.add(a.assessmentPeriod));
    return Array.from(periods);
  }, [competencyAssessments, employeeId]);

  const gapSummary = useMemo(
    () =>
      calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId,
        targetPosition: selectedTalentTargetPosition,
        competencies,
        domains,
        config: talentConfig,
        periodFilter: periodFilter === 'all' ? undefined : periodFilter,
      }),
    [
      competencyAssessments,
      employeeId,
      selectedTalentTargetPosition,
      competencies,
      domains,
      talentConfig,
      periodFilter,
    ]
  );

  // Cohort Heatmap Rows (for non-learners or self-only view for learners)
  const cohortProperties = useMemo(
    () => Array.from(new Set(users.map((u) => u.property).filter(Boolean))),
    [users]
  );
  const cohortDepartments = useMemo(
    () => Array.from(new Set(users.map((u) => u.department).filter(Boolean))),
    [users]
  );

  const heatmapEmployees = useMemo(() => {
    return users.filter((u) => {
      if (isLearner) return u.id === currentUser.id;
      if (!['learner', 'financial_controller'].includes(u.role)) return false;
      if (propertyFilter !== 'all' && u.property !== propertyFilter) return false;
      if (departmentFilter !== 'all' && u.department !== departmentFilter) return false;
      return competencyAssessments.some((a) => a.employeeId === u.id && a.status === 'approved');
    });
  }, [users, isLearner, currentUser.id, propertyFilter, departmentFilter, competencyAssessments]);

  const heatmapMatrix = useMemo(() => {
    return heatmapEmployees.map((emp) => {
      const targetPos = emp.position.includes('Assistant Financial Controller')
        ? 'Financial Controller'
        : emp.position.includes('Senior Accountant')
        ? 'Assistant Financial Controller'
        : emp.position.includes('Financial Controller')
        ? 'Strategic Finance Business Partner'
        : 'Senior Accountant';
      const summary = calculateGapAnalysis({
        assessments: competencyAssessments,
        employeeId: emp.id,
        targetPosition: targetPos,
        competencies,
        domains,
        config: talentConfig,
      });
      return { emp, targetPos, summary };
    });
  }, [heatmapEmployees, competencyAssessments, competencies, domains, talentConfig]);

  const filteredRows = useMemo(() => {
    return gapSummary.rows.filter((r) => {
      if (domainFilter !== 'all' && r.domainId !== domainFilter) return false;
      if (onlyWithGap && r.gap === 0 && !r.isUnassessed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.competencyCode.toLowerCase().includes(q) ||
          r.nameEn.toLowerCase().includes(q) ||
          r.nameVi.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [gapSummary.rows, domainFilter, onlyWithGap, searchQuery]);

  const radarData = useMemo(
    () =>
      gapSummary.domainSummaries.map((d) => ({
        code: d.domainCode,
        label: language === 'vi' ? d.domainNameVi : d.domainNameEn,
        current: d.avgCurrentLevel || 0.5,
        target: d.avgTargetLevel || 3,
      })),
    [gapSummary.domainSummaries, language]
  );

  const handleGenerateIdp = () => {
    sessionStorage.setItem('fc_trigger_generate_idp', employeeId);
    setActiveTab('talentIdp');
  };

  return (
    <div className="space-y-6">
      <TalentHeaderBar
        titleEn="Competency Gap Analysis Engine"
        titleVi="Phân tích Khoảng trống Năng lực (Gap Engine)"
        subtitleEn="Real-time gap diagnostics computed strictly from approved competency assessments and authoritative career target profiles."
        subtitleVi="Tính toán khoảng trống năng lực trực tiếp từ kỳ đánh giá đã phê duyệt và ma trận vị trí đích."
        defaultCoachMode="explain_gaps"
      />

      {/* Weight Mode Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {gapSummary.weightMode === 'default_equal'
              ? language === 'vi'
                ? 'Phương pháp tính: Mặc định đồng đều (equal weights) giữa các năng lực bắt buộc của vị trí đích.'
                : 'Scoring methodology: Default equal weights across required competencies for the target position.'
              : language === 'vi'
              ? 'Phương pháp tính: Áp dụng trọng số tùy chỉnh (Custom Weighted) theo cấu hình L&D.'
              : 'Scoring methodology: Custom competency weighting enabled by L&D configuration.'}
          </span>
        </div>
        {gapSummary.hasApprovedAssessment && (
          <div className="text-xs font-mono text-slate-600">
            Source: {gapSummary.assessmentPeriod} · {gapSummary.assessorType}
          </div>
        )}
      </div>

      {!gapSummary.hasApprovedAssessment && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'vi'
                  ? 'Chưa có kỳ đánh giá nào được phê duyệt'
                  : 'No Approved Competency Assessment Found'}
              </h3>
              <p className="text-xs text-slate-700 mt-1">
                {language === 'vi'
                  ? 'Chỉ dữ liệu đánh giá trạng thái Approved mới được đưa vào Gap Engine. Vui lòng hoàn tất và phê duyệt đánh giá trước.'
                  : 'Only Approved assessments feed the Competency Gap Engine. Submit and approve an assessment first.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('talentAssessment')}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === 'vi' ? 'Đi tới Đánh giá Năng lực' : 'Go to Assessment'}
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Mức độ đạt (Achievement)' : 'Competency Achievement'}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {gapSummary.achievementPct}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            Weighted: {gapSummary.weightedAchievementPct}%
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Critical Competency' : 'Critical Competency Score'}
          </p>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              gapSummary.criticalBlockers.length > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {gapSummary.criticalAchievementPct}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {gapSummary.criticalBlockers.length} critical blockers
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Khoảng trống TB (Avg Gap)' : 'Average Gap'}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {gapSummary.averageGap}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {gapSummary.gapDistribution.critical} Critical · {gapSummary.gapDistribution.moderate} Moderate
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium">
            {language === 'vi' ? 'Đã đánh giá / Chưa chấm' : 'Assessed / Unassessed'}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {gapSummary.assessedCount}/{gapSummary.totalRequiredCompetencies}
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            {gapSummary.unassessedCount} unassessed
          </p>
        </div>

        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {language === 'vi' ? 'Hành động kế tiếp' : 'Next Action'}
            </p>
            <p className="text-xs font-semibold text-amber-300 mt-1">
              {gapSummary.priorityDevelopmentList.length}{' '}
              {language === 'vi' ? 'khoảng trống cần thu hẹp' : 'gaps prioritized'}
            </p>
          </div>
          <button
            onClick={handleGenerateIdp}
            disabled={!gapSummary.hasApprovedAssessment}
            className="mt-3 w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>{language === 'vi' ? 'Tạo IDP từ Gap' : 'Generate IDP'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Filter className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Bộ lọc:' : 'Filters:'}</span>
        </div>

        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">{language === 'vi' ? 'Kỳ duyệt mới nhất' : 'Latest Approved Period'}</option>
          {availablePeriods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">{language === 'vi' ? 'Tất cả 6 nhóm năng lực' : 'All 6 Domains'}</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {language === 'vi' ? d.nameVi : d.nameEn}
            </option>
          ))}
        </select>

        {!isLearner && (
          <>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">{language === 'vi' ? 'Tất cả khách sạn' : 'All Properties'}</option>
              {cohortProperties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">{language === 'vi' ? 'Tất cả phòng ban' : 'All Departments'}</option>
              {cohortDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </>
        )}

        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'vi' ? 'Tìm mã hoặc tên năng lực...' : 'Search code or competency...'}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithGap}
            onChange={(e) => setOnlyWithGap(e.target.checked)}
            className="accent-slate-900"
          />
          <span>{language === 'vi' ? 'Chỉ hiện mục có Gap' : 'Only Gaps > 0'}</span>
        </label>
      </div>

      {/* Charts: Radar + Domain Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {language === 'vi' ? 'Biểu đồ Radar Năng lực' : '6-Domain Competency Radar'}
            </h2>
            <span className="text-xs text-slate-500">{selectedTalentTargetPosition}</span>
          </div>
          <RadarChart
            data={radarData}
            size={310}
            targetLabel={language === 'vi' ? `Mục tiêu (${selectedTalentTargetPosition})` : `Target (${selectedTalentTargetPosition})`}
            currentLabel={language === 'vi' ? 'Hiện tại (Đã duyệt)' : 'Approved Current'}
          />
        </div>

        {/* Domain Distribution Bars */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {language === 'vi'
                ? 'So sánh Trung bình Hiện tại vs Mục tiêu theo Domain'
                : 'Domain Current vs Target Level Distribution'}
            </h2>
            <span className="text-xs font-mono text-slate-500">Scale L1–L4</span>
          </div>

          <div className="space-y-4">
            {gapSummary.domainSummaries.map((dom) => {
              const currPct = Math.min(100, (dom.avgCurrentLevel / 4) * 100);
              const tgtPct = Math.min(100, (dom.avgTargetLevel / 4) * 100);
              return (
                <div key={dom.domainId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {dom.domainCode} · {language === 'vi' ? dom.domainNameVi : dom.domainNameEn}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600">
                      L{dom.avgCurrentLevel} / L{dom.avgTargetLevel} ({dom.achievementPct}%)
                    </span>
                  </div>
                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-slate-900 rounded-full transition-all"
                      style={{ width: `${currPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-0.5 bg-amber-500"
                      style={{ left: `${tgtPct}%` }}
                      title={`Target L${dom.avgTargetLevel}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Priority Development List & Current vs Target Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Priority List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'vi' ? 'Danh sách Ưu tiên Phát triển' : 'Priority Development List'}
            </h2>
            <span className="text-xs font-mono font-bold text-amber-700">
              Top {Math.min(8, gapSummary.priorityDevelopmentList.length)}
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {gapSummary.priorityDevelopmentList.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-700 font-semibold">
                {language === 'vi'
                  ? 'Tất cả năng lực đều đạt hoặc vượt mục tiêu!'
                  : 'All competencies meet or exceed target levels!'}
              </div>
            ) : (
              gapSummary.priorityDevelopmentList.map((item) => (
                <div key={item.competencyCode} className="p-3.5 space-y-1 hover:bg-slate-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">
                      #{item.priorityRank} · {item.competencyCode}
                    </span>
                    <span
                      className={`font-semibold ${
                        item.isCritical ? 'text-rose-700' : 'text-amber-700'
                      }`}
                    >
                      {item.isCritical ? 'Critical Gate' : `Gap ${item.gap}`}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">
                    {language === 'vi' ? item.nameVi : item.nameEn}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-500">
                    Current: {item.currentLevel ? `L${item.currentLevel}` : 'Unassessed'} · Target: L{item.targetLevel} · Score {item.priorityScore}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Full Comparison Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'vi' ? 'Bảng Chi tiết Hiện tại vs Mục tiêu' : 'Current vs Target Competency Matrix'}
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {filteredRows.length} competencies
            </span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Code</th>
                  <th className="px-3 py-2.5 font-semibold">Competency</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Current</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Target</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Gap</th>
                  <th className="px-3 py-2.5 font-semibold">Severity Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.competencyCode} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {row.competencyCode}
                      {row.isCritical && (
                        <ShieldAlert
                          className="w-3.5 h-3.5 text-rose-600 inline ml-1"
                          aria-label="Critical Competency"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">
                        {language === 'vi' ? row.nameVi : row.nameEn}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {row.domainCode} · {language === 'vi' ? row.domainNameVi : row.domainNameEn}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono tabular-nums font-semibold">
                      {row.currentLevel ? `L${row.currentLevel}` : 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono tabular-nums font-semibold text-slate-700">
                      L{row.targetLevel}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono tabular-nums font-bold">
                      {row.isUnassessed ? '—' : row.gap}
                    </td>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      <span
                        className={
                          row.isUnassessed
                            ? 'text-slate-500'
                            : row.gapClass === 0
                            ? 'text-emerald-700'
                            : row.gapClass === 1
                            ? 'text-amber-600'
                            : 'text-rose-700'
                        }
                      >
                        Class {row.gapClass} · {row.gapLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Department & Property Competency Heatmap */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'vi'
                ? 'Bản đồ Nhiệt Năng lực theo Khách sạn & Phòng ban (Heatmap)'
                : 'Property & Department Competency Gap Heatmap'}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {heatmapMatrix.length} employees
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="border-b border-slate-200 bg-white text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Employee & Property</th>
                <th className="px-3 py-2.5 font-semibold">Target Position</th>
                {domains.map((d) => (
                  <th key={d.id} className="px-3 py-2.5 font-semibold text-center font-mono">
                    {d.code}
                  </th>
                ))}
                <th className="px-3 py-2.5 font-semibold text-right">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {heatmapMatrix.map(({ emp, targetPos, summary }) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-900">{emp.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {emp.property} · {emp.department}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => setSelectedTalentTargetPosition(targetPos)}
                      className="text-left text-xs text-slate-700 hover:underline cursor-pointer"
                    >
                      {targetPos}
                    </button>
                  </td>
                  {summary.domainSummaries.map((ds) => {
                    const bg =
                      ds.achievementPct >= 90
                        ? 'bg-emerald-50 text-emerald-800'
                        : ds.achievementPct >= 75
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-rose-50 text-rose-800';
                    return (
                      <td key={ds.domainId} className="px-2 py-2 text-center">
                        <div className={`px-2 py-1 rounded font-mono font-bold tabular-nums ${bg}`}>
                          {ds.achievementPct}%
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                    {summary.achievementPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
