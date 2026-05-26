"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ArrowUpRight, Swords, Terminal, Users, Trophy, CheckCircle2, Clock, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { problemsApi, leaderboardApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: string; slug: string; title: string;
  difficulty: "easy" | "medium" | "hard";
  creator_name: string; acceptance: number;
  solves: number; tags: { name: string; slug: string }[];
}

interface LeaderEntry {
  rank: number; username: string;
  problems_solved: number; total_score: number; streak: number;
}

// ─── Animation helper ─────────────────────────────────────────────────────────

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return {
    ref,
    style: {
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
    },
  };
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / 60;
    const id = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(id); return; }
      setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [inView, to]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Difficulty dot ────────────────────────────────────────────────────────────

const DIFF_COLOR = { easy: "#3fb950", medium: "#e3b341", hard: "#f85149" };
const DIFF_BG    = { easy: "rgba(63,185,80,0.08)", medium: "rgba(227,179,65,0.08)", hard: "rgba(248,81,73,0.08)" };

// ─── Marquee (problem titles) ─────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  "Two Sum", "LRU Cache", "Merge K Sorted Lists", "Word Ladder",
  "Trapping Rain Water", "Median of Two Arrays", "Course Schedule",
  "Minimum Window Substring", "Serialize Binary Tree", "Alien Dictionary",
  "Two Sum", "LRU Cache", "Merge K Sorted Lists", "Word Ladder",
  "Trapping Rain Water", "Median of Two Arrays", "Course Schedule",
  "Minimum Window Substring", "Serialize Binary Tree", "Alien Dictionary",
];

function Marquee() {
  return (
    <div className="overflow-hidden border-y border-kenyx-border select-none">
      <div className="flex animate-marquee whitespace-nowrap py-3.5">
        {MARQUEE_ITEMS.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-4 mx-6 text-sm font-mono text-kenyx-text-muted"
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: i % 3 === 0 ? "#3fb950" : i % 3 === 1 ? "#e3b341" : "#f85149" }}
            />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Problem row ──────────────────────────────────────────────────────────────

function ProblemRow({ problem, index }: { problem: Problem; index: number }) {
  const revealProps = useReveal(index * 0.05);
  return (
    <div {...revealProps}>
      <Link
        href={`/problems/${problem.slug}`}
        id={`problem-row-${problem.slug}`}
        className="group flex items-center gap-4 px-4 py-3.5 border-b border-kenyx-border hover:bg-white/[0.02] transition-colors"
      >
        {/* Index */}
        <span className="w-6 text-right text-xs font-mono text-kenyx-text-muted shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-kenyx-text-secondary group-hover:text-kenyx-text-primary transition-colors line-clamp-1">
          {problem.title}
        </span>

        {/* Tags */}
        <div className="hidden md:flex items-center gap-1.5 w-32 shrink-0">
          {problem.tags?.slice(0, 2).map((t) => (
            <span key={t.slug} className="tag-chip">{t.name}</span>
          ))}
        </div>

        {/* Difficulty */}
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-md w-16 text-center shrink-0"
          style={{
            color: DIFF_COLOR[problem.difficulty],
            background: DIFF_BG[problem.difficulty],
          }}
        >
          {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
        </span>

        {/* Acceptance */}
        <span className="text-xs text-kenyx-text-muted font-mono shrink-0 hidden lg:block w-12 text-right">
          {(problem.acceptance * 100).toFixed(0)}%
        </span>

        {/* Arrow */}
        <div className="w-5 flex justify-end shrink-0">
          <ArrowUpRight className="h-3.5 w-3.5 text-kenyx-text-muted group-hover:text-kenyx-accent transition-colors" />
        </div>
      </Link>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  number, title, desc, delay,
}: { number: string; title: string; desc: string; delay: number }) {
  const revealProps = useReveal(delay);
  return (
    <div {...revealProps} className="relative">
      <div className="card p-6 h-full">
        <div className="font-mono text-xs text-kenyx-accent mb-4 opacity-60">{number}</div>
        <h3 className="text-base font-semibold text-kenyx-text-primary mb-2">{title}</h3>
        <p className="text-sm text-kenyx-text-secondary leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const heroRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([problemsApi.trending(8), leaderboardApi.get(5)])
      .then(([p, l]) => { setProblems(p || []); setLeaders(l || []); })
      .catch((err) => console.error("Failed to load trending data:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">

      {/*──────────────────────────── HERO ────────────────────────────────────────*/}
      <section
        ref={heroRef}
        className="relative bg-grid min-h-[92vh] flex flex-col justify-center px-5 md:px-12 lg:px-20 overflow-hidden"
      >
        {/* Subtle lime ambient at top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, #a8ff3e 50%, transparent 100%)", opacity: 0.4 }}
        />
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[600px] h-[300px]"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,255,62,0.06) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full py-24">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3 mb-10"
          >
            <span
              className="inline-block w-1 h-4 rounded-sm"
              style={{ background: "#a8ff3e" }}
            />
            <span className="section-label">Community-driven coding platform</span>
          </motion.div>

          {/* Headline — large editorial type */}
          <div className="overflow-hidden">
            <motion.h1
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: "0%" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-black leading-none tracking-tightest text-kenyx-text-primary"
              style={{ fontSize: "clamp(2.5rem, 8vw, 8rem)" }}
            >
              Build your
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: "0%" }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="font-black leading-none tracking-tightest"
              style={{
                fontSize: "clamp(2.5rem, 8vw, 8rem)",
                WebkitTextStroke: "1px rgba(255,255,255,0.15)",
                color: "transparent",
              }}
            >
              algorithm
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: "0%" }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="font-black leading-none tracking-tightest text-kenyx-text-primary"
              style={{ fontSize: "clamp(2.5rem, 8vw, 8rem)" }}
            >
              muscle.
            </motion.h1>
          </div>

          {/* Sub + CTAs row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col md:flex-row md:items-center gap-8 mt-12"
          >
            <p className="text-kenyx-text-secondary max-w-md leading-relaxed">
              Kenyx is where developers solve problems created by the community —
              and create their own. Real-time execution. Battle mode. Leaderboards.
            </p>
            <div className="flex items-center gap-3 md:ml-auto">
              <Link href="/problems" className="btn-accent" id="hero-start-btn">
                Start solving <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/battle" className="btn-outline" id="hero-battle-btn">
                <Swords className="h-4 w-4" />
                Battle
              </Link>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap gap-10 mt-16 pt-10 border-t border-kenyx-border"
          >
            {[
              { label: "Problems", to: 1200, suffix: "+" },
              { label: "Developers", to: 18000, suffix: "+" },
              { label: "Submissions", to: 2400000, suffix: "+" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="text-4xl font-black tracking-tight"
                  style={{ color: "#a8ff3e" }}
                >
                  <Counter to={stat.to} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-kenyx-text-muted mt-1 uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/*──────────────────────────── MARQUEE ─────────────────────────────────────*/}
      <Marquee />

      {/*──────────────────────────── PROBLEMS ────────────────────────────────────*/}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div {...useReveal()}>
            <div className="section-label mb-2">Trending</div>
            <h2 className="text-2xl font-bold text-kenyx-text-primary">Hot this week</h2>
          </div>
          <Link
            href="/problems"
            className="text-sm text-kenyx-text-muted hover:text-kenyx-text-primary flex items-center gap-1 transition-colors"
            id="view-all-problems-btn"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-kenyx-text-muted border-b border-kenyx-border">
          <span className="w-6" />
          <span className="flex-1">Title</span>
          <span className="hidden md:block w-32">Tags</span>
          <span className="w-16 text-center">Level</span>
          <span className="hidden lg:block w-12 text-right">Acc.</span>
          <span className="w-5" />
        </div>

        {loading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-kenyx-border">
                <div className="skeleton h-3.5 w-6" />
                <div className="skeleton h-3.5 flex-1" />
                <div className="skeleton h-3.5 w-16" />
              </div>
            ))
          : problems.map((p, i) => <ProblemRow key={p.id} problem={p} index={i} />)
        }

        <div className="pt-5 text-center">
          <Link href="/problems" className="btn-outline text-sm" id="see-more-btn">
            See all problems <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/*──────────────────────────── HOW IT WORKS ────────────────────────────────*/}
      <section className="bg-kenyx-surface border-y border-kenyx-border py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div {...useReveal()} className="mb-12">
            <div className="section-label mb-2">How it works</div>
            <h2 className="text-2xl font-bold text-kenyx-text-primary max-w-sm">
              More than just solving — built to create.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StepCard number="01" title="Pick a Problem" desc="Browse problems by difficulty, tag, or creator. Filter exactly what you need to practice." delay={0} />
            <StepCard number="02" title="Write & Execute" desc="Use our Monaco editor with 6 languages. Your code runs in isolated Docker containers — millisecond feedback." delay={0.08} />
            <StepCard number="03" title="Create & Submit" desc="Built something elegant? Submit your own problem. It goes through our quality review process." delay={0.16} />
            <StepCard number="04" title="Compete" desc="Battle 1v1 against other developers. Climb the leaderboard. Build your reputation." delay={0.24} />
          </div>
        </div>
      </section>

      {/*──────────────────────────── BATTLE + LEADERBOARD ───────────────────────*/}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Battle card — 2 cols */}
          <div className="lg:col-span-2">
            <div {...useReveal()} className="card h-full p-8 flex flex-col justify-between relative overflow-hidden">
              {/* Background accent */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 0% 100%, rgba(168,255,62,0.06) 0%, transparent 60%)"
                }}
              />
              <div className="relative z-10">
                <div className="section-label mb-6">Battle Mode</div>
                <h2 className="text-3xl font-bold text-kenyx-text-primary leading-tight mb-4">
                  Race a developer in real-time.
                </h2>
                <p className="text-sm text-kenyx-text-secondary leading-relaxed mb-8">
                  Same problem. Two editors. One winner. The first to pass all test cases takes the crown — and the rating points.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-kenyx-text-muted mb-8">
                  {["Real-time execution", "6 languages", "Rated matches"].map((f) => (
                    <span key={f} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full" style={{ background: "#a8ff3e" }} />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/battle" className="btn-accent self-start relative z-10" id="battle-cta-btn">
                <Swords className="h-4 w-4" /> Start a battle
              </Link>
            </div>
          </div>

          {/* Leaderboard — 3 cols */}
          <div className="lg:col-span-3">
            <div {...useReveal(0.1)} className="card h-full">
              <div className="flex items-center justify-between px-5 py-4 border-b border-kenyx-border">
                <div className="section-label">Top Developers</div>
                <Link
                  href="/leaderboard"
                  className="text-xs text-kenyx-text-muted hover:text-kenyx-text-primary transition-colors flex items-center gap-1"
                  id="view-leaderboard-btn"
                >
                  Full board <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="divide-y divide-kenyx-border">
                {loading
                  ? [...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="skeleton h-4 w-5" />
                        <div className="skeleton h-7 w-7 rounded-full" />
                        <div className="skeleton h-4 flex-1" />
                        <div className="skeleton h-4 w-20" />
                      </div>
                    ))
                  : leaders.map((entry, i) => (
                      <div
                        key={entry.username}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <span
                          className="w-5 text-xs font-mono font-semibold shrink-0"
                          style={{
                            color: i === 0 ? "#e3b341" : i === 1 ? "#8b949e" : i === 2 ? "#c97c2f" : "#484f58"
                          }}
                        >
                          {i + 1}
                        </span>
                        <div
                          className="h-7 w-7 rounded-full text-xs font-bold shrink-0 flex items-center justify-center"
                          style={{
                            background: i === 0 ? "#a8ff3e" : i === 1 ? "#30363d" : i === 2 ? "#30363d" : "#1c2636",
                            color: i === 0 ? "#07090b" : "#e6edf3",
                          }}
                        >
                          {entry.username[0].toUpperCase()}
                        </div>
                        <Link
                          href={`/users/${entry.username}`}
                          className="text-sm font-medium text-kenyx-text-primary hover:text-kenyx-accent transition-colors flex-1"
                        >
                          {entry.username}
                        </Link>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-kenyx-text-primary">{entry.total_score.toLocaleString()}</div>
                          <div className="text-xs text-kenyx-text-muted">{entry.problems_solved} solved</div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*──────────────────────────── FEATURES STRIP ─────────────────────────────*/}
      <section className="border-y border-kenyx-border bg-kenyx-surface">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-kenyx-border">
            {[
              { icon: Terminal, title: "Real-time Execution", sub: "Docker-isolated, millisecond feedback" },
              { icon: Users,    title: "Community Problems", sub: "Create, review, publish" },
              { icon: Swords,   title: "Battle Mode",        sub: "1v1 race. Same problem, live results" },
              { icon: Trophy,   title: "Leaderboards",       sub: "Weekly rankings, rated matches" },
            ].map(({ icon: Icon, title, sub }, i) => (
              <div key={title} className="px-6 py-8 text-center">
                <div
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg mb-4"
                  style={{ background: "rgba(168,255,62,0.08)" }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color: "#a8ff3e" }} />
                </div>
                <div className="text-sm font-semibold text-kenyx-text-primary mb-1">{title}</div>
                <div className="text-xs text-kenyx-text-muted leading-relaxed">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*──────────────────────────── CTA ─────────────────────────────────────────*/}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-24">
        <div {...useReveal()} className="relative card p-10 md:p-16 overflow-hidden bg-grid-sm">
          {/* Corner accent */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, #a8ff3e, rgba(168,255,62,0.3), transparent)" }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="section-label mb-3">Get started free</div>
              <h2 className="text-3xl md:text-4xl font-black text-kenyx-text-primary leading-tight text-balance">
                Join thousands of developers<br />grinding the grind.
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/signup" className="btn-accent text-base px-7 py-3" id="final-cta-signup">
                Create account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/problems" className="btn-outline text-base px-7 py-3" id="final-cta-browse">
                Browse problems
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/*──────────────────────────── FOOTER ─────────────────────────────────────*/}
      <footer className="border-t border-kenyx-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-kenyx-text-primary">Kenyx</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#a8ff3e" }} />
          </div>
          <div className="flex gap-6 text-sm text-kenyx-text-muted">
            <Link href="/problems" className="hover:text-kenyx-text-primary transition-colors">Problems</Link>
            <Link href="/leaderboard" className="hover:text-kenyx-text-primary transition-colors">Leaderboard</Link>
            <Link href="/battle" className="hover:text-kenyx-text-primary transition-colors">Battle</Link>
            <Link href="/create" className="hover:text-kenyx-text-primary transition-colors">Create</Link>
          </div>
          <span className="text-xs text-kenyx-text-muted">
            © {new Date().getFullYear()} Kenyx. Built for developers.
          </span>
        </div>
      </footer>

    </div>
  );
}
