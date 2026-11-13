import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STANDARD_CAREER_POSITIONS } from '../../lib/talentEngine';
import { AICoachDrawer, CoachMode } from './AICoachDrawer';
import { TalentConfigModal } from './TalentConfigModal';
import {
  Bot,
  Sliders,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  FileSpreadsheet,
  TrendingUp,
  Award,
} from 'lucide-react';

interface TalentHeaderBarProps {
  titleEn: string;
  titleVi: string;
  subtitleEn: string;
  subtitleVi: string;
  defaultCoachMode?: CoachMode;
}

export const TalentHeaderBar: React.FC<TalentHeaderBarProps> = ({
  titleEn,
  titleVi,
  subtitleEn,
  subtitleVi,
  defaultCoachMode = 'explain_gaps',
}) => {
  const {
    currentUser,
    users,
    language,
    activeTab,
    setActiveTab,
    selectedTalentEmployeeId,
    setSelectedTalentEmployeeId,
    selectedTalentTargetPosition,
    setSelectedTalentTargetPosition,
  } = useApp();

  const [coachOpen, setCoachOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const isLearner = currentUser.role === 'learner';
  const isAdminOrLnd = currentUser.role === 'super_admin' || currentUser.role === 'lnd_manager';

  const cohortUsers = users.filter((u) =>
    ['learner', 'financial_controller'].includes(u.role) || u.id === selectedTalentEmployeeId
  );

  const effectiveEmployeeId = isLearner ? currentUser.id : selectedTalentEmployeeId;
  const effectiveEmployee = users.find((u) => u.id === effectiveEmployeeId) || currentUser;

  const workflowSteps = [
    { id: 'talentAssessment', labelVi: '1. Đánh giá năng lực', labelEn: '1. Assessment', icon: ClipboardCheck },
    { id: 'talentGapAnalysis', labelVi: '2. Phân tích Gap', labelEn: '2. Gap Analysis', icon: BarChart3 },
    { id: 'talentActivities', labelVi: '3. Hoạt động & Minh chứng', labelEn: '3. Activities', icon: BookOpen },
    { id: 'talentIdp', labelVi: '4. Kế hoạch IDP', labelEn: '4. IDP Builder', icon: FileSpreadsheet },
    { id: 'talentProgress', labelVi: '5. Tiến độ & Tái đánh giá', labelEn: '5. Reassessment', icon: TrendingUp },
    { id: 'talentReadiness', labelVi: '6. Sẵn sàng & Báo cáo', labelEn: '6. Readiness & Reports', icon: Award },
  ];

  const handleEmployeeChange = (newEmpId: string) => {
    setSelectedTalentEmployeeId(newEmpId);
    const emp = users.find((u) => u.id === newEmpId);
    if (emp) {
      if (emp.position.includes('Assistant Financial Controller')) {
        setSelectedTalentTargetPosition('Financial Controller');
      } else if (emp.position.includes('Senior Accountant')) {
        setSelectedTalentTargetPosition('Assistant Financial Controller');
      } else if (emp.position.includes('Financial Controller')) {
        setSelectedTalentTargetPosition('Strategic Finance Business Partner');
      } else {
        setSelectedTalentTargetPosition('Senior Accountant');
      }
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Main Title & Controls */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-medium">
            <span>{language === 'vi' ? 'Phát triển nhân tài' : 'Talent Development'}</span>
            <span aria-hidden="true">·</span>
            <span>{language === 'vi' ? 'Năng lực & IDP' : 'Competency & IDP Engine'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300">{effectiveEmployee.property}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {language === 'vi' ? titleVi : titleEn}
          </h1>
          <p className="text-xs text-slate-300">
            {language === 'vi' ? subtitleVi : subtitleEn}
          </p>
        </div>

        {/* Employee, Target Position & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {language === 'vi' ? 'Nhân sự mục tiêu' : 'Employee'}
            </label>
            {isLearner ? (
              <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white whitespace-nowrap">
                {currentUser.name} ({currentUser.position})
              </div>
            ) : (
              <select
                value={effectiveEmployeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {cohortUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.position}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {language === 'vi' ? 'Vị trí đích (Career Target)' : 'Target Position'}
            </label>
            <select
              value={selectedTalentTargetPosition}
              onChange={(e) => setSelectedTalentTargetPosition(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {STANDARD_CAREER_POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-4 sm:pt-0 sm:self-end">
            <button
              onClick={() => setCoachOpen(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>{language === 'vi' ? 'AI Coach' : 'AI Coach'}</span>
            </button>
            {isAdminOrLnd && (
              <button
                onClick={() => setConfigOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>{language === 'vi' ? 'Cấu hình' : 'Engine Config'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6-Stage Sub-Module Workflow Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white border border-slate-200 rounded-xl">
        {workflowSteps.map((step) => {
          const Icon = step.icon;
          const active = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{language === 'vi' ? step.labelVi : step.labelEn}</span>
            </button>
          );
        })}
      </div>

      <AICoachDrawer
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
        employeeId={effectiveEmployeeId}
        targetPosition={selectedTalentTargetPosition}
        initialMode={defaultCoachMode}
      />

      <TalentConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
};
