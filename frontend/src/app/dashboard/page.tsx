"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { usersApi, submissionsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  Code2, CheckCircle2, XCircle, Clock, Flame,
  Trophy, Plus, TrendingUp, Calendar, ArrowUpRight,
  Zap, Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  problems_solved: number; easy_solved: number;
  medium_solved: number; hard_solved: number;
  total_score: number; rank: number; streak?: number;
  global_easy?: number; global_medium?: number; global_hard?: number;
}

interface Submission {
  id: string; problem_slug: string; language: string;
  status: string; runtime_ms: number; created_at: string;
  problem_title?: string;
}

interface ActivityEntry { date: string; count: number; }

// ─── Reveal hook ──────────────────────────────────────────────────────────────

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return {
    ref,
    style: {
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
    },
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, accent = false,
  iconColor = "#8b949e",
}: {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  accent?: boolean;
  iconColor?: string;
}) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-kenyx-text-muted">
          {label}
        </span>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
      </div>
      <div
        className="text-4xl font-black tracking-tight"
        style={{ color: accent ? "#a8ff3e" : "#e6edf3" }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

function ActivityHeatmap({ data }: { data: ActivityEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  // Debug log to see what's coming from API
  console.log("DEBUG: Heatmap Data Received:", data?.length, "entries. Total count:", data?.reduce((a,b)=>a+b.count,0));

  // 1. Generate the last ~365 days, ending EXACTLY on today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // We want to show a full year (52-53 weeks)
  // To keep the day labels (Sun, Tue, Thu, Sat) aligned, we need the start of our array 
  // to be a Sunday.
  const totalDaysToShow = 365 + today.getDay(); // 365 days plus enough to start on a Sunday
  
  const allDays: ActivityEntry[] = [];
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (totalDaysToShow - 1));
  
  // Align startDate to Sunday if it isn't already (though the math above handles it)
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  // Generate days from startDate to today
  const curr = new Date(startDate);
  while (curr <= today) {
    const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
    const existing = data.find(entry => entry.date === dateStr);
    allDays.push({
      date: dateStr,
      count: existing ? existing.count : 0
    });
    curr.setDate(curr.getDate() + 1);
  }

  // 2. Group into weeks (columns)
  const weeks: ActivityEntry[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const getLevelColor = (count: number) => {
    if (count === 0) return "#161b22";
    if (count <= 1) return "#0e4429";
    if (count <= 3) return "#006d32";
    if (count <= 5) return "#26a641";
    if (count <= 10) return "#39d353";
    return "#a8ff3e";
  };

  const totalActivity = data.reduce((sum, d) => sum + d.count, 0);
  const activeDays    = data.filter((d) => d.count > 0).length;

  // Month labels logic
  const monthLabels: { label: string; index: number }[] = [];
  weeks.forEach((week, i) => {
    const firstDay = new Date(week[0].date);
    if (firstDay.getDate() <= 7) {
      const month = firstDay.toLocaleString('default', { month: 'short' });
      if (!monthLabels.find(l => l.label === month)) {
        monthLabels.push({ label: month, index: i });
      }
    }
  });

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="overflow-x-auto pb-2 scrollbar-hide" ref={scrollRef}>
        <div className="inline-block min-w-full relative">
          
          {/* Month Labels row */}
          <div className="flex gap-[3px] mb-2 ml-10">
            {weeks.map((_, i) => {
              const label = monthLabels.find(l => l.index === i);
              return (
                <div key={i} className="w-[11px] shrink-0 text-[8px] text-kenyx-text-muted font-medium">
                  {label?.label}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px] relative">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] text-[8px] text-kenyx-text-muted font-bold pr-2 justify-between h-[95px] w-8 py-[2px]">
              <span className="h-[11px] flex items-center">Sun</span>
              <span className="h-[11px] flex items-center invisible">Mon</span>
              <span className="h-[11px] flex items-center">Tue</span>
              <span className="h-[11px] flex items-center invisible">Wed</span>
              <span className="h-[11px] flex items-center">Thu</span>
              <span className="h-[11px] flex items-center invisible">Fri</span>
              <span className="h-[11px] flex items-center">Sat</span>
            </div>

            {/* The Grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                  {week.map((day, di) => (
                    <div
                      key={day.date || di}
                      className="heatmap-cell"
                      style={{ backgroundColor: getLevelColor(day.count) }}
                      title={day.date ? `${day.date}: ${day.count} submissions` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[10px] text-kenyx-text-muted">
        <span>
          <strong className="text-kenyx-text-primary">{activeDays}</strong> active days ·{" "}
          <strong className="text-kenyx-text-primary">{totalActivity}</strong> total submissions
        </span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {[0, 1, 3, 5, 10, 15].map((count) => (
            <div 
              key={count} 
              className="heatmap-cell" 
              style={{ backgroundColor: getLevelColor(count) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Submissions Table ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  accepted:              "#3fb950",
  wrong_answer:          "#f85149",
  time_limit_exceeded:   "#e3b341",
  memory_limit_exceeded: "#e3b341",
  runtime_error:         "#f85149",
  compile_error:         "#f85149",
};
const STATUS_BG: Record<string, string> = {
  accepted:              "rgba(63,185,80,0.1)",
  wrong_answer:          "rgba(248,81,73,0.1)",
  time_limit_exceeded:   "rgba(227,179,65,0.1)",
  runtime_error:         "rgba(248,81,73,0.1)",
  compile_error:         "rgba(248,81,73,0.1)",
};
const STATUS_LABEL: Record<string, string> = {
  accepted:              "Accepted",
  wrong_answer:          "Wrong Answer",
  time_limit_exceeded:   "TLE",
  memory_limit_exceeded: "MLE",
  runtime_error:         "Runtime Error",
  compile_error:         "Compile Error",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isInitialized, setUser }  = useAuthStore();
  const router    = useRouter();

  const [stats, setStats]           = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [myProblems, setMyProblems]   = useState<any[]>([]);
  const [activity, setActivity]     = useState<ActivityEntry[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    console.log("DEBUG: Dashboard mounted. isInitialized:", isInitialized, "User:", user?.username);
    if (!isInitialized) return;
    if (!user) { 
      console.log("DEBUG: No user found after init, redirecting...");
      router.push("/login"); 
      return; 
    }
    console.log("DEBUG: Starting data fetch for dashboard...");
    setLoading(true);
    Promise.all([
      usersApi.myStats(), 
      submissionsApi.getAll(), 
      usersApi.myActivity(),
      usersApi.myCreatedProblems(),
      usersApi.me() // Fetch fresh user profile (streak, etc)
    ])
      .then(([s, subs, act, probs, freshUser]) => {
        console.log("DEBUG: Data fetch complete. Found problems:", probs?.length);
        setStats(s);
        setSubmissions(subs || []);
        setActivity(act || []);
        setMyProblems(probs || []);
        if (freshUser) {
          setUser(freshUser); // Update the store with fresh data
        }
      })
      .catch((err) => {
        console.error("DEBUG: Dashboard data fetch failed:", err);
      })
      .finally(() => setLoading(false));
  }, [isInitialized, router, setUser]);

  // All hooks must be called unconditionally before any early returns
  const headerReveal = useReveal(0);
  const statsReveal  = useReveal(0.05);
  const diffReveal   = useReveal(0.1);
  const heatReveal   = useReveal(0.15);
  const subReveal    = useReveal(0.2);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-grid-sm">
      {/* Top accent */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, #a8ff3e 30%, rgba(168,255,62,0.3) 70%, transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12">

        {/* ── Header ── */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="section-label mb-2">Dashboard</div>
            <h1
              className="font-black leading-none tracking-tight text-kenyx-text-primary"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            >
              Welcome back,{" "}
              <span style={{ color: "#a8ff3e" }}>{user.username}</span>
            </h1>
          </div>

          <Link href="/create" className="btn-accent" id="create-problem-btn">
            <Plus className="h-4 w-4" />
            Create Problem
          </Link>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loading
            ? [...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)
            : [
                { icon: Code2,   label: "Solved",    value: stats?.problems_solved ?? 0, accent: true,  iconColor: "#a8ff3e" },
                { icon: Trophy,  label: "Rank",      value: stats?.rank ? `#${stats.rank}` : "—", accent: false, iconColor: "#e3b341" },
                { icon: Flame,   label: "Streak",    value: `${user.streak || 0}d`,  accent: false, iconColor: "#f97316" },
                { icon: Zap,     label: "Score",     value: (stats?.total_score ?? 0).toLocaleString(), accent: false, iconColor: "#8b5cf6" },
              ].map((s) => <StatCard key={s.label} {...s} />)
          }
        </div>

        {/* ── Two column ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Difficulty Breakdown — 1 col */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="section-label" style={{ fontSize: "10px" }}>Progress</div>
            </div>
            <div className="space-y-5">
               {[
                { label: "Easy",   value: stats?.easy_solved   ?? 0, total: stats?.global_easy   || 1, color: "#3fb950" },
                { label: "Medium", value: stats?.medium_solved ?? 0, total: stats?.global_medium || 1, color: "#e3b341" },
                { label: "Hard",   value: stats?.hard_solved   ?? 0, total: stats?.global_hard   || 1, color: "#f85149" },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-semibold" style={{ color }}>{label}</span>
                    <span className="text-kenyx-text-muted font-mono">{value} / {total}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((value / total) * 100, 100)}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Mini ring chart using text */}
            {stats && (
              <div className="mt-6 pt-5 border-t border-kenyx-border flex items-center justify-center gap-6 text-center">
                {[
                  { label: "Easy",   value: stats.easy_solved,   color: "#3fb950" },
                  { label: "Medium", value: stats.medium_solved, color: "#e3b341" },
                  { label: "Hard",   value: stats.hard_solved,   color: "#f85149" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="text-2xl font-black" style={{ color }}>{value}</div>
                    <div className="text-2xs text-kenyx-text-muted mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-[#0d1117] border border-white/5 rounded-xl p-5 h-[220px] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-kenyx-accent" />
              <h2 className="section-label">Activity — Last 365 Days</h2>
            </div>
            <div className="flex-1">
              {loading ? (
                <div className="skeleton h-20 rounded-lg" />
              ) : (
                <ActivityHeatmap data={activity} />
              )}
            </div>
          </div>
        </div>

        {/* ── My Contributions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
             <div className="card p-6 h-full flex flex-col justify-center text-center">
                <div className="bg-kenyx-accent/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-kenyx-accent" />
                </div>
                <h3 className="text-white font-bold mb-2">Creator Reputation</h3>
                <p className="text-xs text-kenyx-text-muted leading-relaxed">
                  Earn +25 Rep for each approved problem. More likes and solves increase your global impact.
                </p>
             </div>
          </div>

          <div className="lg:col-span-2 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-kenyx-border">
              <div className="flex items-center gap-2">
                <Code2 className="h-3.5 w-3.5 text-kenyx-text-muted" />
                <div className="section-label" style={{ fontSize: "10px" }}>My Created Challenges</div>
              </div>
              <Link href="/create" className="text-xs text-kenyx-accent hover:underline">Submit new</Link>
            </div>
            
            <div className="divide-y divide-kenyx-border">
              {loading ? (
                <div className="p-5 space-y-3">
                   <div className="skeleton h-12 rounded-lg" />
                   <div className="skeleton h-12 rounded-lg" />
                </div>
              ) : myProblems.length === 0 ? (
                <div className="p-8 text-center text-xs text-kenyx-text-muted">You haven&apos;t created any challenges yet.</div>
              ) : (
                myProblems.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{p.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-kenyx-text-muted uppercase tracking-wider">{p.difficulty}</span>
                        {p.status === 'approved' && (
                          <span className="text-[10px] text-kenyx-text-muted flex items-center gap-1">
                            · <Flame className="h-2.5 w-2.5" /> {p.likes} likes
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={clsx(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                      p.status === 'approved' ? "bg-kenyx-success/10 text-kenyx-success" :
                      p.status === 'rejected' ? "bg-kenyx-danger/10 text-kenyx-danger" : "bg-white/5 text-kenyx-text-muted"
                    )}>
                      {p.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Submissions ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-kenyx-border">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-kenyx-text-muted" />
              <div className="section-label" style={{ fontSize: "10px" }}>Recent Submissions</div>
            </div>
            <Link
              href="/problems"
              className="text-xs text-kenyx-text-muted hover:text-kenyx-text-primary transition-colors flex items-center gap-1"
            >
              Browse all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton rounded-lg" style={{ height: "44px", opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-16 text-center">
              <Code2 className="h-8 w-8 mx-auto mb-3 text-kenyx-text-muted opacity-30" />
              <p className="text-sm text-kenyx-text-muted mb-4">No submissions yet.</p>
              <Link href="/problems" className="btn-accent text-sm" id="browse-problems-btn">
                Start solving
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-kenyx-border">
              {submissions.slice(0, 10).map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Status icon */}
                  {sub.status === "accepted"
                    ? <CheckCircle2 className="h-4 w-4 text-kenyx-success shrink-0" />
                    : <XCircle      className="h-4 w-4 text-kenyx-danger   shrink-0" />
                  }

                  {/* Problem link */}
                  <Link
                    href={`/problems/${sub.problem_slug}`}
                    className="flex-1 text-sm font-medium text-kenyx-text-secondary group-hover:text-kenyx-text-primary transition-colors truncate"
                  >
                    {sub.problem_title || (sub.problem_slug 
                      ? sub.problem_slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : "Unknown Problem")
                    }
                  </Link>

                  {/* Language */}
                  {sub.language && (
                    <span className="text-2xs font-mono text-kenyx-text-muted border border-kenyx-border rounded-md px-2 py-1 hidden sm:block">
                      {sub.language}
                    </span>
                  )}

                  {/* Status badge */}
                  <span
                    className="text-2xs font-semibold px-2 py-0.5 rounded-md shrink-0"
                    style={{
                      color: STATUS_COLOR[sub.status] || "#8b949e",
                      background: STATUS_BG[sub.status]  || "rgba(255,255,255,0.05)",
                    }}
                  >
                    {STATUS_LABEL[sub.status] || sub.status}
                  </span>

                  {/* Runtime */}
                  {sub.runtime_ms > 0 && (
                    <span className="flex items-center gap-1 text-2xs text-kenyx-text-muted font-mono hidden md:flex">
                      <Clock className="h-3 w-3" /> {sub.runtime_ms}ms
                    </span>
                  )}

                  {/* Arrow */}
                  <ArrowUpRight className="h-3.5 w-3.5 text-kenyx-text-muted/30 group-hover:text-kenyx-accent transition-colors shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
