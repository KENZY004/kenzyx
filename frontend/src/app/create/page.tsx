"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { problemsApi, tagsApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  ChevronRight, ChevronLeft, Plus, Trash2,
  FileText, Tag, TestTube2, CheckCircle2, Loader2,
  Hash, AlignLeft, Scale, Zap,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

// ─── Config ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Problem Info",    icon: FileText    },
  { id: 2, title: "Tags & Details",  icon: Tag         },
  { id: 3, title: "Test Cases",      icon: TestTube2   },
  { id: 4, title: "Review & Submit", icon: CheckCircle2 },
];

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const COMPARISON_MODES = [
  { id: "exact", label: "Exact Match", desc: "Perfect character-by-character match." },
  { id: "ignore_whitespace", label: "Ignore Whitespace", desc: "Trims and ignores extra spaces/newlines." },
  { id: "sorted_numbers", label: "Sorted Numbers", desc: "Checks if number sets match regardless of order." },
];

const DIFF_ACTIVE: Record<string, React.CSSProperties> = {
  easy:   { color: "#3fb950", background: "rgba(63,185,80,0.1)",   borderColor: "rgba(63,185,80,0.4)"  },
  medium: { color: "#e3b341", background: "rgba(227,179,65,0.1)",  borderColor: "rgba(227,179,65,0.4)" },
  hard:   { color: "#f85149", background: "rgba(248,81,73,0.1)",   borderColor: "rgba(248,81,73,0.4)"  },
};

interface TagItem { id: string; name: string; slug: string; }
interface TestCase { input: string; expected: string; is_sample: boolean; }

// ─── Shared label ─────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-kenyx-text-muted mb-2">
      {children}
    </label>
  );
}

// ─── Step 1: Problem Info ─────────────────────────────────────────────────────

function Step1({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Problem Title *</FieldLabel>
        <input
          id="problem-title"
          type="text"
          placeholder="e.g., Find the Maximum Subarray"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="kenyx-input"
          maxLength={256}
        />
        <div className="text-right text-2xs text-kenyx-text-muted mt-1.5">{form.title.length}/256</div>
      </div>

      <div>
        <FieldLabel>Description * — Markdown supported</FieldLabel>
        <textarea
          id="problem-description"
          placeholder="Describe the problem clearly. Use Markdown for formatting and code blocks for visual clarity."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="kenyx-input font-mono text-sm resize-y leading-relaxed"
          rows={10}
        />
      </div>

      <div>
        <FieldLabel>Constraints — Markdown</FieldLabel>
        <textarea
          id="problem-constraints"
          placeholder={"- `1 <= n <= 10^5`\n- `0 <= nums[i] <= 10^9`"}
          value={form.constraints}
          onChange={(e) => setForm({ ...form, constraints: e.target.value })}
          className="kenyx-input font-mono text-sm resize-y"
          rows={4}
        />
      </div>
    </div>
  );
}

// ─── Step 2: Tags & Details ───────────────────────────────────────────────────

function Step2({ form, setForm, availableTags, selectedTags, setSelectedTags }: {
  form: any; setForm: (f: any) => void;
  availableTags: TagItem[];
  selectedTags: string[]; setSelectedTags: (t: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selectedTags.includes(id)) {
      setSelectedTags(selectedTags.filter((t) => t !== id));
    } else if (selectedTags.length < 5) {
      setSelectedTags([...selectedTags, id]);
    } else {
      toast.error("Maximum 5 tags allowed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Difficulty */}
      <div>
        <FieldLabel>Difficulty *</FieldLabel>
        <div className="flex gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setForm({ ...form, difficulty: d })}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all duration-200"
              style={
                form.difficulty === d
                  ? DIFF_ACTIVE[d]
                  : { color: "#484f58", background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
              }
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Mode */}
      <div>
        <FieldLabel>Grading Comparison Mode *</FieldLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COMPARISON_MODES.map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => setForm({ ...form, comparison_mode: mode.id })}
                  className={clsx(
                      "p-4 rounded-xl border text-left transition-all duration-200",
                      form.comparison_mode === mode.id ? "bg-kenyx-accent/5 border-kenyx-accent/40" : "bg-white/5 border-transparent hover:border-white/10"
                  )}
                >
                    <div className={clsx("text-xs font-bold mb-1", form.comparison_mode === mode.id ? "text-kenyx-accent" : "text-white")}>{mode.label}</div>
                    <div className="text-[10px] text-kenyx-text-muted leading-tight">{mode.desc}</div>
                </button>
            ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-2">
            <FieldLabel>Tags ({selectedTags.length}/5)</FieldLabel>
            <div className="flex items-center gap-2">
                <input 
                    type="text" 
                    placeholder="Add custom tag..."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] text-white focus:outline-none focus:border-kenyx-accent/50 w-32"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !selectedTags.includes(val) && selectedTags.length < 5) {
                                setSelectedTags([...selectedTags, val]);
                                e.currentTarget.value = "";
                            } else if (selectedTags.length >= 5) {
                                toast.error("Maximum 5 tags allowed");
                            }
                        }
                    }}
                />
            </div>
        </div>
        {(!availableTags || availableTags.length === 0) ? (
            <div className="text-xs text-kenyx-text-muted animate-pulse">Loading tags...</div>
        ) : (
            <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
                const active = selectedTags.includes(tag.id) || selectedTags.includes(tag.name);
                return (
                <button
                    key={tag.id}
                    onClick={() => toggle(tag.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150"
                    style={
                    active
                        ? { color: "#a8ff3e", background: "rgba(168,255,62,0.08)", borderColor: "rgba(168,255,62,0.3)" }
                        : { color: "#8b949e", background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
                    }
                >
                    {tag.name}
                </button>
                );
            })}
            {/* Show custom tags that are not in availableTags */}
            {selectedTags.filter(t => !availableTags.find(at => at.id === t || at.name === t)).map(customTag => (
                <button
                    key={customTag}
                    onClick={() => setSelectedTags(selectedTags.filter(t => t !== customTag))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150"
                    style={{ color: "#a8ff3e", background: "rgba(168,255,62,0.08)", borderColor: "rgba(168,255,62,0.3)" }}
                >
                    {customTag}
                </button>
            ))}
            </div>
        )}
      </div>

      {/* IO format */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Input Format</FieldLabel>
          <textarea
            value={form.input_format}
            onChange={(e) => setForm({ ...form, input_format: e.target.value })}
            placeholder="Describe the input format…"
            className="kenyx-input font-mono text-sm resize-none"
            rows={4}
          />
        </div>
        <div>
          <FieldLabel>Output Format</FieldLabel>
          <textarea
            value={form.output_format}
            onChange={(e) => setForm({ ...form, output_format: e.target.value })}
            placeholder="Describe the expected output…"
            className="kenyx-input font-mono text-sm resize-none"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Test Cases ───────────────────────────────────────────────────────

function Step3({ testCases, setTestCases }: { testCases: TestCase[]; setTestCases: (t: TestCase[]) => void }) {
  const add = () =>
    setTestCases([...testCases, { input: "", expected: "", is_sample: testCases.length < 2 }]);

  const remove = (i: number) => {
    if (testCases.length <= 2) { toast.error("Minimum 2 test cases required"); return; }
    setTestCases(testCases.filter((_, j) => j !== i));
  };

  const update = (i: number, key: keyof TestCase, value: string | boolean) => {
    const updated = [...testCases];
    (updated[i] as any)[key] = value;
    setTestCases(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-kenyx-text-muted">
          Minimum 2 cases. Mark at least 2 as <strong className="text-kenyx-text-secondary">sample</strong> — they&apos;ll be shown to solvers.
        </p>
        <button
          onClick={add}
          className="btn-outline text-xs px-3 py-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Case
        </button>
      </div>

      <AnimatePresence>
        {testCases.map((tc, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-kenyx-text-muted">
                Test Case {i + 1}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-kenyx-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tc.is_sample}
                    onChange={(e) => update(i, "is_sample", e.target.checked)}
                    className="accent-kenyx-accent"
                  />
                  Sample
                </label>
                <button
                  onClick={() => remove(i)}
                  className="p-1.5 rounded-md transition-colors text-kenyx-text-muted hover:text-kenyx-danger hover:bg-kenyx-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Input</FieldLabel>
                <textarea
                  value={tc.input}
                  onChange={(e) => update(i, "input", e.target.value)}
                  placeholder="Input data…"
                  className="kenyx-input font-mono text-xs resize-y"
                  rows={3}
                />
              </div>
              <div>
                <FieldLabel>Expected Output</FieldLabel>
                <textarea
                  value={tc.expected}
                  onChange={(e) => update(i, "expected", e.target.value)}
                  placeholder="Expected output…"
                  className="kenyx-input font-mono text-xs resize-y"
                  rows={3}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function Step4({ form, availableTags, selectedTags, testCases }: {
  form: any; availableTags: TagItem[]; selectedTags: string[]; testCases: TestCase[];
}) {
  const tagNames = selectedTags
    .map((t) => {
      const found = availableTags.find((at) => at.id === t || at.name === t);
      return found ? found.name : t;
    })
    .filter(Boolean) as string[];

  const diff = form.difficulty as keyof typeof DIFF_ACTIVE;
  const modeLabel = COMPARISON_MODES.find(m => m.id === form.comparison_mode)?.label || "Exact Match";

  return (
    <div className="space-y-4">
      {/* Preview card */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-white truncate">
              {form.title || "Untitled Problem"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {form.difficulty && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                  style={DIFF_ACTIVE[diff]}
                >
                  {diff}
                </span>
              )}
              {tagNames.map((n) => (
                <span key={n} className="tag-chip text-2xs uppercase tracking-tight">{n}</span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
             <div className="text-[10px] uppercase font-bold text-kenyx-text-muted mb-1">Grading</div>
             <div className="text-xs font-bold text-white flex items-center gap-1">
                <Scale className="h-3 w-3 text-kenyx-accent" />
                {modeLabel}
             </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-kenyx-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-5">
            {form.description || "No description provided."}
          </p>
        </div>

        {(form.constraints || form.input_format || form.output_format) && (
          <div className="pt-4 border-t border-white/5 space-y-4">
            {form.constraints && (
              <div>
                <div className="text-[10px] uppercase font-bold text-kenyx-text-muted mb-1">Constraints</div>
                <p className="text-xs text-kenyx-text-secondary font-mono">{form.constraints}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {form.input_format && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-kenyx-text-muted mb-1">Input</div>
                  <p className="text-xs text-kenyx-text-secondary font-mono">{form.input_format}</p>
                </div>
              )}
              {form.output_format && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-kenyx-text-muted mb-1">Output</div>
                  <p className="text-xs text-kenyx-text-secondary font-mono">{form.output_format}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test case summary */}
      <div className="card p-5">
        <div className="section-label mb-3" style={{ fontSize: "10px" }}>
          Test Cases ({testCases.length})
        </div>
        <div className="space-y-2">
          {testCases.map((tc, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="text-kenyx-text-muted w-16 shrink-0 font-mono">Case {i + 1}</span>
              <code className="bg-white/5 px-2 py-0.5 rounded font-mono flex-1 truncate text-kenyx-text-primary">
                {tc.input.substring(0, 40) || "(empty)"}
              </code>
              <span className="text-kenyx-text-muted">→</span>
              <code className="bg-white/5 px-2 py-0.5 rounded font-mono flex-1 truncate text-kenyx-accent">
                {tc.expected.substring(0, 40) || "(empty)"}
              </code>
              {tc.is_sample && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter bg-white/10 text-white shrink-0">
                  Sample
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

import { Suspense } from "react";

export default function CreateProblemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 text-kenyx-accent animate-spin" /></div>}>
      <CreateProblemContent />
    </Suspense>
  );
}

function CreateProblemContent() {
  const { user, isInitialized }  = useAuthStore();
  const router    = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");
  const [step, setStep]               = useState(1);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [form, setForm]               = useState({
    title: "", description: "", constraints: "", input_format: "", output_format: "", difficulty: "easy", comparison_mode: "exact"
  });
  const [testCases, setTestCases]     = useState<TestCase[]>([
    { input: "", expected: "", is_sample: true },
    { input: "", expected: "", is_sample: true },
  ]);
  const [submitting, setSubmitting]   = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  // Auto-Save / Restore
  useEffect(() => {
    const saved = localStorage.getItem("kenyx_create_draft");
    if (saved) {
      try {
        const { form: savedForm, selectedTags: savedTags, testCases: savedCases, step: savedStep } = JSON.parse(saved);
        if (savedForm) setForm(savedForm);
        if (savedTags) setSelectedTags(savedTags);
        if (savedCases) setTestCases(savedCases);
        if (savedStep) setStep(savedStep);
      } catch (e) { console.error("Failed to restore draft", e); }
    }
    setIsRestored(true);
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    const draft = { form, selectedTags, testCases, step };
    localStorage.setItem("kenyx_create_draft", JSON.stringify(draft));
  }, [form, selectedTags, testCases, step, isRestored]);

  useEffect(() => {
     tagsApi.list().then(setAvailableTags).catch(console.error);
  }, []);

  // Fetch data for edit mode
  useEffect(() => {
    if (!editSlug) return;
    
    problemsApi.get(editSlug).then((data: any) => {
      const p = data.problem;
      setForm({
        title: p.title,
        description: p.description,
        constraints: p.constraints,
        input_format: p.input_format,
        output_format: p.output_format,
        difficulty: p.difficulty,
        comparison_mode: p.comparison_mode || "exact"
      });
      if (p.tags) {
        setSelectedTags(p.tags.map((t: any) => t.id || t));
      }
      if (p.test_cases) {
        setTestCases(p.test_cases.map((tc: any) => ({
          input: tc.input,
          expected: tc.expected,
          is_sample: tc.is_sample
        })));
      }
    }).catch(err => {
      toast.error("Failed to load problem for editing");
      router.push("/admin/problems");
    });
  }, [editSlug, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-kenyx-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-4">
        <p className="text-kenyx-text-muted">Sign in to create problems.</p>
        <Link href="/login" className="btn-accent">Sign in</Link>
      </div>
    );
  }

  const validate = (): string | null => {
    if (step === 1) {
      if (!form.title.trim() || form.title.length < 5) return "Title must be at least 5 characters";
      if (!form.description.trim()) return "Description is required";
    }
    if (step === 2) {
      if (!form.difficulty) return "Please select a difficulty";
      if (selectedTags.length === 0) return "Select at least one tag";
    }
    if (step === 3) {
      if (testCases.length < 2) return "At least 2 test cases required";
      for (const tc of testCases) {
        if (!tc.input.trim() || !tc.expected.trim()) return "All test cases must have input and expected output";
      }
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      if (editSlug) {
        await problemsApi.update(editSlug, { ...form, tags: selectedTags, test_cases: testCases });
        toast.success("Problem updated successfully! ✨");
      } else {
        await problemsApi.create({ ...form, tags: selectedTags, test_cases: testCases });
        toast.success("Problem published successfully! 🎉");
      }
      localStorage.removeItem("kenyx_create_draft"); // Clear draft on success
      router.push(user?.role === "admin" ? "/admin/problems" : "/dashboard");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid-sm">
      {/* Top accent line */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, #a8ff3e 30%, rgba(168,255,62,0.3) 70%, transparent)" }}
      />

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-12">

        {/* ── Heading ── */}
        <div className="mb-10 text-center md:text-left">
          <div className="section-label mb-3 mx-auto md:mx-0">Creator</div>
          <h1
            className="font-black tracking-tighter text-white leading-none mb-3"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            Craft a Challenge.
          </h1>
          <p className="text-sm text-kenyx-text-muted mt-2 max-w-xl">
             Define the logic, set the constraints, and contribute to the community.
             Approved problems earn you platform reputation.
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center mb-12">
          {STEPS.map((s, i) => {
            const done    = step > s.id;
            const current = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => done && setStep(s.id)}
                  className={clsx("flex flex-col md:flex-row items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors", done && "cursor-pointer")}
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center font-black shrink-0 transition-all duration-300 shadow-lg"
                    style={
                      current ? { background: "#a8ff3e", color: "#07090b", transform: "scale(1.1)" } :
                      done    ? { background: "rgba(168,255,62,0.15)", color: "#a8ff3e", border: "1px solid rgba(168,255,62,0.3)" } :
                                { background: "rgba(255,255,255,0.05)", color: "#484f58" }
                    }
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                  </div>
                  <span
                    className="hidden md:block"
                    style={{ color: current ? "#fff" : done ? "#a8ff3e" : "#484f58" }}
                  >
                    {s.title}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px mx-4 transition-colors duration-500"
                    style={{ background: step > s.id ? "rgba(168,255,62,0.3)" : "rgba(255,255,255,0.1)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="card p-8 md:p-10 mb-8 border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-kenyx-accent opacity-20" />
            
            <div className="section-label mb-8" style={{ fontSize: "10px" }}>
              Progress: {step} of 4
            </div>

            {step === 1 && <Step1 form={form} setForm={setForm} />}
            {step === 2 && (
              <Step2
                form={form} setForm={setForm}
                availableTags={availableTags}
                selectedTags={selectedTags} setSelectedTags={setSelectedTags}
              />
            )}
            {step === 3 && <Step3 testCases={testCases} setTestCases={setTestCases} />}
            {step === 4 && <Step4 form={form} availableTags={availableTags} selectedTags={selectedTags} testCases={testCases} />}
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation ── */}
        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-kenyx-text-muted hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < 4 ? (
            <button
              onClick={next}
              className="btn-accent flex items-center gap-2 py-2.5 px-8 text-xs font-bold uppercase tracking-widest"
            >
              Next Step <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-accent flex items-center gap-2 py-2.5 px-10 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {submitting ? "Publishing…" : "Publish Problem"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
