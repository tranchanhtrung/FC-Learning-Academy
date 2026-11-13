import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Course, QuizQuestion } from '../../types';
import { QUIZ_QUESTIONS } from '../../data/initialData';
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizModalProps {
  course?: Course | null;
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ course, onClose }) => {
  const {
    submitQuizAttempt,
    language,
    t,
    showToast,
  } = useApp();

  const initialQuestions: QuizQuestion[] = course
    ? QUIZ_QUESTIONS.filter((q) => q.courseId === course.id)
    : QUIZ_QUESTIONS;

  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuestions.length > 0 ? initialQuestions : QUIZ_QUESTIONS
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scorePercent, setScorePercent] = useState<number>(0);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState<string>('');

  const currentQ = questions[currentQuestionIndex];
  const passingScore = course?.passingScore || 80;
  const answeredCount = questions.filter((q) => {
    const ans = userAnswers[q.id];
    return Array.isArray(ans) ? ans.length > 0 : Boolean(ans);
  }).length;

  // Bilingual-safe answer matching (supports vi/en options & multiple_choice arrays)
  const isQuestionCorrect = (q: QuizQuestion, answer: string | string[] | undefined): boolean => {
    if (!answer) return false;

    if (Array.isArray(q.correctAnswer) || Array.isArray(answer)) {
      const selectedArr = Array.isArray(answer) ? answer : [answer];
      const expectedVi = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      const expectedEn = Array.isArray(q.correctAnswerEn)
        ? q.correctAnswerEn
        : q.correctAnswerEn
        ? [q.correctAnswerEn]
        : expectedVi;
      const expected = language === 'en' ? expectedEn : expectedVi;
      return (
        selectedArr.length === expected.length &&
        expected.every((item) => selectedArr.includes(item))
      );
    }

    if (answer === q.correctAnswer || (q.correctAnswerEn && answer === q.correctAnswerEn)) {
      return true;
    }

    // Match by option index across vi/en arrays
    const activeOptions = language === 'vi' ? q.optionsVi : q.optionsEn;
    const selectedIndex = activeOptions.indexOf(answer);
    if (selectedIndex >= 0) {
      const viCorrectIdx = q.optionsVi.indexOf(String(q.correctAnswer));
      const enCorrectIdx = q.correctAnswerEn ? q.optionsEn.indexOf(String(q.correctAnswerEn)) : -1;
      if (selectedIndex === viCorrectIdx || (enCorrectIdx >= 0 && selectedIndex === enCorrectIdx)) {
        return true;
      }
    }
    return false;
  };

  const getDisplayCorrectAnswer = (q: QuizQuestion): string => {
    if (language === 'en') {
      if (q.correctAnswerEn) {
        return Array.isArray(q.correctAnswerEn) ? q.correctAnswerEn.join(', ') : q.correctAnswerEn;
      }
      if (!Array.isArray(q.correctAnswer)) {
        const idx = q.optionsVi.indexOf(q.correctAnswer);
        if (idx >= 0 && q.optionsEn[idx]) {
          return q.optionsEn[idx];
        }
      }
    }
    return Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer;
  };

  const handleSelectOption = (option: string) => {
    if (isSubmitted) return;
    if (currentQ.type === 'multiple_choice' && Array.isArray(currentQ.correctAnswer)) {
      setUserAnswers((prev) => {
        const currentArr = Array.isArray(prev[currentQ.id]) ? (prev[currentQ.id] as string[]) : [];
        const updated = currentArr.includes(option)
          ? currentArr.filter((o) => o !== option)
          : [...currentArr, option];
        return { ...prev, [currentQ.id]: updated };
      });
    } else {
      setUserAnswers((prev) => ({
        ...prev,
        [currentQ.id]: option,
      }));
    }
  };

  const handleSubmit = () => {
    if (answeredCount < questions.length) {
      showToast(
        language === 'vi'
          ? `Vui lòng trả lời đầy đủ tất cả ${questions.length} câu hỏi trước khi nộp bài (${answeredCount}/${questions.length}).`
          : `Please answer all ${questions.length} questions before submitting (${answeredCount}/${questions.length}).`,
        'error'
      );
      return;
    }

    let correctCount = 0;
    questions.forEach((q) => {
      if (isQuestionCorrect(q, userAnswers[q.id])) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / Math.max(1, questions.length)) * 100);
    setScorePercent(calculatedScore);
    const passed = calculatedScore >= passingScore;
    setIsSubmitted(true);

    submitQuizAttempt(
      course?.id,
      course?.titleEn || 'Hospitality Finance Mastery Exam',
      calculatedScore,
      questions.length,
      passed,
      userAnswers
    );

    if (passed) {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#3B82F6', '#10B981'],
        });
      } catch {
        // ignore
      }
    }
  };

  const handleRetake = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setScorePercent(0);
  };

  const handleGenerateAIQuestions = async () => {
    try {
      setIsGeneratingAI(true);
      setAiError(null);
      const res = await fetch('/api/gemini/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course?.id,
          topic: customTopic || course?.titleEn || 'USALI Hotel Financial Management',
          difficulty: course?.difficulty || 'Advanced',
          count: 3,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI quiz questions.');
      }

      if (data.questions && data.questions.length > 0) {
        const formatted: QuizQuestion[] = data.questions.map((q: any, i: number) => ({
          id: `gen_q_${Date.now()}_${i}`,
          courseId: course?.id,
          domainId: 'dom_1',
          competencyCode: q.competencyCode || 'HFC-GEN',
          questionVi: q.question,
          questionEn: q.question,
          type: q.type || 'single_choice',
          optionsVi: q.options,
          optionsEn: q.options,
          correctAnswer: q.correctAnswer,
          correctAnswerEn: q.correctAnswer,
          explanationVi: q.explanation,
          explanationEn: q.explanation,
        }));

        setQuestions(formatted);
        handleRetake();
        showToast(
          language === 'vi' ? 'Đã tạo bộ đề thi mới từ AI Gemini.' : 'Generated new AI quiz questions.',
          'success'
        );
      }
    } catch (e: any) {
      const msg = e.message || 'Quiz generation failed.';
      setAiError(msg);
      showToast(msg, 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-700/50 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {course ? (language === 'vi' ? course.titleVi : course.titleEn) : t.quiz.title}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {language === 'vi' ? 'Tiêu chuẩn qua bài:' : 'Passing Score:'} {passingScore}% &bull; {questions.length}{' '}
                {language === 'vi' ? 'câu hỏi' : 'questions'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Exam Generator Bar */}
        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold text-amber-900">
              {language === 'vi' ? 'Tạo đề thi mới bằng AI Gemini:' : 'Generate AI Custom Exam with Gemini:'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder={language === 'vi' ? 'Nhập chủ đề (vd: RevPAR, F&B Cost)...' : 'Topic (e.g., RevPAR, Cost control)...'}
              className="px-2.5 py-1 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none w-full sm:w-56"
            />
            <button
              onClick={handleGenerateAIQuestions}
              disabled={isGeneratingAI}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingAI ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') : language === 'vi' ? 'Tạo đề' : 'Generate'}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Exam Body */}
        {!isSubmitted ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>
                {t.quiz.question} {currentQuestionIndex + 1} / {questions.length} &bull;{' '}
                <span className="text-blue-700">
                  {language === 'vi' ? 'Đã trả lời:' : 'Answered:'} {answeredCount}/{questions.length}
                </span>
              </span>
              <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {currentQ.competencyCode}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold text-sm text-slate-900 leading-relaxed">
                {language === 'vi' ? currentQ.questionVi : currentQ.questionEn}
              </p>
            </div>

            <div className="space-y-2.5">
              {(language === 'vi' ? currentQ.optionsVi : currentQ.optionsEn).map((opt, idx) => {
                const selectedVal = userAnswers[currentQ.id];
                const isSelected = Array.isArray(selectedVal) ? selectedVal.includes(opt) : selectedVal === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#0A192F] text-amber-300 border-amber-400 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span>{opt}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                &larr; {language === 'vi' ? 'Câu trước' : 'Previous'}
              </button>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {language === 'vi' ? 'Câu tiếp theo' : 'Next Question'} &rarr;
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {t.quiz.submitAnswers}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                  scorePercent >= passingScore
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {scorePercent >= passingScore ? t.quiz.passed : t.quiz.failed}
              </span>
              <div className="text-4xl font-black text-slate-900 font-mono">{scorePercent}%</div>
              <p className="text-xs text-slate-500">
                {scorePercent >= passingScore
                  ? language === 'vi'
                    ? 'Chúc mừng! Bạn đã hoàn thành chuẩn kiến thức nghiệp vụ USALI.'
                    : 'Congratulations! You met the USALI certification threshold.'
                  : language === 'vi'
                  ? `Bạn chưa đạt điểm chuẩn (${passingScore}%). Vui lòng xem lại giải thích và làm lại bài thi.`
                  : `Did not pass threshold (${passingScore}%). Review rationale and retake.`}
              </p>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCorrect = isQuestionCorrect(q, userAnswers[q.id]);
                const userAnsDisplay = Array.isArray(userAnswers[q.id])
                  ? (userAnswers[q.id] as string[]).join(', ')
                  : userAnswers[q.id];
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-800">
                        {idx + 1}. {language === 'vi' ? q.questionVi : q.questionEn}
                      </span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <p className="text-slate-600">
                        <strong>{language === 'vi' ? 'Câu trả lời của bạn:' : 'Your Answer:'}</strong>{' '}
                        {userAnsDisplay || (language === 'vi' ? '(Chưa chọn)' : '(Not selected)')}
                      </p>
                      <p className="text-emerald-800 font-bold">
                        <strong>{language === 'vi' ? 'Đáp án chính xác:' : 'Correct Answer:'}</strong>{' '}
                        {getDisplayCorrectAnswer(q)}
                      </p>
                      <p className="text-slate-700 italic bg-white/80 p-2 rounded-lg border border-slate-200 mt-1">
                        <strong>{t.quiz.explanation}:</strong>{' '}
                        {language === 'vi' ? q.explanationVi : q.explanationEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{language === 'vi' ? 'Làm lại bài thi' : 'Retake Exam'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
