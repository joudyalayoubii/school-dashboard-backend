"use client";

import { useEffect, useMemo, useState } from "react";
import { RadioTower, Sparkles, Zap, Lock, BookOpen, PlusCircle, ListChecks, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { connectSocket, emitJoinSchoolRoom, onLessonStatusChanged } from "@/lib/socket";
import { useEffectiveSchoolId } from "@/lib/school-context";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export type LessonStatus = "LOCKED" | "LESSON_OPEN" | "QUIZ_OPEN";

type LessonItem = {
  id: string;
  title: string;
  description: string;
  status: LessonStatus;
};

type LessonControl = {
  lessonName: string;
  status: LessonStatus;
  schoolId: string;
};

type LessonControlStatusResponse = {
  lessonControls: LessonControl[];
};

type QuizOption = {
  id: string;
  lessonName: string;
  questionCount: number;
};

type QuizzesResponse = {
  quizzes: QuizOption[];
};

type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";

type QuestionDraft = {
  questionText: string;
  questionType: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
};

type SavedQuestion = {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: Record<string, string> | null;
  correctAnswer: string;
};

const questionTypeLabel: Record<QuestionType, string> = {
  MCQ: "Multiple choice",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

const draftFromQuestion = (q: SavedQuestion): QuestionDraft => ({
  questionText: q.questionText,
  questionType: q.questionType,
  optionA: q.options?.A ?? "",
  optionB: q.options?.B ?? "",
  optionC: q.options?.C ?? "",
  optionD: q.options?.D ?? "",
  correctAnswer: q.correctAnswer,
});

const emptyDraft: QuestionDraft = {
  questionText: "",
  questionType: "MCQ",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
};

const lessonNumber = (lessonName: string) => lessonName.split("_").pop();

const toLessonItem = (lc: LessonControl): LessonItem => ({
  id: lc.lessonName,
  title: `Lesson ${lessonNumber(lc.lessonName)}`,
  description: `Classroom access and quiz control for lesson ${lessonNumber(lc.lessonName)}`,
  status: lc.status,
});

const initialLessons: LessonItem[] = [];

const statusOptions: { value: LessonStatus; label: string; icon: any; tone: "neutral" | "success" | "info" }[] = [
  { value: "LOCKED", label: "Locked", icon: Lock, tone: "neutral" },
  { value: "LESSON_OPEN", label: "Lesson Open", icon: BookOpen, tone: "success" },
  { value: "QUIZ_OPEN", label: "Quiz Open", icon: Zap, tone: "info" },
];

export default function LessonsPage() {
  const impersonatedSchoolId = useEffectiveSchoolId();
  const toast = useToast();
  const [lessons, setLessons] = useState(initialLessons);
  const [pendingStatusByLesson, setPendingStatusByLesson] = useState<Record<string, LessonStatus>>({});
  const [quizByLesson, setQuizByLesson] = useState<Record<string, QuizOption>>({});
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [syncingLessonId, setSyncingLessonId] = useState<string | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [creatingQuizFor, setCreatingQuizFor] = useState<string | null>(null);
  const [draftsByLesson, setDraftsByLesson] = useState<Record<string, QuestionDraft[]>>({});
  const [formByLesson, setFormByLesson] = useState<Record<string, QuestionDraft>>({});
  const [savingQuestionsFor, setSavingQuestionsFor] = useState<string | null>(null);
  const [savedQuestionsByLesson, setSavedQuestionsByLesson] = useState<Record<string, SavedQuestion[]>>({});
  const [loadingQuestionsFor, setLoadingQuestionsFor] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ lessonId: string; question: SavedQuestion } | null>(null);
  const [editQuestionForm, setEditQuestionForm] = useState<QuestionDraft>(emptyDraft);
  const [savingEditQuestion, setSavingEditQuestion] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<{ lessonId: string; question: SavedQuestion } | null>(null);
  const [deletingQuizLesson, setDeletingQuizLesson] = useState<LessonItem | null>(null);
  const [deletingQuiz, setDeletingQuiz] = useState(false);

  const refreshQuizzes = async () => {
    const quizzesResponse = await api.get<QuizzesResponse>("/quizzes", {
      params: impersonatedSchoolId ? { schoolId: impersonatedSchoolId } : undefined,
    });
    const quizzes = quizzesResponse.data?.quizzes ?? [];
    setQuizByLesson(Object.fromEntries(quizzes.map((q) => [q.lessonName, q])));
    return quizzes;
  };

  useEffect(() => {
    // Page-lifetime singleton socket (see lib/socket.ts) — not disconnected on unmount so
    // remounts (e.g. React dev-mode's double effect invocation) don't race a fresh connect().
    connectSocket();

    const loadLessonStatus = async () => {
      try {
        const [statusResponse] = await Promise.all([
          api.get<LessonControlStatusResponse>("/lesson-control/status", {
            params: impersonatedSchoolId ? { schoolId: impersonatedSchoolId } : undefined,
          }),
          refreshQuizzes(),
        ]);

        const lessonControls = statusResponse.data?.lessonControls ?? [];
        if (lessonControls.length > 0) {
          setLessons(lessonControls.map(toLessonItem));
          setSchoolId(lessonControls[0].schoolId);
        }
      } catch (error) {
        console.error("Failed to load lesson status:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadLessonStatus();

    const off = onLessonStatusChanged((data) => {
      setLessons((current) =>
        current.map((item) => (item.id === data.lessonName ? { ...item, status: data.status } : item)),
      );
    });

    return () => {
      off();
    };
  }, [impersonatedSchoolId]);

  useEffect(() => {
    if (schoolId) {
      emitJoinSchoolRoom(schoolId);
    }
  }, [schoolId]);

  const totalOpen = useMemo(() => lessons.filter((item) => item.status !== "LOCKED").length, [lessons]);

  const getPendingStatus = (lesson: LessonItem) => pendingStatusByLesson[lesson.id] ?? lesson.status;

  const handleSave = async (lessonId: string) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    const nextStatus = getPendingStatus(lesson);
    const quiz = quizByLesson[lessonId];

    if (nextStatus === "QUIZ_OPEN" && !quiz) {
      toast.error("This lesson has no quiz created yet, so it can't be opened for a quiz. Use \"Manage Quiz\" to create one first.");
      return;
    }

    setSavingLessonId(lessonId);

    try {
      await api.patch("/lesson-control/update", {
        lessonName: lesson.id,
        status: nextStatus,
        activeQuizId: nextStatus === "QUIZ_OPEN" ? quiz!.id : undefined,
        schoolId: impersonatedSchoolId || undefined,
      });

      setSyncingLessonId(lessonId);
      toast.success(`${lesson.title} updated and broadcasted to all clients.`);

      setTimeout(() => setSyncingLessonId(null), 3000);
    } catch (error) {
      toast.error("The lesson update could not be sent right now. Please try again.");
    } finally {
      setSavingLessonId(null);
    }
  };

  const handleCreateQuiz = async (lessonId: string) => {
    setCreatingQuizFor(lessonId);
    try {
      await api.post("/quizzes", { lessonName: lessonId, schoolId: impersonatedSchoolId || undefined });
      await refreshQuizzes();
      setExpandedLessonId(lessonId);
      toast.success(`Quiz created for ${lessonId.replace("_", " ")}. Now add questions below.`);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to create quiz.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setCreatingQuizFor(null);
    }
  };

  const loadSavedQuestions = async (lessonId: string, quizId: string) => {
    setLoadingQuestionsFor(lessonId);
    try {
      const response = await api.get<{ questions: SavedQuestion[] }>(`/quizzes/${quizId}`);
      setSavedQuestionsByLesson((current) => ({ ...current, [lessonId]: response.data?.questions ?? [] }));
    } catch (error) {
      console.error("Failed to load saved questions:", error);
      toast.error("Could not load this quiz's questions.");
    } finally {
      setLoadingQuestionsFor(null);
    }
  };

  const toggleManageQuiz = (lesson: LessonItem) => {
    const nextExpanded = expandedLessonId === lesson.id ? null : lesson.id;
    setExpandedLessonId(nextExpanded);

    const quiz = quizByLesson[lesson.id];
    if (nextExpanded && quiz) {
      void loadSavedQuestions(lesson.id, quiz.id);
    }
  };

  const getDraftForm = (lessonId: string) => formByLesson[lessonId] ?? emptyDraft;

  const updateDraftForm = (lessonId: string, updates: Partial<QuestionDraft>) => {
    setFormByLesson((current) => ({ ...current, [lessonId]: { ...getDraftForm(lessonId), ...updates } }));
  };

  const handleAddDraftQuestion = (lessonId: string) => {
    const draft = getDraftForm(lessonId);
    if (!draft.questionText.trim() || !draft.correctAnswer.trim()) return;
    if (draft.questionType === "MCQ" && (!draft.optionA.trim() || !draft.optionB.trim())) return;

    setDraftsByLesson((current) => ({
      ...current,
      [lessonId]: [...(current[lessonId] ?? []), draft],
    }));
    setFormByLesson((current) => ({ ...current, [lessonId]: emptyDraft }));
  };

  const handleRemoveDraftQuestion = (lessonId: string, index: number) => {
    setDraftsByLesson((current) => ({
      ...current,
      [lessonId]: (current[lessonId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const buildOptionsPayload = (d: QuestionDraft) =>
    d.questionType === "MCQ"
      ? { A: d.optionA, B: d.optionB, ...(d.optionC ? { C: d.optionC } : {}), ...(d.optionD ? { D: d.optionD } : {}) }
      : d.questionType === "TRUE_FALSE"
        ? { A: "True", B: "False" }
        : undefined;

  const handleSaveQuestions = async (lessonId: string) => {
    const quiz = quizByLesson[lessonId];
    const drafts = draftsByLesson[lessonId] ?? [];
    if (!quiz || drafts.length === 0) return;

    setSavingQuestionsFor(lessonId);

    try {
      await api.post(`/quizzes/${quiz.id}/questions`, {
        questions: drafts.map((d) => ({
          questionText: d.questionText,
          questionType: d.questionType,
          options: buildOptionsPayload(d),
          correctAnswer: d.correctAnswer,
        })),
      });

      setDraftsByLesson((current) => ({ ...current, [lessonId]: [] }));
      await refreshQuizzes();
      await loadSavedQuestions(lessonId, quiz.id);
      toast.success(`${drafts.length} question${drafts.length === 1 ? "" : "s"} added.`);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to save questions.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSavingQuestionsFor(null);
    }
  };

  const openEditQuestion = (lessonId: string, question: SavedQuestion) => {
    setEditingQuestion({ lessonId, question });
    setEditQuestionForm(draftFromQuestion(question));
  };

  const handleSaveEditQuestion = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!editingQuestion) return;
    const { lessonId, question } = editingQuestion;
    const quiz = quizByLesson[lessonId];
    if (!quiz) return;

    setSavingEditQuestion(true);
    try {
      await api.patch(`/quizzes/${quiz.id}/questions/${question.id}`, {
        questionText: editQuestionForm.questionText,
        questionType: editQuestionForm.questionType,
        options: buildOptionsPayload(editQuestionForm),
        correctAnswer: editQuestionForm.correctAnswer,
      });
      toast.success("Question updated successfully.");
      setEditingQuestion(null);
      await loadSavedQuestions(lessonId, quiz.id);
      await refreshQuizzes();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to update question.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSavingEditQuestion(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    const { lessonId, question } = deletingQuestion;
    const quiz = quizByLesson[lessonId];
    if (!quiz) return;

    try {
      await api.delete(`/quizzes/${quiz.id}/questions/${question.id}`);
      toast.success("Question deleted.");
      setDeletingQuestion(null);
      await loadSavedQuestions(lessonId, quiz.id);
      await refreshQuizzes();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to delete question.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!deletingQuizLesson) return;
    const quiz = quizByLesson[deletingQuizLesson.id];
    if (!quiz) return;

    setDeletingQuiz(true);
    try {
      await api.delete(`/quizzes/${quiz.id}`);
      toast.success(`Quiz for ${deletingQuizLesson.title} was deleted.`);
      setDeletingQuizLesson(null);
      setExpandedLessonId(null);
      await refreshQuizzes();
      setLessons((current) =>
        current.map((item) => (item.id === deletingQuizLesson.id ? { ...item, status: "LOCKED" } : item)),
      );
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to delete quiz.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setDeletingQuiz(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Live Classroom Control"
        title="Lesson and Quiz Access"
        actions={<Badge tone="success" pulse>{totalOpen} lessons active</Badge>}
      />

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-800/50" />
          ))}
        </div>
      ) : (
        <section className="space-y-6">
          {lessons.map((lesson) => {
            const pendingStatus = getPendingStatus(lesson);
            const statusMeta = statusOptions.find((option) => option.value === lesson.status)!;
            const StatusIcon = statusMeta.icon;
            const isSyncing = syncingLessonId === lesson.id;
            const availableQuiz = quizByLesson[lesson.id];
            const hasUnsavedChange = pendingStatus !== lesson.status;

            return (
              <div
                key={lesson.id}
                className={`group relative rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-5 sm:p-6 shadow-2xl shadow-zinc-950/50 transition-all duration-300 hover:border-zinc-700 hover:shadow-zinc-950/70 ${isSyncing ? "border-emerald-500/50 shadow-emerald-500/10" : ""
                  }`}
              >
                {isSyncing && (
                  <div className="absolute top-4 right-4">
                    <Badge tone="success" pulse>Live Syncing</Badge>
                  </div>
                )}

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl border p-3 ${statusMeta.tone === "neutral" ? "border-zinc-700 bg-zinc-800/50 text-zinc-400" : statusMeta.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-violet-500/30 bg-violet-500/10 text-violet-400"}`}>
                        <StatusIcon size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-white">{lesson.title}</h3>
                      <Sparkles size={18} className="hidden sm:block text-emerald-400" />
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{lesson.description}</p>
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    {availableQuiz ? (
                      <Badge tone="success" icon={<CheckCircle2 size={12} />}>
                        Quiz ready · {availableQuiz.questionCount} question{availableQuiz.questionCount === 1 ? "" : "s"}
                      </Badge>
                    ) : (
                      <Badge tone="warning">No quiz created yet</Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 block">Status</label>
                      <select
                        value={pendingStatus}
                        onChange={(event) => {
                          const nextStatus = event.target.value as LessonStatus;
                          setPendingStatusByLesson((current) => ({ ...current, [lesson.id]: nextStatus }));
                        }}
                        className="w-full sm:w-44 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      variant="primary"
                      disabled={savingLessonId === lesson.id || !hasUnsavedChange}
                      loading={savingLessonId === lesson.id}
                      loadingText="Saving..."
                      icon={<RadioTower size={16} />}
                      onClick={() => void handleSave(lesson.id)}
                      className="sm:mt-auto"
                    >
                      Save & Activate
                    </Button>

                    <Button
                      variant="secondary"
                      icon={<ListChecks size={16} />}
                      onClick={() => toggleManageQuiz(lesson)}
                      className="sm:mt-auto"
                    >
                      Manage Quiz
                    </Button>
                  </div>
                </div>

                {expandedLessonId === lesson.id && (
                  <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 sm:p-6 space-y-5">
                    {!availableQuiz ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <p className="text-sm text-zinc-400">No quiz exists for this lesson yet.</p>
                        <Button
                          variant="secondary"
                          icon={<PlusCircle size={16} />}
                          loading={creatingQuizFor === lesson.id}
                          loadingText="Creating..."
                          onClick={() => void handleCreateQuiz(lesson.id)}
                        >
                          Create Quiz
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Saved questions</p>
                          <button
                            onClick={() => setDeletingQuizLesson(lesson)}
                            className="flex items-center gap-2 rounded-xl border border-rose-600/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete Quiz
                          </button>
                        </div>

                        {loadingQuestionsFor === lesson.id ? (
                          <div className="space-y-2">
                            <div className="h-16 animate-pulse rounded-lg bg-zinc-800/50" />
                            <div className="h-16 animate-pulse rounded-lg bg-zinc-800/50" />
                          </div>
                        ) : (savedQuestionsByLesson[lesson.id] ?? []).length === 0 ? (
                          <p className="text-sm text-zinc-500 italic">No questions saved yet — add the first one below.</p>
                        ) : (
                          <ul className="space-y-3">
                            {(savedQuestionsByLesson[lesson.id] ?? []).map((question, index) => (
                              <li key={question.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="font-medium text-white break-words">{question.questionText}</p>
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <Badge>{questionTypeLabel[question.questionType]}</Badge>
                                        {question.questionType === "SHORT_ANSWER" ? (
                                          <Badge tone="success">Answer: {question.correctAnswer}</Badge>
                                        ) : (
                                          question.options &&
                                          Object.entries(question.options).map(([key, val]) => (
                                            <span
                                              key={key}
                                              className={`rounded-md border px-2 py-1 text-xs ${key === question.correctAnswer
                                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold"
                                                  : "border-zinc-700 text-zinc-500"
                                                }`}
                                            >
                                              {key}: {val}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-3">
                                    <button
                                      onClick={() => openEditQuestion(lesson.id, question)}
                                      className="text-zinc-400 hover:text-violet-300"
                                      aria-label="Edit question"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      onClick={() => setDeletingQuestion({ lessonId: lesson.id, question })}
                                      className="text-rose-400 hover:text-rose-300"
                                      aria-label="Delete question"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="border-t border-zinc-800 pt-5">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Add a new question</p>

                          {(draftsByLesson[lesson.id] ?? []).length > 0 && (
                            <ul className="mb-4 space-y-2">
                              {(draftsByLesson[lesson.id] ?? []).map((draft, index) => (
                                <li
                                  key={index}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-zinc-300"
                                >
                                  <span className="truncate">
                                    {index + 1}. {draft.questionText}{" "}
                                    <span className="text-zinc-500">({questionTypeLabel[draft.questionType]}, answer: {draft.correctAnswer})</span>
                                  </span>
                                  <button
                                    onClick={() => handleRemoveDraftQuestion(lesson.id, index)}
                                    className="shrink-0 text-rose-400 hover:text-rose-300"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <TextField
                                label="Question text"
                                name="new-question-text"
                                value={getDraftForm(lesson.id).questionText}
                                onChange={(e) => updateDraftForm(lesson.id, { questionText: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Type</label>
                              <select
                                value={getDraftForm(lesson.id).questionType}
                                onChange={(e) =>
                                  updateDraftForm(lesson.id, {
                                    questionType: e.target.value as QuestionType,
                                    correctAnswer: e.target.value === "TRUE_FALSE" ? "A" : "",
                                  })
                                }
                                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                              >
                                <option value="MCQ">Multiple choice</option>
                                <option value="TRUE_FALSE">True / False</option>
                                <option value="SHORT_ANSWER">Short answer</option>
                              </select>
                            </div>

                            {getDraftForm(lesson.id).questionType === "MCQ" && (
                              <>
                                <TextField
                                  label="Option A"
                                  name="new-option-a"
                                  value={getDraftForm(lesson.id).optionA}
                                  onChange={(e) => updateDraftForm(lesson.id, { optionA: e.target.value })}
                                />
                                <TextField
                                  label="Option B"
                                  name="new-option-b"
                                  value={getDraftForm(lesson.id).optionB}
                                  onChange={(e) => updateDraftForm(lesson.id, { optionB: e.target.value })}
                                />
                                <TextField
                                  label="Option C (optional)"
                                  name="new-option-c"
                                  value={getDraftForm(lesson.id).optionC}
                                  onChange={(e) => updateDraftForm(lesson.id, { optionC: e.target.value })}
                                />
                                <TextField
                                  label="Option D (optional)"
                                  name="new-option-d"
                                  value={getDraftForm(lesson.id).optionD}
                                  onChange={(e) => updateDraftForm(lesson.id, { optionD: e.target.value })}
                                />
                              </>
                            )}

                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Correct answer</label>
                              {getDraftForm(lesson.id).questionType === "MCQ" ? (
                                <select
                                  value={getDraftForm(lesson.id).correctAnswer}
                                  onChange={(e) => updateDraftForm(lesson.id, { correctAnswer: e.target.value })}
                                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                                >
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  {getDraftForm(lesson.id).optionC && <option value="C">C</option>}
                                  {getDraftForm(lesson.id).optionD && <option value="D">D</option>}
                                </select>
                              ) : getDraftForm(lesson.id).questionType === "TRUE_FALSE" ? (
                                <select
                                  value={getDraftForm(lesson.id).correctAnswer}
                                  onChange={(e) => updateDraftForm(lesson.id, { correctAnswer: e.target.value })}
                                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                                >
                                  <option value="A">True</option>
                                  <option value="B">False</option>
                                </select>
                              ) : (
                                <TextField
                                  label=""
                                  name="new-correct-answer"
                                  value={getDraftForm(lesson.id).correctAnswer}
                                  onChange={(e) => updateDraftForm(lesson.id, { correctAnswer: e.target.value })}
                                  className="mt-0"
                                />
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap justify-end gap-3">
                            <Button variant="outline" icon={<PlusCircle size={16} />} onClick={() => handleAddDraftQuestion(lesson.id)}>
                              Add to list
                            </Button>
                            <Button
                              variant="primary"
                              disabled={(draftsByLesson[lesson.id] ?? []).length === 0}
                              loading={savingQuestionsFor === lesson.id}
                              loadingText="Saving..."
                              onClick={() => void handleSaveQuestions(lesson.id)}
                            >
                              {`Save ${(draftsByLesson[lesson.id] ?? []).length || ""} Question${(draftsByLesson[lesson.id] ?? []).length === 1 ? "" : "s"}`}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <Modal open={!!editingQuestion} title="Edit Question" onClose={() => setEditingQuestion(null)}>
        <form onSubmit={handleSaveEditQuestion} className="space-y-4">
          <TextField
            label="Question text"
            required
            name="edit-question-text"
            value={editQuestionForm.questionText}
            onChange={(e) => setEditQuestionForm((f) => ({ ...f, questionText: e.target.value }))}
          />

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Type</label>
            <select
              value={editQuestionForm.questionType}
              onChange={(e) =>
                setEditQuestionForm((f) => ({
                  ...f,
                  questionType: e.target.value as QuestionType,
                  correctAnswer: e.target.value === "TRUE_FALSE" ? "A" : f.correctAnswer,
                }))
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="MCQ">Multiple choice</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="SHORT_ANSWER">Short answer</option>
            </select>
          </div>

          {editQuestionForm.questionType === "MCQ" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Option A"
                name="edit-option-a"
                value={editQuestionForm.optionA}
                onChange={(e) => setEditQuestionForm((f) => ({ ...f, optionA: e.target.value }))}
              />
              <TextField
                label="Option B"
                name="edit-option-b"
                value={editQuestionForm.optionB}
                onChange={(e) => setEditQuestionForm((f) => ({ ...f, optionB: e.target.value }))}
              />
              <TextField
                label="Option C (optional)"
                name="edit-option-c"
                value={editQuestionForm.optionC}
                onChange={(e) => setEditQuestionForm((f) => ({ ...f, optionC: e.target.value }))}
              />
              <TextField
                label="Option D (optional)"
                name="edit-option-d"
                value={editQuestionForm.optionD}
                onChange={(e) => setEditQuestionForm((f) => ({ ...f, optionD: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Correct answer</label>
            {editQuestionForm.questionType === "MCQ" ? (
              <select
                value={editQuestionForm.correctAnswer}
                onChange={(e) => setEditQuestionForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                {editQuestionForm.optionC && <option value="C">C</option>}
                {editQuestionForm.optionD && <option value="D">D</option>}
              </select>
            ) : editQuestionForm.questionType === "TRUE_FALSE" ? (
              <select
                value={editQuestionForm.correctAnswer}
                onChange={(e) => setEditQuestionForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="A">True</option>
                <option value="B">False</option>
              </select>
            ) : (
              <TextField
                label=""
                required
                name="edit-correct-answer"
                value={editQuestionForm.correctAnswer}
                onChange={(e) => setEditQuestionForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                className="mt-0"
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditingQuestion(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingEditQuestion} loadingText="Saving...">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingQuestion}
        title="Delete this question?"
        description="This permanently removes the question from the quiz. This cannot be undone."
        confirmLabel="Delete Question"
        onConfirm={() => void handleDeleteQuestion()}
        onCancel={() => setDeletingQuestion(null)}
      />

      <ConfirmDialog
        open={!!deletingQuizLesson}
        title="Delete this quiz?"
        description={`This permanently deletes the quiz for "${deletingQuizLesson?.title}" along with every question and student submission on it. Any lesson currently pointing to it will be locked. This cannot be undone.`}
        confirmLabel="Delete Quiz"
        loading={deletingQuiz}
        onConfirm={() => void handleDeleteQuiz()}
        onCancel={() => setDeletingQuizLesson(null)}
      />
    </div>
  );
}
