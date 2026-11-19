/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardContainer } from './components/dashboard/DashboardContainer';
import { CompetencyFrameworkView } from './components/competencies/CompetencyFrameworkView';
import { AssessmentView } from './components/assessment/AssessmentView';
import { LearningPathsView } from './components/paths/LearningPathsView';
import { CourseCatalogView } from './components/courses/CourseCatalogView';
import { CoursePlayerModal } from './components/courses/CoursePlayerModal';
import { QuizModal } from './components/quiz/QuizModal';
import { OJTProjectsView } from './components/ojt/OJTProjectsView';
import { AIAssistantView } from './components/ai/AIAssistantView';
import { CertificationsView } from './components/certifications/CertificationsView';
import { ReportsView } from './components/reports/ReportsView';
import { AdminManagementView } from './components/admin/AdminManagementView';
import { DataImportCenterView } from './components/admin/DataImportCenterView';
import { TalentAssessmentView } from './components/talent/TalentAssessmentView';
import { TalentGapAnalysisView } from './components/talent/TalentGapAnalysisView';
import { TalentActivitiesView } from './components/talent/TalentActivitiesView';
import { TalentIdpView } from './components/talent/TalentIdpView';
import { TalentProgressView } from './components/talent/TalentProgressView';
import { TalentReadinessView } from './components/talent/TalentReadinessView';
import { SimulationDashboardTab } from './components/simulator/SimulationDashboardTab';
import { ScenarioLibraryTab } from './components/simulator/ScenarioLibraryTab';
import { SimulationWorkspaceTab } from './components/simulator/SimulationWorkspaceTab';
import { ExecutiveMeetingTab } from './components/simulator/ExecutiveMeetingTab';
import { SimulationHistoryTab } from './components/simulator/SimulationHistoryTab';
import { PerformanceScoreTab } from './components/simulator/PerformanceScoreTab';
import { SimulationAdminTab } from './components/simulator/SimulationAdminTab';
import { ScenarioImportCenterTab } from './components/simulator/ScenarioImportCenterTab';
import { ScenarioVersionHistoryTab } from './components/simulator/ScenarioVersionHistoryTab';
import { CertificateModal } from './components/common/CertificateModal';
import { Course } from './types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full overflow-y-auto bg-slate-900 shadow-2xl">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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
          {activeTab === 'reports' && canAccessRoute('reports') && <ReportsView />}
          {activeTab === 'administration' && canAccessRoute('administration') && <AdminManagementView />}
          {activeTab === 'dataImportCenter' && canAccessRoute('dataImportCenter') && <DataImportCenterView />}
        </main>
      </div>

      {/* Floating Toast Notification Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
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

      {/* Modals */}
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
