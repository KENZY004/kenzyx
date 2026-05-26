"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("All fields required"); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      login(res.user, res.token);
      toast.success(`Welcome back, ${res.user.username}!`);
      
      if (res.user.role === 'admin') {
        router.push("/admin");
      } else {
        router.push("/problems");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 bg-grid-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        {/* Heading */}
        <div className="mb-8">
          <div className="section-label mb-3">Sign in</div>
          <h1 className="text-3xl font-black text-kenyx-text-primary mb-1">Welcome back.</h1>
          <p className="text-sm text-kenyx-text-muted">Enter your credentials to continue.</p>
        </div>

        {/* Form card */}
        <div className="card p-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4" id="login-form">

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-kenyx-text-muted mb-2">
                Email
              </label>
              <input
                id="login-email"
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
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="kenyx-input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-kenyx-text-muted hover:text-kenyx-text-secondary transition-colors"
                  id="toggle-pw-btn"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full justify-center py-3 text-sm mt-1"
              id="login-submit-btn"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <> Sign in <ArrowRight className="h-4 w-4" /> </>
              }
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-2xs uppercase">
              <span className="bg-[#0d1117] px-2 text-kenyx-text-muted font-bold tracking-widest">OR</span>
            </div>
          </div>

          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  setLoading(true);
                  try {
                    const res = await authApi.loginGoogle(credentialResponse.credential);
                    login(res.user, res.token);
                    toast.success(`Welcome, ${res.user.username}!`);
                    
                    if (res.user.role === 'admin') {
                      router.push("/admin");
                    } else {
                      router.push("/problems");
                    }
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || "Google login failed");
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              onError={() => {
                toast.error("Google login failed");
              }}
              theme="filled_black"
              shape="rectangular"
              width="100%"
            />
          </div>

          <div className="text-center text-sm text-kenyx-text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-kenyx-text-primary hover:text-kenyx-accent transition-colors"
            >
              Sign up free
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
