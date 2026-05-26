"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Swords, Clock, Trophy, Zap, Loader2,
  Crown, ArrowRight, Users, Copy, Check,
  Play, X, Terminal, CheckCircle2, XCircle,
  Maximize2, Minimize2, RotateCcw,
} from "lucide-react";
import { battlesApi, problemsApi, submissionsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import Link from "next/link";
import clsx from "clsx";
import { sounds } from "@/lib/sounds";
import CinematicClash from "@/components/battle/CinematicClash";
import { useWebSocket } from "@/lib/websocket";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Battle {
  id: string; problem_id: string; status: string;
  player1_name: string; player2_name: string; winner_id: string;
  started_at: string;
  problem?: Problem;
}
interface Problem {
  slug: string; title: string; difficulty: string; description: string;
  constraints?: string;
  test_cases?: { input: string; expected: string; is_sample: boolean }[];
}
interface CaseResult {
  input: string; expected: string; got: string;
  passed: boolean; runtime_ms: number;
}
interface SubmissionResult {
  status: string;
  runtime_ms: number;
  memory_kb: number;
  passed_cases: number;
  total_cases: number;
  results: CaseResult[];
  error_msg?: string;
}

// ─── Timer Hook ───────────────────────────────────────────────────────────────

function useTimer(running: boolean, startTime?: string) {
  const [elapsed, setElapsed] = useState(0);
  const [localStart] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;

    const calculate = () => {
      const current = Date.now();
      if (startTime) {
        const start = new Date(startTime).getTime();
        const diffSeconds = (current - start) / 1000;
        
        // If the server time is in the future (WSL Docker clock drift), 
        // fallback to relative local time instead of freezing at 0
        if (diffSeconds < -2) {
           return Math.floor((current - localStart) / 1000);
        }
        return Math.max(0, Math.floor(diffSeconds));
      }
      return Math.floor((current - localStart) / 1000);
    };

    setElapsed(calculate());
    const id = setInterval(() => setElapsed(calculate()), 1000);
    return () => clearInterval(id);
  }, [running, startTime, localStart]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const DIFF_COLOR: Record<string, string> = {
  easy: "#3fb950", medium: "#e3b341", hard: "#f85149",
};
const DIFF_BG: Record<string, string> = {
  easy: "rgba(63,185,80,0.1)", medium: "rgba(227,179,65,0.1)", hard: "rgba(248,81,73,0.1)",
};

// ─── Matchmaking Component ────────────────────────────────────────────────────

function Matchmaking({ onCreate, onJoin, activeBattles, loading }: {
  onCreate: () => void;
  onJoin: (id: string) => void;
  activeBattles: Battle[];
  loading: boolean;
}) {
  const [joinId, setJoinId] = useState("");
  return (
    <div className="min-h-screen bg-grid-sm flex flex-col">
      <div className="h-px w-full shrink-0" style={{ background: "linear-gradient(90deg, transparent, #a8ff3e 30%, rgba(168,255,62,0.3) 70%, transparent)" }} />
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-8">
          <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "0 0 60px rgba(168,255,62,0.2)" }} />
          <div className="h-20 w-20 rounded-2xl flex items-center justify-center relative" style={{ background: "rgba(168,255,62,0.08)", border: "1px solid rgba(168,255,62,0.2)" }}>
            <Swords className="h-10 w-10" style={{ color: "#a8ff3e" }} />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="section-label mb-3">Battle Mode</div>
          <h1 className="font-black tracking-tight text-kenyx-text-primary leading-none mb-4" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>Race to solve.</h1>
          <p className="text-kenyx-text-muted max-w-sm mx-auto text-sm leading-relaxed">Same problem. Two developers. One editor each. First to pass all test cases wins.</p>
        </motion.div>
        <button onClick={onCreate} disabled={loading} className="btn-accent px-10 py-4 text-base mb-4">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Swords className="h-5 w-5" />} {loading ? "Setting up…" : "Start a Battle"}
        </button>
        <div className="flex items-center gap-2 mb-8">
          <input type="text" placeholder="Enter Battle ID..." value={joinId} onChange={(e) => setJoinId(e.target.value)} className="bg-kenyx-surface border border-kenyx-border px-4 py-2 rounded-lg text-sm w-48 focus:border-kenyx-accent outline-none" />
          <button onClick={() => onJoin(joinId.trim())} className="btn-outline px-4 py-2 text-sm">Join</button>
        </div>
        {(activeBattles ?? []).length > 0 && (
          <div className="mt-12 w-full max-w-md">
            <div className="section-label mb-4" style={{ fontSize: "10px" }}>Open Battles</div>
            <div className="space-y-2">
              {activeBattles.map((b) => (
                <div key={b.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-kenyx-text-primary">{b.player1_name}</div>
                    <div className="text-2xs text-kenyx-text-muted font-mono mt-0.5">#{b.id.slice(-6)}</div>
                  </div>
                  <button onClick={() => onJoin(b.id)} className="btn-outline text-xs px-4 py-2">Join <ArrowRight className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Waiting Room Component ───────────────────────────────────────────────────

function WaitingRoom({ battleId }: { battleId: string }) {
  const [copied, setCopied] = useState(false);
  const shortId = battleId.slice(-8).toUpperCase();
  const copy = () => { navigator.clipboard.writeText(shortId); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="min-h-screen bg-grid-sm flex items-center justify-center">
      <div className="text-center">
        <div className="relative h-24 w-24 mx-auto mb-8">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full" style={{ background: "rgba(168,255,62,0.15)" }} />
          <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(168,255,62,0.08)", border: "1px solid rgba(168,255,62,0.2)" }}><Swords className="h-9 w-9" style={{ color: "#a8ff3e" }} /></div>
        </div>
        <div className="section-label mb-3">Waiting Room</div>
        <h2 className="text-2xl font-black text-kenyx-text-primary mb-2">Looking for an opponent…</h2>
        <button onClick={copy} className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border" style={{ borderColor: "rgba(168,255,62,0.2)", background: "rgba(168,255,62,0.05)" }}>
          <code className="font-mono text-sm font-bold tracking-widest" style={{ color: "#a8ff3e" }}>{shortId}</code>
          {copied ? <Check className="h-4 w-4 text-kenyx-success" /> : <Copy className="h-4 w-4 text-kenyx-text-muted" />}
        </button>
      </div>
    </div>
  );
}

// ─── Shared Console Components ──────────────────────────────────────────────

function ConsoleLine({ text, type }: { text: string; type: string }) {
  const color = type === "error" ? "#f85149" : type === "success" ? "#3fb950" : "#8b949e";
  return (
    <div className="flex items-start gap-2 font-mono text-xs leading-relaxed">
      <span style={{ color: "#a8ff3e", opacity: 0.4 }}>›</span>
      <span style={{ color }}>{text}</span>
    </div>
  );
}

function ResultPanel({ result }: { result: SubmissionResult | null }) {
  if (!result) return null;
  const isSuccess = result.status === "accepted" || result.status === "run_complete";
  const STATUS_LABEL: Record<string, string> = {
    accepted: "Accepted",
    wrong_answer: "Wrong Answer",
    time_limit_exceeded: "Time Limit Exceeded",
    memory_limit_exceeded: "Memory Limit Exceeded",
    runtime_error: "Runtime Error",
    compile_error: "Compile Error",
    run_complete: "Run Complete",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSuccess ? <CheckCircle2 className="h-5 w-5 text-kenyx-success" /> : <XCircle className="h-5 w-5 text-kenyx-danger" />}
          <span className="text-lg font-bold" style={{ color: isSuccess ? "#3fb950" : "#f85149" }}>{STATUS_LABEL[result.status] || result.status}</span>
        </div>
        {result.runtime_ms > 0 && <div className="text-xs font-mono text-kenyx-text-muted">{result.runtime_ms}ms • {(result.memory_kb / 1024).toFixed(1)}MB</div>}
      </div>
      {result.results?.length > 0 && (
        <div className="space-y-2">
          {result.results.map((tc, i) => (
            <div key={i} className="rounded-lg border border-kenyx-border bg-black/20 overflow-hidden">
              <div className="px-3 py-2 border-b border-kenyx-border flex items-center justify-between bg-white/[0.03]">
                <span className={clsx("text-xs font-bold", tc.passed ? "text-kenyx-success" : "text-kenyx-danger")}>Case {i + 1}: {tc.passed ? "Passed" : "Failed"}</span>
                <span className="text-[10px] text-kenyx-text-muted font-mono">{tc.runtime_ms}ms</span>
              </div>
              <div className="p-3 space-y-2">
                <div><div className="text-[10px] uppercase text-kenyx-text-muted mb-1">Input</div><pre className="bg-black/40 p-2 rounded text-xs font-mono text-kenyx-text-primary overflow-x-auto">{tc.input}</pre></div>
                <div><div className="text-[10px] uppercase text-kenyx-text-muted mb-1">Output</div><pre className={clsx("bg-black/40 p-2 rounded text-xs font-mono overflow-x-auto", !tc.passed && "text-kenyx-danger")}>{tc.got || "(empty)"}</pre></div>
                {!tc.passed && tc.expected && (<div><div className="text-[10px] uppercase text-kenyx-text-muted mb-1">Expected</div><pre className="bg-black/40 p-2 rounded text-xs font-mono text-kenyx-success overflow-x-auto">{tc.expected}</pre></div>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Active Battle Component ──────────────────────────────────────────────────

function ActiveBattle({
  battle, problem, onSubmit, onRun,
  submitting, running, runResult, setRunResult,
  result, consoleLines, addLine,
  bottomTab, setBottomTab, bottomOpen, setBottomOpen,
  onReset
}: {
  battle: Battle;
  problem: Problem | null;
  onSubmit: (code: string, lang: string) => void;
  onRun: (code: string, lang: string) => void;
  submitting: boolean;
  running: boolean;
  runResult: any;
  setRunResult: (res: any) => void;
  result: { won: boolean; status: string } | null;
  consoleLines: { text: string; type: string }[];
  addLine: (text: string, type?: string) => void;
  bottomTab: "console" | "result";
  setBottomTab: (tab: "console" | "result") => void;
  bottomOpen: boolean;
  setBottomOpen: (open: boolean) => void;
  onReset: () => void;
}) {
  const [code, setCode] = useState("# Your solution here\n\n");
  const [language, setLanguage] = useState("python");
  const timer = useTimer(battle.status === "active" && !result, battle.started_at);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const LANGS = ["python", "go", "cpp", "javascript"];

  useEffect(() => { consoleEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [consoleLines]);

  const handleRunClick = () => { onRun(code, language); };
  const handleSubmitClick = () => { onSubmit(code, language); };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] relative">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-kenyx-border bg-kenyx-surface shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold bg-kenyx-accent/10 text-kenyx-accent">{(battle.player1_name || "P1")[0].toUpperCase()}</div><span className="font-semibold text-kenyx-text-primary hidden sm:block">{battle.player1_name || "Player 1"}</span></div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border border-kenyx-accent/20 bg-kenyx-accent/5 text-kenyx-accent"><Swords className="h-3.5 w-3.5" /> VS</div>
          <div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold bg-white/5 text-kenyx-text-muted">{(battle.player2_name || "P2")[0].toUpperCase()}</div><span className="font-semibold text-kenyx-text-muted hidden sm:block">{battle.player2_name || "Waiting..."}</span></div>
        </div>
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-kenyx-warning" /><span className="text-xl font-black font-mono text-kenyx-text-primary">{timer}</span></div>
        <div className="flex items-center gap-2">
          <button onClick={handleRunClick} disabled={running || submitting || !!result} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40">{running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run</button>
          <button onClick={handleSubmitClick} disabled={submitting || running || !!result} className="btn-accent py-1.5 px-4 text-xs disabled:opacity-40">{submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />} Submit</button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[42%] min-w-[300px] border-r border-kenyx-border overflow-y-auto p-5 bg-kenyx-surface/30">
          {problem ? (<>
              <div className="flex items-center gap-2 mb-4"><span className="text-2xs font-bold uppercase tracking-wider text-kenyx-accent bg-kenyx-accent/10 px-2 py-0.5 rounded">{problem.difficulty}</span></div>
              <h2 className="text-lg font-bold text-kenyx-text-primary mb-4">{problem.title}</h2>
              <div className="text-sm text-kenyx-text-secondary leading-relaxed whitespace-pre-wrap">{problem.description}</div>
              
              {problem.test_cases && problem.test_cases.filter(tc => tc.is_sample).length > 0 && (
                <div className="mt-8 flex flex-col gap-4">
                  {problem.test_cases.filter(tc => tc.is_sample).map((tc, i) => (
                    <div key={i} className="bg-kenyx-surface border border-kenyx-border rounded-lg p-4">
                      <div className="text-xs font-bold text-kenyx-text-primary mb-3 uppercase tracking-widest">Example {i + 1}</div>
                      <div className="text-xs font-mono text-kenyx-text-secondary mb-2"><span className="text-kenyx-text-primary/70 select-none mr-2">Input: </span> {tc.input}</div>
                      <div className="text-xs font-mono text-kenyx-text-secondary"><span className="text-kenyx-text-primary/70 select-none mr-2">Output:</span> {tc.expected}</div>
                    </div>
                  ))}
                </div>
              )}

              {problem.constraints && (
                <div className="mt-8 mb-6">
                  <div className="text-xs font-bold text-kenyx-text-primary mb-3 uppercase tracking-widest">Constraints</div>
                  <div className="text-xs font-mono text-kenyx-accent bg-kenyx-accent/5 border border-kenyx-accent/20 p-4 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {problem.constraints}
                  </div>
                </div>
              )}
            </>) : (<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-kenyx-text-muted" /></div>)}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-kenyx-border bg-kenyx-surface shrink-0">
            <div className="flex items-center gap-1">{LANGS.map((l) => (<button key={l} onClick={() => setLanguage(l)} className={clsx("px-3 py-1.5 rounded text-xs font-semibold", language === l ? "text-kenyx-accent bg-kenyx-accent/10" : "text-kenyx-text-muted hover:text-kenyx-text-primary")}>{l}</button>))}</div>
            <button onClick={() => setCode("# Your solution here\n\n")} className="text-2xs text-kenyx-text-muted hover:text-kenyx-text-primary flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Reset</button>
          </div>
          <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
            <MonacoEditor 
              height="100%" 
              language={language} 
              value={code} 
              onChange={(v) => !result && setCode(v || "")} 
              theme="vs-dark" 
              options={{ 
                fontSize: 13, 
                fontFamily: "monospace", 
                minimap: { enabled: false }, 
                automaticLayout: true, 
                padding: { top: 12 },
                readOnly: !!result // 🔒 Lock editor when battle is over
              }} 
            />
          </div>
          <div className="border-t border-kenyx-border bg-kenyx-surface flex flex-col transition-all duration-200" style={{ height: bottomOpen ? "220px" : "36px" }}>
            <div className="flex items-center px-4 py-1.5 border-b border-kenyx-border shrink-0">
              <button onClick={() => { setBottomTab("console"); setBottomOpen(true); }} className={clsx("flex items-center gap-1.5 px-3 py-1 text-2xs font-bold rounded", bottomTab === "console" ? "bg-white/10 text-white" : "text-kenyx-text-muted")}><Terminal className="h-3 w-3" /> Console</button>
              <button onClick={() => { setBottomTab("result"); setBottomOpen(true); }} className={clsx("flex items-center gap-1.5 px-3 py-1 text-2xs font-bold rounded ml-1", bottomTab === "result" ? "bg-white/10 text-white" : "text-kenyx-text-muted")}><CheckCircle2 className="h-3 w-3" /> Result</button>
              <button onClick={() => setBottomOpen(!bottomOpen)} className="ml-auto text-kenyx-text-muted p-1">{bottomOpen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
            </div>
            {bottomOpen && (
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-[#0a0e13]">
                {bottomTab === "console" ? (<div className="space-y-1">{consoleLines.map((line, i) => <ConsoleLine key={i} text={line.text} type={line.type} />)}<div ref={consoleEndRef} /></div>) : (<ResultPanel result={runResult} />)}
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(9,12,16,0.92)", backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ scale: 0.85, y: 24 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 22 }} className="card p-10 text-center max-w-sm w-full mx-4">
              {result.won ? (<>
                  <div className="h-20 w-20 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(168,255,62,0.1)", border: "1px solid rgba(168,255,62,0.3)", boxShadow: "0 0 40px rgba(168,255,62,0.2)" }}><Crown className="h-10 w-10" style={{ color: "#a8ff3e" }} /></div>
                  <div className="section-label mb-2">Battle Over</div>
                  <h2 className="text-3xl font-black mb-2" style={{ color: "#a8ff3e" }}>You Won!</h2>
                  <p className="text-sm text-kenyx-text-muted mb-8">Excellent work. Your solution was fastest!</p>
                </>) : (<>
                  <div className="h-20 w-20 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}><Trophy className="h-10 w-10 text-kenyx-text-muted opacity-40" /></div>
                  <div className="section-label mb-2">Battle Over</div>
                  <h2 className="text-3xl font-black text-kenyx-text-primary mb-2">Good Try!</h2>
                  <p className="text-sm text-kenyx-text-muted mb-8">Your opponent got there first. Keep grinding!</p>
                </>)}
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={onReset} 
                  className="btn-accent flex items-center gap-2"
                >
                  Play Again <ArrowRight className="h-4 w-4" />
                </button>
                <Link href="/problems" className="btn-outline">
                  Practice
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Battle Page Component ──────────────────────────────────────────────

export default function BattlePage() {
  const { user, isInitialized } = useAuthStore();
  const [battle, setBattle]               = useState<Battle | null>(null);
  const [problem, setProblem]             = useState<Problem | null>(null);
  const [activeBattles, setActiveBattles] = useState<Battle[]>([]);
  const [creating, setCreating]           = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [running, setRunning]             = useState(false);
  const [runResult, setRunResult]         = useState<any>(null);
  const [result, setResult]               = useState<{ won: boolean; status: string } | null>(null);
  const [clashing, setClashing]           = useState(false);
  const [consoleLines, setConsoleLines]   = useState<{ text: string; type: string }[]>([]);
  const [bottomTab, setBottomTab]         = useState<"console" | "result">("console");
  const [bottomOpen, setBottomOpen]       = useState(true);

  const { subscribe, unsubscribe, on } = useWebSocket();
  const wsRef = useRef<WebSocket | null>(null);

  const handleReset = useCallback(() => {
    setBattle(null);
    setResult(null);
    setProblem(null);
    setClashing(false);
    setConsoleLines([]);
    setRunResult(null);
    // Refresh the active battles list for finding a new game
    battlesApi.active().then((data) => setActiveBattles(data ?? [])).catch(() => setActiveBattles([]));
  }, []);

  const addLine = useCallback((text: string, type = "info") => {
    setConsoleLines((prev) => [...prev, { text, type }]);
  }, []);

  useEffect(() => {
    battlesApi.active().then((data) => setActiveBattles(data ?? [])).catch(() => setActiveBattles([]));
  }, []);

  useEffect(() => { if (battle) subscribe(battle.id); }, [battle?.id, subscribe]);

  // Sync: Monitor battle and ensure problem is always in sync
  useEffect(() => {
    if (battle?.problem && !problem) {
      setProblem(battle.problem);
    } else if (battle?.problem_id && !problem && !battle.problem) {
      // Fallback: If for some reason problem isn't attached, fetch via ID (checking backend support or using a lookup)
      problemsApi.get(battle.problem_id).then((res: any) => setProblem(res.problem)).catch(() => {
        console.error("Failed to fetch problem by ID. Ensure backend supports ID lookup or slug is provided.");
      });
    }
  }, [battle, problem]);

  useEffect(() => {
    if (!battle || !user) return;
    const unsubFinished = on("battle:finished", (data: any) => {
      console.log("🏆 BATTLE FINISHED EVENT RECEIVED:", data);
      const isWinner = data.winner_id === user.id;
      
      // Safety: Clear all loading/submitting states immediately
      setSubmitting(false);
      setRunning(false);
      setClashing(false);
      setBottomOpen(false); // Close console/results to focus on victory screen
      
      setResult({ won: isWinner, status: "finished" });
      if (isWinner) sounds.success(); else sounds.error();
    });
    const unsubUpdate = on("battle:update", async (ub: any) => {
      if (ub.status === "active" && !clashing && (!battle || battle.status === "waiting")) setClashing(true);
      if (ub.problem) setProblem(ub.problem);
      setBattle(ub);
    });
    const unsubSub = on("submission:result", (data: any) => { 
      // 🛡️ ISOLATION FIX: Only show results for THIS player's submissions
      if (data.user_id && data.user_id !== user.id) {
        // Opponent just submitted — tell this player about it but don't replace their UI
        if (data.status === "accepted") {
          // The battle:finished event will handle the win state
        } else {
          toast(`Opponent's submission: ${data.status.replace(/_/g, " ")}`, { icon: "⚔️" });
        }
        return;
      }
      setRunResult(data);
      setSubmitting(false);
      setBottomTab("result");
      if (data.status === "accepted") sounds.success(); 
      else sounds.error();
    });
    const unsubOut = on("submission:output", (data: any) => addLine(data.output));
    const unsubStat = on("submission:status", (data: any) => addLine(`Status: ${data.status}`));

    return () => { unsubFinished(); unsubUpdate(); unsubSub(); unsubOut(); unsubStat(); };
  }, [battle, user, on, clashing, problem, addLine]);

  // connectWS is now redundant for battles as results come via the battle channel, 
  // but we keep a simplified version as a fallback or for custom rooms.
  const connectWS = useCallback((submissionId: string) => {
    // Standard logic here... but handleSubmit now relies on the global battle 'on' listener
  }, []);

  const handleCreate = async () => {
    if (!user) { toast.error("Sign in to battle"); return; }
    setCreating(true);
    try {
      const b = await battlesApi.create();
      setBattle(b);
      if (b.problem) setProblem(b.problem);
      if (b.status === "active") setClashing(true);
    } catch { toast.error("Battle creation failed."); }
    finally { setCreating(false); }
  };

  const handleJoin = async (id: string) => {
    if (!user) { toast.error("Sign in to join"); return; }
    if (!id || id.trim() === "") { toast.error("Please enter a valid Battle ID"); return; }
    try {
      const b = await battlesApi.join(id);
      setBattle(b);
      if (b.problem) setProblem(b.problem);
      if (b.status === "active") setClashing(true);
    } catch { toast.error("Could not join."); }
  };

  const handleRun = async (code: string, lang: string) => {
    if (!problem) { toast.error("Problem data not loaded yet."); return; }
    setRunning(true);
    setRunResult(null);
    setConsoleLines([]);
    setBottomTab("console");
    setBottomOpen(true);
    addLine("› Initiating test case run...");

    try { 
      const res = await submissionsApi.run(problem.slug, { language: lang, code }); 
      if (res.results && res.results.length > 0) {
        res.results.forEach((r: any, i: number) => {
          if (r.passed) {
            addLine(`Test Case ${i + 1}: Correct ✓`, "success");
          } else {
            addLine(`Test Case ${i + 1}: Failed ✗`, "error");
            if (r.got) addLine(`  Got: ${r.got}`, "error");
          }
        });
        setRunResult(res);
        setBottomTab("result");
      } else {
        addLine("Run completed with no output.", "info");
      }
    }
    catch (err: any) { 
      const msg = err.response?.data?.error || "Run failed. Please try again.";
      toast.error(msg);
      addLine(`Error: ${msg}`, "error");
    }
    finally { setRunning(false); }
  };

  const handleSubmit = async (code: string, lang: string) => {
    if (!battle || !user) return;
    setSubmitting(true);
    setRunResult(null);
    setConsoleLines([]);
    setBottomTab("console");
    setBottomOpen(true);
    addLine("› Submitting solution for evaluation...");
    try { 
      const res = await submissionsApi.submit(problem?.slug || "unknown", { 
        language: lang, 
        code,
        battle_id: battle.id
      }); 
      
      addLine(`Queued: ${res.submission_id}`);

      // ✅ Subscribe to this submitter's private submission channel
      // Only THIS browser will receive the result — opponent won't see it
      subscribe(res.submission_id);

      // Polling fallback (Safety Net - always uses THIS user's submission_id so it's isolated)
      const submissionId = res.submission_id;
      const poll = setInterval(async () => {
        try {
          const s = await submissionsApi.get(submissionId);
          // If the submission is finished, we update the UI even if the WebSocket missed it
          if (s.status !== "queued" && s.status !== "running") {
            clearInterval(poll);
            unsubscribe(submissionId);
            setRunResult(s); 
            setSubmitting(false);
            setBottomTab("result");
            if (s.status === "accepted") sounds.success();
            else sounds.error();
          }
        } catch { }
      }, 3000);

      setTimeout(() => { 
        clearInterval(poll); 
        unsubscribe(submissionId);
        if (submitting) { 
          setSubmitting(false); 
          addLine("Submission timed out.", "error"); 
        } 
      }, 45000);
    }
    catch (err: any) { 
      const msg = err.response?.data?.error || "Submission failed.";
      toast.error(msg); 
      setSubmitting(false); 
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-4 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-kenyx-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-6 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center font-black text-4xl leading-tight">
          Join the<br/><span style={{ color: "#a8ff3e" }}>Kenyx Battle Arena</span>
        </motion.div>
        <Link href="/login" className="btn-accent px-12 py-4">Sign in to compete</Link>
      </div>
    );
  }

  if (!battle) {
    return (
      <Matchmaking
        onCreate={handleCreate}
        onJoin={handleJoin}
        activeBattles={activeBattles}
        loading={creating}
      />
    );
  }

  if (battle.status === "waiting") {
    return <WaitingRoom battleId={battle.id} />;
  }
  
  return (
    <div className="relative min-h-[calc(100vh-56px)] bg-[#090c10]">
      {clashing && problem && (
        <CinematicClash
          onComplete={() => setClashing(false)}
        />
      )}
      
      {/* Hide the editor entirely during clashing intro for maximum impact */}
      {!clashing && problem && (
        <ActiveBattle
          battle={battle}
          problem={problem}
          onSubmit={handleSubmit}
          onRun={handleRun}
          submitting={submitting}
          running={running}
          runResult={runResult}
          setRunResult={setRunResult}
          result={result}
          consoleLines={consoleLines}
          addLine={addLine}
          bottomTab={bottomTab}
          setBottomTab={setBottomTab}
          bottomOpen={bottomOpen}
          setBottomOpen={setBottomOpen}
          onReset={handleReset}
        />
      )}

      {/* Loading state if battle is active but problem hasn't arrived yet */}
      {!clashing && !problem && (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-kenyx-accent" />
          <p className="text-sm font-mono text-kenyx-text-muted">Synchronizing battle data...</p>
        </div>
      )}
    </div>
  );
}
