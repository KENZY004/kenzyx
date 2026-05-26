"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { label: "Contains a number",     test: (pw: string) => /\d/.test(pw) },
  { label: "Contains a letter",     test: (pw: string) => /[a-zA-Z]/.test(pw) },
];

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strengthColor =
    passwordStrength === 1 ? "#f85149" :
    passwordStrength === 2 ? "#e3b341" : "#3fb950";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) { toast.error("All fields required"); return; }
    if (username.length < 3)  { toast.error("Username must be at least 3 characters"); return; }
    if (password.length < 8)  { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await authApi.signup({ username, email, password });
      login(res.user, res.token);
      toast.success("Welcome to Kenyx! 🚀");
      router.push("/problems");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Signup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8 bg-grid-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        {/* Heading */}
        <div className="mb-8">
          <div className="section-label mb-3">Create account</div>
          <h1 className="text-3xl font-black text-kenyx-text-primary mb-1">Join Kenyx.</h1>
          <p className="text-sm text-kenyx-text-muted">Free forever. No credit card needed.</p>
        </div>

        {/* Form card */}
        <div className="card p-7 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="signup-form">

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-kenyx-text-muted mb-2">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                placeholder="alex_coder"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                className="kenyx-input"
                maxLength={32}
                autoComplete="username"
              />
              <p className="text-2xs text-kenyx-text-muted mt-1.5">Letters, numbers and underscores only.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-kenyx-text-muted mb-2">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="kenyx-input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-kenyx-text-muted mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPw ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="kenyx-input pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-kenyx-text-muted hover:text-kenyx-text-secondary transition-colors"
                  id="toggle-signup-pw"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {password && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: passwordStrength >= n ? strengthColor : "rgba(255,255,255,0.07)" }}
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    {PASSWORD_RULES.map((rule) => (
                      <div
                        key={rule.label}
                        className={clsx(
                          "flex items-center gap-1.5 text-2xs transition-colors",
                          rule.test(password) ? "text-kenyx-success" : "text-kenyx-text-muted"
                        )}
                      >
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        {rule.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full justify-center py-3 text-sm mt-1"
              id="signup-submit-btn"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <> Create Account <ArrowRight className="h-4 w-4" /> </>
              }
            </button>
          </form>

          <div className="text-center text-sm text-kenyx-text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-kenyx-text-primary hover:text-kenyx-accent transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
