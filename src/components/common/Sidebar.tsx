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
} from 'lucide-react';

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
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
  } = useApp();

  const [talentExpanded, setTalentExpanded] = useState(true);

  const isLearner = currentUser.role === 'learner';
  const isAdminOrManager = currentUser.role === 'super_admin' || currentUser.role === 'lnd_manager';

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
    },
    {
      id: 'myLearning',
      label: t.nav.myLearning,
      icon: GraduationCap,
      badge: isLearner ? 'Active' : null,
    },
    {
      id: 'learningPaths',
      label: t.nav.learningPaths,
      icon: GitBranch,
      badge: `${learningPaths.length} Paths`,
    },
    {
      id: 'courses',
      label: t.nav.courses,
      icon: BookOpen,
      badge: `${courses.length} Courses`,
    },
    {
      id: 'competencyFramework',
      label: t.nav.competencyFramework,
      icon: Award,
      badge: `${competencies.length} Comps`,
    },
    {
      id: 'assessments',
      label: t.nav.assessments,
      icon: ClipboardCheck,
      badge: 'Gap Matrix',
    },
    {
      id: 'ojtProjects',
      label: t.nav.ojtProjects,
      icon: Briefcase,
      badge: `${ojtAssignments.length} Real Cases`,
    },
    {
      id: 'aiAssistant',
      label: t.nav.aiAssistant,
      icon: Bot,
      badge: 'GM Simulator',
      highlight: true,
    },
    {
      id: 'certifications',
      label: t.nav.certifications,
      icon: Award,
      badge: '5 Levels',
    },
    {
      id: 'reports',
      label: t.nav.reports,
      icon: FileBarChart2,
      badge: null,
      hidden: isLearner,
    },
    {
      id: 'administration',
      label: t.nav.administration,
      icon: Settings,
      badge: isAdminOrManager ? 'Admin' : null,
      hidden: !isAdminOrManager,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Property & User Status Card */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40"
          />
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
            <p className="text-[11px] text-amber-400 font-medium truncate">{t.roles[currentUser.role]}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.department}</p>
          </div>
        </div>

        {/* Current Readiness Badge */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">
            {language === 'vi' ? 'Cấp độ năng lực:' : 'Proficiency:'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
            Level {currentUser.currentLevel} / {currentUser.targetLevel}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.hidden)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    onNavigate?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : item.highlight
                      ? 'text-amber-300 hover:bg-slate-800/80 bg-amber-500/10 border border-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
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
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${
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

                {item.id === 'assessments' && (
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

                {item.id === 'administration' && isAdminOrManager && (
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
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        activeTab === 'dataImportCenter'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Database
                          className={`w-3.5 h-3.5 shrink-0 ${
                            activeTab === 'dataImportCenter' ? 'text-slate-950' : 'text-amber-400'
                          }`}
                        />
                        <span className="truncate">{t.nav.dataImportCenter}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
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
      <div className="p-3.5 m-3 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700/60 text-center">
        <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>USALI 11th & 12th</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Marriott &bull; IHG &bull; Accor &bull; Hilton Benchmark Framework
        </p>
      </div>
    </aside>
  );
};
