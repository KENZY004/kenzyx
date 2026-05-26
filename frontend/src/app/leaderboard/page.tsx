"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, Flame, Code2, ArrowUpRight } from "lucide-react";
import { leaderboardApi } from "@/lib/api";
import Link from "next/link";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number; user_id: string; username: string;
  avatar_url: string; problems_solved: number;
  total_score: number; streak: number; rank_change: number;
}

const TIMEFRAMES = ["All Time", "This Month", "This Week"] as const;

// ─── Podium position config ───────────────────────────────────────────────────

const PODIUM = [
  { pos: 1, height: "h-32", order: 1, color: "#e3b341", avatarSize: "h-16 w-16", textSize: "text-2xl" },
  { pos: 2, height: "h-20", order: 0, color: "#8b949e", avatarSize: "h-12 w-12", textSize: "text-lg"  },
  { pos: 3, height: "h-14", order: 2, color: "#c97c2f", avatarSize: "h-12 w-12", textSize: "text-lg"  },
];

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

// ─── Rank number style ────────────────────────────────────────────────────────

function rankStyle(rank: number): React.CSSProperties {
  if (rank === 1) return { color: "#e3b341" };
  if (rank === 2) return { color: "#8b949e" };
  if (rank === 3) return { color: "#c97c2f" };
  return { color: "#484f58" };
}

function avatarStyle(rank: number): React.CSSProperties {
  if (rank === 1) return { background: "#a8ff3e", color: "#07090b" };
  if (rank === 2) return { background: "#30363d", color: "#e6edf3" };
  if (rank === 3) return { background: "#2d2016", color: "#c97c2f" };
  return { background: "#141c24", color: "#8b949e" };
}

// ─── Podium Block ─────────────────────────────────────────────────────────────

function PodiumBlock({ entry, config }: { entry: LeaderboardEntry; config: typeof PODIUM[number] }) {
  return (
    <div className="flex flex-col items-center" style={{ order: config.order }}>
      {/* Crown for #1 */}
      {config.pos === 1 && (
        <div className="text-xl mb-1 leading-none">👑</div>
      )}

      {/* Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: config.pos * 0.1, type: "spring", stiffness: 200 }}
        className={clsx(config.avatarSize, "rounded-full flex items-center justify-center font-black mb-2 shrink-0")}
        style={{
          ...avatarStyle(config.pos),
          boxShadow: config.pos === 1 ? "0 0 20px rgba(168,255,62,0.3)" : undefined,
        }}
      >
        <span className={config.textSize}>{entry.username[0].toUpperCase()}</span>
      </motion.div>

      {/* Name */}
      <Link
        href={`/users/${entry.username}`}
        className="text-xs font-semibold text-kenyx-text-primary hover:text-kenyx-accent transition-colors mb-0.5 text-center"
      >
        {entry.username}
      </Link>
      <span className="text-2xs text-kenyx-text-muted font-mono mb-3">
        {entry.total_score.toLocaleString()} pts
      </span>

      {/* Podium bar */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.3 + config.pos * 0.08, duration: 0.5, ease: "easeOut" }}
        style={{ transformOrigin: "bottom", borderColor: config.color + "33", background: config.color + "10" }}
        className={clsx(
          config.height,
          "w-24 rounded-t-lg border border-b-0 flex items-center justify-center"
        )}
      >
        <span
          className="text-3xl font-black"
          style={{ color: config.color }}
        >
          {config.pos}
        </span>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [timeframe, setTimeframe] = useState<typeof TIMEFRAMES[number]>("All Time");

  useEffect(() => {
    setLoading(true);
    leaderboardApi
      .get(50)
      .then(setEntries)
      .catch((err) => {
        console.error("Failed to load leaderboard:", err);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [timeframe]);

  const headerReveal = useReveal(0);
  const podiumReveal = useReveal(0.05);
  const tableReveal  = useReveal(0.1);

  return (
    <div className="min-h-screen bg-grid-sm">
      {/* Top accent line */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, #a8ff3e 30%, rgba(168,255,62,0.3) 70%, transparent)" }}
      />

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-12">

        {/* ── Header ── */}
        <div {...headerReveal} className="mb-10">
          <div className="section-label mb-2">Rankings</div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1
              className="font-black leading-none tracking-tight text-kenyx-text-primary"
              style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
            >
              Leaderboard.
            </h1>
            <p className="text-sm text-kenyx-text-muted max-w-xs">
              Ranked by score, problems solved, and consistency.
            </p>
          </div>

          {/* Timeframe pills */}
          <div className="flex gap-2 mt-6">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150"
                style={
                  timeframe === tf
                    ? { color: "#a8ff3e", background: "rgba(168,255,62,0.08)", borderColor: "rgba(168,255,62,0.3)" }
                    : { color: "#8b949e", background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
                }
                id={`timeframe-${tf.replace(/ /g, "-").toLowerCase()}`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* ── Podium ── */}
        {!loading && entries.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-10"
          >
            {/* Thin accent line above podium */}
            <div
              className="h-px mb-8 mx-auto w-24"
              style={{ background: "linear-gradient(90deg, transparent, #a8ff3e, transparent)" }}
            />

            <div className="flex items-end justify-center gap-3">
              {PODIUM.map((config) => (
                <PodiumBlock key={config.pos} entry={entries[config.pos - 1]} config={config} />
              ))}
            </div>

            {/* Podium base line */}
            <div
              className="h-px mt-0"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
            />
          </motion.div>
        )}

        {/* ── Table ── */}
        <div {...tableReveal} className="card overflow-hidden">

          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_90px_80px_70px_48px] gap-4 px-5 py-3 border-b border-kenyx-border bg-white/[0.02]">
            {["#", "Developer", "Score", "Solved", "Streak", "Δ"].map((h) => (
              <span key={h} className="text-2xs font-semibold uppercase tracking-widest text-kenyx-text-muted text-right first:text-left">
                {h}
              </span>
            ))}
          </div>

          <div className="divide-y divide-kenyx-border">
            {loading
              ? [...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[48px_1fr_90px_80px_70px_48px] gap-4 px-5 py-4 items-center"
                    style={{ opacity: 1 - i * 0.1 }}
                  >
                    <div className="skeleton h-4 w-8 rounded" />
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-8 w-8 rounded-full" />
                      <div className="skeleton h-3.5 w-28 rounded" />
                    </div>
                    <div className="skeleton h-3.5 w-16 rounded ml-auto" />
                    <div className="skeleton h-3.5 w-10 rounded ml-auto" />
                    <div className="skeleton h-3.5 w-10 rounded ml-auto" />
                    <div className="skeleton h-3.5 w-6 rounded ml-auto" />
                  </div>
                ))
              : entries.map((entry, i) => (
                  <motion.div
                    key={entry.username}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    className={clsx(
                      "grid grid-cols-[48px_1fr_90px_80px_70px_48px] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors group",
                      i < 3 && "bg-white/[0.01]"
                    )}
                  >
                    {/* Rank */}
                    <span
                      className="text-sm font-black font-mono"
                      style={rankStyle(entry.rank)}
                    >
                      {entry.rank}
                    </span>

                    {/* Developer */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={avatarStyle(entry.rank)}
                      >
                        {entry.username[0].toUpperCase()}
                      </div>
                      <Link
                        href={`/users/${entry.username}`}
                        className="text-sm font-semibold text-kenyx-text-secondary group-hover:text-kenyx-text-primary transition-colors truncate"
                        id={`user-${entry.username}`}
                      >
                        {entry.username}
                      </Link>
                      {i === 0 && (
                        <span className="text-xs ml-1">👑</span>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <span
                        className="text-sm font-bold"
                        style={{ color: i === 0 ? "#a8ff3e" : "#e6edf3" }}
                      >
                        {entry.total_score.toLocaleString()}
                      </span>
                      <span className="text-2xs text-kenyx-text-muted ml-0.5">pts</span>
                    </div>

                    {/* Solved */}
                    <div className="flex items-center justify-end gap-1.5 text-sm text-kenyx-text-secondary">
                      <Code2 className="h-3 w-3 text-kenyx-text-muted" />
                      <span className="font-medium">{entry.problems_solved}</span>
                    </div>

                    {/* Streak */}
                    <div className="flex items-center justify-end gap-1.5 text-sm">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span className="font-medium text-kenyx-text-secondary">{entry.streak}d</span>
                    </div>

                    {/* Rank change */}
                    <div className="flex justify-end">
                      {entry.rank_change === 0 ? (
                        <Minus className="h-3.5 w-3.5 text-kenyx-text-muted" />
                      ) : entry.rank_change > 0 ? (
                        <span className="flex items-center gap-0.5 text-kenyx-success text-2xs font-bold">
                          <TrendingUp className="h-3 w-3" />{entry.rank_change}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-kenyx-danger text-2xs font-bold">
                          <TrendingDown className="h-3 w-3" />{Math.abs(entry.rank_change)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
            }
          </div>

          {/* Footer */}
          {!loading && entries.length > 0 && (
            <div className="px-5 py-3 border-t border-kenyx-border flex items-center justify-between">
              <span className="text-2xs text-kenyx-text-muted">
                Showing {entries.length} developers
              </span>
              <Link
                href="/problems"
                className="flex items-center gap-1 text-2xs text-kenyx-text-muted hover:text-kenyx-accent transition-colors"
              >
                Start climbing <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
