import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  Brain,
  CheckCircle,
  Trophy,
  Loader2,
  AlertCircle,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function Analytics() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError("");

        const { data, error: fetchErr } = await supabase
          .from("quiz_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchErr) throw fetchErr;
        setAttempts(data || []);
      } catch (err) {
        console.error("Analytics load error:", err);
        setError(err.message || "Failed to load quiz analytics.");
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [user]);

  // Aggregate Metrics
  const totalAttempts = attempts.length;
  const totalScoreSum = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const totalPossibleSum = attempts.reduce((acc, curr) => acc + (curr.total_questions || 5), 0);
  const averageAccuracy = totalPossibleSum > 0 ? Math.round((totalScoreSum / totalPossibleSum) * 100) : 0;
  const highestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto text-white space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-brand-secondary" /> Study & Quiz Analytics
        </h1>
        <p className="text-xs text-white/40 mt-1">
          Track your retention score history and subject performance.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Quizzes */}
        <div className="p-5 rounded-2xl bg-[#374bd8] flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">
              Total Quizzes Attempted
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{totalAttempts}</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Average Accuracy */}
        <div className="p-5 rounded-2xl bg-[#0e8a5b] flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">
              Average Accuracy
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{averageAccuracy}%</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Highest Score */}
        <div className="p-5 rounded-2xl bg-[#d96b14] flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">
              Highest Score
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{highestScore}%</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <Trophy className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Score Progression Over Time */}
      <div className="bg-[#0f1e35] border border-white/10 p-6 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Score Progression Over Time</h3>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-white/40">
            <Loader2 className="w-6 h-6 animate-spin text-brand-secondary mb-2" />
            <span className="text-xs">Loading analytics...</span>
          </div>
        ) : attempts.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/40">
            No quiz attempts logged yet. Complete a quiz to visualize your trend.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {attempts.slice(0, 7).map((att) => (
              <div key={att.id} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-white/80">
                  <span>{att.quiz_title}</span>
                  <span className="text-brand-secondary">{att.percentage}% ({att.score}/{att.total_questions})</span>
                </div>
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-secondary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(att.percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Quiz Logs */}
      <div className="bg-[#0f1e35] border border-white/10 p-6 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Recent Quiz Logs</h3>

        {attempts.length === 0 ? (
          <p className="text-xs text-white/40 py-6 text-center">No quiz history available yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {attempts.map((att) => (
              <div key={att.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5 text-brand-secondary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white/90">{att.quiz_title}</p>
                    <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(att.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-sm text-brand-secondary">{att.percentage}%</span>
                  <p className="text-[11px] text-white/40">{att.score} of {att.total_questions} correct</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}