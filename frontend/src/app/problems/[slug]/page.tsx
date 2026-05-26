"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import {
  Play, Send, ChevronDown, CheckCircle2, XCircle, Clock,
  Lightbulb, RotateCcw, Maximize2, Minimize2,
  ThumbsUp, BarChart2, Terminal, BookOpen, History,
  AlertCircle, Loader2, ChevronLeft,
} from "lucide-react";
import { problemsApi, submissionsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import clsx from "clsx";
import toast from "react-hot-toast";
import { sounds } from "@/lib/sounds";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: string; slug: string; title: string;
  description: string; constraints: string;
  input_format: string; output_format: string;
  difficulty: "easy" | "medium" | "hard";
  creator_name: string; likes: number; solves: number;
  acceptance: number; tags: { name: string; slug: string }[];
  test_cases: { id: string; input: string; expected: string; is_sample: boolean }[];
}

interface CaseResult {
  input: string; expected: string; got: string;
  passed: boolean; runtime_ms: number;
}

interface PastSubmission {
  id: string;
  language: string;
  code: string;
  status: string;
  runtime_ms: number;
  memory_kb: number;
  created_at: string;
}

function formatDate(ds: string) {
  try {
    const d = new Date(ds);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ds;
  }
}

interface SubmissionResult {
  submission_id: string;
  status: string;
  runtime_ms: number;
  memory_kb: number;
  passed_cases: number;
  total_cases: number;
  results: CaseResult[];
  error_msg?: string;
}

// ─── Language configs ─────────────────────────────────────────────────────────

const LANGUAGES = [
  { id: "python", label: "Python 3", monaco: "python" },
  { id: "javascript", label: "JavaScript", monaco: "javascript" },
  { id: "cpp", label: "C++", monaco: "cpp" },
  { id: "java", label: "Java", monaco: "java" },
];

const STARTER_CODE: Record<string, (title: string) => string> = {
  python: (t) =>
    `# Problem: ${t}\n# Your solution here\n# Note: Use sys.stdin.read() or input() for input\n`,
  javascript: (t) =>
    `// Problem: ${t}\n// Your solution here\n// Note: Use fs.readFileSync(0) for input\n`,
  cpp: (t) =>
    `// Problem: ${t}\n// Your solution here\n// Note: Use any standard includes (iostream, vector, etc.)\n`,
  java: (t) =>
    `// Problem: ${t}\n// IMPORTANT: The main class MUST be named 'Solution'\n\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Your solution here\n    }\n}\n`,
};

const DIFF_STYLE: Record<string, { color: string; bg: string }> = {
  easy: { color: "#3fb950", bg: "rgba(63,185,80,0.1)" },
  medium: { color: "#e3b341", bg: "rgba(227,179,65,0.1)" },
  hard: { color: "#f85149", bg: "rgba(248,81,73,0.1)" },
};

// ─── Result Panel ─────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: SubmissionResult | null }) {
  if (!result) return null;

  const isAccepted = result.status === "accepted";

  const STATUS_LABEL: Record<string, string> = {
    accepted: "Accepted",
    wrong_answer: "Wrong Answer",
    time_limit_exceeded: "Time Limit Exceeded",
    memory_limit_exceeded: "Memory Limit Exceeded",
    runtime_error: "Runtime Error",
    compile_error: "Compile Error",
    running: "Running…",
    queued: "Queued",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4"
    >
      {/* Status headline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAccepted
            ? <CheckCircle2 className="h-5 w-5 text-kenyx-success" />
            : <XCircle className="h-5 w-5 text-kenyx-danger" />
          }
          <span
            className="text-lg font-bold"
            style={{ color: isAccepted ? "#3fb950" : "#f85149" }}
          >
            {STATUS_LABEL[result.status] || result.status}
          </span>
        </div>

        {result.runtime_ms > 0 && (
          <div className="flex items-center gap-3 text-xs font-mono text-kenyx-text-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {result.runtime_ms}ms
            </span>
            <span className="flex items-center gap-1">
              <span className="opacity-60">MEM</span> {(result.memory_kb / 1024).toFixed(1)}MB
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {result.total_cases > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-kenyx-text-muted">Test Cases</span>
            <span style={{ color: isAccepted ? "#3fb950" : "#f85149" }}>
              {result.passed_cases} / {result.total_cases} passed
            </span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(result.passed_cases / result.total_cases) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: isAccepted ? "#3fb950" : "#f85149" }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {result.error_msg && (
        <div
          className="rounded-lg p-3 border"
          style={{ background: "rgba(248,81,73,0.06)", borderColor: "rgba(248,81,73,0.2)" }}
        >
          <pre className="text-xs font-mono text-kenyx-danger whitespace-pre-wrap">{result.error_msg}</pre>
        </div>
      )}

      {/* Test case breakdown */}
      {result.results?.length > 0 && (
        <div className="space-y-2">
          {result.results.map((tc, i) => (
            <details
              key={i}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: tc.passed ? "rgba(63,185,80,0.2)" : "rgba(248,81,73,0.2)" }}
            >
              <summary
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none text-xs font-semibold"
                style={{ background: tc.passed ? "rgba(63,185,80,0.06)" : "rgba(248,81,73,0.06)" }}
              >
                {tc.passed
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-kenyx-success shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-kenyx-danger shrink-0" />
                }
                <span style={{ color: tc.passed ? "#3fb950" : "#f85149" }}>
                  Test Case {i + 1}
                </span>
                <span className="ml-auto text-kenyx-text-muted font-mono">{tc.runtime_ms}ms</span>
              </summary>
              <div className="p-3 space-y-2 bg-kenyx-surface">
                {[
                  { label: "Input", value: tc.input },
                  { label: "Expected", value: tc.expected },
                  { label: "Got", value: tc.got },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-2xs font-semibold uppercase tracking-wider text-kenyx-text-muted mb-1">{label}</div>
                    <pre className="text-xs font-mono text-kenyx-text-primary bg-kenyx-surface2 rounded-md px-3 py-2 overflow-x-auto">
                      {value || "(empty)"}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Console Line ─────────────────────────────────────────────────────────────

function ConsoleLine({ text, type }: { text: string; type: string }) {
  const color =
    type === "error" ? "#f85149" :
      type === "success" ? "#3fb950" :
        "#8b949e";
  return (
    <div className="flex items-start gap-2 font-mono text-xs leading-relaxed">
      <span style={{ color: "#a8ff3e", opacity: 0.4 }}>›</span>
      <span style={{ color }}>{text}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProblemSolvePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const { user } = useAuthStore();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [langOpen, setLangOpen] = useState(false);

  const [leftTab, setLeftTab] = useState<"description" | "submissions">("description");
  const [bottomTab, setBottomTab] = useState<"console" | "result">("console");
  const [bottomOpen, setBottomOpen] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [consoleLines, setConsoleLines] = useState<{ text: string; type: string }[]>([]);
  const [pastSubmissions, setPastSubmissions] = useState<PastSubmission[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Load problem
  useEffect(() => {
    problemsApi
      .get(slug)
      .then((data) => {
        // data is now { problem, last_submission }
        const p = data.problem;
        const lastSub = data.last_submission;
        
        setProblem(p);
        
        if (lastSub && lastSub.code) {
          setLanguage(lastSub.language || "python");
          setCode(lastSub.code);
        } else {
          const initialLang = "python";
          setLanguage(initialLang);
          setCode(STARTER_CODE[initialLang]?.(p.title) || "");
        }

        // Still fetch history for the submissions tab
        if (user) {
          submissionsApi.getForProblem(slug).then((subs) => {
            setPastSubmissions(subs || []);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load problem:", err);
        setProblem(null);
      })
      .finally(() => setLoading(false));
  }, [slug, user]);

  const handleLanguageChange = (newLang: string) => {
    sounds.click();
    setLanguage(newLang);
    if (problem) setCode(STARTER_CODE[newLang]?.(problem.title) || "");
    setLangOpen(false);
  };

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLines]);

  const addLine = useCallback((text: string, type = "info") => {
    setConsoleLines((prev) => [...prev, { text, type }]);
  }, []);

  const connectWS = useCallback((submissionId: string) => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws");
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", room: submissionId }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "submission:output") addLine(msg.payload.output);
        if (msg.type === "submission:status") addLine(`Status: ${msg.payload.status}`);
        if (msg.type === "submission:result") {
          setSubmissionResult(msg.payload);
          setSubmitting(false);
          setBottomTab("result");
          if (msg.payload.status === "accepted") sounds.success();
          else sounds.error();
          ws.close();
        }
      } catch { }
    };
    ws.onerror = () => ws.close();
    return ws;
  }, [addLine]);

  const handleSubmit = async () => {
    if (!user) { toast.error("Sign in to submit"); return; }
    if (!code.trim()) { toast.error("Write some code first!"); return; }

    setSubmitting(true);
    setSubmissionResult(null);
    setConsoleLines([]);
    setBottomOpen(true);
    setBottomTab("console");
    sounds.swoosh();
    addLine("Submitting…");

    try {
      const res = await submissionsApi.submit(slug, { language, code });
      addLine(`Queued: ${res.submission_id}`);
      addLine("Running test cases…");
      connectWS(res.submission_id);

      const poll = setInterval(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) { clearInterval(poll); return; }
        try {
          const s = await submissionsApi.get(res.submission_id);
          if (s.status !== "queued" && s.status !== "running") {
            clearInterval(poll);
            setSubmissionResult(s); setSubmitting(false); setBottomTab("result");
            if (s.status === "accepted") sounds.success();
            else sounds.error();
          }
        } catch { }
      }, 1500);

      setTimeout(() => { clearInterval(poll); if (submitting) { setSubmitting(false); addLine("Timeout", "error"); } }, 30000);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Submission failed";
      addLine(msg, "error");
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const handleRun = async () => {
    if (!user) { toast.error("Sign in to run code"); return; }
    if (!code.trim()) { toast.error("Write some code first!"); return; }
    setRunning(true);
    setConsoleLines([]);
    setBottomOpen(true);
    setBottomTab("console");
    sounds.click();
    addLine("Running on sample inputs…");
    try {
      const res = await submissionsApi.run(slug, { language, code });
      if (res.results && res.results.length > 0) {
        res.results.forEach((r: any, i: number) => {
          if (r.passed) {
            addLine(`Test Case ${i + 1}: Correct ✓`, "success");
          } else {
            addLine(`Test Case ${i + 1}: Failed ✗`, "error");
            if (r.got) addLine(`  Got: ${r.got}`, "error");
          }
        });
      } else {
        addLine("No results returned", "error");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Run failed";
      console.error("Run error detail:", err);
      addLine(`Error: ${msg}`, "error");
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#a8ff3e" }} />
          <span className="text-sm text-kenyx-text-muted">Loading problem…</span>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-4">
        <AlertCircle className="h-12 w-12 text-kenyx-danger opacity-60" />
        <p className="text-kenyx-text-muted">Problem not found.</p>
        <Link href="/problems" className="btn-outline text-sm">← Back to problems</Link>
      </div>
    );
  }

  const diff = DIFF_STYLE[problem.difficulty];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">

      {/* ─── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-kenyx-border bg-kenyx-surface shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/problems"
            className="text-kenyx-text-muted hover:text-kenyx-text-primary transition-colors shrink-0"
            id="back-to-problems"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div
            className="h-4 w-px shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <span className="font-medium text-sm text-kenyx-text-primary truncate">{problem.title}</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0"
            style={{ color: diff.color, background: diff.bg }}
          >
            {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRun}
            disabled={running || submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-kenyx-border bg-white/[0.03] hover:bg-white/[0.07] transition-colors disabled:opacity-40"
            id="run-btn"
          >
            {running
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Play className="h-3.5 w-3.5 text-kenyx-success" />
            }
            Run
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || running}
            className="btn-accent py-1.5 px-4 text-xs"
            id="submit-btn"
          >
            {submitting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
            Submit
          </button>
        </div>
      </div>

      {/* ─── Split layout ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ── Left: Problem panel ─────────────────────────────────────────────── */}
        <div className="h-1/2 lg:h-auto w-full lg:w-[42%] lg:min-w-[300px] lg:max-w-[520px] flex flex-col border-b lg:border-b-0 lg:border-r border-kenyx-border shrink-0">

          {/* Tabs */}
          <div className="flex border-b border-kenyx-border shrink-0">
            {([
              { id: "description", label: "Description", icon: BookOpen },
              { id: "submissions", label: "Submissions", icon: History },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors",
                  leftTab === tab.id
                    ? "border-kenyx-accent text-kenyx-text-primary"
                    : "border-transparent text-kenyx-text-muted hover:text-kenyx-text-secondary"
                )}
                id={`tab-${tab.id}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-5">

            {leftTab === "description" && (
              <div>
                {/* Meta row */}
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-kenyx-border text-xs text-kenyx-text-muted">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {problem.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BarChart2 className="h-3.5 w-3.5" />
                    {(problem.acceptance * 100).toFixed(1)}% acc.
                  </span>
                  <span className="ml-auto">by {problem.creator_name}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {problem.tags?.map((tag) => (
                    <span key={tag.slug} className="tag-chip">{tag.name}</span>
                  ))}
                </div>

                {/* Description */}
                <div className="kenyx-prose text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {problem.description}
                  </ReactMarkdown>
                </div>

                {/* Constraints */}
                {problem.constraints && (
                  <div className="mt-6">
                    <div className="section-label mb-3" style={{ fontSize: "10px" }}>Constraints</div>
                    <div className="kenyx-prose text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {problem.constraints}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Input Format */}
                {problem.input_format && (
                  <div className="mt-6">
                    <div className="section-label mb-3" style={{ fontSize: "10px" }}>Input Format</div>
                    <div className="kenyx-prose text-sm text-kenyx-text-secondary italic">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {problem.input_format}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Output Format */}
                {problem.output_format && (
                  <div className="mt-6">
                    <div className="section-label mb-3" style={{ fontSize: "10px" }}>Output Format</div>
                    <div className="kenyx-prose text-sm text-kenyx-text-secondary italic">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {problem.output_format}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Examples */}
                {problem.test_cases?.filter((tc) => tc.is_sample).length > 0 && (
                  <div className="mt-6 space-y-3">
                    <div className="section-label" style={{ fontSize: "10px" }}>Examples</div>
                    {problem.test_cases
                      .filter((tc) => tc.is_sample)
                      .map((tc, i) => (
                        <div key={tc.id} className="card p-3 space-y-2">
                          <span className="text-2xs font-semibold text-kenyx-text-muted">
                            Example {i + 1}
                          </span>
                          {[{ label: "Input", value: tc.input }, { label: "Output", value: tc.expected }].map(({ label, value }) => (
                            <div key={label}>
                              <div className="text-2xs text-kenyx-text-muted mb-1">{label}</div>
                              <pre className="bg-kenyx-surface2 rounded-md px-3 py-2 text-xs font-mono text-kenyx-text-primary overflow-x-auto">
                                {value}
                              </pre>
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}


            {leftTab === "submissions" && (
              <div className="space-y-3">
                {pastSubmissions.length === 0 ? (
                  <div className="text-center py-16">
                    <History className="h-8 w-8 mx-auto mb-3 text-kenyx-text-muted opacity-30" />
                    <p className="text-sm text-kenyx-text-muted">No submissions yet.</p>
                    {!user && (
                      <p className="text-xs mt-2 text-kenyx-text-muted">
                        <a href="/login" className="text-kenyx-accent hover:underline">Sign in</a> to see your history.
                      </p>
                    )}
                  </div>
                ) : (
                  pastSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => {
                        sounds.click();
                        setLanguage(sub.language);
                        setCode(sub.code || "");
                        toast.success("Restored past submission code");
                      }}
                      className="card p-3 flex flex-col gap-2 cursor-pointer hover:bg-white/[0.04] transition-colors group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className={clsx("text-xs font-bold", sub.status === "accepted" ? "text-kenyx-success" : "text-kenyx-danger")}>
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1).replace(/_/g, " ")}
                        </span>
                        <span className="text-2xs text-kenyx-text-muted">{formatDate(sub.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-2xs font-mono text-kenyx-text-secondary">
                        <span>{LANGUAGES.find(l => l.id === sub.language)?.label || sub.language}</span>
                        <span>•</span>
                        <span>{sub.runtime_ms}ms</span>
                        <span>•</span>
                        <span>{(sub.memory_kb / 1024).toFixed(1)}MB</span>
                      </div>
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-kenyx-accent/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <span className="text-xs font-semibold text-kenyx-accent flex items-center gap-1.5 shadow-sm">
                          <RotateCcw className="h-3 w-3" /> Restore Code
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Editor + Console ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-kenyx-border bg-kenyx-surface shrink-0">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border border-kenyx-border bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                id="language-selector"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "#a8ff3e" }}
                />
                {LANGUAGES.find((l) => l.id === language)?.label}
                <ChevronDown className={clsx("h-3 w-3 text-kenyx-text-muted transition-transform", langOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 w-40 card p-1 z-20"
                    id="language-dropdown"
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => handleLanguageChange(lang.id)}
                        className={clsx(
                          "w-full text-left px-3 py-2 rounded-md text-xs transition-colors",
                          language === lang.id
                            ? "bg-kenyx-accent/10 text-kenyx-accent font-semibold"
                            : "text-kenyx-text-muted hover:bg-white/[0.04] hover:text-kenyx-text-primary"
                        )}
                        id={`lang-${lang.id}`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setCode(STARTER_CODE[language]?.(problem.title) || "")}
              className="btn-ghost text-2xs px-2 py-1"
              id="reset-code-btn"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={LANGUAGES.find((l) => l.id === language)?.monaco || "python"}
              path={`solution-${language}.${language === 'python' ? 'py' :
                language === 'javascript' ? 'js' :
                  language === 'cpp' ? 'cpp' :
                    'java'
                }`}
              value={code}
              onChange={(val) => setCode(val || "")}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                wordWrap: "on",
                tabSize: 4,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on",
                bracketPairColorization: { enabled: true },
                lineHeight: 22,
              }}
            />
          </div>

          {/* ─── Bottom panel ─────────────────────────────────────────────────── */}
          <div
            className="border-t border-kenyx-border bg-kenyx-surface shrink-0 transition-all duration-200"
            style={{ height: bottomOpen ? "240px" : "36px" }}
          >
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-kenyx-border">
              {([
                { id: "console", label: "Console", icon: Terminal },
                { id: "result", label: "Result", icon: CheckCircle2 },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setBottomTab(tab.id); setBottomOpen(true); }}
                  className={clsx(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-2xs font-semibold transition-colors",
                    bottomTab === tab.id
                      ? "bg-white/[0.06] text-kenyx-text-primary"
                      : "text-kenyx-text-muted hover:text-kenyx-text-secondary"
                  )}
                  id={`bottom-tab-${tab.id}`}
                >
                  <tab.icon className="h-3 w-3" /> {tab.label}
                </button>
              ))}
              <button
                onClick={() => setBottomOpen(!bottomOpen)}
                className="ml-auto p-1 rounded text-kenyx-text-muted hover:text-kenyx-text-primary transition-colors"
                id="toggle-console-btn"
              >
                {bottomOpen
                  ? <Minimize2 className="h-3.5 w-3.5" />
                  : <Maximize2 className="h-3.5 w-3.5" />
                }
              </button>
            </div>

            {/* Content */}
            {bottomOpen && (
              <div className="h-[calc(100%-36px)] overflow-y-auto">
                {bottomTab === "console" && (
                  <div
                    className="h-full p-4 space-y-1 overflow-y-auto"
                    style={{ background: "#0a0e13" }}
                  >
                    {consoleLines.length === 0 ? (
                      <div className="flex items-start gap-2 font-mono text-xs">
                        <span style={{ color: "#a8ff3e", opacity: 0.4 }}>›</span>
                        <span className="text-kenyx-text-muted">
                          Ready. Run to test on samples, Submit to run all cases.
                        </span>
                      </div>
                    ) : (
                      consoleLines.map((line, i) => (
                        <ConsoleLine key={i} text={line.text} type={line.type} />
                      ))
                    )}
                    <div ref={consoleEndRef} />
                  </div>
                )}

                {bottomTab === "result" && (
                  <div className="h-full overflow-y-auto">
                    {submitting ? (
                      <div className="flex items-center gap-3 p-4">
                        <Loader2
                          className="h-4 w-4 animate-spin shrink-0"
                          style={{ color: "#a8ff3e" }}
                        />
                        <span className="text-sm text-kenyx-text-muted">
                          Processing your submission…
                        </span>
                      </div>
                    ) : submissionResult ? (
                      <ResultPanel result={submissionResult} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2">
                        <Send className="h-7 w-7 text-kenyx-text-muted opacity-25" />
                        <p className="text-xs text-kenyx-text-muted">Submit to see results.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
