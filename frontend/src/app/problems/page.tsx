"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Search, CheckCircle2, Circle, Users, ArrowUpRight,
  ChevronDown, X, SlidersHorizontal, BarChart2,
} from "lucide-react";
import { problemsApi, tagsApi } from "@/lib/api";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: string; slug: string; title: string;
  difficulty: "easy" | "medium" | "hard";
  creator_name: string; likes: number; solves: number;
  acceptance: number; tags: { name: string; slug: string }[];
  user_solved?: boolean;
}
interface Tag { id: string; name: string; slug: string; }
interface Pagination { data: Problem[]; total: number; page: number; total_pages: number; }

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const DIFF_COLOR = { easy: "#3fb950", medium: "#e3b341", hard: "#f85149" };
const DIFF_BG    = { easy: "rgba(63,185,80,0.1)", medium: "rgba(227,179,65,0.1)", hard: "rgba(248,81,73,0.1)" };

// ─── Reveal hook ──────────────────────────────────────────────────────────────

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return {
    ref,
    style: {
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
    },
  };
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-kenyx-text-muted">{label}</span>
      <span className="font-semibold text-kenyx-text-primary">{value}</span>
    </div>
  );
}

// ─── Problem row ──────────────────────────────────────────────────────────────

function ProblemRow({ p, index }: { p: Problem; index: number }) {
  const revealProps = useReveal(index * 0.025);
  return (
    <div {...revealProps}>
      <Link
        href={`/problems/${p.slug}`}
        id={`problem-${p.slug}`}
        className="group grid grid-cols-[28px_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 border-b border-kenyx-border hover:bg-white/[0.025] transition-colors"
      >
        {/* Solved indicator */}
        <div className="flex justify-center">
          {p.user_solved ? (
            <CheckCircle2 className="h-4 w-4 text-kenyx-success" />
          ) : (
            <Circle className="h-4 w-4 text-kenyx-text-muted/30" />
          )}
        </div>

        {/* Title + tags */}
        <div className="min-w-0">
          <span className="font-medium text-kenyx-text-secondary group-hover:text-kenyx-text-primary transition-colors line-clamp-1 text-sm">
            {p.title}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {p.tags?.slice(0, 2).map((t) => (
              <span key={t.slug} className="tag-chip">{t.name}</span>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 hidden sm:block"
          style={{ color: DIFF_COLOR[p.difficulty], background: DIFF_BG[p.difficulty] }}
        >
          {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
        </span>

        {/* Acceptance bar */}
        <div className="hidden md:flex flex-col gap-1 w-20 shrink-0">
          <span className="text-xs font-mono text-kenyx-text-muted text-right">
            {(p.acceptance * 100).toFixed(1)}%
          </span>
          <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${p.acceptance * 100}%`,
                background: p.acceptance > 0.6 ? "#3fb950" : p.acceptance > 0.4 ? "#e3b341" : "#f85149",
              }}
            />
          </div>
        </div>

        {/* Solves */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-kenyx-text-muted shrink-0 w-20">
          <Users className="h-3 w-3" />
          {p.solves.toLocaleString()}
        </div>

        {/* Arrow */}
        <ArrowUpRight className="h-3.5 w-3.5 text-kenyx-text-muted/40 group-hover:text-kenyx-accent transition-colors shrink-0" />
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [tags, setTags]         = useState<Tag[]>([]);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]           = useState("");
  const [difficulty, setDifficulty]   = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [tagOpen, setTagOpen]         = useState(false);

  useEffect(() => {
    tagsApi.list().then(setTags).catch((err) => console.error("Failed to load tags:", err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, page_size: 20 };
    if (difficulty) params.difficulty = difficulty;
    if (selectedTag) params.tag = selectedTag;

    problemsApi
      .list(params)
      .then((res: Pagination) => {
        setProblems(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      })
      .catch((err) => {
        console.error("Failed to load problems:", err);
        setProblems([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [difficulty, selectedTag, page]);

  const filtered = search
    ? problems.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : problems;

  const clearFilters = () => { setDifficulty(""); setSelectedTag(""); setSearch(""); setPage(1); };
  const hasFilters = !!(difficulty || selectedTag || search);

  const headerReveal = useReveal(0);
  const tableReveal  = useReveal(0.1);

  return (
    <div className="min-h-screen bg-grid-sm">
      {/* Top accent line */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, #a8ff3e 30%, rgba(168,255,62,0.3) 70%, transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12">

        {/* ── Header ── */}
        <div {...headerReveal} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="section-label mb-2">Problem Set</div>
            <h1
              className="font-black leading-none tracking-tight text-kenyx-text-primary"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Find your challenge.
            </h1>
          </div>

          <div className="flex flex-wrap gap-6 pb-1">
            <StatPill label="Total" value={total.toLocaleString()} />
            <StatPill label="Easy"   value={filtered.filter(p => p.difficulty === "easy").length.toString()} />
            <StatPill label="Medium" value={filtered.filter(p => p.difficulty === "medium").length.toString()} />
            <StatPill label="Hard"   value={filtered.filter(p => p.difficulty === "hard").length.toString()} />
          </div>
        </div>

        {/* ── Controls ── */}
        <div {...useReveal(0.05)} className="flex flex-col sm:flex-row gap-3 mb-6 relative z-50">

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-kenyx-text-muted pointer-events-none" />
            <input
              id="problem-search"
              type="text"
              placeholder="Search problems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="kenyx-input pl-10"
            />
          </div>

          {/* Difficulty pills */}
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                id={`filter-${d}`}
                onClick={() => { setDifficulty(difficulty === d ? "" : d); setPage(1); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-150"
                style={
                  difficulty === d
                    ? { color: DIFF_COLOR[d], background: DIFF_BG[d], borderColor: DIFF_COLOR[d] + "60" }
                    : { color: "#8b949e", background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
                }
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          {/* Tag dropdown */}
          <div className="relative z-50">
            <button
              id="tag-filter-btn"
              onClick={() => setTagOpen(!tagOpen)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-150",
                selectedTag
                  ? "border-kenyx-accent/40 bg-kenyx-accent/8 text-kenyx-accent"
                  : "border-white/[0.08] bg-white/[0.03] text-kenyx-text-muted hover:bg-white/[0.06]"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {selectedTag ? tags.find(t => t.slug === selectedTag)?.name || selectedTag : "Tags"}
              <ChevronDown className={clsx("h-3 w-3 transition-transform duration-200", tagOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {tagOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 card p-1.5 z-[100] max-h-60 overflow-y-auto"
                  id="tag-dropdown"
                >
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => { setSelectedTag(selectedTag === tag.slug ? "" : tag.slug); setPage(1); setTagOpen(false); }}
                      className={clsx(
                        "w-full text-left px-3 py-2 rounded-md text-xs transition-colors duration-100",
                        selectedTag === tag.slug
                          ? "bg-kenyx-accent/10 text-kenyx-accent font-semibold"
                          : "text-kenyx-text-muted hover:bg-white/[0.04] hover:text-kenyx-text-primary"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-kenyx-danger border border-kenyx-danger/30 hover:bg-kenyx-danger/8 transition-colors"
              id="clear-filters-btn"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div {...tableReveal} className="card overflow-hidden">

          {/* Table header */}
          <div className="grid grid-cols-[28px_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-kenyx-border bg-white/[0.02]">
            <div />
            <span className="text-2xs font-semibold uppercase tracking-widest text-kenyx-text-muted">Title</span>
            <span className="text-2xs font-semibold uppercase tracking-widest text-kenyx-text-muted hidden sm:block w-16 text-center">Level</span>
            <span className="text-2xs font-semibold uppercase tracking-widest text-kenyx-text-muted hidden md:block w-20 text-right">Acc.</span>
            <span className="text-2xs font-semibold uppercase tracking-widest text-kenyx-text-muted hidden lg:block w-20">Solves</span>
            <div />
          </div>

          {/* Rows */}
          {loading
            ? [...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[28px_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 border-b border-kenyx-border"
                  style={{ opacity: 1 - i * 0.06 }}
                >
                  <div className="skeleton h-4 w-4 rounded-full" />
                  <div className="skeleton h-3.5 w-3/5" />
                  <div className="skeleton h-5 w-14 rounded-md hidden sm:block" />
                  <div className="skeleton h-3 w-16 hidden md:block" />
                  <div className="skeleton h-3 w-16 hidden lg:block" />
                  <div className="skeleton h-3.5 w-3.5 rounded" />
                </div>
              ))
            : filtered.length === 0
            ? (
              <div className="py-20 text-center">
                <BarChart2 className="h-8 w-8 text-kenyx-text-muted mx-auto mb-3 opacity-40" />
                <p className="text-sm text-kenyx-text-muted">No problems match your filters.</p>
                <button onClick={clearFilters} className="mt-3 text-xs text-kenyx-accent hover:underline">
                  Clear filters
                </button>
              </div>
            )
            : filtered.map((p, i) => <ProblemRow key={p.id} p={p} index={i} />)
          }

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-kenyx-border">
              <span className="text-xs text-kenyx-text-muted">
                Page <span className="text-kenyx-text-primary font-semibold">{page}</span> of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                  id="prev-page-btn"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                  id="next-page-btn"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
