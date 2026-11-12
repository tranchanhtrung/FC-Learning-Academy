/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { CertificateModal } from './components/common/CertificateModal';
import { Course } from './types';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    selectedCourseForPlayer,
    setSelectedCourseForPlayer,
    selectedCertificateForView,
    setSelectedCertificateForView,
  } = useApp();

  const [activeQuizCourse, setActiveQuizCourse] = useState<Course | null>(null);
  const [quizModalOpen, setQuizModalOpen] = useState<boolean>(false);

  const handleStartQuiz = (course: Course) => {
    setActiveQuizCourse(course);
    setQuizModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardContainer />}
          {activeTab === 'myLearning' && <CourseCatalogView />}
          {activeTab === 'learningPaths' && <LearningPathsView />}
          {activeTab === 'courses' && <CourseCatalogView />}
          {activeTab === 'competencyFramework' && <CompetencyFrameworkView />}
          {activeTab === 'assessments' && <AssessmentView />}
          {activeTab === 'ojtProjects' && <OJTProjectsView />}
          {activeTab === 'aiAssistant' && <AIAssistantView />}
          {activeTab === 'certifications' && <CertificationsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'administration' && <AdminManagementView />}
        </main>
      </div>

      {/* Modals */}
      {selectedCourseForPlayer && (
        <CoursePlayerModal
          course={selectedCourseForPlayer}
          onClose={() => setSelectedCourseForPlayer(null)}
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
