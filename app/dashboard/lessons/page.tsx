"use client";

import { useEffect, useMemo, useState } from "react";
import { RadioTower, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

export type LessonStatus = "LOCKED" | "LESSON_OPEN" | "QUIZ_OPEN";

type LessonItem = {
  id: string;
  title: string;
  description: string;
  status: LessonStatus;
  quizId: string;
};

const initialLessons: LessonItem[] = [
  { id: "lesson-1", title: "Lesson 1", description: "Introduction to the platform", status: "LOCKED", quizId: "quiz-1" },
  { id: "lesson-2", title: "Lesson 2", description: "Core workflows", status: "LESSON_OPEN", quizId: "quiz-2" },
  { id: "lesson-3", title: "Lesson 3", description: "Assessment readiness", status: "QUIZ_OPEN", quizId: "quiz-3" },
  { id: "lesson-4", title: "Lesson 4", description: "Student collaboration", status: "LOCKED", quizId: "quiz-1" },
  { id: "lesson-5", title: "Lesson 5", description: "Progress review", status: "LESSON_OPEN", quizId: "quiz-2" },
];

const quizOptions = [
  { id: "quiz-1", label: "Quiz A" },
  { id: "quiz-2", label: "Quiz B" },
  { id: "quiz-3", label: "Quiz C" },
];

const statusOptions: { value: LessonStatus; label: string }[] = [
  { value: "LOCKED", label: "Locked" },
  { value: "LESSON_OPEN", label: "Lesson Open" },
  { value: "QUIZ_OPEN", label: "Quiz Open" },
];

export default function LessonsPage() {
  const [lessons, setLessons] = useState(initialLessons);
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    return () => {
      disconnectSocket(socket);
    };
  }, []);

  const totalOpen = useMemo(() => lessons.filter((item) => item.status !== "LOCKED").length, [lessons]);

  const handleSave = async (lessonId: string) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    setSavingLessonId(lessonId);
    setFeedback(null);

    try {
      await api.patch("/lesson-control/update", {
        lessonId: lesson.id,
        lessonNumber: lesson.id.split("-").pop(),
        status: lesson.status,
        quizId: lesson.quizId,
      });

      const socket = connectSocket();
      socket?.emit("lesson-control-update", {
        lessonId: lesson.id,
        status: lesson.status,
        quizId: lesson.quizId,
      });

      setIsBroadcasting(true);
      setFeedback(`${lesson.title} updated and broadcasted.`);
      window.setTimeout(() => setIsBroadcasting(false), 2500);
    } catch (error) {
      setFeedback("The lesson update could not be sent right now.");
    } finally {
      setSavingLessonId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-400">Live classroom control</p>
            <h2 className="text-2xl font-semibold text-white">Lesson and quiz access</h2>
          </div>
          <div className="rounded-full border border-emerald-600/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            {totalOpen} lessons active
          </div>
        </div>

        {feedback ? <p className="mt-4 text-sm text-slate-300">{feedback}</p> : null}

        {isBroadcasting ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <RadioTower size={16} />
            Live broadcasting...
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">{lesson.title}</h3>
                </div>
                <p className="text-sm text-slate-400">{lesson.description}</p>
                <div className="inline-flex rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-300">
                  {statusOptions.find((option) => option.value === lesson.status)?.label ?? lesson.status}
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="text-sm text-slate-300">
                  <span className="mb-1 block text-xs uppercase tracking-[0.24em] text-slate-500">Status</span>
                  <select
                    value={lesson.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value as LessonStatus;
                      setLessons((current) => current.map((item) => (item.id === lesson.id ? { ...item, status: nextStatus } : item)));
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-300">
                  <span className="mb-1 block text-xs uppercase tracking-[0.24em] text-slate-500">Quiz</span>
                  <select
                    value={lesson.quizId}
                    onChange={(event) => {
                      setLessons((current) => current.map((item) => (item.id === lesson.id ? { ...item, quizId: event.target.value } : item)));
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                  >
                    {quizOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={() => void handleSave(lesson.id)}
                  disabled={savingLessonId === lesson.id}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {savingLessonId === lesson.id ? "Saving..." : "Save & Activate"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
