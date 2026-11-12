import React from 'react';
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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, t, language } = useApp();

  const isLearner = currentUser.role === 'learner';
  const isAdminOrManager = currentUser.role === 'super_admin' || currentUser.role === 'lnd_manager';
  const isFC = currentUser.role === 'financial_controller';

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
      badge: '3 Paths',
    },
    {
      id: 'courses',
      label: t.nav.courses,
      icon: BookOpen,
      badge: '18 Courses',
    },
    {
      id: 'competencyFramework',
      label: t.nav.competencyFramework,
      icon: Award,
      badge: '30 Comps',
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
      badge: '6 Real Cases',
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
    },
    {
      id: 'administration',
      label: t.nav.administration,
      icon: Settings,
      badge: isAdminOrManager ? 'Admin' : null,
      hidden: !isAdminOrManager && !isFC,
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
            Level {currentUser.currentLevel} / 4
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
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
