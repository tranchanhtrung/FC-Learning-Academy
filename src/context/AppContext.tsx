import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  CompetencyDomain,
  Competency,
  Course,
  CourseEnrollment,
  QuizAttempt,
  OJTAssignment,
  AssignmentSubmission,
  LearningPath,
  AssessmentRecord,
  IndividualDevelopmentPlan,
  Certificate,
  SuccessionCandidate,
} from '../types';
import {
  INITIAL_USERS,
  COMPETENCY_DOMAINS,
  COMPETENCIES,
  COURSES,
  OJT_ASSIGNMENTS,
  LEARNING_PATHS,
  INITIAL_ASSESSMENT_RECORDS,
  INITIAL_IDPS,
  INITIAL_CERTIFICATES,
  SUCCESSION_CANDIDATES,
} from '../data/initialData';
import { translations, Language } from '../i18n/translations';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.vi;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Data collections
  users: User[];
  domains: CompetencyDomain[];
  competencies: Competency[];
  courses: Course[];
  enrollments: CourseEnrollment[];
  quizAttempts: QuizAttempt[];
  ojtAssignments: OJTAssignment[];
  submissions: AssignmentSubmission[];
  learningPaths: LearningPath[];
  assessments: AssessmentRecord[];
  idps: IndividualDevelopmentPlan[];
  certificates: Certificate[];
  successionCandidates: SuccessionCandidate[];

  // Actions
  enrollCourse: (courseId: string) => void;
  updateCourseProgress: (courseId: string, moduleId: string) => void;
  submitQuizAttempt: (
    courseId: string | undefined,
    quizTitle: string,
    score: number,
    total: number,
    passed: boolean,
    answers: Record<string, any>
  ) => void;
  submitAssignment: (assignmentId: string, notes: string, fileName?: string, aiResult?: any) => void;
  gradeAssignment: (submissionId: string, score: number, feedback: string, status: 'approved' | 'revision_requested') => void;
  saveCompetency: (comp: Competency) => void;
  deleteCompetency: (id: string) => void;
  saveAssessment: (record: AssessmentRecord) => Promise<AssessmentRecord>;
  generateIDPFromGap: (learnerId: string, targetPosition?: string, approvedBy?: string) => Promise<IndividualDevelopmentPlan | void>;
  updateIDPItem: (
    learnerId: string,
    itemId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    evidenceNotes?: string,
    mentorNotes?: string
  ) => Promise<void>;
  saveIDPPlan: (plan: IndividualDevelopmentPlan) => Promise<void>;
  createAssessmentCycle: (learnerId: string, cycleName: string) => AssessmentRecord;
  issueCertificate: (userId: string, level: 1 | 2 | 3 | 4 | 5) => void;
  selectedCourseForPlayer: Course | null;
  setSelectedCourseForPlayer: (c: Course | null) => void;
  selectedCertificateForView: Certificate | null;
  setSelectedCertificateForView: (cert: Certificate | null) => void;
  activeQuizTopic: string | null;
  setActiveQuizTopic: (topic: string | null) => void;
  notifications: Array<{ id: string; title: string; time: string; read: boolean }>;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default user: Learner (Nguyen Minh Thu) to showcase learner experience directly, with 1-click persona switch
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem('fc_active_user_id');
    const found = INITIAL_USERS.find((u) => u.id === savedId);
    return found || INITIAL_USERS.find((u) => u.id === 'user_learner1') || INITIAL_USERS[0];
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('fc_language') as Language) || 'vi';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<Course | null>(null);
  const [selectedCertificateForView, setSelectedCertificateForView] = useState<Certificate | null>(null);
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);

  // Initial enrollments for demo learners
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([
    {
      id: 'enr_1',
      userId: 'user_learner1',
      courseId: 'course_01',
      progressPercent: 100,
      completedModules: ['mod_101_1', 'mod_101_2', 'mod_101_3', 'mod_101_4'],
      status: 'completed',
      enrolledDate: '2024-02-18',
      completedDate: '2024-03-01',
      quizScore: 92,
    },
    {
      id: 'enr_2',
      userId: 'user_learner1',
      courseId: 'course_02',
      progressPercent: 66,
      completedModules: ['mod_102_1', 'mod_102_2'],
      status: 'in_progress',
      enrolledDate: '2024-03-05',
    },
    {
      id: 'enr_3',
      userId: 'user_learner1',
      courseId: 'course_03',
      progressPercent: 33,
      completedModules: ['mod_201_1'],
      status: 'in_progress',
      enrolledDate: '2024-04-10',
    },
    {
      id: 'enr_4',
      userId: 'user_learner2',
      courseId: 'course_01',
      progressPercent: 100,
      completedModules: ['mod_101_1', 'mod_101_2', 'mod_101_3', 'mod_101_4'],
      status: 'completed',
      enrolledDate: '2023-08-15',
      completedDate: '2023-09-02',
      quizScore: 96,
    },
    {
      id: 'enr_5',
      userId: 'user_learner2',
      courseId: 'course_04',
      progressPercent: 100,
      completedModules: ['mod_202_1', 'mod_202_2'],
      status: 'completed',
      enrolledDate: '2023-10-10',
      completedDate: '2023-11-05',
      quizScore: 88,
    },
    {
      id: 'enr_6',
      userId: 'user_learner2',
      courseId: 'course_09',
      progressPercent: 66,
      completedModules: ['mod_501_1', 'mod_501_2'],
      status: 'in_progress',
      enrolledDate: '2024-01-10',
    },
  ]);

  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([
    {
      id: 'qa_001',
      userId: 'user_learner1',
      courseId: 'course_01',
      quizTitle: 'USALI Mastery Comprehensive Quiz',
      score: 92,
      totalQuestions: 10,
      passed: true,
      date: '2024-03-01',
      answers: {},
    },
    {
      id: 'qa_002',
      userId: 'user_learner2',
      courseId: 'course_01',
      quizTitle: 'USALI Mastery Comprehensive Quiz',
      score: 96,
      totalQuestions: 10,
      passed: true,
      date: '2023-09-02',
      answers: {},
    },
  ]);

  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([
    {
      id: 'sub_001',
      assignmentId: 'ojt_01',
      userId: 'user_learner1',
      submittedDate: '2024-03-12',
      status: 'approved',
      submissionNotes: 'Đã hoàn thành bảng checklist khóa sổ tháng 10 và báo cáo P&L Critique giải trình các biến động chi phí trên 5% của bộ phận Buồng và F&B.',
      fileName: 'MinhThu_OJT_MonthEnd_Closing_Pack.xlsx',
      fileSize: '2.4 MB',
      score: 90,
      feedback: 'Bài làm rất cẩn trọng, phân tích biến động chi phí buồng phòng sắc bén. Cần lưu ý thêm về trích trước chi phí hoa hồng OTA.',
      reviewedBy: 'David Tran (Cluster FC)',
      reviewedDate: '2024-03-15',
    },
    {
      id: 'sub_002',
      assignmentId: 'ojt_04',
      userId: 'user_learner2',
      submittedDate: '2024-03-18',
      status: 'under_review',
      submissionNotes: 'Gửi Hội đồng hồ sơ thẩm định CAPEX hệ thống Smart Energy $850k, mô hình DCF và độ nhạy NPV với giá điện tăng 7%.',
      fileName: 'HoangNam_SmartEnergy_Capex_CAR.xlsx',
      fileSize: '3.8 MB',
    },
  ]);

  const [competencies, setCompetencies] = useState<Competency[]>(COMPETENCIES);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(INITIAL_ASSESSMENT_RECORDS);
  const [idps, setIdps] = useState<IndividualDevelopmentPlan[]>(INITIAL_IDPS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  const [notifications, setNotifications] = useState([
    {
      id: 'notif_1',
      title: 'Đánh giá năng lực Q1/2026 đã được Giám Đốc Tài Chính David Tran phê duyệt.',
      time: '10 phút trước',
      read: false,
    },
    {
      id: 'notif_2',
      title: 'Kế hoạch phát triển cá nhân (IDP) mới đã được tạo dựa trên khoảng trống năng lực.',
      time: '2 giờ trước',
      read: false,
    },
    {
      id: 'notif_3',
      title: 'Kịch bản khủng hoảng mới có sẵn trên FC Business Partner Simulator với GM.',
      time: '1 ngày trước',
      read: true,
    },
  ]);

  useEffect(() => {
    localStorage.setItem('fc_active_user_id', currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('fc_language', language);
  }, [language]);

  const enrollCourse = (courseId: string) => {
    const existing = enrollments.find(
      (e) => e.userId === currentUser.id && e.courseId === courseId
    );
    if (!existing) {
      const newEnrollment: CourseEnrollment = {
        id: `enr_${Date.now()}`,
        userId: currentUser.id,
        courseId,
        progressPercent: 0,
        completedModules: [],
        status: 'in_progress',
        enrolledDate: new Date().toISOString().split('T')[0],
      };
      setEnrollments((prev) => [newEnrollment, ...prev]);
    }
  };

  const updateCourseProgress = (courseId: string, moduleId: string) => {
    setEnrollments((prev) =>
      prev.map((enr) => {
        if (enr.userId === currentUser.id && enr.courseId === courseId) {
          const completed = enr.completedModules.includes(moduleId)
            ? enr.completedModules
            : [...enr.completedModules, moduleId];
          const course = COURSES.find((c) => c.id === courseId);
          const totalModules = course?.modules.length || 1;
          const percent = Math.min(100, Math.round((completed.length / totalModules) * 100));
          return {
            ...enr,
            completedModules: completed,
            progressPercent: percent,
            status: percent === 100 ? 'completed' : 'in_progress',
            completedDate: percent === 100 ? new Date().toISOString().split('T')[0] : enr.completedDate,
          };
        }
        return enr;
      })
    );
  };

  const submitQuizAttempt = (
    courseId: string | undefined,
    quizTitle: string,
    score: number,
    total: number,
    passed: boolean,
    answers: Record<string, any>
  ) => {
    const newAttempt: QuizAttempt = {
      id: `qa_${Date.now()}`,
      userId: currentUser.id,
      courseId,
      quizTitle,
      score,
      totalQuestions: total,
      passed,
      date: new Date().toISOString().split('T')[0],
      answers,
    };
    setQuizAttempts((prev) => [newAttempt, ...prev]);

    if (courseId) {
      setEnrollments((prev) =>
        prev.map((e) =>
          e.userId === currentUser.id && e.courseId === courseId
            ? { ...e, quizScore: Math.max(e.quizScore || 0, score) }
            : e
        )
      );
    }
  };

  const submitAssignment = (
    assignmentId: string,
    notes: string,
    fileName?: string,
    aiResult?: any
  ) => {
    const newSub: AssignmentSubmission = {
      id: `sub_${Date.now()}`,
      assignmentId,
      userId: currentUser.id,
      submittedDate: new Date().toISOString().split('T')[0],
      status: aiResult?.passed ? 'approved' : 'submitted',
      submissionNotes: notes,
      fileName: fileName || 'FC_OJT_Deliverable_Workbook.xlsx',
      fileSize: '3.1 MB',
      score: aiResult?.score,
      feedback: aiResult?.feedback,
      reviewedBy: aiResult ? 'AI Preliminary Evaluator (Gemini 3.8 Flash)' : undefined,
      reviewedDate: aiResult ? new Date().toISOString().split('T')[0] : undefined,
      aiGraded: !!aiResult,
    };
    setSubmissions((prev) => [newSub, ...prev]);
  };

  const gradeAssignment = (
    submissionId: string,
    score: number,
    feedback: string,
    status: 'approved' | 'revision_requested'
  ) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              score,
              feedback,
              status,
              reviewedBy: currentUser.name,
              reviewedDate: new Date().toISOString().split('T')[0],
            }
          : s
      )
    );
  };

  const saveCompetency = (comp: Competency) => {
    setCompetencies((prev) => {
      const idx = prev.findIndex((c) => c.id === comp.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = comp;
        return updated;
      }
      return [...prev, comp];
    });
  };

  const deleteCompetency = (id: string) => {
    setCompetencies((prev) => prev.filter((c) => c.id !== id));
  };

  // Load persisted assessments and IDPs from server API on mount
  useEffect(() => {
    fetch('/api/assessments')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.assessments && data.assessments.length > 0) {
          setAssessments(data.assessments);
        }
      })
      .catch((err) => console.log('Using initial assessment records', err));

    fetch('/api/idps')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.idps && data.idps.length > 0) {
          setIdps(data.idps);
        }
      })
      .catch((err) => console.log('Using initial IDPs', err));
  }, []);

  const saveAssessment = async (record: AssessmentRecord): Promise<AssessmentRecord> => {
    const updatedRecord = {
      ...record,
      id: record.id || `asmt_${Date.now()}`,
      date: record.date || new Date().toISOString().split('T')[0],
    };

    // Optimistic local state update
    setAssessments((prev) => {
      const idx = prev.findIndex((a) => a.id === updatedRecord.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = updatedRecord;
        return updated;
      }
      return [updatedRecord, ...prev];
    });

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record) return data.record;
      }
    } catch (e) {
      console.warn('Persisted locally:', e);
    }

    return updatedRecord;
  };

  const saveIDPPlan = async (plan: IndividualDevelopmentPlan): Promise<void> => {
    setIdps((prev) => {
      const idx = prev.findIndex((i) => i.learnerId === plan.learnerId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = plan;
        return updated;
      }
      return [plan, ...prev];
    });

    try {
      await fetch('/api/idps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
    } catch (e) {
      console.warn('IDP saved in local state', e);
    }
  };

  const generateIDPFromGap = async (
    learnerId: string,
    targetPosition?: string,
    approvedBy?: string
  ): Promise<IndividualDevelopmentPlan | void> => {
    try {
      const res = await fetch('/api/idps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId,
          targetPosition: targetPosition || 'Assistant Financial Controller (AFC)',
          approvedBy: approvedBy || currentUser.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.idp) {
          setIdps((prev) => [data.idp, ...prev.filter((i) => i.learnerId !== learnerId)]);
          return data.idp;
        }
      }
    } catch (e) {
      console.warn('Generating IDP locally due to network fallback', e);
    }

    // Local fallback generator
    const record = assessments.find((a) => a.learnerId === learnerId);
    if (!record) return;

    const items = Object.entries(record.scores)
      .filter(([_, s]) => s.gap > 0)
      .map(([code, s], idx) => {
        const comp = competencies.find((c) => c.code === code);
        return {
          id: `idp_gen_${idx}_${Date.now()}`,
          competencyId: code,
          priority: (s.gap >= 2 ? 'High' : 'Medium') as 'High' | 'Medium' | 'Low',
          targetDate: new Date(Date.now() + (idx + 1) * 30 * 86400000).toISOString().split('T')[0],
          recommendedCourseIds: comp?.associatedCourseIds || ['course_01'],
          practicalActivity: `Hoàn thành bài tập OJT và tham gia 1 buổi coaching chuyên sâu về ${comp?.nameVi || code}.`,
          status: 'Not Started' as const,
          mentorNotes: `Tự động tạo từ khoảng trống năng lực (Gap = ${s.gap}).`,
        };
      });

    const newIDP: IndividualDevelopmentPlan = {
      id: `idp_${Date.now()}`,
      learnerId,
      createdDate: new Date().toISOString().split('T')[0],
      targetPosition: targetPosition || 'Assistant Financial Controller (AFC)',
      targetCompletionDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      status: 'Active',
      items,
      approvedBy: approvedBy || currentUser.name,
      approvedDate: new Date().toISOString().split('T')[0],
      overallGoal: `Kế hoạch hành động thu hẹp ${items.length} khoảng trống năng lực để bổ nhiệm ${targetPosition || 'AFC'}.`,
    };

    saveIDPPlan(newIDP);
    return newIDP;
  };

  const updateIDPItem = async (
    learnerId: string,
    itemId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    evidenceNotes?: string,
    mentorNotes?: string
  ): Promise<void> => {
    const existing = idps.find((i) => i.learnerId === learnerId);
    if (!existing) return;

    const updatedItems = existing.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          status,
          evidenceNotes: evidenceNotes !== undefined ? evidenceNotes : item.evidenceNotes,
          mentorNotes: mentorNotes !== undefined ? mentorNotes : item.mentorNotes,
          completedDate: status === 'Completed' ? new Date().toISOString().split('T')[0] : item.completedDate,
        };
      }
      return item;
    });

    const allCompleted = updatedItems.length > 0 && updatedItems.every((i) => i.status === 'Completed');

    const updatedPlan: IndividualDevelopmentPlan = {
      ...existing,
      items: updatedItems,
      status: allCompleted ? 'Completed' : 'Active',
    };

    await saveIDPPlan(updatedPlan);
  };

  const createAssessmentCycle = (learnerId: string, cycleName: string): AssessmentRecord => {
    const learner = users.find((u) => u.id === learnerId) || currentUser;
    const initialScores: Record<string, any> = {};

    competencies.slice(0, 12).forEach((comp) => {
      const targetLvl = learner.targetLevel || 4;
      initialScores[comp.code] = {
        selfLevel: 2,
        supervisorLevel: 2,
        gap: Math.max(0, targetLvl - 2),
        selfNotes: '',
        supervisorNotes: '',
      };
    });

    const newRecord: AssessmentRecord = {
      id: `asmt_${Date.now()}`,
      learnerId,
      supervisorId: currentUser.id,
      cycle: cycleName,
      status: 'pending_self',
      date: new Date().toISOString().split('T')[0],
      scores: initialScores,
      overallGapAverage: 1.5,
      learnerReflection: '',
      supervisorComments: '',
    };

    saveAssessment(newRecord);
    return newRecord;
  };

  const issueCertificate = (userId: string, level: 1 | 2 | 3 | 4 | 5) => {
    const titles = {
      1: { vi: 'Chứng Chỉ Cấp Độ 1: Nền Tảng Kế Toán Khách Sạn (Hospitality Finance Foundation)', en: 'Level 1: Hospitality Finance Foundation' },
      2: { vi: 'Chứng Chỉ Cấp Độ 2: Chuyên Viên Kế Toán Khách Sạn Chuyên Nghiệp', en: 'Level 2: Hospitality Finance Professional' },
      3: { vi: 'Chứng Chỉ Cấp Độ 3: Sẵn Sàng Trợ Lý Giám Đốc Tài Chính (AFC Ready)', en: 'Level 3: Assistant Financial Controller Ready' },
      4: { vi: 'Chứng Chỉ Cấp Độ 4: Sẵn Sàng Giám Đốc Tài Chính Độc Lập (FC Ready)', en: 'Level 4: Independent Financial Controller Ready' },
      5: { vi: 'Chứng Chỉ Cấp Độ 5: Đối Tác Kinh Doanh Tài Chính Chiến Lược (Strategic Finance Partner)', en: 'Level 5: Strategic Finance Business Partner' },
    };

    const newCert: Certificate = {
      id: `cert_${Date.now()}`,
      certificateNumber: `FCA-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId,
      level,
      titleVi: titles[level].vi,
      titleEn: titles[level].en,
      issueDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      verificationCode: `VERIFY-FCA-${level}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      authorizedSigner: 'David Tran & Richard Vance',
      authorizedSignerTitle: 'Cluster Director of Finance & General Manager',
    };

    setCertificates((prev) => [newCert, ...prev]);
    setSelectedCertificateForView(newCert);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const t = translations[language];

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        language,
        setLanguage,
        t,
        activeTab,
        setActiveTab,
        users,
        domains: COMPETENCY_DOMAINS,
        competencies,
        courses: COURSES,
        enrollments,
        quizAttempts,
        ojtAssignments: OJT_ASSIGNMENTS,
        submissions,
        learningPaths: LEARNING_PATHS,
        assessments,
        idps,
        certificates,
        successionCandidates: SUCCESSION_CANDIDATES,
        enrollCourse,
        updateCourseProgress,
        submitQuizAttempt,
        submitAssignment,
        gradeAssignment,
        saveCompetency,
        deleteCompetency,
        saveAssessment,
        generateIDPFromGap,
        updateIDPItem,
        saveIDPPlan,
        createAssessmentCycle,
        issueCertificate,
        selectedCourseForPlayer,
        setSelectedCourseForPlayer,
        selectedCertificateForView,
        setSelectedCertificateForView,
        activeQuizTopic,
        setActiveQuizTopic,
        notifications,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
