"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Pencil, PlusCircle, Trash2, Users2 } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type School = {
  id: string;
  name: string;
  studentCount: number;
  createdAt: string;
};

const emptyForm = { name: "" };

export default function SuperAdminPage() {
  const toast = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingSchool, setDeletingSchool] = useState<School | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSchools = async () => {
    try {
      const response = await api.get<{ schools: School[] }>("/schools/all");
      setSchools(response.data?.schools ?? []);
    } catch (error) {
      console.error("Failed to load schools:", error);
      toast.error("Could not load schools from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchools();
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setShowAddModal(true);
  };

  const handleCreateSchool = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);

    try {
      await api.post("/schools", { name: form.name });
      toast.success(`${form.name} was created successfully.`);
      setForm(emptyForm);
      setShowAddModal(false);
      await loadSchools();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to create school.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (school: School) => {
    setEditingSchool(school);
    setEditName(school.name);
  };

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingSchool) return;
    setSaving(true);

    try {
      await api.patch(`/schools/${editingSchool.id}`, { name: editName });
      toast.success("School renamed successfully.");
      setEditingSchool(null);
      await loadSchools();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to update school.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSchool) return;
    setDeleting(true);

    try {
      await api.delete(`/schools/${deletingSchool.id}`);
      toast.success(`${deletingSchool.name} was deleted.`);
      setDeletingSchool(null);
      await loadSchools();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Failed to delete school.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Platform Administration"
        title="Schools"
        actions={
          <>
            <Badge>{schools.length} schools</Badge>
            <Button variant="secondary" size="sm" icon={<PlusCircle size={16} />} onClick={openAdd}>
              Add School
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur shadow-2xl shadow-zinc-950/50">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 sm:px-8 py-5">
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3">
            <Building2 size={20} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">All Schools</h3>
            <p className="text-sm text-zinc-400">Click a school to manage it</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800/50" />
            ))}
          </div>
        ) : schools.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-zinc-400">No schools yet. Add one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-950/50 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">School</th>
                  <th className="px-6 py-4 font-semibold text-center">Students</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-5 font-semibold text-white">{school.name}</td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                        <Users2 size={14} />
                        {school.studentCount}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-zinc-400">{new Date(school.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(school)}
                          className="rounded-xl border border-zinc-700 p-2.5 text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                          aria-label="Rename school"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingSchool(school)}
                          className="rounded-xl border border-rose-600/30 bg-rose-500/10 p-2.5 text-rose-300 hover:bg-rose-500/20 transition-colors"
                          aria-label="Delete school"
                        >
                          <Trash2 size={16} />
                        </button>
                        <Link href={`/dashboard?schoolId=${school.id}`}>
                          <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />}>
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={showAddModal} title="Add School" onClose={() => setShowAddModal(false)}>
        <form onSubmit={handleCreateSchool} className="space-y-4">
          <TextField
            label="School name"
            required
            name="new-school-name"
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" loading={creating} loadingText="Creating...">
              Add School
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingSchool} title="Rename School" onClose={() => setEditingSchool(null)}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <TextField
            label="School name"
            required
            name="edit-school-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditingSchool(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" loading={saving} loadingText="Saving...">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingSchool}
        title="Delete this school?"
        description={`This permanently deletes "${deletingSchool?.name}" along with every student, quiz, and submission that belongs to it. This cannot be undone.`}
        confirmLabel="Delete School"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingSchool(null)}
      />
    </div>
  );
}
