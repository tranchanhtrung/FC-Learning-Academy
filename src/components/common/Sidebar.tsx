import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  GraduationCap,
  GitBranch,
  BookOpen,
  Award,
  ClipboardCheck,
  Briefcase,
  Bot,
  FileBarChart2,
  Settings,
  Sparkles,
  Database,
  ChevronRight,
  ChevronDown,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Target,
  Play,
  MessageSquare,
  History,
  X,
} from 'lucide-react';

interface SidebarProps {
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
}

const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%231E293B"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23F59E0B" font-family="sans-serif" font-weight="700" font-size="22">FC</text></svg>';

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, isMobileDrawer = false }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    t,
    language,
    learningPaths,
    courses,
    competencies,
    ojtAssignments,
    hasPermission,
    canAccessRoute,
  } = useApp();

  const [talentExpanded, setTalentExpanded] = useState(true);
  const [simulatorExpanded, setSimulatorExpanded] = useState(true);

  const isVi = language === 'vi';
  const isLearner = !hasPermission('view_all_learners_data');
  const canAccessTalentSuite = canAccessRoute('talentAssessment');
  const canAccessSimulatorCore = canAccessRoute('simDashboard');
  const canAccessDataImport = canAccessRoute('dataImportCenter');
  const canAccessAdministration = canAccessRoute('administration');

  const simulatorSubItems = [
    ...(canAccessSimulatorCore
      ? [
          { id: 'simDashboard', label: t.nav.simDashboard, icon: LayoutDashboard },
          { id: 'simLibrary', label: t.nav.simLibrary, icon: BookOpen },
          { id: 'simWorkspace', label: t.nav.simWorkspace, icon: Play },
          { id: 'simMeeting', label: t.nav.simMeeting, icon: MessageSquare },
          { id: 'simHistory', label: t.nav.simHistory, icon: History },
          { id: 'simPerformance', label: t.nav.simPerformance, icon: Award },
        ]
      : []),
    ...(canAccessRoute('simImportCenter')
      ? [{ id: 'simImportCenter', label: t.nav.simImportCenter, icon: FileSpreadsheet }]
      : []),
    ...(canAccessRoute('simAdmin')
      ? [
          { id: 'simAdmin', label: t.nav.simAdmin, icon: Settings },
          { id: 'simVersionHistory', label: t.nav.simVersionHistory, icon: GitBranch },
        ]
      : []),
  ];

  const talentSubItems = [
    { id: 'talentAssessment', label: t.nav.talentAssessment, icon: ClipboardCheck },
    { id: 'talentGapAnalysis', label: t.nav.talentGapAnalysis, icon: BarChart3 },
    { id: 'talentActivities', label: t.nav.talentActivities, icon: BookOpen },
    { id: 'talentIdp', label: t.nav.talentIdp, icon: FileSpreadsheet },
    { id: 'talentProgress', label: t.nav.talentProgress, icon: TrendingUp },
    { id: 'talentReadiness', label: t.nav.talentReadiness, icon: Target },
  ];

  const navItems = [
    {
      id: 'dashboard',
      label: t.nav.dashboard,
      icon: LayoutDashboard,
      badge: null,
      hidden: !canAccessRoute('dashboard'),
    },
    {
      id: 'myLearning',
      label: t.nav.myLearning,
      icon: GraduationCap,
      badge: isLearner ? (isVi ? 'Đang học' : 'Active') : null,
      hidden: !canAccessRoute('myLearning'),
    },
    {
      id: 'learningPaths',
      label: t.nav.learningPaths,
      icon: GitBranch,
      badge: `${learningPaths.length}`,
      hidden: !canAccessRoute('learningPaths'),
    },
    {
      id: 'courses',
      label: t.nav.courses,
      icon: BookOpen,
      badge: `${courses.length}`,
      hidden: !canAccessRoute('courses'),
    },
    {
      id: 'competencyFramework',
      label: t.nav.competencyFramework,
      icon: Award,
      badge: `${competencies.length}`,
      hidden: !canAccessRoute('competencyFramework'),
    },
    {
      id: 'assessments',
      label: t.nav.assessments,
      icon: ClipboardCheck,
      badge: isVi ? 'Ma trận' : 'Matrix',
      hidden: !canAccessRoute('assessments'),
    },
    {
      id: 'ojtProjects',
      label: t.nav.ojtProjects,
      icon: Briefcase,
      badge: `${ojtAssignments.length}`,
      hidden: !canAccessRoute('ojtProjects'),
    },
    {
      id: 'aiAssistant',
      label: t.nav.aiAssistant,
      icon: Bot,
      badge: 'AI',
      highlight: true,
      hidden: !canAccessRoute('aiAssistant'),
    },
    {
      id: 'certifications',
      label: t.nav.certifications,
      icon: Award,
      badge: isVi ? '5 cấp' : '5 Lvls',
      hidden: !canAccessRoute('certifications'),
    },
    {
      id: 'reports',
      label: t.nav.reports,
      icon: FileBarChart2,
      badge: null,
      hidden: !canAccessRoute('reports'),
    },
    {
      id: 'administration',
      label: t.nav.administration,
      icon: Settings,
      badge: canAccessAdministration ? (isVi ? 'Quản trị' : 'Admin') : null,
      hidden: !canAccessAdministration,
    },
  ];

  return (
    <aside className="w-full h-full bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col">
      {/* Property & User Status Card */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              onError={(e) => {
                e.currentTarget.src = FALLBACK_AVATAR;
              }}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
              <p className="text-[11px] text-amber-400 font-medium truncate">{t.roles[currentUser.role]}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser.department}</p>
            </div>
          </div>

          {isMobileDrawer && onNavigate && (
            <button
              onClick={onNavigate}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
              aria-label={isVi ? 'Đóng menu' : 'Close menu'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Current Readiness Badge */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] gap-2">
          <span className="text-slate-400 font-medium truncate">
            {isVi ? 'Cấp độ năng lực:' : 'Proficiency:'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px] whitespace-nowrap shrink-0">
            {isVi
              ? `Cấp ${currentUser.currentLevel} / ${currentUser.targetLevel}`
              : `Level ${currentUser.currentLevel} / ${currentUser.targetLevel}`}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navItems
          .filter((item) => !item.hidden)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                <button
                  data-tour={!isMobileDrawer ? `nav-${item.id}` : undefined}
                  onClick={() => {
                    setActiveTab(item.id);
                    onNavigate?.();
                  }}
                  title={item.label}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : item.highlight
                      ? 'text-amber-300 hover:bg-slate-800/80 bg-amber-500/10 border border-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-slate-950'
                          : item.highlight
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 tabular-nums ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950'
                          : item.highlight
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                {item.id === 'assessments' && canAccessTalentSuite && (
                  <div className="pt-1 pb-1">
                    <button
                      onClick={() => setTalentExpanded((p) => !p)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/90 hover:text-amber-300 cursor-pointer"
                    >
                      <span className="truncate">
                        {t.nav.talentDevelopment} · {t.nav.competencyAndDev}
                      </span>
                      {talentExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>

                    {talentExpanded && (
                      <div className="ml-3 pl-3 border-l border-slate-700/70 space-y-1 pt-1">
                        {talentSubItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = activeTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setActiveTab(sub.id);
                                onNavigate?.();
                              }}
                              title={sub.label}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                                subActive
                                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                              }`}
                            >
                              <SubIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  subActive ? 'text-slate-950' : 'text-amber-400'
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {item.id === 'aiAssistant' && simulatorSubItems.length > 0 && (
                  <div className="pt-1 pb-1">
                    <button
                      onClick={() => setSimulatorExpanded((p) => !p)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      <span className="truncate">{t.nav.simulatorMenu}</span>
                      {simulatorExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>

                    {simulatorExpanded && (
                      <div className="ml-3 pl-3 border-l border-amber-500/30 space-y-1 pt-1">
                        {simulatorSubItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = activeTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setActiveTab(sub.id);
                                onNavigate?.();
                              }}
                              title={sub.label}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                                subActive
                                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                              }`}
                            >
                              <SubIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  subActive ? 'text-slate-950' : 'text-amber-400'
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {item.id === 'administration' && canAccessDataImport && (
                  <div className="ml-3 pl-3 border-l border-slate-700/70 space-y-1 pt-1">
                    <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      <span>{t.nav.dataManagement}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('dataImportCenter');
                        onNavigate?.();
                      }}
                      title={t.nav.dataImportCenter}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        activeTab === 'dataImportCenter'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Database
                          className={`w-3.5 h-3.5 shrink-0 ${
                            activeTab === 'dataImportCenter' ? 'text-slate-950' : 'text-amber-400'
                          }`}
                        />
                        <span className="truncate">{t.nav.dataImportCenter}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          activeTab === 'dataImportCenter'
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-slate-800 text-amber-300'
                        }`}
                      >
                        XLSX
                      </span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
      </nav>

      {/* Bottom International Benchmark Badge */}
      <div className="p-3 m-3 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700/60 text-center shrink-0">
        <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>USALI 11th &amp; 12th</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Marriott &bull; IHG &bull; Accor &bull; Hilton
        </p>
      </div>
    </aside>
  );
};
