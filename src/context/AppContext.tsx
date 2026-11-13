import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
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
  AuditLogEntry,
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

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.vi;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

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
  auditLogs: AuditLogEntry[];

  // Actions
  enrollCourse: (courseId: string) => Promise<void>;
  updateCourseProgress: (courseId: string, moduleId: string) => Promise<void>;
  submitQuizAttempt: (
    courseId: string | undefined,
    quizTitle: string,
    score: number,
    total: number,
    passed: boolean,
    answers: Record<string, any>
  ) => Promise<void>;
  submitAssignment: (assignmentId: string, notes: string, fileName?: string, aiResult?: any) => Promise<void>;
  gradeAssignment: (
    submissionId: string,
    score: number,
    feedback: string,
    status: 'approved' | 'revision_requested'
  ) => Promise<void>;
  saveCompetency: (comp: Competency) => Promise<void>;
  deleteCompetency: (id: string) => Promise<void>;
  saveAssessment: (record: AssessmentRecord) => Promise<AssessmentRecord>;
  generateIDPFromGap: (
    learnerId: string,
    targetPosition?: string,
    approvedBy?: string,
    assessmentId?: string
  ) => Promise<IndividualDevelopmentPlan | void>;
  updateIDPItem: (
    learnerId: string,
    itemId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    evidenceNotes?: string,
    mentorNotes?: string
  ) => Promise<void>;
  saveIDPPlan: (plan: IndividualDevelopmentPlan) => Promise<void>;
  createAssessmentCycle: (learnerId: string, cycleName: string) => AssessmentRecord;
  issueCertificate: (userId: string, level: 1 | 2 | 3 | 4 | 5) => Promise<Certificate | null>;
  addUser: (userData: Partial<User>) => Promise<User | null>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User | null>;
  updateUserCareerPath: (pathId: string) => Promise<void>;
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
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  const [currentUser, setCurrentUserState] = useState<User>(() => {
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `toast_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
    localStorage.setItem('fc_active_user_id', user.id);
  }, []);

  // Data collections (bootstrapped from /api/bootstrap on mount)
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>(COMPETENCIES);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(INITIAL_ASSESSMENT_RECORDS);
  const [idps, setIdps] = useState<IndividualDevelopmentPlan[]>(INITIAL_IDPS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

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

  const refreshAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
      }
    } catch {
      // ignore network error
    }
  }, []);

  // Load persisted LMS data on mount
  useEffect(() => {
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          setCurrentUserState((prev) => data.users.find((u: User) => u.id === prev.id) || prev);
        }
        if (Array.isArray(data.competencies) && data.competencies.length > 0) {
          setCompetencies(data.competencies);
        }
        if (Array.isArray(data.enrollments)) setEnrollments(data.enrollments);
        if (Array.isArray(data.quizAttempts)) setQuizAttempts(data.quizAttempts);
        if (Array.isArray(data.submissions)) setSubmissions(data.submissions);
        if (Array.isArray(data.assessments) && data.assessments.length > 0) {
          setAssessments(data.assessments);
        }
        if (Array.isArray(data.idps) && data.idps.length > 0) {
          setIdps(data.idps);
        }
        if (Array.isArray(data.certificates)) setCertificates(data.certificates);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      })
      .catch((err) => console.warn('Bootstrap fallback to local initial data:', err));
  }, []);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-user-id': currentUser.id,
      'x-user-role': currentUser.role,
    }),
    [currentUser.id, currentUser.role]
  );

  const enrollCourse = async (courseId: string) => {
    const existing = enrollments.find((e) => e.userId === currentUser.id && e.courseId === courseId);
    if (existing) return;

    const optimistic: CourseEnrollment = {
      id: `enr_${Date.now()}`,
      userId: currentUser.id,
      courseId,
      progressPercent: 0,
      completedModules: [],
      status: 'in_progress',
      enrolledDate: new Date().toISOString().split('T')[0],
    };
    setEnrollments((prev) => [optimistic, ...prev]);

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId: currentUser.id, courseId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrollment) {
          setEnrollments((prev) => [
            data.enrollment,
            ...prev.filter((e) => !(e.userId === currentUser.id && e.courseId === courseId)),
          ]);
        }
      }
    } catch (e) {
      console.warn('Enrollment persisted locally:', e);
    }
  };

  const updateCourseProgress = async (courseId: string, moduleId: string) => {
    setEnrollments((prev) => {
      const exists = prev.some((e) => e.userId === currentUser.id && e.courseId === courseId);
      const list = exists
        ? prev
        : [
            {
              id: `enr_${Date.now()}`,
              userId: currentUser.id,
              courseId,
              progressPercent: 0,
              completedModules: [],
              status: 'in_progress' as const,
              enrolledDate: new Date().toISOString().split('T')[0],
            },
            ...prev,
          ];
      return list.map((enr) => {
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
      });
    });

    try {
      const res = await fetch('/api/enrollments/progress', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ userId: currentUser.id, courseId, moduleId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrollment) {
          setEnrollments((prev) =>
            prev.map((e) => (e.userId === currentUser.id && e.courseId === courseId ? data.enrollment : e))
          );
        }
      }
    } catch (e) {
      console.warn('Progress saved locally:', e);
    }
  };

  const submitQuizAttempt = async (
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

    try {
      await fetch('/api/quizzes/attempt', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: currentUser.id,
          courseId,
          quizTitle,
          score,
          totalQuestions: total,
          passed,
          answers,
        }),
      });
    } catch (e) {
      console.warn('Quiz attempt saved locally:', e);
    }
  };

  const submitAssignment = async (
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
      reviewedBy: aiResult ? 'AI Preliminary Evaluator (Gemini 4 Hydrogen)' : undefined,
      reviewedDate: aiResult ? new Date().toISOString().split('T')[0] : undefined,
      aiGraded: !!aiResult,
    };
    setSubmissions((prev) => [newSub, ...prev]);

    try {
      const res = await fetch('/api/ojt/submit', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          assignmentId,
          userId: currentUser.id,
          notes,
          fileName,
          aiResult,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.submission) {
          setSubmissions((prev) => [data.submission, ...prev.filter((s) => s.id !== newSub.id)]);
        }
        refreshAuditLogs();
      }
    } catch (e) {
      console.warn('OJT submission persisted locally:', e);
    }
  };

  const gradeAssignment = async (
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

    try {
      const res = await fetch('/api/ojt/grade', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          submissionId,
          score,
          feedback,
          status,
          reviewedBy: currentUser.name,
        }),
      });
      if (res.ok) {
        refreshAuditLogs();
      }
    } catch (e) {
      console.warn('OJT grade persisted locally:', e);
    }
  };

  const saveCompetency = async (comp: Competency) => {
    setCompetencies((prev) => {
      const idx = prev.findIndex((c) => c.id === comp.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = comp;
        return updated;
      }
      return [...prev, comp];
    });

    try {
      await fetch('/api/competencies', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(comp),
      });
      refreshAuditLogs();
    } catch (e) {
      console.warn('Competency saved locally:', e);
    }
  };

  const deleteCompetency = async (id: string) => {
    setCompetencies((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/competencies/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      refreshAuditLogs();
    } catch (e) {
      console.warn('Competency deleted locally:', e);
    }
  };

  const saveAssessment = async (record: AssessmentRecord): Promise<AssessmentRecord> => {
    const updatedRecord = {
      ...record,
      id: record.id || `asmt_${Date.now()}`,
      date: record.date || new Date().toISOString().split('T')[0],
    };

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
        headers: authHeaders(),
        body: JSON.stringify(updatedRecord),
      });
      if (res.ok) {
        const data = await res.json();
        refreshAuditLogs();
        if (data.record) {
          setAssessments((prev) => prev.map((a) => (a.id === data.record.id ? data.record : a)));
          return data.record;
        }
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
        headers: authHeaders(),
        body: JSON.stringify(plan),
      });
    } catch (e) {
      console.warn('IDP saved in local state', e);
    }
  };

  const generateIDPFromGap = async (
    learnerId: string,
    targetPosition?: string,
    approvedBy?: string,
    assessmentId?: string
  ): Promise<IndividualDevelopmentPlan | void> => {
    try {
      const res = await fetch('/api/idps/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          learnerId,
          assessmentId,
          targetPosition: targetPosition || 'Assistant Financial Controller (AFC)',
          approvedBy: approvedBy || currentUser.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.idp) {
          setIdps((prev) => [data.idp, ...prev.filter((i) => i.learnerId !== learnerId)]);
          refreshAuditLogs();
          return data.idp;
        }
      }
    } catch (e) {
      console.warn('Generating IDP locally due to network fallback', e);
    }

    const record = assessmentId
      ? assessments.find((a) => a.id === assessmentId)
      : assessments.find((a) => a.learnerId === learnerId);
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

    await saveIDPPlan(newIDP);
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

    competencies.forEach((comp) => {
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
      supervisorId: currentUser.role === 'learner' ? learner.supervisorId || 'user_fc1' : currentUser.id,
      cycle: cycleName,
      status: 'pending_self',
      date: new Date().toISOString().split('T')[0],
      scores: initialScores,
      overallGapAverage: Math.max(0, (learner.targetLevel || 4) - 2),
      learnerReflection: '',
      supervisorComments: '',
    };

    saveAssessment(newRecord);
    return newRecord;
  };

  const issueCertificate = async (userId: string, level: 1 | 2 | 3 | 4 | 5): Promise<Certificate | null> => {
    try {
      const res = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Cannot issue certificate', 'error');
        return null;
      }
      if (data.certificate) {
        setCertificates((prev) => [
          data.certificate,
          ...prev.filter((c) => c.id !== data.certificate.id),
        ]);
        setSelectedCertificateForView(data.certificate);
        refreshAuditLogs();
        return data.certificate;
      }
    } catch (e: any) {
      showToast(e.message || 'Certificate issuance failed', 'error');
    }
    return null;
  };

  const addUser = async (userData: Partial<User>): Promise<User | null> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create user', 'error');
        return null;
      }
      if (data.user) {
        setUsers((prev) => [...prev, data.user]);
        refreshAuditLogs();
        return data.user;
      }
    } catch (e: any) {
      showToast(e.message || 'Network error creating user', 'error');
    }
    return null;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update user', 'error');
        return null;
      }
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
        if (currentUser.id === userId) {
          setCurrentUserState(data.user);
        }
        refreshAuditLogs();
        return data.user;
      }
    } catch (e: any) {
      showToast(e.message || 'Network error updating user', 'error');
    }
    return null;
  };

  const updateUserCareerPath = async (pathId: string) => {
    setCurrentUserState((prev) => ({ ...prev, careerPathId: pathId }));
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, careerPathId: pathId } : u)));
    await updateUser(currentUser.id, { careerPathId: pathId });
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
        toasts,
        showToast,
        dismissToast,
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
        auditLogs,
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
        addUser,
        updateUser,
        updateUserCareerPath,
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
