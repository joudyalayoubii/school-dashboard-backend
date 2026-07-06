import { BarChart3, BookOpenCheck, Users2 } from "lucide-react";

const metrics = [
  { label: "Active students", value: "248", icon: Users2 },
  { label: "Open lessons", value: "3", icon: BookOpenCheck },
  { label: "Average progress", value: "82%", icon: BarChart3 },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{item.label}</p>
                <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
        <h2 className="text-xl font-semibold text-white">Admin priorities</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">Lesson access</p>
            <p className="mt-2 text-sm text-slate-400">Keep the next quiz open and visible to students before the class starts.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">Student engagement</p>
            <p className="mt-2 text-sm text-slate-400">Watch the grade table for any sudden drop in performance and intervene early.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
