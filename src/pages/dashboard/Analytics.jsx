import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Brain, Trophy, CheckCircle2, Calendar, FolderOpen, Loader2 } from "lucide-react";

export default function Analytics() {
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState({ totalAttempts: 0, avgScore: 0, bestScore: 0 });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalyticsData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: quizData, error } = await supabase
          .from("quiz_attempts")
          .select("id, score, total_questions, created_at, folders(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const list = quizData || [];
        setAttempts([...list].reverse());

        const total = list.length;
        const avg = total
          ? Math.round(list.reduce((acc, q) => acc + (q.score / (q.total_questions || 1)) * 100, 0) / total)
          : 0;

        const best = list.reduce(
          (max, q) => Math.max(max, Math.round((q.score / (q.total_questions || 1)) * 100)),
          0
        );

        setStats({ totalAttempts: total, avgScore: avg, bestScore: best });

        // Build chronological chart data
        const trend = list.map((item, idx) => ({
          attempt: `#${idx + 1}`,
          score: Math.round((item.score / (item.total_questions || 1)) * 100),
          subject: item.folders?.name || "General",
        }));
        setTrendData(trend);
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalyticsData();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto text-white space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Study & Quiz Analytics</h1>
        <p className="text-sm text-white/50 mt-1">Track your retention score history and subject performance[cite: 3].</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "Total Quizzes Attempted", val: stats.totalAttempts, icon: Brain, color: "from-blue-600 to-indigo-700" },
          { label: "Average Accuracy", val: `${stats.avgScore}%`, icon: CheckCircle2, color: "from-emerald-600 to-teal-700" },
          { label: "Highest Score", val: `${stats.bestScore}%`, icon: Trophy, color: "from-amber-500 to-orange-600" },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className={`p-6 rounded-2xl bg-gradient-to-br ${c.color} shadow-lg border border-white/10`}>
              <div className="flex items-center justify-between opacity-80 mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">{c.label}</span>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-extrabold">{loading ? "..." : c.val}</p>
            </div>
          );
        })}
      </div>

      {/* Progress Chart */}
      <div className="bg-[#0f1e35] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white/90">Score Progression Over Time</h2>
        <div className="h-64">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#efa943" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#efa943" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="attempt" stroke="rgba(255,255,255,0.35)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.35)" fontSize={11} width={28} />
                <Tooltip
                  contentStyle={{ background: "#0f1e35", border: "1px solid rgba(239,169,67,0.3)", borderRadius: 8, fontSize: 12 }}
                  formatter={(val, name, props) => [`${val}% (${props.payload.subject})`, "Score"]}
                />
                <Area type="monotone" dataKey="score" stroke="#efa943" strokeWidth={2.5} fill="url(#analyticsScore)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-white/30 text-xs">
              No quiz attempts logged yet. Complete a quiz to visualize your trend.
            </div>
          )}
        </div>
      </div>

      {/* Attempt History Table */}
      <div className="bg-[#0f1e35] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white/90">Recent Quiz Logs</h2>
        {loading ? (
          <div className="flex justify-center py-10 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin text-brand-secondary mr-2" /> Loading history...
          </div>
        ) : attempts.length === 0 ? (
          <p className="text-xs text-white/30 py-6 text-center">No quiz history available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-white/40 uppercase">
                <tr>
                  <th className="pb-3 font-semibold">Subject / Folder</th>
                  <th className="pb-3 font-semibold">Raw Score</th>
                  <th className="pb-3 font-semibold">Percentage</th>
                  <th className="pb-3 font-semibold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attempts.map((a) => {
                  const pct = Math.round((a.score / (a.total_questions || 1)) * 100);
                  return (
                    <tr key={a.id} className="hover:bg-white/2 transition">
                      <td className="py-3.5 font-medium flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5 text-brand-secondary" />
                        {a.folders?.name || "General"}
                      </td>
                      <td className="py-3.5">{a.score} / {a.total_questions}</td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                          pct >= 70
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                        }`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="py-3.5 text-white/40 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}