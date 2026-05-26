"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your link.");
      return;
    }

    const verify = async () => {
      try {
        // We use the raw axios or a fetch here since we need to hit the public auth endpoint
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
        await axios.get(`${apiBase}/auth/verify?token=${token}`);
        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.error || "Failed to verify account. The token may be expired.");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full p-8 text-center"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 text-kenyx-accent animate-spin mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Verifying Account</h1>
            <p className="text-sm text-kenyx-text-muted">Please wait while we secure your connection...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-8">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="bg-kenyx-success/20 p-4 rounded-full mb-6"
            >
              <CheckCircle2 className="h-12 w-12 text-kenyx-success" />
            </motion.div>
            <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Account Verified!</h1>
            <p className="text-sm text-kenyx-text-secondary mb-8 leading-relaxed">
              Your email has been confirmed. You now have full access to problem creation and competitive battles.
            </p>
            <Link href="/dashboard" className="btn-accent w-full py-3">
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-8">
            <div className="bg-kenyx-danger/20 p-4 rounded-full mb-6">
              <XCircle className="h-12 w-12 text-kenyx-danger" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-sm text-kenyx-text-muted mb-8">{message}</p>
            <div className="flex gap-4 w-full">
               <Link href="/" className="btn-ghost flex-1">Home</Link>
               <Link href="/login" className="btn-outline flex-1">Try Login</Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
