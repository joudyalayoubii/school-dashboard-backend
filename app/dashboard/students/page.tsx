"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { GraduationCap, LogOut, Pencil, Shield, Trash2, User, UserPlus } from "lucide-react";
import api from "@/lib/api";
import { useEffectiveSchoolId } from "@/lib/school-context";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

// All 15 lessons the backend tracks (see QuizService.getStudentsGrades) - previously
// this page only read LESSON_1..LESSON_5, silently hiding grades for lessons 6-15.
const ALL_LESSONS = Array.from({ length: 15 }, (_, i) => `LESSON_${i + 1}`);

type Student = {
  id: string;
  name: string;
  username: string;
  email: string;
  lessonScores: number[]; // index 0 = LESSON_1 ... index 14 = LESSON_15
};

type StudentWithTotal = Student & { total: number; completed: number };

type LessonScores = Record<string, number | null>;

type StudentGrade = {
  studentId: string;
  username: string;
  name: string;
  email: string;
  lessonScores: LessonScores;
};

type StudentsGradesResponse = {
  studentsGrades: StudentGrade[];
};

const emptyForm = { name: "", username: "", email: "", password: "" };
const emptyEditForm = { name: "", username: "", email: "", password: "" };

const toStudent = (grade: StudentGrade): Student => ({
  id: grade.studentId,
  name: grade.name,
  username: grade.username,
  email: grade.email,
  lessonScores: ALL_LESSONS.map((lessonKey) => grade.lessonScores[lessonKey] ?? 0),
});

export default function StudentsPage() {
  const schoolId = useEffectiveSchoolId();
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [kickingStudentId, setKickingStudentId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [saving, setSaving] = useState(false);

  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = async () => {
    try {
      const response = await api.get<StudentsGradesResponse>("/reports/students-grades", {
        params: schoolId ? { schoolId } : undefined,
      });
      const grades = response.data?.studentsGrades;
      if (Array.isArray(grades)) {
        setStudents(grades.map(toStudent));
      }
    } catch (error) {
      console.error("Failed to load student grades:", error);
      toast.error("Could not load student data from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, [schoolId]);

  const openAdd = () => {
    setForm(emptyForm);
    setShowAddModal(true);
  };

  const handleAddStudent = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);

    try {
      await api.post("/students", schoolId ? { ...form, schoolId } : form);
      toast.success(`${form.name} was added to the school roster.`);
      setForm(emptyForm);
      setShowAddModal(false);
      await loadStudents();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to add student.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setCreating(false);
    }
  };

  const rows = useMemo(() => {
    return students.map((student) => {
      const completedScores = student.lessonScores.filter((score) => score > 0);
      const total =
        completedScores.length > 0
          ? Math.round(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length)
          : 0;
      return { ...student, total, completed: completedScores.length };
    });
  }, [students]);

  const handleForceLogout = async (student: StudentWithTotal) => {
    setKickingStudentId(student.id);

    try {
      await api.post(`/auth/force-logout/${student.id}`);
      toast.success(`${student.name} was successfully ejected from their active session.`);
    } catch (error) {
      toast.error(`Failed to eject ${student.name}. The student may not have an active session.`);
    } finally {
      setKickingStudentId(null);
    }
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setEditForm({ name: student.name, username: student.username, email: student.email, password: "" });
  };

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingStudent) return;
    setSaving(true);

    try {
      const payload: Record<string, string> = { name: editForm.name, username: editForm.username, email: editForm.email };
      if (editForm.password) payload.password = editForm.password;

      await api.patch(`/students/${editingStudent.id}`, payload);
      toast.success(`${editForm.name} was updated successfully.`);
      setEditingStudent(null);
      await loadStudents();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to update student.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setDeleting(true);

    try {
      await api.delete(`/students/${deletingStudent.id}`);
      toast.success(`${deletingStudent.name} was removed from the roster.`);
      setDeletingStudent(null);
      await loadStudents();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to delete student.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setDeleting(false);
    }
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 80) return "text-violet-400 bg-violet-500/10 border-violet-500/20";
    if (score >= 70) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getGradeLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Good";
    if (score >= 70) return "Satisfactory";
    return "Needs Improvement";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student Oversight"
        title="Student Grades and Access Control"
        actions={
          <>
            <Badge>{rows.length} students tracked</Badge>
            <Badge tone="success" pulse>Live Monitoring</Badge>
            <Button variant="secondary" size="sm" icon={<UserPlus size={16} />} onClick={openAdd}>
              Add Student
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur shadow-2xl shadow-zinc-950/50">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 sm:px-8 py-5">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
            <GraduationCap size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">School Roster</h3>
            <p className="text-sm text-zinc-400">Real-time student performance tracking</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-semibold sticky left-0 bg-zinc-950/50">Student</th>
                <th className="px-6 py-4 font-semibold">Username</th>
                {ALL_LESSONS.map((_, i) => (
                  <th key={i} className="px-4 py-4 font-semibold text-center whitespace-nowrap">
                    L{i + 1}
                  </th>
                ))}
                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Completed</th>
                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Average</th>
                <th className="px-6 py-4 font-semibold text-center">Performance</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-zinc-800/50">
                    <td colSpan={ALL_LESSONS.length + 6} className="px-6 py-4">
                      <div className="h-10 animate-pulse rounded-lg bg-zinc-800/50" />
                    </td>
                  </tr>
                ))
              ) : (
                rows.map((student) => {
                  const gradeColor = getGradeColor(student.total);
                  const gradeLabel = getGradeLabel(student.total);
                  const isKicking = kickingStudentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className={`border-t border-zinc-800/50 bg-zinc-900/30 transition-all duration-300 hover:bg-zinc-800/50 ${isKicking ? "bg-rose-500/5" : ""
                        }`}
                    >
                      <td className="px-6 py-5 sticky left-0 bg-zinc-900/95">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{student.name}</div>
                            <div className="text-xs text-zinc-500">ID: {student.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <User size={14} className="text-zinc-500" />
                          {student.username}
                        </div>
                      </td>
                      {student.lessonScores.map((score, i) => (
                        <td key={i} className="px-4 py-5 text-center">
                          <span className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${score > 0 ? getGradeColor(score) : "text-zinc-600 bg-zinc-800/30 border-zinc-700"}`}>
                            {score > 0 ? score : "—"}
                          </span>
                        </td>
                      ))}
                      <td className="px-6 py-5 text-center text-zinc-300 font-semibold whitespace-nowrap">
                        {student.completed} / {ALL_LESSONS.length}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-2xl font-bold ${gradeColor.split(" ")[0]}`}>
                            {student.total}
                          </span>
                          <span className={`text-xs font-semibold uppercase tracking-wider ${gradeColor.split(" ")[0]}`}>
                            {gradeLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${gradeColor}`}>
                          {gradeLabel}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(student)}
                            className="rounded-xl border border-zinc-700 p-2.5 text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                            aria-label="Edit student"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(student)}
                            className="rounded-xl border border-rose-600/30 bg-rose-500/10 p-2.5 text-rose-300 hover:bg-rose-500/20 transition-colors"
                            aria-label="Delete student"
                          >
                            <Trash2 size={16} />
                          </button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isKicking}
                            loading={isKicking}
                            loadingText="Ejecting..."
                            icon={<LogOut size={16} />}
                            onClick={() => void handleForceLogout(student)}
                          >
                            Force Logout
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 && (
          <div className="px-6 py-20 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl bg-zinc-800/50 border border-zinc-700 p-4">
                <Shield size={32} className="text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400">No students found in the system</p>
            </div>
          </div>
        )}
      </section>

      <Modal open={showAddModal} title="Add Student" onClose={() => setShowAddModal(false)}>
        <form onSubmit={handleAddStudent} className="space-y-4">
          <TextField
            label="Full name"
            required
            name="student-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Username"
            required
            name="student-username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
          <TextField
            label="Email"
            type="email"
            required
            name="student-email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Password"
            type="password"
            required
            minLength={6}
            name="student-new-password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" loading={creating} loadingText="Adding...">
              Add Student
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingStudent} title="Edit Student" onClose={() => setEditingStudent(null)}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <TextField
            label="Full name"
            required
            name="edit-student-name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Username"
            required
            name="edit-student-username"
            value={editForm.username}
            onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
          />
          <TextField
            label="Email"
            type="email"
            required
            name="edit-student-email"
            value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="New password (optional)"
            type="password"
            minLength={6}
            name="edit-student-new-password"
            autoComplete="new-password"
            placeholder="Leave blank to keep current password"
            value={editForm.password}
            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Saving...">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingStudent}
        title="Remove this student?"
        description={`This permanently deletes "${deletingStudent?.name}" and all of their quiz submissions. This cannot be undone.`}
        confirmLabel="Delete Student"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingStudent(null)}
      />
    </div>
  );
}
