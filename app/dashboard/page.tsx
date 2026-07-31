"use client";

import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, Users2 } from "lucide-react";
import api from "@/lib/api";
import { useEffectiveSchoolId } from "@/lib/school-context";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

type SchoolDetails = {
  studentCount: number;
};

type LessonControl = {
  lessonName: string;
  status: "LOCKED" | "LESSON_OPEN" | "QUIZ_OPEN";
};

type StudentGrade = {
  averageScore: number;
  submittedLessons: number;
};

export default function DashboardOverviewPage() {
  const schoolId = useEffectiveSchoolId();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [openLessons, setOpenLessons] = useState<number | null>(null);
  const [averageProgress, setAverageProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = schoolId ? { schoolId } : undefined;

    const load = async () => {
      try {
        const [details, lessonControls, grades] = await Promise.all([
          api.get<{ details: SchoolDetails }>("/schools/details", { params }),
          api.get<{ lessonControls: LessonControl[] }>("/lesson-control/status", { params }),
          api.get<{ studentsGrades: StudentGrade[] }>("/reports/students-grades", { params }),
        ]);

        setStudentCount(details.data.details.studentCount);
        setOpenLessons(lessonControls.data.lessonControls.filter((lc) => lc.status !== "LOCKED").length);

        const withSubmissions = grades.data.studentsGrades.filter((s) => s.submittedLessons > 0);
        const avg =
          withSubmissions.length > 0
            ? Math.round(withSubmissions.reduce((sum, s) => sum + s.averageScore, 0) / withSubmissions.length)
            : 0;
        setAverageProgress(avg);
      } catch (error) {
        console.error("Failed to load overview metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [schoolId]);

  const metrics = [
    { label: "Active students", value: loading ? "…" : String(studentCount ?? 0), icon: Users2 },
    { label: "Open lessons", value: loading ? "…" : String(openLessons ?? 0), icon: BookOpenCheck },
    { label: "Average progress", value: loading ? "…" : `${averageProgress ?? 0}%`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="School Admin Dashboard"
        title="Overview"
        actions={<Badge tone="success" pulse>Live Operations</Badge>}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg shadow-zinc-950/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{item.label}</p>
                <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-zinc-950/30">
        <h2 className="text-xl font-semibold text-white">Admin priorities</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm font-semibold text-white">Lesson access</p>
            <p className="mt-2 text-sm text-zinc-400">Keep the next quiz open and visible to students before the class starts.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm font-semibold text-white">Student engagement</p>
            <p className="mt-2 text-sm text-zinc-400">Watch the grade table for any sudden drop in performance and intervene early.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
