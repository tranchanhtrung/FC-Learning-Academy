/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardContainer } from './components/dashboard/DashboardContainer';
import { OnboardingBotWidget } from './components/common/OnboardingBotWidget';
import { GlobalAnnouncementBanner, PromoPopupModal } from './components/common/SiteBroadcastWidgets';
import { Course } from './types';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

// Lazy-loaded views & modals to split the bundle cleanly and accelerate initial paint
const CompetencyFrameworkView = lazy(() =>
  import('./components/competencies/CompetencyFrameworkView').then((m) => ({ default: m.CompetencyFrameworkView }))
);
const AssessmentView = lazy(() =>
  import('./components/assessment/AssessmentView').then((m) => ({ default: m.AssessmentView }))
);
const LearningPathsView = lazy(() =>
  import('./components/paths/LearningPathsView').then((m) => ({ default: m.LearningPathsView }))
);
const CourseCatalogView = lazy(() =>
  import('./components/courses/CourseCatalogView').then((m) => ({ default: m.CourseCatalogView }))
);
const CoursePlayerModal = lazy(() =>
  import('./components/courses/CoursePlayerModal').then((m) => ({ default: m.CoursePlayerModal }))
);
const QuizModal = lazy(() =>
  import('./components/quiz/QuizModal').then((m) => ({ default: m.QuizModal }))
);
const OJTProjectsView = lazy(() =>
  import('./components/ojt/OJTProjectsView').then((m) => ({ default: m.OJTProjectsView }))
);
const AIAssistantView = lazy(() =>
  import('./components/ai/AIAssistantView').then((m) => ({ default: m.AIAssistantView }))
);
const CertificationsView = lazy(() =>
  import('./components/certifications/CertificationsView').then((m) => ({ default: m.CertificationsView }))
);
const PricingBillingView = lazy(() =>
  import('./components/billing/PricingBillingView').then((m) => ({ default: m.PricingBillingView }))
);
const ReportsView = lazy(() =>
  import('./components/reports/ReportsView').then((m) => ({ default: m.ReportsView }))
);
const AdminManagementView = lazy(() =>
  import('./components/admin/AdminManagementView').then((m) => ({ default: m.AdminManagementView }))
);
const DataImportCenterView = lazy(() =>
  import('./components/admin/DataImportCenterView').then((m) => ({ default: m.DataImportCenterView }))
);
const TalentAssessmentView = lazy(() =>
  import('./components/talent/TalentAssessmentView').then((m) => ({ default: m.TalentAssessmentView }))
);
const TalentGapAnalysisView = lazy(() =>
  import('./components/talent/TalentGapAnalysisView').then((m) => ({ default: m.TalentGapAnalysisView }))
);
const TalentActivitiesView = lazy(() =>
  import('./components/talent/TalentActivitiesView').then((m) => ({ default: m.TalentActivitiesView }))
);
const TalentIdpView = lazy(() =>
  import('./components/talent/TalentIdpView').then((m) => ({ default: m.TalentIdpView }))
);
const TalentProgressView = lazy(() =>
  import('./components/talent/TalentProgressView').then((m) => ({ default: m.TalentProgressView }))
);
const TalentReadinessView = lazy(() =>
  import('./components/talent/TalentReadinessView').then((m) => ({ default: m.TalentReadinessView }))
);
const SimulationDashboardTab = lazy(() =>
  import('./components/simulator/SimulationDashboardTab').then((m) => ({ default: m.SimulationDashboardTab }))
);
const ScenarioLibraryTab = lazy(() =>
  import('./components/simulator/ScenarioLibraryTab').then((m) => ({ default: m.ScenarioLibraryTab }))
);
const SimulationWorkspaceTab = lazy(() =>
  import('./components/simulator/SimulationWorkspaceTab').then((m) => ({ default: m.SimulationWorkspaceTab }))
);
const ExecutiveMeetingTab = lazy(() =>
  import('./components/simulator/ExecutiveMeetingTab').then((m) => ({ default: m.ExecutiveMeetingTab }))
);
const SimulationHistoryTab = lazy(() =>
  import('./components/simulator/SimulationHistoryTab').then((m) => ({ default: m.SimulationHistoryTab }))
);
const PerformanceScoreTab = lazy(() =>
  import('./components/simulator/PerformanceScoreTab').then((m) => ({ default: m.PerformanceScoreTab }))
);
const SimulationAdminTab = lazy(() =>
  import('./components/simulator/SimulationAdminTab').then((m) => ({ default: m.SimulationAdminTab }))
);
const ScenarioImportCenterTab = lazy(() =>
  import('./components/simulator/ScenarioImportCenterTab').then((m) => ({ default: m.ScenarioImportCenterTab }))
);
const ScenarioVersionHistoryTab = lazy(() =>
  import('./components/simulator/ScenarioVersionHistoryTab').then((m) => ({ default: m.ScenarioVersionHistoryTab }))
);
const CertificateModal = lazy(() =>
  import('./components/common/CertificateModal').then((m) => ({ default: m.CertificateModal }))
);

const ViewLoadingFallback: React.FC = () => (
  <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3 text-slate-500">
    <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
    <span className="text-xs font-semibold tracking-wide">Đang tải phân hệ...</span>
  </div>
);

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    selectedCourseForPlayer,
    setSelectedCourseForPlayer,
    selectedLessonIdForPlayer,
    setSelectedLessonIdForPlayer,
    selectedCertificateForView,
    setSelectedCertificateForView,
    toasts,
    dismissToast,
    canAccessRoute,
    rolePermissions,
  } = useApp();

  const [activeQuizCourse, setActiveQuizCourse] = useState<Course | null>(null);
  const [quizModalOpen, setQuizModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  // Enforce dynamic RBAC route guard whenever persona, policy, or activeTab changes
  useEffect(() => {
    if (!canAccessRoute(activeTab)) {
      if (activeTab.startsWith('sim') && canAccessRoute('simDashboard')) {
        setActiveTab('simDashboard');
      } else if (canAccessRoute('dashboard')) {
        setActiveTab('dashboard');
      } else {
        const fallbackOrder = ['courses', 'myLearning', 'competencyFramework', 'learningPaths'];
        const nextAllowed = fallbackOrder.find((tab) => canAccessRoute(tab)) || 'dashboard';
        setActiveTab(nextAllowed);
      }
    }
  }, [activeTab, currentUser.role, rolePermissions, canAccessRoute, setActiveTab]);

  const handleStartQuiz = (course: Course) => {
    setActiveQuizCourse(course);
    setQuizModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} isMobileDrawer />
          </div>
        </div>
      )}

      {/* Main Body — Full-width shell keeps Sidebar flush-left at ALL zoom levels & ultrawide monitors */}
      <div className="flex-1 flex w-full">
        {/* Desktop Navigation Sidebar — pinned full viewport height so it never terminates mid-page */}
        <div
          data-tour="sidebar-nav"
          className="hidden lg:block shrink-0 w-64 sticky top-16 h-[calc(100vh-4rem)] self-start"
        >
          <Sidebar />
        </div>

        {/* Dynamic Workspace Container — min-w-0 prevents horizontal overflow; inner max-w keeps wide screens balanced */}
        <main className="flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8">
          <div data-tour="main-workspace" className="max-w-[1440px] mx-auto w-full">
          <GlobalAnnouncementBanner />
          <Suspense fallback={<ViewLoadingFallback />}>
            {activeTab === 'dashboard' && canAccessRoute('dashboard') && <DashboardContainer />}
            {activeTab === 'myLearning' && canAccessRoute('myLearning') && <CourseCatalogView />}
            {activeTab === 'learningPaths' && canAccessRoute('learningPaths') && <LearningPathsView />}
            {activeTab === 'courses' && canAccessRoute('courses') && <CourseCatalogView />}
            {activeTab === 'competencyFramework' && canAccessRoute('competencyFramework') && <CompetencyFrameworkView />}
            {activeTab === 'assessments' && canAccessRoute('assessments') && <AssessmentView />}
            {activeTab === 'talentAssessment' && canAccessRoute('talentAssessment') && <TalentAssessmentView />}
            {activeTab === 'talentGapAnalysis' && canAccessRoute('talentGapAnalysis') && <TalentGapAnalysisView />}
            {activeTab === 'talentActivities' && canAccessRoute('talentActivities') && <TalentActivitiesView />}
            {activeTab === 'talentIdp' && canAccessRoute('talentIdp') && <TalentIdpView />}
            {activeTab === 'talentProgress' && canAccessRoute('talentProgress') && <TalentProgressView />}
            {activeTab === 'talentReadiness' && canAccessRoute('talentReadiness') && <TalentReadinessView />}
            {activeTab === 'ojtProjects' && canAccessRoute('ojtProjects') && <OJTProjectsView />}
            {activeTab === 'aiAssistant' && canAccessRoute('aiAssistant') && <AIAssistantView />}
            {activeTab === 'simDashboard' && canAccessRoute('simDashboard') && <SimulationDashboardTab />}
            {activeTab === 'simLibrary' && canAccessRoute('simLibrary') && <ScenarioLibraryTab />}
            {activeTab === 'simWorkspace' && canAccessRoute('simWorkspace') && <SimulationWorkspaceTab />}
            {activeTab === 'simMeeting' && canAccessRoute('simMeeting') && <ExecutiveMeetingTab />}
            {activeTab === 'simHistory' && canAccessRoute('simHistory') && <SimulationHistoryTab />}
            {activeTab === 'simPerformance' && canAccessRoute('simPerformance') && <PerformanceScoreTab />}
            {activeTab === 'simImportCenter' && canAccessRoute('simImportCenter') && <ScenarioImportCenterTab />}
            {activeTab === 'simAdmin' && canAccessRoute('simAdmin') && <SimulationAdminTab />}
            {activeTab === 'simVersionHistory' && canAccessRoute('simVersionHistory') && <ScenarioVersionHistoryTab />}
            {activeTab === 'certifications' && canAccessRoute('certifications') && <CertificationsView />}
            {activeTab === 'pricing' && canAccessRoute('pricing') && <PricingBillingView />}
            {activeTab === 'reports' && canAccessRoute('reports') && <ReportsView />}
            {activeTab === 'administration' && canAccessRoute('administration') && <AdminManagementView />}
            {activeTab === 'dataImportCenter' && canAccessRoute('dataImportCenter') && <DataImportCenterView />}
          </Suspense>
          </div>
        </main>
      </div>

      {/* Floating Toast Notification Stack — positioned above Finny floating widget */}
      {toasts.length > 0 && (
        <div className="fixed bottom-22 inset-x-4 sm:left-auto sm:right-5 z-[60] flex flex-col gap-2 sm:max-w-sm sm:w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl shadow-lg border text-xs font-semibold transition-all ${
                toast.type === 'error'
                  ? 'bg-rose-950 text-rose-100 border-rose-700'
                  : toast.type === 'info'
                  ? 'bg-slate-900 text-amber-200 border-amber-500/40'
                  : 'bg-emerald-950 text-emerald-100 border-emerald-700'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : toast.type === 'info' ? (
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-relaxed">{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cute Floating Onboarding Assistant & Spotlight Guided Tour */}
      <OnboardingBotWidget />
      <PromoPopupModal />

      {/* Lazy-Loaded Modals */}
      <Suspense fallback={null}>
        {selectedCourseForPlayer && (
          <CoursePlayerModal
            course={selectedCourseForPlayer}
            initialLessonId={selectedLessonIdForPlayer}
            onClose={() => {
              setSelectedCourseForPlayer(null);
              setSelectedLessonIdForPlayer(null);
            }}
            onStartQuiz={handleStartQuiz}
          />
        )}

        {quizModalOpen && (
          <QuizModal
            course={activeQuizCourse}
            onClose={() => {
              setQuizModalOpen(false);
              setActiveQuizCourse(null);
            }}
          />
        )}

        {selectedCertificateForView && (
          <CertificateModal
            certificate={selectedCertificateForView}
            onClose={() => setSelectedCertificateForView(null)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
