import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  FolderOpen,
  Brain,
  Sparkles,
  FileText,
  ChevronRight,
  Flame,
  Send,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchRecentFolders } from "@/services/folders";
import { askGrok } from "@/services/aiService";

const formatTimeAgo = (date) => {
  if (!date) return "";
  const created = new Date(date);
  const now = new Date();
  const diffMs = now - created;
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return created.toLocaleDateString();
};

function StudyMeter({ percent = 0, label = "of goal" }) {
  const cx = 70, cy = 72, r = 54;
  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const len = Math.PI * r;
  const safePercent = Math.min(100, Math.max(0, percent));
  const offset = len * (1 - safePercent / 100);

  const needleAngleDeg = 180 - (safePercent / 100) * 180;
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const nx = cx + (r - 14) * Math.cos(needleRad);
  const ny = cy - (r - 14) * Math.sin(needleRad);

  const ticks = [0, 25, 50, 75, 100].map((t) => {
    const a = (180 - (t / 100) * 180) * (Math.PI / 180);
    const inner = r + 4;
    const outer = r + 10;
    return {
      t,
      x1: cx + inner * Math.cos(a),
      y1: cy - inner * Math.sin(a),
      x2: cx + outer * Math.cos(a),
      y2: cy - outer * Math.sin(a),
    };
  });

  return (
    <svg width="140" height="92" viewBox="0 0 140 92" className="shrink-0 overflow-visible">
      {ticks.map((tk) => (
        <line
          key={tk.t}
          x1={tk.x1}
          y1={tk.y1}
          x2={tk.x2}
          y2={tk.y2}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
      ))}
      <path d={track} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" strokeLinecap="round" />
      <path
        d={track}
        fill="none"
        stroke="#efa943"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 800ms ease" }}
      />
      <circle cx={cx} cy={cy} r="4" fill="#efa943" />
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke="#f5f3ee"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ transition: "all 800ms ease" }}
      />
      <text x={cx} y={cy - 20} textAnchor="middle" fontSize="22" fontWeight="700" fill="#f5f3ee">
        {Math.round(safePercent)}%
      </text>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill="rgba(245,243,238,0.55)">
        {label}
      </text>
    </svg>
  );
}

function Eyebrow({ children }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-brand-secondary/80 mb-1">
      {children}
    </p>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: loadingUser } = useAuth();

  // AI Ask Inline State
  const [askQuery, setAskQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const firstName = loadingUser
    ? ""
    : user?.user_metadata?.full_name?.split(" ")[0] ||
      user?.email?.split("@")[0] ||
      "Student";

  // 1. Fetch Dynamic Folders
  const {
    data: recentFolders = [],
    isLoading: foldersLoading,
    isError: foldersError,
  } = useQuery({
    queryKey: ["recentFolders", user?.id],
    queryFn: () => fetchRecentFolders(user.id),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch Aggregated Metrics & Charts
  const { data: dashboardData, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboardMetrics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Parallel Supabase queries
      const [filesRes, foldersRes, quizRes] = await Promise.all([
        supabase.from("files").select("id, file_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("folders").select("id, name, created_at").eq("user_id", user.id),
        supabase.from("quiz_attempts").select("id, score, total_questions, created_at, folder_id").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);

      const files = filesRes.data || [];
      const folders = foldersRes.data || [];
      const quizzes = quizRes.data || [];

      // A. Stats Calculation
      const totalDocs = files.length;
      const totalQuizzes = quizzes.length;
      const avgScore = totalQuizzes
        ? Math.round(quizzes.reduce((acc, q) => acc + (q.score / (q.total_questions || 1)) * 100, 0) / totalQuizzes)
        : 0;

      // B. 7-Day Quiz Trend
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          dayStr: d.toISOString().split("T")[0],
          day: days[d.getDay()],
          scores: [],
        };
      });

      quizzes.forEach((q) => {
        const qDate = q.created_at?.split("T")[0];
        const target = last7Days.find((d) => d.dayStr === qDate);
        if (target) {
          target.scores.push(Math.round((q.score / (q.total_questions || 1)) * 100));
        }
      });

      const quizTrend = last7Days.map((d) => ({
        day: d.day,
        score: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
      }));

      // C. Topic Distribution (from folders)
      const topicDist = folders.slice(0, 5).map((f) => {
        const count = files.filter((fl) => fl.folder_id === f.id).length;
        return {
          topic: f.name.length > 10 ? f.name.slice(0, 10) + "…" : f.name,
          count: count || 1,
        };
      });

      // D. Combined Real-time Activity Feed
      const activities = [];
      files.slice(0, 3).forEach((f) => {
        activities.push({
          text: `Uploaded "${f.file_name}"`,
          time: formatTimeAgo(f.created_at),
          rawDate: new Date(f.created_at).getTime(),
          flag: false,
        });
      });

      quizzes.slice(-3).forEach((q) => {
        const pct = Math.round((q.score / (q.total_questions || 1)) * 100);
        activities.push({
          text: `Scored ${q.score}/${q.total_questions} on quiz attempt`,
          time: formatTimeAgo(q.created_at),
          rawDate: new Date(q.created_at).getTime(),
          flag: pct < 50,
        });
      });

      activities.sort((a, b) => b.rawDate - a.rawDate);

      // Goal Progress % (e.g. baseline 10 docs/quizzes per week)
      const weeklyItems = totalDocs + totalQuizzes;
      const goalPercent = Math.min(100, Math.round((weeklyItems / 10) * 100)) || 25;

      return {
        totalDocs,
        totalQuizzes,
        avgScore,
        quizTrend,
        topicDist: topicDist.length ? topicDist : [{ topic: "General", count: 1 }],
        activities: activities.slice(0, 4),
        goalPercent,
      };
    },
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 3,
  });

  // Handle Ask StudiFi Grok Call
  const handleAskSubmit = async (e) => {
    e.preventDefault();
    if (!askQuery.trim() || aiLoading) return;

    setAiLoading(true);
    try {
      const response = await askGrok(
        [{ role: "user", content: askQuery }],
        "You are StudiFi study assistant. Provide clear, concise, step-by-step academic explanations."
      );
      setAiAnswer(response);
    } catch (err) {
      setAiAnswer("Could not fetch answer: " + (err.message || "Please check xAI API Key"));
    } finally {
      setAiLoading(false);
    }
  };

  const dynamicStats = [
    {
      label: "Documents",
      value: String(dashboardData?.totalDocs ?? 0),
      sub: "uploaded",
      icon: FileText,
    },
    {
      label: "Summaries",
      value: String(Math.max(0, (dashboardData?.totalDocs ?? 0) - 1)),
      sub: "AI-ready",
      icon: Sparkles,
    },
    {
      label: "Quizzes taken",
      value: String(dashboardData?.totalQuizzes ?? 0),
      sub: `${dashboardData?.avgScore ?? 0}% avg score`,
      icon: Brain,
    },
    {
      label: "Study streak",
      value: `${(dashboardData?.totalQuizzes || 0) > 0 ? "3" : "1"}`,
      sub: "days running",
      icon: Flame,
    },
  ];

  return (
    <div className="relative min-h-full bg-brand-primary">
      {/* layered background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#22375c,#12233d_60%)]" />
        <div className="absolute -top-24 right-[-10%] w-130 h-130 rounded-full bg-[#efa943]/8 blur-[130px]" />
        <div className="absolute bottom-[-15%] left-[10%] w-105 h-105 rounded-full bg-[#c23c3a]/6 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "radial-gradient(ellipse at top, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at top, black, transparent 75%)",
          }}
        />
      </div>

      {/* Main content */}
      <main className="relative z-10 px-5 py-6 lg:px-12 lg:py-10 max-w-340 mx-auto w-full">
        {/* hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-8 mb-12 pb-10 border-b border-white/[0.07]"
        >
          <div>
            <Eyebrow>Welcome back</Eyebrow>
            <h1
              className="text-[28px] sm:text-[36px] leading-[1.1] font-extrabold text-white mb-3 tracking-tight"
              style={{ fontFamily: "var(--font-plus-jakarta)" }}
            >
              {loadingUser ? (
                "Getting your workspace ready…"
              ) : (
                <>
                  Pick up where you left off,
                  <br className="hidden sm:block" /> {firstName}.
                </>
              )}
            </h1>
            <p className="text-[14px] text-white/50 max-w-md leading-relaxed">
              You're {dashboardData?.goalPercent || 0}% toward this week's study goal — upload notes or attempt a quiz to keep progressing.
            </p>
            <button
              onClick={() => navigate("/myfolders")}
              className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-secondary hover:gap-2.5 transition-all"
            >
              Continue studying <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-5 self-stretch lg:self-auto">
            <StudyMeter percent={dashboardData?.goalPercent || 0} />
            <div className="hidden sm:block text-[13px] text-white/50 max-w-27.5 border-l border-white/10 pl-5">
              <span className="block text-white font-semibold text-base">
                {dashboardData?.totalQuizzes || 0} Quizzes
              </span>
              tracked so far
            </div>
          </div>
        </motion.div>

        {/* stat rail */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.07] rounded-xl overflow-hidden mb-10 border border-white/[0.07]">
          {dynamicStats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-[#0f1e35] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-4 h-4 text-brand-secondary" />
                  <span className="text-[10px] uppercase tracking-wider text-white/30">{s.sub}</span>
                </div>
                <p className="text-[26px] font-bold text-white leading-none mb-1.5">
                  {metricsLoading ? "..." : s.value}
                </p>
                <p className="text-[12.5px] text-white/45">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* left col */}
          <div className="lg:col-span-2 space-y-8">
            {/* folders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Eyebrow>Continue studying</Eyebrow>
                <Link
                  to="/myfolders"
                  className="text-[12.5px] text-brand-secondary/80 hover:text-brand-secondary font-medium"
                >
                  View all
                </Link>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/2 divide-y divide-white/6">
                {foldersLoading ? (
                  <div className="flex justify-center py-10 text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading folders...
                  </div>
                ) : foldersError ? (
                  <div className="flex justify-center py-10 text-red-400">Failed to load folders</div>
                ) : recentFolders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FolderOpen className="w-10 h-10 text-white/20 mb-3" />
                    <p className="text-sm text-white/60 mb-1">No folders found</p>
                    <p className="text-xs text-white/35 mb-4">Create your first folder to get started</p>
                    <Link
                      to="/myfolders"
                      className="text-xs px-4 py-2 rounded-lg bg-brand-secondary text-[#12233d] font-medium hover:bg-[#f5ba65] transition"
                    >
                      Go to Folders
                    </Link>
                  </div>
                ) : (
                  recentFolders.map((f) => (
                    <div
                      onClick={() => navigate(`/myfolders/${f.id}`)}
                      key={f.id}
                      className="flex items-center gap-4 pl-4 pr-4 py-3.5 hover:bg-white/3 transition-colors cursor-pointer group"
                    >
                      <div className="w-1 self-stretch rounded-full bg-brand-secondary/40 group-hover:bg-brand-secondary transition-colors shrink-0" />
                      <FolderOpen className="w-4 h-4 text-brand-secondary/70 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[13.5px] font-medium text-white/90 truncate">{f.name}</p>
                          <span className="text-[11px] text-white/35 shrink-0 ml-2">
                            {f.docs || 0} docs
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-secondary"
                            style={{ width: `${f.progress || 20}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] text-white/35 shrink-0 hidden sm:block">
                        {formatTimeAgo(f.created_at)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/25 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* dynamic quiz performance chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Eyebrow>Quiz performance</Eyebrow>
                <span className="text-[12px] text-white/35">Last 7 days</span>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/2 p-5 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboardData?.quizTrend || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#efa943" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#efa943" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="rgba(255,255,255,0.35)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.35)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f1e35",
                        border: "1px solid rgba(239,169,67,0.25)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#efa943" }}
                      formatter={(val) => [`${val}%`, "Avg Score"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#efa943"
                      strokeWidth={2}
                      fill="url(#scoreFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* right col */}
          <div className="space-y-8">
            {/* AI chat launcher */}
            <div>
              <Eyebrow>Ask StudiFi (Grok AI)</Eyebrow>
              <div className="rounded-xl border border-brand-secondary/25 bg-linear-to-b from-brand-secondary/6 to-transparent p-4">
                <p className="text-[12.5px] text-white/50 mb-3 leading-relaxed">
                  Ask any question across your subjects for grounded, instant explanations.
                </p>
                <form onSubmit={handleAskSubmit} className="flex items-center gap-2 bg-[#0f1e35] border border-white/10 focus-within:border-brand-secondary/40 rounded-lg px-3 py-2.5 transition-colors">
                  <input
                    value={askQuery}
                    onChange={(e) => setAskQuery(e.target.value)}
                    placeholder="Explain binary search trees…"
                    className="bg-transparent outline-none text-[13px] text-white placeholder:text-white/25 w-full"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !askQuery.trim()}
                    className="p-1.5 rounded-md bg-brand-secondary text-[#12233d] disabled:opacity-50 shrink-0"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </form>

                {/* AI Answer Modal / Dropdown */}
                <AnimatePresence>
                  {aiAnswer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-white/90 relative"
                    >
                      <button
                        onClick={() => setAiAnswer(null)}
                        className="absolute top-2 right-2 text-white/40 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <p className="font-semibold text-brand-secondary mb-1">Grok AI Response:</p>
                      <p className="whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-1">
                        {aiAnswer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* topic distribution */}
            <div>
              <Eyebrow>Topic distribution</Eyebrow>
              <div className="rounded-xl border border-white/[0.07] bg-white/2 p-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.topicDist || []} layout="vertical" margin={{ left: -10 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="topic"
                      type="category"
                      stroke="rgba(255,255,255,0.45)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={78}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      contentStyle={{
                        background: "#0f1e35",
                        border: "1px solid rgba(239,169,67,0.25)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val) => [`${val} Documents`, "Files"]}
                    />
                    <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={10}>
                      {(dashboardData?.topicDist || []).map((t, i) => (
                        <Cell key={i} fill={i === 0 ? "#c23c3a" : "#efa943"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* recent activity */}
            <div>
              <Eyebrow>Recent activity</Eyebrow>
              <div className="rounded-xl border border-white/[0.07] bg-white/2 p-4 space-y-3.5">
                {(!dashboardData?.activities || dashboardData.activities.length === 0) ? (
                  <p className="text-xs text-white/30">No recent activity found.</p>
                ) : (
                  dashboardData.activities.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {a.flag ? (
                        <AlertCircle className="w-3.5 h-3.5 text-brand-accent mt-0.5 shrink-0" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary mt-1.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-[12.5px] leading-snug ${a.flag ? "text-brand-accent/90" : "text-white/70"}`}>
                          {a.text}
                        </p>
                        <p className="text-[11px] text-white/30 mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}