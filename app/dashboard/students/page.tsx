"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, GraduationCap } from "lucide-react";
import api from "@/lib/api";

type Student = {
  id: string;
  name: string;
  username: string;
  lesson1: number;
  lesson2: number;
  lesson3: number;
  lesson4: number;
  lesson5: number;
};

const fallbackStudents: Student[] = [
  { id: "stu-1", name: "Mina El-Sayed", username: "mina01", lesson1: 84, lesson2: 91, lesson3: 87, lesson4: 90, lesson5: 88 },
  { id: "stu-2", name: "Sara Hamdy", username: "sara22", lesson1: 76, lesson2: 80, lesson3: 78, lesson4: 85, lesson5: 82 },
  { id: "stu-3", name: "Omar Nabil", username: "omar77", lesson1: 92, lesson2: 94, lesson3: 90, lesson4: 95, lesson5: 93 },
  { id: "stu-4", name: "Laila Farid", username: "laila10", lesson1: 71, lesson2: 74, lesson3: 79, lesson4: 77, lesson5: 80 },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(fallbackStudents);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await api.get("/students");
        const payload = Array.isArray(response.data)
          ? response.data
          : response.data?.students ?? response.data?.data ?? fallbackStudents;
        if (Array.isArray(payload)) {
          setStudents(payload);
        }
      } catch {
        setFeedback("Using the local student view because the backend endpoint is not available yet.");
      } finally {
        setLoading(false);
      }
    };

    void loadStudents();
  }, []);

  const rows = useMemo(() => students.map((student) => ({ ...student, total: student.lesson1 + student.lesson2 + student.lesson3 + student.lesson4 + student.lesson5 })), [students]);

  const handleForceLogout = async (student: Student) => {
    try {
      await api.post(`/auth/force-logout/${student.id}`);
      setFeedback(`${student.name} was signed out from the active desktop session.`);
    } catch {
      setFeedback(`The logout request for ${student.name} could not be completed.`);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-400">Student oversight</p>
            <h2 className="text-2xl font-semibold text-white">Student grades and access control</h2>
          </div>
          <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-300">
            {rows.length} students tracked
          </div>
        </div>
        {feedback ? <p className="mt-4 text-sm text-slate-300">{feedback}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-slate-950/30">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <GraduationCap size={18} className="text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">School roster</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.24em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Student Name</th>
                <th className="px-5 py-3">Username/ID</th>
                <th className="px-5 py-3">Lesson 1</th>
                <th className="px-5 py-3">Lesson 2</th>
                <th className="px-5 py-3">Lesson 3</th>
                <th className="px-5 py-3">Lesson 4</th>
                <th className="px-5 py-3">Lesson 5</th>
                <th className="px-5 py-3">Final Score</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-6 text-center text-slate-400">
                    Loading student data...
                  </td>
                </tr>
              ) : (
                rows.map((student) => (
                  <tr key={student.id} className="border-t border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/70">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{student.name}</div>
                    </td>
                    <td className="px-5 py-4">{student.username}</td>
                    <td className="px-5 py-4">{student.lesson1}</td>
                    <td className="px-5 py-4">{student.lesson2}</td>
                    <td className="px-5 py-4">{student.lesson3}</td>
                    <td className="px-5 py-4">{student.lesson4}</td>
                    <td className="px-5 py-4">{student.lesson5}</td>
                    <td className="px-5 py-4 font-semibold text-emerald-300">{student.total}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => void handleForceLogout(student)}
                        className="flex items-center gap-2 rounded-xl border border-rose-600/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
                      >
                        <AlertTriangle size={16} />
                        Force Logout (Kick Device)
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
