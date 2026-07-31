"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Lock, Timer, Trophy, Zap } from "lucide-react";
import api from "@/lib/api";
import { onLessonStatusChanged, onQuizTimeExpired } from "@/lib/socket";

type LessonStatus = "LOCKED" | "LESSON_OPEN" | "QUIZ_OPEN";

type LessonControl = {
  lessonName: string;
  status: LessonStatus;
  activeQuizId: string | null;
  secondsRemaining: number | null;
};

type Question = {
  id: string;
  questionText: string;
  questionType: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: Record<string, string> | null;
};

type QuizForStudent = {
  id: string;
  lessonName: string;
  questions: Question[];
};

type SubmitResult = {
  score: number;
  correctCount: number;
  totalQuestions: number;
};

const lessonNumber = (lessonName: string) => lessonName.split("_").pop();

const statusMeta: Record<LessonStatus, { label: string; color: string; icon: any }> = {
  LOCKED: { label: "Locked", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20", icon: Lock },
  LESSON_OPEN: { label: "Lesson Open", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: BookOpen },
  QUIZ_OPEN: { label: "Quiz Open", color: "text-violet-400 bg-violet-500/10 border-violet-500/20", icon: Zap },
};

export default function StudentPage() {
  const [lessons, setLessons] = useState<LessonControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<QuizForStudent | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState<Set<string>>(new Set());

  const loadLessons = async () => {
    try {
      const response = await api.get<{ lessonControls: LessonControl[] }>("/lesson-control/status");
      setLessons(response.data?.lessonControls ?? []);
    } catch (error) {
      console.error("Failed to load lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLessons();

    const offStatus = onLessonStatusChanged((data) => {
      setLessons((current) =>
        current.map((lc) =>
          lc.lessonName === data.lessonName ? { ...lc, status: data.status, activeQuizId: data.activeQuizId ?? null } : lc,
        ),
      );
    });

    const offExpired = onQuizTimeExpired((data) => {
      setActiveQuiz((current) => {
        if (current && current.lessonName === data.lessonName) {
          setQuizError("Time is up! This quiz was automatically closed.");
          return null;
        }
        return current;
      });
    });

    return () => {
      offStatus();
      offExpired();
    };
  }, []);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((current) => (current !== null ? Math.max(0, current - 1) : current));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft !== null]);

  const startQuiz = async (lesson: LessonControl) => {
    setQuizError(null);
    setResult(null);
    try {
      const response = await api.get<QuizForStudent>(`/quizzes/lesson/${lesson.lessonName}`);
      setActiveQuiz(response.data);
      setAnswers({});
      setSecondsLeft(lesson.secondsRemaining ?? null);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Could not load this quiz.";
      setQuizError(Array.isArray(message) ? message.join(", ") : message);
    }
  };

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);
    setQuizError(null);

    try {
      const response = await api.post<SubmitResult>(`/quizzes/${activeQuiz.id}/submit`, {
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      });
      setResult(response.data);
      setAlreadySubmitted((current) => new Set(current).add(activeQuiz.id));
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message ?? "Failed to submit quiz.";
      if (status === 409) {
        setAlreadySubmitted((current) => new Set(current).add(activeQuiz.id));
      }
      setQuizError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setAnswers({});
    setSecondsLeft(null);
    setResult(null);
    setQuizError(null);
  };

  const formattedTime = useMemo(() => {
    if (secondsLeft === null) return null;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  if (activeQuiz) {
    const timeIsUp = secondsLeft === 0;

    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-8 shadow-2xl shadow-zinc-950/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">Lesson {lessonNumber(activeQuiz.lessonName)} Quiz</h2>
            {secondsLeft !== null && (
              <div
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                  timeIsUp ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-violet-500/30 bg-violet-500/10 text-violet-300"
                }`}
              >
                <Timer size={16} />
                {formattedTime} remaining
              </div>
            )}
          </div>

          {quizError && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
              <AlertTriangle size={16} />
              {quizError}
            </div>
          )}

          {result && (
            <div className="mt-6 flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <Trophy size={32} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-lg font-bold text-white">Score: {result.score}%</p>
                <p className="text-sm text-emerald-200">
                  {result.correctCount} of {result.totalQuestions} correct
                </p>
              </div>
            </div>
          )}
        </section>

        {!result && !alreadySubmitted.has(activeQuiz.id) && (
          <section className="space-y-5">
            {activeQuiz.questions.map((question, index) => (
              <div key={question.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-6 shadow-xl shadow-zinc-950/40">
                <p className="mb-4 font-semibold text-white">
                  {index + 1}. {question.questionText}
                </p>

                {question.questionType === "SHORT_ANSWER" ? (
                  <input
                    disabled={timeIsUp}
                    value={answers[question.id] ?? ""}
                    onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                  />
                ) : (
                  <div className="space-y-2">
                    {Object.entries(question.options ?? {}).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${
                          answers[question.id] === key
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                            : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        <input
                          type="radio"
                          disabled={timeIsUp}
                          name={question.id}
                          value={key}
                          checked={answers[question.id] === key}
                          onChange={() => setAnswers((current) => ({ ...current, [question.id]: key }))}
                          className="accent-emerald-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeQuiz}
                className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800/50 transition-colors"
              >
                Back to lessons
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting || timeIsUp || Object.keys(answers).length === 0}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-zinc-950 transition-all hover:from-emerald-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-400"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          </section>
        )}

        {(result || alreadySubmitted.has(activeQuiz.id)) && (
          <div className="flex justify-end">
            <button
              onClick={closeQuiz}
              className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              Back to lessons
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-700 border-t-emerald-500" />
        </div>
      ) : (
        <section className="space-y-4">
          {lessons.map((lesson) => {
            const meta = statusMeta[lesson.status];
            const Icon = meta.icon;

            return (
              <div
                key={lesson.lessonName}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-6 shadow-xl shadow-zinc-950/40"
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl border p-3 ${meta.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Lesson {lessonNumber(lesson.lessonName)}</h3>
                    <div className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${meta.color}`}>{meta.label}</div>
                  </div>
                </div>

                {lesson.status === "QUIZ_OPEN" && (
                  <button
                    onClick={() => void startQuiz(lesson)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-3 text-sm font-bold text-white transition-all hover:from-violet-400 hover:to-violet-500"
                  >
                    <Zap size={16} />
                    Start Quiz
                  </button>
                )}

                {lesson.status === "LESSON_OPEN" && (
                  <div className="flex items-center gap-2 text-sm text-emerald-300">
                    <CheckCircle2 size={16} />
                    Lesson content available
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
